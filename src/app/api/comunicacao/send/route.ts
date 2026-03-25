import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { sendWhatsappMediaMessage, sendWhatsappTextMessage } from "@/lib/whatsapp/application/message-service";
import { sendEmailMessage } from "@/actions/comunicacao";
import { sendMetaTextMessage } from "@/lib/meta/meta-social";

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
    const conversation = await db.conversation.findFirst({
        where: { id: input.conversationId, ...(session.escritorioId ? { escritorioId: session.escritorioId } : {}) },
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

    // ─── Meta Social: Facebook Messenger + Instagram DMs ─────────────────────
    if (conversation.canal === "FACEBOOK_MESSENGER" || conversation.canal === "INSTAGRAM_DM") {
        if (!input.content?.trim()) {
            return NextResponse.json({ error: "Conteúdo obrigatório para mensagem Meta." }, { status: 400 });
        }

        const fullConv = await db.conversation.findUnique({
            where: { id: conversation.id },
            select: { metaSocialConnectionId: true, externalSenderId: true },
        });

        if (!fullConv?.metaSocialConnectionId || !fullConv.externalSenderId) {
            return NextResponse.json({ error: "Conversa não vinculada a uma conexão Meta Social." }, { status: 400 });
        }

        const socialConn = await db.metaSocialConnection.findUnique({
            where: { id: fullConv.metaSocialConnectionId },
            select: { pageAccessToken: true, isActive: true },
        });

        if (!socialConn?.isActive) {
            return NextResponse.json({ error: "Conexão Meta Social inativa." }, { status: 400 });
        }

        const sendResult = await sendMetaTextMessage(
            socialConn.pageAccessToken,
            fullConv.externalSenderId,
            input.content,
        );

        if (!sendResult.ok) {
            return NextResponse.json({ ok: false, error: sendResult.error }, { status: 400 });
        }

        // Persist outgoing message in DB
        await db.message.create({
            data: {
                conversationId: conversation.id,
                direction: "OUTBOUND",
                canal: conversation.canal,
                content: input.content,
                status: "SENT",
                providerMsgId: sendResult.messageId,
                sentById: session.id,
                sentAt: new Date(),
            },
        });

        await db.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: new Date() },
        });

        return NextResponse.json({ ok: true });
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
