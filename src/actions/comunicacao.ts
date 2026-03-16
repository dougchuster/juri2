"use server";

import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import { revalidatePath } from "next/cache";
import {
    getOrCreateConversation, createMessage, getConversations as dalGetConversations,
    getMessages as dalGetMessages, getClientPhones as dalGetClientPhones,
    getTemplates as dalGetTemplates, getNotificationRules as dalGetNotificationRules,
    getCommunicationStats as dalGetCommunicationStats, getRecentJobs as dalGetRecentJobs,
    getJobStats as dalGetJobStats,
} from "@/lib/dal/comunicacao";
import { normalizePhoneE164, formatPhoneDisplay, isValidBrazilianPhone, autoFormatPhoneForStorage } from "@/lib/utils/phone";
import { ATENDIMENTO_STATUS_LABELS } from "@/lib/atendimentos-workflow";
import type {
    CanalComunicacao,
    ContactTagCategory,
    ConversationStatus,
    StatusCliente,
} from "@/generated/prisma";
import { promises as fs } from "fs";
import * as path from "path";
import { emitCommunicationMessageCreated } from "@/lib/comunicacao/realtime";

type TipoRegistroAtendimento =
    | "CONTATO"
    | "LEAD"
    | "CLIENTE"
    | "EX_CLIENTE"
    | "PARCEIRO";

type CicloVidaAtendimento =
    | "NOVO_CONTATO"
    | "LEAD"
    | "LEAD_QUALIFICADO"
    | "PROPOSTA_ENVIADA"
    | "EM_NEGOCIACAO"
    | "CLIENTE_ATIVO"
    | "CLIENTE_INATIVO"
    | "PERDIDO"
    | "ENCERRADO";

type StatusOperacionalAtendimento =
    | "NOVO"
    | "TRIAGEM"
    | "AGUARDANDO_CLIENTE"
    | "AGUARDANDO_EQUIPE_INTERNA"
    | "EM_ANALISE_JURIDICA"
    | "AGUARDANDO_DOCUMENTOS"
    | "REUNIAO_AGENDADA"
    | "REUNIAO_CONFIRMADA"
    | "PROPOSTA_ENVIADA"
    | "EM_NEGOCIACAO"
    | "CONTRATADO"
    | "NAO_CONTRATADO"
    | "ENCERRADO";

type PrioridadeAtendimento = "BAIXA" | "NORMAL" | "ALTA" | "URGENTE";

const PRIORIDADE_LABELS: Record<PrioridadeAtendimento, string> = {
    BAIXA: "Baixa",
    NORMAL: "Normal",
    ALTA: "Alta",
    URGENTE: "Urgente",
};

type StatusReuniaoAtendimento =
    | "NAO_AGENDADA"
    | "AGENDADA"
    | "CONFIRMADA"
    | "REMARCADA"
    | "CANCELADA"
    | "REALIZADA"
    | "NAO_COMPARECEU";

type ChatTagCategoryKey = "processos" | "prazos" | "cobrancas" | "atendimento" | "outros";

const CHAT_TAG_CATEGORY_META: Record<ChatTagCategoryKey, { id: string; name: string; color: string }> = {
    processos: { id: "processos", name: "Processos", color: "#3b82f6" },
    prazos: { id: "prazos", name: "Prazos", color: "#f59e0b" },
    cobrancas: { id: "cobrancas", name: "Cobrancas", color: "#ef4444" },
    atendimento: { id: "atendimento", name: "Atendimento", color: "#10b981" },
    outros: { id: "outros", name: "Outros", color: "#6b7280" },
};

function normalizeTagText(value: string | null | undefined) {
    return (value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function getCategoryFromExplicitHint(name: string, description?: string | null): ChatTagCategoryKey | null {
    const source = `${name || ""} ${description || ""}`;
    const normalized = normalizeTagText(source);

    const explicitMatch = normalized.match(/\b(?:categoria|category)\s*[:=-]\s*([a-z_]+)/i);
    if (explicitMatch?.[1]) {
        const raw = explicitMatch[1];
        if (raw.startsWith("process")) return "processos";
        if (raw.startsWith("prazo")) return "prazos";
        if (raw.startsWith("cobranc") || raw.startsWith("inadimpl")) return "cobrancas";
        if (raw.startsWith("atend")) return "atendimento";
        if (raw.startsWith("outro")) return "outros";
    }

    const prefix = normalizeTagText(name).split(":")[0]?.trim();
    if (prefix) {
        if (prefix.startsWith("process")) return "processos";
        if (prefix.startsWith("prazo")) return "prazos";
        if (prefix.startsWith("cobranc") || prefix.startsWith("inadimpl")) return "cobrancas";
        if (prefix.startsWith("atend")) return "atendimento";
    }

    return null;
}

function inferChatTagCategory(name: string, description?: string | null): ChatTagCategoryKey {
    const explicit = getCategoryFromExplicitHint(name, description);
    if (explicit) return explicit;

    const normalized = normalizeTagText(`${name || ""} ${description || ""}`);

    const processoHints = [
        "process", "cnj", "audiencia", "vara", "tribunal", "peticao",
        "recurso", "execucao", "sentenca", "juridico",
    ];
    if (processoHints.some((hint) => normalized.includes(hint))) return "processos";

    const prazoHints = ["prazo", "venc", "urgente", "d+", "deadline", "intimacao"];
    if (prazoHints.some((hint) => normalized.includes(hint))) return "prazos";

    const cobrancaHints = ["cobranc", "inadimpl", "financeir", "fatura", "honorario", "pagamento", "boleto", "pix"];
    if (cobrancaHints.some((hint) => normalized.includes(hint))) return "cobrancas";

    const atendimentoHints = [
        "atendimento", "lead", "prospect", "follow up", "followup", "consulta",
        "contato", "whatsapp", "email", "telefone", "previdenciario", "trabalhista",
        "civil", "empresarial", "familia", "consumidor",
    ];
    if (atendimentoHints.some((hint) => normalized.includes(hint))) return "atendimento";

    return "atendimento";
}

function mapDbCategoryToChat(category: ContactTagCategory | null | undefined): ChatTagCategoryKey | null {
    if (!category) return null;
    switch (category) {
        case "PROCESSOS":
            return "processos";
        case "PRAZOS":
            return "prazos";
        case "COBRANCAS":
            return "cobrancas";
        case "ATENDIMENTO":
            return "atendimento";
        case "OUTROS":
            return "outros";
        default:
            return null;
    }
}

function resolveChatTagCategory(tag: {
    name: string;
    description?: string | null;
    category?: ContactTagCategory | null;
}): ChatTagCategoryKey {
    const byDb = mapDbCategoryToChat(tag.category);
    if (byDb) return byDb;
    return inferChatTagCategory(tag.name, tag.description);
}

function isUnknownCategoryArgumentError(error: unknown) {
    if (!error) return false;
    const message = typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message)
        : String(error);
    return message.includes("Unknown argument `category`");
}

function buildTagCategory(category: ChatTagCategoryKey) {
    const meta = CHAT_TAG_CATEGORY_META[category];
    return { id: meta.id, name: meta.name, color: meta.color };
}

async function getWhatsAppService() {
    const baileysModule = await import("@/lib/integrations/baileys-service");
    return baileysModule.whatsappService;
}

async function getEvolutionApi() {
    return import("@/lib/integrations/evolution-api");
}

async function getEmailService() {
    return import("@/lib/integrations/email-service");
}

async function getTaskActions() {
    return import("@/actions/tarefas");
}

async function getAgendaActions() {
    return import("@/actions/agenda");
}

async function ensureWhatsAppConnected(timeoutMs = 10_000) {
    const whatsappService = await getWhatsAppService();
    if (whatsappService.isConnected()) return true;

    try {
        await whatsappService.connect();
    } catch (error) {
        console.error("[sendWhatsAppMessage] Failed to initialize WhatsApp connection:", error);
    }

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (whatsappService.isConnected()) return true;
        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    return whatsappService.isConnected();
}

interface OutboundMediaPayload {
    fileUrl: string;
    fileName: string;
    mimeType: string;
    fileSize?: number;
    caption?: string;
    asVoiceNote?: boolean;
}

function mediaPlaceholder(mimeType: string, isVoiceNote?: boolean) {
    const normalized = (mimeType || "").toLowerCase();
    if (normalized.startsWith("image/")) return "[Imagem]";
    if (normalized.startsWith("video/")) return "[Video]";
    if (normalized.startsWith("audio/")) return isVoiceNote ? "[Audio] Mensagem de voz" : "[Audio]";
    return "[Documento]";
}

function resolveLocalUploadPath(fileUrl: string): string | null {
    if (!fileUrl || !fileUrl.startsWith("/uploads/")) return null;
    const normalized = path.posix.normalize(fileUrl);
    if (!normalized.startsWith("/uploads/")) return null;
    const relative = normalized.replace(/^\/+/, "");
    return path.join(process.cwd(), "public", relative);
}

function slugifyDocumentName(value: string) {
    return (value || "documento")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || "documento";
}

function mapConversationChannelToAttendance(canal: CanalComunicacao) {
    if (canal === "WHATSAPP") return "WHATSAPP" as const;
    if (canal === "EMAIL") return "EMAIL" as const;
    return "TELEFONE" as const;
}

function deriveTipoRegistro(status: StatusCliente): TipoRegistroAtendimento {
    if (status === "ATIVO") return "CLIENTE";
    if (status === "INATIVO") return "EX_CLIENTE";
    if (status === "ARQUIVADO") return "PARCEIRO";
    return "LEAD";
}

function deriveCicloVida(status: StatusCliente): CicloVidaAtendimento {
    if (status === "ATIVO") return "CLIENTE_ATIVO";
    if (status === "INATIVO") return "CLIENTE_INATIVO";
    if (status === "ARQUIVADO") return "ENCERRADO";
    return "LEAD";
}

function derivePriorityFromTagNames(tagNames: string[]): PrioridadeAtendimento {
    const normalized = tagNames.map((tag) => normalizeTagText(tag));
    if (normalized.some((tag) => tag.includes("alta urgencia") || tag.includes("prazo curto"))) {
        return "URGENTE";
    }
    if (normalized.some((tag) => tag.includes("vip") || tag.includes("urgencia processual"))) {
        return "ALTA";
    }
    return "NORMAL";
}

async function getDefaultEscritorioId() {
    const escritorio = await db.escritorio.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
    });
    return escritorio?.id || null;
}

