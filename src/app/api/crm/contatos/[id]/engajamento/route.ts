import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCRMAuth } from "@/lib/auth/crm-auth";
import { buildContatoVisibilityWhere, ensureScopedWhere } from "@/lib/auth/crm-scope";

export const dynamic = "force-dynamic";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireCRMAuth();
    if (!auth.ok) return auth.response;

    const { id: clienteId } = await params;

    // Verify the contact belongs to the authenticated user's scope
    const scopeWhere = buildContatoVisibilityWhere(auth.user);
    const contact = await db.cliente.findFirst({
        where: ensureScopedWhere({ id: clienteId }, scopeWhere),
        select: { id: true, nome: true },
    });

    if (!contact) {
        return NextResponse.json({ error: "Contato não encontrado." }, { status: 404 });
    }

    // Fetch all campaign interactions for this contact
    const recipients = await db.campaignRecipient.findMany({
        where: { clienteId },
        include: {
            campaign: {
                select: {
                    id: true,
                    name: true,
                    canal: true,
                    status: true,
                    createdAt: true,
                    abSubjectB: true,
                },
            },
        },
        orderBy: { sentAt: "desc" },
    });

    const stats = {
        totalCampaigns: recipients.length,
        sent: recipients.filter(r => r.status === "SENT" || r.status === "OPENED" || r.status === "CLICKED").length,
        opened: recipients.filter(r => r.openedAt != null).length,
        clicked: recipients.filter(r => r.clickedAt != null).length,
        replied: recipients.filter(r => r.repliedAt != null).length,
        failed: recipients.filter(r => r.status === "FAILED").length,
        optOut: recipients.filter(r => r.status === "OPT_OUT").length,
    };

    const openRate = stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0;
    const clickRate = stats.sent > 0 ? Math.round((stats.clicked / stats.sent) * 100) : 0;

    const interactions = recipients.map(r => ({
        id: r.id,
        campaignId: r.campaign.id,
        campaignName: r.campaign.name,
        canal: r.campaign.canal,
        campaignStatus: r.campaign.status,
        sentAt: r.sentAt,
        openedAt: r.openedAt,
        clickedAt: r.clickedAt,
        repliedAt: r.repliedAt,
        clickCount: r.clickCount,
        status: r.status,
        abVariant: r.abVariant,
        errorMessage: r.errorMessage,
    }));

    return NextResponse.json({
        contact: { id: contact.id, nome: contact.nome },
        stats: { ...stats, openRate, clickRate },
        interactions,
    });
}
