import { Queue } from "bullmq";
import { getQueueConnection } from "@/lib/queue";

export const ATTENDANCE_AUTOMATION_QUEUE_NAME = "attendance-automation-queue";

type AttendanceAutomationJobData = {
    conversationId: string;
    messageId?: string | null;
    incomingText: string;
    source: "baileys" | "evolution-webhook" | "manual";
    forceRetry?: boolean;
};

let queue: Queue<AttendanceAutomationJobData> | null = null;

function buildAttendanceAutomationJobId(data: AttendanceAutomationJobData) {
    return data.messageId
        ? `attendance-${data.conversationId}-${data.messageId}`
        : undefined;
}

function getQueue() {
    const connection = getQueueConnection();
    if (!connection) return null;
    if (queue) return queue;

    queue = new Queue<AttendanceAutomationJobData>(ATTENDANCE_AUTOMATION_QUEUE_NAME, { connection });
    return queue;
}

export function isAttendanceAutomationQueueAvailable() {
    return Boolean(getQueue());
}

export async function enqueueAttendanceAutomationJob(
    data: AttendanceAutomationJobData,
    delayMs = 0
) {
    const queueRef = getQueue();
    if (!queueRef) {
        return {
            queued: false,
            reason: "REDIS_URL nao configurada para BullMQ.",
        };
    }

    try {
        await queueRef.add(
            "run-attendance-automation",
            data,
            {
                delay: Math.max(0, delayMs),
                jobId: buildAttendanceAutomationJobId(data),
                removeOnComplete: 200,
                removeOnFail: 500,
            }
        );
        return { queued: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao enfileirar job.";
        if (/jobId/i.test(message) || /already exists/i.test(message)) {
            return { queued: true, duplicated: true };
        }
        return { queued: false, reason: message };
    }
}
