import { NextResponse } from "next/server";
import { storeWhatsAppMediaFile } from "@/lib/whatsapp/media-storage";
import { getSession } from "@/actions/auth";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024; // 25MB

const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/3gpp",
  "audio/ogg", "audio/mpeg", "audio/mp4",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo obrigatorio" }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "Arquivo vazio" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: "Arquivo excede o limite de 25MB" }, { status: 413 });
    }

    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json({ error: "Tipo de arquivo não permitido" }, { status: 415 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stored = await storeWhatsAppMediaFile({
      buffer,
      fileName: file.name || "arquivo",
      mimeType,
      folder: "comunicacao",
    });

    return NextResponse.json({
      success: true,
      fileUrl: stored.fileUrl,
      fileName: file.name || stored.fileName,
      mimeType,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("[API] Upload error:", error);
    return NextResponse.json({ error: "Erro ao processar upload" }, { status: 500 });
  }
}

