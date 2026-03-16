import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recalculateSegmentMembers, previewSegment } from "@/lib/services/segment-engine";
import { requireCRMAuth } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        const escritorioId = auth.user.escritorioId;
        if (!escritorioId) return NextResponse.json({ error: "Escritorio nao configurado." }, { status: 400 });
        const { id } = await params;

        const segment = await db.contactSegment.findFirst({
            where: { id, escritorioId },
            include: {
                _count: { select: { members: true, campaigns: true } },
                members: {
                    take: 100,
                    include: {
                        cliente: {
                            select: {
                                id: true,
                                nome: true,
                                email: true,
                                celular: true,
                                whatsapp: true,
                                status: true,
                                tipoPessoa: true,
                            },
                        },
                    },
                    orderBy: { addedAt: "desc" },
                },
            },
        });

        if (!segment) return NextResponse.json({ error: "Segmento nao encontrado" }, { status: 404 });
        return NextResponse.json(segment);
    } catch (error) {
        console.error("[CRM_SEGMENTO_GET]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        const escritorioId = auth.user.escritorioId;
        if (!escritorioId) return NextResponse.json({ error: "Escritorio nao configurado." }, { status: 400 });
        const { id } = await params;

        const scoped = await db.contactSegment.findFirst({
            where: { id, escritorioId },
            select: { id: true },
        });
        if (!scoped) return NextResponse.json({ error: "Segmento nao encontrado" }, { status: 404 });

        const body = await request.json();

        if (body.action === "recalculate") {
            const result = await recalculateSegmentMembers(id);
            return NextResponse.json({ success: true, ...result });
        }

        if (body.action === "preview") {
            const segment = await db.contactSegment.findFirst({
                where: { id, escritorioId },
                select: { rules: true },
            });
            if (!segment) return NextResponse.json({ error: "Segmento nao encontrado" }, { status: 404 });
            const preview = await previewSegment(segment.rules, Number(body.limit) || 100);
            return NextResponse.json(preview);
        }

        const updated = await db.contactSegment.update({
            where: { id },
            data: {
                ...(body.name !== undefined ? { name: body.name } : {}),
                ...(body.description !== undefined ? { description: body.description } : {}),
                ...(body.rules !== undefined ? { rules: body.rules } : {}),
                ...(body.isDynamic !== undefined ? { isDynamic: Boolean(body.isDynamic) } : {}),
            },
        });

        if (body.rules !== undefined || body.isDynamic !== undefined) {
            await recalculateSegmentMembers(id);
        }

        return NextResponse.json(updated);
    } catch (error: unknown) {
        console.error("[CRM_SEGMENTO_PATCH]", error);
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
        const scoped = await db.contactSegment.findFirst({
            where: { id, escritorioId },
            select: { id: true },
        });
        if (!scoped) return NextResponse.json({ error: "Segmento nao encontrado" }, { status: 404 });

        await db.contactSegment.delete({ where: { id: scoped.id } });
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("[CRM_SEGMENTO_DELETE]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
