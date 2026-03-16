"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import { getDemandasOverview } from "@/lib/dal/demandas";
import { askKimiChat, isKimiConfigured } from "@/lib/services/ai-kimi";
import { Prisma, type Role } from "@/generated/prisma";
import {
    AREAS_ATUACAO,
    inferAreaAtuacaoFromProcess,
    type AreaAtuacaoKey,
} from "@/lib/services/areas-atuacao";
import {
    createDemandaIaPlano,
    getDemandasIaPlanosConfig,
    getDemandasPlanejamentoAgendadoConfig,
    getDemandasRotinasConfig,
    getDemandasRotinasRegrasConfig,
    getDemandasRotinasTemplatesConfig,
    saveDemandasPlanejamentoAgendadoConfig,
    saveDemandasRotinasRegrasConfig,
    saveDemandasRotinasConfig,
    saveDemandasRotinasTemplatesConfig,
    updateDemandaIaPlanoStatus,
} from "@/lib/services/demandas-config";
import {
    DEMANDAS_IA_PLANO_STATUS,
    DEMANDAS_PAPEL_RESPONSAVEL,
    DEMANDAS_PERIODICIDADES,
    DEMANDAS_PRIORIDADES_TAREFA,
    type DemandaPlanejamentoAgendadoConfig,
    type DemandaPlanejamentoAgendadoEscopo,
    type DemandaIaPlanoStatus,
    type DemandaRotinaRegra,
    type DemandaRotinaRecorrente,
    type DemandaRotinaTemplate,
} from "@/lib/types/demandas";
import { revalidatePath } from "next/cache";

const DEMANDAS_LOTE_ALLOWED_ROLES: Role[] = ["ADMIN", "SOCIO", "CONTROLADOR", "ADVOGADO"];
const DEMANDAS_ADMIN_ALLOWED_ROLES: Role[] = ["ADMIN", "SOCIO", "CONTROLADOR"];

const assistenteDemandasSchema = z.object({
    pergunta: z.string().min(3).max(2000),
    area: z.string().optional().default("TODAS"),
    advogadoId: z.string().optional().default(""),
    periodoDias: z.coerce.number().min(7).max(120).default(30),
    persistirPlano: z.coerce.boolean().default(true),
});

const planejamentoDiarioSchema = z.object({
    area: z.string().optional().default("TODAS"),
    advogadoId: z.string().optional().default(""),
    periodoDias: z.coerce.number().min(7).max(120).default(30),
    incluirRedistribuicao: z.coerce.boolean().default(true),
    persistirPlano: z.coerce.boolean().default(true),
});

const aplicarPlanejamentoDiarioSchema = z.object({
    area: z.string().optional().default("TODAS"),
    advogadoId: z.string().optional().default(""),
    timeId: z.string().optional().default(""),
    periodoDias: z.coerce.number().min(7).max(120).default(30),
    incluirRedistribuicao: z.coerce.boolean().default(true),
    planoId: z.string().optional(),
    maxResponsaveis: z.coerce.number().min(1).max(12).default(6),
    simular: z.coerce.boolean().default(false),
    modo: z.enum(["MANUAL", "AUTO"]).default("MANUAL"),
});

const sugestaoRedistribuicaoSchema = z.object({
    tarefaId: z.string().min(1),
    tarefaTitulo: z.string().min(1),
    fromAdvogadoId: z.string().min(1),
    fromAdvogadoNome: z.string().min(1),
    toAdvogadoId: z.string().min(1),
    toAdvogadoNome: z.string().min(1),
    prioridadeAtual: z.enum(["URGENTE", "ALTA", "NORMAL", "BAIXA"]),
    prioridadeSugerida: z.enum(["URGENTE", "ALTA", "NORMAL", "BAIXA"]),
    motivo: z.string().min(3),
    area: z.string().min(1),
});

const gerarRedistribuicaoSchema = z.object({
    area: z.string().optional().default("TODAS"),
    advogadoId: z.string().optional().default(""),
    periodoDias: z.coerce.number().min(7).max(120).default(30),
    maxMovimentos: z.coerce.number().min(1).max(40).default(8),
    persistirPlano: z.coerce.boolean().default(true),
});

const aplicarRedistribuicaoSchema = z.object({
    sugestoes: z.array(sugestaoRedistribuicaoSchema).min(1).max(100),
    pergunta: z.string().optional().default(""),
    origem: z.enum(["IA", "MANUAL"]).default("MANUAL"),
    planoId: z.string().optional(),
});

const atualizarPlanoStatusSchema = z.object({
    planoId: z.string().min(1),
    status: z.enum(DEMANDAS_IA_PLANO_STATUS),
});

const rotinaRecorrenteSchema = z.object({
    id: z.string().optional(),
    nome: z.string().min(3).max(140),
    descricao: z.string().optional().default(""),
    area: z.string().optional().default("TODAS"),
    papelResponsavel: z.string().optional().default("AUTO"),
    advogadoId: z.string().optional().default(""),
    periodicidade: z.enum(DEMANDAS_PERIODICIDADES).default("SEMANAL"),
    diaSemana: z.coerce.number().min(0).max(6).optional(),
    diaMes: z.coerce.number().min(1).max(28).optional(),
    prioridade: z.enum(DEMANDAS_PRIORIDADES_TAREFA).default("NORMAL"),
    slaDias: z.coerce.number().min(0).max(90).default(1),
    checklist: z.array(z.string().min(1).max(160)).max(25).default([]),
    ativo: z.coerce.boolean().default(true),
});

const executarRotinasSchema = z.object({
    modo: z.enum(["MANUAL", "AUTO"]).default("MANUAL"),
});

const loteRotinasSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(200),
    acao: z.enum(["ATIVAR", "PAUSAR", "EXCLUIR"]),
});

const templateRotinaSchema = z.object({
    id: z.string().optional(),
    nome: z.string().min(3).max(140),
    descricao: z.string().optional().default(""),
    area: z.string().optional().default("TODAS"),
    papelResponsavel: z.string().optional().default("AUTO"),
    periodicidade: z.enum(DEMANDAS_PERIODICIDADES).default("SEMANAL"),
    diaSemana: z.coerce.number().min(0).max(6).optional(),
    diaMes: z.coerce.number().min(1).max(28).optional(),
    prioridade: z.enum(DEMANDAS_PRIORIDADES_TAREFA).default("NORMAL"),
    slaDias: z.coerce.number().min(0).max(90).default(1),
    checklist: z.array(z.string().min(1).max(160)).max(25).default([]),
});

const otimizarRotinaIaSchema = z.object({
    nome: z.string().min(3).max(140),
    descricao: z.string().optional().default(""),
    area: z.string().optional().default("TODAS"),
    papelResponsavel: z.string().optional().default("AUTO"),
    periodicidade: z.enum(DEMANDAS_PERIODICIDADES).default("SEMANAL"),
    prioridade: z.enum(DEMANDAS_PRIORIDADES_TAREFA).default("NORMAL"),
    slaDias: z.coerce.number().min(0).max(90).default(1),
    checklist: z.array(z.string().min(1).max(160)).max(30).default([]),
});

const regraRotinaSchema = z.object({
    id: z.string().optional(),
    nome: z.string().min(3).max(140),
    templateId: z.string().min(1),
    ativo: z.coerce.boolean().default(true),
    papelResponsavel: z.string().optional().default("AUTO"),
    timeId: z.string().optional().default(""),
    areaOverride: z.string().optional().default("TODAS"),
    periodicidadeOverride: z.string().optional().default("AUTO"),
    prioridadeOverride: z.string().optional().default("AUTO"),
    slaDiasOverride: z.coerce.number().min(0).max(90).optional(),
});

const loteRegrasSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(400),
    acao: z.enum(["ATIVAR", "PAUSAR"]),
});

const executarRegrasSchema = z.object({
    modo: z.enum(["MANUAL", "AUTO"]).default("MANUAL"),
    simular: z.coerce.boolean().default(false),
});

const planejamentoAgendadoEscopoSchema = z.object({
    id: z.string().optional(),
    nome: z.string().min(3).max(140),
    ativo: z.coerce.boolean().default(true),
    area: z.string().optional().default("TODAS"),
    timeId: z.string().optional().default(""),
    hora: z.coerce.number().min(0).max(23).default(7),
    minuto: z.coerce.number().min(0).max(59).default(5),
    periodoDias: z.coerce.number().min(7).max(120).default(30),
    incluirRedistribuicao: z.coerce.boolean().default(true),
    maxResponsaveis: z.coerce.number().min(1).max(12).default(6),
});

const planejamentoAgendadoConfigSchema = z.object({
    enabled: z.coerce.boolean().default(true),
});

const executarPlanejamentoAgendadoSchema = z.object({
    modo: z.enum(["MANUAL", "AUTO"]).default("AUTO"),
    force: z.coerce.boolean().default(false),
    simular: z.coerce.boolean().default(false),
});

function canApplyDemandasLote(role: Role) {
    return DEMANDAS_LOTE_ALLOWED_ROLES.includes(role);
}

function canManageDemandasAdmin(role: Role) {
    return DEMANDAS_ADMIN_ALLOWED_ROLES.includes(role);
}

function getPermissaoErrorForRole(role: Role) {
    return `Perfil ${role} sem permissao para aplicar acoes em lote de demandas.`;
}

function getAdminPermissaoErrorForRole(role: Role) {
    return `Perfil ${role} sem permissao para configuracoes administrativas de demandas.`;
}

function normalizePapelResponsavel(value: string) {
    return DEMANDAS_PAPEL_RESPONSAVEL.includes(value as never)
        ? (value as DemandaRotinaRecorrente["papelResponsavel"])
        : "AUTO";
}

function normalizePeriodicidadeOverride(
    value: string
): DemandaRotinaRegra["periodicidadeOverride"] {
    const normalized = value.toUpperCase();
    if (normalized === "AUTO") return "AUTO";
    if (DEMANDAS_PERIODICIDADES.includes(normalized as never)) {
        return normalized as DemandaRotinaRegra["periodicidadeOverride"];
    }
    return "AUTO";
}

function normalizePrioridadeOverride(value: string): DemandaRotinaRegra["prioridadeOverride"] {
    const normalized = value.toUpperCase();
    if (normalized === "AUTO") return "AUTO";
    if (DEMANDAS_PRIORIDADES_TAREFA.includes(normalized as never)) {
        return normalized as DemandaRotinaRegra["prioridadeOverride"];
    }
    return "AUTO";
}

function formatDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
}

function endOfDay(date: Date) {
    const next = new Date(date);
    next.setHours(23, 59, 59, 999);
    return next;
}

function computeNextRotinaExecution(rotina: DemandaRotinaRecorrente, now = new Date()) {
    const base = startOfDay(now);
    if (rotina.periodicidade === "DIARIA") {
        const next = new Date(base);
        next.setDate(next.getDate() + 1);
        return next.toISOString();
    }

    if (rotina.periodicidade === "SEMANAL") {
        const target = rotina.diaSemana ?? 1;
        const next = new Date(base);
        const currentDay = next.getDay();
        let delta = target - currentDay;
        if (delta <= 0) delta += 7;
        next.setDate(next.getDate() + delta);
        return next.toISOString();
    }

    const targetDay = rotina.diaMes ?? 1;
    const year = base.getFullYear();
    const month = base.getMonth();
    const candidate = new Date(Date.UTC(year, month, targetDay));
    if (candidate <= base) {
        return new Date(Date.UTC(year, month + 1, targetDay)).toISOString();
    }
    return candidate.toISOString();
}

function summarizeText(text: string, max = 240) {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized.length <= max) return normalized;
    return `${normalized.slice(0, max - 1)}...`;
}

function toTemplateFromInput(
    input: z.infer<typeof templateRotinaSchema>,
    current?: DemandaRotinaTemplate | null
): DemandaRotinaTemplate {
    const nowIso = new Date().toISOString();
    const periodicidade = input.periodicidade;

    return {
        id: input.id || current?.id || crypto.randomUUID(),
        nome: input.nome,
        descricao: input.descricao || "",
        area: normalizeAreaFilter(input.area),
        papelResponsavel: normalizePapelResponsavel(input.papelResponsavel),
        periodicidade,
        diaSemana: periodicidade === "SEMANAL" ? input.diaSemana ?? 1 : null,
        diaMes: periodicidade === "MENSAL" ? input.diaMes ?? 1 : null,
        prioridade: input.prioridade,
        slaDias: input.slaDias,
        checklist: input.checklist,
        createdAt: current?.createdAt || nowIso,
        updatedAt: nowIso,
    };
}

