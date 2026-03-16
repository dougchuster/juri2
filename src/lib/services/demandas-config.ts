import "server-only";

import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { AREAS_ATUACAO } from "@/lib/services/areas-atuacao";
import {
    DEMANDAS_IA_PLANO_STATUS,
    DEMANDAS_IA_PLANO_TIPOS,
    DEMANDAS_PAPEL_RESPONSAVEL,
    DEMANDAS_PERIODICIDADES,
    DEMANDAS_PRIORIDADES_TAREFA,
    type DemandaIaPlano,
    type DemandaIaPlanoStatus,
    type DemandaPlanejamentoAgendadoConfig,
    type DemandaPlanejamentoAgendadoEscopo,
    type DemandaRotinaRegra,
    type DemandaRotinaRecorrente,
    type DemandaRotinaTemplate,
} from "@/lib/types/demandas";

export const DEMANDAS_ROTINAS_CONFIG_KEY = "DEMANDAS_ROTINAS_CONFIG";
export const DEMANDAS_IA_PLANOS_KEY = "DEMANDAS_IA_PLANOS";
export const DEMANDAS_ROTINAS_TEMPLATES_KEY = "DEMANDAS_ROTINAS_TEMPLATES";
export const DEMANDAS_ROTINAS_REGRAS_KEY = "DEMANDAS_ROTINAS_REGRAS";
export const DEMANDAS_PLANEJAMENTO_AGENDADO_KEY = "DEMANDAS_PLANEJAMENTO_AGENDADO";
const DEMANDAS_MAX_PLANOS = 200;

const DEFAULT_PLANEJAMENTO_AGENDADO_CONFIG: DemandaPlanejamentoAgendadoConfig = {
    enabled: true,
    escopos: [
        {
            id: "escopo-geral-diario",
            nome: "Planejamento diario geral",
            ativo: true,
            area: "TODAS",
            timeId: null,
            hora: 7,
            minuto: 5,
            periodoDias: 30,
            incluirRedistribuicao: true,
            maxResponsaveis: 6,
            ultimaExecucaoEm: null,
            ultimaSimulacaoEm: null,
            ultimaFalhaEm: null,
            ultimaFalhaMensagem: null,
            totalExecucoes: 0,
            totalFalhas: 0,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
        },
    ],
    updatedAt: "2026-01-01T00:00:00.000Z",
};

