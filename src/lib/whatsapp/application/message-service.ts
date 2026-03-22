import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { createMessage, getOrCreateConversation } from "@/lib/dal/comunicacao";
import {
    attachConversationToConnection,
    getPrimaryWhatsappConnection,
    getWhatsappConnectionById,
    resolveConversationWhatsappConnection,
} from "@/lib/whatsapp/application/connection-service";
import { getWhatsappProviderAdapter } from "@/lib/whatsapp/providers/provider-registry";
import { emitCommunicationMessageCreated } from "@/lib/comunicacao/realtime";
import { normalizeWhatsApp } from "@/lib/utils/phone";

type SendTextArgs = {
    clienteId: string;
    content: string;
    processoId?: string | null;
    sentById?: string | null;
    conversationId?: string | null;
    connectionId?: string | null;
};

type SendDirectTextArgs = {
    phone: string;
    content: string;
    connectionId?: string | null;
};

type SendMediaArgs = {
    clienteId: string;
    fileUrl: string;
    fileName: string;
    mimeType: string;
    fileSize?: number;
    caption?: string;
    asVoiceNote?: boolean;
    processoId?: string | null;
    sentById?: string | null;
    conversationId?: string | null;
    connectionId?: string | null;
};

export async function sendWhatsappTextMessage(args: SendTextArgs) {
    const cliente = await getClientWhatsappTarget(args.clienteId);
    if (!cliente.phone) {
        return { ok: false, error: "Cliente nao possui WhatsApp cadastrado." };
    }

    const conversation = args.conversationId
        ? await db.conversation.findUnique({ where: { id: args.conversationId } })
        : await getOrCreateConversation(args.clienteId, "WHATSAPP", args.processoId || undefined);

    if (!conversation) {
        return { ok: false, error: "Conversa nao encontrada." };
    }

    const connection = await resolveConnection({
        explicitConnectionId: args.connectionId,
        conversationId: conversation.id,
    });

    if (!connection) {
        return { ok: false, error: "Nenhuma conexao WhatsApp ativa foi configurada." };
    }

    const provider = getWhatsappProviderAdapter(connection.providerType);
    const sendResult = await provider.sendText({
        connection,
        to: cliente.phone,
        text: args.content,
    });

    const status = sendResult.ok ? "SENT" : "FAILED";
    const message = await createMessage({
        conversationId: conversation.id,
        direction: "OUTBOUND",
        canal: "WHATSAPP",
        content: args.content,
        status,
        providerMsgId: sendResult.providerMessageId || null,
        errorMessage: sendResult.ok ? undefined : sendResult.error || "Falha ao enviar mensagem",
        sentById: args.sentById || null,
        processoId: args.processoId || null,
    });

    await Promise.all([
        db.conversation.update({
            where: { id: conversation.id },
            data: {
                lastMessageAt: new Date(),
                whatsappConnectionId: conversation.whatsappConnectionId || connection.id,
            },
        }),
        db.clientPhone.updateMany({
            where: { clienteId: args.clienteId, isWhatsApp: true },
            data: { lastContactAt: new Date(), lastOutboundAt: new Date() },
        }),
    ]);

    emitCommunicationMessageCreated({
        conversationId: conversation.id,
        messageId: message.id,
        direction: "OUTBOUND",
        canal: "WHATSAPP",
        status,
    });

    if (!conversation.whatsappConnectionId) {
        await attachConversationToConnection(conversation.id, connection.id);
    }

    return {
        ok: sendResult.ok,
        conversationId: conversation.id,
        providerMessageId: sendResult.providerMessageId || null,
        error: sendResult.error,
    };
}

export async function sendWhatsappDirectText(args: SendDirectTextArgs) {
    const normalizedPhone = normalizeWhatsApp(args.phone);
    if (!normalizedPhone) {
        return { ok: false, error: "Numero de WhatsApp invalido." };
    }

    const connection = args.connectionId
        ? await getWhatsappConnectionById(args.connectionId)
        : await getPrimaryWhatsappConnection();

    if (!connection) {
        return { ok: false, error: "Nenhuma conexao WhatsApp ativa foi configurada." };
    }

    const provider = getWhatsappProviderAdapter(connection.providerType);
    const sendResult = await provider.sendText({
        connection,
        to: normalizedPhone,
        text: args.content,
    });

    return {
        ok: sendResult.ok,
        providerMessageId: sendResult.providerMessageId || null,
        providerType: connection.providerType,
        error: sendResult.error,
    };
}

