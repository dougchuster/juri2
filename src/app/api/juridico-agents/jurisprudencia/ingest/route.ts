import { NextRequest, NextResponse } from "next/server";

import { ingestRagJuridicoAction } from "@/actions/rag-juridico";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => ({}));
    const result = await ingestRagJuridicoAction(body);

    if (!result.success) {
        const status =
            result.error === "Nao autenticado."
                ? 401
                : result.error.includes("Acesso negado")
                ? 403
                : result.error.includes("desativado")
                ? 410
                : 400;
        return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result.data);
}
