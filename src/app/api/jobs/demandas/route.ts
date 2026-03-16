import { NextRequest, NextResponse } from "next/server";
import { executarPlanejamentoAgendadoDemandas } from "@/actions/demandas";
import { isJobRequestAuthorized } from "@/lib/auth/job-auth";

function isAuthorized(req: NextRequest, body: Record<string, unknown>) {
    return isJobRequestAuthorized({ req, body, querySecret: String(body.secret || "") });
}

async function runDemandasJob(force = false, simular = false) {
    const result = await executarPlanejamentoAgendadoDemandas({
        modo: "AUTO",
        force,
        simular,
    });

    return {
        ok: true,
        force,
        simular,
        result: result.success ? result.result : { error: result.error },
        timestamp: new Date().toISOString(),
    };
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
        if (!isAuthorized(req, body)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const force = String(body.force || "").toLowerCase() === "true";
        const simular = String(body.simular || "").toLowerCase() === "true";
        const payload = await runDemandasJob(force, simular);
        return NextResponse.json(payload);
    } catch (error) {
        console.error("[Jobs Demandas] Error:", error);
        return NextResponse.json(
            { error: "Internal error", details: error instanceof Error ? error.message : "Unknown" },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const body = {
            secret: req.nextUrl.searchParams.get("secret") || "",
            force: req.nextUrl.searchParams.get("force") || "",
            simular: req.nextUrl.searchParams.get("simular") || "",
        };
        if (!isAuthorized(req, body)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const force = String(body.force).toLowerCase() === "true";
        const simular = String(body.simular).toLowerCase() === "true";
        const payload = await runDemandasJob(force, simular);
        return NextResponse.json(payload);
    } catch (error) {
        console.error("[Jobs Demandas GET] Error:", error);
        return NextResponse.json(
            { error: "Internal error", details: error instanceof Error ? error.message : "Unknown" },
            { status: 500 }
        );
    }
}
