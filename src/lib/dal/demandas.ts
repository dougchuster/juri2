import "server-only";

import { db } from "@/lib/db";
import type { StatusAtendimento } from "@/generated/prisma";
import type {
    DemandaIaPlano,
    DemandaPlanejamentoAgendadoConfig,
    DemandaRotinaRegra,
    DemandaRotinaRecorrente,
    DemandaRotinaTemplate,
} from "@/lib/types/demandas";
import {
    getAreaAtuacaoLabel,
    inferAreaAtuacaoFromProcess,
    inferAreaAtuacaoFromText,
    type AreaAtuacaoKey,
} from "@/lib/services/areas-atuacao";
import {
    getDemandasIaPlanosConfig,
    getDemandasPlanejamentoAgendadoConfig as getDemandasPlanejamentoAgendadoConfigSetting,
    getDemandasRotinasConfig,
    getDemandasRotinasRegrasConfig,
    getDemandasRotinasTemplatesConfig,
} from "@/lib/services/demandas-config";

export interface DemandasOverviewFilters {
    area?: AreaAtuacaoKey | "TODAS";
    advogadoId?: string;
    periodoDias?: number;
}

export interface DemandaKpis {
    tarefasAbertas: number;
    tarefasAtrasadas: number;
    prazosPendentes: number;
    prazosCriticos7d: number;
    prazosAtrasados: number;
    atendimentosAbertos: number;
    processosAtivos: number;
}

export interface DemandaCargaResponsavel {
    advogadoId: string;
    nome: string;
    tarefasPendentes: number;
    tarefasAtrasadas: number;
    prazosPendentes: number;
    prazosCriticos: number;
    prazosAtrasados: number;
    atendimentosAbertos: number;
    processosAtivos: number;
    scoreCarga: number;
}

export interface DemandaResumoArea {
    area: AreaAtuacaoKey;
    label: string;
    tarefasPendentes: number;
    prazosPendentes: number;
    processosAtivos: number;
    atendimentosAbertos: number;
    atrasos: number;
}

export interface DemandaGargalo {
    tipo: "PRAZO_ATRASADO" | "SOBRECARGA_RESPONSAVEL" | "AREA_CRITICA";
    titulo: string;
    detalhe: string;
    severidade: "alta" | "media";
}

export interface DemandasOverview {
    filtros: {
        area: AreaAtuacaoKey | "TODAS";
        advogadoId: string | null;
        periodoDias: number;
    };
    kpis: DemandaKpis;
    cargaPorResponsavel: DemandaCargaResponsavel[];
    resumoPorArea: DemandaResumoArea[];
    gargalos: DemandaGargalo[];
    sugestoesOperacionais: string[];
}

export interface DemandaAuditoriaItem {
    id: string;
    acao: string;
    entidadeId: string;
    createdAt: Date;
    user: {
        name: string | null;
        email: string;
    };
    dadosAntes: PrismaJsonLike | null;
    dadosDepois: PrismaJsonLike | null;
}

export interface DemandaEfetividadeRegraPeriodoItem {
    regraId: string;
    regraNome: string;
    templateId: string;
    templateNome: string | null;
    execucoes: number;
    simulacoes: number;
    criadas: number;
    atualizadas: number;
    ignoradas: number;
    taxaCriacao: number;
    taxaIgnorada: number;
}

export interface DemandasIaIndicadores {
    periodoDias: number;
    totalPlanos: number;
    pendentes: number;
    aplicados: number;
    descartados: number;
    taxaAplicacao: number;
    taxaDescarte: number;
    planosAnalise: number;
    planosRedistribuicao: number;
    aplicadosAnalise: number;
    aplicadosRedistribuicao: number;
    economiaHorasEstimada: number;
    ultimoPlanoEm: string | null;
}

type PrismaJsonLike =
    | null
    | string
    | number
    | boolean
    | { [key: string]: PrismaJsonLike }
    | PrismaJsonLike[];

const STATUS_ATENDIMENTO_ABERTO: StatusAtendimento[] = [
    "LEAD",
    "QUALIFICACAO",
    "PROPOSTA",
    "FECHAMENTO",
];

