import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { previewSegment } from "@/lib/services/segment-engine";
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
            select: { rules: true },
        });
        if (!segment) {
            return NextResponse.json({ error: "Segmento nao encontrado" }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") || 100)));

        const preview = await previewSegment(segment.rules, limit);
        return NextResponse.json(preview);
    } catch (error) {
        console.error("[CRM_SEGMENTO_PREVIEW]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