async function resolveResponsibleAdvogadoId(params: {
    session: Awaited<ReturnType<typeof getSession>>;
    assignedToId?: string | null;
}) {
    if (params.session?.advogado?.id) return params.session.advogado.id;

    if (params.assignedToId) {
        const assignedUser = await db.user.findUnique({
            where: { id: params.assignedToId },
            select: { advogado: { select: { id: true } } },
        });
        if (assignedUser?.advogado?.id) return assignedUser.advogado.id;
    }

    const fallback = await db.advogado.findFirst({
        where: { ativo: true },
        orderBy: { user: { name: "asc" } },
        select: { id: true },
    });

    return fallback?.id || null;
}

async function appendAtendimentoHistorico(params: {
    atendimentoId: string;
    userId?: string | null;
    canal: "PRESENCIAL" | "TELEFONE" | "EMAIL" | "WHATSAPP" | "SITE" | "INDICACAO";
    descricao: string;
}) {
    await db.atendimentoHistorico.create({
        data: {
            atendimentoId: params.atendimentoId,
            userId: params.userId || "system",
            canal: params.canal,
            descricao: params.descricao,
        },
    });
}

async function safeGetSession() {
    try {
        return await getSession();
    } catch (error) {
        console.warn("[comunicacao] Session unavailable for passive workspace load:", error);
        return null;
    }
}

async function ensureConversationAttendance(conversationId: string) {
    const session = await safeGetSession();
    const conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        include: {
            cliente: {
                select: {
                    id: true,
                    nome: true,
                    status: true,
                    origem: { select: { nome: true } },
                    contactTags: {
                        include: { tag: true },
                    },
                },
            },
            processo: { select: { id: true, numeroCnj: true, objeto: true, status: true } },
            assignedTo: { select: { id: true, name: true } },
            atendimento: {
                include: {
                    advogado: { include: { user: { select: { id: true, name: true } } } },
                    processo: { select: { id: true, numeroCnj: true, objeto: true, status: true } },
                    historicos: { orderBy: { createdAt: "desc" }, take: 12 },
                },
            },
            messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { content: true, createdAt: true },
            },
        },
    });

    if (!conversation) return null;
    if (conversation.atendimento) return conversation.atendimento;

    const existingWhere: Record<string, unknown> = {
        clienteId: conversation.clienteId,
        statusOperacional: { not: "ENCERRADO" },
    };
    if (conversation.processoId) {
        existingWhere.OR = [
            { processoId: conversation.processoId },
            { processoId: null },
        ];
    }

    const existing = await db.atendimento.findFirst({
        where: existingWhere,
        include: {
            advogado: { include: { user: { select: { id: true, name: true } } } },
            processo: { select: { id: true, numeroCnj: true, objeto: true, status: true } },
            historicos: { orderBy: { createdAt: "desc" }, take: 12 },
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    if (existing) {
        await db.conversation.update({
            where: { id: conversationId },
            data: { atendimentoId: existing.id },
        });
        return existing;
    }

    const advogadoId = await resolveResponsibleAdvogadoId({
        session,
        assignedToId: conversation.assignedToId,
    });

    if (!advogadoId) return null;

    const tagNames = conversation.cliente.contactTags.map((item) => item.tag.name);
    const latestMessage = conversation.messages[0];
    const autoCreated = await db.atendimento.create({
        data: {
            clienteId: conversation.clienteId,
            advogadoId,
            processoId: conversation.processoId || null,
            canal: mapConversationChannelToAttendance(conversation.canal),
            status: "LEAD",
            viabilidade: "EM_ANALISE",
            tipoRegistro: deriveTipoRegistro(conversation.cliente.status),
            cicloVida: deriveCicloVida(conversation.cliente.status),
            statusOperacional: "NOVO",
            prioridade: derivePriorityFromTagNames(tagNames),
            assunto: "",
            resumo: null,
            areaJuridica: tagNames.find((tag) =>
                [
                    "previdenciario",
                    "trabalhista",
                    "civel",
                    "familia",
                    "sucessoes",
                    "imobiliario",
                    "empresarial",
                    "consumidor",
                    "tributario",
                    "administrativo",
                    "bancario",
                    "contratual",
                    "criminal",
                    "saude",
                    "lgpd",
                    "licitacoes",
                    "ambiental",
                    "agrario",
                    "eleitoral",
                    "internacional",
                ].some((hint) => normalizeTagText(tag).includes(hint)),
            ) || null,
            origemAtendimento: conversation.cliente.origem?.nome || (conversation.canal === "WHATSAPP" ? "WhatsApp" : "E-mail"),
            ultimaInteracaoEm: conversation.lastMessageAt || latestMessage?.createdAt || new Date(),
        },
        include: {
            advogado: { include: { user: { select: { id: true, name: true } } } },
            processo: { select: { id: true, numeroCnj: true, objeto: true, status: true } },
            historicos: { orderBy: { createdAt: "desc" }, take: 12 },
        },
    });

    await db.conversation.update({
        where: { id: conversationId },
        data: { atendimentoId: autoCreated.id },
    });

    await appendAtendimentoHistorico({
        atendimentoId: autoCreated.id,
        userId: session?.id,
        canal: autoCreated.canal,
        descricao: "Atendimento operacional criado automaticamente a partir da conversa.",
    });

    return autoCreated;
}

// =============================================================
// SEND MESSAGES
// =============================================================

export async function sendWhatsAppMessage(
    clienteId: string,
    content: string,
    processoId?: string
) {
    const user = await getSession();
    if (!user) {
        console.error("[sendWhatsAppMessage] Not authenticated");
        return { error: "Não autenticado" };
    }

    // Get client phone
    const cliente = await db.cliente.findUnique({
        where: { id: clienteId },
        select: { id: true, whatsapp: true, celular: true, nome: true, phones: { where: { isWhatsApp: true }, take: 1, orderBy: { isPrimary: "desc" } } },
    });

    if (!cliente) {
        console.error("[sendWhatsAppMessage] Client not found:", clienteId);
        return { error: "Cliente não encontrado" };
    }

    const phone = cliente.phones[0]?.phone || cliente.whatsapp || cliente.celular;
    if (!phone) {
        console.error("[sendWhatsAppMessage] No phone for client:", clienteId);
        return { error: "Cliente não possui WhatsApp cadastrado" };
    }

    const normalizedPhone = normalizePhoneE164(phone);
    console.log(`[sendWhatsAppMessage] Sending to ${cliente.nome} at ${normalizedPhone}`);

    const connected = await ensureWhatsAppConnected();
    if (!connected) {
        console.error("[sendWhatsAppMessage] WhatsApp disconnected");
        return { error: "WhatsApp não está conectado. Conecte em Administração > Comunicação." };
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(clienteId, "WHATSAPP", processoId);

    // Send via Baileys (through Evolution API compatibility layer)
    const { sendTextMessage } = await getEvolutionApi();
    const result = await sendTextMessage(normalizedPhone, content);
    console.log(`[sendWhatsAppMessage] Result:`, JSON.stringify(result));

    const status = result.ok ? "SENT" as const : "FAILED" as const;
    const providerMsgId = result.data?.key?.id || null;

    // Create message record
    const createdMessage = await createMessage({
        conversationId: conversation.id,
        direction: "OUTBOUND",
        canal: "WHATSAPP",
        content,
        status,
        providerMsgId,
        errorMessage: result.ok ? undefined : (result.error || "Falha ao enviar"),
        sentById: user.id,
        processoId: processoId || null,
    });
    emitCommunicationMessageCreated({
        conversationId: conversation.id,
        messageId: createdMessage.id,
        direction: "OUTBOUND",
        canal: "WHATSAPP",
        status,
    });

    // Update conversation last message
    await db.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
    });

    revalidatePath("/comunicacao");
    return result.ok
        ? { success: true, messageId: providerMsgId }
        : { error: result.error || "Falha ao enviar mensagem" };
}

export async function sendWhatsAppMediaMessage(
    clienteId: string,
    media: OutboundMediaPayload,
    processoId?: string
) {
    const user = await getSession();
    if (!user) {
        return { error: "Não autenticado" };
    }

    if (!media?.fileUrl || !media?.mimeType || !media?.fileName) {
        return { error: "Arquivo inválido para envio" };
    }

    const localPath = resolveLocalUploadPath(media.fileUrl);
    if (!localPath) {
        return { error: "Arquivo fora da area permitida" };
    }

    const cliente = await db.cliente.findUnique({
        where: { id: clienteId },
        select: {
            id: true,
            whatsapp: true,
            celular: true,
            nome: true,
            phones: { where: { isWhatsApp: true }, take: 1, orderBy: { isPrimary: "desc" } },
        },
    });

    if (!cliente) return { error: "Cliente não encontrado" };

    const phone = cliente.phones[0]?.phone || cliente.whatsapp || cliente.celular;
    if (!phone) return { error: "Cliente não possui WhatsApp cadastrado" };

    const normalizedPhone = normalizePhoneE164(phone);
    const connected = await ensureWhatsAppConnected();
    if (!connected) {
        return { error: "WhatsApp não está conectado. Conecte em Administração > Comunicação." };
    }

    let fileBuffer: Buffer;
    try {
        fileBuffer = await fs.readFile(localPath);
    } catch {
        return { error: "Não foi possível ler o arquivo para envio" };
    }

    const conversation = await getOrCreateConversation(clienteId, "WHATSAPP", processoId);
    const { sendMediaBufferMessage } = await getEvolutionApi();
    const sendResult = await sendMediaBufferMessage(normalizedPhone, fileBuffer, {
        caption: media.caption || undefined,
        mimeType: media.mimeType,
        fileName: media.fileName,
        asVoiceNote: Boolean(media.asVoiceNote),
    });

    const status = sendResult.ok ? "SENT" as const : "FAILED" as const;
    const providerMsgId = sendResult.data?.key?.id || null;
    const messageContent = media.caption?.trim() || mediaPlaceholder(media.mimeType, media.asVoiceNote);

    const savedMessage = await db.message.create({
        data: {
            conversationId: conversation.id,
            direction: "OUTBOUND",
            canal: "WHATSAPP",
            content: messageContent,
            status,
            providerMsgId,
            errorMessage: sendResult.ok ? undefined : (sendResult.error || "Falha ao enviar"),
            sentById: user.id,
            processoId: processoId || null,
            sentAt: new Date(),
        },
    });

    await db.messageAttachment.create({
        data: {
            messageId: savedMessage.id,
            fileName: media.fileName,
            mimeType: media.mimeType,
            fileSize: media.fileSize || fileBuffer.length,
            fileUrl: media.fileUrl,
        },
    });

    await db.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
    });
    emitCommunicationMessageCreated({
        conversationId: conversation.id,
        messageId: savedMessage.id,
        direction: "OUTBOUND",
        canal: "WHATSAPP",
        status,
    });

    revalidatePath("/comunicacao");
    return sendResult.ok
        ? { success: true, messageId: providerMsgId }
        : { error: sendResult.error || "Falha ao enviar midia" };
}