export async function sendWhatsappMediaMessage(args: SendMediaArgs) {
    const cliente = await getClientWhatsappTarget(args.clienteId);
    if (!cliente.phone) {
        return { ok: false, error: "Cliente nao possui WhatsApp cadastrado." };
    }

    const conversation = args.conversationId
        ? await db.conversation.findUnique({ where: { id: args.conversationId } })
        : await getOrCreateConversation(args.clienteId, "WHATSAPP", args.processoId || undefined);

    if (!conversation) {
        return { ok: false, error: "Conversa nao encontrada." };
    }

    const connection = await resolveConnection({
        explicitConnectionId: args.connectionId,
        conversationId: conversation.id,
    });

    if (!connection) {
        return { ok: false, error: "Nenhuma conexao WhatsApp ativa foi configurada." };
    }

    const provider = getWhatsappProviderAdapter(connection.providerType);
    const fileBuffer = args.fileUrl.startsWith("/")
        ? await readLocalFile(args.fileUrl)
        : undefined;

    const sendResult = await provider.sendMedia({
        connection,
        to: cliente.phone,
        fileUrl: args.fileUrl,
        fileName: args.fileName,
        mimeType: args.mimeType,
        caption: args.caption,
        fileBuffer,
        asVoiceNote: args.asVoiceNote,
    });

    const status = sendResult.ok ? "SENT" : "FAILED";
    const messageContent = args.caption?.trim() || defaultMediaPlaceholder(args.mimeType, Boolean(args.asVoiceNote));
    const message = await db.message.create({
        data: {
            conversationId: conversation.id,
            direction: "OUTBOUND",
            canal: "WHATSAPP",
            content: messageContent,
            status,
            providerMsgId: sendResult.providerMessageId || null,
            errorMessage: sendResult.ok ? undefined : sendResult.error || "Falha ao enviar midia",
            sentById: args.sentById || null,
            processoId: args.processoId || null,
            sentAt: new Date(),
        },
    });

    await db.messageAttachment.create({
        data: {
            messageId: message.id,
            fileName: args.fileName,
            mimeType: args.mimeType,
            fileSize: args.fileSize || fileBuffer?.length || null,
            fileUrl: args.fileUrl,
        },
    });

    await Promise.all([
        db.conversation.update({
            where: { id: conversation.id },
            data: {
                lastMessageAt: new Date(),
                whatsappConnectionId: conversation.whatsappConnectionId || connection.id,
            },
        }),
        db.clientPhone.updateMany({
            where: { clienteId: args.clienteId, isWhatsApp: true },
            data: { lastContactAt: new Date(), lastOutboundAt: new Date() },
        }),
    ]);

    emitCommunicationMessageCreated({
        conversationId: conversation.id,
        messageId: message.id,
        direction: "OUTBOUND",
        canal: "WHATSAPP",
        status,
    });

    if (!conversation.whatsappConnectionId) {
        await attachConversationToConnection(conversation.id, connection.id);
    }

    return {
        ok: sendResult.ok,
        conversationId: conversation.id,
        providerMessageId: sendResult.providerMessageId || null,
        error: sendResult.error,
    };
}

async function resolveConnection(params: {
    explicitConnectionId?: string | null;
    conversationId?: string | null;
}) {
    if (params.explicitConnectionId) {
        return getWhatsappConnectionById(params.explicitConnectionId);
    }

    if (params.conversationId) {
        const conversationConnection = await resolveConversationWhatsappConnection(params.conversationId);
        if (conversationConnection) return conversationConnection;
    }

    return getPrimaryWhatsappConnection();
}

async function getClientWhatsappTarget(clienteId: string) {
    const cliente = await db.cliente.findUnique({
        where: { id: clienteId },
        select: {
            id: true,
            nome: true,
            whatsapp: true,
            celular: true,
            phones: {
                where: { isWhatsApp: true },
                orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
                take: 1,
                select: { phone: true },
            },
        },
    });

    const rawPhone = cliente?.phones[0]?.phone || cliente?.whatsapp || cliente?.celular || "";
    return {
        cliente,
        phone: normalizeWhatsApp(rawPhone),
    };
}

async function readLocalFile(fileUrl: string) {
    const relativePath = fileUrl.replace(/^\/+/, "");
    const absolutePath = path.join(process.cwd(), "public", ...relativePath.split("/"));
    return fs.readFile(absolutePath);
}

function defaultMediaPlaceholder(mimeType: string, asVoiceNote: boolean) {
    if (asVoiceNote || mimeType.startsWith("audio/")) return "[Audio enviado]";
    if (mimeType.startsWith("image/")) return "[Imagem enviada]";
    if (mimeType.startsWith("video/")) return "[Video enviado]";
    return "[Documento enviado]";
}
