import "server-only";

import { EventEmitter } from "node:events";
import type { CanalComunicacao, MessageDirection, MessageStatus } from "@/generated/prisma";

type CommunicationRealtimePayload =
    | {
          type: "automation_control_updated";
          conversationId: string;
          iaDesabilitada: boolean;
          iaDesabilitadaEm: string | null;
          iaDesabilitadaPor: string | null;
          autoAtendimentoPausado: boolean;
          pausadoAte: string | null;
          motivoPausa: string | null;
          updatedByName: string | null;
      }
    | {
          type: "message_created";
          conversationId: string;
          messageId: string;
          direction: MessageDirection;
          canal: CanalComunicacao;
          status: MessageStatus;
      }
    | {
          type: "message_status_updated";
          conversationId: string;
          messageId: string;
          status: MessageStatus;
      }
    | {
          type: "whatsapp_connection_status_updated";
          connectionId: string;
          status: string;
          qrCode: string | null;
          qrCodeRaw: string | null;
          connectedPhone: string | null;
          connectedName: string | null;
      };

const globalForCommunicationRealtime = globalThis as typeof globalThis & {
    __communicationRealtimeEmitter?: EventEmitter;
};

function getEmitter() {
    if (!globalForCommunicationRealtime.__communicationRealtimeEmitter) {
        globalForCommunicationRealtime.__communicationRealtimeEmitter = new EventEmitter();
    }
    return globalForCommunicationRealtime.__communicationRealtimeEmitter;
}

export function emitCommunicationRealtimeEvent(payload: CommunicationRealtimePayload) {
    getEmitter().emit("event", payload);
}

export function emitCommunicationMessageCreated(payload: {
    conversationId: string;
    messageId: string;
    direction: MessageDirection;
    canal: CanalComunicacao;
    status: MessageStatus;
}) {
    emitCommunicationRealtimeEvent({
        type: "message_created",
        ...payload,
    });
}

export function emitCommunicationMessageStatusUpdated(payload: {
    conversationId: string;
    messageId: string;
    status: MessageStatus;
}) {
    emitCommunicationRealtimeEvent({
        type: "message_status_updated",
        ...payload,
    });
}

export function subscribeCommunicationRealtimeEvents(
    listener: (payload: CommunicationRealtimePayload) => void
) {
    const emitter = getEmitter();
    emitter.on("event", listener);
    return () => emitter.off("event", listener);
}

export function emitWhatsappConnectionStatusUpdated(payload: {
    connectionId: string;
    status: string;
    qrCode: string | null;
    qrCodeRaw: string | null;
    connectedPhone: string | null;
    connectedName: string | null;
}) {
    emitCommunicationRealtimeEvent({
        type: "whatsapp_connection_status_updated",
        ...payload,
    });
}