export async function sendEmailMessage(
    clienteId: string,
    subject: string,
    content: string,
    contentHtml?: string,
    processoId?: string
) {
    const user = await getSession();
    if (!user) return { error: "Não autenticado" };

    const cliente = await db.cliente.findUnique({
        where: { id: clienteId },
        select: { id: true, email: true, nome: true },
    });

    if (!cliente) return { error: "Cliente não encontrado" };
    if (!cliente.email) return { error: "Cliente não possui e-mail cadastrado" };

    const conversation = await getOrCreateConversation(clienteId, "EMAIL", processoId);

    const { sendEmail, wrapInEmailLayout } = await getEmailService();
    const html = contentHtml || wrapInEmailLayout(`<p>${content.replace(/\n/g, "<br/>")}</p>`);

    const result = await sendEmail({
        to: cliente.email,
        subject,
        html,
        text: content,
    });

    const status = result.ok ? "SENT" as const : "FAILED" as const;

    const createdMessage = await createMessage({
        conversationId: conversation.id,
        direction: "OUTBOUND",
        canal: "EMAIL",
        content,
        contentHtml: html,
        status,
        providerMsgId: result.messageId || null,
        sentById: user.id,
        processoId: processoId || null,
    });
    emitCommunicationMessageCreated({
        conversationId: conversation.id,
        messageId: createdMessage.id,
        direction: "OUTBOUND",
        canal: "EMAIL",
        status,
    });

    revalidatePath("/comunicacao");
    return result.ok
        ? { success: true, messageId: result.messageId }
        : { error: result.error || "Falha ao enviar e-mail" };
}

export async function sendTemplateMessage(
    clienteId: string,
    templateName: string,
    canal: CanalComunicacao,
    extraVars?: Record<string, string>,
    processoId?: string
) {
    const user = await getSession();
    if (!user) return { error: "Não autenticado" };

    const template = await db.messageTemplate.findUnique({ where: { name: templateName } });
    if (!template) return { error: "Template não encontrado" };

    const cliente = await db.cliente.findUnique({
        where: { id: clienteId },
        select: { id: true, nome: true, email: true, whatsapp: true, celular: true },
    });
    if (!cliente) return { error: "Cliente não encontrado" };

    const escritorio = await db.escritorio.findFirst({ select: { nome: true } });
    const { renderTemplate, wrapInEmailLayout } = await getEmailService();

    const variables: Record<string, string> = {
        nome: cliente.nome,
        escritorio: escritorio?.nome || "Escritório Jurídico",
        ...extraVars,
    };

    const content = renderTemplate(template.content, variables);

    if (canal === "WHATSAPP") {
        return sendWhatsAppMessage(clienteId, content, processoId);
    } else {
        const subject = template.subject ? renderTemplate(template.subject, variables) : "Comunicação";
        const html = template.contentHtml
            ? wrapInEmailLayout(renderTemplate(template.contentHtml, variables))
            : undefined;
        return sendEmailMessage(clienteId, subject, content, html, processoId);
    }
}

// =============================================================
// CONVERSATIONS
// =============================================================

export async function fetchConversations(filters: {
    clienteId?: string;
    canal?: CanalComunicacao;
    status?: ConversationStatus;
    search?: string;
    page?: number;
}) {
    return dalGetConversations(filters);
}

export async function fetchMessages(conversationId: string, page?: number) {
    return dalGetMessages(conversationId, page);
}

export async function markConversationAsRead(conversationId: string) {
    await db.conversation.update({
        where: { id: conversationId },
        data: { unreadCount: 0 },
    });
    await db.message.updateMany({
        where: { conversationId, direction: "INBOUND", readAt: null },
        data: { readAt: new Date() },
    });
    revalidatePath("/comunicacao");
}

export async function closeConversation(conversationId: string) {
    await db.conversation.update({
        where: { id: conversationId },
        data: { status: "CLOSED" },
    });
    revalidatePath("/comunicacao");
}

export async function reopenConversation(conversationId: string) {
    await db.conversation.update({
        where: { id: conversationId },
        data: { status: "OPEN" },
    });
    revalidatePath("/comunicacao");
}

export async function unlinkConversationProcess(conversationId: string) {
    await db.conversation.update({
        where: { id: conversationId },
        data: { processoId: null },
    });
    revalidatePath("/comunicacao");
    return { success: true };
}

export async function deleteConversationPermanent(conversationId: string) {
    await db.conversation.delete({
        where: { id: conversationId },
    });
    revalidatePath("/comunicacao");
    return { success: true };
}

// =============================================================
// CLIENT PHONES
// =============================================================

export async function fetchClientPhones(clienteId: string) {
    return dalGetClientPhones(clienteId);
}

export async function addClientPhone(formData: FormData) {
    const clienteId = formData.get("clienteId") as string;
    const phoneRaw = formData.get("phone") as string;
    const label = (formData.get("label") as string) || "principal";
    const isWhatsApp = formData.get("isWhatsApp") === "true";
    const isPrimary = formData.get("isPrimary") === "true";

    if (!clienteId || !phoneRaw) return { error: "Dados obrigatórios faltando" };
    if (!isValidBrazilianPhone(phoneRaw)) return { error: "Número de telefone inválido" };

    const phone = normalizePhoneE164(phoneRaw);
    const phoneDisplay = formatPhoneDisplay(phoneRaw);

    // Check uniqueness
    const existing = await db.clientPhone.findUnique({ where: { phone } });
    if (existing) return { error: "Este número já está cadastrado" };

    // If setting as primary, unset others
    if (isPrimary) {
        await db.clientPhone.updateMany({
            where: { clienteId, isPrimary: true },
            data: { isPrimary: false },
        });
    }

    await db.clientPhone.create({
        data: { clienteId, phone, phoneDisplay, label, isWhatsApp, isPrimary },
    });

    revalidatePath("/clientes");
    revalidatePath("/comunicacao");
    return { success: true };
}

export async function removeClientPhone(phoneId: string) {
    await db.clientPhone.delete({ where: { id: phoneId } });
    revalidatePath("/clientes");
    return { success: true };
}

export async function updatePhoneOptIn(phoneId: string, status: "OPTED_IN" | "OPTED_OUT") {
    await db.clientPhone.update({
        where: { id: phoneId },
        data: { whatsappOptIn: status },
    });
    revalidatePath("/clientes");
    revalidatePath("/comunicacao");
    return { success: true };
}

// =============================================================
// CHAT CLIENT PROFILE + TAGS
// =============================================================
export async function fetchClientChatProfile(clienteId: string) {
    if (!clienteId) return { error: "Cliente nao informado" };

    try {
        const [cliente, escritorio] = await Promise.all([
            db.cliente.findUnique({
                where: { id: clienteId },
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    celular: true,
                    whatsapp: true,
                    status: true,
                    inadimplente: true,
                    observacoes: true,
                    contactTags: {
                        include: { tag: true },
                        orderBy: { assignedAt: "asc" },
                    },
                },
            }),
            db.escritorio.findFirst({
                select: { id: true },
                orderBy: { createdAt: "asc" },
            }),
        ]);

        if (!cliente) return { error: "Cliente nao encontrado" };
        if (!escritorio?.id) return { error: "Escritorio nao configurado" };

        let availableTags: Array<{ id: string; name: string; color: string; description: string | null; category?: ContactTagCategory | null }>;
        try {
            availableTags = await db.contactTag.findMany({
                where: { escritorioId: escritorio.id },
                orderBy: [{ category: "asc" }, { name: "asc" }],
                select: {
                    id: true,
                    name: true,
                    color: true,
                    description: true,
                    category: true,
                },
            });
        } catch (error) {
            if (!isUnknownCategoryArgumentError(error)) throw error;
            availableTags = await db.contactTag.findMany({
                where: { escritorioId: escritorio.id },
                orderBy: { name: "asc" },
                select: {
                    id: true,
                    name: true,
                    color: true,
                    description: true,
                },
            });
        }

        const categoriesMap = new Map<string, { id: string; name: string; color: string; tags: Array<{ id: string; name: string; color: string }> }>();
        for (const tag of availableTags) {
            const categoryKey = resolveChatTagCategory(tag);
            const category = buildTagCategory(categoryKey);
            const current = categoriesMap.get(category.id) || { ...category, tags: [] };
            current.tags.push({
                id: tag.id,
                name: tag.name,
                color: tag.color,
            });
            categoriesMap.set(category.id, current);
        }

        const orderedCategoryIds: ChatTagCategoryKey[] = ["processos", "prazos", "cobrancas", "atendimento", "outros"];
        const categories = orderedCategoryIds
            .map((id) => categoriesMap.get(CHAT_TAG_CATEGORY_META[id].id))
            .filter((category): category is { id: string; name: string; color: string; tags: Array<{ id: string; name: string; color: string }> } => Boolean(category))
            .map((category) => ({
                ...category,
                tags: category.tags.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
            }));

        return {
            success: true,
            cliente: {
                id: cliente.id,
                nome: cliente.nome,
                email: cliente.email,
                celular: cliente.celular,
                whatsapp: cliente.whatsapp,
                status: cliente.status,
                inadimplente: cliente.inadimplente,
                observacoes: cliente.observacoes,
                tags: cliente.contactTags.map((link) => {
                    const categoryKey = resolveChatTagCategory(link.tag);
                    const category = buildTagCategory(categoryKey);
                    return {
                        id: link.tag.id,
                        name: link.tag.name,
                        color: link.tag.color,
                        category,
                    };
                }),
            },
            categories,
        };
    } catch (error) {
        console.error("[fetchClientChatProfile] Error:", error);
        return { error: "Falha ao carregar perfil do cliente" };
    }
}