function getAreaByProcess(processo?: {
    tipoAcao?: { nome?: string | null; grupo?: string | null } | null;
    objeto?: string | null;
    tribunal?: string | null;
    vara?: string | null;
    foro?: string | null;
} | null): AreaAtuacaoKey {
    if (!processo) return "OUTRAS";
    return inferAreaAtuacaoFromProcess({
        tipoAcaoNome: processo.tipoAcao?.nome || "",
        tipoAcaoGrupo: processo.tipoAcao?.grupo || "",
        objeto: processo.objeto || "",
        tribunal: processo.tribunal || "",
        vara: processo.vara || "",
        foro: processo.foro || "",
    });
}

function getOrInitCarga(
    map: Map<string, DemandaCargaResponsavel>,
    advogadoId: string,
    nome: string
) {
    const current = map.get(advogadoId);
    if (current) return current;

    const next: DemandaCargaResponsavel = {
        advogadoId,
        nome,
        tarefasPendentes: 0,
        tarefasAtrasadas: 0,
        prazosPendentes: 0,
        prazosCriticos: 0,
        prazosAtrasados: 0,
        atendimentosAbertos: 0,
        processosAtivos: 0,
        scoreCarga: 0,
    };
    map.set(advogadoId, next);
    return next;
}

function getOrInitArea(map: Map<AreaAtuacaoKey, DemandaResumoArea>, area: AreaAtuacaoKey) {
    const current = map.get(area);
    if (current) return current;

    const next: DemandaResumoArea = {
        area,
        label: getAreaAtuacaoLabel(area),
        tarefasPendentes: 0,
        prazosPendentes: 0,
        processosAtivos: 0,
        atendimentosAbertos: 0,
        atrasos: 0,
    };
    map.set(area, next);
    return next;
}

