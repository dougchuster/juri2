import QRCode from "qrcode";
import { whatsappService } from "@/lib/integrations/baileys-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = whatsappService.getStatus();
  const qrCodeRaw = status.qrCodeRaw;

  if (!qrCodeRaw) {
    return new Response("QR code indisponivel", { status: 404 });
  }

  try {
    const buffer = await QRCode.toBuffer(qrCodeRaw, {
      type: "png",
      width: 300,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar PNG do QR";
    return new Response(message, { status: 500 });
  }
}