export async function updateClientChatProfile(data: {
    id: string;
    nome: string;
    email?: string | null;
    celular?: string | null;
    whatsapp?: string | null;
    status?: StatusCliente;
    observacoes?: string | null;
    inadimplente?: boolean;
}) {
    if (!data.id || !data.nome?.trim()) {
        return { error: "Nome do cliente é obrigatório" };
    }

    const celular = data.celular?.trim() ? autoFormatPhoneForStorage(data.celular) : null;
    const whatsapp = data.whatsapp?.trim() ? autoFormatPhoneForStorage(data.whatsapp) : null;
    const primaryPhone = whatsapp || celular;

    const cliente = await db.cliente.update({
        where: { id: data.id },
        data: {
            nome: data.nome.trim(),
            email: data.email?.trim() || null,
            celular,
            whatsapp,
            status: data.status,
            observacoes: data.observacoes?.trim() || null,
            inadimplente: data.inadimplente,
        },
    });

    if (primaryPhone && isValidBrazilianPhone(primaryPhone)) {
        const phone = normalizePhoneE164(primaryPhone);
        const phoneDisplay = formatPhoneDisplay(primaryPhone);
        const existingPrimary = await db.clientPhone.findFirst({
            where: { clienteId: data.id, isPrimary: true },
        });

        if (existingPrimary) {
            await db.clientPhone.update({
                where: { id: existingPrimary.id },
                data: { phone, phoneDisplay, isWhatsApp: true },
            });
        } else {
            const existingByPhone = await db.clientPhone.findUnique({ where: { phone } });
            if (!existingByPhone) {
                await db.clientPhone.create({
                    data: {
                        clienteId: data.id,
                        phone,
                        phoneDisplay,
                        label: "whatsapp",
                        isWhatsApp: true,
                        isPrimary: true,
                        whatsappOptIn: "OPTED_IN",
                    },
                });
            } else if (existingByPhone.clienteId === data.id) {
                await db.clientPhone.update({
                    where: { id: existingByPhone.id },
                    data: { phoneDisplay, isWhatsApp: true, isPrimary: true },
                });
            }
        }
    }

    await db.atendimento.updateMany({
        where: { clienteId: data.id, statusOperacional: { not: "ENCERRADO" } },
        data: {
            tipoRegistro: deriveTipoRegistro(cliente.status),
            cicloVida: deriveCicloVida(cliente.status),
        },
    });
    await refreshClientAttendanceAutomation(data.id);

    revalidatePath("/comunicacao");
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${data.id}`);
    return { success: true, cliente };
}

export async function fetchConversationWorkspace(conversationId: string) {
    if (!conversationId) return { error: "Conversa nao informada" };

    try {
        const session = await safeGetSession();
        const attendance = await ensureConversationAttendance(conversationId);
        const conversation = await db.conversation.findUnique({
            where: { id: conversationId },
            select: {
                id: true,
                clienteId: true,
                canal: true,
                status: true,
                subject: true,
                processoId: true,
                lastMessageAt: true,
                unreadCount: true,
                iaDesabilitada: true,
                iaDesabilitadaEm: true,
                iaDesabilitadaPor: true,
                autoAtendimentoPausado: true,
                pausadoAte: true,
                motivoPausa: true,
                assignedTo: {
                    select: { id: true, name: true, role: true },
                },
                cliente: {
                    select: {
                        id: true,
                        nome: true,
                        email: true,
                        celular: true,
                        whatsapp: true,
                        status: true,
                        inadimplente: true,
                        observacoes: true,
                        crmRelationship: true,
                        crmInterestLevel: true,
                        crmScore: true,
                        origem: { select: { id: true, nome: true } },
                    },
                },
                processo: { select: { id: true, numeroCnj: true, objeto: true, status: true } },
            },
        });

        if (!conversation) return { error: "Conversa nao encontrada" };

        let unreadCount = conversation.unreadCount;
        if (session && conversation.unreadCount > 0) {
            const readAt = new Date();
            await Promise.all([
                db.conversation.update({
                    where: { id: conversationId },
                    data: { unreadCount: 0 },
                }),
                db.message.updateMany({
                    where: {
                        conversationId,
                        direction: "INBOUND",
                        readAt: null,
                    },
                    data: { readAt },
                }),
            ]);
            unreadCount = 0;
        }

        const [profileResult, advogados, users, processosCliente] = await Promise.all([
            fetchClientChatProfile(conversation.clienteId),
            db.advogado.findMany({
                where: { ativo: true },
                include: { user: { select: { id: true, name: true } } },
                orderBy: { user: { name: "asc" } },
            }),
            db.user.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    name: true,
                    role: true,
                    advogado: { select: { id: true } },
                },
                orderBy: { name: "asc" },
            }),
            db.processo.findMany({
                where: { clienteId: conversation.clienteId },
                select: { id: true, numeroCnj: true, objeto: true, status: true },
                orderBy: { updatedAt: "desc" },
                take: 20,
            }),
        ]);

        const atendimentoAtual = attendance
            ? await db.atendimento.findUnique({
                where: { id: attendance.id },
                include: {
                    advogado: { include: { user: { select: { id: true, name: true } } } },
                    processo: { select: { id: true, numeroCnj: true, objeto: true, status: true } },
                    historicos: { orderBy: { createdAt: "desc" }, take: 16 },
                },
            })
            : null;

        return {
            success: true,
            workspace: {
                conversation: {
                    id: conversation.id,
                    canal: conversation.canal,
                    status: conversation.status,
                    subject: conversation.subject,
                    processoId: conversation.processoId,
                    lastMessageAt: conversation.lastMessageAt?.toISOString() || null,
                    unreadCount,
                    iaDesabilitada: conversation.iaDesabilitada,
                    iaDesabilitadaEm: conversation.iaDesabilitadaEm?.toISOString() || null,
                    iaDesabilitadaPor: conversation.iaDesabilitadaPor,
                    autoAtendimentoPausado: conversation.autoAtendimentoPausado,
                    pausadoAte: conversation.pausadoAte?.toISOString() || null,
                    motivoPausa: conversation.motivoPausa,
                    assignedTo: conversation.assignedTo,
                    cliente: {
                        ...conversation.cliente,
                    },
                    processo: conversation.processo
                        ? {
                            ...conversation.processo,
                        }
                        : null,
                },
                clientProfile: profileResult && "success" in profileResult ? profileResult.cliente : null,
                tagCategories: profileResult && "success" in profileResult ? profileResult.categories : [],
                atendimento: atendimentoAtual
                    ? {
                        id: atendimentoAtual.id,
                        advogadoId: atendimentoAtual.advogadoId,
                        processoId: atendimentoAtual.processoId,
                        tipoRegistro: atendimentoAtual.tipoRegistro,
                        cicloVida: atendimentoAtual.cicloVida,
                        statusOperacional: atendimentoAtual.statusOperacional,
                        prioridade: atendimentoAtual.prioridade,
                        areaJuridica: atendimentoAtual.areaJuridica,
                        subareaJuridica: atendimentoAtual.subareaJuridica,
                        origemAtendimento: atendimentoAtual.origemAtendimento,
                        proximaAcao: atendimentoAtual.proximaAcao,
                        proximaAcaoAt: atendimentoAtual.proximaAcaoAt?.toISOString() || null,
                        situacaoDocumental: atendimentoAtual.situacaoDocumental,
                        chanceFechamento: atendimentoAtual.chanceFechamento,
                        motivoPerda: atendimentoAtual.motivoPerda,
                        dataReuniao: atendimentoAtual.dataReuniao?.toISOString() || null,
                        statusReuniao: atendimentoAtual.statusReuniao,
                        observacoesReuniao: atendimentoAtual.observacoesReuniao,
                        assunto: atendimentoAtual.assunto,
                        resumo: atendimentoAtual.resumo,
                        ultimaInteracaoEm: atendimentoAtual.ultimaInteracaoEm?.toISOString() || null,
                        advogado: {
                            user: {
                                id: atendimentoAtual.advogado.user.id,
                                name: atendimentoAtual.advogado.user.name,
                            },
                        },
                        processo: atendimentoAtual.processo
                            ? {
                                ...atendimentoAtual.processo,
                            }
                            : null,
                        historicos: atendimentoAtual.historicos.map((item) => ({
                            id: item.id,
                            canal: item.canal,
                            descricao: item.descricao,
                            createdAt: item.createdAt.toISOString(),
                        })),
                    }
                    : null,
                advogados: advogados.map((item) => ({
                    id: item.id,
                    userId: item.user.id,
                    name: item.user.name || "Advogado",
                })),
                users: users.map((item) => ({
                    id: item.id,
                    name: item.name,
                    role: item.role,
                    advogadoId: item.advogado?.id || null,
                })),
                processos: processosCliente.map((item) => ({
                    id: item.id,
                    numeroCnj: item.numeroCnj,
                    objeto: item.objeto,
                    status: item.status,
                })),
                metadata: {
                    tipoRegistro: [
                        { value: "CONTATO", label: "Contato" },
                        { value: "LEAD", label: "Lead" },
                        { value: "CLIENTE", label: "Cliente" },
                        { value: "EX_CLIENTE", label: "Ex-cliente" },
                        { value: "PARCEIRO", label: "Parceiro" },
                    ],
                    cicloVida: [
                        { value: "NOVO_CONTATO", label: "Novo contato" },
                        { value: "LEAD", label: "Lead" },
                        { value: "LEAD_QUALIFICADO", label: "Lead qualificado" },
                        { value: "PROPOSTA_ENVIADA", label: "Proposta enviada" },
                        { value: "EM_NEGOCIACAO", label: "Em negociacao" },
                        { value: "CLIENTE_ATIVO", label: "Cliente ativo" },
                        { value: "CLIENTE_INATIVO", label: "Cliente inativo" },
                        { value: "PERDIDO", label: "Perdido" },
                        { value: "ENCERRADO", label: "Encerrado" },
                    ],
                    statusOperacional: [
                        { value: "NOVO", label: "Novo" },
                        { value: "TRIAGEM", label: "Triagem" },
                        { value: "AGUARDANDO_CLIENTE", label: "Aguardando cliente" },
                        { value: "AGUARDANDO_EQUIPE_INTERNA", label: "Aguardando equipe interna" },
                        { value: "EM_ANALISE_JURIDICA", label: "Em analise juridica" },
                        { value: "AGUARDANDO_DOCUMENTOS", label: "Aguardando documentos" },
                        { value: "REUNIAO_AGENDADA", label: "Reuniao agendada" },
                        { value: "REUNIAO_CONFIRMADA", label: "Reuniao confirmada" },
                        { value: "PROPOSTA_ENVIADA", label: "Proposta enviada" },
                        { value: "EM_NEGOCIACAO", label: "Em negociacao" },
                        { value: "CONTRATADO", label: "Contratado" },
                        { value: "NAO_CONTRATADO", label: "Nao contratado" },
                        { value: "ENCERRADO", label: "Encerrado" },
                    ],
                    prioridade: [
                        { value: "BAIXA", label: "Baixa" },
                        { value: "NORMAL", label: "Normal" },
                        { value: "ALTA", label: "Alta" },
                        { value: "URGENTE", label: "Urgente" },
                    ],
                    situacaoDocumental: [
                        { value: "SEM_DOCUMENTOS", label: "Sem documentos" },
                        { value: "PARCIAL", label: "Parcial" },
                        { value: "COMPLETA", label: "Completa" },
                        { value: "CONFERIDA", label: "Conferida" },
                    ],
                    statusReuniao: [
                        { value: "NAO_AGENDADA", label: "Nao agendada" },
                        { value: "AGENDADA", label: "Agendada" },
                        { value: "CONFIRMADA", label: "Confirmada" },
                        { value: "REMARCADA", label: "Remarcada" },
                        { value: "CANCELADA", label: "Cancelada" },
                        { value: "REALIZADA", label: "Realizada" },
                        { value: "NAO_COMPARECEU", label: "Nao compareceu" },
                    ],
                    areasJuridicas: [
                        "Previdenciario",
                        "Trabalhista",
                        "Civel",
                        "Familia",
                        "Sucessoes",
                        "Imobiliario",
                        "Empresarial / Societario",
                        "Consumidor",
                        "Tributario",
                        "Administrativo",
                        "Bancario",
                        "Contratual",
                        "Criminal",
                        "Medico / Saude",
                        "LGPD / Direito Digital",
                        "Regulatorio",
                        "Licitacoes",
                        "Ambiental",
                        "Agrario",
                        "Eleitoral",
                        "Internacional",
                        "Outros",
                    ],
                    kanbanColumns: [
                        { id: "novo_atendimento", label: "Novo atendimento", statuses: ["NOVO"] },
                        { id: "triagem", label: "Triagem", statuses: ["TRIAGEM"] },
                        { id: "aguardando_cliente", label: "Aguardando cliente", statuses: ["AGUARDANDO_CLIENTE", "AGUARDANDO_DOCUMENTOS"] },
                        { id: "aguardando_equipe_interna", label: "Aguardando equipe interna", statuses: ["AGUARDANDO_EQUIPE_INTERNA"] },
                        { id: "em_analise_juridica", label: "Em analise juridica", statuses: ["EM_ANALISE_JURIDICA"] },
                        { id: "reuniao_proposta", label: "Reuniao / proposta", statuses: ["REUNIAO_AGENDADA", "REUNIAO_CONFIRMADA", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO"] },
                        { id: "contratado", label: "Contratado", statuses: ["CONTRATADO"] },
                        { id: "encerrado_perdido", label: "Encerrado / perdido", statuses: ["NAO_CONTRATADO", "ENCERRADO"] },
                    ],
                },
            },
        };
    } catch (error) {
        console.error("[fetchConversationWorkspace] Error:", error);
        return { error: "Falha ao montar workspace da conversa" };
    }
}

export async function saveConversationWorkspace(input: {
    conversationId: string;
    atendimentoId: string;
    assignedToId?: string | null;
    advogadoId?: string | null;
    processoId?: string | null;
    tipoRegistro: TipoRegistroAtendimento;
    cicloVida: CicloVidaAtendimento;
    statusOperacional: StatusOperacionalAtendimento;
    prioridade: PrioridadeAtendimento;
    areaJuridica?: string | null;
    subareaJuridica?: string | null;
    origemAtendimento?: string | null;
    proximaAcao?: string | null;
    proximaAcaoAt?: string | null;
    situacaoDocumental?: "SEM_DOCUMENTOS" | "PARCIAL" | "COMPLETA" | "CONFERIDA";
    chanceFechamento?: number | null;
    motivoPerda?: string | null;
    dataReuniao?: string | null;
    statusReuniao?: StatusReuniaoAtendimento;
    observacoesReuniao?: string | null;
    assunto?: string | null;
    resumo?: string | null;
}) {
    const session = await getSession();
    if (!session) return { error: "Nao autenticado" };

    const before = await db.atendimento.findUnique({
        where: { id: input.atendimentoId },
        select: {
            id: true,
            advogadoId: true,
            processoId: true,
            prioridade: true,
            statusOperacional: true,
            statusReuniao: true,
            tipoRegistro: true,
            cicloVida: true,
            assunto: true,
        },
    });

    if (!before) return { error: "Atendimento nao encontrado" };

    const resolvedStatusReuniao = input.statusReuniao || before.statusReuniao;
    const resolvedStatusOperacional =
        resolvedStatusReuniao === "CONFIRMADA"
            ? "REUNIAO_CONFIRMADA"
            : input.statusOperacional;

    await db.conversation.update({
        where: { id: input.conversationId },
        data: {
            assignedToId: input.assignedToId || null,
            processoId: input.processoId || null,
            atendimentoId: input.atendimentoId,
        },
    });

    await db.atendimento.update({
        where: { id: input.atendimentoId },
        data: {
            advogadoId: input.advogadoId || before.advogadoId,
            processoId: input.processoId || null,
            tipoRegistro: input.tipoRegistro,
            cicloVida: input.cicloVida,
            statusOperacional: resolvedStatusOperacional,
            prioridade: input.prioridade,
            areaJuridica: input.areaJuridica?.trim() || null,
            subareaJuridica: input.subareaJuridica?.trim() || null,
            origemAtendimento: input.origemAtendimento?.trim() || null,
            proximaAcao: input.proximaAcao?.trim() || null,
            proximaAcaoAt: input.proximaAcaoAt ? new Date(input.proximaAcaoAt) : null,
            situacaoDocumental: input.situacaoDocumental || "SEM_DOCUMENTOS",
            chanceFechamento: typeof input.chanceFechamento === "number" ? input.chanceFechamento : null,
            motivoPerda: input.motivoPerda?.trim() || null,
            dataReuniao: input.dataReuniao ? new Date(input.dataReuniao) : null,
            statusReuniao: resolvedStatusReuniao,
            observacoesReuniao: input.observacoesReuniao?.trim() || null,
            assunto: input.assunto?.trim() || before.assunto,
            resumo: input.resumo?.trim() || null,
            ultimaInteracaoEm: new Date(),
        },
    });

    const channel = await db.conversation.findUnique({
        where: { id: input.conversationId },
        select: { canal: true },
    });

    const canalHistorico = mapConversationChannelToAttendance(channel?.canal || "WHATSAPP");
    if (before.statusOperacional !== resolvedStatusOperacional) {
        await appendAtendimentoHistorico({
            atendimentoId: input.atendimentoId,
            userId: session.id,
            canal: canalHistorico,
            descricao: `Status operacional alterado de "${ATENDIMENTO_STATUS_LABELS[before.statusOperacional as keyof typeof ATENDIMENTO_STATUS_LABELS] ?? before.statusOperacional}" para "${ATENDIMENTO_STATUS_LABELS[resolvedStatusOperacional as keyof typeof ATENDIMENTO_STATUS_LABELS] ?? resolvedStatusOperacional}".`,
        });
    }
    if (before.prioridade !== input.prioridade) {
        await appendAtendimentoHistorico({
            atendimentoId: input.atendimentoId,
            userId: session.id,
            canal: canalHistorico,
            descricao: `Prioridade alterada de "${PRIORIDADE_LABELS[before.prioridade as keyof typeof PRIORIDADE_LABELS] ?? before.prioridade}" para "${PRIORIDADE_LABELS[input.prioridade as keyof typeof PRIORIDADE_LABELS] ?? input.prioridade}".`,
        });
    }
    if ((before.processoId || null) !== (input.processoId || null)) {
        await appendAtendimentoHistorico({
            atendimentoId: input.atendimentoId,
            userId: session.id,
            canal: canalHistorico,
            descricao: input.processoId ? "Processo vinculado/atualizado pelo painel de comunicacao." : "Processo desvinculado pelo painel de comunicacao.",
        });
    }
    if (before.advogadoId !== (input.advogadoId || before.advogadoId)) {
        await appendAtendimentoHistorico({
            atendimentoId: input.atendimentoId,
            userId: session.id,
            canal: canalHistorico,
            descricao: "Responsavel principal do atendimento transferido.",
        });
    }

    revalidatePath("/comunicacao");
    revalidatePath("/atendimentos");
    return { success: true };
}

export async function moveConversationKanban(conversationId: string, statusOperacional: StatusOperacionalAtendimento) {
    const attendance = await ensureConversationAttendance(conversationId);
    if (!attendance) return { error: "Atendimento nao encontrado para a conversa" };

    return saveConversationWorkspace({
        conversationId,
        atendimentoId: attendance.id,
        assignedToId: null,
        advogadoId: attendance.advogadoId,
        processoId: attendance.processoId,
        tipoRegistro: attendance.tipoRegistro,
        cicloVida: attendance.cicloVida,
        statusOperacional,
        prioridade: attendance.prioridade,
        areaJuridica: attendance.areaJuridica,
        subareaJuridica: attendance.subareaJuridica,
        origemAtendimento: attendance.origemAtendimento,
        proximaAcao: attendance.proximaAcao,
        proximaAcaoAt: attendance.proximaAcaoAt?.toISOString() || null,
        situacaoDocumental: attendance.situacaoDocumental,
        chanceFechamento: attendance.chanceFechamento,
        motivoPerda: attendance.motivoPerda,
        dataReuniao: attendance.dataReuniao?.toISOString() || null,
        statusReuniao: attendance.statusReuniao,
        observacoesReuniao: attendance.observacoesReuniao,
        assunto: attendance.assunto,
        resumo: attendance.resumo,
    });
}

export async function convertConversationLeadToClient(conversationId: string) {
    const session = await getSession();
    if (!session) return { error: "Nao autenticado" };

    const conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        select: { clienteId: true, canal: true, atendimentoId: true },
    });
    if (!conversation) return { error: "Conversa nao encontrada" };

    const attendance = await ensureConversationAttendance(conversationId);
    if (!attendance) return { error: "Atendimento nao encontrado" };

    await db.cliente.update({
        where: { id: conversation.clienteId },
        data: {
            status: "ATIVO",
            crmRelationship: "CLIENTE_ATIVO",
            lastContactAt: new Date(),
        },
    });

    await db.atendimento.update({
        where: { id: attendance.id },
        data: {
            status: "CONVERTIDO",
            tipoRegistro: "CLIENTE",
            cicloVida: "CLIENTE_ATIVO",
            statusOperacional: "CONTRATADO",
            ultimaInteracaoEm: new Date(),
        },
    });

    await appendAtendimentoHistorico({
        atendimentoId: attendance.id,
        userId: session.id,
        canal: mapConversationChannelToAttendance(conversation.canal),
        descricao: "Lead convertido em cliente diretamente pela tela de comunicacao.",
    });

    revalidatePath("/comunicacao");
    revalidatePath("/clientes");
    revalidatePath("/atendimentos");
    return { success: true };
}

export async function createConversationTask(input: {
    conversationId: string;
    titulo?: string | null;
    descricao?: string | null;
    dataLimite?: string | null;
}) {
    const session = await getSession();
    if (!session) return { error: "Nao autenticado" };

    const conversation = await db.conversation.findUnique({
        where: { id: input.conversationId },
        include: { cliente: { select: { nome: true } } },
    });
    const attendance = await ensureConversationAttendance(input.conversationId);
    if (!conversation || !attendance) return { error: "Atendimento nao encontrado para a conversa" };

    const { createTarefa } = await getTaskActions();
    const result = await createTarefa({
        titulo: input.titulo?.trim() || `Follow-up de atendimento: ${conversation.cliente.nome}`,
        descricao: input.descricao?.trim() || `Tarefa criada a partir da conversa ${input.conversationId}.`,
        prioridade: attendance.prioridade === "URGENTE" ? "URGENTE" : attendance.prioridade === "ALTA" ? "ALTA" : attendance.prioridade === "BAIXA" ? "BAIXA" : "NORMAL",
        status: "A_FAZER",
        pontos: 1,
        dataLimite: input.dataLimite || "",
        processoId: attendance.processoId || "",
        advogadoId: attendance.advogadoId,
        horasEstimadas: 1,
    }, session.id);

    if ("success" in result && result.success) {
        await appendAtendimentoHistorico({
            atendimentoId: attendance.id,
            userId: session.id,
            canal: mapConversationChannelToAttendance(conversation.canal),
            descricao: "Tarefa criada a partir do painel de acoes rapidas.",
        });
        revalidatePath("/comunicacao");
        return { success: true };
    }

    return { error: "Nao foi possivel criar a tarefa" };
}

export async function createConversationPrazo(input: {
    conversationId: string;
    descricao: string;
    dataFatal: string;
    tipoContagem?: "DIAS_UTEIS" | "DIAS_CORRIDOS";
}) {
    const session = await getSession();
    if (!session) return { error: "Nao autenticado" };

    const conversation = await db.conversation.findUnique({
        where: { id: input.conversationId },
        select: { canal: true },
    });
    const attendance = await ensureConversationAttendance(input.conversationId);
    if (!conversation || !attendance) return { error: "Atendimento nao encontrado para a conversa" };
    if (!attendance.processoId) return { error: "Vincule um processo antes de criar prazo" };

    const { createPrazo } = await getAgendaActions();
    const result = await createPrazo({
        processoId: attendance.processoId,
        advogadoId: attendance.advogadoId,
        descricao: input.descricao,
        dataFatal: input.dataFatal,
        dataCortesia: "",
        tipoContagem: input.tipoContagem || "DIAS_UTEIS",
        fatal: true,
        observacoes: "Prazo criado pela tela de comunicacao.",
    });

    if ("success" in result && result.success) {
        await db.atendimento.update({
            where: { id: attendance.id },
            data: {
                prioridade: "URGENTE",
                ultimaInteracaoEm: new Date(),
            },
        });
        await appendAtendimentoHistorico({
            atendimentoId: attendance.id,
            userId: session.id,
            canal: mapConversationChannelToAttendance(conversation.canal),
            descricao: "Prazo juridico criado e prioridade elevada para urgente.",
        });
        revalidatePath("/comunicacao");
        return { success: true };
    }

    return { error: "Nao foi possivel criar o prazo" };
}

export async function createConversationMeeting(input: {
    conversationId: string;
    titulo?: string | null;
    dataInicio: string;
    local?: string | null;
    descricao?: string | null;
}) {
    const session = await getSession();
    if (!session) return { error: "Nao autenticado" };

    const conversation = await db.conversation.findUnique({
        where: { id: input.conversationId },
        include: { cliente: { select: { nome: true } } },
    });
    const attendance = await ensureConversationAttendance(input.conversationId);
    if (!conversation || !attendance) return { error: "Atendimento nao encontrado para a conversa" };

    const { createCompromisso } = await getAgendaActions();
    const result = await createCompromisso({
        advogadoId: attendance.advogadoId,
        clienteId: conversation.clienteId,
        atendimentoId: attendance.id,
        tipo: "REUNIAO",
        titulo: input.titulo?.trim() || `Reuniao com ${conversation.cliente.nome}`,
        descricao: input.descricao?.trim() || "Compromisso criado pela tela de comunicacao.",
        dataInicio: input.dataInicio,
        dataFim: "",
        local: input.local?.trim() || "",
    });

    if ("success" in result && result.success) {
        await db.atendimento.update({
            where: { id: attendance.id },
            data: {
                dataReuniao: new Date(input.dataInicio),
                statusReuniao: "AGENDADA",
                statusOperacional: "REUNIAO_AGENDADA",
                ultimaInteracaoEm: new Date(),
            },
        });
        await appendAtendimentoHistorico({
            atendimentoId: attendance.id,
            userId: session.id,
            canal: mapConversationChannelToAttendance(conversation.canal),
            descricao: "Reuniao agendada diretamente pela tela de comunicacao.",
        });
        revalidatePath("/comunicacao");
        return { success: true };
    }

    return { error: "Nao foi possivel criar a reuniao" };
}

export async function createConversationDocumentDraft(input: {
    conversationId: string;
    type: "PROPOSTA_HONORARIOS" | "CONTRATO_SERVICOS";
}) {
    const session = await getSession();
    if (!session) return { error: "Nao autenticado" };

    const conversation = await db.conversation.findUnique({
        where: { id: input.conversationId },
        include: {
            cliente: { select: { id: true, nome: true } },
            processo: { select: { id: true, numeroCnj: true } },
        },
    });
    const attendance = await ensureConversationAttendance(input.conversationId);
    if (!conversation || !attendance) return { error: "Atendimento nao encontrado para a conversa" };

    const escritorioId = await getDefaultEscritorioId();
    if (!escritorioId) return { error: "Escritorio nao configurado" };

    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const fileNameBase = `${input.type === "PROPOSTA_HONORARIOS" ? "proposta" : "contrato"}-${slugifyDocumentName(conversation.cliente.nome)}`;
    const relativeDir = path.posix.join("uploads", "comunicacao", year, month);
    const absoluteDir = path.join(process.cwd(), "public", relativeDir);
    await fs.mkdir(absoluteDir, { recursive: true });

    const fileName = `${Date.now()}-${fileNameBase}.md`;
    const fileUrl = `/${path.posix.join(relativeDir, fileName)}`;
    const absoluteFile = path.join(absoluteDir, fileName);
    const body = [
        `# ${input.type === "PROPOSTA_HONORARIOS" ? "Proposta de Honorarios" : "Contrato de Servicos"}`,
        "",
        `Cliente: ${conversation.cliente.nome}`,
        `Atendimento: ${attendance.assunto}`,
        `Area juridica: ${attendance.areaJuridica || "Nao definida"}`,
        `Processo: ${conversation.processo?.numeroCnj || "Nao vinculado"}`,
        "",
        "## Observacoes iniciais",
        "",
        attendance.resumo || "Documento criado a partir da tela de comunicacao.",
    ].join("\n");
    await fs.writeFile(absoluteFile, body, "utf8");

    await db.cRMCommercialDocument.create({
        data: {
            escritorioId,
            clienteId: conversation.cliente.id,
            processoId: conversation.processo?.id || attendance.processoId || null,
            type: input.type,
            nome: input.type === "PROPOSTA_HONORARIOS" ? "Proposta inicial de honorarios" : "Contrato inicial de servicos",
            descricao: "Documento rascunho criado automaticamente pela tela de comunicacao.",
            fileUrl,
            createdById: session.id,
            mergeData: {
                conversationId: input.conversationId,
                atendimentoId: attendance.id,
            },
        },
    });

    await appendAtendimentoHistorico({
        atendimentoId: attendance.id,
        userId: session.id,
        canal: mapConversationChannelToAttendance(conversation.canal),
        descricao: input.type === "PROPOSTA_HONORARIOS"
            ? "Rascunho de proposta criado na conversa."
            : "Rascunho de contrato criado na conversa.",
    });

    revalidatePath("/comunicacao");
    return { success: true, fileUrl };
}