export async function getDemandasOverview(
    filters: DemandasOverviewFilters = {}
): Promise<DemandasOverview> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const periodoDias = Math.max(7, Math.min(120, filters.periodoDias || 30));
    const limiteCritico = new Date(today);
    limiteCritico.setDate(limiteCritico.getDate() + 7);
    const areaFiltro = filters.area || "TODAS";
    const advogadoFiltro = filters.advogadoId || null;

    const [advogados, processos, tarefas, prazos, atendimentos] = await Promise.all([
        db.advogado.findMany({
            where: { ativo: true, user: { isActive: true } },
            select: { id: true, user: { select: { name: true } } },
            orderBy: { user: { name: "asc" } },
            take: 300,
        }),
        db.processo.findMany({
            where: {
                status: { notIn: ["ENCERRADO", "ARQUIVADO"] },
                ...(advogadoFiltro ? { advogadoId: advogadoFiltro } : {}),
            },
            select: {
                id: true,
                advogadoId: true,
                tipoAcao: { select: { nome: true, grupo: true } },
                objeto: true,
                tribunal: true,
                vara: true,
                foro: true,
            },
            take: 5000,
        }),
        db.tarefa.findMany({
            where: {
                status: { notIn: ["CONCLUIDA", "CANCELADA"] },
                ...(advogadoFiltro ? { advogadoId: advogadoFiltro } : {}),
            },
            select: {
                id: true,
                titulo: true,
                descricao: true,
                advogadoId: true,
                dataLimite: true,
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
            take: 8000,
        }),
        db.prazo.findMany({
            where: {
                status: "PENDENTE",
                ...(advogadoFiltro ? { advogadoId: advogadoFiltro } : {}),
            },
            select: {
                id: true,
                descricao: true,
                advogadoId: true,
                dataFatal: true,
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
            take: 8000,
        }),
        db.atendimento.findMany({
            where: {
                status: { in: STATUS_ATENDIMENTO_ABERTO },
                ...(advogadoFiltro ? { advogadoId: advogadoFiltro } : {}),
            },
            select: {
                id: true,
                advogadoId: true,
                assunto: true,
                resumo: true,
            },
            take: 5000,
        }),
    ]);

    const nomeAdvogado = new Map(
        advogados.map((item) => [item.id, item.user.name || "Advogado"])
    );
    const cargaMap = new Map<string, DemandaCargaResponsavel>();
    const areaMap = new Map<AreaAtuacaoKey, DemandaResumoArea>();

    for (const advogado of advogados) {
        getOrInitCarga(cargaMap, advogado.id, advogado.user.name || "Advogado");
    }

    let tarefasAtrasadas = 0;
    for (const tarefa of tarefas) {
        const area = getAreaByProcess(tarefa.processo);
        if (areaFiltro !== "TODAS" && area !== areaFiltro) continue;

        const areaAgg = getOrInitArea(areaMap, area);
        areaAgg.tarefasPendentes += 1;

        const nome = nomeAdvogado.get(tarefa.advogadoId) || "Advogado";
        const carga = getOrInitCarga(cargaMap, tarefa.advogadoId, nome);
        carga.tarefasPendentes += 1;

        if (tarefa.dataLimite && tarefa.dataLimite < today) {
            tarefasAtrasadas += 1;
            areaAgg.atrasos += 1;
            carga.tarefasAtrasadas += 1;
        }
    }

    let prazosAtrasados = 0;
    let prazosCriticos7d = 0;
    for (const prazo of prazos) {
        const area = getAreaByProcess(prazo.processo);
        if (areaFiltro !== "TODAS" && area !== areaFiltro) continue;

        const areaAgg = getOrInitArea(areaMap, area);
        areaAgg.prazosPendentes += 1;

        const nome = nomeAdvogado.get(prazo.advogadoId) || "Advogado";
        const carga = getOrInitCarga(cargaMap, prazo.advogadoId, nome);
        carga.prazosPendentes += 1;

        if (prazo.dataFatal < today) {
            prazosAtrasados += 1;
            areaAgg.atrasos += 1;
            carga.prazosAtrasados += 1;
        } else if (prazo.dataFatal <= limiteCritico) {
            prazosCriticos7d += 1;
            carga.prazosCriticos += 1;
        }
    }

    for (const processo of processos) {
        const area = getAreaByProcess(processo);
        if (areaFiltro !== "TODAS" && area !== areaFiltro) continue;

        const areaAgg = getOrInitArea(areaMap, area);
        areaAgg.processosAtivos += 1;

        const nome = nomeAdvogado.get(processo.advogadoId) || "Advogado";
        const carga = getOrInitCarga(cargaMap, processo.advogadoId, nome);
        carga.processosAtivos += 1;
    }

    for (const atendimento of atendimentos) {
        const area = inferAreaAtuacaoFromText(
            `${atendimento.assunto} ${atendimento.resumo || ""}`
        );
        if (areaFiltro !== "TODAS" && area !== areaFiltro) continue;

        const areaAgg = getOrInitArea(areaMap, area);
        areaAgg.atendimentosAbertos += 1;

        const nome = nomeAdvogado.get(atendimento.advogadoId) || "Advogado";
        const carga = getOrInitCarga(cargaMap, atendimento.advogadoId, nome);
        carga.atendimentosAbertos += 1;
    }

    const cargaPorResponsavel = Array.from(cargaMap.values())
        .map((item) => {
            const scoreCarga =
                item.tarefasPendentes * 1 +
                item.tarefasAtrasadas * 3 +
                item.prazosPendentes * 2 +
                item.prazosCriticos * 3 +
                item.prazosAtrasados * 5 +
                item.atendimentosAbertos * 1 +
                Math.round(item.processosAtivos * 0.5);
            return {
                ...item,
                scoreCarga,
            };
        })
        .sort((a, b) => b.scoreCarga - a.scoreCarga || a.nome.localeCompare(b.nome));

    const resumoPorArea = Array.from(areaMap.values()).sort(
        (a, b) =>
            b.atrasos - a.atrasos ||
            b.prazosPendentes + b.tarefasPendentes - (a.prazosPendentes + a.tarefasPendentes)
    );

    const kpis: DemandaKpis = {
        tarefasAbertas: resumoPorArea.reduce((acc, item) => acc + item.tarefasPendentes, 0),
        tarefasAtrasadas,
        prazosPendentes: resumoPorArea.reduce((acc, item) => acc + item.prazosPendentes, 0),
        prazosCriticos7d,
        prazosAtrasados,
        atendimentosAbertos: resumoPorArea.reduce((acc, item) => acc + item.atendimentosAbertos, 0),
        processosAtivos: resumoPorArea.reduce((acc, item) => acc + item.processosAtivos, 0),
    };

    const gargalos: DemandaGargalo[] = [];

    if (kpis.prazosAtrasados > 0) {
        gargalos.push({
            tipo: "PRAZO_ATRASADO",
            titulo: `${kpis.prazosAtrasados} prazo(s) atrasado(s)`,
            detalhe: "Priorizar regularizacao imediata dos prazos vencidos.",
            severidade: "alta",
        });
    }

    const topCarga = cargaPorResponsavel[0];
    if (topCarga && topCarga.scoreCarga >= 20) {
        gargalos.push({
            tipo: "SOBRECARGA_RESPONSAVEL",
            titulo: `Sobrecarga em ${topCarga.nome}`,
            detalhe: `Score de carga ${topCarga.scoreCarga}. Avaliar redistribuicao de tarefas e prazos.`,
            severidade: "media",
        });
    }

    const areaCritica = resumoPorArea.find((item) => item.atrasos > 0);
    if (areaCritica) {
        gargalos.push({
            tipo: "AREA_CRITICA",
            titulo: `Area critica: ${areaCritica.label}`,
            detalhe: `${areaCritica.atrasos} atraso(s) com ${areaCritica.prazosPendentes} prazo(s) pendente(s).`,
            severidade: "media",
        });
    }

    const sugestoesOperacionais: string[] = [];
    if (kpis.prazosAtrasados > 0) {
        sugestoesOperacionais.push(
            "Criar mutirao de regularizacao para prazos vencidos com dupla revisao (advogado + apoio)."
        );
    }
    if (topCarga && cargaPorResponsavel.length > 1) {
        const menosCarga = cargaPorResponsavel[cargaPorResponsavel.length - 1];
        if (topCarga.scoreCarga - menosCarga.scoreCarga >= 8) {
            sugestoesOperacionais.push(
                `Redistribuir demandas de ${topCarga.nome} para ${menosCarga.nome} para equalizar carga.`
            );
        }
    }
    if (resumoPorArea.length > 0) {
        const topArea = resumoPorArea[0];
        sugestoesOperacionais.push(
            `Reforcar rotina semanal da area ${topArea.label} para reduzir acumulacao de pendencias.`
        );
    }

    return {
        filtros: {
            area: areaFiltro,
            advogadoId: advogadoFiltro,
            periodoDias,
        },
        kpis,
        cargaPorResponsavel,
        resumoPorArea,
        gargalos,
        sugestoesOperacionais,
    };
}

export async function getDemandasAuditoriaRecente(limit = 20): Promise<DemandaAuditoriaItem[]> {
    const rows = await db.logAuditoria.findMany({
        where: {
            entidade: "DEMANDAS",
            acao: {
                in: [
                    "DEMANDAS_IA_ANALISE",
                    "DEMANDAS_IA_PLANEJAMENTO_DIARIO",
                    "DEMANDAS_IA_PLANEJAMENTO_SIMULADO",
                    "DEMANDAS_IA_PLANEJAMENTO_APLICADO",
                    "DEMANDAS_IA_OTIMIZACAO_ROTINA",
                    "DEMANDAS_PLANEJAMENTO_AGENDADO_CONFIG_ATUALIZADA",
                    "DEMANDAS_PLANEJAMENTO_AGENDADO_ESCOPO_CRIADO",
                    "DEMANDAS_PLANEJAMENTO_AGENDADO_ESCOPO_ATUALIZADO",
                    "DEMANDAS_PLANEJAMENTO_AGENDADO_ESCOPO_EXCLUIDO",
                    "DEMANDAS_PLANEJAMENTO_AGENDADO_EXECUTADO",
                    "DEMANDAS_PLANEJAMENTO_AGENDADO_SIMULADO",
                    "DEMANDAS_REDISTRIBUICAO_APLICADA",
                    "DEMANDAS_IA_PLANO_STATUS",
                    "DEMANDAS_ROTINA_CRIADA",
                    "DEMANDAS_ROTINA_ATUALIZADA",
                    "DEMANDAS_ROTINA_ATIVO",
                    "DEMANDAS_ROTINA_EXCLUIDA",
                    "DEMANDAS_ROTINAS_PROCESSADAS",
                    "DEMANDAS_ROTINAS_LOTE",
                    "DEMANDAS_TEMPLATE_ROTINA_CRIADO",
                    "DEMANDAS_TEMPLATE_ROTINA_ATUALIZADO",
                    "DEMANDAS_TEMPLATE_ROTINA_EXCLUIDO",
                    "DEMANDAS_REGRA_ROTINA_CRIADA",
                    "DEMANDAS_REGRA_ROTINA_ATUALIZADA",
                    "DEMANDAS_REGRA_ROTINA_EXCLUIDA",
                    "DEMANDAS_REGRAS_LOTE",
                    "DEMANDAS_REGRAS_GERACAO_EXECUTADAS",
                    "DEMANDAS_REGRAS_GERACAO_SIMULADAS",
                ],
            },
        },
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
        take: Math.max(1, Math.min(100, limit)),
    });

    return rows.map((item) => ({
        id: item.id,
        acao: item.acao,
        entidadeId: item.entidadeId,
        createdAt: item.createdAt,
        user: {
            name: item.user.name,
            email: item.user.email,
        },
        dadosAntes: item.dadosAntes as PrismaJsonLike,
        dadosDepois: item.dadosDepois as PrismaJsonLike,
    }));
}

export async function getDemandasPlanosIaRecentes(limit = 20): Promise<DemandaIaPlano[]> {
    const planos = await getDemandasIaPlanosConfig();
    return planos.slice(0, Math.max(1, Math.min(100, limit)));
}

export async function getDemandasIaIndicadores(periodoDias = 30): Promise<DemandasIaIndicadores> {
    const dias = Math.max(7, Math.min(120, periodoDias));
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    inicio.setDate(inicio.getDate() - dias + 1);

    const planos = await getDemandasIaPlanosConfig();
    const recorte = planos
        .filter((item) => {
            const date = new Date(item.solicitadoEm);
            return Number.isFinite(date.getTime()) && date >= inicio;
        })
        .sort(
            (a, b) =>
                new Date(b.solicitadoEm).getTime() - new Date(a.solicitadoEm).getTime()
        );

    const totalPlanos = recorte.length;
    const pendentes = recorte.filter((item) => item.status === "PENDENTE").length;
    const aplicados = recorte.filter((item) => item.status === "APLICADO").length;
    const descartados = recorte.filter((item) => item.status === "DESCARTADO").length;
    const planosAnalise = recorte.filter((item) => item.tipo === "ANALISE").length;
    const planosRedistribuicao = recorte.filter((item) => item.tipo === "REDISTRIBUICAO").length;
    const aplicadosAnalise = recorte.filter(
        (item) => item.tipo === "ANALISE" && item.status === "APLICADO"
    ).length;
    const aplicadosRedistribuicao = recorte.filter(
        (item) => item.tipo === "REDISTRIBUICAO" && item.status === "APLICADO"
    ).length;

    const taxaAplicacao = totalPlanos > 0 ? (aplicados / totalPlanos) * 100 : 0;
    const taxaDescarte = totalPlanos > 0 ? (descartados / totalPlanos) * 100 : 0;
    const economiaHorasEstimada = Number(
        (aplicadosAnalise * 0.9 + aplicadosRedistribuicao * 0.6).toFixed(1)
    );

    return {
        periodoDias: dias,
        totalPlanos,
        pendentes,
        aplicados,
        descartados,
        taxaAplicacao: Number(taxaAplicacao.toFixed(1)),
        taxaDescarte: Number(taxaDescarte.toFixed(1)),
        planosAnalise,
        planosRedistribuicao,
        aplicadosAnalise,
        aplicadosRedistribuicao,
        economiaHorasEstimada,
        ultimoPlanoEm: recorte[0]?.solicitadoEm || null,
    };
}

export async function getDemandasRotinasRecorrentes(): Promise<DemandaRotinaRecorrente[]> {
    return getDemandasRotinasConfig();
}

export async function getDemandasRotinasTemplates(): Promise<DemandaRotinaTemplate[]> {
    return getDemandasRotinasTemplatesConfig();
}

export async function getDemandasRotinasRegras(): Promise<DemandaRotinaRegra[]> {
    return getDemandasRotinasRegrasConfig();
}

export async function getDemandasPlanejamentoAgendadoConfig(): Promise<DemandaPlanejamentoAgendadoConfig> {
    return getDemandasPlanejamentoAgendadoConfigSetting();
}

function toRecord(value: PrismaJsonLike): Record<string, PrismaJsonLike> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, PrismaJsonLike>)
        : null;
}

