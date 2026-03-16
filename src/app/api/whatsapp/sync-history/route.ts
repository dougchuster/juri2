import { NextResponse } from "next/server";
import { whatsappService } from "@/lib/integrations/baileys-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/whatsapp/sync-history
 * Triggers WhatsApp to request history sync.
 * Messages flow through the regular message handlers.
 */
export async function POST() {
  try {
    const status = whatsappService.getStatus();
    if (!status.connected) {
      return NextResponse.json(
        { error: "WhatsApp não conectado" },
        { status: 400 }
      );
    }

    await whatsappService.requestHistorySync();

    return NextResponse.json({
      success: true,
      message: "Sync de histórico solicitado. Mensagens serão processadas automaticamente.",
    });
  } catch (error) {
    console.error("[API] Error syncing history:", error);
    return NextResponse.json(
      { error: "Erro ao sincronizar histórico" },
      { status: 500 }
    );
  }
}