export async function requestDocumentsFromConversation(conversationId: string) {
    const session = await getSession();
    if (!session) return { error: "Nao autenticado" };

    const conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        include: { cliente: { select: { id: true, nome: true } } },
    });
    const attendance = await ensureConversationAttendance(conversationId);
    if (!conversation || !attendance) return { error: "Atendimento nao encontrado para a conversa" };

    const message = `Olá, ${conversation.cliente.nome}. Para avançarmos no seu atendimento, envie os documentos disponíveis para análise inicial. Assim que recebermos, seguimos com a triagem jurídica.`;
    const result = conversation.canal === "WHATSAPP"
        ? await sendWhatsAppMessage(conversation.cliente.id, message, attendance.processoId || undefined)
        : await sendEmailMessage(
            conversation.cliente.id,
            "Solicitacao de documentos",
            message,
            undefined,
            attendance.processoId || undefined,
        );

    if ("error" in result && result.error) return result;

    await db.atendimento.update({
        where: { id: attendance.id },
        data: {
            statusOperacional: "AGUARDANDO_DOCUMENTOS",
            ultimaInteracaoEm: new Date(),
        },
    });
    await appendAtendimentoHistorico({
        atendimentoId: attendance.id,
        userId: session.id,
        canal: mapConversationChannelToAttendance(conversation.canal),
        descricao: "Solicitacao de documentos enviada ao cliente pela tela de comunicacao.",
    });

    revalidatePath("/comunicacao");
    return { success: true };
}

