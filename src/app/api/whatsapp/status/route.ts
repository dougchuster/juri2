import { NextResponse } from "next/server";
import { whatsappService } from "@/lib/integrations/baileys-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    whatsappService.restoreSessionInBackground();
    const status = whatsappService.getStatus();
    return NextResponse.json(status);
  } catch {
    return NextResponse.json(
      { error: "Erro ao obter status do WhatsApp" },
      { status: 500 }
    );
  }
}
