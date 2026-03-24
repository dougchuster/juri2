import "server-only";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import type {
    TipoAgendamento,
    StatusAgendamento,
    PrioridadeAgendamento,
    OrigemAgendamento,
    Role,
} from "@/generated/prisma";

// ============================================================
// TYPES
// ============================================================

export interface AgendamentoVisibilityScope {
    role?: Role | null;
    userId?: string | null;
    advogadoId?: string | null;
}

export interface AgendamentoFilters {
    // Scope / aba
    tab?: "minha" | "escritorio" | "observador" | "conferir";
    // Filtros
    status?: StatusAgendamento[];
    tipos?: TipoAgendamento[];
    responsavelId?: string;
    criadoPorId?: string;
    observadorUserId?: string;
    processoId?: string;
    clienteId?: string;
    prioridade?: PrioridadeAgendamento[];
    origem?: OrigemAgendamento[];
    conferido?: boolean;
    // Datas
    from?: Date;
    to?: Date;
    porDataDe?: "dataInicio" | "dataFatal" | "createdAt" | "updatedAt";
    // Busca
    search?: string;
    // Paginacao
    page?: number;
    pageSize?: number;
}

// ============================================================
// SELECT FIELDS (evita over-fetching)
// ============================================================

const agendamentoSelect = {
    id: true,
    tipo: true,
    status: true,
    prioridade: true,
    origem: true,
    titulo: true,
    descricao: true,
    observacoes: true,
    cor: true,
    dataInicio: true,
    dataFim: true,
    dataFatal: true,
    dataCortesia: true,
    diaInteiro: true,
    fatal: true,
    tipoContagem: true,
    tipoAudiencia: true,
    local: true,
    sala: true,
    tipoCompromisso: true,
    origemConfianca: true,
    conferido: true,
    conferidoEm: true,
    motivoRejeicao: true,
    concluidoEm: true,
    comoConcluido: true,
    canceladoEm: true,
    motivoCancelamento: true,
    visualizadoEm: true,
    revisadoEm: true,
    responsavelId: true,
    criadoPorId: true,
    processoId: true,
    clienteId: true,
    publicacaoOrigemId: true,
    prazoLegadoId: true,
    recorrenciaId: true,
    createdAt: true,
    updatedAt: true,
    responsavel: {
        select: {
            id: true,
            user: { select: { id: true, name: true, avatarUrl: true } },
        },
    },
    criadoPor: {
        select: { id: true, name: true, avatarUrl: true },
    },
    conferidoPor: {
        select: { id: true, name: true },
    },
    processo: {
        select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } },
    },
    cliente: {
        select: { id: true, nome: true },
    },
    observadores: {
        select: {
            id: true,
            userId: true,
            usuario: { select: { id: true, name: true, avatarUrl: true } },
        },
    },
    _count: {
        select: { comentarios: true, historicos: true },
    },
} as const;

// ============================================================
// HELPERS
// ============================================================

function buildWhereClause(
    filters: AgendamentoFilters,
    scope: AgendamentoVisibilityScope
) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    // ---- TAB SCOPE ----
    const { tab } = filters;

    if (tab === "minha") {
        // Evita filtro nulo para perfis sem vinculo com advogado.
        where.responsavelId = scope.advogadoId ?? "__sem_advogado__";
    } else if (!tab && scope.advogadoId) {
        // Apenas agendamentos onde o usuario e responsavel
        where.responsavelId = scope.advogadoId;
    } else if (tab === "observador") {
        // Agendamentos onde o usuario e observador
        where.observadores = { some: { userId: scope.userId } };
    } else if (tab === "conferir") {
        // Agendamentos concluidos aguardando conferencia
        where.status = "CONCLUIDO";
        where.conferido = false;
    }
    // tab === "escritorio" => sem filtro de scope (acesso total)

    // ---- FILTROS PRINCIPAIS ----
    if (filters.status && filters.status.length > 0) {
        where.status = { in: filters.status };
    }

    if (filters.tipos && filters.tipos.length > 0) {
        where.tipo = { in: filters.tipos };
    }

    if (filters.responsavelId) {
        where.responsavelId = filters.responsavelId;
    }

    if (filters.criadoPorId) {
        where.criadoPorId = filters.criadoPorId;
    }

    if (filters.processoId) {
        where.processoId = filters.processoId;
    }

    if (filters.clienteId) {
        where.clienteId = filters.clienteId;
    }

    if (filters.prioridade && filters.prioridade.length > 0) {
        where.prioridade = { in: filters.prioridade };
    }

    if (filters.origem && filters.origem.length > 0) {
        where.origem = { in: filters.origem };
    }

    if (typeof filters.conferido === "boolean") {
        where.conferido = filters.conferido;
    }

    // ---- DATAS ----
    const dateField = filters.porDataDe ?? "dataInicio";
    if (filters.from || filters.to) {
        where[dateField] = {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
        };
    }

    // ---- BUSCA FULL-TEXT ----
    if (filters.search?.trim()) {
        const s = filters.search.trim();
        where.OR = [
            { titulo: { contains: s, mode: "insensitive" } },
            { descricao: { contains: s, mode: "insensitive" } },
            { observacoes: { contains: s, mode: "insensitive" } },
            { processo: { numeroCnj: { contains: s } } },
            { processo: { cliente: { nome: { contains: s, mode: "insensitive" } } } },
            { cliente: { nome: { contains: s, mode: "insensitive" } } },
        ];
    }

    return where;
}

