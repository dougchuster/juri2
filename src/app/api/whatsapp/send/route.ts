import { NextResponse } from "next/server";
import { normalizeWhatsApp } from "@/lib/utils/phone";
import { getPrimaryWhatsappConnection } from "@/lib/whatsapp/application/connection-service";
import { getWhatsappProviderAdapter } from "@/lib/whatsapp/providers/provider-registry";
import { withLegacyWhatsappHeaders } from "@/app/api/comunicacao/whatsapp/compat";

export const dynamic = "force-dynamic";

/**
 * Legacy compatibility endpoint.
 * Prefer /api/comunicacao/send for new callers.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, text, mediaUrl, caption, mimeType, fileName, asVoiceNote } = body;

    if (!phone) {
      return NextResponse.json(
        { error: "Telefone e obrigatorio" },
        withLegacyWhatsappHeaders({ status: 400 }, "/api/comunicacao/send")
      );
    }

    const connection = await getPrimaryWhatsappConnection();
    if (!connection) {
      return NextResponse.json(
        { error: "Nenhuma conexao primaria de WhatsApp configurada" },
        withLegacyWhatsappHeaders({ status: 400 }, "/api/comunicacao/send")
      );
    }

    const provider = getWhatsappProviderAdapter(connection.providerType);
    const status = await provider.getStatus(connection);
    if (!status.connected && connection.providerType !== "META_CLOUD_API") {
      return NextResponse.json(
        { error: "WhatsApp nao conectado" },
        withLegacyWhatsappHeaders({ status: 503 }, "/api/comunicacao/send")
      );
    }

    const normalizedPhone = normalizeWhatsApp(phone);
    const result = mediaUrl
      ? await provider.sendMedia({
          connection,
          to: normalizedPhone,
          fileUrl: mediaUrl,
          caption,
          mimeType: mimeType || "application/octet-stream",
          fileName: fileName || "arquivo",
          asVoiceNote: Boolean(asVoiceNote),
        })
      : text
        ? await provider.sendText({
            connection,
            to: normalizedPhone,
            text,
          })
        : null;

    if (!result) {
      return NextResponse.json(
        { error: "Texto ou midia e obrigatorio" },
        withLegacyWhatsappHeaders({ status: 400 }, "/api/comunicacao/send")
      );
    }

    if (result.ok) {
      return NextResponse.json({
        success: true,
        messageId: result.providerMessageId || null,
        providerType: connection.providerType,
      }, withLegacyWhatsappHeaders(undefined, "/api/comunicacao/send"));
    }

    return NextResponse.json(
      { error: result.error },
      withLegacyWhatsappHeaders({ status: 500 }, "/api/comunicacao/send")
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { error: message },
      withLegacyWhatsappHeaders({ status: 500 }, "/api/comunicacao/send")
    );
  }
}
