import { whatsappService } from "@/lib/integrations/baileys-service";
import { subscribeCommunicationRealtimeEvents } from "@/lib/comunicacao/realtime";

export const dynamic = "force-dynamic";

/**
 * SSE stream for real-time communication updates.
 * Sends events when:
 * - New WhatsApp message arrives
 * - Message status changes
 * - WhatsApp connection state changes
 */
export async function GET() {
  whatsappService.restoreSessionInBackground();
  const encoder = new TextEncoder();
  let removeConnectionListener: (() => void) | null = null;
  let removeCommunicationRealtimeListener: (() => void) | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection status
      const waStatus = whatsappService.getStatus();
      const initData = JSON.stringify({
        type: "connection",
        whatsappConnected: waStatus.connected,
        whatsappState: waStatus.state,
        phoneNumber: waStatus.phoneNumber,
        name: waStatus.name,
        syncInProgress: waStatus.syncInProgress,
        reconnectAttempts: waStatus.reconnectAttempts,
        maxReconnectAttempts: waStatus.maxReconnectAttempts,
        lastDisconnectReason: waStatus.lastDisconnectReason,
        lastDisconnectError: waStatus.lastDisconnectError,
      });
      controller.enqueue(encoder.encode(`data: ${initData}\n\n`));

      // Listen for connection changes
      removeConnectionListener = whatsappService.onConnectionChange((status) => {
        try {
          const data = JSON.stringify({
            type: "connection",
            whatsappConnected: status.connected,
            whatsappState: status.state,
            phoneNumber: status.phoneNumber,
            name: status.name,
            syncInProgress: status.syncInProgress,
            reconnectAttempts: status.reconnectAttempts,
            maxReconnectAttempts: status.maxReconnectAttempts,
            lastDisconnectReason: status.lastDisconnectReason,
            lastDisconnectError: status.lastDisconnectError,
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // Stream closed
        }
      });

      removeCommunicationRealtimeListener = subscribeCommunicationRealtimeEvents((payload) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // Stream closed
        }
      });

      // Keep alive ping every 15 seconds
      intervalId = setInterval(() => {
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
    if (removeConnectionListener) removeConnectionListener();
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
