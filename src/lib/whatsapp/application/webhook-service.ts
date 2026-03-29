import "server-only";

import { db } from "@/lib/db";
import { updateEvolutionRuntimeState } from "@/lib/integrations/evolution-runtime-state";
import {
    findClientByPhone,
    getOrCreateConversation,
    getTemplateByName,
} from "@/lib/dal/comunicacao";
import {
    attachConversationToConnection,
    getWhatsappConnectionById,
    updateWhatsappConnection,
} from "@/lib/whatsapp/application/connection-service";
import { sendWhatsappTextMessage } from "@/lib/whatsapp/application/message-service";
import { runJuribotForInboundMessage } from "@/lib/whatsapp/chatbot/juribot-engine";
import type { NormalizedWebhookEvent } from "@/lib/whatsapp/providers/types";
import { normalizeProviderPhone } from "@/lib/utils/phone";
import { scheduleAttendanceAutomationForInboundMessage } from "@/lib/services/attendance-automation";
import {
    emitCommunicationMessageCreated,
    emitCommunicationMessageStatusUpdated,
    emitWhatsappConnectionStatusUpdated,
} from "@/lib/comunicacao/realtime";

export async function processWhatsappWebhookEvents(events: NormalizedWebhookEvent[]) {
    for (const event of events) {
        if (event.type === "message.inbound") {
            await processInboundMessageEvent(event);
            continue;
        }

        if (event.type === "message.status") {
            await processMessageStatusEvent(event);
            continue;
        }

        await processConnectionStatusEvent(event);
    }
}

async function processInboundMessageEvent(event: Extract<NormalizedWebhookEvent, { type: "message.inbound" }>) {
    const phone = normalizeProviderPhone(event.phone);
    if (!phone) return;

    const existing = await db.message.findUnique({
        where: { providerMsgId: event.providerMessageId },
        select: { id: true },
    });
    if (existing) return;

    const clientResult = await findClientByPhone(phone);
    if (!clientResult) return;

    const clienteId = clientResult.cliente?.id || (clientResult as { clienteId?: string }).clienteId;
    if (!clienteId) return;

    const connection = await getWhatsappConnectionById(event.connectionId);
    const conversation = await getOrCreateConversation(clienteId, "WHATSAPP");
    await attachConversationToConnection(conversation.id, event.connectionId);

    const inboundMessage = await db.message.create({
        data: {
            conversationId: conversation.id,
            direction: "INBOUND",
            canal: "WHATSAPP",
            content: event.text || inboundPlaceholder(event.media?.mimeType || null),
            status: "DELIVERED",
            providerMsgId: event.providerMessageId,
            senderName: event.senderName || null,
            senderPhone: phone,
            receivedAt: event.receivedAt ? new Date(event.receivedAt) : new Date(),
        },
    });

    if (event.media) {
        await db.messageAttachment.create({
            data: {
                messageId: inboundMessage.id,
                fileName: event.media.fileName || fallbackAttachmentName(event.media.mimeType || null),
                mimeType: event.media.mimeType || "application/octet-stream",
                fileUrl: event.media.url || "",
            },
        }).catch(() => null);
    }

    emitCommunicationMessageCreated({
        conversationId: conversation.id,
        messageId: inboundMessage.id,
        direction: "INBOUND",
        canal: "WHATSAPP",
        status: "DELIVERED",
    });

    await Promise.all([
        db.conversation.update({
            where: { id: conversation.id },
            data: {
                unreadCount: { increment: 1 },
                lastMessageAt: new Date(),
                whatsappConnectionId: event.connectionId,
            },
        }),
        db.clientPhone.updateMany({
            where: { clienteId, isWhatsApp: true },
            data: {
                lastContactAt: new Date(),
                lastInboundAt: new Date(),
            },
        }),
    ]);

    let juribotHandled = false;
    if (event.text?.trim()) {
        try {
            const juribotResult = await runJuribotForInboundMessage({
                conversationId: conversation.id,
                clienteId,
                incomingText: event.text,
                connectionId: event.connectionId,
            });
            juribotHandled = juribotResult.handled;
        } catch (error) {
            console.error("[WhatsApp Webhook] JuriBot failed:", error);
        }
    }

    if (juribotHandled) return;

    try {
        const automationState = await db.conversation.findUnique({
            where: { id: conversation.id },
            select: {
                iaDesabilitada: true,
                autoAtendimentoPausado: true,
                pausadoAte: true,
            },
        });

        const automationPaused =
            Boolean(automationState?.iaDesabilitada)
            || Boolean(
                automationState?.autoAtendimentoPausado
                && (!automationState.pausadoAte || automationState.pausadoAte.getTime() > Date.now())
            );

        const hasSmartAutomation = await db.attendanceAutomationFlow.count({
            where: { isActive: true, canal: "WHATSAPP" },
        });
        const ackTemplate = hasSmartAutomation > 0 ? null : await getTemplateByName("auto_ack_whatsapp");
        if (ackTemplate && !automationPaused && connection) {
            await sendWhatsappTextMessage({
                clienteId,
                content: ackTemplate.content,
                conversationId: conversation.id,
                connectionId: connection.id,
            });
        }
    } catch (error) {
        console.error("[WhatsApp Webhook] Auto-ack failed:", error);
    }

    try {
        await scheduleAttendanceAutomationForInboundMessage({
            conversationId: conversation.id,
            messageId: inboundMessage.id,
            incomingText: event.text || "",
            source: "evolution-webhook",
        });
    } catch (error) {
        console.error("[WhatsApp Webhook] Attendance automation failed:", error);
    }
}