function toRegraFromInput(
    input: z.infer<typeof regraRotinaSchema>,
    current?: DemandaRotinaRegra | null
): DemandaRotinaRegra {
    const nowIso = new Date().toISOString();
    return {
        id: input.id || current?.id || crypto.randomUUID(),
        nome: input.nome,
        templateId: input.templateId,
        ativo: input.ativo,
        papelResponsavel: normalizePapelResponsavel(input.papelResponsavel),
        timeId: input.timeId || null,
        areaOverride: normalizeAreaFilter(input.areaOverride),
        periodicidadeOverride: normalizePeriodicidadeOverride(input.periodicidadeOverride),
        prioridadeOverride: normalizePrioridadeOverride(input.prioridadeOverride),
        slaDiasOverride:
            typeof input.slaDiasOverride === "number" && Number.isFinite(input.slaDiasOverride)
                ? input.slaDiasOverride
                : null,
        ultimaAplicacaoEm: current?.ultimaAplicacaoEm || null,
        ultimaSimulacaoEm: current?.ultimaSimulacaoEm || null,
        totalExecucoes: current?.totalExecucoes || 0,
        totalSimulacoes: current?.totalSimulacoes || 0,
        totalCriadas: current?.totalCriadas || 0,
        totalAtualizadas: current?.totalAtualizadas || 0,
        totalIgnoradas: current?.totalIgnoradas || 0,
        createdAt: current?.createdAt || nowIso,
        updatedAt: nowIso,
    };
}

function toPlanejamentoEscopoFromInput(
    input: z.infer<typeof planejamentoAgendadoEscopoSchema>,
    current?: DemandaPlanejamentoAgendadoEscopo | null
): DemandaPlanejamentoAgendadoEscopo {
    const nowIso = new Date().toISOString();
    return {
        id: input.id || current?.id || crypto.randomUUID(),
        nome: input.nome,
        ativo: input.ativo,
        area: normalizeAreaFilter(input.area),
        timeId: input.timeId || null,
        hora: input.hora,
        minuto: input.minuto,
        periodoDias: input.periodoDias,
        incluirRedistribuicao: input.incluirRedistribuicao,
        maxResponsaveis: input.maxResponsaveis,
        ultimaExecucaoEm: current?.ultimaExecucaoEm || null,
        ultimaSimulacaoEm: current?.ultimaSimulacaoEm || null,
        ultimaFalhaEm: current?.ultimaFalhaEm || null,
        ultimaFalhaMensagem: current?.ultimaFalhaMensagem || null,
        totalExecucoes: current?.totalExecucoes || 0,
        totalFalhas: current?.totalFalhas || 0,
        createdAt: current?.createdAt || nowIso,
        updatedAt: nowIso,
    };
}

function buildFallbackResposta(payload: Awaited<ReturnType<typeof getDemandasOverview>>) {
    const linhas: string[] = [];
    linhas.push("Diagnostico:");
    linhas.push(
        `- Tarefas abertas: ${payload.kpis.tarefasAbertas}; atrasadas: ${payload.kpis.tarefasAtrasadas}.`
    );
    linhas.push(
        `- Prazos pendentes: ${payload.kpis.prazosPendentes}; criticos 7d: ${payload.kpis.prazosCriticos7d}; atrasados: ${payload.kpis.prazosAtrasados}.`
    );

    if (payload.cargaPorResponsavel.length > 0) {
        const top = payload.cargaPorResponsavel[0];
        linhas.push(
            `- Maior carga atual: ${top.nome} (score ${top.scoreCarga}, tarefas ${top.tarefasPendentes}, prazos ${top.prazosPendentes}).`
        );
    }

    linhas.push("Prioridade de acao:");
    if (payload.gargalos.length === 0) {
        linhas.push("- Nao ha gargalos criticos ativos no recorte atual.");
    } else {
        for (const gargalo of payload.gargalos.slice(0, 3)) {
            linhas.push(`- ${gargalo.titulo}: ${gargalo.detalhe}`);
        }
    }

    linhas.push("Proximos passos:");
    for (const sugestao of payload.sugestoesOperacionais.slice(0, 3)) {
        linhas.push(`- ${sugestao}`);
    }
    linhas.push(
        "- Configure KIMI_API_KEY para habilitar analise aprofundada com plano detalhado por responsavel."
    );

    return linhas.join("\n");
}

function buildFallbackPlanejamentoDiario(
    payload: Awaited<ReturnType<typeof getDemandasOverview>>,
    incluirRedistribuicao: boolean
) {
    const linhas: string[] = [];
    const topResponsaveis = payload.cargaPorResponsavel.slice(0, 3);
    const menorCarga =
        payload.cargaPorResponsavel.length > 0
            ? payload.cargaPorResponsavel[payload.cargaPorResponsavel.length - 1]
            : null;

    linhas.push("Resumo executivo do dia:");
    linhas.push(
        `- Tarefas abertas: ${payload.kpis.tarefasAbertas}; tarefas atrasadas: ${payload.kpis.tarefasAtrasadas}.`
    );
    linhas.push(
        `- Prazos pendentes: ${payload.kpis.prazosPendentes}; criticos 7d: ${payload.kpis.prazosCriticos7d}; atrasados: ${payload.kpis.prazosAtrasados}.`
    );
    linhas.push(`- Atendimentos abertos: ${payload.kpis.atendimentosAbertos}.`);

    linhas.push("Prioridades imediatas (hoje):");
    if (payload.kpis.prazosAtrasados > 0) {
        linhas.push(
            `- Tratar ${payload.kpis.prazosAtrasados} prazo(s) atrasado(s) como fila critica com revisao dupla.`
        );
    } else {
        linhas.push("- Manter foco em prazos criticos D+7 e tarefas com data limite hoje.");
    }
    if (payload.kpis.tarefasAtrasadas > 0) {
        linhas.push(
            `- Regularizar ${payload.kpis.tarefasAtrasadas} tarefa(s) atrasada(s) com redistribuicao pontual.`
        );
    }
    if (payload.gargalos.length > 0) {
        linhas.push(`- Gargalo principal: ${payload.gargalos[0].titulo}.`);
    }

    linhas.push("Foco por responsavel:");
    if (topResponsaveis.length === 0) {
        linhas.push("- Nao ha responsaveis com carga consolidada no recorte atual.");
    } else {
        for (const item of topResponsaveis) {
            linhas.push(
                `- ${item.nome}: score ${item.scoreCarga}, tarefas ${item.tarefasPendentes}, prazos ${item.prazosPendentes}, atrasos ${item.tarefasAtrasadas + item.prazosAtrasados}.`
            );
        }
    }

    if (incluirRedistribuicao && topResponsaveis.length > 0 && menorCarga) {
        linhas.push("Redistribuicao sugerida do dia:");
        linhas.push(
            `- Mover atividades de baixa dependencia do topo de carga para ${menorCarga.nome} para equalizar capacidade.`
        );
    }

    linhas.push("Checklist de fechamento:");
    linhas.push("- Confirmar prazos com vencimento em ate 72h.");
    linhas.push("- Revisar filas de tarefas com status A_FAZER/EM_ANDAMENTO.");
    linhas.push("- Atualizar responsaveis e registrar pendencias bloqueantes.");

    return linhas.join("\n");
}

function buildFallbackChecklistRotina(input: z.infer<typeof otimizarRotinaIaSchema>) {
    const checklistAtual = input.checklist
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 20);
    const base = [
        "Confirmar escopo da rotina e prioridade do dia.",
        "Consolidar pendencias abertas relacionadas ao tema.",
        "Executar conferencia operacional com registro de evidencias.",
        "Atualizar status no sistema e sinalizar bloqueios.",
        "Registrar proxima acao e responsavel tecnico de revisao.",
    ];

    const merged = [...checklistAtual, ...base];
    const unique = Array.from(new Set(merged)).slice(0, 12);

    const descricao = input.descricao?.trim()
        ? input.descricao.trim()
        : `Rotina ${input.nome} padronizada para ${input.periodicidade.toLowerCase()} com SLA de ${input.slaDias} dia(s).`;

    return {
        descricao,
        checklist: unique,
        observacoes: [
            "Checklist gerado por fallback local devido indisponibilidade de IA externa.",
            "Revise itens sensiveis conforme politica interna do escritorio.",
        ],
    };
}

export async function executarPlanejamentoDiarioDemandasIA(
    input: z.infer<typeof planejamentoDiarioSchema>
) {
    const parsed = planejamentoDiarioSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: "Dados invalidos para planejamento diario." };
    }

    const session = await getSession();
    if (!session) return { success: false, error: "Nao autenticado." };

    const areaValida =
        parsed.data.area === "TODAS" || AREAS_ATUACAO.includes(parsed.data.area as never)
            ? parsed.data.area
            : "TODAS";

    const payload = await getDemandasOverview({
        area: areaValida as "TODAS",
        advogadoId: parsed.data.advogadoId || undefined,
        periodoDias: parsed.data.periodoDias,
    });

    const contexto = {
        filtros: payload.filtros,
        kpis: payload.kpis,
        gargalos: payload.gargalos,
        topResponsaveis: payload.cargaPorResponsavel.slice(0, 8),
        resumoAreas: payload.resumoPorArea.slice(0, 8),
        sugestoesOperacionais: payload.sugestoesOperacionais,
        incluirRedistribuicao: parsed.data.incluirRedistribuicao,
    };

    let resposta = "";
    let model: string | null = null;
    let enabled = false;
    let planoId: string | null = null;

    try {
        if (isKimiConfigured()) {
            const completion = await askKimiChat(
                [
                    {
                        role: "system",
                        content:
                            "Voce e um planner operacional juridico. Responda em portugues do Brasil, em formato objetivo, com secoes: Resumo executivo, Prioridades de hoje, Foco por responsavel, Redistribuicao sugerida, Checklist de fechamento. Nao invente dados.",
                    },
                    {
                        role: "user",
                        content: [
                            "Gere um planejamento diario operacional para o escritorio juridico.",
                            "Contexto consolidado:",
                            JSON.stringify(contexto, null, 2),
                        ].join("\n\n"),
                    },
                ],
                { maxTokens: 1800, thinking: "enabled" }
            );
            resposta = completion.content;
            model = completion.model;
            enabled = true;
        } else {
            resposta = buildFallbackPlanejamentoDiario(
                payload,
                parsed.data.incluirRedistribuicao
            );
        }
    } catch (error) {
        console.error("[demandas-planejamento] erro na analise:", error);
        resposta = `${buildFallbackPlanejamentoDiario(
            payload,
            parsed.data.incluirRedistribuicao
        )}\n\nObservacao: houve erro na chamada de IA externa, aplicado fallback local.`;
    }

    try {
        await db.logAuditoria.create({
            data: {
                userId: session.id,
                acao: "DEMANDAS_IA_PLANEJAMENTO_DIARIO",
                entidade: "DEMANDAS",
                entidadeId: "PAINEL",
                dadosAntes: {
                    filtros: payload.filtros,
                    incluirRedistribuicao: parsed.data.incluirRedistribuicao,
                } as unknown as Prisma.InputJsonValue,
                dadosDepois: {
                    model: model || "fallback_local",
                    iaAtiva: enabled,
                    kpis: payload.kpis,
                    gargalos: payload.gargalos.length,
                } as unknown as Prisma.InputJsonValue,
            },
        });
    } catch (error) {
        console.warn("[demandas-planejamento] falha ao registrar auditoria:", error);
    }

    if (parsed.data.persistirPlano) {
        try {
            const plano = await createDemandaIaPlano({
                tipo: "ANALISE",
                pergunta: "Planejamento diario operacional",
                area: areaValida,
                advogadoId: parsed.data.advogadoId || null,
                periodoDias: parsed.data.periodoDias,
                resumo: summarizeText(resposta, 220),
                conteudo: resposta,
                solicitadoPorId: session.id,
                provider: "Kimi 2.5",
                model,
                metadados: {
                    tipoPlanejamento: "DIARIO",
                    incluirRedistribuicao: parsed.data.incluirRedistribuicao,
                    filtros: payload.filtros,
                    kpis: payload.kpis,
                    iaAtiva: enabled,
                },
            });
            planoId = plano.id;
        } catch (error) {
            console.warn("[demandas-planejamento] falha ao persistir plano:", error);
        }
    }

    return {
        success: true,
        result: {
            provider: "Kimi 2.5",
            enabled,
            model,
            planoId,
            resposta,
            contextoResumo: {
                filtros: payload.filtros,
                kpis: payload.kpis,
                gargalos: payload.gargalos,
                topResponsaveis: payload.cargaPorResponsavel.slice(0, 3),
            },
        },
    };
}