export async function closeConversationAttendance(conversationId: string) {
    const session = await getSession();
    if (!session) return { error: "Nao autenticado" };

    const conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        select: { canal: true },
    });
    const attendance = await ensureConversationAttendance(conversationId);
    if (!conversation || !attendance) return { error: "Atendimento nao encontrado para a conversa" };

    await db.conversation.update({
        where: { id: conversationId },
        data: { status: "CLOSED" },
    });
    await db.atendimento.update({
        where: { id: attendance.id },
        data: {
            statusOperacional: "ENCERRADO",
            cicloVida: "ENCERRADO",
            ultimaInteracaoEm: new Date(),
        },
    });
    await appendAtendimentoHistorico({
        atendimentoId: attendance.id,
        userId: session.id,
        canal: mapConversationChannelToAttendance(conversation.canal),
        descricao: "Atendimento encerrado diretamente pela tela de comunicacao.",
    });

    revalidatePath("/comunicacao");
    return { success: true };
}

async function refreshClientAttendanceAutomation(clienteId: string) {
    const cliente = await db.cliente.findUnique({
        where: { id: clienteId },
        select: {
            contactTags: {
                include: { tag: true },
            },
        },
    });

    if (!cliente) return;

    const tagNames = cliente.contactTags.map((item) => item.tag.name);
    const prioridade = derivePriorityFromTagNames(tagNames);
    const normalized = tagNames.map((tag) => normalizeTagText(tag));
    const situacaoDocumental =
        normalized.some((tag) => tag.includes("documentacao conferida")) ? "CONFERIDA"
            : normalized.some((tag) => tag.includes("documentacao incompleta")) ? "PARCIAL"
                : normalized.some((tag) => tag.includes("sem documentos")) ? "SEM_DOCUMENTOS"
                    : normalized.some((tag) => tag.includes("documentacao completa")) ? "COMPLETA"
                        : null;

    await db.atendimento.updateMany({
        where: {
            clienteId,
            statusOperacional: { not: "ENCERRADO" },
        },
        data: {
            prioridade,
            ...(situacaoDocumental ? { situacaoDocumental } : {}),
        },
    });
}



