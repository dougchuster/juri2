import { NextResponse } from "next/server";

import { getRagJuridicoStatusAction } from "@/actions/rag-juridico";

export const dynamic = "force-dynamic";

export async function GET() {
    const result = await getRagJuridicoStatusAction();

    if (!result.success) {
        const status = result.error === "Nao autenticado." ? 401 : result.error.includes("desativado") ? 410 : 400;
        return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result.data);
}
