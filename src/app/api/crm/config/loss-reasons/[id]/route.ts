import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCRMAuth, canManageCRMConfiguration } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        if (!canManageCRMConfiguration(auth.user)) {
            return NextResponse.json({ error: "Sem permissao para configurar motivos de perda." }, { status: 403 });
        }
        const escritorioId = auth.user.escritorioId;
        if (!escritorioId) return NextResponse.json({ error: "Escritorio nao configurado." }, { status: 400 });
        const { id } = await params;

        const scoped = await db.cRMLossReason.findFirst({
            where: { id, escritorioId },
            select: { id: true },
        });
        if (!scoped) return NextResponse.json({ error: "Motivo de perda nao encontrado." }, { status: 404 });

        const body = await request.json();

        const updated = await db.cRMLossReason.update({
            where: { id: scoped.id },
            data: {
                ...(body.nome !== undefined ? { nome: body.nome } : {}),
                ...(body.descricao !== undefined ? { descricao: body.descricao } : {}),
                ...(body.ativo !== undefined ? { ativo: Boolean(body.ativo) } : {}),
            },
        });

        return NextResponse.json(updated);
    } catch (error: unknown) {
        console.error("[CRM_LOSS_REASONS_PATCH]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        if (!canManageCRMConfiguration(auth.user)) {
            return NextResponse.json({ error: "Sem permissao para configurar motivos de perda." }, { status: 403 });
        }
        const escritorioId = auth.user.escritorioId;
        if (!escritorioId) return NextResponse.json({ error: "Escritorio nao configurado." }, { status: 400 });
        const { id } = await params;

        const scoped = await db.cRMLossReason.findFirst({
            where: { id, escritorioId },
            select: { id: true },
        });
        if (!scoped) return NextResponse.json({ error: "Motivo de perda nao encontrado." }, { status: 404 });

        await db.cRMLossReason.delete({ where: { id: scoped.id } });
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("[CRM_LOSS_REASONS_DELETE]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
