export type BIMetricKey =
    | "PROCESSOS_ATIVOS"
    | "PROCESSOS_ESTAGNADOS_120D"
    | "TAXA_EXITO_PERCENT"
    | "TEMPO_MEDIO_ENCERRAMENTO_DIAS"
    | "CONTINGENCIA_TOTAL"
    | "CLIENTES_INADIMPLENTES"
    | "RECEBIDO_TOTAL"
    | "A_RECEBER_TOTAL"
    | "TAREFAS_CONCLUIDAS_30D"
    | "HORAS_TRABALHADAS_30D";

export type BIDimensionType =
    | "GLOBAL"
    | "ADVOGADO"
    | "TIPO_PROCESSO"
    | "RISCO_CONTINGENCIA"
    | "CLIENTE";

export const BI_METRIC_DEFINITIONS: Record<
    BIMetricKey,
    { name: string; description: string; formulaText: string }
> = {
    PROCESSOS_ATIVOS: {
        name: "Processos ativos",
        description: "Quantidade de processos nao encerrados nem arquivados.",
        formulaText: "COUNT(processos WHERE status NOT IN [ENCERRADO, ARQUIVADO])",
    },
    PROCESSOS_ESTAGNADOS_120D: {
        name: "Processos estagnados 120d",
        description: "Quantidade de processos ativos sem atualizacao recente.",
        formulaText: "COUNT(processos ativos WHERE updatedAt < hoje-120d)",
    },
    TAXA_EXITO_PERCENT: {
        name: "Taxa de exito",
        description: "Percentual de processos encerrados com resultado ganho ou acordo.",
        formulaText: "((GANHO + ACORDO) / encerrados) * 100",
    },
    TEMPO_MEDIO_ENCERRAMENTO_DIAS: {
        name: "Tempo medio ate encerramento",
        description: "Media de dias entre distribuicao e encerramento dos processos finalizados.",
        formulaText: "AVG(dataEncerramento - dataDistribuicao)",
    },
    CONTINGENCIA_TOTAL: {
        name: "Contingencia total",
        description: "Soma da contingencia de processos ativos com valor informado.",
        formulaText: "SUM(valorContingencia de processos ativos)",
    },
    CLIENTES_INADIMPLENTES: {
        name: "Clientes inadimplentes",
        description: "Quantidade de clientes marcados como inadimplentes.",
        formulaText: "COUNT(clientes WHERE inadimplente = true)",
    },
    RECEBIDO_TOTAL: {
        name: "Recebido total",
        description: "Somatorio do valor recebido pelo escritorio nos casos financeiros.",
        formulaText: "SUM(valorRecebidoEscritorio)",
    },
    A_RECEBER_TOTAL: {
        name: "A receber total",
        description: "Somatorio do valor ainda a receber pelo escritorio nos casos financeiros.",
        formulaText: "SUM(valorAReceberEscritorio)",
    },
    TAREFAS_CONCLUIDAS_30D: {
        name: "Tarefas concluidas 30d",
        description: "Quantidade de tarefas concluidas nos ultimos 30 dias.",
        formulaText: "COUNT(tarefas WHERE concluidaEm >= hoje-30d)",
    },
    HORAS_TRABALHADAS_30D: {
        name: "Horas trabalhadas 30d",
        description: "Somatorio de horas registradas nos ultimos 30 dias.",
        formulaText: "SUM(tarefa_registros_hora.horas WHERE data >= hoje-30d)",
    },
};

const BI_METRIC_LABELS: Record<BIMetricKey, string> = Object.fromEntries(
    Object.entries(BI_METRIC_DEFINITIONS).map(([key, value]) => [key, value.name])
) as Record<BIMetricKey, string>;

const BI_DIMENSION_LABELS: Record<BIDimensionType, string> = {
    GLOBAL: "Global",
    ADVOGADO: "Advogado",
    TIPO_PROCESSO: "Tipo de processo",
    RISCO_CONTINGENCIA: "Risco",
    CLIENTE: "Cliente",
};

export function formatBIMetricLabel(metricKey: BIMetricKey) {
    return BI_METRIC_LABELS[metricKey];
}

export function formatBIDimensionLabel(dimensionType: BIDimensionType) {
    return BI_DIMENSION_LABELS[dimensionType];
}

export function normalizeSnapshotDate(input = new Date()) {
    const date = new Date(input);
    date.setHours(0, 0, 0, 0);
    return date;
}
