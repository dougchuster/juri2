import { NextRequest, NextResponse } from "next/server";
import { processarFilaAutomacaoNacional } from "@/lib/services/automacao-nacional";
import { isJobRequestAuthorized } from "@/lib/auth/job-auth";

function isAuthorized(req: NextRequest, body: Record<string, unknown>) {
  return isJobRequestAuthorized({ req, body, querySecret: String(body.secret || "") });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (!isAuthorized(req, body)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = Number(body.limit ?? 1);
    const result = await processarFilaAutomacaoNacional(limit);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[Jobs Automação Nacional] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro interno no job de automacao nacional.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
