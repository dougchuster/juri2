/**
 * WhatsApp Integration — Baileys Direct
 * This module wraps the Baileys service to maintain the same API
 * that the rest of the codebase uses (actions, communication-engine, etc.)
 */

import { whatsappService } from "./baileys-service";

interface EvolutionResponse<T = unknown> {
    ok: boolean;
    data?: T;
    error?: string;
}

// ── Instance Management (now no-ops since Baileys handles this) ──

export async function createInstance(): Promise<EvolutionResponse> {
    try {
        await whatsappService.connect();
        return { ok: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return { ok: false, error: message };
    }
}

export async function getQRCode(): Promise<EvolutionResponse<{ base64?: string; code?: string }>> {
    const status = whatsappService.getStatus();
    return {
        ok: true,
        data: {
            base64: status.qrCode || undefined,
            code: status.qrCodeRaw || undefined,
        },
    };
}

export async function getConnectionStatus(): Promise<EvolutionResponse<{ state: string; statusReason?: number }>> {
    const status = whatsappService.getStatus();
    return {
        ok: true,
        data: {
            state: status.connected ? "open" : status.state,
        },
    };
}

export async function disconnectInstance(): Promise<EvolutionResponse> {
    try {
        await whatsappService.disconnect();
        return { ok: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return { ok: false, error: message };
    }
}

export async function deleteInstance(): Promise<EvolutionResponse> {
    return disconnectInstance();
}

// ── Sending Messages ──

export async function sendTextMessage(
    phone: string,
    text: string
): Promise<EvolutionResponse<{ key?: { id?: string } }>> {
    const result = await whatsappService.sendText(phone, text);
    if (result.ok) {
        return { ok: true, data: { key: { id: result.messageId } } };
    }
    return { ok: false, error: result.error };
}

export async function sendMediaMessage(
    phone: string,
    mediaUrl: string,
    caption?: string,
    mimeType?: string,
    fileName?: string,
    asVoiceNote?: boolean
): Promise<EvolutionResponse<{ key?: { id?: string } }>> {
    const result = await whatsappService.sendMedia(phone, mediaUrl, caption, mimeType, fileName, asVoiceNote);
    if (result.ok) {
        return { ok: true, data: { key: { id: result.messageId } } };
    }
    return { ok: false, error: result.error };
}

export async function sendMediaBufferMessage(
    phone: string,
    media: Buffer,
    options?: {
        caption?: string;
        mimeType?: string;
        fileName?: string;
        asVoiceNote?: boolean;
    }
): Promise<EvolutionResponse<{ key?: { id?: string } }>> {
    const result = await whatsappService.sendMediaBuffer(phone, media, options);
    if (result.ok) {
        return { ok: true, data: { key: { id: result.messageId } } };
    }
    return { ok: false, error: result.error };
}

// ── Webhook Configuration (no longer needed with direct Baileys) ──

export async function configureWebhook(_webhookUrl: string): Promise<EvolutionResponse> {
    // Baileys handles messages directly via event handlers, no webhook needed
    return { ok: true };
}

// ── Utilities ──

/**
 * Valida a assinatura do webhook da Evolution API.
 *
 * Suporta dois modos:
 * 1. HMAC-SHA256 (seguro): quando EVOLUTION_WEBHOOK_SECRET está definido,
 *    verifica `HMAC-SHA256(secret, payload) == signature`.
 * 2. API Key simples (legado): quando apenas EVOLUTION_API_KEY está definido,
 *    compara a signature diretamente com a chave (sem HMAC).
 *
 * Usa `timingSafeEqual` para prevenir timing attacks.
 */
export function validateWebhookSignature(
    payload: string,
    signature: string | null
): boolean {
    if (!signature) return false;

    const hmacSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
    const apiKey = process.env.EVOLUTION_API_KEY;

    // Modo preferencial: HMAC-SHA256
    if (hmacSecret) {
        const { createHmac, timingSafeEqual } = require("crypto") as typeof import("crypto");
        const expected = createHmac("sha256", hmacSecret)
            .update(payload, "utf8")
            .digest("hex");
        try {
            const sigBuf = Buffer.from(signature);
            const expBuf = Buffer.from(expected);
            if (sigBuf.length !== expBuf.length) return false;
            return timingSafeEqual(sigBuf, expBuf);
        } catch {
            return false;
        }
    }

    // Modo legado: comparação de API Key com timingSafeEqual
    if (apiKey) {
        try {
            const { timingSafeEqual } = require("crypto") as typeof import("crypto");
            const sigBuf = Buffer.from(signature);
            const keyBuf = Buffer.from(apiKey);
            if (sigBuf.length !== keyBuf.length) return false;
            return timingSafeEqual(sigBuf, keyBuf);
        } catch {
            return false;
        }
    }

    // Sem chave configurada
    if (process.env.NODE_ENV === "production") {
        console.error("[evolution-api] EVOLUTION_WEBHOOK_SECRET não configurado — bloqueando webhook em produção");
        return false;
    }
    return true; // dev: permite sem chave
}

export async function healthCheck(): Promise<boolean> {
    return whatsappService.isConnected();
}
