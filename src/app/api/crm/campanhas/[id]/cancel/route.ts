import { NextResponse } from "next/server";
import { updateCampaignStatus } from "@/lib/dal/crm/campaigns";
import { requireCRMAuth, canManageCRMConfiguration } from "@/lib/auth/crm-auth";
import { db } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        if (!canManageCRMConfiguration(auth.user)) {
            return NextResponse.json({ error: "Sem permissao para gerenciar campanhas." }, { status: 403 });
        }
        const escritorioId = auth.user.escritorioId;
        if (!escritorioId) return NextResponse.json({ error: "Escritorio nao configurado." }, { status: 400 });
        const { id } = await params;

        const campaign = await db.campaign.findFirst({
            where: { id, escritorioId },
            select: { id: true },
        });
        if (!campaign) return NextResponse.json({ error: "Campanha nao encontrada." }, { status: 404 });

        await updateCampaignStatus(id, "CANCELLED");
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
