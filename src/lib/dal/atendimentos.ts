import "server-only";

import type { StatusOperacionalAtendimento } from "@/generated/prisma";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import { ATENDIMENTO_KANBAN_COLUMNS } from "@/lib/atendimentos-workflow";

export interface AtendimentoFilters {
    search?: string;
    statusOperacional?: StatusOperacionalAtendimento;
    advogadoId?: string;
    clienteId?: string;
    page?: number;
    pageSize?: number;
}

const PIPELINE_OPEN_STATUSES: StatusOperacionalAtendimento[] = [
    "NOVO",
    "TRIAGEM",
    "AGUARDANDO_CLIENTE",
    "AGUARDANDO_EQUIPE_INTERNA",
    "EM_ANALISE_JURIDICA",
    "AGUARDANDO_DOCUMENTOS",
    "REUNIAO_AGENDADA",
    "REUNIAO_CONFIRMADA",
    "PROPOSTA_ENVIADA",
    "EM_NEGOCIACAO",
];

const PROPOSAL_STATUSES: StatusOperacionalAtendimento[] = [
    "REUNIAO_AGENDADA",
    "REUNIAO_CONFIRMADA",
    "PROPOSTA_ENVIADA",
    "EM_NEGOCIACAO",
];

const QUALIFICATION_ANALYSIS_STATUSES: StatusOperacionalAtendimento[] = [
    "TRIAGEM",
    "AGUARDANDO_EQUIPE_INTERNA",
    "EM_ANALISE_JURIDICA",
];

function toNumber(value: unknown) {
    if (value == null) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number.parseFloat(value);
    return Number(value);
}

function startOfDay(date: Date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
}

function addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function diffInDays(from: Date, to: Date) {
    return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

function getUpcomingDeadline(record: {
    dataRetorno: Date | null;
    proximaAcaoAt: Date | null;
}) {
    if (record.dataRetorno && record.proximaAcaoAt) {
        return record.dataRetorno < record.proximaAcaoAt ? record.dataRetorno : record.proximaAcaoAt;
    }

    return record.proximaAcaoAt ?? record.dataRetorno;
}

function buildAtendimentoInclude() {
    return {
        cliente: { select: { id: true, nome: true, telefone: true, email: true } },
        advogado: { include: { user: { select: { name: true } } } },
        _count: { select: { historicos: true } },
        historicos: {
            orderBy: { createdAt: "desc" as const },
            take: 4,
            select: {
                id: true,
                canal: true,
                descricao: true,
                userId: true,
                createdAt: true,
            },
        },
    };
}

export async function getAtendimentos(filters: AtendimentoFilters = {}) {
    const {
        search,
        statusOperacional,
        advogadoId,
        clienteId,
        page = 1,
        pageSize = 20,
    } = filters;

    const where: Record<string, unknown> = {};

    if (search) {
        where.OR = [
            { assunto: { contains: search, mode: "insensitive" } },
            { resumo: { contains: search, mode: "insensitive" } },
            { areaJuridica: { contains: search, mode: "insensitive" } },
            { cliente: { nome: { contains: search, mode: "insensitive" } } },
        ];
    }

    if (statusOperacional) where.statusOperacional = statusOperacional;
    if (advogadoId) where.advogadoId = advogadoId;
    if (clienteId) where.clienteId = clienteId;

    const include = buildAtendimentoInclude();

    const [atendimentos, total] = await Promise.all([
        db.atendimento.findMany({
            where,
            include,
            orderBy: { updatedAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        db.atendimento.count({ where }),
    ]);

    return { atendimentos, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getAtendimentosPipeline() {
    const atendimentos = await db.atendimento.findMany({
        include: buildAtendimentoInclude(),
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: 300,
    });

    return Object.fromEntries(
        ATENDIMENTO_KANBAN_COLUMNS.map((column) => [
            column.id,
            atendimentos.filter((item) =>
                (column.statuses as readonly StatusOperacionalAtendimento[]).includes(item.statusOperacional),
            ),
        ]),
    );
}

export async function getAtendimentoById(id: string) {
    return db.atendimento.findUnique({
        where: { id },
        include: {
            cliente: true,
            advogado: { include: { user: true } },
            historicos: { orderBy: { createdAt: "desc" }, take: 50 },
        },
    });
}

export async function getAtendimentoStats(advogadoId?: string) {
    const where = advogadoId ? { advogadoId } : {};
    const atendimentos = await db.atendimento.findMany({
        where,
        select: {
            id: true,
            statusOperacional: true,
            prioridade: true,
            areaJuridica: true,
            createdAt: true,
            updatedAt: true,
            dataRetorno: true,
            proximaAcaoAt: true,
            ultimaInteracaoEm: true,
            valorEstimado: true,
            motivoPerda: true,
            advogadoId: true,
            advogado: { include: { user: { select: { name: true } } } },
        },
    });

    const now = new Date();
    const today = startOfDay(now);
    const last7Days = addDays(today, -7);
    const last14Days = addDays(today, -14);
    const last30Days = addDays(today, -30);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const novosUltimos7 = atendimentos.filter((item) => item.createdAt >= last7Days).length;
    const novos7Anterior = atendimentos.filter((item) => item.createdAt >= last14Days && item.createdAt < last7Days).length;
    const variationNovos = novos7Anterior === 0
        ? (novosUltimos7 > 0 ? 100 : 0)
        : Math.round(((novosUltimos7 - novos7Anterior) / novos7Anterior) * 100);

    const emAnalise = atendimentos.filter((item) => QUALIFICATION_ANALYSIS_STATUSES.includes(item.statusOperacional)).length;
    const propostas = atendimentos.filter((item) => PROPOSAL_STATUSES.includes(item.statusOperacional));
    const propostasPendentes = propostas.length;
    const propostasPendentesValor = propostas.reduce((total, item) => total + toNumber(item.valorEstimado), 0);

    const base30Dias = atendimentos.filter((item) => item.createdAt >= last30Days);
    const convertidos30Dias = base30Dias.filter((item) => item.statusOperacional === "CONTRATADO").length;
    const taxaConversao = base30Dias.length > 0 ? Math.round((convertidos30Dias / base30Dias.length) * 100) : 0;

    const contratadosMesRegistros = atendimentos.filter(
        (item) => item.statusOperacional === "CONTRATADO" && item.updatedAt >= monthStart,
    );
    const contratadosMes = contratadosMesRegistros.length;
    const contratadosMesValor = contratadosMesRegistros.reduce((total, item) => total + toNumber(item.valorEstimado), 0);

    const alertasPrazo = atendimentos.filter((item) => {
        if (!PIPELINE_OPEN_STATUSES.includes(item.statusOperacional)) return false;
        const deadline = getUpcomingDeadline(item);
        return Boolean(deadline && deadline <= addDays(now, 2));
    }).length;

    const semInteracaoCritica = atendimentos.filter((item) => {
        if (!PIPELINE_OPEN_STATUSES.includes(item.statusOperacional)) return false;
        const lastTouch = item.ultimaInteracaoEm ?? item.updatedAt;
        return diffInDays(lastTouch, now) >= 5;
    }).length;

    const areaBuckets = atendimentos.reduce<Record<string, number>>((acc, item) => {
        const area = item.areaJuridica?.trim() || "Nao classificado";
        acc[area] = (acc[area] || 0) + 1;
        return acc;
    }, {});

    const areaDistribution = Object.entries(areaBuckets)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    const lawyerRankingMap = atendimentos.reduce<Record<string, { label: string; atendimentos: number; convertidos: number }>>((acc, item) => {
        const key = item.advogadoId;
        const label = item.advogado.user.name || "Sem responsavel";

        if (!acc[key]) {
            acc[key] = { label, atendimentos: 0, convertidos: 0 };
        }

        acc[key].atendimentos += 1;

        if (item.statusOperacional === "CONTRATADO") {
            acc[key].convertidos += 1;
        }

        return acc;
    }, {});

    const lawyerRanking = Object.values(lawyerRankingMap)
        .map((item) => ({
            ...item,
            taxa: item.atendimentos > 0 ? Math.round((item.convertidos / item.atendimentos) * 100) : 0,
        }))
        .sort((a, b) => b.convertidos - a.convertidos || b.atendimentos - a.atendimentos)
        .slice(0, 5);

    const motivosMap = atendimentos.reduce<Record<string, number>>((acc, item) => {
        if (item.statusOperacional !== "NAO_CONTRATADO") return acc;
        const motivo = item.motivoPerda?.trim() || "Sem motivo registrado";
        acc[motivo] = (acc[motivo] || 0) + 1;
        return acc;
    }, {});

    const motivosNaoConversao = Object.entries(motivosMap)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 4);

    const tempoMedioPorFase = ATENDIMENTO_KANBAN_COLUMNS.map((column) => {
        const items = atendimentos.filter((item) =>
            (column.statuses as readonly StatusOperacionalAtendimento[]).includes(item.statusOperacional),
        );
        const mediaDias = items.length > 0
            ? Math.round(items.reduce((total, item) => total + diffInDays(item.updatedAt, now), 0) / items.length)
            : 0;

        return {
            id: column.id,
            label: column.label,
            value: mediaDias,
        };
    });

    const novasEntradas = atendimentos.filter((item) => item.statusOperacional === "NOVO").length;
    const aguardandoCliente = atendimentos.filter((item) =>
        ["AGUARDANDO_CLIENTE", "AGUARDANDO_DOCUMENTOS"].includes(item.statusOperacional),
    ).length;
    const contratados = atendimentos.filter((item) => item.statusOperacional === "CONTRATADO").length;
    const encerrados = atendimentos.filter((item) =>
        ["NAO_CONTRATADO", "ENCERRADO"].includes(item.statusOperacional),
    ).length;

    return {
        total: atendimentos.length,
        leads: atendimentos.filter((item) => PIPELINE_OPEN_STATUSES.includes(item.statusOperacional)).length,
        qualificacao: emAnalise,
        proposta: propostasPendentes,
        fechamento: contratados + encerrados,
        convertidos: contratados,
        perdidos: encerrados,
        novos: novasEntradas,
        aguardandoCliente,
        emAnalise,
        reuniaoProposta: propostasPendentes,
        contratados,
        encerrados,
        pipelineAbertos: atendimentos.filter((item) => PIPELINE_OPEN_STATUSES.includes(item.statusOperacional)).length,
        pipelineFechados: contratados + encerrados,
        statusAbertos: PIPELINE_OPEN_STATUSES,
        novosUltimos7,
        variationNovos,
        propostasPendentes,
        propostasPendentesValor,
        taxaConversao,
        contratadosMes,
        contratadosMesValor,
        alertasPrazo,
        semInteracaoCritica,
        areaDistribution,
        lawyerRanking,
        motivosNaoConversao,
        tempoMedioPorFase,
    };
}
