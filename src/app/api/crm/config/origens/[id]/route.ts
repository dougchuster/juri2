import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCRMAuth, canManageCRMConfiguration } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        if (!canManageCRMConfiguration(auth.user)) {
            return NextResponse.json({ error: "Sem permissao para gerenciar origens." }, { status: 403 });
        }

        const { id } = await params;
        const body = (await request.json()) as { nome?: string };
        const nome = (body.nome || "").trim();
        if (!nome) return NextResponse.json({ error: "Nome e obrigatorio." }, { status: 400 });

        const item = await db.origemCliente.update({
            where: { id },
            data: { nome },
        });
        return NextResponse.json(item);
    } catch (error: unknown) {
        console.error("[CRM_ORIGENS_PATCH]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        if (!canManageCRMConfiguration(auth.user)) {
            return NextResponse.json({ error: "Sem permissao para gerenciar origens." }, { status: 403 });
        }

        const { id } = await params;
        await db.origemCliente.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("[CRM_ORIGENS_DELETE]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
