/**
 * Camada de eventos em tempo real para o módulo de comunicação.
 *
 * Antes: EventEmitter in-process (single-worker — eventos perdidos entre workers)
 * Agora: Redis Pub/Sub cross-worker com fallback para EventEmitter local
 *
 * API pública mantida idêntica — nenhum caller precisa mudar.
 */

import "server-only";

import type { CanalComunicacao, MessageDirection, MessageStatus } from "@/generated/prisma";
import { publishRealtimeEvent, subscribeRealtimeEvents, type RealtimePayload } from "./redis-pubsub";

// Re-exporta o tipo para compatibilidade com importações existentes
export type CommunicationRealtimePayload = RealtimePayload;

// ─── Emissores (server-side) ──────────────────────────────────────────────────

export function emitCommunicationRealtimeEvent(payload: RealtimePayload): void {
    void publishRealtimeEvent(payload);
}

export function emitCommunicationMessageCreated(payload: {
    conversationId: string;
    messageId: string;
    direction: MessageDirection;
    canal: CanalComunicacao;
    status: MessageStatus;
    escritorioId?: string | null;
}) {
    void publishRealtimeEvent({
        type: "message_created",
        escritorioId: payload.escritorioId ?? null,
        ...payload,
    });
}

export function emitCommunicationMessageStatusUpdated(payload: {
    conversationId: string;
    messageId: string;
    status: MessageStatus;
    escritorioId?: string | null;
}) {
    void publishRealtimeEvent({
        type: "message_status_updated",
        escritorioId: payload.escritorioId ?? null,
        ...payload,
    });
}

export function emitWhatsappConnectionStatusUpdated(payload: {
    connectionId: string;
    status: string;
    qrCode: string | null;
    qrCodeRaw: string | null;
    connectedPhone: string | null;
    connectedName: string | null;
    escritorioId?: string | null;
}) {
    void publishRealtimeEvent({
        type: "whatsapp_connection_status_updated",
        escritorioId: payload.escritorioId ?? null,
        ...payload,
    });
}

// ─── Subscriber (usado pelo SSE stream) ───────────────────────────────────────

export function subscribeCommunicationRealtimeEvents(
    listener: (payload: RealtimePayload) => void
): () => void {
    return subscribeRealtimeEvents(listener);
}
