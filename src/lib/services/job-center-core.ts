export type JobCenterSourceType = "AUTOMACAO_NACIONAL_JOB" | "FLOW_EXECUTION";
export type JobCenterStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type JobCenterFilters = {
    status?: JobCenterStatus;
    sourceType?: JobCenterSourceType;
    query?: string;
    periodDays?: 1 | 7 | 30 | 90;
};

export type JobCenterAutomacaoListEntry = {
    id: string;
    modo: string;
    status: string;
    erroResumo: string | null;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
    publicacoesCapturadas: number;
    publicacoesImportadas: number;
    prazosCriados: number;
    _count?: { logs: number };
    advogado?: {
        id: string;
        user?: { name: string | null } | null;
    } | null;
};

export type JobCenterFlowExecutionListEntry = {
    id: string;
    flowId: string;
    status: string;
    currentNodeId: string | null;
    errorMessage: string | null;
    startedAt: Date;
    completedAt: Date | null;
    createdAt?: Date;
    clienteId: string | null;
    processoId: string | null;
    flow?: {
        id: string;
        name?: string | null;
        nome?: string | null;
    } | null;
    log?: unknown;
};

export type JobCenterListItem = {
    id: string;
    sourceType: JobCenterSourceType;
    status: JobCenterStatus;
    title: string;
    subtitle?: string;
    ownerLabel?: string;
    errorSummary?: string | null;
    createdAt: Date;
    startedAt?: Date | null;
    finishedAt?: Date | null;
    href: string;
    stats?: Record<string, number>;
};

export type JobCenterSummary = {
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
};

export type JobCenterAttemptMetricInput = {
    sourceType: JobCenterSourceType;
    status: JobCenterStatus | string;
    triggerSource: string;
    createdAt: Date;
};

export type JobCenterOperationalSourceMetric = {
    sourceType: JobCenterSourceType;
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    actionable: number;
    manualRetryTotal: number;
    recoveredAfterRetryTotal: number;
    manualCancelTotal: number;
};

export type JobCenterOperationalMetrics = {
    actionableTotal: number;
    manualRetryTotal: number;
    recoveredAfterRetryTotal: number;
    manualCancelTotal: number;
    retrySuccessRate: number;
    failureRate: number;
    bySource: JobCenterOperationalSourceMetric[];
};

export function normalizeJobCenterStatus(rawStatus: string): JobCenterStatus {
    switch ((rawStatus || "").toUpperCase()) {
        case "QUEUED":
            return "QUEUED";
        case "RUNNING":
            return "RUNNING";
        case "SUCCESS":
        case "COMPLETED":
            return "COMPLETED";
        case "PARTIAL":
        case "FAILED":
            return "FAILED";
        case "CANCELED":
        case "CANCELLED":
            return "CANCELLED";
        default:
            return "FAILED";
    }
}

function getFlowName(flow: JobCenterFlowExecutionListEntry["flow"]) {
    return flow?.name || flow?.nome || "Flow sem nome";
}

export function normalizeAutomacaoJobItem(job: JobCenterAutomacaoListEntry): JobCenterListItem {
    return {
        id: job.id,
        sourceType: "AUTOMACAO_NACIONAL_JOB",
        status: normalizeJobCenterStatus(job.status),
        title: "Automacao nacional",
        subtitle: `Modo ${job.modo || "NACIONAL"}`,
        ownerLabel: job.advogado?.user?.name || undefined,
        errorSummary: job.erroResumo,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        href: `/admin/jobs/AUTOMACAO_NACIONAL_JOB/${job.id}`,
        stats: {
            logs: job._count?.logs || 0,
            publicacoesCapturadas: job.publicacoesCapturadas,
            publicacoesImportadas: job.publicacoesImportadas,
            prazosCriados: job.prazosCriados,
        },
    };
}

export function normalizeFlowExecutionItem(flowExecution: JobCenterFlowExecutionListEntry): JobCenterListItem {
    return {
        id: flowExecution.id,
        sourceType: "FLOW_EXECUTION",
        status: normalizeJobCenterStatus(flowExecution.status),
        title: getFlowName(flowExecution.flow),
        subtitle: flowExecution.currentNodeId
            ? `Node atual: ${flowExecution.currentNodeId}`
            : `Flow ${flowExecution.flowId}`,
        ownerLabel: undefined,
        errorSummary: flowExecution.errorMessage,
        createdAt: flowExecution.createdAt || flowExecution.startedAt,
        startedAt: flowExecution.startedAt,
        finishedAt: flowExecution.completedAt,
        href: `/admin/jobs/FLOW_EXECUTION/${flowExecution.id}`,
        stats: Array.isArray(flowExecution.log)
            ? { eventosLog: flowExecution.log.length }
            : undefined,
    };
}

function buildSearchText(item: JobCenterListItem) {
    return [
        item.id,
        item.title,
        item.subtitle || "",
        item.ownerLabel || "",
        item.errorSummary || "",
        item.sourceType,
        item.status,
    ]
        .join(" ")
        .toLowerCase();
}

