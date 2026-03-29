import { NextRequest, NextResponse } from "next/server";
import { scheduleReminders, processJobQueue } from "@/lib/services/communication-engine";
import { scheduleMeetingAutomationBatch, syncMeetingReminderStatuses } from "@/lib/services/meeting-automation-service";
import { scheduleReguaCobrancaRun } from "@/lib/services/regua-cobranca";
import { isJobRequestAuthorized } from "@/lib/auth/job-auth";
import {
    executarPlanejamentoAgendadoDemandas,
    executarRegrasGeracaoRotinasDemandas,
    executarRotinasRecorrentesDemandas,
} from "@/actions/demandas";

/**
 * POST /api/jobs/scheduler
 * Scheduler endpoint — checks for upcoming deadlines and creates reminder jobs,
 * then processes the job queue.
 * 
 * Protected by JOBS_SECRET_KEY.
 * Called daily by the node-cron scheduler or external cron.
 */
export async function POST(req: NextRequest) {
    try {
        // Validate secret key
        const authHeader = req.headers.get("authorization");
        const body = await req.json().catch(() => ({}));
        const secret = authHeader?.replace("Bearer ", "") || (body as Record<string, string>).secret;

        if (!isJobRequestAuthorized({ req, body: { secret } })) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Step 1: Schedule reminders (creates jobs)
        const reminderResult = await scheduleReminders();
        const meetingReminderResult = await scheduleMeetingAutomationBatch();
        const reguaCobrancaResult = await scheduleReguaCobrancaRun();

        // Step 2: Process the job queue
        const queueResult = await processJobQueue(50);
        const meetingStatusResult = await syncMeetingReminderStatuses();
        const regrasResult = await executarRegrasGeracaoRotinasDemandas({
            modo: "AUTO",
            simular: false,
        });
        const rotinasResult = await executarRotinasRecorrentesDemandas({ modo: "AUTO" });
        const planejamentoAgendadoResult = await executarPlanejamentoAgendadoDemandas({
            modo: "AUTO",
            force: false,
            simular: false,
        });

        return NextResponse.json({
            ok: true,
            reminders: reminderResult,
            meetingReminders: meetingReminderResult,
            reguaCobranca: reguaCobrancaResult,
            queue: queueResult,
            meetingReminderStatus: meetingStatusResult,
            regrasDemandas: regrasResult.success ? regrasResult.result : { error: regrasResult.error },
            rotinasDemandas: rotinasResult.success ? rotinasResult.result : { error: rotinasResult.error },
            planejamentoAgendadoDemandas: planejamentoAgendadoResult.success
                ? planejamentoAgendadoResult.result
                : { error: planejamentoAgendadoResult.error },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("[Jobs Scheduler] Error:", error);
        return NextResponse.json(
            { error: "Internal error", details: error instanceof Error ? error.message : "Unknown" },
            { status: 500 }
        );
    }
}

// GET for simple external cron
export async function GET(req: NextRequest) {
    const secret = req.nextUrl.searchParams.get("secret");
    if (!isJobRequestAuthorized({ req, querySecret: secret })) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reminderResult = await scheduleReminders();
    const meetingReminderResult = await scheduleMeetingAutomationBatch();
    const reguaCobrancaResult = await scheduleReguaCobrancaRun();
    const queueResult = await processJobQueue(50);
    const meetingStatusResult = await syncMeetingReminderStatuses();
    const regrasResult = await executarRegrasGeracaoRotinasDemandas({
        modo: "AUTO",
        simular: false,
    });
    const rotinasResult = await executarRotinasRecorrentesDemandas({ modo: "AUTO" });
    const planejamentoAgendadoResult = await executarPlanejamentoAgendadoDemandas({
        modo: "AUTO",
        force: false,
        simular: false,
    });

    return NextResponse.json({
        ok: true,
        reminders: reminderResult,
        meetingReminders: meetingReminderResult,
        reguaCobranca: reguaCobrancaResult,
        queue: queueResult,
        meetingReminderStatus: meetingStatusResult,
        regrasDemandas: regrasResult.success ? regrasResult.result : { error: regrasResult.error },
        rotinasDemandas: rotinasResult.success ? rotinasResult.result : { error: rotinasResult.error },
        planejamentoAgendadoDemandas: planejamentoAgendadoResult.success
            ? planejamentoAgendadoResult.result
            : { error: planejamentoAgendadoResult.error },
    });
}
