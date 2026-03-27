/**
 * Cron Scheduler — node-cron based background jobs
 * 
 * This module sets up scheduled tasks for the communication engine.
 * It should be initialized once when the server starts.
 * 
 * Schedule:
 * - Every 2 minutes: Process pending jobs in the queue
 * - Every day at 8:00 AM: Check deadlines and create reminder jobs
 * - Every day at 13:00 PM: Second pass for afternoon reminders
 * - Every hour at minute 5: Run juridical operations checks (SLA + auto distribution)
 * - Every hour at minute 20: Run publications capture scheduler (daily by configured hour)
 * - Every 5 minutes: Run demandas planning scheduler (runs only when scope time matches)
 * - Every 15 minutes: Process national automation queue (92 tribunais)
 * - Every 6 hours: Monitor DataJud access page + key validation
 * - Every day at 03:10 AM: Update DataJud aliases automatically
 * - Every day at 02:40 AM: Run LGPD retention policies
 * - Every day at 02:15 AM: Refresh BI snapshots
 */

import cron from "node-cron";
import { buildInternalAppUrl } from "@/lib/runtime/app-url";

const JOBS_SECRET = process.env.JOBS_SECRET_KEY || "";
const BOOTSTRAP_GRACE_MS = Number(process.env.SCHEDULER_BOOTSTRAP_GRACE_MS || 30000);

let initialized = false;
let bootstrapReadyAt = 0;

function canRunScheduledTask(taskName: string) {
    if (Date.now() >= bootstrapReadyAt) return true;

    const remainingMs = Math.max(bootstrapReadyAt - Date.now(), 0);
    console.log(`[Scheduler] ${taskName}: aguardando bootstrap (${Math.ceil(remainingMs / 1000)}s)`);
    return false;
}

