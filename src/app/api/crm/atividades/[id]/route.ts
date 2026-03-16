import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CRMActivityOutcome } from "@/generated/prisma";
import { deleteCRMActivity, updateCRMActivity } from "@/lib/dal/crm/activities";
import { requireCRMAuth } from "@/lib/auth/crm-auth";
import { buildActivityVisibilityWhere } from "@/lib/auth/crm-scope";
import { isUserScopedCRM } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

function parseOutcome(value: unknown): CRMActivityOutcome | undefined {
    if (typeof value !== "string") return undefined;
    return Object.values(CRMActivityOutcome).includes(value as CRMActivityOutcome)
        ? (value as CRMActivityOutcome)
        : undefined;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        const { id } = await params;
        const escritorioId = auth.user.escritorioId;
        if (!escritorioId) return NextResponse.json({ error: "Escritorio nao configurado." }, { status: 400 });
        const activityScope = buildActivityVisibilityWhere(auth.user);

        const scoped = await db.cRMActivity.findFirst({
            where: { AND: [{ id, escritorioId }, activityScope] },
            select: { id: true },
        });
        if (!scoped) return NextResponse.json({ error: "Atividade nao encontrada." }, { status: 404 });

        const body = await request.json();

        const updated = await updateCRMActivity(id, {
            ...(body.type !== undefined ? { type: body.type } : {}),
            ...(body.subject !== undefined ? { subject: body.subject } : {}),
            ...(body.description !== undefined ? { description: body.description } : {}),
            ...(body.scheduledAt !== undefined ? { scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null } : {}),
            ...(body.completedAt !== undefined ? { completedAt: body.completedAt ? new Date(body.completedAt) : null } : {}),
            ...(body.nextStep !== undefined ? { nextStep: body.nextStep } : {}),
            ...(body.ownerId !== undefined ? { ownerId: isUserScopedCRM(auth.user) ? auth.user.id : body.ownerId } : {}),
            ...(body.clienteId !== undefined ? { clienteId: body.clienteId } : {}),
            ...(body.cardId !== undefined ? { cardId: body.cardId } : {}),
            ...(body.processoId !== undefined ? { processoId: body.processoId } : {}),
            ...(body.outcome !== undefined ? { outcome: parseOutcome(body.outcome) ?? body.outcome } : {}),
        });

        if (updated.clienteId && updated.completedAt) {
            await db.cliente.update({
                where: { id: updated.clienteId },
                data: { lastContactAt: updated.completedAt },
            });
        }

        return NextResponse.json(updated);
    } catch (error: unknown) {
        console.error("[CRM_ATIVIDADES_PATCH]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        const { id } = await params;
        const escritorioId = auth.user.escritorioId;
        if (!escritorioId) return NextResponse.json({ error: "Escritorio nao configurado." }, { status: 400 });
        const activityScope = buildActivityVisibilityWhere(auth.user);

        const scoped = await db.cRMActivity.findFirst({
            where: { AND: [{ id, escritorioId }, activityScope] },
            select: { id: true },
        });
        if (!scoped) return NextResponse.json({ error: "Atividade nao encontrada." }, { status: 404 });

        await deleteCRMActivity(id);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("[CRM_ATIVIDADES_DELETE]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
