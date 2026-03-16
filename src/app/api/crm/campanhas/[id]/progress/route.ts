import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCRMAuth } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        const escritorioId = auth.user.escritorioId;
        if (!escritorioId) return NextResponse.json({ error: "Escritorio nao configurado." }, { status: 400 });
        const { id } = await params;
        const campaign = await db.campaign.findFirst({
            where: {
                id,
                escritorioId,
            },
            select: {
                id: true,
                status: true,
                totalRecipients: true,
                sentCount: true,
                failedCount: true,
                openCount: true,
                replyCount: true,
                updatedAt: true,
            },
        });

        if (!campaign) return NextResponse.json({ error: "Campanha nao encontrada" }, { status: 404 });

        return NextResponse.json({
            ...campaign,
            processed: campaign.sentCount + campaign.failedCount,
            progressPct: campaign.totalRecipients > 0 ? Math.round(((campaign.sentCount + campaign.failedCount) / campaign.totalRecipients) * 100) : 0,
        });
    } catch {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
