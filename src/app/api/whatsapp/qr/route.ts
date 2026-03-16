import { whatsappService } from "@/lib/integrations/baileys-service";

export const dynamic = "force-dynamic";

/**
 * SSE endpoint to stream QR code updates in real-time
 * The client connects and receives QR codes as they are generated
 */
export async function GET() {
  const encoder = new TextEncoder();
  let removeListener: (() => void) | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send current status immediately
      const currentStatus = whatsappService.getStatus();
      const initData = JSON.stringify({
        type: "status",
        connected: currentStatus.connected,
        state: currentStatus.state,
        qrCode: currentStatus.qrCode,
        qrCodeRaw: currentStatus.qrCodeRaw,
        phoneNumber: currentStatus.phoneNumber,
        name: currentStatus.name,
      });
      controller.enqueue(encoder.encode(`data: ${initData}\n\n`));

      // Listen for QR code updates
      removeListener = whatsappService.addQRListener((qrBase64) => {
        try {
          const data = JSON.stringify({
            type: "qr",
            qrCode: qrBase64,
            qrCodeRaw: whatsappService.getStatus().qrCodeRaw,
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // Stream might be closed
        }
      });

      // Listen for connection changes
      const removeConnectionListener = whatsappService.onConnectionChange((status) => {
        try {
          const data = JSON.stringify({
            type: "status",
            connected: status.connected,
            state: status.state,
            qrCode: status.qrCode,
            qrCodeRaw: status.qrCodeRaw,
            phoneNumber: status.phoneNumber,
            name: status.name,
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // Stream might be closed
        }
      });

      // Keep alive with periodic pings
      intervalId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          if (intervalId) clearInterval(intervalId);
          if (removeListener) removeListener();
          removeConnectionListener();
        }
      }, 15000);

      // Store cleanup for cancel
      const originalRemoveListener = removeListener;
      removeListener = () => {
        originalRemoveListener?.();
        removeConnectionListener();
      };
    },
    cancel() {
      if (removeListener) removeListener();
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
