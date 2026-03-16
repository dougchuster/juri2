import "dotenv/config";
import { Worker } from "bullmq";
import {
  AUTOMACAO_NATIONAL_QUEUE_NAME,
  closeQueueConnection,
  getQueueConnection,
} from "../lib/queue";
import { executarAutomacaoNacionalJob } from "../lib/services/automacao-nacional";

const connection = getQueueConnection();

if (!connection) {
  throw new Error("REDIS_URL nao configurada. Worker de automacao nacional nao pode iniciar.");
}

const concurrency = Math.max(
  1,
  Math.min(20, Number(process.env.AUTOMACAO_WORKER_CONCURRENCY || 2))
);

const worker = new Worker(
  AUTOMACAO_NATIONAL_QUEUE_NAME,
  async (job) => {
    const jobId = String(job.data?.jobId || "");
    if (!jobId) throw new Error("Payload invalido: jobId obrigatorio.");
    return executarAutomacaoNacionalJob(jobId);
  },
  { connection, concurrency }
);

worker.on("ready", () => {
  console.log(`[Worker] ${AUTOMACAO_NATIONAL_QUEUE_NAME} pronto (concurrency=${concurrency})`);
});

worker.on("active", (job) => {
  console.log(`[Worker] Processando ${job.id}`);
});

worker.on("completed", (job) => {
  console.log(`[Worker] Concluido ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Falha ${job?.id}:`, err?.message || err);
});

async function shutdown() {
  console.log("[Worker] Encerrando...");
  await worker.close();
  await closeQueueConnection();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