export function initializeScheduler() {
    if (initialized) return;
    if (process.env.CRON_ENABLED !== "true") {
        console.log("[Scheduler] Cron disabled (CRON_ENABLED != true)");
        return;
    }

    console.log("[Scheduler] Initializing cron jobs...");
    bootstrapReadyAt = Date.now() + BOOTSTRAP_GRACE_MS;

    // Process job queue every 2 minutes
    cron.schedule("*/2 * * * *", async () => {
        if (!canRunScheduledTask("Queue")) return;
        try {
            const res = await fetch(buildInternalAppUrl("/api/jobs/process"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${JOBS_SECRET}`,
                },
                body: JSON.stringify({ limit: 30 }),
            });
            const data = await res.json();
            if (data.processed > 0 || data.failed > 0) {
                console.log(`[Scheduler] Queue: ${data.processed} processed, ${data.failed} failed`);
            }
        } catch (err) {
            console.error("[Scheduler] Queue processing error:", err);
        }
    });

    // Daily scheduler at 8:00 AM — check deadlines, create reminders
    cron.schedule("0 8 * * *", async () => {
        if (!canRunScheduledTask("Daily")) return;
        try {
            console.log("[Scheduler] Running daily reminder check...");
            const res = await fetch(buildInternalAppUrl("/api/jobs/scheduler"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${JOBS_SECRET}`,
                },
            });
            const data = await res.json();
            console.log(`[Scheduler] Daily: ${data.reminders?.jobsCreated || 0} reminders, ${data.queue?.processed || 0} processed`);
        } catch (err) {
            console.error("[Scheduler] Daily run error:", err);
        }
    });

    // Second pass at 1:00 PM
    cron.schedule("0 13 * * *", async () => {
        if (!canRunScheduledTask("Afternoon")) return;
        try {
            const res = await fetch(buildInternalAppUrl("/api/jobs/scheduler"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${JOBS_SECRET}`,
                },
            });
            const data = await res.json();
            console.log(`[Scheduler] Afternoon: ${data.reminders?.jobsCreated || 0} reminders`);
        } catch (err) {
            console.error("[Scheduler] Afternoon run error:", err);
        }
    });

    // Operational checks every hour (route decides if distribution runs by configured hour)
    cron.schedule("5 * * * *", async () => {
        if (!canRunScheduledTask("Operacoes")) return;
        try {
            const res = await fetch(buildInternalAppUrl("/api/jobs/operacoes"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${JOBS_SECRET}`,
                },
            });
            const data = await res.json();
            if (data?.distributionResult?.movidos > 0 || data?.sla?.conversasPendentes > 0 || data?.sla?.atendimentosPendentes > 0) {
                console.log(
                    `[Scheduler] Operações: ${data.distributionResult?.movidos || 0} movidos, ` +
                    `${data.sla?.conversasPendentes || 0} conv SLA, ${data.sla?.atendimentosPendentes || 0} atend SLA`
                );
            }
        } catch (err) {
            console.error("[Scheduler] Operações run error:", err);
        }
    });

    // Publications capture checks every hour (route decides if capture runs by configured hour)
    cron.schedule("20 * * * *", async () => {
        if (!canRunScheduledTask("Publicacoes")) return;
        try {
            const res = await fetch(buildInternalAppUrl("/api/jobs/publicacoes"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${JOBS_SECRET}`,
                },
            });
            const data = await res.json();
            if (data?.skipped === false) {
                console.log(
                    `[Scheduler] Publicações: ${data?.result?.capturadas || 0} capturadas, ` +
                        `${data?.result?.importadas || 0} importadas, ${data?.result?.duplicadas || 0} duplicadas`
                );
            }
        } catch (err) {
            console.error("[Scheduler] Publicações run error:", err);
        }
    });

    // Demandas planning scheduler checks every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
        if (!canRunScheduledTask("Demandas")) return;
        try {
            const res = await fetch(buildInternalAppUrl("/api/jobs/demandas"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${JOBS_SECRET}`,
                },
            });
            const data = await res.json();
            const executados = Number(data?.result?.executados || 0);
            if (executados > 0) {
                console.log(`[Scheduler] Demandas: ${executados} escopo(s) executado(s)`);
            }
        } catch (err) {
            console.error("[Scheduler] Demandas run error:", err);
        }
    });

    // National automation queue every 15 minutes
    cron.schedule("*/15 * * * *", async () => {
        if (!canRunScheduledTask("Automacao nacional")) return;
        try {
            const res = await fetch(buildInternalAppUrl("/api/jobs/automacao-nacional"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${JOBS_SECRET}`,
                },
                body: JSON.stringify({ limit: 1 }),
            });
            const data = await res.json();
            const processados = Number(data?.result?.processados || 0);
            if (processados > 0) {
                console.log(
                    `[Scheduler] Automação nacional: ${processados} job(s) processado(s), ${Number(data?.result?.pendentes || 0)} pendente(s)`
                );
            }
        } catch (err) {
            console.error("[Scheduler] Automação nacional run error:", err);
        }
    });

    // DataJud monitor every 6 hours
    cron.schedule("40 */6 * * *", async () => {
        if (!canRunScheduledTask("DataJud monitor")) return;
        try {
            const res = await fetch(buildInternalAppUrl("/api/jobs/datajud-monitor"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${JOBS_SECRET}`,
                },
                body: JSON.stringify({ force: false }),
            });
            const data = await res.json();
            const result = data?.result;
            if (result?.skipped !== true) {
                console.log(
                    `[Scheduler] DataJud monitor: ${result?.state?.validationStatus || "UNCONFIGURED"} (${result?.state?.validationSource || "NONE"})`
                );
            }
        } catch (err) {
            console.error("[Scheduler] DataJud monitor run error:", err);
        }
    });

    // DataJud aliases update daily
    cron.schedule("10 3 * * *", async () => {
        if (!canRunScheduledTask("DataJud aliases")) return;
        try {
            const res = await fetch(buildInternalAppUrl("/api/jobs/datajud-aliases"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${JOBS_SECRET}`,
                },
                body: JSON.stringify({ force: false }),
            });
            const data = await res.json();
            const result = data?.result;
            if (result?.skipped !== true) {
                console.log(
                    `[Scheduler] DataJud aliases: ${Number(result?.tribunaisAtualizados || 0)} atualizado(s) (extraidos=${Number(result?.aliasesExtraidos || 0)})`
                );
            }
        } catch (err) {
            console.error("[Scheduler] DataJud aliases run error:", err);
        }
    });

    // LGPD retention policies daily
    cron.schedule("40 2 * * *", async () => {
        if (!canRunScheduledTask("LGPD retention")) return;
        try {
            const res = await fetch(buildInternalAppUrl("/api/jobs/lgpd-retention"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${JOBS_SECRET}`,
                },
            });
            const data = await res.json();
            const processed = Number(data?.result?.policiesProcessed || 0);
            if (processed > 0) {
                console.log(`[Scheduler] LGPD retention: ${processed} politica(s) executada(s)`);
            }
        } catch (err) {
            console.error("[Scheduler] LGPD retention run error:", err);
        }
    });

    // BI snapshots daily
    cron.schedule("15 2 * * *", async () => {
        if (!canRunScheduledTask("BI refresh")) return;
        try {
            const res = await fetch(buildInternalAppUrl("/api/jobs/bi-refresh"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${JOBS_SECRET}`,
                },
            });
            const data = await res.json();
            if (data?.ok) {
                console.log(`[Scheduler] BI snapshots: ${data?.result?.totalSnapshots || 0} snapshot(s) atualizados`);
            }
        } catch (err) {
            console.error("[Scheduler] BI refresh run error:", err);
        }
    });

    initialized = true;
    console.log("[Scheduler] Cron jobs initialized successfully");
}
