import {
  buildLegacyWhatsappStatusPayload,
  getPrimaryWhatsappRuntime,
  withLegacyWhatsappHeaders,
} from "@/app/api/comunicacao/whatsapp/compat";

export const dynamic = "force-dynamic";

/**
 * Legacy compatibility SSE endpoint for QR/status snapshots.
 * Prefer /api/comunicacao/stream for module consumers.
 */
export async function GET() {
  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const emitSnapshot = async () => {
        try {
          const runtime = await getPrimaryWhatsappRuntime();

          const data = JSON.stringify({
            type: "status",
            ...buildLegacyWhatsappStatusPayload({
              status: runtime.status?.status || "DISCONNECTED",
              connected: runtime.status?.connected || false,
              qrCode: runtime.qr?.qrCode || null,
              qrCodeRaw: runtime.qr?.qrCodeRaw || null,
              phoneNumber: runtime.status?.connectedPhone || null,
              name: runtime.status?.connectedName || null,
              providerType: runtime.connection?.providerType || null,
            }),
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // stream closed or polling failure
        }
      };

      await emitSnapshot();

      intervalId = setInterval(() => {
        void emitSnapshot();
      }, 5000);
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: withLegacyWhatsappHeaders(
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      },
      "/api/comunicacao/stream"
    ).headers,
  });
}
