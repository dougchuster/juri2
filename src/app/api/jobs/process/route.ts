import { NextRequest, NextResponse } from "next/server";
import { processJobQueue } from "@/lib/services/communication-engine";
import { syncMeetingReminderStatuses } from "@/lib/services/meeting-automation-service";
import { isJobRequestAuthorized } from "@/lib/auth/job-auth";

/**
 * POST /api/jobs/process
 * Worker endpoint — processes pending communication jobs from the queue.
 * Protected by JOBS_SECRET_KEY.
 * 
 * Can be called by:
 * - node-cron scheduler
 * - External cron service (e.g., Vercel Cron)
 * - Manual trigger from admin panel
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

        const limit = (body as Record<string, number>).limit || 20;

        const result = await processJobQueue(limit);
        const meetingReminderStatus = await syncMeetingReminderStatuses();

        return NextResponse.json({
            ok: true,
            ...result,
            meetingReminderStatus,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("[Jobs Process] Error:", error);
        return NextResponse.json(
            { error: "Internal error", details: error instanceof Error ? error.message : "Unknown" },
            { status: 500 }
        );
    }
}

// Also support GET for simple cron services
export async function GET(req: NextRequest) {
    const secret = req.nextUrl.searchParams.get("secret");
    if (!isJobRequestAuthorized({ req, querySecret: secret })) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await processJobQueue(20);
    const meetingReminderStatus = await syncMeetingReminderStatuses();
    return NextResponse.json({ ok: true, ...result, meetingReminderStatus });
}
