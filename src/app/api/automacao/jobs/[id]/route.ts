import { NextRequest, NextResponse } from "next/server";
import { getAutomacaoJobStatus } from "@/lib/services/automacao-nacional";
import { isJobRequestAuthorized } from "@/lib/auth/job-auth";

function isAuthorized(req: NextRequest) {
  const secretQuery = req.nextUrl.searchParams.get("secret") || "";
  return isJobRequestAuthorized({ req, querySecret: secretQuery });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await getAutomacaoJobStatus(id);
    if (!data) {
      return NextResponse.json({ error: "Job nao encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    console.error("[AutomacaoNacional] Erro ao consultar status:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erro interno." },
      { status: 500 }
    );
  }
}
