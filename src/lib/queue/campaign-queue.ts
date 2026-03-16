import { Queue } from "bullmq";
import { getQueueConnection } from "@/lib/queue";

export const CRM_CAMPAIGN_QUEUE_NAME = "crm-campaign-queue";

let queue: Queue | null = null;

function getQueue() {
    const connection = getQueueConnection();
    if (!connection) return null;
    if (queue) return queue;

    queue = new Queue(CRM_CAMPAIGN_QUEUE_NAME, { connection });
    return queue;
}

export function isCampaignQueueAvailable() {
    return Boolean(getQueue());
}

export async function enqueueCampaignJob(campaignId: string) {
    const queueRef = getQueue();
    if (!queueRef) {
        return {
            queued: false,
            reason: "REDIS_URL não configurada para BullMQ.",
        };
    }

    try {
        await queueRef.add(
            "run-campaign",
            { campaignId },
            {
                jobId: `campaign-${campaignId}`,
                removeOnComplete: 100,
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
