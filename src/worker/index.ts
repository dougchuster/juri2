import "dotenv/config";
import { Worker } from "bullmq";
import {
  AUTOMACAO_NATIONAL_QUEUE_NAME,
  closeQueueConnection,
  getQueueConnection,
} from "../lib/queue";
import { ATTENDANCE_AUTOMATION_QUEUE_NAME } from "../lib/queue/attendance-automation-queue";
import { CRM_CAMPAIGN_QUEUE_NAME } from "../lib/queue/campaign-queue";
import { FLOW_EXECUTION_QUEUE_NAME } from "../lib/queue/flow-execution-queue";
import { executarAutomacaoNacionalJob } from "../lib/services/automacao-nacional";
import { AutomationEngine } from "../lib/services/automation-engine";
import { runAttendanceAutomationForInboundMessage } from "../lib/services/attendance-automation";
import { processCampaignJob } from "../lib/services/campaign-engine";

const connection = getQueueConnection();

if (!connection) {
  throw new Error("REDIS_URL nao configurada. Worker nao pode iniciar.");
}

const nationalConcurrency = Math.max(
  1,
  Math.min(20, Number(process.env.AUTOMACAO_WORKER_CONCURRENCY || 2))
);
const campaignConcurrency = Math.max(
  1,
  Math.min(10, Number(process.env.CRM_CAMPAIGN_WORKER_CONCURRENCY || 1))
);
const attendanceConcurrency = Math.max(
  1,
  Math.min(20, Number(process.env.ATTENDANCE_AUTOMATION_WORKER_CONCURRENCY || 4))
);
const flowExecutionConcurrency = Math.max(
  1,
  Math.min(20, Number(process.env.FLOW_EXECUTION_WORKER_CONCURRENCY || 4))
);

const workers = [
  new Worker(
    AUTOMACAO_NATIONAL_QUEUE_NAME,
    async (job) => {
      const jobId = String(job.data?.jobId || "");
      if (!jobId) throw new Error("Payload invalido: jobId obrigatorio.");
      return executarAutomacaoNacionalJob(jobId);
    },
    { connection, concurrency: nationalConcurrency }
  ),
  new Worker(
    CRM_CAMPAIGN_QUEUE_NAME,
    async (job) => {
      const campaignId = String(job.data?.campaignId || "");
      if (!campaignId) throw new Error("Payload invalido: campaignId obrigatorio.");
      return processCampaignJob({ campaignId });
    },
    { connection, concurrency: campaignConcurrency }
  ),
  new Worker(
    ATTENDANCE_AUTOMATION_QUEUE_NAME,
    async (job) => {
      const conversationId = String(job.data?.conversationId || "");
      if (!conversationId) throw new Error("Payload invalido: conversationId obrigatorio.");

      return runAttendanceAutomationForInboundMessage({
        conversationId,
        messageId: job.data?.messageId || null,
        incomingText: String(job.data?.incomingText || ""),
        source: (job.data?.source || "evolution-webhook") as "baileys" | "evolution-webhook" | "manual",
        forceRetry: Boolean(job.data?.forceRetry),
        skipBurstDelay: true,
      });
    },
    { connection, concurrency: attendanceConcurrency }
  ),
  new Worker(
    FLOW_EXECUTION_QUEUE_NAME,
    async (job) => {
      const executionId = String(job.data?.executionId || "");
      if (!executionId) throw new Error("Payload invalido: executionId obrigatorio.");
      return AutomationEngine.processExecutionJob(executionId, {
        attemptNumber: job.attemptsMade + 1,
        maxAttempts: typeof job.opts.attempts === "number" ? job.opts.attempts : 1,
      });
    },
    { connection, concurrency: flowExecutionConcurrency }
  ),
];

const workerLabels = [
  `${AUTOMACAO_NATIONAL_QUEUE_NAME} (concurrency=${nationalConcurrency})`,
  `${CRM_CAMPAIGN_QUEUE_NAME} (concurrency=${campaignConcurrency})`,
  `${ATTENDANCE_AUTOMATION_QUEUE_NAME} (concurrency=${attendanceConcurrency})`,
  `${FLOW_EXECUTION_QUEUE_NAME} (concurrency=${flowExecutionConcurrency})`,
];

workers.forEach((worker, index) => {
  const label = workerLabels[index];

  worker.on("ready", () => {
    console.log(`[Worker] ${label} pronto`);
  });

  worker.on("active", (job) => {
    console.log(`[Worker] ${label} processando ${job.id}`);
  });

  worker.on("completed", (job) => {
    console.log(`[Worker] ${label} concluiu ${job.id}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] ${label} falhou ${job?.id}:`, err?.message || err);
  });
});

async function shutdown() {
  console.log("[Worker] Encerrando...");
  await Promise.all(workers.map((worker) => worker.close()));
  await closeQueueConnection();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