export async function aplicarPlanejamentoDiarioDemandasIA(
    input: z.infer<typeof aplicarPlanejamentoDiarioSchema>
) {
    const parsed = aplicarPlanejamentoDiarioSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: "Dados invalidos para aplicar planejamento diario." };
    }

    const session = await getSession();
    const manualMode = parsed.data.modo === "MANUAL";
    if (manualMode && !session) return { success: false, error: "Nao autenticado." };
    if (manualMode && session && !canApplyDemandasLote(session.role)) {
        return { success: false, error: getPermissaoErrorForRole(session.role) };
    }

    const actorUserId = session?.id || (await resolveAuditUserId(null));
    if (!actorUserId) {
        return { success: false, error: "Nao foi possivel identificar usuario de auditoria." };
    }

    const area = normalizeAreaFilter(parsed.data.area);
    const advogadoFixo =
        parsed.data.advogadoId ||
        (session?.role === "ADVOGADO" ? session.advogado?.id || "" : "");

    const overview = await getDemandasOverview({
        area,
        advogadoId: advogadoFixo || undefined,
        periodoDias: parsed.data.periodoDias,
    });

    let baseResponsaveis = advogadoFixo
        ? overview.cargaPorResponsavel.filter((item) => item.advogadoId === advogadoFixo)
        : overview.cargaPorResponsavel;
    if (parsed.data.timeId) {
        const membros = await db.timeMembro.findMany({
            where: { timeId: parsed.data.timeId },
            select: { advogadoId: true },
            take: 1000,
        });
        const idSet = new Set(membros.map((item) => item.advogadoId));
        baseResponsaveis = baseResponsaveis.filter((item) => idSet.has(item.advogadoId));
    }
    const responsaveisAlvo = baseResponsaveis
        .filter(
            (item) =>
                item.tarefasPendentes > 0 ||
                item.prazosPendentes > 0 ||
                item.atendimentosAbertos > 0
        )
        .slice(0, parsed.data.maxResponsaveis);

    if (responsaveisAlvo.length === 0) {
        return {
            success: true,
            result: {
                criadas: 0,
                atualizadas: 0,
                ignoradas: 0,
                responsaveisAfetados: 0,
                detalhes: ["Nenhum responsavel elegivel no recorte atual para aplicar o plano."],
            },
        };
    }

    const now = new Date();
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);
    const limiteCurto = new Date(dayEnd);
    limiteCurto.setDate(limiteCurto.getDate() + 3);
    const tituloPlano = `[Plano IA] Execucao diaria ${formatDateKey(now)}`;
    const simular = parsed.data.simular;

    let criadas = 0;
    let atualizadas = 0;
    let ignoradas = 0;
    const detalhes: string[] = [];

    for (const responsavel of responsaveisAlvo) {
        const [tarefasRaw, prazosRaw] = await Promise.all([
            db.tarefa.findMany({
                where: {
                    advogadoId: responsavel.advogadoId,
                    status: { in: ["A_FAZER", "EM_ANDAMENTO", "REVISAO"] },
                },
                select: {
                    id: true,
                    titulo: true,
                    prioridade: true,
                    dataLimite: true,
                    processo: {
                        select: {
                            numeroCnj: true,
                            tipoAcao: { select: { nome: true, grupo: true } },
                            objeto: true,
                            tribunal: true,
                            vara: true,
                            foro: true,
                        },
                    },
                },
                take: 24,
                orderBy: [{ dataLimite: "asc" }, { createdAt: "desc" }],
            }),
            db.prazo.findMany({
                where: {
                    advogadoId: responsavel.advogadoId,
                    status: "PENDENTE",
                    dataFatal: { lte: limiteCurto },
                },
                select: {
                    id: true,
                    descricao: true,
                    dataFatal: true,
                    processo: {
                        select: {
                            numeroCnj: true,
                            tipoAcao: { select: { nome: true, grupo: true } },
                            objeto: true,
                            tribunal: true,
                            vara: true,
                            foro: true,
                        },
                    },
                },
                take: 24,
                orderBy: { dataFatal: "asc" },
            }),
        ]);

        const tarefasFiltradas = tarefasRaw.filter((item) => {
            if (area === "TODAS") return true;
            const areaDetectada = inferAreaAtuacaoFromProcess({
                tipoAcaoNome: item.processo?.tipoAcao?.nome || "",
                tipoAcaoGrupo: item.processo?.tipoAcao?.grupo || "",
                objeto: item.processo?.objeto || "",
                tribunal: item.processo?.tribunal || "",
                vara: item.processo?.vara || "",
                foro: item.processo?.foro || "",
            });
            return areaDetectada === area;
        });
        const prazosFiltrados = prazosRaw.filter((item) => {
            if (area === "TODAS") return true;
            const areaDetectada = inferAreaAtuacaoFromProcess({
                tipoAcaoNome: item.processo?.tipoAcao?.nome || "",
                tipoAcaoGrupo: item.processo?.tipoAcao?.grupo || "",
                objeto: item.processo?.objeto || "",
                tribunal: item.processo?.tribunal || "",
                vara: item.processo?.vara || "",
                foro: item.processo?.foro || "",
            });
            return areaDetectada === area;
        });

        const tarefasTop = tarefasFiltradas
            .sort((a, b) => {
                const sa = sortPrioridade(a.prioridade);
                const sb = sortPrioridade(b.prioridade);
                if (sa !== sb) return sa - sb;
                const da = a.dataLimite ? a.dataLimite.getTime() : Number.POSITIVE_INFINITY;
                const db = b.dataLimite ? b.dataLimite.getTime() : Number.POSITIVE_INFINITY;
                return da - db;
            })
            .slice(0, 5);
        const prazosTop = prazosFiltrados.slice(0, 5);

        if (tarefasTop.length === 0 && prazosTop.length === 0) {
            ignoradas += 1;
            detalhes.push(`${responsavel.nome}: sem tarefas/prazos prioritarios para compor plano.`);
            continue;
        }

        const prioridadePlano: "URGENTE" | "ALTA" | "NORMAL" =
            prazosTop.some((item) => item.dataFatal < dayStart)
                ? "URGENTE"
                : responsavel.scoreCarga >= 20 || responsavel.prazosCriticos > 0
                  ? "ALTA"
                  : "NORMAL";

        const blocos: string[] = [];
        blocos.push(
            `Plano diario assistido por IA gerado em ${now.toLocaleString("pt-BR")} para ${responsavel.nome}.`
        );
        blocos.push(
            `Resumo de carga: score ${responsavel.scoreCarga}; tarefas ${responsavel.tarefasPendentes}; prazos ${responsavel.prazosPendentes}; atendimentos ${responsavel.atendimentosAbertos}.`
        );

        if (prazosTop.length > 0) {
            blocos.push("Prazos criticos para tratar hoje:");
            for (const prazo of prazosTop) {
                const processo = prazo.processo?.numeroCnj ? ` - Proc. ${prazo.processo.numeroCnj}` : "";
                blocos.push(
                    `- ${prazo.descricao} - fatal ${prazo.dataFatal.toLocaleDateString("pt-BR")}${processo}`
                );
            }
        }

        if (tarefasTop.length > 0) {
            blocos.push("Tarefas em foco:");
            for (const tarefa of tarefasTop) {
                const processo = tarefa.processo?.numeroCnj ? ` - Proc. ${tarefa.processo.numeroCnj}` : "";
                const limite = tarefa.dataLimite
                    ? ` - limite ${tarefa.dataLimite.toLocaleDateString("pt-BR")}`
                    : "";
                blocos.push(`- [${tarefa.prioridade}] ${tarefa.titulo}${limite}${processo}`);
            }
        }

        blocos.push("Checklist minimo do dia:");
        blocos.push("- Validar andamento dos itens acima e registrar bloqueios.");
        blocos.push("- Atualizar status no painel ate o fim do expediente.");
        blocos.push("- Escalar impedimentos juridicos para o responsavel tecnico.");

        const descricaoPlano = blocos.join("\n");

        const existente = await db.tarefa.findFirst({
            where: {
                advogadoId: responsavel.advogadoId,
                titulo: tituloPlano,
                status: { in: ["A_FAZER", "EM_ANDAMENTO", "REVISAO"] },
                createdAt: { gte: dayStart },
            },
            select: { id: true },
        });

        if (existente) {
            if (!simular) {
                await db.tarefa.update({
                    where: { id: existente.id },
                    data: {
                        descricao: descricaoPlano,
                        prioridade: prioridadePlano,
                        dataLimite: dayEnd,
                    },
                });
            }
            atualizadas += 1;
            detalhes.push(
                `${responsavel.nome}: plano do dia ${simular ? "seria atualizado" : "atualizado"}.`
            );
        } else {
            if (!simular) {
                await db.tarefa.create({
                    data: {
                        titulo: tituloPlano,
                        descricao: descricaoPlano,
                        prioridade: prioridadePlano,
                        status: "A_FAZER",
                        dataLimite: dayEnd,
                        processoId: null,
                        advogadoId: responsavel.advogadoId,
                        criadoPorId: actorUserId,
                    },
                });
            }
            criadas += 1;
            detalhes.push(`${responsavel.nome}: plano do dia ${simular ? "seria criado" : "criado"}.`);
        }
    }

    try {
        await db.logAuditoria.create({
            data: {
                userId: actorUserId,
                acao: simular
                    ? "DEMANDAS_IA_PLANEJAMENTO_SIMULADO"
                    : "DEMANDAS_IA_PLANEJAMENTO_APLICADO",
                entidade: "DEMANDAS",
                entidadeId: parsed.data.planoId || "PAINEL",
                dadosAntes: {
                    filtros: {
                        area,
                        advogadoId: advogadoFixo || null,
                        timeId: parsed.data.timeId || null,
                        periodoDias: parsed.data.periodoDias,
                    },
                    incluirRedistribuicao: parsed.data.incluirRedistribuicao,
                    simulado: simular,
                },
                dadosDepois: {
                    criadas,
                    atualizadas,
                    ignoradas,
                    responsaveisAfetados: responsaveisAlvo.length,
                    detalhes: detalhes.slice(0, 40),
                },
            },
        });
    } catch (error) {
        console.warn("[demandas-planejamento] falha ao registrar auditoria:", error);
    }

    if (!simular && session?.id && parsed.data.planoId && (criadas > 0 || atualizadas > 0)) {
        try {
            await updateDemandaIaPlanoStatus(parsed.data.planoId, "APLICADO", session.id);
        } catch (error) {
            console.warn("[demandas-planejamento] falha ao marcar plano aplicado:", error);
        }
    }

    if (!simular) {
        revalidatePath("/demandas");
        revalidatePath("/tarefas");
        revalidatePath("/agenda");
    }

    return {
        success: true,
        result: {
            simulado: simular,
            criadas,
            atualizadas,
            ignoradas,
            responsaveisAfetados: responsaveisAlvo.length,
            detalhes,
        },
    };
}

