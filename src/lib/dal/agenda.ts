import "server-only";
import { db } from "@/lib/db";
import type { OrigemPrazo, Role, StatusPrazo } from "@/generated/prisma";

export interface PrazoFilters {
    search?: string;
    status?: StatusPrazo;
    origem?: OrigemPrazo;
    advogadoId?: string;
    processoId?: string;
    fatal?: boolean;
    vencidos?: boolean;
    page?: number;
    pageSize?: number;
}

export interface AgendaVisibilityScope {
    role?: Role | null;
    advogadoId?: string | null;
}

function getScopedAdvogadoId(scope?: AgendaVisibilityScope) {
    if (!scope || scope.role !== "ADVOGADO") return null;
    return scope.advogadoId || null;
}
export async function getPrazos(filters: PrazoFilters = {}, scope?: AgendaVisibilityScope) {
    const {
        search, status, origem, advogadoId, processoId, fatal, vencidos,
        page = 1, pageSize = 15,
    } = filters;

    const where: Record<string, unknown> = {};
    const scopedAdvogadoId = getScopedAdvogadoId(scope);

    if (scope?.role === "ADVOGADO" && !scopedAdvogadoId) {
        return { prazos: [], total: 0, page, pageSize, totalPages: 0 };
    }

    if (search) {
        where.OR = [
            { descricao: { contains: search, mode: "insensitive" } },
            { processo: { numeroCnj: { contains: search } } },
            { processo: { cliente: { nome: { contains: search, mode: "insensitive" } } } },
        ];
    }
    if (status) where.status = status;
    if (origem) where.origem = origem;
    if (advogadoId) where.advogadoId = advogadoId;
    if (scopedAdvogadoId) where.advogadoId = scopedAdvogadoId;
    if (processoId) where.processoId = processoId;
    if (fatal !== undefined) where.fatal = fatal;
    if (vencidos) {
        where.status = "PENDENTE";
        where.dataFatal = { lt: new Date() };
    }

    try {
        const [prazos, total] = await Promise.all([
            db.prazo.findMany({
                where,
                include: {
                    processo: {
                        select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } },
                    },
                    advogado: { include: { user: { select: { name: true } } } },
                    publicacaoOrigem: {
                        select: {
                            id: true,
                            tribunal: true,
                            dataPublicacao: true,
                            processoNumero: true,
                        },
                    },
                },
                orderBy: { dataFatal: "asc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.prazo.count({ where }),
        ]);

        return { prazos, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        const isCompatibilityError =
            message.includes("include") ||
            message.includes("relation fields") ||
            message.includes("Unknown argument") ||
            message.includes("Unknown field");

        if (!isCompatibilityError) throw error;

        const legacyWhere = { ...where } as Record<string, unknown>;
        delete legacyWhere.origem;

        const [legacyPrazos, total] = await Promise.all([
            db.prazo.findMany({
                where: legacyWhere,
                include: {
                    processo: {
                        select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } },
                    },
                    advogado: { include: { user: { select: { name: true } } } },
                },
                orderBy: { dataFatal: "asc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.prazo.count({ where: legacyWhere }),
        ]);

        const prazos = legacyPrazos.map((item) => ({
            ...item,
            origem: "MANUAL",
            origemConfianca: null,
            origemDados: null,
            publicacaoOrigem: null,
        }));

        return { prazos, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
}

export async function getPrazoStats(scope?: AgendaVisibilityScope) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const scopedAdvogadoId = getScopedAdvogadoId(scope);
    if (scope?.role === "ADVOGADO" && !scopedAdvogadoId) {
        return { total: 0, pendentes: 0, vencidos: 0, proximaSemana: 0, concluidos: 0 };
    }

    const prazoScope = scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {};

    const [total, pendentes, vencidos, proximaSemana, concluidos] = await Promise.all([
        db.prazo.count({ where: prazoScope }),
        db.prazo.count({ where: { ...prazoScope, status: "PENDENTE" } }),
        db.prazo.count({ where: { ...prazoScope, status: "PENDENTE", dataFatal: { lt: today } } }),
        db.prazo.count({ where: { ...prazoScope, status: "PENDENTE", dataFatal: { gte: today, lte: nextWeek } } }),
        db.prazo.count({ where: { ...prazoScope, status: "CONCLUIDO" } }),
    ]);

    return { total, pendentes, vencidos, proximaSemana, concluidos };
}

export type AgendaItemTipo = "prazo" | "audiencia" | "compromisso" | "tarefa" | "retorno";

export interface AgendaItemFilters {
    advogadoId?: string;
    from?: Date;
    to?: Date;
    search?: string;
    tipos?: AgendaItemTipo[];
    includeConcluidos?: boolean;
    limitPerType?: number;
}

export interface AgendaItem {
    id: string;
    tipo: AgendaItemTipo;
    data: Date;
    titulo: string;
    subtitulo: string;
    responsavel: string;
    processoId?: string;
    processoCnj?: string | null;
    processoCliente?: string | null;
    fatal?: boolean;
    status?: string;
    prioridade?: string;
    origemPrazo?: OrigemPrazo;
    origemConfianca?: number | null;
}

export async function getAgendaItems(filters: AgendaItemFilters = {}, scope?: AgendaVisibilityScope) {
    const {
        advogadoId,
        from,
        to,
        search,
        tipos = ["prazo", "audiencia", "compromisso", "tarefa", "retorno"],
        includeConcluidos = false,
        limitPerType = 80,
    } = filters;

    const scopedAdvogadoId = getScopedAdvogadoId(scope);
    if (scope?.role === "ADVOGADO" && !scopedAdvogadoId) {
        return [];
    }

    const resolvedAdvogadoId = scopedAdvogadoId || advogadoId;

    const dateFilter = from && to ? { gte: from, lte: to } : from ? { gte: from } : to ? { lte: to } : undefined;
    const normalizedSearch = search?.trim() || undefined;
    const shouldLoad = (tipo: AgendaItemTipo) => tipos.includes(tipo);
    const take = Math.min(Math.max(limitPerType, 20), 300);

    const [prazos, audiencias, compromissos, tarefas, retornos] = await Promise.all([
        shouldLoad("prazo")
            ? db.prazo.findMany({
                where: {
                    ...(resolvedAdvogadoId ? { advogadoId: resolvedAdvogadoId } : {}),
                    ...(includeConcluidos ? {} : { status: "PENDENTE" }),
                    ...(dateFilter ? { dataFatal: dateFilter } : {}),
                    ...(normalizedSearch
                        ? {
                            OR: [
                                { descricao: { contains: normalizedSearch, mode: "insensitive" } },
                                { processo: { numeroCnj: { contains: normalizedSearch } } },
                                { processo: { cliente: { nome: { contains: normalizedSearch, mode: "insensitive" } } } },
                            ],
                        }
                        : {}),
                },
                include: {
                    processo: { select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } } },
                    advogado: { include: { user: { select: { name: true } } } },
                },
                orderBy: { dataFatal: "asc" },
                take,
            })
            : Promise.resolve([]),
        shouldLoad("audiencia")
            ? db.audiencia.findMany({
                where: {
                    ...(resolvedAdvogadoId ? { advogadoId: resolvedAdvogadoId } : {}),
                    ...(includeConcluidos ? {} : { realizada: false }),
                    ...(dateFilter ? { data: dateFilter } : {}),
                    ...(normalizedSearch
                        ? {
                            OR: [
                                { local: { contains: normalizedSearch, mode: "insensitive" } },
                                { processo: { numeroCnj: { contains: normalizedSearch } } },
                                { processo: { cliente: { nome: { contains: normalizedSearch, mode: "insensitive" } } } },
                            ],
                        }
                        : {}),
                },
                include: {
                    processo: { select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } } },
                    advogado: { include: { user: { select: { name: true } } } },
                },
                orderBy: { data: "asc" },
                take,
            })
            : Promise.resolve([]),
        shouldLoad("compromisso")
            ? db.compromisso.findMany({
                where: {
                    ...(resolvedAdvogadoId ? { advogadoId: resolvedAdvogadoId } : {}),
                    ...(includeConcluidos ? {} : { concluido: false }),
                    ...(dateFilter ? { dataInicio: dateFilter } : {}),
                    ...(normalizedSearch
                        ? {
                            OR: [
                                { titulo: { contains: normalizedSearch, mode: "insensitive" } },
                                { descricao: { contains: normalizedSearch, mode: "insensitive" } },
                                { local: { contains: normalizedSearch, mode: "insensitive" } },
                            ],
                        }
                        : {}),
                },
                include: {
                    advogado: { include: { user: { select: { name: true } } } },
                },
                orderBy: { dataInicio: "asc" },
                take,
            })
            : Promise.resolve([]),
        shouldLoad("tarefa")
            ? db.tarefa.findMany({
                where: {
                    ...(resolvedAdvogadoId ? { advogadoId: resolvedAdvogadoId } : {}),
                    ...(includeConcluidos ? {} : { status: { notIn: ["CONCLUIDA", "CANCELADA"] } }),
                    dataLimite: {
                        not: null,
                        ...(dateFilter ?? {}),
                    },
                    ...(normalizedSearch
                        ? {
                            OR: [
                                { titulo: { contains: normalizedSearch, mode: "insensitive" } },
                                { descricao: { contains: normalizedSearch, mode: "insensitive" } },
                                { processo: { numeroCnj: { contains: normalizedSearch } } },
                                { processo: { cliente: { nome: { contains: normalizedSearch, mode: "insensitive" } } } },
                            ],
                        }
                        : {}),
                },
                include: {
                    processo: { select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } } },
                    advogado: { include: { user: { select: { name: true } } } },
                },
                orderBy: [{ dataLimite: "asc" }, { prioridade: "asc" }],
                take,
            })
            : Promise.resolve([]),
        shouldLoad("retorno")
            ? db.atendimento.findMany({
                where: {
                    ...(resolvedAdvogadoId ? { advogadoId: resolvedAdvogadoId } : {}),
                    ...(includeConcluidos ? {} : { status: { notIn: ["CONVERTIDO", "PERDIDO"] } }),
                    dataRetorno: {
                        not: null,
                        ...(dateFilter ?? {}),
                    },
                    ...(normalizedSearch
                        ? {
                            OR: [
                                { assunto: { contains: normalizedSearch, mode: "insensitive" } },
                                { resumo: { contains: normalizedSearch, mode: "insensitive" } },
                                { cliente: { nome: { contains: normalizedSearch, mode: "insensitive" } } },
                            ],
                        }
                        : {}),
                },
                include: {
                    cliente: { select: { nome: true } },
                    advogado: { include: { user: { select: { name: true } } } },
                },
                orderBy: { dataRetorno: "asc" },
                take,
            })
            : Promise.resolve([]),
    ]);

    const items: AgendaItem[] = [
        ...prazos.map((p) => ({
            id: p.id,
            tipo: "prazo" as const,
            data: p.dataFatal,
            titulo: p.descricao,
            subtitulo: `${p.processo.numeroCnj || "Sem número"} - ${p.processo.cliente?.nome ?? "Sem cliente"}`,
            responsavel: p.advogado.user.name || "-",
            processoId: p.processoId,
            processoCnj: p.processo.numeroCnj,
            processoCliente: p.processo.cliente?.nome ?? null,
            fatal: p.fatal,
            status: p.status,
            origemPrazo: p.origem,
            origemConfianca: p.origemConfianca,
        })),
        ...audiencias.map((a) => ({
            id: a.id,
            tipo: "audiencia" as const,
            data: a.data,
            titulo: `Audiencia ${a.tipo.toLowerCase()}`,
            subtitulo: `${a.processo.numeroCnj || "Sem número"} - ${a.processo.cliente?.nome ?? "Sem cliente"}${a.local ? ` - ${a.local}` : ""}`,
            responsavel: a.advogado.user.name || "-",
            processoId: a.processoId,
            processoCnj: a.processo.numeroCnj,
            processoCliente: a.processo.cliente?.nome ?? null,
            status: a.realizada ? "REALIZADA" : "PENDENTE",
        })),
        ...compromissos.map((c) => ({
            id: c.id,
            tipo: "compromisso" as const,
            data: c.dataInicio,
            titulo: c.titulo,
            subtitulo: `${c.tipo}${c.local ? ` - ${c.local}` : ""}`,
            responsavel: c.advogado.user.name || "-",
            status: c.concluido ? "CONCLUIDO" : "PENDENTE",
        })),
        ...tarefas.map((t) => ({
            id: t.id,
            tipo: "tarefa" as const,
            data: t.dataLimite as Date,
            titulo: t.titulo,
            subtitulo: `${t.processo?.numeroCnj || "Sem processo"}${t.processo?.cliente?.nome ? ` - ${t.processo.cliente.nome}` : ""}`,
            responsavel: t.advogado.user.name || "-",
            processoId: t.processoId || undefined,
            processoCnj: t.processo?.numeroCnj,
            processoCliente: t.processo?.cliente?.nome,
            status: t.status,
            prioridade: t.prioridade,
        })),
        ...retornos.map((r) => ({
            id: r.id,
            tipo: "retorno" as const,
            data: r.dataRetorno as Date,
            titulo: `Retorno: ${r.assunto}`,
            subtitulo: `Cliente ${r.cliente.nome} - ${r.status}`,
            responsavel: r.advogado.user.name || "-",
            processoId: r.processoId || undefined,
            processoCnj: null,
            processoCliente: r.cliente.nome,
            status: r.status,
        })),
    ];

    const typePriority: Record<AgendaItemTipo, number> = {
        prazo: 0,
        audiencia: 1,
        tarefa: 2,
        retorno: 3,
        compromisso: 4,
    };

    items.sort((a, b) => {
        const byDate = new Date(a.data).getTime() - new Date(b.data).getTime();
        if (byDate !== 0) return byDate;
        const byType = typePriority[a.tipo] - typePriority[b.tipo];
        if (byType !== 0) return byType;
        return a.titulo.localeCompare(b.titulo, "pt-BR");
    });

    return items;
}





