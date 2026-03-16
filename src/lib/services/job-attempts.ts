import { db } from "@/lib/db";

export type JobAttemptSourceType = "AUTOMACAO_NACIONAL_JOB" | "FLOW_EXECUTION";
export type JobAttemptStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

type AttemptContextEntry = {
    chainKey: string;
    attemptNumber: number;
};

type AttemptSeedInput = {
    sourceType: JobAttemptSourceType;
    sourceId: string;
    status: string;
    errorMessage?: string | null;
    startedAt?: Date | null;
    finishedAt?: Date | null;
    payloadSnapshot?: unknown;
    resultSnapshot?: unknown;
};

type AttemptLifecycleInput = AttemptSeedInput & {
    triggerSource?: "SYSTEM" | "MANUAL_RETRY" | "MANUAL_CANCEL";
    triggeredById?: string | null;
    reason?: string | null;
    retryOfSourceId?: string | null;
};

function toJsonValue<T>(value: T) {
    return JSON.parse(JSON.stringify(value));
}

export function normalizeToAttemptStatus(rawStatus: string): JobAttemptStatus {
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

export function buildAttemptChainKey(sourceType: JobAttemptSourceType, sourceId: string) {
    return `${sourceType}:${sourceId}`;
}

export function deriveAttemptContext(
    sourceType: JobAttemptSourceType,
    sourceId: string,
    attempts: AttemptContextEntry[]
) {
    const chainKey = attempts[0]?.chainKey || buildAttemptChainKey(sourceType, sourceId);
    const nextAttemptNumber =
        attempts.reduce((max, item) => Math.max(max, item.attemptNumber), 0) + 1;

    return {
        chainKey,
        nextAttemptNumber,
    };
}

function parseArray(value: unknown) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value) as unknown;
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    return [];
}

export function extractRetryPayloadFromFlowExecutionLog(log: unknown) {
    const entries = parseArray(log);
    const startEntry = entries.find((item) => {
        if (!item || typeof item !== "object") return false;
        const record = item as Record<string, unknown>;
        return record.action === "EXECUTION_STARTED" && record.payload && typeof record.payload === "object";
    });

    if (!startEntry || typeof startEntry !== "object") return null;
    const payload = (startEntry as Record<string, unknown>).payload;
    if (!payload || typeof payload !== "object") return null;

    return toJsonValue(payload) as Record<string, unknown>;
}

async function findChainKeyForSource(sourceType: JobAttemptSourceType, sourceId: string) {
    const direct = await db.jobExecutionAttempt.findFirst({
        where: {
            sourceType,
            sourceId,
        },
        orderBy: [{ attemptNumber: "asc" }],
        select: { chainKey: true },
    });

    if (direct?.chainKey) return direct.chainKey;

    const child = await db.jobExecutionAttempt.findFirst({
        where: {
            sourceType,
            retryOfSourceId: sourceId,
        },
        orderBy: [{ attemptNumber: "asc" }],
        select: { chainKey: true },
    });

    return child?.chainKey || buildAttemptChainKey(sourceType, sourceId);
}

async function listAttemptContextEntries(chainKey: string) {
    return db.jobExecutionAttempt.findMany({
        where: { chainKey },
        orderBy: [{ attemptNumber: "asc" }],
        select: {
            chainKey: true,
            attemptNumber: true,
        },
    });
}

async function getLatestAttemptForSource(sourceType: JobAttemptSourceType, sourceId: string) {
    return db.jobExecutionAttempt.findFirst({
        where: {
            sourceType,
            sourceId,
        },
        orderBy: [{ attemptNumber: "desc" }, { createdAt: "desc" }],
    });
}