export async function executarAssistenteDemandasIA(
    input: z.infer<typeof assistenteDemandasSchema>
) {
    const parsed = assistenteDemandasSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: "Dados invalidos para analise de demandas." };
    }

    const session = await getSession();
    if (!session) return { success: false, error: "Nao autenticado." };

    const areaValida =
        parsed.data.area === "TODAS" || AREAS_ATUACAO.includes(parsed.data.area as never)
            ? parsed.data.area
            : "TODAS";

    const payload = await getDemandasOverview({
        area: areaValida as "TODAS",
        advogadoId: parsed.data.advogadoId || undefined,
        periodoDias: parsed.data.periodoDias,
    });

    const contexto = {
        filtros: payload.filtros,
        kpis: payload.kpis,
        gargalos: payload.gargalos,
        cargaTop10: payload.cargaPorResponsavel.slice(0, 10),
        areasTop10: payload.resumoPorArea.slice(0, 10),
        sugestoesOperacionais: payload.sugestoesOperacionais,
    };

    let resposta = "";
    let model: string | null = null;
    let enabled = false;
    let planoId: string | null = null;

    try {
        if (isKimiConfigured()) {
            const completion = await askKimiChat(
                [
                    {
                        role: "system",
                        content:
                            "Voce e um assistente de operacoes juridicas. Responda em portugues do Brasil, de forma objetiva, estruturando em: Diagnostico, Priorizacao por responsavel, Redistribuicao sugerida, Plano de execucao de 7 dias. Nao invente dados.",
                    },
                    {
                        role: "user",
                        content: [
                            `Pergunta: ${parsed.data.pergunta}`,
                            "Contexto consolidado:",
                            JSON.stringify(contexto, null, 2),
                        ].join("\n\n"),
                    },
                ],
                { maxTokens: 2200, thinking: "enabled" }
            );
            resposta = completion.content;
            model = completion.model;
            enabled = true;
        } else {
            resposta = buildFallbackResposta(payload);
        }
    } catch (error) {
        console.error("[demandas-ia] erro na analise:", error);
        resposta = `${buildFallbackResposta(payload)}\n\nObservacao: houve erro na chamada de IA externa, aplicado fallback local.`;
    }

    try {
        await db.logAuditoria.create({
            data: {
                userId: session.id,
                acao: "DEMANDAS_IA_ANALISE",
                entidade: "DEMANDAS",
                entidadeId: "PAINEL",
                dadosAntes: {
                    pergunta: parsed.data.pergunta,
                    filtros: payload.filtros,
                },
                dadosDepois: {
                    kpis: {
                        tarefasAbertas: payload.kpis.tarefasAbertas,
                        tarefasAtrasadas: payload.kpis.tarefasAtrasadas,
                        prazosPendentes: payload.kpis.prazosPendentes,
                        prazosCriticos7d: payload.kpis.prazosCriticos7d,
                        prazosAtrasados: payload.kpis.prazosAtrasados,
                        atendimentosAbertos: payload.kpis.atendimentosAbertos,
                        processosAtivos: payload.kpis.processosAtivos,
                    },
                    gargalos: payload.gargalos.length,
                    model: model || "fallback_local",
                    iaAtiva: enabled,
                },
            },
        });
    } catch (error) {
        console.warn("[demandas-ia] falha ao registrar auditoria:", error);
    }

    if (parsed.data.persistirPlano) {
        try {
            const plano = await createDemandaIaPlano({
                tipo: "ANALISE",
                pergunta: parsed.data.pergunta,
                area: areaValida,
                advogadoId: parsed.data.advogadoId || null,
                periodoDias: parsed.data.periodoDias,
                resumo: summarizeText(resposta, 220),
                conteudo: resposta,
                solicitadoPorId: session.id,
                provider: "Kimi 2.5",
                model,
                metadados: {
                    filtros: payload.filtros,
                    kpis: payload.kpis,
                    gargalos: payload.gargalos.length,
                    iaAtiva: enabled,
                },
            });
            planoId = plano.id;
        } catch (error) {
            console.warn("[demandas-ia] falha ao persistir plano:", error);
        }
    }

    return {
        success: true,
        result: {
            provider: "Kimi 2.5",
            enabled,
            model,
            planoId,
            resposta,
            contextoResumo: {
                filtros: payload.filtros,
                kpis: payload.kpis,
                gargalos: payload.gargalos,
            },
        },
    };
}

export async function otimizarTemplateRotinaDemandasIA(
    input: z.infer<typeof otimizarRotinaIaSchema>
) {
    const parsed = otimizarRotinaIaSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: "Dados invalidos para otimizar rotina com IA." };
    }

    const session = await getSession();
    if (!session) return { success: false, error: "Nao autenticado." };

    const payload = {
        ...parsed.data,
        area: normalizeAreaFilter(parsed.data.area),
        papelResponsavel: normalizePapelResponsavel(parsed.data.papelResponsavel),
        checklist: parsed.data.checklist.map((item) => item.trim()).filter(Boolean).slice(0, 20),
    };

    let result = buildFallbackChecklistRotina(payload);
    let enabled = false;
    let model: string | null = null;

    try {
        if (isKimiConfigured()) {
            const completion = await askKimiChat(
                [
                    {
                        role: "system",
                        content:
                            "Voce e um consultor de operacoes juridicas. Retorne apenas JSON valido no formato {\"descricaoOtima\":\"...\",\"checklist\":[\"...\"],\"observacoes\":[\"...\"]}. Sem markdown.",
                    },
                    {
                        role: "user",
                        content: [
                            "Otimize a rotina abaixo para uso no escritorio juridico.",
                            "Objetivo: checklist curto, objetivo e executavel por equipe.",
                            JSON.stringify(payload, null, 2),
                        ].join("\n\n"),
                    },
                ],
                { maxTokens: 1200, thinking: "enabled" }
            );

            const raw = completion.content.trim();
            const jsonStart = raw.indexOf("{");
            const jsonEnd = raw.lastIndexOf("}");
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
                const candidate = raw.slice(jsonStart, jsonEnd + 1);
                const parsedJson = JSON.parse(candidate) as {
                    descricaoOtima?: string;
                    checklist?: string[];
                    observacoes?: string[];
                };
                const checklist = Array.isArray(parsedJson.checklist)
                    ? parsedJson.checklist
                          .map((item) => String(item).trim())
                          .filter(Boolean)
                          .slice(0, 12)
                    : [];
                const observacoes = Array.isArray(parsedJson.observacoes)
                    ? parsedJson.observacoes
                          .map((item) => String(item).trim())
                          .filter(Boolean)
                          .slice(0, 8)
                    : [];

                if (checklist.length > 0) {
                    result = {
                        descricao:
                            parsedJson.descricaoOtima?.trim() ||
                            result.descricao,
                        checklist,
                        observacoes:
                            observacoes.length > 0
                                ? observacoes
                                : ["Sugestao gerada com IA. Revise antes de aplicar."],
                    };
                    enabled = true;
                    model = completion.model;
                }
            }
        }
    } catch (error) {
        console.warn("[demandas-rotina] falha na otimizacao IA de rotina:", error);
    }

    try {
        await db.logAuditoria.create({
            data: {
                userId: session.id,
                acao: "DEMANDAS_IA_OTIMIZACAO_ROTINA",
                entidade: "DEMANDAS",
                entidadeId: "ROTINA_TEMPLATE",
                dadosAntes: {
                    nome: payload.nome,
                    area: payload.area,
                    periodicidade: payload.periodicidade,
                    checklistItens: payload.checklist.length,
                },
                dadosDepois: {
                    iaAtiva: enabled,
                    model: model || "fallback_local",
                    checklistItens: result.checklist.length,
                    descricaoTamanho: result.descricao.length,
                },
            },
        });
    } catch (error) {
        console.warn("[demandas-rotina] falha ao auditar otimizacao IA:", error);
    }

    return {
        success: true,
        result: {
            provider: "Kimi 2.5",
            enabled,
            model,
            descricao: result.descricao,
            checklist: result.checklist,
            observacoes: result.observacoes,
        },
    };
}

function normalizeAreaFilter(area: string) {
    return area === "TODAS" || AREAS_ATUACAO.includes(area as never)
        ? (area as AreaAtuacaoKey | "TODAS")
        : "TODAS";
}

function sortPrioridade(value: "URGENTE" | "ALTA" | "NORMAL" | "BAIXA") {
    if (value === "URGENTE") return 1;
    if (value === "ALTA") return 2;
    if (value === "NORMAL") return 3;
    return 4;
}

export async function gerarSugestoesRedistribuicaoDemandas(
    input: z.infer<typeof gerarRedistribuicaoSchema>
) {
    const parsed = gerarRedistribuicaoSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: "Dados invalidos para redistribuicao." };
    }

    const session = await getSession();
    if (!session) return { success: false, error: "Nao autenticado." };

    const area = normalizeAreaFilter(parsed.data.area);
    const overview = await getDemandasOverview({
        area,
        advogadoId: parsed.data.advogadoId || undefined,
        periodoDias: parsed.data.periodoDias,
    });

    if (overview.cargaPorResponsavel.length < 2) {
        return {
            success: true,
            sugestoes: [],
            diagnostico: "Nao ha dados suficientes para redistribuir (menos de 2 responsaveis ativos).",
            planoId: null,
        };
    }

    const cargas = overview.cargaPorResponsavel;
    const mediaScore =
        cargas.reduce((acc, item) => acc + item.scoreCarga, 0) / Math.max(1, cargas.length);
    const sobrecarregados = cargas.filter(
        (item) => item.scoreCarga >= mediaScore + 4 && item.tarefasPendentes > 0
    );
    const disponiveis = cargas.filter((item) => item.scoreCarga <= mediaScore - 2);

    if (sobrecarregados.length === 0 || disponiveis.length === 0) {
        return {
            success: true,
            sugestoes: [],
            diagnostico:
                "A distribuicao atual esta equilibrada para o recorte selecionado. Nao houve sugestao automatica.",
            planoId: null,
        };
    }

    const idsSobrecarregados = sobrecarregados.map((item) => item.advogadoId);
    const tarefas = await db.tarefa.findMany({
        where: {
            advogadoId: { in: idsSobrecarregados },
            status: { in: ["A_FAZER", "EM_ANDAMENTO"] },
        },
        select: {
            id: true,
            titulo: true,
            prioridade: true,
            dataLimite: true,
            advogadoId: true,
            processo: {
                select: {
                    tipoAcao: { select: { nome: true, grupo: true } },
                    objeto: true,
                    tribunal: true,
                    vara: true,
                    foro: true,
                },
            },
        },
        take: 3000,
    });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limiteCurto = new Date(hoje);
    limiteCurto.setDate(limiteCurto.getDate() + 2);
    const maxMovimentos = parsed.data.maxMovimentos;

    const nomeById = new Map(cargas.map((item) => [item.advogadoId, item.nome]));
    const scoreMutable = new Map(cargas.map((item) => [item.advogadoId, item.scoreCarga]));
    const filaDestino = [...disponiveis];
    let cursorDestino = 0;

    const elegiveis = tarefas
        .filter((item) => {
            if (item.dataLimite && item.dataLimite <= limiteCurto) return false;
            const areaDetectada = inferAreaAtuacaoFromProcess({
                tipoAcaoNome: item.processo?.tipoAcao?.nome || "",
                tipoAcaoGrupo: item.processo?.tipoAcao?.grupo || "",
                objeto: item.processo?.objeto || "",
                tribunal: item.processo?.tribunal || "",
                vara: item.processo?.vara || "",
                foro: item.processo?.foro || "",
            });
            if (area !== "TODAS" && areaDetectada !== area) return false;
            return true;
        })
        .sort((a, b) => {
            const sa = sortPrioridade(a.prioridade);
            const sb = sortPrioridade(b.prioridade);
            if (sa !== sb) return sb - sa;
            const da = a.dataLimite ? a.dataLimite.getTime() : Number.POSITIVE_INFINITY;
            const db = b.dataLimite ? b.dataLimite.getTime() : Number.POSITIVE_INFINITY;
            return db - da;
        });

    const sugestoes: Array<z.infer<typeof sugestaoRedistribuicaoSchema>> = [];

    for (const tarefa of elegiveis) {
        if (sugestoes.length >= maxMovimentos) break;

        const fromScore = scoreMutable.get(tarefa.advogadoId) || 0;
        if (fromScore < mediaScore + 2) continue;

        let attempts = 0;
        let escolhido: (typeof filaDestino)[number] | null = null;
        while (attempts < filaDestino.length) {
            const candidato = filaDestino[cursorDestino % filaDestino.length];
            cursorDestino += 1;
            attempts += 1;
            if (candidato.advogadoId !== tarefa.advogadoId) {
                escolhido = candidato;
                break;
            }
        }
        if (!escolhido) continue;

        const areaDetectada = inferAreaAtuacaoFromProcess({
            tipoAcaoNome: tarefa.processo?.tipoAcao?.nome || "",
            tipoAcaoGrupo: tarefa.processo?.tipoAcao?.grupo || "",
            objeto: tarefa.processo?.objeto || "",
            tribunal: tarefa.processo?.tribunal || "",
            vara: tarefa.processo?.vara || "",
            foro: tarefa.processo?.foro || "",
        });

        const prioridadeSugerida =
            tarefa.dataLimite && tarefa.dataLimite <= limiteCurto
                ? "URGENTE"
                : tarefa.prioridade;

        sugestoes.push({
            tarefaId: tarefa.id,
            tarefaTitulo: tarefa.titulo,
            fromAdvogadoId: tarefa.advogadoId,
            fromAdvogadoNome: nomeById.get(tarefa.advogadoId) || "Advogado",
            toAdvogadoId: escolhido.advogadoId,
            toAdvogadoNome: nomeById.get(escolhido.advogadoId) || "Advogado",
            prioridadeAtual: tarefa.prioridade,
            prioridadeSugerida,
            area: areaDetectada,
            motivo:
                "Redistribuicao sugerida para balancear carga operacional e reduzir risco de atrasos.",
        });

        scoreMutable.set(tarefa.advogadoId, Math.max(0, fromScore - 2));
        scoreMutable.set(
            escolhido.advogadoId,
            (scoreMutable.get(escolhido.advogadoId) || 0) + 2
        );
    }

    let planoId: string | null = null;
    const diagnostico = `Foram sugeridos ${sugestoes.length} movimento(s) com base em carga media ${mediaScore.toFixed(1)}.`;
    if (parsed.data.persistirPlano) {
        try {
            const plano = await createDemandaIaPlano({
                tipo: "REDISTRIBUICAO",
                pergunta: "Gerar redistribuicao assistida de demandas.",
                area,
                advogadoId: parsed.data.advogadoId || null,
                periodoDias: parsed.data.periodoDias,
                resumo: diagnostico,
                conteudo: [diagnostico, ...sugestoes.map((item) => item.motivo)].join("\n"),
                sugestoes: sugestoes.map(
                    (item) =>
                        `${item.tarefaTitulo}: ${item.fromAdvogadoNome} -> ${item.toAdvogadoNome} (${item.prioridadeSugerida})`
                ),
                solicitadoPorId: session.id,
                provider: "Kimi 2.5",
                model: null,
                metadados: {
                    mediaScore,
                    totalSugestoes: sugestoes.length,
                    area,
                },
            });
            planoId = plano.id;
        } catch (error) {
            console.warn("[demandas-ia] falha ao persistir plano de redistribuicao:", error);
        }
    }

    return {
        success: true,
        sugestoes,
        diagnostico,
        planoId,
    };
}

