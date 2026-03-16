
import { Queue } from "bullmq";
import { AUTOMACAO_NATIONAL_QUEUE_NAME, getQueueConnection } from "@/lib/queue";

let queue: Queue | null = null;

function getQueue() {
  const connection = getQueueConnection();
  if (!connection) return null;
  if (queue) return queue;

  queue = new Queue(AUTOMACAO_NATIONAL_QUEUE_NAME, { connection });
  return queue;
}

export function isAutomacaoQueueAvailable() {
  return Boolean(getQueue());
}

export async function enqueueAutomacaoNacionalJob(jobId: string) {
  const queueRef = getQueue();
  if (!queueRef) {
    return {
      queued: false,
      reason: "REDIS_URL nao configurada para BullMQ.",
    };
  }

  try {
    await queueRef.add(
      "run",
      { jobId },
      {
        // BullMQ uses ":" as an internal delimiter and rejects custom jobIds containing ":".
        jobId: `automacao-${jobId}`,
        removeOnComplete: 500,
        removeOnFail: 1000,
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

export async function cancelAutomacaoNacionalQueuedJob(jobId: string) {
  const queueRef = getQueue();
  if (!queueRef) {
    return { cancelled: false, reason: "Fila BullMQ indisponivel." };
  }

  try {
    const queueJob = await queueRef.getJob(`automacao-${jobId}`);
    if (!queueJob) {
      return { cancelled: false, reason: "Job nao encontrado na fila." };
    }

    const state = await queueJob.getState();
    if (state !== "waiting" && state !== "delayed") {
      return { cancelled: false, reason: `Job em estado nao cancelavel: ${state}.` };
    }

    await queueJob.remove();
    return { cancelled: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao cancelar job na fila.";
    return { cancelled: false, reason: message };
  }
}

