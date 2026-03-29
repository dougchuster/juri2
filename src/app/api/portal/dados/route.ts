import { NextRequest, NextResponse } from "next/server";

import { verificarTokenPortal } from "@/lib/portal/portal-token";
import { getPortalData } from "@/lib/services/portal-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.json({ error: "Token obrigatorio" }, { status: 401 });
        }

        const verificacao = await verificarTokenPortal(token);
        if (!verificacao.ok) {
            return NextResponse.json({ error: verificacao.error }, { status: 401 });
        }

        const portalData = await getPortalData(verificacao.clienteId);
        if (!portalData) {
            return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 });
        }

        return NextResponse.json(portalData);
    } catch (error) {
        console.error("[Portal Dados] Erro:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