export async function aplicarSugestoesRedistribuicaoDemandas(
    input: z.infer<typeof aplicarRedistribuicaoSchema>
) {
    const parsed = aplicarRedistribuicaoSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: "Dados invalidos para aplicar redistribuicao." };
    }

    const session = await getSession();
    if (!session) return { success: false, error: "Nao autenticado." };
    if (!canApplyDemandasLote(session.role)) {
        return { success: false, error: getPermissaoErrorForRole(session.role) };
    }

    const sugestoes = parsed.data.sugestoes;
    const ids = sugestoes.map((item) => item.tarefaId);
    const tarefaAtual = await db.tarefa.findMany({
        where: { id: { in: ids } },
        select: { id: true, advogadoId: true, status: true, prioridade: true, titulo: true },
    });
    const byId = new Map(tarefaAtual.map((item) => [item.id, item]));

    let aplicadas = 0;
    const ignoradas: Array<{ tarefaId: string; motivo: string }> = [];

    await db.$transaction(async (tx) => {
        for (const sugestao of sugestoes) {
            const current = byId.get(sugestao.tarefaId);
            if (!current) {
                ignoradas.push({ tarefaId: sugestao.tarefaId, motivo: "Tarefa nao encontrada." });
                continue;
            }
            if (current.status === "CONCLUIDA" || current.status === "CANCELADA") {
                ignoradas.push({
                    tarefaId: sugestao.tarefaId,
                    motivo: "Tarefa concluida/cancelada nao pode ser redistribuida.",
                });
                continue;
            }
            if (current.advogadoId !== sugestao.fromAdvogadoId) {
                ignoradas.push({
                    tarefaId: sugestao.tarefaId,
                    motivo: "Responsável atual difere da sugestão original.",
                });
                continue;
            }

            await tx.tarefa.update({
                where: { id: sugestao.tarefaId },
                data: {
                    advogadoId: sugestao.toAdvogadoId,
                    prioridade: sugestao.prioridadeSugerida,
                },
            });

            aplicadas += 1;
        }

        await tx.logAuditoria.create({
            data: {
                userId: session.id,
                acao: "DEMANDAS_REDISTRIBUICAO_APLICADA",
                entidade: "DEMANDAS",
                entidadeId: "LOTE",
                dadosAntes: {
                    origem: parsed.data.origem,
                    pergunta: parsed.data.pergunta || null,
                    solicitadas: sugestoes.length,
                    sugestoesAmostra: sugestoes.slice(0, 20),
                },
                dadosDepois: {
                    aplicadas,
                    ignoradas: ignoradas.length,
                    ignoradasAmostra: ignoradas.slice(0, 20),
                },
            },
        });
    });

    revalidatePath("/demandas");
    revalidatePath("/tarefas");
    revalidatePath("/agenda");
    revalidatePath("/dashboard");

    if (parsed.data.planoId && aplicadas > 0) {
        try {
            await updateDemandaIaPlanoStatus(parsed.data.planoId, "APLICADO", session.id);
        } catch (error) {
            console.warn("[demandas-ia] falha ao marcar plano aplicado:", error);
        }
    }

    return {
        success: true,
        aplicadas,
        ignoradas,
    };
}

export async function atualizarStatusPlanoDemandasIA(
    input: z.infer<typeof atualizarPlanoStatusSchema>
) {
    const parsed = atualizarPlanoStatusSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: "Plano invalido." };
    }

    const session = await getSession();
    if (!session) return { success: false, error: "Nao autenticado." };

    const planos = await getDemandasIaPlanosConfig();
    const alvo = planos.find((item) => item.id === parsed.data.planoId);
    if (!alvo) {
        return { success: false, error: "Plano nao encontrado." };
    }

    const canManage = canApplyDemandasLote(session.role) || alvo.solicitadoPorId === session.id;
    if (!canManage) {
        return { success: false, error: "Sem permissao para alterar este plano." };
    }

    const status = parsed.data.status as DemandaIaPlanoStatus;
    const updated = await updateDemandaIaPlanoStatus(parsed.data.planoId, status, session.id);
    if (!updated) {
        return { success: false, error: "Falha ao atualizar plano." };
    }

    try {
        await db.logAuditoria.create({
            data: {
                userId: session.id,
                acao: "DEMANDAS_IA_PLANO_STATUS",
                entidade: "DEMANDAS",
                entidadeId: updated.id,
                dadosAntes: {
                    statusAnterior: alvo.status,
                },
                dadosDepois: {
                    statusNovo: updated.status,
                    tipo: updated.tipo,
                },
            },
        });
    } catch (error) {
        console.warn("[demandas-ia] falha ao registrar alteracao de plano:", error);
    }

    revalidatePath("/demandas");
    return { success: true, plano: updated };
}

export async function updatePlanejamentoAgendadoConfigDemandas(
    input: z.infer<typeof planejamentoAgendadoConfigSchema>
) {
    const parsed = planejamentoAgendadoConfigSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: "Configuracao invalida para agendamento de planejamento." };
    }

    const session = await getSession();
    if (!session) return { success: false, error: "Nao autenticado." };
    if (!canManageDemandasAdmin(session.role)) {
        return { success: false, error: getAdminPermissaoErrorForRole(session.role) };
    }

    const current = await getDemandasPlanejamentoAgendadoConfig();
    const next: DemandaPlanejamentoAgendadoConfig = {
        ...current,
        enabled: parsed.data.enabled,
        updatedAt: new Date().toISOString(),
    };
    const saved = await saveDemandasPlanejamentoAgendadoConfig(next);

    try {
        await db.logAuditoria.create({
            data: {
                userId: session.id,
                acao: "DEMANDAS_PLANEJAMENTO_AGENDADO_CONFIG_ATUALIZADA",
                entidade: "DEMANDAS",
                entidadeId: "PLANEJAMENTO_AGENDADO",
                dadosAntes: { enabled: current.enabled },
                dadosDepois: { enabled: saved.enabled },
            },
        });
    } catch (error) {
        console.warn("[demandas-planejamento] falha ao auditar config:", error);
    }

    revalidatePath("/admin/demandas");
    return { success: true, config: saved };
}

export async function salvarPlanejamentoAgendadoEscopoDemandas(
    input: z.infer<typeof planejamentoAgendadoEscopoSchema>
) {
    const parsed = planejamentoAgendadoEscopoSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: "Dados invalidos para escopo de planejamento agendado." };
    }

    const session = await getSession();
    if (!session) return { success: false, error: "Nao autenticado." };
    if (!canManageDemandasAdmin(session.role)) {
        return { success: false, error: getAdminPermissaoErrorForRole(session.role) };
    }

    if (parsed.data.timeId) {
        const time = await db.time.findUnique({
            where: { id: parsed.data.timeId },
            select: { id: true },
        });
        if (!time) {
            return { success: false, error: "Equipe informada nao encontrada." };
        }
    }

    const current = await getDemandasPlanejamentoAgendadoConfig();
    const existing = parsed.data.id
        ? current.escopos.find((item) => item.id === parsed.data.id) || null
        : null;
    const escopo = toPlanejamentoEscopoFromInput(parsed.data, existing);
    const escopos = existing
        ? current.escopos.map((item) => (item.id === escopo.id ? escopo : item))
        : [escopo, ...current.escopos];

    const saved = await saveDemandasPlanejamentoAgendadoConfig({
        ...current,
        escopos,
        updatedAt: new Date().toISOString(),
    });

    try {
        await db.logAuditoria.create({
            data: {
                userId: session.id,
                acao: existing
                    ? "DEMANDAS_PLANEJAMENTO_AGENDADO_ESCOPO_ATUALIZADO"
                    : "DEMANDAS_PLANEJAMENTO_AGENDADO_ESCOPO_CRIADO",
                entidade: "DEMANDAS",
                entidadeId: escopo.id,
                dadosAntes: existing
                    ? (existing as unknown as Prisma.InputJsonValue)
                    : Prisma.JsonNull,
                dadosDepois: escopo as unknown as Prisma.InputJsonValue,
            },
        });
    } catch (error) {
        console.warn("[demandas-planejamento] falha ao auditar escopo:", error);
    }

    revalidatePath("/admin/demandas");
    return { success: true, config: saved, escopo };
}

export async function deletePlanejamentoAgendadoEscopoDemandas(id: string) {
    if (!id) return { success: false, error: "Escopo invalido." };

    const session = await getSession();
    if (!session) return { success: false, error: "Nao autenticado." };
    if (!canManageDemandasAdmin(session.role)) {
        return { success: false, error: getAdminPermissaoErrorForRole(session.role) };
    }

    const current = await getDemandasPlanejamentoAgendadoConfig();
    const existing = current.escopos.find((item) => item.id === id);
    if (!existing) return { success: false, error: "Escopo nao encontrado." };

    const saved = await saveDemandasPlanejamentoAgendadoConfig({
        ...current,
        escopos: current.escopos.filter((item) => item.id !== id),
        updatedAt: new Date().toISOString(),
    });

    try {
        await db.logAuditoria.create({
            data: {
                userId: session.id,
                acao: "DEMANDAS_PLANEJAMENTO_AGENDADO_ESCOPO_EXCLUIDO",
                entidade: "DEMANDAS",
                entidadeId: id,
                dadosAntes: existing as unknown as Prisma.InputJsonValue,
                dadosDepois: { removido: true },
            },
        });
    } catch (error) {
        console.warn("[demandas-planejamento] falha ao auditar exclusao de escopo:", error);
    }

    revalidatePath("/admin/demandas");
    return { success: true, config: saved };
}

function sameRunWindow(lastIso: string | null, now: Date) {
    if (!lastIso) return false;
    const last = new Date(lastIso);
    if (Number.isNaN(last.getTime())) return false;
    return (
        last.getFullYear() === now.getFullYear() &&
        last.getMonth() === now.getMonth() &&
        last.getDate() === now.getDate() &&
        last.getHours() === now.getHours()
    );
}

