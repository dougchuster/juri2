import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCRMAuth } from "@/lib/auth/crm-auth";
import { buildDocumentVisibilityWhere } from "@/lib/auth/crm-scope";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        const escritorioId = auth.user.escritorioId;
        if (!escritorioId) return NextResponse.json({ error: "Escritorio nao configurado." }, { status: 400 });
        const { id } = await params;
        const documentScope = buildDocumentVisibilityWhere(auth.user);

        const scoped = await db.cRMCommercialDocument.findFirst({
            where: {
                AND: [{ id, escritorioId }, documentScope],
            },
            select: { id: true },
        });
        if (!scoped) return NextResponse.json({ error: "Documento nao encontrado." }, { status: 404 });

        const body = await request.json();

        const updated = await db.cRMCommercialDocument.update({
            where: { id },
            data: {
                ...(body.nome !== undefined ? { nome: body.nome } : {}),
                ...(body.descricao !== undefined ? { descricao: body.descricao } : {}),
                ...(body.fileUrl !== undefined ? { fileUrl: body.fileUrl } : {}),
                ...(body.version !== undefined ? { version: Number(body.version) } : {}),
                ...(body.templateName !== undefined ? { templateName: body.templateName } : {}),
                ...(body.mergeData !== undefined ? { mergeData: body.mergeData } : {}),
                ...(body.signedAt !== undefined ? { signedAt: body.signedAt ? new Date(body.signedAt) : null } : {}),
                ...(body.cardId !== undefined ? { cardId: body.cardId } : {}),
                ...(body.clienteId !== undefined ? { clienteId: body.clienteId } : {}),
                ...(body.processoId !== undefined ? { processoId: body.processoId } : {}),
            },
        });

        return NextResponse.json(updated);
    } catch (error: unknown) {
        console.error("[CRM_DOCS_PATCH]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        const escritorioId = auth.user.escritorioId;
        if (!escritorioId) return NextResponse.json({ error: "Escritorio nao configurado." }, { status: 400 });
        const { id } = await params;
        const documentScope = buildDocumentVisibilityWhere(auth.user);

        const scoped = await db.cRMCommercialDocument.findFirst({
            where: {
                AND: [{ id, escritorioId }, documentScope],
            },
            select: { id: true },
        });
        if (!scoped) return NextResponse.json({ error: "Documento nao encontrado." }, { status: 404 });

        await db.cRMCommercialDocument.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("[CRM_DOCS_DELETE]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
