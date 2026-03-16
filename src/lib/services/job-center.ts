import { db } from "@/lib/db";
import { AutomationEngine, type AutomationPayload } from "@/lib/services/automation-engine";
import {
    buildJobCenterList,
    buildJobCenterOperationalMetrics,
    getJobCenterSummary,
    normalizeJobCenterStatus,
    normalizeAutomacaoJobItem,
    type JobCenterFilters,
    normalizeFlowExecutionItem,
    type JobCenterListItem,
    type JobCenterSourceType,
    type JobCenterStatus,
} from "@/lib/services/job-center-core";
import {
    cancelarAutomacaoBuscaNacional,
    getAutomacaoJobStatus,
    reenfileirarAutomacaoBuscaNacional,
} from "@/lib/services/automacao-nacional";
import {
    createManualRetryAttempt,
    deriveAttemptContext,
    ensureAttemptSeedForSource,
    extractRetryPayloadFromFlowExecutionLog,
    listAttemptHistoryForSource,
} from "@/lib/services/job-attempts";

export {
    buildJobCenterList,
    buildJobCenterOperationalMetrics,
    getJobCenterSummary,
};

export type {
    JobCenterFilters,
    JobCenterListItem,
    JobCenterOperationalMetrics,
    JobCenterSourceType,
    JobCenterStatus,
    JobCenterSummary,
} from "@/lib/services/job-center-core";

export type JobCenterAttemptView = {
    id: string;
    attemptNumber: number;
    status: JobCenterStatus;
    triggerSource: string;
    reason: string | null;
    errorMessage: string | null;
    retryOfSourceId: string | null;
    sourceId: string;
    href: string;
    startedAt: Date | null;
    finishedAt: Date | null;
    createdAt: Date;
    triggeredBy: {
        id: string;
        name: string | null;
        email: string | null;
    } | null;
};

type AutomacaoJobDetail = NonNullable<Awaited<ReturnType<typeof getAutomacaoJobStatus>>>;

type FlowExecutionDetail = {
    id: string;
    flowId: string;
    status: string;
    currentNodeId: string | null;
    errorMessage: string | null;
    log: unknown;
    startedAt: Date;
    completedAt: Date | null;
    clienteId: string | null;
    processoId: string | null;
    flow: { id: string; name: string } | null;
    cliente: { id: string; nome: string } | null;
    processo: { id: string; numeroCnj: string | null } | null;
};

export type JobCenterDetail =
    | {
        sourceType: "AUTOMACAO_NACIONAL_JOB";
        item: JobCenterListItem;
        data: AutomacaoJobDetail;
        attempts: JobCenterAttemptView[];
        canRetry: boolean;
        canCancel: boolean;
    }
    | {
        sourceType: "FLOW_EXECUTION";
        item: JobCenterListItem;
        data: FlowExecutionDetail;
        attempts: JobCenterAttemptView[];
        canRetry: boolean;
        canCancel: boolean;
    };

function isRetryableStatus(status: JobCenterStatus) {
    return status === "FAILED" || status === "COMPLETED" || status === "CANCELLED";
}

function isCancelableStatus(sourceType: JobCenterSourceType, status: JobCenterStatus) {
    if (sourceType === "AUTOMACAO_NACIONAL_JOB") {
        return status === "QUEUED";
    }

    return status === "RUNNING";
}

function isAutomationPayload(payload: unknown): payload is AutomationPayload {
    return Boolean(
        payload &&
        typeof payload === "object" &&
        typeof (payload as { escritorioId?: unknown }).escritorioId === "string" &&
        (payload as { escritorioId: string }).escritorioId
    );
}

function mapAttemptView(
    sourceType: JobCenterSourceType,
    attempt: Awaited<ReturnType<typeof listAttemptHistoryForSource>>[number]
): JobCenterAttemptView {
    return {
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        status: normalizeJobCenterStatus(attempt.status),
        triggerSource: attempt.triggerSource,
        reason: attempt.reason,
        errorMessage: attempt.errorMessage,
        retryOfSourceId: attempt.retryOfSourceId,
        sourceId: attempt.sourceId,
        href: `/admin/jobs/${sourceType}/${attempt.sourceId}`,
        startedAt: attempt.startedAt,
        finishedAt: attempt.finishedAt,
        createdAt: attempt.createdAt,
        triggeredBy: attempt.triggeredBy
            ? {
                id: attempt.triggeredBy.id,
                name: attempt.triggeredBy.name,
                email: attempt.triggeredBy.email,
            }
            : null,
    };
}

