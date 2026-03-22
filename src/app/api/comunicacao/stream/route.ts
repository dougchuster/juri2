import { subscribeCommunicationRealtimeEvents } from "@/lib/comunicacao/realtime";
import { getPrimaryWhatsappConnection } from "@/lib/whatsapp/application/connection-service";
import { getWhatsappProviderAdapter } from "@/lib/whatsapp/providers/provider-registry";

export const dynamic = "force-dynamic";

function normalizeLegacyWhatsappState(status?: string | null) {
  switch (status) {
    case "open":
    case "CONNECTED":
      return "open";
    case "connecting":
    case "CONNECTING":
    case "QR_REQUIRED":
    case "VALIDATING":
      return "connecting";
    default:
      return "close";
  }
}

function buildConnectionPayload(input: {
  connectionId: string | null;
  status?: string | null;
  connected?: boolean;
  phoneNumber?: string | null;
  name?: string | null;
  lastDisconnectError?: string | null;
}) {
  return {
    type: "connection",
    connectionId: input.connectionId,
    whatsappConnected: Boolean(input.connected ?? (input.status === "CONNECTED" || input.status === "open")),
    whatsappState: normalizeLegacyWhatsappState(input.status),
    whatsappProviderStatus: input.status || "DISCONNECTED",
    phoneNumber: input.phoneNumber || null,
    name: input.name || null,
    syncInProgress: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 0,
    lastDisconnectReason: null,
    lastDisconnectError: input.lastDisconnectError || null,
  };
}

/**
 * SSE stream for real-time communication updates.
 */
export async function GET() {
  const encoder = new TextEncoder();
  let removeCommunicationRealtimeListener: (() => void) | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const emitConnectionSnapshot = async () => {
        try {
          const connection = await getPrimaryWhatsappConnection();
          const waStatus = connection
            ? await getWhatsappProviderAdapter(connection.providerType).getStatus(connection)
            : null;
          const initData = JSON.stringify(
            buildConnectionPayload({
              connectionId: connection?.id || null,
              status: waStatus?.status || "DISCONNECTED",
              connected: waStatus?.connected || false,
              phoneNumber: waStatus?.connectedPhone || null,
              name: waStatus?.connectedName || null,
              lastDisconnectError: waStatus?.ok === false ? waStatus.lastError || null : null,
            })
          );
          controller.enqueue(encoder.encode(`data: ${initData}\n\n`));
        } catch {
          // Stream closed
        }
      };

      await emitConnectionSnapshot();

      removeCommunicationRealtimeListener = subscribeCommunicationRealtimeEvents((payload) => {
        try {
          if (payload.type === "whatsapp_connection_status_updated") {
            const connectionPayload = buildConnectionPayload({
              connectionId: payload.connectionId,
              status: payload.status,
              phoneNumber: payload.connectedPhone,
              name: payload.connectedName,
            });
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(connectionPayload)}\n\n`));
            return;
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // Stream closed
        }
      });

      intervalId = setInterval(() => {
        void emitConnectionSnapshot();
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          cleanup();
        }
      }, 15000);
    },
    cancel() {
      cleanup();
    },
  });

  function cleanup() {
    if (removeCommunicationRealtimeListener) removeCommunicationRealtimeListener();
    if (intervalId) clearInterval(intervalId);
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