export async function assignTagToClient(clienteId: string, tagId: string) {
    if (!clienteId || !tagId) return { error: "Dados inválidos" };

    await db.clienteContactTag.upsert({
        where: {
            clienteId_tagId: { clienteId, tagId },
        },
        update: {},
        create: { clienteId, tagId },
    });

    await refreshClientAttendanceAutomation(clienteId);

    revalidatePath("/comunicacao");
    revalidatePath(`/clientes/${clienteId}`);
    return { success: true };
}

export async function removeTagFromClient(clienteId: string, tagId: string) {
    if (!clienteId || !tagId) return { error: "Dados inválidos" };

    await db.clienteContactTag.deleteMany({
        where: { clienteId, tagId },
    });

    await refreshClientAttendanceAutomation(clienteId);

    revalidatePath("/comunicacao");
    revalidatePath(`/clientes/${clienteId}`);
    return { success: true };
}

export async function fetchWhatsAppAutoReplySettings() {
    const template = await db.messageTemplate.findUnique({
        where: { name: "auto_ack_whatsapp" },
    });

    if (!template) {
        const created = await db.messageTemplate.create({
            data: {
                name: "auto_ack_whatsapp",
                category: "sistema",
                canal: "WHATSAPP",
                subject: null,
                content: "Recebemos sua mensagem. Um advogado do escritorio respondera em breve.",
                isActive: false,
            },
        });
        return {
            success: true,
            settings: {
                enabled: created.isActive,
                content: created.content,
                updatedAt: created.updatedAt,
            },
        };
    }

    return {
        success: true,
        settings: {
            enabled: template.isActive,
            content: template.content,
            updatedAt: template.updatedAt,
        },
    };
}

export async function updateWhatsAppAutoReplySettings(input: {
    enabled: boolean;
    content: string;
}) {
    const content = (input.content || "").trim();
    if (!content) {
        return { error: "Conteudo da mensagem automatica e obrigatorio." };
    }

    await db.messageTemplate.upsert({
        where: { name: "auto_ack_whatsapp" },
        update: {
            canal: "WHATSAPP",
            category: "sistema",
            content,
            isActive: Boolean(input.enabled),
        },
        create: {
            name: "auto_ack_whatsapp",
            canal: "WHATSAPP",
            category: "sistema",
            content,
            subject: null,
            isActive: Boolean(input.enabled),
        },
    });

    revalidatePath("/admin/comunicacao");
    revalidatePath("/admin/comunicacao/auto-mensagens");
    return { success: true };
}

export async function getWhatsAppAdminStatus() {
    const evolution = await getEvolutionApi();

    const [statusResult, qrResult] = await Promise.all([
        evolution.getConnectionStatus(),
        evolution.getQRCode(),
    ]);

    if (!statusResult.ok) {
        return {
            ok: false,
            connected: false,
            state: "error",
            qrCode: null,
            qrCodeRaw: null,
            error: statusResult.error || "Nao foi possivel consultar o status do WhatsApp.",
        };
    }

    const state = statusResult.data?.state || "unknown";

    return {
        ok: true,
        connected: state === "open",
        state,
        qrCode: qrResult.data?.base64 || null,
        qrCodeRaw: qrResult.data?.code || null,
        error: qrResult.ok ? null : qrResult.error || null,
    };
}

export async function connectWhatsAppAdminInstance() {
    const evolution = await getEvolutionApi();
    const result = await evolution.createInstance();

    if (!result.ok) {
        return {
            ok: false,
            connected: false,
            state: "error",
            qrCode: null,
            qrCodeRaw: null,
            error: result.error || "Nao foi possivel iniciar a conexao do WhatsApp.",
        };
    }

    return getWhatsAppAdminStatus();
}

export async function disconnectWhatsAppAdminInstance() {
    const evolution = await getEvolutionApi();
    const result = await evolution.disconnectInstance();

    if (!result.ok) {
        return {
            ok: false,
            error: result.error || "Nao foi possivel desconectar a instancia do WhatsApp.",
        };
    }

    return {
        ok: true,
        connected: false,
        state: "closed",
        qrCode: null,
        qrCodeRaw: null,
        error: null,
    };
}

export async function getAdminSmtpStatus() {
    const { testSmtpConnection } = await getEmailService();
    const result = await testSmtpConnection();

    return {
        ok: result.ok,
        configured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || null,
        error: result.ok ? null : result.error || "Falha ao validar SMTP.",
    };
}

// =============================================================
// TEMPLATES (Admin)
// =============================================================

export async function fetchTemplates() {
    return dalGetTemplates(false);
}

export async function createTemplate(formData: FormData) {
    const name = formData.get("name") as string;
    const category = formData.get("category") as string;
    const canal = formData.get("canal") as string;
    const subject = formData.get("subject") as string;
    const content = formData.get("content") as string;
    const contentHtml = formData.get("contentHtml") as string;

    if (!name || !category || !content) return { error: "Campos obrigatórios faltando" };

    await db.messageTemplate.create({
        data: {
            name,
            category,
            canal: canal ? (canal as CanalComunicacao) : null,
            subject: subject || null,
            content,
            contentHtml: contentHtml || null,
        },
    });

    revalidatePath("/admin");
    return { success: true };
}

