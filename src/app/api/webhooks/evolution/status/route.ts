import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateWebhookSignature } from "@/lib/integrations/evolution-api";
import { checkRateLimit, getClientIp } from "@/lib/middleware/rate-limit";
import { emitCommunicationMessageStatusUpdated } from "@/lib/comunicacao/realtime";

/**
 * POST /api/webhooks/evolution/status
 * Receives message status updates from Evolution API
 * Updates message delivery status (sent, delivered, read, failed)
 */
export async function POST(req: NextRequest) {
    try {
        // Rate limiting
        const ip = getClientIp(req.headers);
        const limit = checkRateLimit(ip, { maxRequests: 100, windowMs: 60_000 });
        if (!limit.allowed) {
            return NextResponse.json({ error: "Rate limited" }, { status: 429 });
        }

        const body = await req.text();
        const signature = req.headers.get("x-api-key") || req.headers.get("apikey");

        // Validate webhook
        if (!validateWebhookSignature(body, signature)) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const payload = JSON.parse(body);

        // Store raw event
        await db.webhookEvent.create({
            data: {
                source: "evolution_api",
                eventType: payload.event || "messages.update",
                payload: payload,
            },
        });

        const event = payload.event || "";

        if (event === "messages.update" || event === "MESSAGES_UPDATE") {
            return handleStatusUpdate(payload);
        }

        if (event === "connection.update" || event === "CONNECTION_UPDATE") {
            // Just log connection changes
            console.log("[Webhook] Connection update:", JSON.stringify(payload.data || payload));
            return NextResponse.json({ ok: true, reason: "connection_logged" });
        }

        return NextResponse.json({ ok: true, handled: false });
    } catch (error) {
        console.error("[Webhook Evolution Status] Error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

async function handleStatusUpdate(payload: Record<string, unknown>) {
    const data = (payload.data as Record<string, unknown>) || payload;
    const key = data.key as Record<string, unknown> | undefined;
    const update = data.update as Record<string, unknown> | undefined;

    if (!key?.id) {
        return NextResponse.json({ ok: true, reason: "no_key" });
    }

    const providerMsgId = key.id as string;
    const status = update?.status;

    // Map Evolution API status codes to our status
    let mappedStatus: "SENT" | "DELIVERED" | "READ" | "FAILED" | null = null;
    const extra: { deliveredAt?: Date; readAt?: Date; errorMessage?: string } = {};

    switch (status) {
        case 1: // PENDING
        case "PENDING":
            mappedStatus = "SENT";
            break;
        case 2: // SERVER_ACK (sent to server)
        case "SERVER_ACK":
            mappedStatus = "SENT";
            break;
        case 3: // DELIVERY_ACK (delivered)
        case "DELIVERY_ACK":
            mappedStatus = "DELIVERED";
            extra.deliveredAt = new Date();
            break;
        case 4: // READ
        case "READ":
            mappedStatus = "READ";
            extra.readAt = new Date();
            break;
        case 5: // PLAYED (for audio/video)
        case "PLAYED":
            mappedStatus = "READ";
            extra.readAt = new Date();
            break;
        case 0: // ERROR
        case "ERROR":
            mappedStatus = "FAILED";
            extra.errorMessage = "Delivery failed";
            break;
    }

    if (!mappedStatus) {
        return NextResponse.json({ ok: true, reason: "unknown_status" });
    }

    // Update message status
    try {
        const existingMessage = await db.message.findUnique({
            where: { providerMsgId },
            select: { id: true, conversationId: true },
        });

        await db.message.update({
            where: { providerMsgId },
            data: { status: mappedStatus, ...extra },
        });

        if (existingMessage) {
            emitCommunicationMessageStatusUpdated({
                conversationId: existingMessage.conversationId,
                messageId: existingMessage.id,
                status: mappedStatus,
            });
        }

        // Also update the communication job if any
        await db.communicationJob.updateMany({
            where: { providerMsgId },
            data: {
                status: mappedStatus === "FAILED" ? "FAILED" : "COMPLETED",
                completedAt: new Date(),
                ...(extra.errorMessage ? { errorMessage: extra.errorMessage } : {}),
            },
        });
    } catch {
        // Message might not exist (e.g., ack for messages sent outside the system)
        console.log(`[Webhook] Status update for unknown message: ${providerMsgId}`);
    }

    // If failed, create notification for internal alert
    if (mappedStatus === "FAILED") {
        try {
            const message = await db.message.findUnique({
                where: { providerMsgId },
                include: { conversation: { include: { assignedTo: true } } },
            });

            if (message?.conversation?.assignedToId) {
                await db.notificacao.create({
                    data: {
                        userId: message.conversation.assignedToId,
                        tipo: "ENVIO_FALHOU",
                        titulo: "Falha no envio de mensagem",
                        mensagem: `A mensagem para a conversa não pôde ser entregue: ${extra.errorMessage || "Erro desconhecido"}`,
                        linkUrl: "/comunicacao",
                    },
                });
            }
        } catch (err) {
            console.error("[Webhook] Failed to create failure notification:", err);
        }
    }

    return NextResponse.json({ ok: true, status: mappedStatus });
}
