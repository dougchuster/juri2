import { NextResponse } from "next/server";
import { whatsappService } from "@/lib/integrations/baileys-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    console.log("[API] WhatsApp connect request received");

    // Start connection (triggers QR code generation async)
    await whatsappService.connect();

    // Wait for QR code or connection (up to 15 seconds)
    const startTime = Date.now();
    const timeout = 15000;

    while (Date.now() - startTime < timeout) {
      const currentStatus = whatsappService.getStatus();

      if (currentStatus.connected) {
        return NextResponse.json({ success: true, status: currentStatus });
      }

      if (currentStatus.qrCode) {
        return NextResponse.json({ success: true, status: currentStatus });
      }

      // Wait 500ms before checking again
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Return whatever status we have after timeout
    const finalStatus = whatsappService.getStatus();
    return NextResponse.json({
      success: true,
      status: finalStatus,
      message: finalStatus.qrCode
        ? "QR Code gerado"
        : "Conexão iniciada. O QR Code será entregue via SSE.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[API] WhatsApp connect error:", message);
    return NextResponse.json(
      { error: `Erro ao conectar WhatsApp: ${message}` },
      { status: 500 }
    );
  }
}