export async function updateTemplate(id: string, formData: FormData) {
    const name = formData.get("name") as string;
    const category = formData.get("category") as string;
    const canal = formData.get("canal") as string;
    const subject = formData.get("subject") as string;
    const content = formData.get("content") as string;
    const contentHtml = formData.get("contentHtml") as string;
    const isActive = formData.get("isActive") === "true";

    await db.messageTemplate.update({
        where: { id },
        data: {
            name, category,
            canal: canal ? (canal as CanalComunicacao) : null,
            subject: subject || null,
            content,
            contentHtml: contentHtml || null,
            isActive,
        },
    });

    revalidatePath("/admin");
    return { success: true };
}

export async function deleteTemplate(id: string) {
    await db.messageTemplate.delete({ where: { id } });
    revalidatePath("/admin");
    return { success: true };
}

// =============================================================
// RULES (Admin)
// =============================================================

export async function fetchNotificationRules() {
    return dalGetNotificationRules(false);
}

export async function createNotificationRule(formData: FormData) {
    const name = formData.get("name") as string;
    const eventType = formData.get("eventType") as string;
    const canal = formData.get("canal") as string;
    const templateId = formData.get("templateId") as string;
    const target = formData.get("target") as string;
    const triggerOffset = formData.get("triggerOffset") as string;
    const sendHourStart = formData.get("sendHourStart") as string;
    const sendHourEnd = formData.get("sendHourEnd") as string;
    const workdaysOnly = formData.get("workdaysOnly") === "true";

    if (!name || !eventType || !templateId || !target) return { error: "Campos obrigatórios faltando" };

    await db.notificationRule.create({
        data: {
            name,
            eventType: eventType as never,
            canal: canal ? (canal as CanalComunicacao) : null,
            templateId,
            target: target as never,
            triggerOffset: triggerOffset ? parseInt(triggerOffset) : null,
            sendHourStart: sendHourStart ? parseInt(sendHourStart) : 8,
            sendHourEnd: sendHourEnd ? parseInt(sendHourEnd) : 18,
            workdaysOnly,
        },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/comunicacao");
    return { success: true };
}

export async function toggleNotificationRule(id: string) {
    const rule = await db.notificationRule.findUnique({ where: { id } });
    if (!rule) return { error: "Regra não encontrada" };

    await db.notificationRule.update({
        where: { id },
        data: { isActive: !rule.isActive },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/comunicacao");
    return { success: true };
}

export async function deleteNotificationRule(id: string) {
    await db.notificationRule.delete({ where: { id } });
    revalidatePath("/admin");
    revalidatePath("/admin/comunicacao");
    return { success: true };
}

export async function seedMeetingAutomationDefaults() {
    const templates = [
        {
            name: "meeting_confirmation_request_client_whatsapp",
            canal: "WHATSAPP" as CanalComunicacao,
            category: "ATENDIMENTO_REUNIAO",
            content:
                "Ola {cliente_nome}, sua reuniao \"{compromisso_titulo}\" ficou agendada para {compromisso_data} as {compromisso_hora}. Local: {compromisso_local}. {confirmacao_instrucao}",
        },
        {
            name: "meeting_reminder_client_d1_whatsapp",
            canal: "WHATSAPP" as CanalComunicacao,
            category: "ATENDIMENTO_REUNIAO",
            content:
                "Lembrete: sua reuniao \"{compromisso_titulo}\" sera amanha, {compromisso_data}, as {compromisso_hora}. Local: {compromisso_local}. {confirmacao_instrucao}",
        },
        {
            name: "meeting_reminder_client_h1_whatsapp",
            canal: "WHATSAPP" as CanalComunicacao,
            category: "ATENDIMENTO_REUNIAO",
            content:
                "Sua reuniao \"{compromisso_titulo}\" comeca em 1 hora, as {compromisso_hora}. Local: {compromisso_local}.",
        },
        {
            name: "meeting_reminder_responsavel_d1_email",
            canal: "EMAIL" as CanalComunicacao,
            category: "ATENDIMENTO_REUNIAO",
            subject: "Lembrete D-1: reuniao com {cliente_nome}",
            content:
                "Lembrete D-1: a reuniao \"{compromisso_titulo}\" com {cliente_nome} esta marcada para {compromisso_data} as {compromisso_hora}.",
        },
        {
            name: "meeting_reminder_responsavel_h1_email",
            canal: "EMAIL" as CanalComunicacao,
            category: "ATENDIMENTO_REUNIAO",
            subject: "Lembrete H-1: reuniao com {cliente_nome}",
            content:
                "Lembrete H-1: a reuniao \"{compromisso_titulo}\" com {cliente_nome} comeca em 1 hora, as {compromisso_hora}.",
        },
        {
            name: "meeting_confirmed_responsavel_email",
            canal: "EMAIL" as CanalComunicacao,
            category: "ATENDIMENTO_REUNIAO",
            subject: "Cliente confirmou a reuniao de {compromisso_data}",
            content:
                "{cliente_nome} confirmou a reuniao \"{compromisso_titulo}\" marcada para {compromisso_data} as {compromisso_hora}.",
        },
        {
            name: "meeting_reschedule_requested_responsavel_email",
            canal: "EMAIL" as CanalComunicacao,
            category: "ATENDIMENTO_REUNIAO",
            subject: "Pedido de remarcacao de reuniao",
            content:
                "{cliente_nome} pediu remarcacao da reuniao \"{compromisso_titulo}\" originalmente marcada para {compromisso_data} as {compromisso_hora}.",
        },
        {
            name: "meeting_cancelled_responsavel_email",
            canal: "EMAIL" as CanalComunicacao,
            category: "ATENDIMENTO_REUNIAO",
            subject: "Reuniao cancelada pelo cliente",
            content:
                "{cliente_nome} cancelou a reuniao \"{compromisso_titulo}\" marcada para {compromisso_data} as {compromisso_hora}.",
        },
    ];

    for (const template of templates) {
        await db.messageTemplate.upsert({
            where: { name: template.name },
            create: {
                name: template.name,
                canal: template.canal,
                category: template.category,
                subject: "subject" in template ? template.subject || null : null,
                content: template.content,
                isActive: true,
            },
            update: {
                canal: template.canal,
                category: template.category,
                subject: "subject" in template ? template.subject || null : null,
                content: template.content,
                isActive: true,
            },
        });
    }

    const savedTemplates = await db.messageTemplate.findMany({
        where: { name: { in: templates.map((item) => item.name) } },
        select: { id: true, name: true },
    });
    const templateByName = new Map(savedTemplates.map((item) => [item.name, item.id]));

    const rules = [
        {
            name: "Reuniao - Solicitacao de confirmacao ao cliente",
            eventType: "REUNIAO_CONFIRMACAO_CLIENTE",
            canal: "WHATSAPP",
            target: "CLIENTE",
            templateName: "meeting_confirmation_request_client_whatsapp",
        },
        {
            name: "Reuniao - Lembrete D-1 ao cliente",
            eventType: "REUNIAO_LEMBRETE_CLIENTE_D1",
            canal: "WHATSAPP",
            target: "CLIENTE",
            templateName: "meeting_reminder_client_d1_whatsapp",
        },
        {
            name: "Reuniao - Lembrete H-1 ao cliente",
            eventType: "REUNIAO_LEMBRETE_CLIENTE_H1",
            canal: "WHATSAPP",
            target: "CLIENTE",
            templateName: "meeting_reminder_client_h1_whatsapp",
        },
        {
            name: "Reuniao - Lembrete D-1 ao responsavel",
            eventType: "REUNIAO_LEMBRETE_RESPONSAVEL_D1",
            canal: "EMAIL",
            target: "RESPONSAVEL",
            templateName: "meeting_reminder_responsavel_d1_email",
        },
        {
            name: "Reuniao - Lembrete H-1 ao responsavel",
            eventType: "REUNIAO_LEMBRETE_RESPONSAVEL_H1",
            canal: "EMAIL",
            target: "RESPONSAVEL",
            templateName: "meeting_reminder_responsavel_h1_email",
        },
        {
            name: "Reuniao - Cliente confirmou",
            eventType: "REUNIAO_CONFIRMADA",
            canal: "EMAIL",
            target: "RESPONSAVEL",
            templateName: "meeting_confirmed_responsavel_email",
        },
        {
            name: "Reuniao - Cliente pediu remarcacao",
            eventType: "REUNIAO_REMARCACAO_SOLICITADA",
            canal: "EMAIL",
            target: "RESPONSAVEL",
            templateName: "meeting_reschedule_requested_responsavel_email",
        },
        {
            name: "Reuniao - Cliente cancelou",
            eventType: "REUNIAO_CANCELADA",
            canal: "EMAIL",
            target: "RESPONSAVEL",
            templateName: "meeting_cancelled_responsavel_email",
        },
    ];

    for (const rule of rules) {
        const templateId = templateByName.get(rule.templateName);
        if (!templateId) continue;

        const existing = await db.notificationRule.findFirst({
            where: { name: rule.name },
            select: { id: true },
        });

        if (existing) {
            await db.notificationRule.update({
                where: { id: existing.id },
                data: {
                    eventType: rule.eventType as never,
                    canal: rule.canal as CanalComunicacao,
                    target: rule.target as never,
                    templateId,
                    isActive: true,
                    workdaysOnly: false,
                    sendHourStart: 0,
                    sendHourEnd: 23,
                },
            });
        } else {
            await db.notificationRule.create({
                data: {
                    name: rule.name,
                    eventType: rule.eventType as never,
                    canal: rule.canal as CanalComunicacao,
                    target: rule.target as never,
                    templateId,
                    isActive: true,
                    workdaysOnly: false,
                    sendHourStart: 0,
                    sendHourEnd: 23,
                },
            });
        }
    }

    revalidatePath("/admin");
    revalidatePath("/admin/comunicacao");
    return { success: true, templates: templates.length, rules: rules.length };
}

// =============================================================
// STATS
// =============================================================

export async function fetchCommunicationStats() {
    return dalGetCommunicationStats();
}

export async function fetchRecentJobs(limit?: number) {
    return dalGetRecentJobs(limit);
}

export async function fetchJobStats() {
    return dalGetJobStats();
}



