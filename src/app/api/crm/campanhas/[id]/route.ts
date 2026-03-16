import { NextResponse } from "next/server";
import { getCampaignById } from "@/lib/dal/crm/campaigns";
import { requireCRMAuth } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const { id } = await params;

        const escritorioId = auth.user.escritorioId;
        if (!escritorioId) return NextResponse.json({ error: "No escritorio configured" }, { status: 400 });

        const campaign = await getCampaignById(id, escritorioId);
        if (!campaign) {
            return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
        }

        return NextResponse.json(campaign);
    } catch (error) {
        console.error("[API] Error fetching campaign detail:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
