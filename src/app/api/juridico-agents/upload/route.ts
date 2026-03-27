import { NextResponse } from "next/server";
import { storeWhatsAppMediaFile } from "@/lib/whatsapp/media-storage";
import { extractLegalAttachmentText } from "@/lib/services/juridico-agents/attachments";
import { LEGAL_AI_DISABLED_MESSAGE, isLegalAiEnabled } from "@/lib/runtime-features";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_SIZE = 30 * 1024 * 1024; // 30MB

export async function POST(request: Request) {
    if (!isLegalAiEnabled()) {
        return NextResponse.json({ error: LEGAL_AI_DISABLED_MESSAGE }, { status: 410 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json({ error: "Arquivo obrigatorio." }, { status: 400 });
        }

        if (file.size <= 0) {
            return NextResponse.json({ error: "Arquivo vazio." }, { status: 400 });
        }

        if (file.size > MAX_UPLOAD_SIZE) {
            return NextResponse.json({ error: "Arquivo excede 30MB." }, { status: 413 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = file.type || "application/octet-stream";
        const fileName = file.name || "arquivo";

        const stored = await storeWhatsAppMediaFile({
            buffer,
            fileName,
            mimeType,
            folder: "juridico-agents",
        });

        const extraction = await extractLegalAttachmentText({
            buffer,
            fileName,
            mimeType,
            maxChars: 12_000,
        });

        return NextResponse.json({
            success: true,
            fileUrl: stored.fileUrl,
            fileName,
            mimeType,
            fileSize: file.size,
            extractedText: extraction.extractedText,
            extractedChars: extraction.extractedChars,
            extractionStatus: extraction.extractionStatus,
            extractionMethod: extraction.extractionMethod,
            warning: extraction.warning || null,
        });
    } catch (error) {
        console.error("[API] juridico-agents upload error:", error);
        return NextResponse.json({ error: "Erro ao processar upload do anexo." }, { status: 500 });
    }
}
