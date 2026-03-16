import { NextRequest, NextResponse } from "next/server";
import {
  iniciarAutomacaoBuscaNacional,
  listarAutomacaoJobsRecentes,
} from "@/lib/services/automacao-nacional";
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

    const runNowRaw = body.runNow;
    const runNow = runNowRaw === undefined ? true : String(runNowRaw).toLowerCase() === "true";

    const job = await iniciarAutomacaoBuscaNacional({
      advogadoId: typeof body.advogadoId === "string" ? body.advogadoId : undefined,
      modo: typeof body.modo === "string" ? body.modo : "NACIONAL",
      lookbackDays: Number(body.lookbackDays ?? 1),
      runNow,
      forceCatalogSync: String(body.forceCatalogSync || "").toLowerCase() === "true",
      allowInlineFallback: false,
    });

    return NextResponse.json({ ok: true, jobId: job.id, job });
  } catch (error) {
    console.error("[AutomacaoNacional] Erro ao iniciar:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro interno ao iniciar automacao nacional.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const body = {
      secret: req.nextUrl.searchParams.get("secret") || "",
    };
    if (!isAuthorized(req, body)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = Number(req.nextUrl.searchParams.get("limit") || 20);
    const jobs = await listarAutomacaoJobsRecentes(limit);
    return NextResponse.json({ ok: true, jobs });
  } catch (error) {
    console.error("[AutomacaoNacional] Erro ao listar jobs:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erro interno." },
      { status: 500 }
    );
  }
}
