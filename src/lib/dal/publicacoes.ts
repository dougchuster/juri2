import "server-only";
import { db } from "@/lib/db";
import type { StatusPublicacao } from "@/generated/prisma";
import {
    avaliarBloqueioCargaPublicacoes,
    calcularQuotasEqualitarias,
    calcularScoreCargaPublicacoes,
    type CargaDistribuicaoPublicacao,
} from "@/lib/services/publicacoes-distribution";
import { getPublicacoesConfig } from "@/lib/services/publicacoes-config";

export interface PublicacaoFilters {
    search?: string;
    status?: StatusPublicacao;
    grupoStatus?: "TRATADAS";
    tribunal?: string;
    triagem?: "com_regra" | "sem_regra";
    advogadoId?: string;
    dataFrom?: string;
    dataTo?: string;
    page?: number;
    pageSize?: number;
}

export async function getPublicacoes(filters: PublicacaoFilters = {}) {
    const {
        search,
        status,
        grupoStatus,
        tribunal,
        triagem,
        advogadoId,
        dataFrom,
        dataTo,
        page = 1,
        pageSize = 20,
    } = filters;

    const where: Record<string, unknown> = {};

    if (search) {
        where.OR = [
            { conteudo: { contains: search, mode: "insensitive" } },
            { partesTexto: { contains: search, mode: "insensitive" } },
            { processoNumero: { contains: search, mode: "insensitive" } },
            { identificador: { contains: search, mode: "insensitive" } },
            { tribunal: { contains: search, mode: "insensitive" } },
            { diario: { contains: search, mode: "insensitive" } },
            { oabsEncontradas: { has: search.toUpperCase() } },
        ];
    }
    if (status) where.status = status;
    if (!status && grupoStatus === "TRATADAS") {
        where.status = { in: ["DISTRIBUIDA", "VINCULADA", "IGNORADA"] };
    }
    if (tribunal) where.tribunal = tribunal;
    if (triagem === "com_regra") {
        where.historicos = { some: { tipo: "REGRA_TRIAGEM_APLICADA" } };
    }
    if (triagem === "sem_regra") {
        where.historicos = { none: { tipo: "REGRA_TRIAGEM_APLICADA" } };
    }
    if (advogadoId) where.advogadoId = advogadoId;
    if (dataFrom || dataTo) {
        where.dataPublicacao = {
            ...(dataFrom ? { gte: new Date(dataFrom) } : {}),
            ...(dataTo ? { lte: new Date(dataTo) } : {}),
        };
    }

    const [publicacoesRaw, total] = await Promise.all([
        db.publicacao.findMany({
            where,
            include: {
                advogado: { include: { user: { select: { name: true } } } },
                processo: { select: { id: true, numeroCnj: true, cliente: { select: { id: true, nome: true } } } },
                distribuicao: { select: { id: true, status: true, advogadoId: true } },
                historicos: {
                    select: {
                        id: true,
                        tipo: true,
                        descricao: true,
                        statusAnterior: true,
                        statusNovo: true,
                        origem: true,
                        metadados: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: "desc" },
                    // Keep list payload small; full history can be loaded on-demand in the UI.
                    take: 10,
                },
            },
            orderBy: [{ dataPublicacao: "desc" }, { importadaEm: "desc" }],
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        db.publicacao.count({ where }),
    ]);

    // Trim large text fields before they go to the client.
    const PREVIEW_MAX = 900;
    const publicacoes = publicacoesRaw.map((pub) => {
        const raw = String(pub.conteudo || "");
        const normalized = raw.replace(/\s+/g, " ").trim();
        const len = normalized.length;
        const truncado = len > PREVIEW_MAX;
        const preview = truncado ? `${normalized.slice(0, PREVIEW_MAX).trimEnd()}…` : normalized;

        return {
            ...pub,
            conteudo: preview,
            conteudoLen: len,
            conteudoTruncado: truncado,
        };
    });

    return { publicacoes, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getPublicacaoStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [total, pendentes, distribuidas, vinculadas, ignoradas, hoje, pendentesHoje, tratadasHoje, descartadasHoje] = await Promise.all([
        db.publicacao.count(),
        db.publicacao.count({ where: { status: "PENDENTE" } }),
        db.publicacao.count({ where: { status: "DISTRIBUIDA" } }),
        db.publicacao.count({ where: { status: "VINCULADA" } }),
        db.publicacao.count({ where: { status: "IGNORADA" } }),
        db.publicacao.count({ where: { dataPublicacao: { gte: today } } }),
        db.publicacao.count({
            where: {
                status: "PENDENTE",
                dataPublicacao: { gte: today, lt: tomorrow },
            },
        }),
        db.publicacaoHistorico.count({
            where: {
                tipo: "STATUS_ALTERADO",
                statusAnterior: "PENDENTE",
                statusNovo: { in: ["DISTRIBUIDA", "VINCULADA", "IGNORADA"] },
                createdAt: { gte: today, lt: tomorrow },
            },
        }),
        db.publicacaoHistorico.count({
            where: {
                tipo: "STATUS_ALTERADO",
                statusNovo: "IGNORADA",
                createdAt: { gte: today, lt: tomorrow },
            },
        }),
    ]);

    return {
        total,
        pendentes,
        distribuidas,
        vinculadas,
        ignoradas,
        hoje,
        pendentesHoje,
        tratadasHoje,
        descartadasHoje,
    };
}

export async function getTribunais() {
    const result = await db.publicacao.groupBy({
        by: ["tribunal"],
        _count: true,
        orderBy: { _count: { tribunal: "desc" } },
    });
    return result.map((r) => r.tribunal);
}

export async function getPublicacaoRegrasTriagem() {
    const prismaWithRules = db as typeof db & {
        publicacaoRegraTriagem?: {
            findMany: typeof db.publicacaoRegraTriagem.findMany;
        };
    };
    if (!prismaWithRules.publicacaoRegraTriagem) {
        return [];
    }

    return prismaWithRules.publicacaoRegraTriagem.findMany({
        orderBy: [{ ativo: "desc" }, { prioridade: "asc" }, { updatedAt: "desc" }],
    });
}

export interface CargaAdvogado extends CargaDistribuicaoPublicacao {
    totalPrazos: number;
}

export async function getCargaPorAdvogado(): Promise<CargaAdvogado[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
        advogados,
        atrasadosByAdv,
        pendentesByAdv,
        tarefasByAdv,
        audienciasByAdv,
        pubPendentesByAdv,
    ] = await Promise.all([
        db.advogado.findMany({
            where: { ativo: true, user: { isActive: true } },
            include: {
                user: { select: { name: true } },
                _count: { select: { prazos: true } },
            },
        }),
        db.prazo.groupBy({
            by: ["advogadoId"],
            where: { status: "PENDENTE", dataFatal: { lt: today } },
            _count: { _all: true },
        }),
        db.prazo.groupBy({
            by: ["advogadoId"],
            where: { status: "PENDENTE", dataFatal: { gte: today } },
            _count: { _all: true },
        }),
        db.tarefa.groupBy({
            by: ["advogadoId"],
            where: { status: { in: ["A_FAZER", "EM_ANDAMENTO", "REVISAO"] } },
            _count: { _all: true },
        }),
        db.audiencia.groupBy({
            by: ["advogadoId"],
            where: { realizada: false, data: { gte: today } },
            _count: { _all: true },
        }),
        db.publicacao.groupBy({
            by: ["advogadoId"],
            where: { status: "PENDENTE", advogadoId: { not: null } },
            _count: { _all: true },
        }),
    ]);

    const atrasadosMap = new Map(atrasadosByAdv.map((item) => [item.advogadoId, item._count._all]));
    const pendentesMap = new Map(pendentesByAdv.map((item) => [item.advogadoId, item._count._all]));
    const tarefasMap = new Map(tarefasByAdv.map((item) => [item.advogadoId, item._count._all]));
    const audienciasMap = new Map(audienciasByAdv.map((item) => [item.advogadoId, item._count._all]));
    const pubsMap = new Map(
        pubPendentesByAdv
            .filter((item): item is typeof item & { advogadoId: string } => !!item.advogadoId)
            .map((item) => [item.advogadoId, item._count._all])
    );

    const cargas: CargaAdvogado[] = advogados.map((adv) => {
        const prazosAtrasados = atrasadosMap.get(adv.id) || 0;
        const prazosPendentes = pendentesMap.get(adv.id) || 0;
        const tarefasPendentes = tarefasMap.get(adv.id) || 0;
        const audienciasPendentes = audienciasMap.get(adv.id) || 0;
        const publicacoesPendentes = pubsMap.get(adv.id) || 0;

        const cargaTotal = calcularScoreCargaPublicacoes({
            prazosAtrasados,
            prazosPendentes,
            tarefasPendentes,
            audienciasPendentes,
            publicacoesPendentes,
        });

        return {
            advogadoId: adv.id,
            nomeAdvogado: adv.user.name || "-",
            oab: adv.oab,
            seccional: adv.seccional,
            totalPrazos: adv._count.prazos,
            prazosAtrasados,
            prazosPendentes,
            tarefasPendentes,
            audienciasPendentes,
            publicacoesPendentes,
            cargaTotal: Math.round(cargaTotal * 10) / 10,
        };
    });

    return cargas.sort((a, b) => a.cargaTotal - b.cargaTotal);
}

export interface AnaliseDistribuicaoPublicacoes {
    pendentesHoje: number;
    pendentesTotal: number;
    demandaUsada: number;
    hardBlock: {
        enabled: boolean;
        maxPrazosAtrasados: number;
        maxCargaScore: number;
        maxPublicacoesPendentes: number;
    };
    quotas: Array<
        CargaAdvogado & {
            quotaSugerida: number;
            percentualSugerido: number;
            capacidade: number;
            bloqueado: boolean;
            motivosBloqueio: string[];
        }
    >;
}

export async function getAnaliseDistribuicaoPublicacoes(): Promise<AnaliseDistribuicaoPublicacoes> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [cargas, pendentesHoje, pendentesTotal, config] = await Promise.all([
        getCargaPorAdvogado(),
        db.publicacao.count({
            where: {
                status: "PENDENTE",
                dataPublicacao: { gte: today, lt: tomorrow },
            },
        }),
        db.publicacao.count({ where: { status: "PENDENTE" } }),
        getPublicacoesConfig(),
    ]);

    const demandaUsada = pendentesHoje > 0 ? pendentesHoje : pendentesTotal;
    const bloqueios = new Map(
        cargas.map((carga) => {
            const avaliacao = avaliarBloqueioCargaPublicacoes(carga, {
                enabled: config.hardBlockEnabled,
                maxPrazosAtrasados: config.hardBlockMaxPrazosAtrasados,
                maxCargaScore: config.hardBlockMaxCargaScore,
                maxPublicacoesPendentes: config.hardBlockMaxPublicacoesPendentes,
            });
            return [carga.advogadoId, avaliacao] as const;
        })
    );
    const baseQuotas = config.hardBlockEnabled
        ? cargas.filter((carga) => !bloqueios.get(carga.advogadoId)?.bloqueado)
        : cargas;
    const quotas = calcularQuotasEqualitarias(
        baseQuotas.length > 0 ? baseQuotas : cargas,
        demandaUsada
    );
    const quotaMap = new Map(quotas.map((item) => [item.advogadoId, item]));

    return {
        pendentesHoje,
        pendentesTotal,
        demandaUsada,
        hardBlock: {
            enabled: config.hardBlockEnabled,
            maxPrazosAtrasados: config.hardBlockMaxPrazosAtrasados,
            maxCargaScore: config.hardBlockMaxCargaScore,
            maxPublicacoesPendentes: config.hardBlockMaxPublicacoesPendentes,
        },
        quotas: cargas.map((carga) => {
            const q = quotaMap.get(carga.advogadoId);
            const bloqueio = bloqueios.get(carga.advogadoId);
            return {
                ...carga,
                quotaSugerida: q?.quota || 0,
                percentualSugerido: q?.percentual || 0,
                capacidade: q?.capacidade || 0,
                bloqueado: bloqueio?.bloqueado || false,
                motivosBloqueio: bloqueio?.motivos || [],
            };
        }),
    };
}

export async function getDistribuicoesPendentes() {
    const rows = await db.distribuicao.findMany({
        where: { status: "SUGERIDA" },
        include: {
            publicacao: {
                select: {
                    id: true,
                    tribunal: true,
                    conteudo: true,
                    processoNumero: true,
                    dataPublicacao: true,
                },
            },
            advogado: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
    });

    const PREVIEW_MAX = 700;
    return rows.map((row) => {
        if (!row.publicacao) return row;
        const raw = String(row.publicacao.conteudo || "");
        const normalized = raw.replace(/\s+/g, " ").trim();
        const len = normalized.length;
        const truncado = len > PREVIEW_MAX;
        const preview = truncado ? `${normalized.slice(0, PREVIEW_MAX).trimEnd()}…` : normalized;

        return {
            ...row,
            publicacao: {
                ...row.publicacao,
                conteudo: preview,
                conteudoLen: len,
                conteudoTruncado: truncado,
            },
        };
    });
}

export async function getDistribuicaoStats() {
    const [sugeridas, aprovadas, rejeitadas] = await Promise.all([
        db.distribuicao.count({ where: { status: "SUGERIDA" } }),
        db.distribuicao.count({ where: { status: "APROVADA" } }),
        db.distribuicao.count({ where: { status: "REJEITADA" } }),
    ]);
    return { sugeridas, aprovadas, rejeitadas };
}
