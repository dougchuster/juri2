import { NextResponse } from "next/server";
import { whatsappService } from "@/lib/integrations/baileys-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, text, mediaUrl, caption, mimeType, fileName, asVoiceNote } = body;

    if (!phone) {
      return NextResponse.json({ error: "Telefone é obrigatório" }, { status: 400 });
    }

    if (!whatsappService.isConnected()) {
      return NextResponse.json({ error: "WhatsApp não conectado" }, { status: 503 });
    }

    let result;
    if (mediaUrl) {
      result = await whatsappService.sendMedia(phone, mediaUrl, caption, mimeType, fileName, Boolean(asVoiceNote));
    } else if (text) {
      result = await whatsappService.sendText(phone, text);
    } else {
      return NextResponse.json({ error: "Texto ou mídia é obrigatório" }, { status: 400 });
    }

    if (result.ok) {
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
