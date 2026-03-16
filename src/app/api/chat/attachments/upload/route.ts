import { NextResponse } from "next/server";

import { CHAT_ALLOWED_FILE_MIME_PREFIXES, CHAT_AUDIO_MIME_TYPES, CHAT_LIMITS } from "@/lib/chat/constants";
import { chatErrorResponse } from "@/lib/chat/http";
import { getChatAuthOrThrow } from "@/lib/chat/auth";
import { storeWhatsAppMediaFile } from "@/lib/whatsapp/media-storage";

export const dynamic = "force-dynamic";

function isAllowedFileMimeType(mimeType: string) {
  return CHAT_ALLOWED_FILE_MIME_PREFIXES.some((allowed) =>
    allowed.endsWith("/") ? mimeType.startsWith(allowed) : mimeType === allowed
  );
}

function isAllowedAudioMimeType(mimeType: string) {
  return CHAT_AUDIO_MIME_TYPES.includes(mimeType as (typeof CHAT_AUDIO_MIME_TYPES)[number]);
}

export async function POST(request: Request) {
  try {
    await getChatAuthOrThrow();

    const formData = await request.formData();
    const file = formData.get("file");
    const kind = String(formData.get("kind") || "FILE").toUpperCase();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo obrigatorio." }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "Arquivo vazio." }, { status: 400 });
    }

    const maxBytes = kind === "AUDIO" ? CHAT_LIMITS.audioMaxBytes : CHAT_LIMITS.uploadMaxBytes;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "Arquivo acima do limite permitido." }, { status: 413 });
    }

    const mimeType = file.type || "application/octet-stream";
    if (kind === "AUDIO" ? !isAllowedAudioMimeType(mimeType) : !isAllowedFileMimeType(mimeType)) {
      return NextResponse.json({ error: "Tipo de arquivo nao permitido." }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storeWhatsAppMediaFile({
      buffer,
      fileName: file.name || "arquivo-chat",
      mimeType,
      folder: "chat-interno",
    });

    return NextResponse.json({
      success: true,
      storageKey: stored.fileUrl,
      fileUrl: stored.fileUrl,
      originalName: file.name || stored.fileName,
      mimeType,
      sizeBytes: file.size,
    });
  } catch (error) {
    return chatErrorResponse(error, "Erro ao processar upload do chat.");
  }
}
