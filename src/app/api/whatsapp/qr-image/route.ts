import QRCode from "qrcode";
import {
  getPrimaryWhatsappRuntime,
  withLegacyWhatsappHeaders,
} from "@/app/api/comunicacao/whatsapp/compat";

export const dynamic = "force-dynamic";

/**
 * Legacy compatibility endpoint.
 */
export async function GET() {
  const runtime = await getPrimaryWhatsappRuntime();
  const qrCodeRaw = runtime.qr?.qrCodeRaw || null;

  if (!qrCodeRaw) {
    return new Response(
      "QR code indisponivel",
      withLegacyWhatsappHeaders({ status: 404 }, "/api/admin/whatsapp/connections/[id]/connect")
    );
  }

  try {
    const buffer = await QRCode.toBuffer(qrCodeRaw, {
      type: "png",
      width: 300,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    return new Response(new Uint8Array(buffer), {
      headers: withLegacyWhatsappHeaders(
        {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        },
        "/api/admin/whatsapp/connections/[id]/connect"
      ).headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar PNG do QR";
    return new Response(
      message,
      withLegacyWhatsappHeaders({ status: 500 }, "/api/admin/whatsapp/connections/[id]/connect")
    );
  }
}
