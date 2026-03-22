import { whatsappService } from "@/lib/integrations/baileys-service";
import type { WhatsappProviderAdapter } from "@/lib/whatsapp/providers/types";

export const legacyBaileysProvider: WhatsappProviderAdapter = {
    providerType: "EMBEDDED_BAILEYS_LEGACY",

    async validate() {
        const status = whatsappService.getStatus();
        return {
            ok: true,
            metadata: {
                connected: status.connected,
                state: status.state,
            },
        };
    },

    async connect() {
        const status = await whatsappService.connect();
        return {
            ok: true,
            status: status.connected ? "CONNECTED" : status.qrCodeRaw ? "QR_REQUIRED" : "CONNECTING",
            qrCode: status.qrCode,
            qrCodeRaw: status.qrCodeRaw,
            connectedPhone: status.phoneNumber,
            connectedName: status.name,
        };
    },

    async disconnect() {
        await whatsappService.disconnect();
    },

    async getStatus() {
        const status = whatsappService.getStatus();
        return {
            ok: true,
            status: status.connected ? "CONNECTED" : status.qrCodeRaw ? "QR_REQUIRED" : status.state.toUpperCase(),
            connected: status.connected,
            qrCode: status.qrCode,
            qrCodeRaw: status.qrCodeRaw,
            connectedPhone: status.phoneNumber,
            connectedName: status.name,
            lastError: status.lastDisconnectError,
        };
    },

    async getQrCode() {
        const status = whatsappService.getStatus();
        return {
            qrCode: status.qrCode,
            qrCodeRaw: status.qrCodeRaw,
        };
    },

    async sendText(input) {
        const result = await whatsappService.sendText(input.to, input.text);
        return {
            ok: result.ok,
            providerMessageId: result.messageId || null,
            status: result.ok ? "SENT" : "FAILED",
            error: result.error,
        };
    },

    async sendMedia(input) {
        const result = input.fileBuffer
            ? await whatsappService.sendMediaBuffer(input.to, input.fileBuffer, {
                caption: input.caption,
                mimeType: input.mimeType,
                fileName: input.fileName,
                asVoiceNote: input.asVoiceNote,
            })
            : await whatsappService.sendMedia(input.to, input.fileUrl || "", input.mimeType, input.fileName, input.caption);

        return {
            ok: result.ok,
            providerMessageId: result.messageId || null,
            status: result.ok ? "SENT" : "FAILED",
            error: result.error,
        };
    },

    async healthCheck() {
        const status = whatsappService.getStatus();
        return {
            ok: status.connected,
            status: status.connected ? "CONNECTED" : status.state.toUpperCase(),
            details: {
                reconnectAttempts: status.reconnectAttempts,
                lastDisconnectReason: status.lastDisconnectReason,
            },
            error: status.connected ? undefined : status.lastDisconnectError || "WhatsApp nao conectado",
        };
    },

    async normalizeWebhook() {
        return [];
    },
};
