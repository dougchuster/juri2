import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { requireCRMAuth } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
    name: z.string().min(1).max(80).optional(),
    filters: z.record(z.string(), z.unknown()).optional(),
    isShared: z.boolean().optional(),
});

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireCRMAuth();
    if (!auth.ok) return auth.response;

    const { id } = await params;

    const view = await db.cRMSavedView.findFirst({
        where: { id, userId: auth.user.id },
    });
    if (!view) return NextResponse.json({ error: "View não encontrada." }, { status: 404 });

    await db.cRMSavedView.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireCRMAuth();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const view = await db.cRMSavedView.findFirst({
        where: { id, userId: auth.user.id },
    });
    if (!view) return NextResponse.json({ error: "View não encontrada." }, { status: 404 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

    const updateData: Prisma.CRMSavedViewUpdateInput = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.isShared !== undefined) updateData.isShared = parsed.data.isShared;
    if (parsed.data.filters !== undefined) updateData.filters = parsed.data.filters as Prisma.InputJsonValue;

    const updated = await db.cRMSavedView.update({
        where: { id },
        data: updateData,
    });

    return NextResponse.json(updated);
}