async function notifyDemandasPlanningFailure(
    escopo: DemandaPlanejamentoAgendadoEscopo,
    message: string
) {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const title = `Falha no agendamento de demandas: ${escopo.nome}`;

    const existing = await db.notificacao.findFirst({
        where: {
            tipo: "SISTEMA",
            titulo: title,
            createdAt: { gte: threeHoursAgo },
        },
        select: { id: true },
    });
    if (existing) return 0;

    const users = await db.user.findMany({
        where: { isActive: true, role: { in: ["ADMIN", "SOCIO"] } },
        select: { id: true },
    });
    if (users.length === 0) return 0;

    const result = await db.notificacao.createMany({
        data: users.map((user) => ({
            userId: user.id,
            tipo: "SISTEMA",
            titulo: title,
            mensagem: `${message.slice(0, 320)} (Escopo: ${escopo.nome})`,
            linkUrl: "/admin/demandas",
        })),
    });
    return result.count;
}

export async function executarPlanejamentoAgendadoDemandas(
    input: z.infer<typeof executarPlanejamentoAgendadoSchema> = {
        modo: "AUTO",
        force: false,
        simular: false,
    }
) {
    const parsed = executarPlanejamentoAgendadoSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: "Parametros invalidos para execucao agendada." };
    }

    const session = await getSession();
    if (parsed.data.modo === "MANUAL") {
        if (!session) return { success: false, error: "Nao autenticado." };
        if (!canManageDemandasAdmin(session.role)) {
            return { success: false, error: getAdminPermissaoErrorForRole(session.role) };
        }
    }

    const config = await getDemandasPlanejamentoAgendadoConfig();
    if (!config.enabled) {
        return {
            success: true,
            result: {
                skipped: true,
                motivo: "Agendamento de planejamento desabilitado.",
                executados: 0,
                avaliados: 0,
                detalhes: [] as string[],
            },
        };
    }

    const now = new Date();
    const horaAtual = now.getHours();
    const minutoAtual = now.getMinutes();
    const force = parsed.data.force;
    const simular = parsed.data.simular;

    const detalhes: string[] = [];
    const updates = new Map<string, DemandaPlanejamentoAgendadoEscopo>();
    let avaliados = 0;
    let executados = 0;
    let falhas = 0;

    for (const escopo of config.escopos.filter((item) => item.ativo)) {
        avaliados += 1;
        const inMinuteWindow =
            horaAtual === escopo.hora && minutoAtual >= escopo.minuto && minutoAtual < escopo.minuto + 5;
        const jaExecutadoNestaHora = sameRunWindow(escopo.ultimaExecucaoEm, now);
        if (!force && (!inMinuteWindow || jaExecutadoNestaHora)) {
            continue;
        }

        const execution = await aplicarPlanejamentoDiarioDemandasIA({
            modo: "AUTO",
            simular,
            area: escopo.area,
            timeId: escopo.timeId || "",
            advogadoId: "",
            periodoDias: escopo.periodoDias,
            incluirRedistribuicao: escopo.incluirRedistribuicao,
            maxResponsaveis: escopo.maxResponsaveis,
            planoId: undefined,
        });

        if (!execution.success) {
            falhas += 1;
            const message = execution.error || "falha nao identificada";
            detalhes.push(`${escopo.nome}: erro - ${message}`);
            updates.set(escopo.id, {
                ...escopo,
                ultimaSimulacaoEm: simular ? now.toISOString() : escopo.ultimaSimulacaoEm,
                ultimaFalhaEm: now.toISOString(),
                ultimaFalhaMensagem: message.slice(0, 500),
                totalFalhas: escopo.totalFalhas + 1,
                updatedAt: now.toISOString(),
            });
            if (!simular) {
                try {
                    await notifyDemandasPlanningFailure(escopo, message);
                } catch (notifyError) {
                    console.warn("[demandas-planejamento] falha ao notificar erro de escopo:", notifyError);
                }
            }
            continue;
        }

        const payload = execution.result as
            | {
                  criadas?: number;
                  atualizadas?: number;
                  ignoradas?: number;
              }
            | undefined;
        executados += 1;
        detalhes.push(
            `${escopo.nome}: ${payload?.criadas || 0} criado(s), ${payload?.atualizadas || 0} atualizado(s), ${payload?.ignoradas || 0} ignorado(s).`
        );

        updates.set(escopo.id, {
            ...escopo,
            ultimaExecucaoEm: simular ? escopo.ultimaExecucaoEm : now.toISOString(),
            ultimaSimulacaoEm: simular ? now.toISOString() : escopo.ultimaSimulacaoEm,
            ultimaFalhaEm: simular ? escopo.ultimaFalhaEm : null,
            ultimaFalhaMensagem: simular ? escopo.ultimaFalhaMensagem : null,
            totalExecucoes: simular ? escopo.totalExecucoes : escopo.totalExecucoes + 1,
            totalFalhas: escopo.totalFalhas,
            updatedAt: now.toISOString(),
        });
    }

    if (updates.size > 0) {
        const next = config.escopos.map((item) => updates.get(item.id) || item);
        await saveDemandasPlanejamentoAgendadoConfig({
            ...config,
            escopos: next,
            updatedAt: now.toISOString(),
        });
    }

    const actorUserId = session?.id || (await resolveAuditUserId(null));
    if (actorUserId) {
        try {
            await db.logAuditoria.create({
                data: {
                    userId: actorUserId,
                    acao: simular
                        ? "DEMANDAS_PLANEJAMENTO_AGENDADO_SIMULADO"
                        : "DEMANDAS_PLANEJAMENTO_AGENDADO_EXECUTADO",
                    entidade: "DEMANDAS",
                    entidadeId: "PLANEJAMENTO_AGENDADO",
                    dadosAntes: {
                        force,
                        modo: parsed.data.modo,
                        avaliados,
                        escoposAtivos: config.escopos.filter((item) => item.ativo).length,
                    },
                    dadosDepois: {
                        executados,
                        falhas,
                        detalhes: detalhes.slice(0, 50),
                    },
                },
            });
        } catch (error) {
            console.warn("[demandas-planejamento] falha ao auditar execucao agendada:", error);
        }
    }

    revalidatePath("/admin/demandas");

    return {
        success: true,
        result: {
            skipped: executados === 0 && falhas === 0,
            executados,
            avaliados,
            falhas,
            detalhes,
        },
    };
}

export async function salvarRotinaRecorrenteDemandas(
    input: z.infer<typeof rotinaRecorrenteSchema>
) {
    const parsed = rotinaRecorrenteSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: "Dados invalidos para rotina recorrente." };
    }

    const session = await getSession();
    if (!session) return { success: false, error: "Nao autenticado." };

    const nowIso = new Date().toISOString();
    const existing = await getDemandasRotinasConfig();
    const area = normalizeAreaFilter(parsed.data.area);
    const papelResponsavel = normalizePapelResponsavel(parsed.data.papelResponsavel);

    const base: DemandaRotinaRecorrente = {
        id: parsed.data.id || crypto.randomUUID(),
        nome: parsed.data.nome,
        descricao: parsed.data.descricao || "",
        area,
        papelResponsavel,
        advogadoId: parsed.data.advogadoId || null,
        periodicidade: parsed.data.periodicidade,
        diaSemana: parsed.data.periodicidade === "SEMANAL" ? parsed.data.diaSemana ?? 1 : null,
        diaMes: parsed.data.periodicidade === "MENSAL" ? parsed.data.diaMes ?? 1 : null,
        prioridade: parsed.data.prioridade,
        slaDias: parsed.data.slaDias,
        checklist: parsed.data.checklist,
        ativo: parsed.data.ativo,
        ultimaGeracaoEm: null,
        proximaExecucaoEm: nowIso,
        criadoPorId: session.id,
        templateId: null,
        regraId: null,
        createdAt: nowIso,
        updatedAt: nowIso,
    };

    const previous = existing.find((item) => item.id === base.id);
    const rotina: DemandaRotinaRecorrente = {
        ...base,
        ultimaGeracaoEm: previous?.ultimaGeracaoEm ?? null,
        templateId: previous?.templateId ?? null,
        regraId: previous?.regraId ?? null,
        createdAt: previous?.createdAt ?? base.createdAt,
        proximaExecucaoEm: computeNextRotinaExecution(
            {
                ...base,
                ultimaGeracaoEm: previous?.ultimaGeracaoEm ?? null,
            },
            new Date()
        ),
    };

    const next = previous
        ? existing.map((item) => (item.id === rotina.id ? rotina : item))
        : [rotina, ...existing];
    await saveDemandasRotinasConfig(next);

    try {
        await db.logAuditoria.create({
            data: {
                userId: session.id,
                acao: previous ? "DEMANDAS_ROTINA_ATUALIZADA" : "DEMANDAS_ROTINA_CRIADA",
                entidade: "DEMANDAS",
                entidadeId: rotina.id,
                dadosAntes: previous
                    ? (previous as unknown as Prisma.InputJsonValue)
                    : Prisma.JsonNull,
                dadosDepois: rotina as unknown as Prisma.InputJsonValue,
            },
        });
    } catch (error) {
        console.warn("[demandas-rotina] falha ao registrar auditoria:", error);
    }

    revalidatePath("/demandas");
    return { success: true, rotina };
}

export async function toggleRotinaRecorrenteDemandas(id: string, ativo?: boolean) {
    const session = await getSession();
    if (!session) return { success: false, error: "Nao autenticado." };

    const current = await getDemandasRotinasConfig();
    const found = current.find((item) => item.id === id);
    if (!found) return { success: false, error: "Rotina nao encontrada." };

    const nextAtivo = typeof ativo === "boolean" ? ativo : !found.ativo;
    const updated: DemandaRotinaRecorrente = {
        ...found,
        ativo: nextAtivo,
        updatedAt: new Date().toISOString(),
        proximaExecucaoEm: nextAtivo
            ? computeNextRotinaExecution(found, new Date())
            : found.proximaExecucaoEm,
    };

    await saveDemandasRotinasConfig(current.map((item) => (item.id === id ? updated : item)));

    try {
        await db.logAuditoria.create({
            data: {
                userId: session.id,
                acao: "DEMANDAS_ROTINA_ATIVO",
                entidade: "DEMANDAS",
                entidadeId: id,
                dadosAntes: { ativoAnterior: found.ativo },
                dadosDepois: { ativoNovo: updated.ativo },
            },
        });
    } catch (error) {
        console.warn("[demandas-rotina] falha ao auditar toggle:", error);
    }

    revalidatePath("/demandas");
    return { success: true, rotina: updated };
}

export async function deleteRotinaRecorrenteDemandas(id: string) {
    const session = await getSession();
    if (!session) return { success: false, error: "Nao autenticado." };

    const current = await getDemandasRotinasConfig();
    const found = current.find((item) => item.id === id);
    if (!found) return { success: false, error: "Rotina nao encontrada." };

    const next = current.filter((item) => item.id !== id);
    await saveDemandasRotinasConfig(next);

    try {
        await db.logAuditoria.create({
            data: {
                userId: session.id,
                acao: "DEMANDAS_ROTINA_EXCLUIDA",
                entidade: "DEMANDAS",
                entidadeId: id,
                dadosAntes: found as unknown as Prisma.InputJsonValue,
                dadosDepois: { removida: true },
            },
        });
    } catch (error) {
        console.warn("[demandas-rotina] falha ao auditar exclusao:", error);
    }

    revalidatePath("/demandas");
    return { success: true };
}

export async function aplicarAcaoLoteRotinasDemandas(
    input: z.infer<typeof loteRotinasSchema>
) {
    const parsed = loteRotinasSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Dados invalidos para lote de rotinas." };

    const session = await getSession();
    if (!session) return { success: false, error: "Nao autenticado." };

    const current = await getDemandasRotinasConfig();
    const idSet = new Set(parsed.data.ids);
    const matched = current.filter((item) => idSet.has(item.id));
    if (matched.length === 0) {
        return { success: false, error: "Nenhuma rotina encontrada para os ids informados." };
    }

    let afetadas = 0;
    const nowIso = new Date().toISOString();
    let next = current;

    if (parsed.data.acao === "EXCLUIR") {
        next = current.filter((item) => !idSet.has(item.id));
        afetadas = current.length - next.length;
    } else if (parsed.data.acao === "ATIVAR") {
        next = current.map((item) => {
            if (!idSet.has(item.id)) return item;
            afetadas += item.ativo ? 0 : 1;
            return {
                ...item,
                ativo: true,
                updatedAt: nowIso,
                proximaExecucaoEm: computeNextRotinaExecution(item, new Date()),
            };
        });
    } else {
        next = current.map((item) => {
            if (!idSet.has(item.id)) return item;
            afetadas += item.ativo ? 1 : 0;
            return {
                ...item,
                ativo: false,
                updatedAt: nowIso,
            };
        });
    }

    await saveDemandasRotinasConfig(next);

    try {
        await db.logAuditoria.create({
            data: {
                userId: session.id,
                acao: "DEMANDAS_ROTINAS_LOTE",
                entidade: "DEMANDAS",
                entidadeId: "ROTINAS",
                dadosAntes: {
                    acao: parsed.data.acao,
                    ids: parsed.data.ids.slice(0, 200),
                    selecionadas: matched.length,
                },
                dadosDepois: {
                    afetadas,
                },
            },
        });
    } catch (error) {
        console.warn("[demandas-rotina] falha ao auditar lote:", error);
    }

    revalidatePath("/demandas");
    return { success: true, afetadas };
}

