export const DEMANDAS_PERIODICIDADES = ["DIARIA", "SEMANAL", "MENSAL"] as const;
export const DEMANDAS_PRIORIDADES_TAREFA = ["URGENTE", "ALTA", "NORMAL", "BAIXA"] as const;
export const DEMANDAS_PAPEL_RESPONSAVEL = [
    "AUTO",
    "ADMIN",
    "SOCIO",
    "ADVOGADO",
    "CONTROLADOR",
    "ASSISTENTE",
    "FINANCEIRO",
    "SECRETARIA",
] as const;
export const DEMANDAS_IA_PLANO_TIPOS = ["ANALISE", "REDISTRIBUICAO"] as const;
export const DEMANDAS_IA_PLANO_STATUS = ["PENDENTE", "APLICADO", "DESCARTADO"] as const;

export type DemandaPeriodicidade = (typeof DEMANDAS_PERIODICIDADES)[number];
export type DemandaPrioridadeTarefa = (typeof DEMANDAS_PRIORIDADES_TAREFA)[number];
export type DemandaPapelResponsavel = (typeof DEMANDAS_PAPEL_RESPONSAVEL)[number];
export type DemandaIaPlanoTipo = (typeof DEMANDAS_IA_PLANO_TIPOS)[number];
export type DemandaIaPlanoStatus = (typeof DEMANDAS_IA_PLANO_STATUS)[number];

export interface DemandaRotinaRecorrente {
    id: string;
    nome: string;
    descricao: string;
    area: string;
    papelResponsavel: DemandaPapelResponsavel;
    advogadoId: string | null;
    periodicidade: DemandaPeriodicidade;
    diaSemana: number | null;
    diaMes: number | null;
    prioridade: DemandaPrioridadeTarefa;
    slaDias: number;
    checklist: string[];
    ativo: boolean;
    ultimaGeracaoEm: string | null;
    proximaExecucaoEm: string;
    criadoPorId: string | null;
    templateId?: string | null;
    regraId?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface DemandaRotinaTemplate {
    id: string;
    nome: string;
    descricao: string;
    area: string;
    papelResponsavel: DemandaPapelResponsavel;
    periodicidade: DemandaPeriodicidade;
    diaSemana: number | null;
    diaMes: number | null;
    prioridade: DemandaPrioridadeTarefa;
    slaDias: number;
    checklist: string[];
    createdAt: string;
    updatedAt: string;
}

export interface DemandaRotinaRegra {
    id: string;
    nome: string;
    templateId: string;
    ativo: boolean;
    papelResponsavel: DemandaPapelResponsavel;
    timeId: string | null;
    areaOverride: string;
    periodicidadeOverride: DemandaPeriodicidade | "AUTO";
    prioridadeOverride: DemandaPrioridadeTarefa | "AUTO";
    slaDiasOverride: number | null;
    ultimaAplicacaoEm: string | null;
    ultimaSimulacaoEm: string | null;
    totalExecucoes: number;
    totalSimulacoes: number;
    totalCriadas: number;
    totalAtualizadas: number;
    totalIgnoradas: number;
    createdAt: string;
    updatedAt: string;
}

export interface DemandaIaPlano {
    id: string;
    tipo: DemandaIaPlanoTipo;
    status: DemandaIaPlanoStatus;
    pergunta: string;
    area: string;
    advogadoId: string | null;
    periodoDias: number;
    resumo: string;
    conteudo: string;
    sugestoes: string[];
    solicitadoPorId: string;
    solicitadoEm: string;
    aplicadoPorId: string | null;
    aplicadoEm: string | null;
    model: string | null;
    provider: string;
    metadados: Record<string, unknown>;
}

export interface DemandaPlanejamentoAgendadoEscopo {
    id: string;
    nome: string;
    ativo: boolean;
    area: string;
    timeId: string | null;
    hora: number;
    minuto: number;
    periodoDias: number;
    incluirRedistribuicao: boolean;
    maxResponsaveis: number;
    ultimaExecucaoEm: string | null;
    ultimaSimulacaoEm: string | null;
    ultimaFalhaEm: string | null;
    ultimaFalhaMensagem: string | null;
    totalExecucoes: number;
    totalFalhas: number;
    createdAt: string;
    updatedAt: string;
}

export interface DemandaPlanejamentoAgendadoConfig {
    enabled: boolean;
    escopos: DemandaPlanejamentoAgendadoEscopo[];
    updatedAt: string;
}

export function getDemandaPeriodicidadeLabel(periodicidade: DemandaPeriodicidade) {
    if (periodicidade === "DIARIA") return "Diaria";
    if (periodicidade === "SEMANAL") return "Semanal";
    return "Mensal";
}

export function getDemandaPlanoStatusLabel(status: DemandaIaPlanoStatus) {
    if (status === "PENDENTE") return "Pendente";
    if (status === "APLICADO") return "Aplicado";
    return "Descartado";
}