async function processMessageStatusEvent(event: Extract<NormalizedWebhookEvent, { type: "message.status" }>) {
    const message = await db.message.findUnique({
        where: { providerMsgId: event.providerMessageId },
        select: { id: true, conversationId: true },
    });

    if (!message) return;

    await db.message.update({
        where: { id: message.id },
        data: {
            status: event.status,
            deliveredAt: event.status === "DELIVERED" ? new Date(event.occurredAt) : undefined,
            readAt: event.status === "READ" ? new Date(event.occurredAt) : undefined,
            errorMessage: event.status === "FAILED" ? "Falha reportada pelo provider" : undefined,
        },
    });

    emitCommunicationMessageStatusUpdated({
        conversationId: message.conversationId,
        messageId: message.id,
        status: event.status,
    });
}

async function processConnectionStatusEvent(event: Extract<NormalizedWebhookEvent, { type: "connection.status" }>) {
    // Se o evento carrega QR code, o status é sempre QR_REQUIRED independente do campo state
    const hasQr = Boolean(event.qrCodeRaw || event.qrCode);
    const status = event.status === "CONNECTED"
        ? "CONNECTED"
        : hasQr
            ? "QR_REQUIRED"
            : event.status === "QR_REQUIRED"
                ? "QR_REQUIRED"
                : event.status === "ERROR"
                    ? "ERROR"
                    : event.status === "CONNECTING"
                        ? "CONNECTING"
                    : "DISCONNECTED";

    await updateEvolutionRuntimeState({
        connected: status === "CONNECTED",
        state: status === "CONNECTED"
            ? "open"
            : status === "QR_REQUIRED" || status === "CONNECTING"
                ? "connecting"
                : "close",
        qrCodeRaw: event.qrCodeRaw || null,
        phoneNumber: event.phone || null,
        name: event.name || null,
        lastDisconnectError: status === "ERROR"
            ? "Provider reportou erro de conexao"
            : status === "DISCONNECTED"
                ? "Instancia desconectada"
                : null,
    });

    await updateWhatsappConnection(event.connectionId, {
        status,
        connectedPhone: event.phone || null,
        connectedName: event.name || null,
        lastConnectedAt: status === "CONNECTED" ? new Date() : undefined,
        lastError: status === "ERROR" ? "Provider reportou erro de conexao" : null,
    });

    emitWhatsappConnectionStatusUpdated({
        connectionId: event.connectionId,
        status,
        qrCode: event.qrCode || null,
        qrCodeRaw: event.qrCodeRaw || null,
        connectedPhone: event.phone || null,
        connectedName: event.name || null,
    });
}

function inboundPlaceholder(mimeType: string | null) {
    if (!mimeType) return "[Midia recebida]";
    if (mimeType.startsWith("image/")) return "[Imagem recebida]";
    if (mimeType.startsWith("video/")) return "[Video recebido]";
    if (mimeType.startsWith("audio/")) return "[Audio recebido]";
    return "[Documento recebido]";
}

function fallbackAttachmentName(mimeType: string | null) {
    if (!mimeType) return "arquivo";
    if (mimeType.startsWith("image/")) return "imagem";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    return "documento";
}
