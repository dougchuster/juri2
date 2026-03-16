import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCRMAuth, canManageCRMConfiguration } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const items = await db.origemCliente.findMany({
            orderBy: { nome: "asc" },
        });
        return NextResponse.json(items);
    } catch (error: unknown) {
        console.error("[CRM_ORIGENS_GET]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        if (!canManageCRMConfiguration(auth.user)) {
            return NextResponse.json({ error: "Sem permissao para gerenciar origens." }, { status: 403 });
        }

        const body = (await request.json()) as { nome?: string };
        const nome = (body.nome || "").trim();
        if (!nome) return NextResponse.json({ error: "Nome e obrigatorio." }, { status: 400 });

        const item = await db.origemCliente.create({ data: { nome } });
        return NextResponse.json(item, { status: 201 });
    } catch (error: unknown) {
        console.error("[CRM_ORIGENS_POST]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