export async function salvarTemplateRotinaDemandas(
    input: z.infer<typeof templateRotinaSchema>
) {
    const parsed = templateRotinaSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: "Dados invalidos para template de rotina." };
    }

    const session = await getSession();
    if (!session) return { success: false, error: "Nao autenticado." };
    if (!canManageDemandasAdmin(session.role)) {
        return { success: false, error: getAdminPermissaoErrorForRole(session.role) };
    }

    const current = await getDemandasRotinasTemplatesConfig();
    const existing = parsed.data.id
        ? current.find((item) => item.id === parsed.data.id) || null
        : null;
    const template = toTemplateFromInput(parsed.data, existing);
    const next = existing
        ? current.map((item) => (item.id === template.id ? template : item))
        : [template, ...current];

    await saveDemandasRotinasTemplatesConfig(next);

    try {
        await db.logAuditoria.create({
            data: {
                userId: session.id,
                acao: existing ? "DEMANDAS_TEMPLATE_ROTINA_ATUALIZADO" : "DEMANDAS_TEMPLATE_ROTINA_CRIADO",
                entidade: "DEMANDAS",
                entidadeId: template.id,
                dadosAntes: existing
                    ? (existing as unknown as Prisma.InputJsonValue)
                    : Prisma.JsonNull,
                dadosDepois: template as unknown as Prisma.InputJsonValue,
            },
        });
    } catch (error) {
        console.warn("[demandas-template] falha ao auditar template:", error);
    }

    revalidatePath("/demandas");
    return { success: true, template };
}

export async function deleteTemplateRotinaDemandas(id: string) {
    const session = await getSession();
    if (!session) return { success: false, error: "Nao autenticado." };
    if (!canManageDemandasAdmin(session.role)) {
        return { success: false, error: getAdminPermissaoErrorForRole(session.role) };
    }

    const current = await getDemandasRotinasTemplatesConfig();
    const found = current.find((item) => item.id === id);
    if (!found) return { success: false, error: "Template nao encontrado." };

    const next = current.filter((item) => item.id !== id);
    await saveDemandasRotinasTemplatesConfig(next);

    try {
        await db.logAuditoria.create({
            data: {
                userId: session.id,
                acao: "DEMANDAS_TEMPLATE_ROTINA_EXCLUIDO",
                entidade: "DEMANDAS",
                entidadeId: id,
                dadosAntes: found as unknown as Prisma.InputJsonValue,
                dadosDepois: { removido: true },
            },
        });
    } catch (error) {
        console.warn("[demandas-template] falha ao auditar exclusao:", error);
    }

    revalidatePath("/demandas");
    return { success: true };
}

export async function salvarRegraRotinaDemandas(
    input: z.infer<typeof regraRotinaSchema>
) {
    const parsed = regraRotinaSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: "Dados invalidos para regra automatica." };
    }

    const session = await getSession();
    if (!session) return { success: false, error: "Nao autenticado." };
    if (!canManageDemandasAdmin(session.role)) {
        return { success: false, error: getAdminPermissaoErrorForRole(session.role) };
    }

    const templates = await getDemandasRotinasTemplatesConfig();
    const templateExists = templates.some((item) => item.id === parsed.data.templateId);
    if (!templateExists) {
        return { success: false, error: "Template selecionado nao foi encontrado." };
    }

    if (parsed.data.timeId) {
        const time = await db.time.findUnique({
            where: { id: parsed.data.timeId },
            select: { id: true },
        });
        if (!time) {
            return { success: false, error: "Equipe informada nao existe." };
        }
    }

    const current = await getDemandasRotinasRegrasConfig();
    const existing = parsed.data.id
        ? current.find((item) => item.id === parsed.data.id) || null
        : null;
    const regra = toRegraFromInput(parsed.data, existing);
    const next = existing
        ? current.map((item) => (item.id === regra.id ? regra : item))
        : [regra, ...current];
    await saveDemandasRotinasRegrasConfig(next);

    try {
        await db.logAuditoria.create({
            data: {
                userId: session.id,
                acao: existing ? "DEMANDAS_REGRA_ROTINA_ATUALIZADA" : "DEMANDAS_REGRA_ROTINA_CRIADA",
                entidade: "DEMANDAS",
                entidadeId: regra.id,
                dadosAntes: existing
                    ? (existing as unknown as Prisma.InputJsonValue)
                    : Prisma.JsonNull,
                dadosDepois: regra as unknown as Prisma.InputJsonValue,
            },
        });
    } catch (error) {
        console.warn("[demandas-regra] falha ao auditar salvamento:", error);
    }

    revalidatePath("/demandas");
    revalidatePath("/admin/demandas");
    return { success: true, regra };
}

export async function deleteRegraRotinaDemandas(id: string) {
    const session = await getSession();
    if (!session) return { success: false, error: "Nao autenticado." };
    if (!canManageDemandasAdmin(session.role)) {
        return { success: false, error: getAdminPermissaoErrorForRole(session.role) };
    }

    const current = await getDemandasRotinasRegrasConfig();
    const found = current.find((item) => item.id === id);
    if (!found) return { success: false, error: "Regra nao encontrada." };

    const next = current.filter((item) => item.id !== id);
    await saveDemandasRotinasRegrasConfig(next);

    try {
        await db.logAuditoria.create({
            data: {
                userId: session.id,
                acao: "DEMANDAS_REGRA_ROTINA_EXCLUIDA",
                entidade: "DEMANDAS",
                entidadeId: id,
                dadosAntes: found as unknown as Prisma.InputJsonValue,
                dadosDepois: { removida: true },
            },
        });
    } catch (error) {
        console.warn("[demandas-regra] falha ao auditar exclusao:", error);
    }

    revalidatePath("/demandas");
    revalidatePath("/admin/demandas");
    return { success: true };
}

export async function aplicarAcaoLoteRegrasDemandas(
    input: z.infer<typeof loteRegrasSchema>
) {
    const parsed = loteRegrasSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: "Dados invalidos para lote de regras." };
    }

    const session = await getSession();
    if (!session) return { success: false, error: "Nao autenticado." };
    if (!canManageDemandasAdmin(session.role)) {
        return { success: false, error: getAdminPermissaoErrorForRole(session.role) };
    }

    const current = await getDemandasRotinasRegrasConfig();
    const idSet = new Set(parsed.data.ids);
    const matched = current.filter((item) => idSet.has(item.id));
    if (matched.length === 0) {
        return { success: false, error: "Nenhuma regra encontrada para os ids informados." };
    }

    const alvoAtivo = parsed.data.acao === "ATIVAR";
    const nowIso = new Date().toISOString();
    let afetadas = 0;

    const next = current.map((item) => {
        if (!idSet.has(item.id)) return item;
        if (item.ativo === alvoAtivo) return item;
        afetadas += 1;
        return {
            ...item,
            ativo: alvoAtivo,
            updatedAt: nowIso,
        };
    });

    await saveDemandasRotinasRegrasConfig(next);

    try {
        await db.logAuditoria.create({
            data: {
                userId: session.id,
                acao: "DEMANDAS_REGRAS_LOTE",
                entidade: "DEMANDAS",
                entidadeId: "REGRAS_ROTINAS",
                dadosAntes: {
                    acao: parsed.data.acao,
                    ids: parsed.data.ids.slice(0, 400),
                    selecionadas: matched.length,
                },
                dadosDepois: {
                    afetadas,
                    ativoNovo: alvoAtivo,
                },
            },
        });
    } catch (error) {
        console.warn("[demandas-regra] falha ao auditar lote:", error);
    }

    revalidatePath("/demandas");
    revalidatePath("/admin/demandas");
    return { success: true, afetadas };
}

