import { NextRequest, NextResponse } from "next/server";
import { runDataJudMonitorCheck } from "@/lib/services/datajud-monitor";
import { isJobRequestAuthorized } from "@/lib/auth/job-auth";

function isAuthorized(req: NextRequest, body: Record<string, unknown>) {
  return isJobRequestAuthorized({ req, body, querySecret: String(body.secret || "") });
}

async function run(body: Record<string, unknown>) {
  const force = String(body.force || "").toLowerCase() === "true";
  return runDataJudMonitorCheck({ force });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (!isAuthorized(req, body)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await run(body);
    return NextResponse.json({ ok: result.success, result });
  } catch (error) {
    console.error("[Jobs DataJud Monitor] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Erro interno no monitor de chave DataJud.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const body: Record<string, unknown> = {
      secret: req.nextUrl.searchParams.get("secret") || "",
      force: req.nextUrl.searchParams.get("force") || "",
    };
    if (!isAuthorized(req, body)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await run(body);
    return NextResponse.json({ ok: result.success, result });
  } catch (error) {
    console.error("[Jobs datajud-monitor GET] Error:", error);
    return NextResponse.json(
      { error: "Internal error", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
