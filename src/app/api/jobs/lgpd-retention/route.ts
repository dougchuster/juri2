import { NextRequest, NextResponse } from "next/server";
import { isJobRequestAuthorized } from "@/lib/auth/job-auth";
import { executeActiveRetentionPolicies } from "@/lib/services/lgpd-retention";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        const body = await req.json().catch(() => ({}));
        const secret = authHeader?.replace("Bearer ", "") || (body as Record<string, string>).secret;

        if (!isJobRequestAuthorized({ req, body: { secret } })) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const result = await executeActiveRetentionPolicies({
            mode: "AUTO",
            dryRun: false,
        });

        return NextResponse.json({
            ok: true,
            result,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: "Internal error",
                details: error instanceof Error ? error.message : "Unknown",
            },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    const secret = req.nextUrl.searchParams.get("secret");
    if (!isJobRequestAuthorized({ req, querySecret: secret })) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await executeActiveRetentionPolicies({
        mode: "AUTO",
        dryRun: false,
    });

    return NextResponse.json({
        ok: true,
        result,
        timestamp: new Date().toISOString(),
    });
}
