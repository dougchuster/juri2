import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { sendWhatsappMediaMessage, sendWhatsappTextMessage } from "@/lib/whatsapp/application/message-service";
import { sendEmailMessage } from "@/actions/comunicacao";

const sendSchema = z.object({
    conversationId: z.string().min(1),
    content: z.string().optional().default(""),
    type: z.enum(["text", "image", "document", "audio"]),
    mediaUrl: z.string().optional(),
    caption: z.string().optional(),
    fileName: z.string().optional(),
    mimeType: z.string().optional(),
});

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Payload invalido", details: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;
    const conversation = await db.conversation.findUnique({
        where: { id: input.conversationId },
        include: {
            cliente: { select: { id: true } },
            processo: { select: { id: true } },
        },
    });

    if (!conversation) {
        return NextResponse.json({ error: "Conversa nao encontrada" }, { status: 404 });
    }

    if (conversation.canal === "EMAIL") {
        const result = await sendEmailMessage({
            clienteId: conversation.clienteId,
            subject: "Comunicacao",
            content: input.content || input.caption || "",
            processoId: conversation.processo?.id,
            conversationId: conversation.id,
        });
        return NextResponse.json(result, { status: "error" in result ? 400 : 200 });
    }

    if (input.type === "text") {
        const result = await sendWhatsappTextMessage({
            clienteId: conversation.clienteId,
            content: input.content,
            processoId: conversation.processo?.id || null,
            sentById: session.id,
            conversationId: conversation.id,
        });
        return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    if (!input.mediaUrl || !input.fileName || !input.mimeType) {
        return NextResponse.json({ error: "mediaUrl, fileName e mimeType sao obrigatorios para midia." }, { status: 400 });
    }

    const result = await sendWhatsappMediaMessage({
        clienteId: conversation.clienteId,
        fileUrl: input.mediaUrl,
        fileName: input.fileName,
        mimeType: input.mimeType,
        caption: input.caption,
        asVoiceNote: input.type === "audio",
        processoId: conversation.processo?.id || null,
        sentById: session.id,
        conversationId: conversation.id,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
