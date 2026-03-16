import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// 1x1 transparent GIF pixel
const PIXEL_GIF = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
);

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ campaignId: string; recipientId: string }> }
) {
    const { campaignId, recipientId } = await params;

    // Fire-and-forget tracking — never fail the request
    db.campaignRecipient
        .findFirst({
            where: { id: recipientId, campaignId },
            select: { id: true, openedAt: true },
        })
        .then(async (recipient) => {
            if (!recipient) return;

            const now = new Date();
            // Update recipient if not already opened
            await db.campaignRecipient.update({
                where: { id: recipientId },
                data: { openedAt: recipient.openedAt ?? now },
            });

            // Increment campaign open count (only first open per recipient)
            if (!recipient.openedAt) {
                await db.campaign.update({
                    where: { id: campaignId },
                    data: { openCount: { increment: 1 } },
                });
            }
        })
        .catch(() => {/* silent */});

    return new NextResponse(PIXEL_GIF, {
        status: 200,
        headers: {
            "Content-Type": "image/gif",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    });
}
