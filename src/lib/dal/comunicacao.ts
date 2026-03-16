import "server-only";
import { db } from "@/lib/db";
import type { CanalComunicacao, ConversationStatus, MessageDirection, MessageStatus } from "@/generated/prisma";

// =============================================================
// CONVERSATIONS
// =============================================================

export interface ConversationFilters {
    clienteId?: string;
    canal?: CanalComunicacao;
    status?: ConversationStatus;
    search?: string;
    page?: number;
    pageSize?: number;
}

export async function getConversations(filters: ConversationFilters = {}) {
    const { clienteId, canal, status, search, page = 1, pageSize = 20 } = filters;

    const where: Record<string, unknown> = {};
    if (clienteId) where.clienteId = clienteId;
    if (canal) where.canal = canal;
    if (status) where.status = status;
    if (search) {
        where.OR = [
            { cliente: { nome: { contains: search, mode: "insensitive" } } },
            { subject: { contains: search, mode: "insensitive" } },
        ];
    }

    const [conversations, total] = await Promise.all([
        db.conversation.findMany({
            where,
            include: {
                cliente: { select: { id: true, nome: true, email: true, celular: true, whatsapp: true } },
                processo: { select: { id: true, numeroCnj: true } },
                assignedTo: { select: { id: true, name: true } },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { content: true, direction: true, createdAt: true, status: true },
                },
            },
            orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        db.conversation.count({ where }),
    ]);

    return { conversations, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getConversationById(id: string) {
    return db.conversation.findUnique({
        where: { id },
        include: {
            cliente: {
                select: { id: true, nome: true, email: true, celular: true, whatsapp: true },
            },
            processo: { select: { id: true, numeroCnj: true } },
            assignedTo: { select: { id: true, name: true } },
        },
    });
}

export async function getOrCreateConversation(
    clienteId: string,
    canal: CanalComunicacao,
    processoId?: string
) {
    // Find open conversation for this client + channel
    const existing = await db.conversation.findFirst({
        where: { clienteId, canal, status: "OPEN" },
        orderBy: [
            { lastMessageAt: { sort: "desc", nulls: "last" } },
            { updatedAt: "desc" },
        ],
    });

    if (existing) return existing;

    return db.conversation.create({
        data: { clienteId, canal, processoId },
    });
}

// =============================================================
// MESSAGES
// =============================================================

export async function getMessages(conversationId: string, page = 1, pageSize = 50) {
    const [messages, total] = await Promise.all([
        db.message.findMany({
            where: { conversationId },
            include: {
                attachments: true,
            },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        db.message.count({ where: { conversationId } }),
    ]);

    return { messages, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createMessage(data: {
    conversationId: string;
    direction: MessageDirection;
    canal: CanalComunicacao;
    content: string;
    contentHtml?: string | null;
    status?: MessageStatus;
    providerMsgId?: string | null;
    sentById?: string | null;
    processoId?: string | null;
    prazoId?: string | null;
    tarefaId?: string | null;
    templateId?: string | null;
    templateVars?: Record<string, unknown> | null;
    errorMessage?: string | null;
}) {
    const message = await db.message.create({
        data: {
            conversationId: data.conversationId,
            direction: data.direction,
            canal: data.canal,
            content: data.content,
            contentHtml: data.contentHtml,
            status: data.status || "QUEUED",
            providerMsgId: data.providerMsgId,
            sentById: data.sentById,
            processoId: data.processoId,
            prazoId: data.prazoId,
            tarefaId: data.tarefaId,
            templateId: data.templateId,
            templateVars: data.templateVars ? JSON.parse(JSON.stringify(data.templateVars)) : undefined,
            errorMessage: data.errorMessage,
            sentAt: data.direction === "OUTBOUND" ? new Date() : undefined,
        },
    });

    // Update conversation
    await db.conversation.update({
        where: { id: data.conversationId },
        data: {
            lastMessageAt: new Date(),
            ...(data.direction === "INBOUND" ? { unreadCount: { increment: 1 } } : {}),
        },
    });

    return message;
}

export async function updateMessageStatus(
    providerMsgId: string,
    status: MessageStatus,
    extra?: { deliveredAt?: Date; readAt?: Date; errorMessage?: string }
) {
    return db.message.update({
        where: { providerMsgId },
        data: { status, ...extra },
    });
}

// =============================================================
// CLIENT PHONES
// =============================================================

export async function getClientPhones(clienteId: string) {
    return db.clientPhone.findMany({
        where: { clienteId },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
}

export async function findClientByPhone(phone: string) {
    const normalized = phone.replace(/\D/g, "");
    const variations = [
        `+${normalized}`,
        `+55${normalized}`,
        normalized,
    ];

    const clientPhone = await db.clientPhone.findFirst({
        where: { phone: { in: variations } },
        include: { cliente: true },
    });

    if (clientPhone) return clientPhone;

    // Fallback: search in the whatsapp/celular field of Cliente
    const cliente = await db.cliente.findFirst({
        where: {
            OR: [
                { whatsapp: { contains: normalized.slice(-9) } },
                { celular: { contains: normalized.slice(-9) } },
            ],
        },
    });

    return cliente ? { cliente, id: null, phone: phone, clienteId: cliente.id } : null;
}

// =============================================================
// TEMPLATES
// =============================================================

export async function getTemplates(activeOnly = true) {
    return db.messageTemplate.findMany({
        where: activeOnly ? { isActive: true } : {},
        orderBy: [{ category: "asc" }, { name: "asc" }],
    });
}

export async function getTemplateByName(name: string) {
    return db.messageTemplate.findUnique({ where: { name } });
}

// =============================================================
// NOTIFICATION RULES
// =============================================================

export async function getNotificationRules(activeOnly = true) {
    return db.notificationRule.findMany({
        where: activeOnly ? { isActive: true } : {},
        include: { template: { select: { id: true, name: true, canal: true, category: true } } },
        orderBy: { createdAt: "desc" },
    });
}

// =============================================================
// COMMUNICATION JOBS
// =============================================================

export async function getPendingJobs(limit = 20) {
    return db.communicationJob.findMany({
        where: {
            status: "PENDING",
            scheduledFor: { lte: new Date() },
        },
        orderBy: { scheduledFor: "asc" },
        take: limit,
    });
}

export async function getJobStats() {
    const [pending, processing, completed, failed] = await Promise.all([
        db.communicationJob.count({ where: { status: "PENDING" } }),
        db.communicationJob.count({ where: { status: "PROCESSING" } }),
        db.communicationJob.count({ where: { status: "COMPLETED" } }),
        db.communicationJob.count({ where: { status: "FAILED" } }),
    ]);
    return { pending, processing, completed, failed, total: pending + processing + completed + failed };
}

export async function getRecentJobs(limit = 50) {
    return db.communicationJob.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { rule: { select: { name: true } } },
    });
}

export async function getMeetingAutomationDashboard(limit = 12) {
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [
        upcomingMeetings,
        dueNext24h,
        pendingConfirmation,
        confirmedMeetings,
        rescheduleRequested,
        cancelledMeetings,
        remindersPending,
        remindersScheduled,
        remindersSent,
        remindersFailed,
        remindersCancelled,
        failedMeetingJobs,
        staleMeetingJobs,
        recentReminders,
        recentProblemJobs,
        nextMeetings,
    ] = await Promise.all([
        db.compromisso.count({
            where: {
                tipo: "REUNIAO",
                concluido: false,
                canceladoAt: null,
                dataInicio: { gt: now },
            },
        }),
        db.compromisso.count({
            where: {
                tipo: "REUNIAO",
                concluido: false,
                canceladoAt: null,
                dataInicio: { gt: now, lte: next24h },
            },
        }),
        db.compromisso.count({
            where: {
                tipo: "REUNIAO",
                concluido: false,
                canceladoAt: null,
                dataInicio: { gt: now },
                statusConfirmacao: "PENDENTE",
            },
        }),
        db.compromisso.count({
            where: {
                tipo: "REUNIAO",
                statusConfirmacao: "CONFIRMADO",
                dataInicio: { gt: now },
            },
        }),
        db.compromisso.count({
            where: {
                tipo: "REUNIAO",
                statusConfirmacao: "REMARCACAO_SOLICITADA",
                dataInicio: { gt: now },
            },
        }),
        db.compromisso.count({
            where: {
                tipo: "REUNIAO",
                statusConfirmacao: "CANCELADO",
            },
        }),
        db.compromissoReminder.count({ where: { status: "PENDENTE" } }),
        db.compromissoReminder.count({ where: { status: "AGENDADO" } }),
        db.compromissoReminder.count({ where: { status: "ENVIADO" } }),
        db.compromissoReminder.count({ where: { status: "FALHOU" } }),
        db.compromissoReminder.count({ where: { status: "CANCELADO" } }),
        db.communicationJob.count({
            where: {
                compromissoId: { not: null },
                status: "FAILED",
            },
        }),
        db.communicationJob.count({
            where: {
                compromissoId: { not: null },
                status: { in: ["PENDING", "PROCESSING"] },
                scheduledFor: { lt: now },
            },
        }),
        db.compromissoReminder.findMany({
            where: {},
            orderBy: [{ updatedAt: "desc" }, { scheduledFor: "asc" }],
            take: limit,
            include: {
                compromisso: {
                    select: {
                        id: true,
                        titulo: true,
                        dataInicio: true,
                        statusConfirmacao: true,
                        cliente: { select: { nome: true } },
                        advogado: { select: { user: { select: { name: true } } } },
                    },
                },
            },
        }),
        db.communicationJob.findMany({
            where: {
                compromissoId: { not: null },
                status: { in: ["FAILED", "CANCELLED"] },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
                rule: { select: { name: true } },
                compromisso: {
                    select: {
                        id: true,
                        titulo: true,
                        dataInicio: true,
                        cliente: { select: { nome: true } },
                    },
                },
            },
        }),
        db.compromisso.findMany({
            where: {
                tipo: "REUNIAO",
                concluido: false,
                canceladoAt: null,
                dataInicio: { gt: now },
            },
            orderBy: { dataInicio: "asc" },
            take: limit,
            select: {
                id: true,
                titulo: true,
                dataInicio: true,
                local: true,
                statusConfirmacao: true,
                cliente: { select: { nome: true } },
                advogado: { select: { user: { select: { name: true, email: true } } } },
                atendimento: { select: { id: true, statusReuniao: true, statusOperacional: true } },
            },
        }),
    ]);

    return {
        stats: {
            upcomingMeetings,
            dueNext24h,
            pendingConfirmation,
            confirmedMeetings,
            rescheduleRequested,
            cancelledMeetings,
            remindersPending,
            remindersScheduled,
            remindersSent,
            remindersFailed,
            remindersCancelled,
            failedMeetingJobs,
            staleMeetingJobs,
        },
        recentReminders,
        recentProblemJobs,
        nextMeetings,
    };
}

// =============================================================
// STATS
// =============================================================

export async function getCommunicationStats() {
    const [
        totalConversations, openConversations, unreadMessages,
        totalMessages, whatsappMessages, emailMessages,
        jobStats,
    ] = await Promise.all([
        db.conversation.count(),
        db.conversation.count({ where: { status: "OPEN" } }),
        db.conversation.aggregate({ _sum: { unreadCount: true } }),
        db.message.count(),
        db.message.count({ where: { canal: "WHATSAPP" } }),
        db.message.count({ where: { canal: "EMAIL" } }),
        getJobStats(),
    ]);

    return {
        totalConversations,
        openConversations,
        unreadMessages: unreadMessages._sum.unreadCount || 0,
        totalMessages,
        whatsappMessages,
        emailMessages,
        jobs: jobStats,
    };
}
