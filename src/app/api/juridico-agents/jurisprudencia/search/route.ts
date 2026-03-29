import { NextRequest, NextResponse } from "next/server";

import { buscarRagJuridicoAction } from "@/actions/rag-juridico";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const result = await buscarRagJuridicoAction({
        query: params.get("query") ?? params.get("q") ?? "",
        tribunal: params.get("tribunal"),
        area: params.get("area"),
        topK: params.get("topK") ?? undefined,
    });

    if (!result.success) {
        const status = result.error === "Nao autenticado." ? 401 : result.error.includes("desativado") ? 410 : 400;
        return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result.data);
}
