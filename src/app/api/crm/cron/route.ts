import { NextResponse } from "next/server";
import { processCampaignBatch } from "@/lib/services/cron-engine";
import { scheduleReminders, processJobQueue } from "@/lib/services/communication-engine";
import { AutomationEngine } from "@/lib/services/automation-engine";
import { isJobRequestAuthorized } from "@/lib/auth/job-auth";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
    return isJobRequestAuthorized({ req: request });
}

export async function GET(request: Request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const [campaign, reminders, queue, automations] = await Promise.all([
            processCampaignBatch(),
            scheduleReminders(),
            processJobQueue(80),
            AutomationEngine.processPendingExecutions(80),
        ]);

        return NextResponse.json({
            success: true,
            message: "Cron CRM executado com sucesso.",
            metrics: {
                campaigns: campaign,
                reminders,
                communicationQueue: queue,
                automations,
            },
        });
    } catch (error) {
        console.error("[CRM_CRON]", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Erro no cron CRM",
            },
            { status: 500 }
        );
    }
}