// ============================================================
// DAL FUNCTIONS
// ============================================================

export async function getAgendamentos(
    filters: AgendamentoFilters = {},
    scope?: AgendamentoVisibilityScope
) {
    const { page = 1, pageSize = 50 } = filters;

    // Restricao de visibilidade por role
    if (scope?.role === "ADVOGADO" && !scope.advogadoId) {
        return { agendamentos: [], total: 0, page, pageSize, totalPages: 0 };
    }

    const where = buildWhereClause(filters, scope ?? {});

    // Se role ADVOGADO e tab nao e escritorio/observador, restringir ao proprio
    if (scope?.role === "ADVOGADO" && filters.tab !== "observador") {
        where.responsavelId = scope.advogadoId;
    }

    const [agendamentos, total] = await Promise.all([
        db.agendamento.findMany({
            where,
            select: agendamentoSelect,
            orderBy: [
                { dataFatal: "asc" },
                { dataInicio: "asc" },
                { prioridade: "asc" },
            ],
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        db.agendamento.count({ where }),
    ]);

    return { agendamentos, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getAgendamentosForCalendar(
    from: Date,
    to: Date,
    scope?: AgendamentoVisibilityScope
) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
        OR: [
            { dataInicio: { gte: from, lte: to } },
            { dataFatal: { gte: from, lte: to } },
            // eventos de varios dias que cobrem o periodo
            { dataInicio: { lte: to }, dataFim: { gte: from } },
        ],
        status: { not: "CANCELADO" },
    };

    if (scope?.role === "ADVOGADO" && scope.advogadoId) {
        where.responsavelId = scope.advogadoId;
    }

    return db.agendamento.findMany({
        where,
        select: {
            id: true,
            tipo: true,
            status: true,
            prioridade: true,
            titulo: true,
            cor: true,
            dataInicio: true,
            dataFim: true,
            dataFatal: true,
            diaInteiro: true,
            fatal: true,
            conferido: true,
            responsavelId: true,
            processoId: true,
            responsavel: { select: { user: { select: { name: true, avatarUrl: true } } } },
            processo: { select: { numeroCnj: true } },
        },
        orderBy: [{ dataFatal: "asc" }, { dataInicio: "asc" }],
        take: 500,
    });
}

export async function getAgendamentosForKanban(
    scope?: AgendamentoVisibilityScope
) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);
    endOfWeek.setHours(23, 59, 59, 999);

    const endOfNextWeek = new Date(today);
    endOfNextWeek.setDate(today.getDate() + 14);
    endOfNextWeek.setHours(23, 59, 59, 999);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseWhere: Record<string, any> = {
        status: { in: ["PENDENTE", "VISUALIZADO", "VENCIDO"] },
    };

    if (scope?.role === "ADVOGADO" && scope.advogadoId) {
        baseWhere.responsavelId = scope.advogadoId;
    }

    const dateField = "dataFatal"; // ou dataInicio para outros tipos

    const [vencidos, hoje, estaSemana, proximaSemana, futuro] = await Promise.all([
        db.agendamento.findMany({
            where: { ...baseWhere, [dateField]: { lt: today } },
            select: agendamentoSelect,
            orderBy: [{ dataFatal: "asc" }, { dataInicio: "asc" }],
            take: 100,
        }),
        db.agendamento.findMany({
            where: { ...baseWhere, [dateField]: { gte: today, lte: endOfToday } },
            select: agendamentoSelect,
            orderBy: [{ dataFatal: "asc" }, { dataInicio: "asc" }],
            take: 100,
        }),
        db.agendamento.findMany({
            where: { ...baseWhere, [dateField]: { gt: endOfToday, lte: endOfWeek } },
            select: agendamentoSelect,
            orderBy: [{ dataFatal: "asc" }, { dataInicio: "asc" }],
            take: 100,
        }),
        db.agendamento.findMany({
            where: { ...baseWhere, [dateField]: { gt: endOfWeek, lte: endOfNextWeek } },
            select: agendamentoSelect,
            orderBy: [{ dataFatal: "asc" }, { dataInicio: "asc" }],
            take: 100,
        }),
        db.agendamento.findMany({
            where: { ...baseWhere, [dateField]: { gt: endOfNextWeek } },
            select: agendamentoSelect,
            orderBy: [{ dataFatal: "asc" }, { dataInicio: "asc" }],
            take: 100,
        }),
    ]);

    return { vencidos, hoje, estaSemana, proximaSemana, futuro };
}

