import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findClientByPhone, getOrCreateConversation, createMessage, getTemplateByName } from "@/lib/dal/comunicacao";
import { validateWebhookSignature, sendTextMessage } from "@/lib/integrations/evolution-api";
import { checkRateLimit, getClientIp } from "@/lib/middleware/rate-limit";
import { runAttendanceAutomationForInboundMessage } from "@/lib/services/attendance-automation";
import { emitCommunicationMessageCreated } from "@/lib/comunicacao/realtime";

/**
 * POST /api/webhooks/evolution/messages
 * Receives inbound WhatsApp messages from Evolution API
 * 
 * Flow:
 * 1. Validate webhook signature
 * 2. Store raw webhook event
 * 3. Identify client by phone number
 * 4. Create/update conversation
 * 5. Create message record
 * 6. Send auto-acknowledge
 * 7. Create internal notification
 */
export async function POST(req: NextRequest) {
    try {
        // Rate limiting: max 100 requests per minute
        const ip = getClientIp(req.headers);
        const limit = checkRateLimit(ip, { maxRequests: 100, windowMs: 60_000 });
        if (!limit.allowed) {
            return NextResponse.json({ error: "Rate limited" }, { status: 429 });
        }

        const body = await req.text();
        const signature = req.headers.get("x-api-key") || req.headers.get("apikey");

        // 1. Validate webhook
        if (!validateWebhookSignature(body, signature)) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const payload = JSON.parse(body);

        // 2. Store raw event for audit
        await db.webhookEvent.create({
            data: {
                source: "evolution_api",
                eventType: payload.event || "messages.upsert",
                payload: payload,
            },
        });

        // Handle different event types
        const event = payload.event || "";

        if (event === "messages.upsert" || event === "MESSAGES_UPSERT" || !event) {
            return handleInboundMessage(payload);
        }

        return NextResponse.json({ ok: true, handled: false });
    } catch (error) {
        console.error("[Webhook Evolution Messages] Error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

async function handleInboundMessage(payload: Record<string, unknown>) {
    const data = (payload.data as Record<string, unknown>) || payload;
    const key = data.key as Record<string, unknown> | undefined;
    const message = data.message as Record<string, unknown> | undefined;

    if (!key || !message) {
        return NextResponse.json({ ok: true, reason: "no_message_data" });
    }

    // Skip outbound messages (fromMe)
    if (key.fromMe) {
        return NextResponse.json({ ok: true, reason: "outbound_skip" });
    }

    // Extract phone number (remoteJid format: 5562999999999@s.whatsapp.net)
    const remoteJid = key.remoteJid as string || "";
    const phoneDigits = remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "");

    if (!phoneDigits || remoteJid.includes("@g.us")) {
        // Skip group messages
        return NextResponse.json({ ok: true, reason: "group_skip" });
    }

    // Extract message content
    const content =
        (message.conversation as string) ||
        (message.extendedTextMessage as { text?: string })?.text ||
        "[Mídia recebida]";

    const providerMsgId = key.id as string || undefined;

    // 3. Identify client
    const clientResult = await findClientByPhone(phoneDigits);

    if (!clientResult) {
        // Unknown client - still store the message for later
        console.log(`[Webhook] Unknown phone: ${phoneDigits}`);
        return NextResponse.json({ ok: true, reason: "unknown_client" });
    }

    const clienteId = clientResult.cliente?.id || (clientResult as { clienteId?: string }).clienteId;
    if (!clienteId) {
        return NextResponse.json({ ok: true, reason: "no_client_id" });
    }

    // 4. Get or create conversation
    const conversation = await getOrCreateConversation(clienteId, "WHATSAPP");
    const conversationAutomationState = await db.conversation.findUnique({
        where: { id: conversation.id },
        select: {
            iaDesabilitada: true,
            autoAtendimentoPausado: true,
            pausadoAte: true,
        },
    });
    const automationPaused =
        Boolean(conversationAutomationState?.iaDesabilitada) ||
        Boolean(
            conversationAutomationState?.autoAtendimentoPausado &&
                (!conversationAutomationState.pausadoAte ||
                    conversationAutomationState.pausadoAte.getTime() > Date.now())
        );

    // 5. Create message
    const inboundMessage = await createMessage({
        conversationId: conversation.id,
        direction: "INBOUND",
        canal: "WHATSAPP",
        content,
        status: "DELIVERED",
        providerMsgId: providerMsgId || null,
    });
    emitCommunicationMessageCreated({
        conversationId: conversation.id,
        messageId: inboundMessage.id,
        direction: "INBOUND",
        canal: "WHATSAPP",
        status: "DELIVERED",
    });

    // Update client phone timestamps
    try {
        const phone = `+${phoneDigits}`;
        await db.clientPhone.updateMany({
            where: { phone },
            data: { lastContactAt: new Date(), lastInboundAt: new Date() },
        });
    } catch { /* phone might not exist in ClientPhone table */ }

    // 6. Send auto-acknowledge
    try {
        const hasSmartAutomation = await db.attendanceAutomationFlow.count({
            where: {
                isActive: true,
                canal: "WHATSAPP",
            },
        });
        const ackTemplate = hasSmartAutomation > 0 ? null : await getTemplateByName("auto_ack_whatsapp");
        if (ackTemplate && !automationPaused) {
            await sendTextMessage(phoneDigits, ackTemplate.content);
        }
    } catch (err) {
        console.error("[Webhook] Auto-ack failed:", err);
    }

    try {
        await runAttendanceAutomationForInboundMessage({
            conversationId: conversation.id,
            messageId: inboundMessage.id,
            incomingText: content,
            source: "evolution-webhook",
        });
    } catch (automationError) {
        console.error("[Webhook] Attendance automation failed:", automationError);
    }

    // 7. Create internal notification for assigned user or all admins
    try {
        const clienteName = clientResult.cliente
            ? (clientResult.cliente as { nome?: string }).nome || "Cliente"
            : "Cliente";

        const assignedUserId = conversation.assignedToId;
        const targetUsers = assignedUserId
            ? [assignedUserId]
            : (await db.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } })).map((u) => u.id);

        for (const userId of targetUsers) {
            await db.notificacao.create({
                data: {
                    userId,
                    tipo: "MENSAGEM_RECEBIDA",
                    titulo: `Mensagem de ${clienteName}`,
                    mensagem: content.slice(0, 200),
                    linkUrl: "/comunicacao",
                },
            });
        }
    } catch (err) {
        console.error("[Webhook] Notification creation failed:", err);
    }

    return NextResponse.json({ ok: true, reason: "processed" });
}
