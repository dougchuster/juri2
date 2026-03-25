import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeMetaWebhookEvents, fetchMetaSenderProfile } from "@/lib/meta/meta-social";
import { checkRateLimit, getClientIp } from "@/lib/middleware/rate-limit";

// ─── GET — Webhook verification (hub challenge) ───────────────────────────────

export async function GET(req: NextRequest) {
    const mode = req.nextUrl.searchParams.get("hub.mode");
    const verifyToken = req.nextUrl.searchParams.get("hub.verify_token");
    const challenge = req.nextUrl.searchParams.get("hub.challenge");

    if (mode !== "subscribe" || !verifyToken || !challenge) {
        return NextResponse.json({ error: "Requisição de verificação inválida" }, { status: 400 });
    }

    const connection = await db.metaSocialConnection.findFirst({
        where: { verifyToken, isActive: true },
    });

    if (!connection) {
        return NextResponse.json({ error: "Verify token inválido" }, { status: 403 });
    }

    return new Response(challenge, { status: 200 });
}

// ─── POST — Receive messages ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    const ip = getClientIp(req.headers);
    const limit = checkRateLimit(ip, { maxRequests: 200, windowMs: 60_000 });
    if (!limit.allowed) {
        return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    let body: Record<string, unknown>;
    try {
        body = await req.json() as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    // Identify object type: "page" for Messenger, "instagram" for Instagram
    const objectType = body.object as string | undefined;
    if (objectType !== "page" && objectType !== "instagram") {
        return NextResponse.json({ ok: true, handled: false, reason: "unknown_object_type" });
    }

    const events = normalizeMetaWebhookEvents(body as Parameters<typeof normalizeMetaWebhookEvents>[0]);

    let handled = 0;
    for (const event of events) {
        // Echo = message sent from page (our own outgoing), skip most processing
        if (event.isEcho) continue;

        // Find the social connection by pageId + escritorioId scope
        const connection = await db.metaSocialConnection.findFirst({
            where: { pageId: event.pageId, isActive: true },
        });
        if (!connection) continue;

        // Update last webhook timestamp
        void db.metaSocialConnection.update({
            where: { id: connection.id },
            data: { lastWebhookAt: new Date() },
        }).catch(() => {/* non-critical */});

        // Find or create conversation
        let conversation = await db.conversation.findFirst({
            where: {
                metaSocialConnectionId: connection.id,
                externalSenderId: event.senderId,
            },
        });

        if (!conversation) {
            // Try to get sender name from Graph API
            const profile = await fetchMetaSenderProfile(connection.pageAccessToken, event.senderId);
            const senderName = profile.name ?? `Usuário ${event.channel === "INSTAGRAM_DM" ? "Instagram" : "Facebook"}`;

            // Find or create a Cliente for this sender
            let cliente = await db.cliente.findFirst({
                where: { escritorioId: connection.escritorioId, nome: senderName },
                orderBy: { createdAt: "asc" },
            });

            if (!cliente) {
                cliente = await db.cliente.create({
                    data: {
                        nome: senderName,
                        escritorioId: connection.escritorioId,
                        status: "PROSPECTO",
                        crmRelationship: "LEAD",
                    },
                });
            }

            conversation = await db.conversation.create({
                data: {
                    clienteId: cliente.id,
                    canal: event.channel,
                    status: "OPEN",
                    escritorioId: connection.escritorioId,
                    metaSocialConnectionId: connection.id,
                    externalSenderId: event.senderId,
                    lastMessageAt: event.timestamp,
                    unreadCount: 1,
                },
            });
        } else {
            // Increment unread + update lastMessageAt
            await db.conversation.update({
                where: { id: conversation.id },
                data: {
                    lastMessageAt: event.timestamp,
                    unreadCount: { increment: 1 },
                    status: "OPEN",
                },
            });
        }

        // Save the incoming message (check for duplicates via providerMsgId)
        const existing = await db.message.findUnique({ where: { providerMsgId: event.messageId } });
        if (!existing) {
            await db.message.create({
                data: {
                    conversationId: conversation.id,
                    direction: "INBOUND",
                    canal: event.channel,
                    content: event.text ?? (event.attachmentType ? `[${event.attachmentType}]` : "[mensagem]"),
                    status: "DELIVERED",
                    providerMsgId: event.messageId,
                    receivedAt: event.timestamp,
                },
            });
        }

        handled++;
    }

    return NextResponse.json({ ok: true, handled });
}