export async function listAttemptHistoryForSource(
    sourceType: JobAttemptSourceType,
    sourceId: string
) {
    const chainKey = await findChainKeyForSource(sourceType, sourceId);

    return db.jobExecutionAttempt.findMany({
        where: { chainKey },
        orderBy: [{ attemptNumber: "desc" }],
        include: {
            triggeredBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });
}

export async function ensureAttemptSeedForSource(input: AttemptSeedInput) {
    const existing = await getLatestAttemptForSource(input.sourceType, input.sourceId);
    if (existing) return existing;

    const chainKey = await findChainKeyForSource(input.sourceType, input.sourceId);
    const context = deriveAttemptContext(
        input.sourceType,
        input.sourceId,
        await listAttemptContextEntries(chainKey)
    );

    return db.jobExecutionAttempt.create({
        data: {
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            chainKey: context.chainKey,
            attemptNumber: context.nextAttemptNumber,
            triggerSource: "SYSTEM",
            status: normalizeToAttemptStatus(input.status),
            errorMessage: input.errorMessage || null,
            startedAt: input.startedAt || null,
            finishedAt: input.finishedAt || null,
            payloadSnapshot:
                input.payloadSnapshot !== undefined ? toJsonValue(input.payloadSnapshot) : undefined,
            resultSnapshot:
                input.resultSnapshot !== undefined ? toJsonValue(input.resultSnapshot) : undefined,
        },
    });
}

export async function upsertAttemptLifecycleForSource(input: AttemptLifecycleInput) {
    const existing = await getLatestAttemptForSource(input.sourceType, input.sourceId);
    const normalizedStatus = normalizeToAttemptStatus(input.status);

    if (existing) {
        return db.jobExecutionAttempt.update({
            where: { id: existing.id },
            data: {
                status: normalizedStatus,
                errorMessage: input.errorMessage ?? existing.errorMessage,
                startedAt:
                    input.startedAt !== undefined
                        ? input.startedAt
                        : normalizedStatus === "RUNNING"
                            ? existing.startedAt || new Date()
                            : existing.startedAt,
                finishedAt:
                    input.finishedAt !== undefined
                        ? input.finishedAt
                        : normalizedStatus === "COMPLETED" ||
                            normalizedStatus === "FAILED" ||
                            normalizedStatus === "CANCELLED"
                            ? new Date()
                            : existing.finishedAt,
                ...(input.resultSnapshot !== undefined
                    ? { resultSnapshot: toJsonValue(input.resultSnapshot) }
                    : {}),
                ...(input.payloadSnapshot !== undefined
                    ? { payloadSnapshot: toJsonValue(input.payloadSnapshot) }
                    : {}),
                ...(input.reason !== undefined ? { reason: input.reason } : {}),
            },
        });
    }

    return ensureAttemptSeedForSource({
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        status: normalizedStatus,
        errorMessage: input.errorMessage,
        startedAt:
            input.startedAt !== undefined
                ? input.startedAt
                : normalizedStatus === "RUNNING"
                    ? new Date()
                    : null,
        finishedAt:
            input.finishedAt !== undefined
                ? input.finishedAt
                : normalizedStatus === "COMPLETED" ||
                    normalizedStatus === "FAILED" ||
                    normalizedStatus === "CANCELLED"
                    ? new Date()
                    : null,
        payloadSnapshot: input.payloadSnapshot,
        resultSnapshot: input.resultSnapshot,
    });
}

export async function createManualRetryAttempt(input: {
    sourceType: JobAttemptSourceType;
    sourceId: string;
    newSourceId: string;
    actorUserId: string;
    reason: string;
    payloadSnapshot?: unknown;
}) {
    const chainKey = await findChainKeyForSource(input.sourceType, input.sourceId);
    const context = deriveAttemptContext(
        input.sourceType,
        input.sourceId,
        await listAttemptContextEntries(chainKey)
    );

    return db.jobExecutionAttempt.create({
        data: {
            sourceType: input.sourceType,
            sourceId: input.newSourceId,
            chainKey: context.chainKey,
            attemptNumber: context.nextAttemptNumber,
            triggerSource: "MANUAL_RETRY",
            retryOfSourceId: input.sourceId,
            triggeredById: input.actorUserId,
            reason: input.reason,
            status: "QUEUED",
            payloadSnapshot:
                input.payloadSnapshot !== undefined ? toJsonValue(input.payloadSnapshot) : undefined,
        },
    });
}
