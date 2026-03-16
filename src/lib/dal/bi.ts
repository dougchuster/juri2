import "server-only";
import { db } from "@/lib/db";
import type { BIDimensionType, BIMetricKey } from "@/lib/services/bi-core";
import { formatBIMetricLabel, normalizeSnapshotDate } from "@/lib/services/bi-core";

type GlobalMetric = {
    metricKey: BIMetricKey;
    label: string;
    value: number;
    previousValue: number | null;
    deltaValue: number | null;
    deltaPercent: number | null;
    meta: unknown;
};

type RankingItem = {
    label: string;
    value: number;
};

type HistoricalSeriesPoint = {
    date: Date;
    value: number;
};

type HistoricalSeries = {
    metricKey: BIMetricKey;
    label: string;
    points: HistoricalSeriesPoint[];
};

type AgingBucket = {
    label: string;
    count: number;
};

type JurimetrySummary = {
    label: string;
    totalClosed: number;
    activeCount: number;
    successRate: number;
    averageClosureDays: number;
    contingencyTotal: number;
    stagnatedCount: number;
    stagnatedRate: number;
};

type PhaseDistributionItem = {
    label: string;
    activeCount: number;
    averageAgeDays: number;
    stagnatedCount: number;
    stagnatedRate: number;
};

type JurimetryAlert = {
    severity: "ALTA" | "MEDIA";
    title: string;
    description: string;
    dimensionLabel: string;
};

type ProcessAnalyticsRow = {
    tipo: string;
    status: string;
    resultado: string | null;
    updatedAt: Date;
    valorContingencia: { toNumber(): number } | number | null;
    dataDistribuicao: Date | null;
    dataEncerramento: Date | null;
    tribunal: string | null;
    faseProcessual: { nome: string } | null;
};

type JurimetryAccumulator = {
    totalClosed: number;
    wonOrSettled: number;
    closureDaysTotal: number;
    closureDaysCount: number;
    activeCount: number;
    contingencyTotal: number;
    stagnatedCount: number;
};

type PhaseAccumulator = {
    activeCount: number;
    ageDaysTotal: number;
    ageDaysCount: number;
    stagnatedCount: number;
};

export type BIDashboardFilters = {
    snapshotDate?: Date | null;
    rangeFrom?: Date | null;
    rangeTo?: Date | null;
    lawyerQuery?: string;
    clientQuery?: string;
    tribunalQuery?: string;
    topN?: number;
};

const GLOBAL_METRIC_KEYS: BIMetricKey[] = [
    "PROCESSOS_ATIVOS",
    "PROCESSOS_ESTAGNADOS_120D",
    "TAXA_EXITO_PERCENT",
    "TEMPO_MEDIO_ENCERRAMENTO_DIAS",
    "CONTINGENCIA_TOTAL",
    "CLIENTES_INADIMPLENTES",
    "RECEBIDO_TOTAL",
    "A_RECEBER_TOTAL",
    "TAREFAS_CONCLUIDAS_30D",
    "HORAS_TRABALHADAS_30D",
];

const HISTORICAL_METRIC_KEYS: BIMetricKey[] = [
    "PROCESSOS_ATIVOS",
    "TAXA_EXITO_PERCENT",
    "CONTINGENCIA_TOTAL",
    "RECEBIDO_TOTAL",
    "A_RECEBER_TOTAL",
];

function decimalToNumber(value: { toNumber(): number } | number | null | undefined) {
    if (typeof value === "number") return value;
    return value?.toNumber() || 0;
}

function normalizeQuery(value?: string) {
    return (value || "").trim().toLowerCase();
}

function matchesQuery(label: string, query?: string) {
    const normalized = normalizeQuery(query);
    if (!normalized) return true;
    return label.toLowerCase().includes(normalized);
}

function clampTopN(value?: number) {
    if (!value || Number.isNaN(value)) return 8;
    return Math.min(Math.max(Math.round(value), 3), 20);
}

function buildDelta(value: number, previousValue: number | null) {
    if (previousValue === null) {
        return {
            previousValue,
            deltaValue: null,
            deltaPercent: null,
        };
    }

    const deltaValue = value - previousValue;
    const deltaPercent = previousValue === 0 ? null : (deltaValue / previousValue) * 100;

    return {
        previousValue,
        deltaValue,
        deltaPercent,
    };
}

