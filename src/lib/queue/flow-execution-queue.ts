import { Queue } from "bullmq";
import { getQueueConnection } from "@/lib/queue";

export const FLOW_EXECUTION_QUEUE_NAME = "workflow-execution";

type FlowExecutionJobData = {
    executionId: string;
};

let queue: Queue<FlowExecutionJobData> | null = null;

function getQueue() {
    const connection = getQueueConnection();
    if (!connection) return null;
    if (queue) return queue;

    queue = new Queue<FlowExecutionJobData>(FLOW_EXECUTION_QUEUE_NAME, { connection });
    return queue;
}

export function isFlowExecutionQueueAvailable() {
    return Boolean(getQueue());
}

export async function enqueueFlowExecutionJob(executionId: string, delayMs = 0) {
    const queueRef = getQueue();
    if (!queueRef) {
        return {
            queued: false,
            reason: "REDIS_URL nao configurada para BullMQ.",
        };
    }

    try {
        await queueRef.add(
            "run-flow-execution",
            { executionId },
            {
                delay: Math.max(0, delayMs),
                jobId: `flow-execution-${executionId}`,
                removeOnComplete: 200,
                removeOnFail: 500,
                attempts: 5,
                backoff: {
                    type: "exponential",
                    delay: 1_000,
                },
            }
        );
        return { queued: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao enfileirar execucao de flow.";
        if (/jobId/i.test(message) || /already exists/i.test(message)) {
            return { queued: true, duplicated: true };
        }
        return { queued: false, reason: message };
    }
}