const DEFAULT_ROTINAS_TEMPLATES: DemandaRotinaTemplate[] = [
    {
        id: "template-publicacoes-diaria",
        nome: "Triagem diaria de publicacoes",
        descricao: "Conferir novas publicacoes, classificar status e iniciar vinculacao de processos.",
        area: "TODAS",
        papelResponsavel: "CONTROLADOR",
        periodicidade: "DIARIA",
        diaSemana: null,
        diaMes: null,
        prioridade: "ALTA",
        slaDias: 0,
        checklist: [
            "Conferir publicacoes novas do dia",
            "Validar OAB e nome pesquisado",
            "Vincular ao processo correto",
            "Gerar prazo quando aplicavel",
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
        id: "template-financeiro-semanal",
        nome: "Follow-up financeiro semanal",
        descricao: "Revisar inadimplencia e tarefas financeiras criticas de clientes ativos.",
        area: "TODAS",
        papelResponsavel: "FINANCEIRO",
        periodicidade: "SEMANAL",
        diaSemana: 1,
        diaMes: null,
        prioridade: "NORMAL",
        slaDias: 2,
        checklist: [
            "Listar clientes inadimplentes",
            "Priorizar cobrancas em atraso",
            "Notificar responsavel juridico em casos sensiveis",
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
        id: "template-trabalhista-audiencia",
        nome: "Preparacao semanal de audiencias trabalhistas",
        descricao: "Consolidar casos de audiencia da semana e distribuir preparacao.",
        area: "TRABALHISTA",
        papelResponsavel: "ADVOGADO",
        periodicidade: "SEMANAL",
        diaSemana: 1,
        diaMes: null,
        prioridade: "ALTA",
        slaDias: 3,
        checklist: [
            "Listar audiencias da semana",
            "Validar documentos e provas",
            "Checar estrategia com responsavel tecnico",
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
        id: "template-civil-fechamento",
        nome: "Fechamento mensal da carteira civel",
        descricao: "Revisar carteira da area civel e consolidar pendencias abertas do mes.",
        area: "CIVIL",
        papelResponsavel: "SOCIO",
        periodicidade: "MENSAL",
        diaSemana: null,
        diaMes: 5,
        prioridade: "NORMAL",
        slaDias: 5,
        checklist: [
            "Consolidar prazos pendentes",
            "Mapear processos sem movimentacao",
            "Definir plano mensal por cliente prioritario",
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
    },
];

function toString(value: unknown, fallback = "") {
    return typeof value === "string" ? value.trim() : fallback;
}

function toBoolean(value: unknown, fallback: boolean) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return fallback;
}

function toNumber(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    if (parsed < min) return min;
    if (parsed > max) return max;
    return Math.round(parsed);
}

function toIsoDate(value: unknown, fallback = new Date().toISOString()) {
    if (typeof value !== "string") return fallback;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return parsed.toISOString();
}

function toChecklist(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => toString(item))
        .filter((item) => item.length > 0)
        .slice(0, 30);
}

function normalizeArea(value: unknown) {
    if (value === "TODAS") return "TODAS";
    const stringValue = toString(value, "TODAS");
    return AREAS_ATUACAO.includes(stringValue as never) ? stringValue : "TODAS";
}

function normalizePeriodicidade(value: unknown): DemandaRotinaRecorrente["periodicidade"] {
    const normalized = toString(value, "SEMANAL").toUpperCase();
    return DEMANDAS_PERIODICIDADES.includes(normalized as never)
        ? (normalized as DemandaRotinaRecorrente["periodicidade"])
        : "SEMANAL";
}

function normalizePapel(value: unknown): DemandaRotinaRecorrente["papelResponsavel"] {
    const normalized = toString(value, "AUTO").toUpperCase();
    return DEMANDAS_PAPEL_RESPONSAVEL.includes(normalized as never)
        ? (normalized as DemandaRotinaRecorrente["papelResponsavel"])
        : "AUTO";
}

function normalizePrioridade(value: unknown): DemandaRotinaRecorrente["prioridade"] {
    const normalized = toString(value, "NORMAL").toUpperCase();
    return DEMANDAS_PRIORIDADES_TAREFA.includes(normalized as never)
        ? (normalized as DemandaRotinaRecorrente["prioridade"])
        : "NORMAL";
}

function normalizePeriodicidadeOverride(value: unknown): DemandaRotinaRegra["periodicidadeOverride"] {
    const normalized = toString(value, "AUTO").toUpperCase();
    if (normalized === "AUTO") return "AUTO";
    return DEMANDAS_PERIODICIDADES.includes(normalized as never)
        ? (normalized as DemandaRotinaRegra["periodicidadeOverride"])
        : "AUTO";
}

function normalizePrioridadeOverride(value: unknown): DemandaRotinaRegra["prioridadeOverride"] {
    const normalized = toString(value, "AUTO").toUpperCase();
    if (normalized === "AUTO") return "AUTO";
    return DEMANDAS_PRIORIDADES_TAREFA.includes(normalized as never)
        ? (normalized as DemandaRotinaRegra["prioridadeOverride"])
        : "AUTO";
}

function normalizePlanoTipo(value: unknown): DemandaIaPlano["tipo"] {
    const normalized = toString(value, "ANALISE").toUpperCase();
    return DEMANDAS_IA_PLANO_TIPOS.includes(normalized as never)
        ? (normalized as DemandaIaPlano["tipo"])
        : "ANALISE";
}

function normalizePlanoStatus(value: unknown): DemandaIaPlano["status"] {
    const normalized = toString(value, "PENDENTE").toUpperCase();
    return DEMANDAS_IA_PLANO_STATUS.includes(normalized as never)
        ? (normalized as DemandaIaPlano["status"])
        : "PENDENTE";
}

function normalizeJsonObject(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

function normalizeRotina(value: unknown): DemandaRotinaRecorrente {
    const payload = normalizeJsonObject(value);
    const periodicidade = normalizePeriodicidade(payload.periodicidade);
    const createdAt = toIsoDate(payload.createdAt);
    const updatedAt = toIsoDate(payload.updatedAt, createdAt);

    return {
        id: toString(payload.id, crypto.randomUUID()),
        nome: toString(payload.nome, "Rotina sem titulo"),
        descricao: toString(payload.descricao),
        area: normalizeArea(payload.area),
        papelResponsavel: normalizePapel(payload.papelResponsavel),
        advogadoId: toString(payload.advogadoId) || null,
        periodicidade,
        diaSemana:
            periodicidade === "SEMANAL"
                ? toNumber(payload.diaSemana, 1, 0, 6)
                : null,
        diaMes:
            periodicidade === "MENSAL"
                ? toNumber(payload.diaMes, 1, 1, 28)
                : null,
        prioridade: normalizePrioridade(payload.prioridade),
        slaDias: toNumber(payload.slaDias, 1, 0, 90),
        checklist: toChecklist(payload.checklist),
        ativo: toBoolean(payload.ativo, true),
        ultimaGeracaoEm: toString(payload.ultimaGeracaoEm) || null,
        proximaExecucaoEm: toIsoDate(payload.proximaExecucaoEm),
        criadoPorId: toString(payload.criadoPorId) || null,
        templateId: toString(payload.templateId) || null,
        regraId: toString(payload.regraId) || null,
        createdAt,
        updatedAt,
    };
}

function normalizePlano(value: unknown): DemandaIaPlano {
    const payload = normalizeJsonObject(value);
    const solicitadoEm = toIsoDate(payload.solicitadoEm);
    return {
        id: toString(payload.id, crypto.randomUUID()),
        tipo: normalizePlanoTipo(payload.tipo),
        status: normalizePlanoStatus(payload.status),
        pergunta: toString(payload.pergunta),
        area: normalizeArea(payload.area),
        advogadoId: toString(payload.advogadoId) || null,
        periodoDias: toNumber(payload.periodoDias, 30, 7, 120),
        resumo: toString(payload.resumo),
        conteudo: toString(payload.conteudo),
        sugestoes: toChecklist(payload.sugestoes),
        solicitadoPorId: toString(payload.solicitadoPorId),
        solicitadoEm,
        aplicadoPorId: toString(payload.aplicadoPorId) || null,
        aplicadoEm: toString(payload.aplicadoEm) || null,
        model: toString(payload.model) || null,
        provider: toString(payload.provider, "Kimi 2.5"),
        metadados: normalizeJsonObject(payload.metadados),
    };
}

function normalizeTemplate(value: unknown): DemandaRotinaTemplate {
    const payload = normalizeJsonObject(value);
    const periodicidade = normalizePeriodicidade(payload.periodicidade);
    const createdAt = toIsoDate(payload.createdAt);
    const updatedAt = toIsoDate(payload.updatedAt, createdAt);

    return {
        id: toString(payload.id, crypto.randomUUID()),
        nome: toString(payload.nome, "Template sem titulo"),
        descricao: toString(payload.descricao),
        area: normalizeArea(payload.area),
        papelResponsavel: normalizePapel(payload.papelResponsavel),
        periodicidade,
        diaSemana: periodicidade === "SEMANAL" ? toNumber(payload.diaSemana, 1, 0, 6) : null,
        diaMes: periodicidade === "MENSAL" ? toNumber(payload.diaMes, 1, 1, 28) : null,
        prioridade: normalizePrioridade(payload.prioridade),
        slaDias: toNumber(payload.slaDias, 1, 0, 90),
        checklist: toChecklist(payload.checklist),
        createdAt,
        updatedAt,
    };
}

function normalizeRegra(value: unknown): DemandaRotinaRegra {
    const payload = normalizeJsonObject(value);
    const createdAt = toIsoDate(payload.createdAt);
    const updatedAt = toIsoDate(payload.updatedAt, createdAt);
    return {
        id: toString(payload.id, crypto.randomUUID()),
        nome: toString(payload.nome, "Regra sem titulo"),
        templateId: toString(payload.templateId),
        ativo: toBoolean(payload.ativo, true),
        papelResponsavel: normalizePapel(payload.papelResponsavel),
        timeId: toString(payload.timeId) || null,
        areaOverride: normalizeArea(payload.areaOverride),
        periodicidadeOverride: normalizePeriodicidadeOverride(payload.periodicidadeOverride),
        prioridadeOverride: normalizePrioridadeOverride(payload.prioridadeOverride),
        slaDiasOverride:
            payload.slaDiasOverride === null || payload.slaDiasOverride === undefined
                ? null
                : toNumber(payload.slaDiasOverride, 1, 0, 90),
        ultimaAplicacaoEm: toString(payload.ultimaAplicacaoEm) || null,
        ultimaSimulacaoEm: toString(payload.ultimaSimulacaoEm) || null,
        totalExecucoes: toNumber(payload.totalExecucoes, 0, 0, 1000000),
        totalSimulacoes: toNumber(payload.totalSimulacoes, 0, 0, 1000000),
        totalCriadas: toNumber(payload.totalCriadas, 0, 0, 1000000),
        totalAtualizadas: toNumber(payload.totalAtualizadas, 0, 0, 1000000),
        totalIgnoradas: toNumber(payload.totalIgnoradas, 0, 0, 1000000),
        createdAt,
        updatedAt,
    };
}

function normalizePlanejamentoEscopo(value: unknown): DemandaPlanejamentoAgendadoEscopo {
    const payload = normalizeJsonObject(value);
    const createdAt = toIsoDate(payload.createdAt);
    const updatedAt = toIsoDate(payload.updatedAt, createdAt);
    return {
        id: toString(payload.id, crypto.randomUUID()),
        nome: toString(payload.nome, "Escopo de planejamento"),
        ativo: toBoolean(payload.ativo, true),
        area: normalizeArea(payload.area),
        timeId: toString(payload.timeId) || null,
        hora: toNumber(payload.hora, 7, 0, 23),
        minuto: toNumber(payload.minuto, 0, 0, 59),
        periodoDias: toNumber(payload.periodoDias, 30, 7, 120),
        incluirRedistribuicao: toBoolean(payload.incluirRedistribuicao, true),
        maxResponsaveis: toNumber(payload.maxResponsaveis, 6, 1, 12),
        ultimaExecucaoEm: toString(payload.ultimaExecucaoEm) || null,
        ultimaSimulacaoEm: toString(payload.ultimaSimulacaoEm) || null,
        ultimaFalhaEm: toString(payload.ultimaFalhaEm) || null,
        ultimaFalhaMensagem: toString(payload.ultimaFalhaMensagem) || null,
        totalExecucoes: toNumber(payload.totalExecucoes, 0, 0, 1000000),
        totalFalhas: toNumber(payload.totalFalhas, 0, 0, 1000000),
        createdAt,
        updatedAt,
    };
}

function normalizePlanejamentoConfig(value: unknown): DemandaPlanejamentoAgendadoConfig {
    const payload = normalizeJsonObject(value);
    const rawEscopos = Array.isArray(payload.escopos) ? payload.escopos : [];
    const escopos = rawEscopos
        .map((item) => normalizePlanejamentoEscopo(item))
        .slice(0, 80);
    const updatedAt = toIsoDate(payload.updatedAt);
    return {
        enabled: toBoolean(payload.enabled, DEFAULT_PLANEJAMENTO_AGENDADO_CONFIG.enabled),
        escopos:
            escopos.length > 0
                ? escopos
                : DEFAULT_PLANEJAMENTO_AGENDADO_CONFIG.escopos.map((item) =>
                      normalizePlanejamentoEscopo(item)
                  ),
        updatedAt,
    };
}

function normalizeRotinasPayload(value: unknown): DemandaRotinaRecorrente[] {
    const payload = normalizeJsonObject(value);
    const raw = Array.isArray(payload.rotinas) ? payload.rotinas : Array.isArray(value) ? value : [];
    return raw.map((item) => normalizeRotina(item));
}

function normalizePlanosPayload(value: unknown): DemandaIaPlano[] {
    const payload = normalizeJsonObject(value);
    const raw = Array.isArray(payload.planos) ? payload.planos : Array.isArray(value) ? value : [];
    return raw.map((item) => normalizePlano(item)).slice(0, DEMANDAS_MAX_PLANOS);
}

function normalizeTemplatesPayload(value: unknown): DemandaRotinaTemplate[] {
    const payload = normalizeJsonObject(value);
    const raw = Array.isArray(payload.templates)
        ? payload.templates
        : Array.isArray(value)
          ? value
          : [];
    return raw.map((item) => normalizeTemplate(item));
}

function normalizeRegrasPayload(value: unknown): DemandaRotinaRegra[] {
    const payload = normalizeJsonObject(value);
    const raw = Array.isArray(payload.regras) ? payload.regras : Array.isArray(value) ? value : [];
    return raw.map((item) => normalizeRegra(item));
}

export async function getDemandasRotinasConfig(): Promise<DemandaRotinaRecorrente[]> {
    try {
        const row = await db.appSetting.findUnique({
            where: { key: DEMANDAS_ROTINAS_CONFIG_KEY },
            select: { value: true },
        });
        if (!row) return [];
        return normalizeRotinasPayload(row.value);
    } catch (error) {
        console.warn("[DemandasConfig] Falha ao carregar rotinas:", error);
        return [];
    }
}

export async function saveDemandasRotinasConfig(
    rotinas: DemandaRotinaRecorrente[]
): Promise<DemandaRotinaRecorrente[]> {
    const normalized = rotinas.map((item) => normalizeRotina(item));
    try {
        await db.appSetting.upsert({
            where: { key: DEMANDAS_ROTINAS_CONFIG_KEY },
            update: {
                value: { rotinas: normalized } as unknown as Prisma.InputJsonValue,
            },
            create: {
                key: DEMANDAS_ROTINAS_CONFIG_KEY,
                value: { rotinas: normalized } as unknown as Prisma.InputJsonValue,
            },
        });
    } catch (error) {
        console.warn("[DemandasConfig] Falha ao salvar rotinas:", error);
    }
    return normalized;
}

export async function getDemandasIaPlanosConfig(): Promise<DemandaIaPlano[]> {
    try {
        const row = await db.appSetting.findUnique({
            where: { key: DEMANDAS_IA_PLANOS_KEY },
            select: { value: true },
        });
        if (!row) return [];
        return normalizePlanosPayload(row.value);
    } catch (error) {
        console.warn("[DemandasConfig] Falha ao carregar planos de IA:", error);
        return [];
    }
}

export async function getDemandasRotinasTemplatesConfig(): Promise<DemandaRotinaTemplate[]> {
    try {
        const row = await db.appSetting.findUnique({
            where: { key: DEMANDAS_ROTINAS_TEMPLATES_KEY },
            select: { value: true },
        });
        if (!row) return DEFAULT_ROTINAS_TEMPLATES;
        const saved = normalizeTemplatesPayload(row.value);
        if (saved.length === 0) return DEFAULT_ROTINAS_TEMPLATES;
        return saved;
    } catch (error) {
        console.warn("[DemandasConfig] Falha ao carregar templates de rotinas:", error);
        return DEFAULT_ROTINAS_TEMPLATES;
    }
}

export async function saveDemandasRotinasTemplatesConfig(
    templates: DemandaRotinaTemplate[]
): Promise<DemandaRotinaTemplate[]> {
    const normalized = templates.map((item) => normalizeTemplate(item));
    try {
        await db.appSetting.upsert({
            where: { key: DEMANDAS_ROTINAS_TEMPLATES_KEY },
            update: {
                value: { templates: normalized } as unknown as Prisma.InputJsonValue,
            },
            create: {
                key: DEMANDAS_ROTINAS_TEMPLATES_KEY,
                value: { templates: normalized } as unknown as Prisma.InputJsonValue,
            },
        });
    } catch (error) {
        console.warn("[DemandasConfig] Falha ao salvar templates de rotinas:", error);
    }
    return normalized;
}

export async function getDemandasRotinasRegrasConfig(): Promise<DemandaRotinaRegra[]> {
    try {
        const row = await db.appSetting.findUnique({
            where: { key: DEMANDAS_ROTINAS_REGRAS_KEY },
            select: { value: true },
        });
        if (!row) return [];
        return normalizeRegrasPayload(row.value);
    } catch (error) {
        console.warn("[DemandasConfig] Falha ao carregar regras de rotinas:", error);
        return [];
    }
}

export async function saveDemandasRotinasRegrasConfig(
    regras: DemandaRotinaRegra[]
): Promise<DemandaRotinaRegra[]> {
    const normalized = regras.map((item) => normalizeRegra(item));
    try {
        await db.appSetting.upsert({
            where: { key: DEMANDAS_ROTINAS_REGRAS_KEY },
            update: {
                value: { regras: normalized } as unknown as Prisma.InputJsonValue,
            },
            create: {
                key: DEMANDAS_ROTINAS_REGRAS_KEY,
                value: { regras: normalized } as unknown as Prisma.InputJsonValue,
            },
        });
    } catch (error) {
        console.warn("[DemandasConfig] Falha ao salvar regras de rotinas:", error);
    }
    return normalized;
}

export async function getDemandasPlanejamentoAgendadoConfig(): Promise<DemandaPlanejamentoAgendadoConfig> {
    try {
        const row = await db.appSetting.findUnique({
            where: { key: DEMANDAS_PLANEJAMENTO_AGENDADO_KEY },
            select: { value: true },
        });
        if (!row) return DEFAULT_PLANEJAMENTO_AGENDADO_CONFIG;
        return normalizePlanejamentoConfig(row.value);
    } catch (error) {
        console.warn("[DemandasConfig] Falha ao carregar agendamento de planejamento:", error);
        return DEFAULT_PLANEJAMENTO_AGENDADO_CONFIG;
    }
}

export async function saveDemandasPlanejamentoAgendadoConfig(
    config: DemandaPlanejamentoAgendadoConfig
): Promise<DemandaPlanejamentoAgendadoConfig> {
    const normalized = normalizePlanejamentoConfig(config);
    try {
        await db.appSetting.upsert({
            where: { key: DEMANDAS_PLANEJAMENTO_AGENDADO_KEY },
            update: {
                value: normalized as unknown as Prisma.InputJsonValue,
            },
            create: {
                key: DEMANDAS_PLANEJAMENTO_AGENDADO_KEY,
                value: normalized as unknown as Prisma.InputJsonValue,
            },
        });
    } catch (error) {
        console.warn("[DemandasConfig] Falha ao salvar agendamento de planejamento:", error);
    }
    return normalized;
}

export async function saveDemandasIaPlanosConfig(planos: DemandaIaPlano[]): Promise<DemandaIaPlano[]> {
    const normalized = planos.map((item) => normalizePlano(item)).slice(0, DEMANDAS_MAX_PLANOS);
    try {
        await db.appSetting.upsert({
            where: { key: DEMANDAS_IA_PLANOS_KEY },
            update: {
                value: { planos: normalized } as unknown as Prisma.InputJsonValue,
            },
            create: {
                key: DEMANDAS_IA_PLANOS_KEY,
                value: { planos: normalized } as unknown as Prisma.InputJsonValue,
            },
        });
    } catch (error) {
        console.warn("[DemandasConfig] Falha ao salvar planos de IA:", error);
    }
    return normalized;
}

export interface CreateDemandaIaPlanoInput {
    tipo: DemandaIaPlano["tipo"];
    pergunta: string;
    area: string;
    advogadoId?: string | null;
    periodoDias: number;
    resumo: string;
    conteudo: string;
    sugestoes?: string[];
    solicitadoPorId: string;
    provider?: string;
    model?: string | null;
    metadados?: Record<string, unknown>;
}

export async function createDemandaIaPlano(
    input: CreateDemandaIaPlanoInput
): Promise<DemandaIaPlano> {
    const plan = normalizePlano({
        id: crypto.randomUUID(),
        tipo: input.tipo,
        status: "PENDENTE",
        pergunta: input.pergunta,
        area: input.area,
        advogadoId: input.advogadoId || null,
        periodoDias: input.periodoDias,
        resumo: input.resumo,
        conteudo: input.conteudo,
        sugestoes: input.sugestoes || [],
        solicitadoPorId: input.solicitadoPorId,
        solicitadoEm: new Date().toISOString(),
        aplicadoPorId: null,
        aplicadoEm: null,
        model: input.model || null,
        provider: input.provider || "Kimi 2.5",
        metadados: input.metadados || {},
    });

    const current = await getDemandasIaPlanosConfig();
    await saveDemandasIaPlanosConfig([plan, ...current]);
    return plan;
}

export async function updateDemandaIaPlanoStatus(
    planoId: string,
    status: DemandaIaPlanoStatus,
    actorUserId: string
): Promise<DemandaIaPlano | null> {
    const normalizedStatus = normalizePlanoStatus(status);
    const current = await getDemandasIaPlanosConfig();
    let found: DemandaIaPlano | null = null;
    const next = current.map((item) => {
        if (item.id !== planoId) return item;
        found = {
            ...item,
            status: normalizedStatus,
            aplicadoPorId: normalizedStatus === "PENDENTE" ? null : actorUserId,
            aplicadoEm: normalizedStatus === "PENDENTE" ? null : new Date().toISOString(),
        };
        return found;
    });

    if (!found) return null;
    await saveDemandasIaPlanosConfig(next);
    return found;
}
