import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ campaignId: string; recipientId: string }> }
) {
    const { campaignId, recipientId } = await params;
    const { searchParams } = new URL(req.url);
    const destination = searchParams.get("url");

    // Fire-and-forget tracking
    db.campaignRecipient
        .findFirst({
            where: { id: recipientId, campaignId },
            select: { id: true, clickedAt: true },
        })
        .then(async (recipient) => {
            if (!recipient) return;

            const now = new Date();
            const isFirstClick = !recipient.clickedAt;

            await db.campaignRecipient.update({
                where: { id: recipientId },
                data: {
                    clickedAt: recipient.clickedAt ?? now,
                    clickCount: { increment: 1 },
                },
            });

            if (isFirstClick) {
                await db.campaign.update({
                    where: { id: campaignId },
                    data: { clickCount: { increment: 1 } },
                });
            }
        })
        .catch(() => {/* silent */});

    // Redirect to actual destination
    if (destination) {
        try {
            const url = new URL(destination);
            return NextResponse.redirect(url.toString(), { status: 302 });
        } catch {
            // invalid url — redirect home
        }
    }

    return NextResponse.redirect(new URL("/", req.url), { status: 302 });
}