function roundPercentage(value: number) {
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

function resolvePeriodStart(periodDays: JobCenterFilters["periodDays"], now: Date) {
    if (!periodDays) return null;
    const start = new Date(now);
    start.setDate(start.getDate() - periodDays);
    return start;
}

function applyFilters(items: JobCenterListItem[], filters: JobCenterFilters, now: Date) {
    const query = filters.query?.trim().toLowerCase();
    const periodStart = resolvePeriodStart(filters.periodDays, now);

    return items.filter((item) => {
        if (filters.status && item.status !== filters.status) {
            return false;
        }

        if (filters.sourceType && item.sourceType !== filters.sourceType) {
            return false;
        }

        if (query && !buildSearchText(item).includes(query)) {
            return false;
        }

        if (periodStart && item.createdAt < periodStart) {
            return false;
        }

        return true;
    });
}

export function buildJobCenterList(input: {
    automacaoJobs: readonly JobCenterAutomacaoListEntry[];
    flowExecutions: readonly JobCenterFlowExecutionListEntry[];
    filters: JobCenterFilters;
    now?: Date;
}) {
    const items = [
        ...input.automacaoJobs.map(normalizeAutomacaoJobItem),
        ...input.flowExecutions.map(normalizeFlowExecutionItem),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return applyFilters(items, input.filters, input.now || new Date());
}

export function getJobCenterSummary(items: readonly JobCenterListItem[]): JobCenterSummary {
    return items.reduce<JobCenterSummary>(
        (summary, item) => {
            summary.total += 1;
            if (item.status === "QUEUED") summary.queued += 1;
            if (item.status === "RUNNING") summary.running += 1;
            if (item.status === "COMPLETED") summary.completed += 1;
            if (item.status === "FAILED") summary.failed += 1;
            if (item.status === "CANCELLED") summary.cancelled += 1;
            return summary;
        },
        {
            total: 0,
            queued: 0,
            running: 0,
            completed: 0,
            failed: 0,
            cancelled: 0,
        }
    );
}

export function buildJobCenterOperationalMetrics(input: {
    items: readonly JobCenterListItem[];
    attempts: readonly JobCenterAttemptMetricInput[];
    now?: Date;
}) {
    const now = input.now || new Date();
    const recentAttempts = input.attempts.filter((attempt) => attempt.createdAt <= now);
    const sourceMap = new Map<JobCenterSourceType, JobCenterOperationalSourceMetric>();

    for (const item of input.items) {
        const existing =
            sourceMap.get(item.sourceType) ||
            ({
                sourceType: item.sourceType,
                total: 0,
                queued: 0,
                running: 0,
                completed: 0,
                failed: 0,
                cancelled: 0,
                actionable: 0,
                manualRetryTotal: 0,
                recoveredAfterRetryTotal: 0,
                manualCancelTotal: 0,
            } satisfies JobCenterOperationalSourceMetric);

        existing.total += 1;
        if (item.status === "QUEUED") existing.queued += 1;
        if (item.status === "RUNNING") existing.running += 1;
        if (item.status === "COMPLETED") existing.completed += 1;
        if (item.status === "FAILED") existing.failed += 1;
        if (item.status === "CANCELLED") existing.cancelled += 1;
        if (item.status === "FAILED" || item.status === "RUNNING" || item.status === "QUEUED") {
            existing.actionable += 1;
        }

        sourceMap.set(item.sourceType, existing);
    }

    let manualRetryTotal = 0;
    let recoveredAfterRetryTotal = 0;
    let manualCancelTotal = 0;

    for (const attempt of recentAttempts) {
        const status = normalizeJobCenterStatus(attempt.status);
        const existing =
            sourceMap.get(attempt.sourceType) ||
            ({
                sourceType: attempt.sourceType,
                total: 0,
                queued: 0,
                running: 0,
                completed: 0,
                failed: 0,
                cancelled: 0,
                actionable: 0,
                manualRetryTotal: 0,
                recoveredAfterRetryTotal: 0,
                manualCancelTotal: 0,
            } satisfies JobCenterOperationalSourceMetric);

        if (attempt.triggerSource === "MANUAL_RETRY") {
            manualRetryTotal += 1;
            existing.manualRetryTotal += 1;
            if (status === "COMPLETED") {
                recoveredAfterRetryTotal += 1;
                existing.recoveredAfterRetryTotal += 1;
            }
        }

        if (attempt.triggerSource === "MANUAL_CANCEL") {
            manualCancelTotal += 1;
            existing.manualCancelTotal += 1;
        }

        sourceMap.set(attempt.sourceType, existing);
    }

    const actionableTotal = input.items.filter(
        (item) => item.status === "FAILED" || item.status === "RUNNING" || item.status === "QUEUED"
    ).length;
    const failedTotal = input.items.filter((item) => item.status === "FAILED").length;
    const totalVisible = input.items.length || 1;

    return {
        actionableTotal,
        manualRetryTotal,
        recoveredAfterRetryTotal,
        manualCancelTotal,
        retrySuccessRate:
            manualRetryTotal > 0 ? roundPercentage((recoveredAfterRetryTotal / manualRetryTotal) * 100) : 0,
        failureRate: roundPercentage((failedTotal / totalVisible) * 100),
        bySource: Array.from(sourceMap.values()).sort((a, b) => a.sourceType.localeCompare(b.sourceType)),
    } satisfies JobCenterOperationalMetrics;
}