function toNumber(value: PrismaJsonLike) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    return 0;
}

function toString(value: PrismaJsonLike) {
    return typeof value === "string" ? value : "";
}

export async function getDemandasEfetividadeRegrasPeriodo(
    periodoDias: number
): Promise<DemandaEfetividadeRegraPeriodoItem[]> {
    const dias = Math.max(7, Math.min(120, periodoDias));
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    inicio.setDate(inicio.getDate() - dias + 1);

    const rows = await db.logAuditoria.findMany({
        where: {
            entidade: "DEMANDAS",
            acao: {
                in: ["DEMANDAS_REGRAS_GERACAO_EXECUTADAS", "DEMANDAS_REGRAS_GERACAO_SIMULADAS"],
            },
            createdAt: { gte: inicio },
        },
        select: {
            acao: true,
            dadosDepois: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5000,
    });

    const map = new Map<string, DemandaEfetividadeRegraPeriodoItem>();

    for (const row of rows) {
        const dadosDepois = row.dadosDepois as PrismaJsonLike;
        const dadosRecord = toRecord(dadosDepois);
        if (!dadosRecord) continue;
        const porRegra = dadosRecord.porRegra;
        if (!Array.isArray(porRegra)) continue;

        for (const item of porRegra) {
            const regraRecord = toRecord(item as PrismaJsonLike);
            if (!regraRecord) continue;

            const regraId = toString(regraRecord.regraId);
            if (!regraId) continue;

            const current = map.get(regraId) || {
                regraId,
                regraNome: toString(regraRecord.regraNome) || "Regra",
                templateId: toString(regraRecord.templateId),
                templateNome: toString(regraRecord.templateNome) || null,
                execucoes: 0,
                simulacoes: 0,
                criadas: 0,
                atualizadas: 0,
                ignoradas: 0,
                taxaCriacao: 0,
                taxaIgnorada: 0,
            };

            if (row.acao === "DEMANDAS_REGRAS_GERACAO_SIMULADAS") {
                current.simulacoes += 1;
            } else {
                current.execucoes += 1;
            }

            current.criadas += toNumber(regraRecord.criadas);
            current.atualizadas += toNumber(regraRecord.atualizadas);
            current.ignoradas += toNumber(regraRecord.ignoradas);
            map.set(regraId, current);
        }
    }

    return Array.from(map.values())
        .map((item) => {
            const totalOperacoes = item.criadas + item.atualizadas + item.ignoradas;
            const taxaCriacao = totalOperacoes > 0 ? (item.criadas / totalOperacoes) * 100 : 0;
            const taxaIgnorada = totalOperacoes > 0 ? (item.ignoradas / totalOperacoes) * 100 : 0;
            return {
                ...item,
                taxaCriacao: Number(taxaCriacao.toFixed(1)),
                taxaIgnorada: Number(taxaIgnorada.toFixed(1)),
            };
        })
        .sort((a, b) => {
            const totalA = a.criadas + a.atualizadas + a.ignoradas;
            const totalB = b.criadas + b.atualizadas + b.ignoradas;
            if (totalB !== totalA) return totalB - totalA;
            return a.regraNome.localeCompare(b.regraNome);
        });
}