export async function getAgendamentoById(id: string) {
    const session = await getSession();
    const escritorioId = session?.escritorioId;
    return db.agendamento.findFirst({
        where: { id, ...(escritorioId ? { escritorioId } : {}) },
        include: {
            responsavel: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
            criadoPor: { select: { id: true, name: true, avatarUrl: true } },
            conferidoPor: { select: { id: true, name: true } },
            concluidoPorUser: { select: { id: true, name: true } },
            processo: { select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } } },
            cliente: { select: { id: true, nome: true } },
            observadores: {
                include: {
                    usuario: { select: { id: true, name: true, avatarUrl: true } },
                    adicionadoPor: { select: { id: true, name: true } },
                },
            },
            comentarios: {
                include: { usuario: { select: { id: true, name: true, avatarUrl: true } } },
                orderBy: { createdAt: "asc" },
            },
            historicos: {
                include: { usuario: { select: { id: true, name: true } } },
                orderBy: { createdAt: "desc" },
                take: 50,
            },
            recorrencia: true,
        },
    });
}

export async function getAgendamentoTabCounts(
    scope: AgendamentoVisibilityScope
): Promise<{ minha: number; escritorio: number; observador: number; conferir: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseFilter: Record<string, any> = {
        status: { not: "CANCELADO" },
    };

    const [minha, escritorio, observador, conferir] = await Promise.all([
        db.agendamento.count({
            where: { ...baseFilter, responsavelId: scope.advogadoId ?? "never" },
        }),
        scope.role !== "ADVOGADO"
            ? db.agendamento.count({ where: baseFilter })
            : Promise.resolve(0),
        db.agendamento.count({
            where: { ...baseFilter, observadores: { some: { userId: scope.userId ?? "never" } } },
        }),
        scope.role !== "ADVOGADO"
            ? db.agendamento.count({
                where: { ...baseFilter, status: "CONCLUIDO", conferido: false },
            })
            : Promise.resolve(0),
    ]);

    return { minha, escritorio, observador, conferir };
}

export async function getAgendamentoStats(scope?: AgendamentoVisibilityScope) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scopeWhere: Record<string, any> =
        scope?.role === "ADVOGADO" && scope.advogadoId
            ? { responsavelId: scope.advogadoId }
            : {};

    const [total, pendentes, vencidos, hojeFatal, semanaFatal, aConferir] = await Promise.all([
        db.agendamento.count({ where: { ...scopeWhere, status: { not: "CANCELADO" } } }),
        db.agendamento.count({ where: { ...scopeWhere, status: "PENDENTE" } }),
        db.agendamento.count({
            where: { ...scopeWhere, status: "VENCIDO" },
        }),
        db.agendamento.count({
            where: {
                ...scopeWhere,
                tipo: { in: ["PRAZO_FATAL", "PRAZO_IA"] },
                dataFatal: { gte: today, lte: new Date(today.getTime() + 86400000) },
                status: { in: ["PENDENTE", "VISUALIZADO"] },
            },
        }),
        db.agendamento.count({
            where: {
                ...scopeWhere,
                tipo: { in: ["PRAZO_FATAL", "PRAZO_IA"] },
                dataFatal: { gte: today, lte: nextWeek },
                status: { in: ["PENDENTE", "VISUALIZADO"] },
            },
        }),
        db.agendamento.count({
            where: { ...scopeWhere, status: "CONCLUIDO", conferido: false },
        }),
    ]);

    return { total, pendentes, vencidos, hojeFatal, semanaFatal, aConferir };
}