export { deriveAttemptContext, extractRetryPayloadFromFlowExecutionLog };

function resolvePeriodStart(filters: JobCenterFilters) {
    if (!filters.periodDays) return null;

    const start = new Date();
    start.setDate(start.getDate() - filters.periodDays);
    return start;
}

export async function listJobCenterItems(filters: JobCenterFilters = {}, limit = 50) {
    const safeLimit = Math.max(10, Math.min(100, limit));
    const periodStart = resolvePeriodStart(filters);

    const [automacaoJobs, flowExecutions] = await Promise.all([
        db.automacaoJob.findMany({
            where: periodStart
                ? {
                    createdAt: {
                        gte: periodStart,
                    },
                }
                : undefined,
            orderBy: [{ createdAt: "desc" }],
            take: safeLimit,
            include: {
                advogado: {
                    select: {
                        id: true,
                        user: { select: { name: true } },
                    },
                },
                _count: {
                    select: { logs: true },
                },
            },
        }),
        db.flowExecution.findMany({
            where: periodStart
                ? {
                    startedAt: {
                        gte: periodStart,
                    },
                }
                : undefined,
            orderBy: [{ startedAt: "desc" }],
            take: safeLimit,
            include: {
                flow: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        }),
    ]);

    return buildJobCenterList({
        automacaoJobs,
        flowExecutions,
        filters,
    }).slice(0, safeLimit);
}

export async function getJobCenterOperationalMetricsSnapshot(
    filters: JobCenterFilters = {},
    items?: readonly JobCenterListItem[]
) {
    const visibleItems = items || (await listJobCenterItems(filters, 50));
    const periodStart = resolvePeriodStart(filters);

    const attempts = await db.jobExecutionAttempt.findMany({
        where: {
            ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
            ...(periodStart
                ? {
                    createdAt: {
                        gte: periodStart,
                    },
                }
                : {}),
        },
        select: {
            sourceType: true,
            status: true,
            triggerSource: true,
            createdAt: true,
        },
    });

    return buildJobCenterOperationalMetrics({
        items: visibleItems,
        attempts,
    });
}

async function seedAutomacaoAttemptIfMissing(data: AutomacaoJobDetail) {
    await ensureAttemptSeedForSource({
        sourceType: "AUTOMACAO_NACIONAL_JOB",
        sourceId: data.job.id,
        status: data.job.status,
        errorMessage: data.job.erroResumo,
        startedAt: data.job.startedAt,
        finishedAt: data.job.finishedAt,
        resultSnapshot: {
            resumo: data.resumo,
        },
    });
}

async function seedFlowAttemptIfMissing(data: FlowExecutionDetail) {
    await ensureAttemptSeedForSource({
        sourceType: "FLOW_EXECUTION",
        sourceId: data.id,
        status: data.status,
        errorMessage: data.errorMessage,
        startedAt: data.startedAt,
        finishedAt: data.completedAt,
        payloadSnapshot: extractRetryPayloadFromFlowExecutionLog(data.log),
    });
}

export async function getJobCenterDetail(
    sourceType: JobCenterSourceType,
    id: string
): Promise<JobCenterDetail | null> {
    if (sourceType === "AUTOMACAO_NACIONAL_JOB") {
        const data = await getAutomacaoJobStatus(id);
        if (!data) return null;

        await seedAutomacaoAttemptIfMissing(data);
        const item = normalizeAutomacaoJobItem({
            ...data.job,
            _count: { logs: data.resumo.totalLogs },
        });
        const attempts = (await listAttemptHistoryForSource(sourceType, id)).map((attempt) =>
            mapAttemptView(sourceType, attempt)
        );

        return {
            sourceType,
            item,
            data,
            attempts,
            canRetry: isRetryableStatus(item.status),
            canCancel: isCancelableStatus(sourceType, item.status),
        };
    }

    const flowExecution = await db.flowExecution.findUnique({
        where: { id },
        include: {
            flow: {
                select: {
                    id: true,
                    name: true,
                },
            },
            cliente: {
                select: {
                    id: true,
                    nome: true,
                },
            },
            processo: {
                select: {
                    id: true,
                    numeroCnj: true,
                },
            },
        },
    });

    if (!flowExecution) return null;

    await seedFlowAttemptIfMissing(flowExecution);
    const item = normalizeFlowExecutionItem(flowExecution);
    const attempts = (await listAttemptHistoryForSource(sourceType, id)).map((attempt) =>
        mapAttemptView(sourceType, attempt)
    );

    return {
        sourceType,
        item,
        data: flowExecution,
        attempts,
        canRetry: isRetryableStatus(item.status),
        canCancel: isCancelableStatus(sourceType, item.status),
    };
}

async function loadFlowExecutionForRetry(id: string) {
    const execution = await db.flowExecution.findUnique({
        where: { id },
        include: {
            flow: {
                select: {
                    id: true,
                    isActive: true,
                    name: true,
                },
            },
        },
    });

    if (!execution) {
        throw new Error("Execucao de flow nao encontrada.");
    }

    if (!execution.flow?.isActive) {
        throw new Error("O flow associado esta inativo e nao pode ser reexecutado.");
    }

    const payload = extractRetryPayloadFromFlowExecutionLog(execution.log);
    if (!isAutomationPayload(payload)) {
        throw new Error("Nao foi possivel recuperar o payload original da execucao.");
    }

    return { execution, payload };
}

export async function retryJobCenterItem(input: {
    sourceType: JobCenterSourceType;
    sourceId: string;
    actorUserId: string;
    reason: string;
}) {
    const reason = input.reason.trim();
    if (!reason) {
        throw new Error("Informe o motivo do reprocessamento.");
    }

    if (input.sourceType === "AUTOMACAO_NACIONAL_JOB") {
        const original = await getAutomacaoJobStatus(input.sourceId);
        if (!original) {
            throw new Error("Job nao encontrado.");
        }

        await seedAutomacaoAttemptIfMissing(original);

        const retryJob = await reenfileirarAutomacaoBuscaNacional(input.sourceId);
        await createManualRetryAttempt({
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            newSourceId: retryJob.id,
            actorUserId: input.actorUserId,
            reason,
            payloadSnapshot: {
                advogadoId: original.job.advogadoId,
                modo: original.job.modo,
                janelaInicio: original.job.janelaInicio,
                janelaFim: original.job.janelaFim,
            },
        });

        return {
            retried: true,
            newSourceType: input.sourceType,
            newSourceId: retryJob.id,
        };
    }

    const { execution, payload } = await loadFlowExecutionForRetry(input.sourceId);
    await seedFlowAttemptIfMissing({
        ...execution,
        flow: execution.flow
            ? {
                id: execution.flow.id,
                name: execution.flow.name,
            }
            : null,
        cliente: null,
        processo: null,
    });

    const result = await AutomationEngine.startExecution(execution.flowId, payload);
    if (!result.started || !result.executionId) {
        throw new Error(result.reason || "Nao foi possivel reexecutar o flow.");
    }

    await createManualRetryAttempt({
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        newSourceId: result.executionId,
        actorUserId: input.actorUserId,
        reason,
        payloadSnapshot: payload,
    });

    return {
        retried: true,
        newSourceType: input.sourceType,
        newSourceId: result.executionId,
    };
}

export async function cancelJobCenterItem(input: {
    sourceType: JobCenterSourceType;
    sourceId: string;
}) {
    if (input.sourceType === "AUTOMACAO_NACIONAL_JOB") {
        await cancelarAutomacaoBuscaNacional(input.sourceId);
        return { cancelled: true };
    }

    await AutomationEngine.cancelExecution(input.sourceId, "Cancelado manualmente pela Central de Jobs.");
    return { cancelled: true };
}
