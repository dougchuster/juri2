import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CanalComunicacao } from "@/generated/prisma";
import { db } from "@/lib/db";
import { requireCRMAuth, canManageCRMConfiguration } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

const CANAL_VALUES = ["WHATSAPP", "EMAIL"] as const;

const updateSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    canal: z.enum(CANAL_VALUES).optional().nullable(),
    category: z.string().min(1).max(60).optional(),
    subject: z.string().max(200).optional().nullable(),
    content: z.string().min(1).optional(),
    contentHtml: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
});

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireCRMAuth();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const template = await db.messageTemplate.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ error: "Template não encontrado." }, { status: 404 });
    return NextResponse.json(template);
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireCRMAuth();
    if (!auth.ok) return auth.response;
    if (!canManageCRMConfiguration(auth.user)) {
        return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

    try {
        const { canal, ...rest } = parsed.data;
        const template = await db.messageTemplate.update({
            where: { id },
            data: {
                ...rest,
                ...(canal !== undefined ? { canal: canal as CanalComunicacao | null } : {}),
            },
        });
        return NextResponse.json(template);
    } catch {
        return NextResponse.json({ error: "Erro ao atualizar template." }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireCRMAuth();
    if (!auth.ok) return auth.response;
    if (!canManageCRMConfiguration(auth.user)) {
        return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    const { id } = await params;
    try {
        await db.messageTemplate.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Erro ao excluir template." }, { status: 500 });
    }
}