export async function executarRegrasGeracaoRotinasDemandas(
    input: z.infer<typeof executarRegrasSchema> = { modo: "MANUAL", simular: false }
) {
    const parsed = executarRegrasSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Modo invalido para execucao de regras." };

    const session = await getSession();
    if (parsed.data.modo === "MANUAL" && !session) {
        return { success: false, error: "Nao autenticado." };
    }
    if (parsed.data.modo === "MANUAL" && session && !canManageDemandasAdmin(session.role)) {
        return { success: false, error: getAdminPermissaoErrorForRole(session.role) };
    }

    const [rules, templates, rotinas, advogados] = await Promise.all([
        getDemandasRotinasRegrasConfig(),
        getDemandasRotinasTemplatesConfig(),
        getDemandasRotinasConfig(),
        db.advogado.findMany({
            where: { ativo: true, user: { isActive: true } },
            select: {
                id: true,
                userId: true,
                user: { select: { name: true, role: true } },
                timeMembros: { select: { timeId: true } },
            },
            take: 1000,
        }),
    ]);

    const activeRules = rules.filter((item) => item.ativo);
    if (activeRules.length === 0) {
        return {
            success: true,
            result: {
                simulado: parsed.data.simular,
                regrasAvaliadas: 0,
                rotinasCriadas: 0,
                rotinasAtualizadas: 0,
                ignoradas: 0,
                detalhes: [] as string[],
                porRegra: [] as Array<{
                    regraId: string;
                    regraNome: string;
                    templateId: string;
                    templateNome: string | null;
                    elegiveis: number;
                    criadas: number;
                    atualizadas: number;
                    ignoradas: number;
                    observacoes: string[];
                }>,
            },
        };
    }

    const simulado = parsed.data.simular;
    const now = new Date();
    const nowIso = now.toISOString();
    const templateMap = new Map(templates.map((item) => [item.id, item]));
    const nextRotinas = [...rotinas];
    let created = 0;
    let updated = 0;
    let ignored = 0;
    const details: string[] = [];
    const byRule: Array<{
        regraId: string;
        regraNome: string;
        templateId: string;
        templateNome: string | null;
        elegiveis: number;
        criadas: number;
        atualizadas: number;
        ignoradas: number;
        observacoes: string[];
    }> = [];
    const rulesUpdated: DemandaRotinaRegra[] = [];

    for (const rule of activeRules) {
        const ruleResult = {
            regraId: rule.id,
            regraNome: rule.nome,
            templateId: rule.templateId,
            templateNome: null as string | null,
            elegiveis: 0,
            criadas: 0,
            atualizadas: 0,
            ignoradas: 0,
            observacoes: [] as string[],
        };

        const template = templateMap.get(rule.templateId);
        if (!template) {
            ignored += 1;
            ruleResult.ignoradas += 1;
            ruleResult.observacoes.push("Template nao encontrado.");
            details.push(`Regra ${rule.nome}: template nao encontrado.`);
            rulesUpdated.push({
                ...rule,
                ultimaAplicacaoEm: simulado ? rule.ultimaAplicacaoEm : nowIso,
                ultimaSimulacaoEm: simulado ? nowIso : rule.ultimaSimulacaoEm,
                totalExecucoes: rule.totalExecucoes + (simulado ? 0 : 1),
                totalSimulacoes: rule.totalSimulacoes + (simulado ? 1 : 0),
                totalCriadas: rule.totalCriadas,
                totalAtualizadas: rule.totalAtualizadas,
                totalIgnoradas: rule.totalIgnoradas + 1,
                updatedAt: nowIso,
            });
            byRule.push(ruleResult);
            continue;
        }
        ruleResult.templateNome = template.nome;

        const candidates = advogados.filter((adv) => {
            if (rule.papelResponsavel !== "AUTO" && adv.user.role !== rule.papelResponsavel) return false;
            if (rule.timeId && !adv.timeMembros.some((m) => m.timeId === rule.timeId)) return false;
            return true;
        });
        ruleResult.elegiveis = candidates.length;

        if (candidates.length === 0) {
            ignored += 1;
            ruleResult.ignoradas += 1;
            ruleResult.observacoes.push("Sem advogados elegiveis para o escopo.");
            details.push(`Regra ${rule.nome}: sem advogados elegiveis.`);
            rulesUpdated.push({
                ...rule,
                ultimaAplicacaoEm: simulado ? rule.ultimaAplicacaoEm : nowIso,
                ultimaSimulacaoEm: simulado ? nowIso : rule.ultimaSimulacaoEm,
                totalExecucoes: rule.totalExecucoes + (simulado ? 0 : 1),
                totalSimulacoes: rule.totalSimulacoes + (simulado ? 1 : 0),
                totalCriadas: rule.totalCriadas,
                totalAtualizadas: rule.totalAtualizadas,
                totalIgnoradas: rule.totalIgnoradas + 1,
                updatedAt: nowIso,
            });
            byRule.push(ruleResult);
            continue;
        }

        for (const adv of candidates) {
            const existingIdx = nextRotinas.findIndex(
                (item) => item.regraId === rule.id && item.advogadoId === adv.id
            );

            const periodicidade =
                rule.periodicidadeOverride === "AUTO"
                    ? template.periodicidade
                    : rule.periodicidadeOverride;
            const prioridade =
                rule.prioridadeOverride === "AUTO"
                    ? template.prioridade
                    : rule.prioridadeOverride;
            const area = rule.areaOverride === "TODAS" ? template.area : rule.areaOverride;

            const base: DemandaRotinaRecorrente = {
                id:
                    existingIdx >= 0
                        ? nextRotinas[existingIdx].id
                        : crypto.randomUUID(),
                nome: template.nome,
                descricao: `${template.descricao || ""}\n[Regra automatica: ${rule.nome}]`.trim(),
                area,
                papelResponsavel: rule.papelResponsavel,
                advogadoId: adv.id,
                periodicidade,
                diaSemana:
                    periodicidade === "SEMANAL"
                        ? (template.diaSemana ?? 1)
                        : null,
                diaMes:
                    periodicidade === "MENSAL"
                        ? (template.diaMes ?? 1)
                        : null,
                prioridade,
                slaDias:
                    rule.slaDiasOverride !== null && rule.slaDiasOverride !== undefined
                        ? rule.slaDiasOverride
                        : template.slaDias,
                checklist: template.checklist,
                ativo: true,
                ultimaGeracaoEm:
                    existingIdx >= 0 ? nextRotinas[existingIdx].ultimaGeracaoEm : null,
                proximaExecucaoEm: now.toISOString(),
                criadoPorId:
                    existingIdx >= 0
                        ? nextRotinas[existingIdx].criadoPorId
                        : (session?.id || adv.userId),
                templateId: template.id,
                regraId: rule.id,
                createdAt:
                    existingIdx >= 0 ? nextRotinas[existingIdx].createdAt : now.toISOString(),
                updatedAt: now.toISOString(),
            };
            const rotina = {
                ...base,
                proximaExecucaoEm: computeNextRotinaExecution(base, now),
            };

            if (existingIdx >= 0) {
                updated += 1;
                ruleResult.atualizadas += 1;
                if (!simulado) {
                    nextRotinas[existingIdx] = rotina;
                }
            } else {
                created += 1;
                ruleResult.criadas += 1;
                if (!simulado) {
                    nextRotinas.unshift(rotina);
                }
            }
        }

        details.push(
            `Regra ${rule.nome}: ${ruleResult.criadas} criada(s), ${ruleResult.atualizadas} atualizada(s), ${ruleResult.ignoradas} ignorada(s).`
        );
        rulesUpdated.push({
            ...rule,
            ultimaAplicacaoEm: simulado ? rule.ultimaAplicacaoEm : nowIso,
            ultimaSimulacaoEm: simulado ? nowIso : rule.ultimaSimulacaoEm,
            totalExecucoes: rule.totalExecucoes + (simulado ? 0 : 1),
            totalSimulacoes: rule.totalSimulacoes + (simulado ? 1 : 0),
            totalCriadas: rule.totalCriadas + ruleResult.criadas,
            totalAtualizadas: rule.totalAtualizadas + ruleResult.atualizadas,
            totalIgnoradas: rule.totalIgnoradas + ruleResult.ignoradas,
            updatedAt: nowIso,
        });
        byRule.push(ruleResult);
    }

    if (!simulado) {
        await saveDemandasRotinasConfig(nextRotinas);
    }

    if (rulesUpdated.length > 0) {
        const rulesMap = new Map(rules.map((item) => [item.id, item]));
        for (const rule of rulesUpdated) {
            rulesMap.set(rule.id, rule);
        }
        await saveDemandasRotinasRegrasConfig(Array.from(rulesMap.values()));
    }

    const auditUserId = await resolveAuditUserId(session?.id || null);
    if (auditUserId) {
        try {
            await db.logAuditoria.create({
                data: {
                    userId: auditUserId,
                    acao: simulado
                        ? "DEMANDAS_REGRAS_GERACAO_SIMULADAS"
                        : "DEMANDAS_REGRAS_GERACAO_EXECUTADAS",
                    entidade: "DEMANDAS",
                    entidadeId: "REGRAS_ROTINAS",
                    dadosAntes: {
                        modo: parsed.data.modo,
                        simulado,
                        regrasAtivas: activeRules.length,
                    },
                    dadosDepois: {
                        criadas: created,
                        atualizadas: updated,
                        ignoradas: ignored,
                        detalhes: details.slice(0, 60),
                        porRegra: byRule.slice(0, 100),
                    },
                },
            });
        } catch (error) {
            console.warn("[demandas-regra] falha ao auditar execucao:", error);
        }
    }

    revalidatePath("/demandas");
    revalidatePath("/admin/demandas");
    return {
        success: true,
        result: {
            simulado,
            regrasAvaliadas: activeRules.length,
            rotinasCriadas: created,
            rotinasAtualizadas: updated,
            ignoradas: ignored,
            detalhes: details,
            porRegra: byRule,
        },
    };
}

async function resolveResponsavelParaRotina(rotina: DemandaRotinaRecorrente) {
    const advogados = await db.advogado.findMany({
        where: { ativo: true, user: { isActive: true } },
        select: {
            id: true,
            userId: true,
            user: { select: { name: true, role: true } },
        },
        take: 500,
    });
    if (advogados.length === 0) return null;

    if (rotina.advogadoId) {
        const fixed = advogados.find((item) => item.id === rotina.advogadoId);
        if (fixed) return fixed;
    }

    const candidates =
        rotina.papelResponsavel === "AUTO"
            ? advogados
            : advogados.filter((item) => item.user.role === rotina.papelResponsavel);
    if (candidates.length === 0) return null;

    const overview = await getDemandasOverview({
        area: rotina.area === "TODAS" ? "TODAS" : (rotina.area as AreaAtuacaoKey),
        periodoDias: 30,
    });
    const scoreMap = new Map(
        overview.cargaPorResponsavel.map((item) => [item.advogadoId, item.scoreCarga])
    );

    return [...candidates].sort((a, b) => {
        const scoreA = scoreMap.get(a.id) ?? 0;
        const scoreB = scoreMap.get(b.id) ?? 0;
        if (scoreA !== scoreB) return scoreA - scoreB;
        return (a.user.name || "").localeCompare(b.user.name || "");
    })[0];
}

async function resolveAuditUserId(fallbackUserId?: string | null) {
    if (fallbackUserId) return fallbackUserId;
    const manager = await db.user.findFirst({
        where: {
            isActive: true,
            role: { in: ["ADMIN", "SOCIO"] },
        },
        select: { id: true },
        orderBy: { createdAt: "asc" },
    });
    return manager?.id || null;
}

export async function executarRotinasRecorrentesDemandas(
    input: z.infer<typeof executarRotinasSchema> = { modo: "MANUAL" }
) {
    const parsed = executarRotinasSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Modo de execucao invalido." };

    const session = await getSession();
    if (parsed.data.modo === "MANUAL" && !session) {
        return { success: false, error: "Nao autenticado." };
    }

    const now = new Date();
    const rotinas = await getDemandasRotinasConfig();
    const due = rotinas.filter(
        (item) => item.ativo && new Date(item.proximaExecucaoEm).getTime() <= now.getTime()
    );

    if (due.length === 0) {
        return {
            success: true,
            result: {
                avaliadas: 0,
                geradas: 0,
                ignoradas: 0,
                detalhes: [] as string[],
            },
        };
    }

    const startDay = startOfDay(now);
    let geradas = 0;
    let ignoradas = 0;
    const detalhes: string[] = [];
    const byId = new Map(rotinas.map((item) => [item.id, item]));

    for (const rotina of due) {
        const responsavel = await resolveResponsavelParaRotina(rotina);
        if (!responsavel) {
            ignoradas += 1;
            detalhes.push(`Rotina ${rotina.nome}: sem responsavel elegivel.`);
            const unchanged = byId.get(rotina.id);
            if (unchanged) {
                byId.set(rotina.id, {
                    ...unchanged,
                    proximaExecucaoEm: computeNextRotinaExecution(unchanged, now),
                    updatedAt: now.toISOString(),
                });
            }
            continue;
        }

        const titulo = `[Rotina] ${rotina.nome} - ${formatDateKey(now)}`;
        const existente = await db.tarefa.findFirst({
            where: {
                titulo,
                advogadoId: responsavel.id,
                createdAt: { gte: startDay },
                status: { in: ["A_FAZER", "EM_ANDAMENTO", "REVISAO"] },
            },
            select: { id: true },
        });

        if (existente) {
            ignoradas += 1;
            detalhes.push(`Rotina ${rotina.nome}: tarefa ja existente no dia.`);
            const unchanged = byId.get(rotina.id);
            if (unchanged) {
                byId.set(rotina.id, {
                    ...unchanged,
                    proximaExecucaoEm: computeNextRotinaExecution(unchanged, now),
                    updatedAt: now.toISOString(),
                });
            }
            continue;
        }

        const dataLimite = new Date(startDay);
        dataLimite.setDate(dataLimite.getDate() + rotina.slaDias);

        const checklistText =
            rotina.checklist.length > 0
                ? `\n\nChecklist sugerido:\n${rotina.checklist.map((item) => `- ${item}`).join("\n")}`
                : "";

        const descricao = [
            rotina.descricao || "Rotina recorrente gerada automaticamente pela gestao de demandas.",
            `Area: ${rotina.area}`,
            `Periodicidade: ${rotina.periodicidade}`,
            `Papel sugerido: ${rotina.papelResponsavel}`,
        ].join("\n");

        await db.tarefa.create({
            data: {
                titulo,
                descricao: `${descricao}${checklistText}`,
                prioridade: rotina.prioridade,
                status: "A_FAZER",
                dataLimite,
                processoId: null,
                advogadoId: responsavel.id,
                criadoPorId: session?.id || responsavel.userId,
            },
        });

        geradas += 1;
        detalhes.push(`Rotina ${rotina.nome}: gerada para ${responsavel.user.name || "Advogado"}.`);

        const current = byId.get(rotina.id);
        if (current) {
            byId.set(rotina.id, {
                ...current,
                ultimaGeracaoEm: now.toISOString(),
                proximaExecucaoEm: computeNextRotinaExecution(current, now),
                updatedAt: now.toISOString(),
            });
        }
    }

    await saveDemandasRotinasConfig(Array.from(byId.values()));

    const auditUserId = await resolveAuditUserId(session?.id || null);
    if (auditUserId) {
        try {
            await db.logAuditoria.create({
                data: {
                    userId: auditUserId,
                    acao: "DEMANDAS_ROTINAS_PROCESSADAS",
                    entidade: "DEMANDAS",
                    entidadeId: "ROTINAS",
                    dadosAntes: {
                        modo: parsed.data.modo,
                        avaliadas: due.length,
                    },
                    dadosDepois: {
                        geradas,
                        ignoradas,
                        detalhes: detalhes.slice(0, 30),
                    },
                },
            });
        } catch (error) {
            console.warn("[demandas-rotina] falha ao registrar processamento:", error);
        }
    }

    revalidatePath("/demandas");
    revalidatePath("/tarefas");
    revalidatePath("/agenda");

    return {
        success: true,
        result: {
            avaliadas: due.length,
            geradas,
            ignoradas,
            detalhes,
        },
    };
}