function csvEscape(value: string | number | null | undefined) {
    const text = value === null || value === undefined ? "" : String(value);
    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function csvLine(...values: Array<string | number | null | undefined>) {
    return values.map(csvEscape).join(",");
}

function isClosedProcess(status: string) {
    return ["ENCERRADO", "ARQUIVADO"].includes(status);
}

function isSuccessfulResult(resultado?: string | null) {
    return ["GANHO", "ACORDO"].includes(resultado || "");
}

function getClosureDays(process: Pick<ProcessAnalyticsRow, "dataDistribuicao" | "dataEncerramento">) {
    if (!process.dataDistribuicao || !process.dataEncerramento) return null;
    return Math.max(
        Math.round(
            (new Date(process.dataEncerramento).getTime() - new Date(process.dataDistribuicao).getTime()) /
                (1000 * 60 * 60 * 24)
        ),
        0
    );
}

function getProcessAgeDays(process: Pick<ProcessAnalyticsRow, "dataDistribuicao" | "updatedAt">, referenceDate: Date) {
    const baseDate = process.dataDistribuicao || process.updatedAt;
    return Math.max(
        Math.floor((referenceDate.getTime() - new Date(baseDate).getTime()) / (1000 * 60 * 60 * 24)),
        0
    );
}

function sortJurimetryRows(items: JurimetrySummary[]) {
    return items.sort((a, b) => {
        if (b.totalClosed !== a.totalClosed) return b.totalClosed - a.totalClosed;
        if (b.activeCount !== a.activeCount) return b.activeCount - a.activeCount;
        return a.label.localeCompare(b.label, "pt-BR");
    });
}

function buildJurimetrySummaries(
    processes: ProcessAnalyticsRow[],
    getLabel: (process: ProcessAnalyticsRow) => string,
    referenceDate: Date
) {
    const stagnationCutoff = new Date(referenceDate);
    stagnationCutoff.setDate(stagnationCutoff.getDate() - 120);

    const grouped = new Map<string, JurimetryAccumulator>();

    for (const process of processes) {
        const label = getLabel(process) || "Nao informado";
        const bucket = grouped.get(label) || {
            totalClosed: 0,
            wonOrSettled: 0,
            closureDaysTotal: 0,
            closureDaysCount: 0,
            activeCount: 0,
            contingencyTotal: 0,
            stagnatedCount: 0,
        };

        if (isClosedProcess(process.status)) {
            bucket.totalClosed += 1;
            if (isSuccessfulResult(process.resultado)) bucket.wonOrSettled += 1;
            const closureDays = getClosureDays(process);
            if (closureDays !== null) {
                bucket.closureDaysTotal += closureDays;
                bucket.closureDaysCount += 1;
            }
        } else {
            bucket.activeCount += 1;
            bucket.contingencyTotal += decimalToNumber(process.valorContingencia);
            if (process.updatedAt < stagnationCutoff) bucket.stagnatedCount += 1;
        }

        grouped.set(label, bucket);
    }

    return [...grouped.entries()].map(([label, bucket]) => ({
        label,
        totalClosed: bucket.totalClosed,
        activeCount: bucket.activeCount,
        successRate: bucket.totalClosed > 0 ? (bucket.wonOrSettled / bucket.totalClosed) * 100 : 0,
        averageClosureDays: bucket.closureDaysCount > 0 ? bucket.closureDaysTotal / bucket.closureDaysCount : 0,
        contingencyTotal: bucket.contingencyTotal,
        stagnatedCount: bucket.stagnatedCount,
        stagnatedRate: bucket.activeCount > 0 ? (bucket.stagnatedCount / bucket.activeCount) * 100 : 0,
    }));
}

function buildPhaseDistribution(processes: ProcessAnalyticsRow[], referenceDate: Date) {
    const stagnationCutoff = new Date(referenceDate);
    stagnationCutoff.setDate(stagnationCutoff.getDate() - 120);

    const grouped = new Map<string, PhaseAccumulator>();

    for (const process of processes) {
        if (isClosedProcess(process.status)) continue;

        const label = process.faseProcessual?.nome || "Sem fase definida";
        const bucket = grouped.get(label) || {
            activeCount: 0,
            ageDaysTotal: 0,
            ageDaysCount: 0,
            stagnatedCount: 0,
        };

        bucket.activeCount += 1;
        bucket.ageDaysTotal += getProcessAgeDays(process, referenceDate);
        bucket.ageDaysCount += 1;
        if (process.updatedAt < stagnationCutoff) bucket.stagnatedCount += 1;

        grouped.set(label, bucket);
    }

    return [...grouped.entries()]
        .map(([label, bucket]) => ({
            label,
            activeCount: bucket.activeCount,
            averageAgeDays: bucket.ageDaysCount > 0 ? bucket.ageDaysTotal / bucket.ageDaysCount : 0,
            stagnatedCount: bucket.stagnatedCount,
            stagnatedRate: bucket.activeCount > 0 ? (bucket.stagnatedCount / bucket.activeCount) * 100 : 0,
        }))
        .sort((a, b) => {
            if (b.activeCount !== a.activeCount) return b.activeCount - a.activeCount;
            return a.label.localeCompare(b.label, "pt-BR");
        });
}

function buildJurimetryAlerts(input: {
    globalSuccessRate: number;
    globalAverageClosureDays: number;
    tribunals: JurimetrySummary[];
    processTypes: JurimetrySummary[];
    phases: PhaseDistributionItem[];
}) {
    const alerts: JurimetryAlert[] = [];

    for (const tribunal of input.tribunals) {
        if (tribunal.totalClosed >= 3 && tribunal.successRate <= input.globalSuccessRate - 20) {
            alerts.push({
                severity: tribunal.successRate <= input.globalSuccessRate - 30 ? "ALTA" : "MEDIA",
                title: "Queda de exito em tribunal",
                dimensionLabel: tribunal.label,
                description: `Taxa de exito em ${tribunal.label} abaixo da media global (${tribunal.successRate.toFixed(1)}% vs ${input.globalSuccessRate.toFixed(1)}%).`,
            });
        }

        if (
            tribunal.totalClosed >= 3 &&
            input.globalAverageClosureDays > 0 &&
            tribunal.averageClosureDays >= input.globalAverageClosureDays * 1.5
        ) {
            alerts.push({
                severity: tribunal.averageClosureDays >= input.globalAverageClosureDays * 2 ? "ALTA" : "MEDIA",
                title: "Tribunal com tempo elevado",
                dimensionLabel: tribunal.label,
                description: `Tempo medio de encerramento acima do baseline global (${tribunal.averageClosureDays.toFixed(0)}d vs ${input.globalAverageClosureDays.toFixed(0)}d).`,
            });
        }
    }

    for (const processType of input.processTypes) {
        if (processType.activeCount >= 3 && processType.stagnatedRate >= 40) {
            alerts.push({
                severity: processType.stagnatedRate >= 60 ? "ALTA" : "MEDIA",
                title: "Tipo de processo com estagnacao",
                dimensionLabel: processType.label,
                description: `${processType.stagnatedCount} processos ativos sem atualizacao recente em ${processType.label}.`,
            });
        }
    }

    for (const phase of input.phases) {
        if (phase.activeCount >= 3 && phase.stagnatedRate >= 45) {
            alerts.push({
                severity: phase.stagnatedRate >= 65 ? "ALTA" : "MEDIA",
                title: "Fase processual com fila parada",
                dimensionLabel: phase.label,
                description: `${phase.stagnatedRate.toFixed(1)}% dos processos dessa fase estao estagnados ha mais de 120 dias.`,
            });
        }
    }

    return alerts
        .sort((a, b) => {
            if (a.severity !== b.severity) return a.severity === "ALTA" ? -1 : 1;
            return a.dimensionLabel.localeCompare(b.dimensionLabel, "pt-BR");
        })
        .slice(0, 8);
}

export async function getLatestBISnapshotDate() {
    const latest = await db.bIIndicadorSnapshot.findFirst({
        orderBy: { snapshotDate: "desc" },
        select: { snapshotDate: true },
    });

    return latest?.snapshotDate || null;
}

export async function listBIAvailableSnapshots(limit = 30) {
    const snapshots = await db.bIIndicadorSnapshot.findMany({
        distinct: ["snapshotDate"],
        orderBy: { snapshotDate: "desc" },
        select: { snapshotDate: true },
        take: limit,
    });

    return snapshots.map((item) => item.snapshotDate);
}

export async function getLatestBIRefreshRun() {
    return db.bIRefreshRun.findFirst({
        orderBy: { startedAt: "desc" },
    });
}

async function getPreviousSnapshotDate(snapshotDate: Date) {
    const previous = await db.bIIndicadorSnapshot.findFirst({
        where: {
            snapshotDate: {
                lt: snapshotDate,
            },
        },
        orderBy: { snapshotDate: "desc" },
        select: { snapshotDate: true },
    });

    return previous?.snapshotDate || null;
}

async function getHistoricalSeries(snapshotDate: Date, rangeFrom?: Date | null, rangeTo?: Date | null) {
    const resolvedTo = rangeTo ? normalizeSnapshotDate(rangeTo) : snapshotDate;
    const resolvedFrom = rangeFrom
        ? normalizeSnapshotDate(rangeFrom)
        : new Date(resolvedTo.getTime() - 29 * 24 * 60 * 60 * 1000);

    const rows = await db.bIIndicadorSnapshot.findMany({
        where: {
            dimensionType: "GLOBAL",
            metricKey: { in: HISTORICAL_METRIC_KEYS },
            snapshotDate: {
                gte: resolvedFrom,
                lte: resolvedTo,
            },
        },
        orderBy: [{ snapshotDate: "asc" }, { metricKey: "asc" }],
        select: {
            metricKey: true,
            snapshotDate: true,
            metricValue: true,
        },
    });

    const grouped = new Map<BIMetricKey, HistoricalSeriesPoint[]>();
    for (const metricKey of HISTORICAL_METRIC_KEYS) {
        grouped.set(metricKey, []);
    }

    for (const row of rows) {
        grouped.get(row.metricKey as BIMetricKey)?.push({
            date: row.snapshotDate,
            value: decimalToNumber(row.metricValue),
        });
    }

    return {
        rangeFrom: resolvedFrom,
        rangeTo: resolvedTo,
        series: HISTORICAL_METRIC_KEYS.map((metricKey) => ({
            metricKey,
            label: formatBIMetricLabel(metricKey),
            points: grouped.get(metricKey) || [],
        })),
    };
}

async function getAgingBuckets(referenceDate: Date): Promise<AgingBucket[]> {
    const activeProcesses = await db.processo.findMany({
        where: {
            status: { notIn: ["ENCERRADO", "ARQUIVADO"] },
        },
        select: {
            dataDistribuicao: true,
            updatedAt: true,
        },
    });

    const buckets: AgingBucket[] = [
        { label: "0-30 dias", count: 0 },
        { label: "31-90 dias", count: 0 },
        { label: "91-180 dias", count: 0 },
        { label: "181+ dias", count: 0 },
    ];

    for (const process of activeProcesses) {
        const ageDays = getProcessAgeDays(process, referenceDate);

        if (ageDays <= 30) buckets[0].count += 1;
        else if (ageDays <= 90) buckets[1].count += 1;
        else if (ageDays <= 180) buckets[2].count += 1;
        else buckets[3].count += 1;
    }

    return buckets;
}

async function getExpandedJurimetry(referenceDate: Date, tribunalQuery: string, topN: number) {
    const processes = await db.processo.findMany({
        select: {
            tipo: true,
            status: true,
            resultado: true,
            updatedAt: true,
            valorContingencia: true,
            dataDistribuicao: true,
            dataEncerramento: true,
            tribunal: true,
            faseProcessual: {
                select: {
                    nome: true,
                },
            },
        },
    });

    const filteredProcesses = tribunalQuery
        ? processes.filter((process) => matchesQuery(process.tribunal || "Nao informado", tribunalQuery))
        : processes;

    const closedProcesses = filteredProcesses.filter((process) => isClosedProcess(process.status));
    const successfulClosedCount = closedProcesses.filter((process) => isSuccessfulResult(process.resultado)).length;
    const globalSuccessRate =
        closedProcesses.length > 0 ? (successfulClosedCount / closedProcesses.length) * 100 : 0;

    const globalClosureDays = closedProcesses
        .map((process) => getClosureDays(process))
        .filter((value): value is number => value !== null);
    const globalAverageClosureDays =
        globalClosureDays.length > 0
            ? globalClosureDays.reduce((sum, value) => sum + value, 0) / globalClosureDays.length
            : 0;

    const byTribunal = sortJurimetryRows(
        buildJurimetrySummaries(filteredProcesses, (process) => process.tribunal || "Nao informado", referenceDate)
    ).slice(0, topN);

    const processTypeBenchmarks = sortJurimetryRows(
        buildJurimetrySummaries(filteredProcesses, (process) => process.tipo || "Nao informado", referenceDate)
    ).slice(0, topN);

    const phaseDistribution = buildPhaseDistribution(filteredProcesses, referenceDate).slice(0, topN);

    const alerts = buildJurimetryAlerts({
        globalSuccessRate,
        globalAverageClosureDays,
        tribunals: byTribunal,
        processTypes: processTypeBenchmarks,
        phases: phaseDistribution,
    });

    return {
        byTribunal,
        processTypeBenchmarks,
        phaseDistribution,
        alerts,
    };
}

export async function getBIDashboardData(filters: BIDashboardFilters = {}) {
    const availableSnapshots = await listBIAvailableSnapshots();
    const snapshotDate = filters.snapshotDate
        ? normalizeSnapshotDate(filters.snapshotDate)
        : (availableSnapshots[0] || null);

    const topN = clampTopN(filters.topN);
    const lawyerQuery = normalizeQuery(filters.lawyerQuery);
    const clientQuery = normalizeQuery(filters.clientQuery);
    const tribunalQuery = normalizeQuery(filters.tribunalQuery);

    if (!snapshotDate) {
        return {
            snapshotDate: null,
            previousSnapshotDate: null,
            availableSnapshots,
            rangeFrom: null,
            rangeTo: null,
            globalMetrics: [] as GlobalMetric[],
            historicalSeries: [] as HistoricalSeries[],
            agingBuckets: [] as AgingBucket[],
            byLawyerTasks: [] as RankingItem[],
            byLawyerHours: [] as RankingItem[],
            byProcessTypeSuccess: [] as RankingItem[],
            byProcessTypeClosureDays: [] as RankingItem[],
            byRiskContingency: [] as RankingItem[],
            byClientReceivable: [] as RankingItem[],
            byClientReceived: [] as RankingItem[],
            byTribunal: [] as JurimetrySummary[],
            processTypeBenchmarks: [] as JurimetrySummary[],
            phaseDistribution: [] as PhaseDistributionItem[],
            alerts: [] as JurimetryAlert[],
        };
    }

    const previousSnapshotDate = await getPreviousSnapshotDate(snapshotDate);

    const [currentSnapshots, previousSnapshots, historical, agingBuckets, expandedJurimetry] = await Promise.all([
        db.bIIndicadorSnapshot.findMany({
            where: { snapshotDate },
            orderBy: [{ metricKey: "asc" }, { metricValue: "desc" }],
        }),
        previousSnapshotDate
            ? db.bIIndicadorSnapshot.findMany({
                  where: {
                      snapshotDate: previousSnapshotDate,
                      dimensionType: "GLOBAL",
                  },
                  select: {
                      metricKey: true,
                      metricValue: true,
                  },
              })
            : Promise.resolve([]),
        getHistoricalSeries(snapshotDate, filters.rangeFrom, filters.rangeTo),
        getAgingBuckets(snapshotDate),
        getExpandedJurimetry(snapshotDate, tribunalQuery, topN),
    ]);

    const previousGlobalMetricMap = new Map<BIMetricKey, number>();
    for (const item of previousSnapshots) {
        previousGlobalMetricMap.set(item.metricKey as BIMetricKey, decimalToNumber(item.metricValue));
    }

    const filterMetric = (metricKey: BIMetricKey, dimensionType: BIDimensionType) =>
        currentSnapshots.filter((item) => item.metricKey === metricKey && item.dimensionType === dimensionType);

    const globalMetrics: GlobalMetric[] = GLOBAL_METRIC_KEYS.flatMap((metricKey) => {
        const item = currentSnapshots.find(
            (snapshot) => snapshot.metricKey === metricKey && snapshot.dimensionType === "GLOBAL"
        );

        if (!item) return [];

        const value = decimalToNumber(item.metricValue);
        const previousValue = previousGlobalMetricMap.has(metricKey)
            ? previousGlobalMetricMap.get(metricKey) || 0
            : null;

        return [
            {
                metricKey,
                label: formatBIMetricLabel(metricKey),
                value,
                ...buildDelta(value, previousValue),
                meta: item.meta,
            },
        ];
    });

    const byLawyerTasks = filterMetric("TAREFAS_CONCLUIDAS_30D", "ADVOGADO")
        .map((item) => ({
            label: item.dimensionValue,
            value: decimalToNumber(item.metricValue),
        }))
        .filter((item) => matchesQuery(item.label, lawyerQuery))
        .sort((a, b) => b.value - a.value)
        .slice(0, topN);

    const byLawyerHours = filterMetric("HORAS_TRABALHADAS_30D", "ADVOGADO")
        .map((item) => ({
            label: item.dimensionValue,
            value: decimalToNumber(item.metricValue),
        }))
        .filter((item) => matchesQuery(item.label, lawyerQuery))
        .sort((a, b) => b.value - a.value)
        .slice(0, topN);

    const byProcessTypeSuccess = filterMetric("TAXA_EXITO_PERCENT", "TIPO_PROCESSO")
        .map((item) => ({
            label: item.dimensionValue,
            value: decimalToNumber(item.metricValue),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, topN);

    const byProcessTypeClosureDays = filterMetric("TEMPO_MEDIO_ENCERRAMENTO_DIAS", "TIPO_PROCESSO")
        .map((item) => ({
            label: item.dimensionValue,
            value: decimalToNumber(item.metricValue),
        }))
        .sort((a, b) => a.value - b.value)
        .slice(0, topN);

    const byRiskContingency = filterMetric("CONTINGENCIA_TOTAL", "RISCO_CONTINGENCIA")
        .map((item) => ({
            label: item.dimensionValue,
            value: decimalToNumber(item.metricValue),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, topN);

    const byClientReceivable = filterMetric("A_RECEBER_TOTAL", "CLIENTE")
        .map((item) => ({
            label: item.dimensionValue,
            value: decimalToNumber(item.metricValue),
        }))
        .filter((item) => matchesQuery(item.label, clientQuery))
        .sort((a, b) => b.value - a.value)
        .slice(0, topN);

    const byClientReceived = filterMetric("RECEBIDO_TOTAL", "CLIENTE")
        .map((item) => ({
            label: item.dimensionValue,
            value: decimalToNumber(item.metricValue),
        }))
        .filter((item) => matchesQuery(item.label, clientQuery))
        .sort((a, b) => b.value - a.value)
        .slice(0, topN);

    return {
        snapshotDate,
        previousSnapshotDate,
        availableSnapshots,
        rangeFrom: historical.rangeFrom,
        rangeTo: historical.rangeTo,
        globalMetrics,
        historicalSeries: historical.series,
        agingBuckets,
        byLawyerTasks,
        byLawyerHours,
        byProcessTypeSuccess,
        byProcessTypeClosureDays,
        byRiskContingency,
        byClientReceivable,
        byClientReceived,
        byTribunal: expandedJurimetry.byTribunal,
        processTypeBenchmarks: expandedJurimetry.processTypeBenchmarks,
        phaseDistribution: expandedJurimetry.phaseDistribution,
        alerts: expandedJurimetry.alerts,
    };
}

export async function buildBIDashboardCsv(filters: BIDashboardFilters = {}) {
    const dashboard = await getBIDashboardData(filters);

    const rows: string[] = [];
    rows.push(csvLine("Painel BI Interno"));
    rows.push(csvLine("Snapshot", dashboard.snapshotDate?.toISOString() || "sem snapshot"));
    rows.push(csvLine("Periodo historico", dashboard.rangeFrom?.toISOString() || "", dashboard.rangeTo?.toISOString() || ""));
    rows.push("");

    rows.push(csvLine("Metricas globais"));
    rows.push(csvLine("Metrica", "Valor atual", "Valor anterior", "Delta", "Delta %"));
    dashboard.globalMetrics.forEach((item) => {
        rows.push(
            csvLine(
                item.label,
                item.value.toFixed(2),
                item.previousValue?.toFixed(2) || "",
                item.deltaValue?.toFixed(2) || "",
                item.deltaPercent?.toFixed(2) || ""
            )
        );
    });
    rows.push("");

    rows.push(csvLine("Serie historica"));
    rows.push(csvLine("Data", "Metrica", "Valor"));
    dashboard.historicalSeries.forEach((series) => {
        series.points.forEach((point) => {
            rows.push(csvLine(point.date.toISOString().slice(0, 10), series.label, point.value.toFixed(2)));
        });
    });
    rows.push("");

    rows.push(csvLine("Aging da carteira"));
    rows.push(csvLine("Faixa", "Quantidade"));
    dashboard.agingBuckets.forEach((bucket) => {
        rows.push(csvLine(bucket.label, bucket.count));
    });
    rows.push("");

    rows.push(csvLine("Produtividade por advogado"));
    rows.push(csvLine("Advogado", "Tarefas 30d", "Horas 30d"));
    dashboard.byLawyerTasks.forEach((item) => {
        const hours = dashboard.byLawyerHours.find((hourItem) => hourItem.label === item.label)?.value || 0;
        rows.push(csvLine(item.label, item.value, hours.toFixed(2)));
    });
    rows.push("");

    rows.push(csvLine("Jurimetria por tipo de processo"));
    rows.push(csvLine("Tipo", "Encerrados", "Ativos", "Taxa de exito %", "Tempo medio", "Estagnados", "Contingencia"));
    dashboard.processTypeBenchmarks.forEach((item) => {
        rows.push(
            csvLine(
                item.label,
                item.totalClosed,
                item.activeCount,
                item.successRate.toFixed(2),
                item.averageClosureDays.toFixed(2),
                item.stagnatedCount,
                item.contingencyTotal.toFixed(2)
            )
        );
    });
    rows.push("");

    rows.push(csvLine("Jurimetria por tribunal"));
    rows.push(csvLine("Tribunal", "Encerrados", "Ativos", "Taxa de exito %", "Tempo medio", "Estagnados", "Contingencia"));
    dashboard.byTribunal.forEach((item) => {
        rows.push(
            csvLine(
                item.label,
                item.totalClosed,
                item.activeCount,
                item.successRate.toFixed(2),
                item.averageClosureDays.toFixed(2),
                item.stagnatedCount,
                item.contingencyTotal.toFixed(2)
            )
        );
    });
    rows.push("");

    rows.push(csvLine("Fases processuais ativas"));
    rows.push(csvLine("Fase", "Ativos", "Idade media", "Estagnados", "Estagnacao %"));
    dashboard.phaseDistribution.forEach((item) => {
        rows.push(
            csvLine(
                item.label,
                item.activeCount,
                item.averageAgeDays.toFixed(2),
                item.stagnatedCount,
                item.stagnatedRate.toFixed(2)
            )
        );
    });
    rows.push("");

    rows.push(csvLine("Alertas operacionais"));
    rows.push(csvLine("Severidade", "Titulo", "Dimensao", "Descricao"));
    dashboard.alerts.forEach((item) => {
        rows.push(csvLine(item.severity, item.title, item.dimensionLabel, item.description));
    });
    rows.push("");

    rows.push(csvLine("Contingencia por risco"));
    rows.push(csvLine("Risco", "Contingencia"));
    dashboard.byRiskContingency.forEach((item) => {
        rows.push(csvLine(item.label, item.value.toFixed(2)));
    });
    rows.push("");

    rows.push(csvLine("Clientes - recebido e a receber"));
    rows.push(csvLine("Cliente", "Recebido", "A receber"));
    const clientLabels = new Set([
        ...dashboard.byClientReceived.map((item) => item.label),
        ...dashboard.byClientReceivable.map((item) => item.label),
    ]);
    [...clientLabels].forEach((label) => {
        const received = dashboard.byClientReceived.find((item) => item.label === label)?.value || 0;
        const receivable = dashboard.byClientReceivable.find((item) => item.label === label)?.value || 0;
        rows.push(csvLine(label, received.toFixed(2), receivable.toFixed(2)));
    });

    return rows.join("\n");
}
