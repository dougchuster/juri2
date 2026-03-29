import "server-only";
import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import type { LegalAgentRagReference } from "@/lib/services/juridico-agents/types";

type ModelRole = "user" | "assistant";

interface QueryMessage {
    id: string;
    role: "USER" | "ASSISTANT" | "SYSTEM";
    content: string;
    createdAt: Date;
    attachments: Array<{
        fileName: string;
        extractedText: string | null;
    }>;
}

export interface LegalAgentConversationListItem {
    id: string;
    agentId: string;
    title: string | null;
    status: "ACTIVE" | "ARCHIVED" | "CLOSED";
    lastMessageAt: string | null;
    createdAt: string;
    updatedAt: string;
    totalMessages: number;
}

export interface LegalAgentAttachmentPersistInput {
    fileName: string;
    mimeType: string;
    fileSize?: number | null;
    fileUrl: string;
    extractedText?: string;
    extractedChars?: number;
    extractionStatus?: string;
    extractionMethod?: string;
    warning?: string | null;
}

export interface BuildConversationContextInput {
    userId: string;
    conversationId: string;
    pergunta: string;
    contexto?: string;
}

export interface BuildConversationContextResult {
    conversationId: string;
    history: Array<{ role: ModelRole; content: string }>;
    memorySummary: string;
}

export interface LegalAgentMessageResponseLogView {
    ragEnabled: boolean;
    confidenceScore: number | null;
    citations: LegalAgentRagReference[];
    usageMeta: Record<string, unknown> | null;
}

export interface LegalAgentMessageFeedbackView {
    value: -1 | 1;
    note: string | null;
    createdAt: string;
}

export interface LegalAgentMessageView {
    id: string;
    conversationId: string;
    role: "USER" | "ASSISTANT" | "SYSTEM";
    content: string;
    model: string | null;
    promptChars: number | null;
    createdAt: Date;
    attachments: Array<{
        id: string;
        fileName: string;
        mimeType: string;
        fileSize: number | null;
        fileUrl: string;
        extractedText: string | null;
        extractedChars: number;
        extractionStatus: string;
        extractionMethod: string;
        warning: string | null;
        createdAt: Date;
    }>;
    responseLog: LegalAgentMessageResponseLogView | null;
    feedback: LegalAgentMessageFeedbackView | null;
}

const RECENT_MESSAGES_FOR_MODEL = 16;
const MAX_MEMORY_STORAGE_CHARS = 200_000;
const MAX_MEMORY_FOR_MODEL_CHARS = 18_000;
const MAX_RETRIEVAL_SNIPPET_CHARS = 550;
const MAX_RETRIEVED_MESSAGES = 8;
const MAX_TOKENS_FROM_QUERY = 24;

const STOPWORDS = new Set([
    "de",
    "da",
    "do",
    "das",
    "dos",
    "a",
    "o",
    "e",
    "ou",
    "em",
    "para",
    "por",
    "com",
    "sem",
    "na",
    "no",
    "nas",
    "nos",
    "que",
    "se",
    "um",
    "uma",
    "uns",
    "umas",
    "ao",
    "aos",
    "as",
    "os",
    "sobre",
    "entre",
    "mais",
    "menos",
    "ja",
    "nao",
    "sim",
    "ser",
    "estar",
    "foi",
    "sao",
    "como",
    "qual",
    "quais",
    "quando",
    "onde",
]);

function normalizeText(value: string, max = 8_000) {
    const normalized = (value || "").replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    if (normalized.length <= max) return normalized;
    return `${normalized.slice(0, max - 1)}...`;
}

function toModelRole(role: QueryMessage["role"]): ModelRole | null {
    if (role === "USER") return "user";
    if (role === "ASSISTANT") return "assistant";
    return null;
}

function buildAttachmentFacts(message: QueryMessage, limit = 2) {
    const chosen = message.attachments.slice(0, limit);
    if (!chosen.length) return "";
    const rows = chosen.map((att) => {
        const sample = normalizeText(att.extractedText || "", 220);
        if (!sample) return `${att.fileName} (sem texto extraido)`;
        return `${att.fileName}: ${sample}`;
    });
    return rows.join(" | ");
}

function summarizeForMemory(message: QueryMessage) {
    const role = message.role === "USER" ? "Advogado" : "Agente";
    const content = normalizeText(message.content, 900);
    const attachmentFacts = buildAttachmentFacts(message);
    const createdAt = message.createdAt.toISOString().slice(0, 19).replace("T", " ");
    if (!attachmentFacts) return `[${createdAt}] ${role}: ${content}`;
    return `[${createdAt}] ${role}: ${content}\nAnexos relevantes: ${attachmentFacts}`;
}

function mergeMemorySummary(previousSummary: string, newChunk: QueryMessage[]) {
    if (!newChunk.length) return previousSummary;
    const newLines = newChunk.map(summarizeForMemory).filter(Boolean);
    const merged = [previousSummary, ...newLines].filter(Boolean).join("\n");
    if (merged.length <= MAX_MEMORY_STORAGE_CHARS) return merged;
    const tail = merged.slice(-(MAX_MEMORY_STORAGE_CHARS - 120));
    return `Resumo cumulativo compactado para manter performance. Historico completo permanece salvo em banco.\n${tail}`;
}

function tokenizeQuery(input: string) {
    const normalized = (input || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    const tokens = Array.from(
        new Set(
            normalized
                .split(/[^a-z0-9]+/g)
                .map((token) => token.trim())
                .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
        )
    );

    return tokens.slice(0, MAX_TOKENS_FROM_QUERY);
}

function scoreMessageForRetrieval(message: QueryMessage, tokens: string[]) {
    if (!tokens.length) return 0;
    const haystack = `${message.content} ${message.attachments.map((att) => att.extractedText || "").join(" ")}`.toLowerCase();
    let score = 0;
    for (const token of tokens) {
        if (haystack.includes(token)) score += 1;
    }
    return score;
}

function buildRetrievalSnippet(message: QueryMessage) {
    const role = message.role === "USER" ? "Advogado" : "Agente";
    const base = normalizeText(message.content, MAX_RETRIEVAL_SNIPPET_CHARS);
    const att = buildAttachmentFacts(message, 1);
    const when = message.createdAt.toISOString().slice(0, 10);
    if (!att) return `- [${when}] ${role}: ${base}`;
    return `- [${when}] ${role}: ${base}\n  Anexo: ${att}`;
}

function parseRagReferences(value: unknown): LegalAgentRagReference[] {
    if (!Array.isArray(value)) return [];

    return value
        .filter((item): item is LegalAgentRagReference => typeof item === "object" && item !== null)
        .map((item) => ({
            id: String(item.id || ""),
            title: String(item.title || ""),
            displayLabel: String(item.displayLabel || item.title || ""),
            tribunal: typeof item.tribunal === "string" ? item.tribunal : null,
            area: typeof item.area === "string" ? item.area : null,
            dataReferencia: typeof item.dataReferencia === "string" ? item.dataReferencia : null,
            excerpt: typeof item.excerpt === "string" ? item.excerpt : "",
            sourceId: typeof item.sourceId === "string" ? item.sourceId : null,
            originType: typeof item.originType === "string" ? item.originType : null,
            originId: typeof item.originId === "string" ? item.originId : null,
            score: Number(item.score || 0),
            matchReasons: Array.isArray(item.matchReasons)
                ? item.matchReasons.map((reason) => String(reason))
                : [],
        }))
        .filter((item) => item.id && item.displayLabel);
}

async function loadMessageResponseLogs(messageIds: string[]) {
    if (!messageIds.length) return new Map<string, LegalAgentMessageResponseLogView>();

    const rows = await db.$queryRawUnsafe<
        Array<{
            messageId: string;
            ragEnabled: boolean;
            confidenceScore: number | null;
            citations: unknown;
            usageMeta: Record<string, unknown> | null;
        }>
    >(
        `
            select
                message_id as "messageId",
                rag_enabled as "ragEnabled",
                confidence_score as "confidenceScore",
                citations,
                usage_meta as "usageMeta"
            from legal_agent_response_logs
            where message_id = any($1::text[])
        `,
        messageIds
    );

    return new Map(
        rows.map((row) => [
            row.messageId,
            {
                ragEnabled: Boolean(row.ragEnabled),
                confidenceScore:
                    typeof row.confidenceScore === "number" && Number.isFinite(row.confidenceScore)
                        ? Number(row.confidenceScore)
                        : null,
                citations: parseRagReferences(row.citations),
                usageMeta: row.usageMeta ?? null,
            },
        ])
    );
}

async function loadMessageFeedbackMap(messageIds: string[], userId: string) {
    if (!messageIds.length) return new Map<string, LegalAgentMessageFeedbackView>();

    const rows = await db.$queryRawUnsafe<
        Array<{
            messageId: string;
            value: number;
            note: string | null;
            createdAt: Date;
        }>
    >(
        `
            select
                message_id as "messageId",
                value,
                note,
                created_at as "createdAt"
            from legal_agent_message_feedback
            where user_id = $1
              and message_id = any($2::text[])
        `,
        userId,
        messageIds
    );

    return new Map(
        rows.map((row) => [
            row.messageId,
            {
                value: (row.value >= 0 ? 1 : -1) as 1 | -1,
                note: row.note,
                createdAt: row.createdAt.toISOString(),
            },
        ])
    );
}

function pickRelevantOlderMessages(
    olderMessages: QueryMessage[],
    query: string
) {
    const tokens = tokenizeQuery(query);
    if (!tokens.length || !olderMessages.length) return [] as QueryMessage[];

    const scored = olderMessages
        .map((message, index) => ({
            message,
            score: scoreMessageForRetrieval(message, tokens),
            index,
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => {
            if (a.score !== b.score) return b.score - a.score;
            return b.index - a.index;
        })
        .slice(0, MAX_RETRIEVED_MESSAGES)
        .sort((a, b) => a.index - b.index)
        .map((item) => item.message);

    return scored;
}

async function ensureMemorySummaryUpToDate(input: {
    conversationId: string;
    memorySummary: string;
    summaryMessageCount: number;
    dialogMessages: QueryMessage[];
}) {
    const olderCutoff = Math.max(0, input.dialogMessages.length - RECENT_MESSAGES_FOR_MODEL);
    if (olderCutoff <= input.summaryMessageCount) {
        return {
            memorySummary: input.memorySummary,
            summaryMessageCount: input.summaryMessageCount,
        };
    }

    const unsummarized = input.dialogMessages.slice(input.summaryMessageCount, olderCutoff);
    const nextSummary = mergeMemorySummary(input.memorySummary, unsummarized);

    await db.legalAgentConversation.update({
        where: { id: input.conversationId },
        data: {
            memorySummary: nextSummary,
            summaryMessageCount: olderCutoff,
            memoryUpdatedAt: new Date(),
        },
    });

    return {
        memorySummary: nextSummary,
        summaryMessageCount: olderCutoff,
    };
}

export async function getOrCreateActiveLegalAgentConversation(input: {
    userId: string;
    agentId: string;
}) {
    const existing = await db.legalAgentConversation.findFirst({
        where: {
            userId: input.userId,
            agentId: input.agentId,
            status: "ACTIVE",
        },
        orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    });

    if (existing) return existing;

    return db.legalAgentConversation.create({
        data: {
            userId: input.userId,
            agentId: input.agentId,
            status: "ACTIVE",
        },
    });
}

export async function listLegalAgentConversationsForUser(input: {
    userId: string;
    agentId?: string;
    status?: "ACTIVE" | "ARCHIVED" | "CLOSED";
    take?: number;
}) {
    const rows = await db.legalAgentConversation.findMany({
        where: {
            userId: input.userId,
            agentId: input.agentId || undefined,
            status: input.status || undefined,
        },
        include: {
            _count: {
                select: {
                    messages: true,
                },
            },
        },
        orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
        take: Math.max(1, Math.min(100, input.take || 40)),
    });

    return rows.map(
        (row): LegalAgentConversationListItem => ({
            id: row.id,
            agentId: row.agentId,
            title: row.title,
            status: row.status,
            lastMessageAt: row.lastMessageAt ? row.lastMessageAt.toISOString() : null,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
            totalMessages: row._count.messages,
        })
    );
}

export async function createNewLegalAgentConversationForUser(input: {
    userId: string;
    agentId: string;
    title?: string | null;
    archiveCurrent?: boolean;
}) {
    if (input.archiveCurrent !== false) {
        await archiveActiveLegalAgentConversations({
            userId: input.userId,
            agentId: input.agentId,
        });
    }

    return db.legalAgentConversation.create({
        data: {
            userId: input.userId,
            agentId: input.agentId,
            title: input.title?.trim() || null,
            status: "ACTIVE",
        },
    });
}

export async function getLegalAgentConversationByIdForUser(input: {
    userId: string;
    conversationId: string;
}) {
    return db.legalAgentConversation.findFirst({
        where: {
            id: input.conversationId,
            userId: input.userId,
        },
    });
}

export async function loadLegalAgentConversationMessages(input: {
    userId: string;
    conversationId: string;
    take?: number;
}) {
    const conversation = await db.legalAgentConversation.findFirst({
        where: { id: input.conversationId, userId: input.userId },
        select: { id: true },
    });
    if (!conversation) {
        throw new Error("Conversa juridica nao encontrada para o usuario.");
    }

    const messages = await db.legalAgentMessage.findMany({
        where: { conversationId: input.conversationId },
        include: {
            attachments: true,
        },
        orderBy: { createdAt: "asc" },
        take: Math.max(1, Math.min(2000, input.take || 500)),
    });

    const messageIds = messages.map((message) => message.id);
    const [responseLogs, feedbackMap] = await Promise.all([
        loadMessageResponseLogs(messageIds),
        loadMessageFeedbackMap(messageIds, input.userId),
    ]);

    return messages.map(
        (message): LegalAgentMessageView => ({
            ...message,
            responseLog: responseLogs.get(message.id) || null,
            feedback: feedbackMap.get(message.id) || null,
        })
    );
}

export async function deleteLegalAgentConversationForUser(input: {
    userId: string;
    conversationId: string;
}) {
    const conversation = await db.legalAgentConversation.findFirst({
        where: {
            id: input.conversationId,
            userId: input.userId,
        },
        select: {
            id: true,
            agentId: true,
        },
    });

    if (!conversation) {
        throw new Error("Conversa juridica nao encontrada para exclusao.");
    }

    await db.legalAgentConversation.delete({
        where: { id: conversation.id },
    });

    return conversation;
}

export async function archiveActiveLegalAgentConversations(input: {
    userId: string;
    agentId: string;
}) {
    await db.legalAgentConversation.updateMany({
        where: {
            userId: input.userId,
            agentId: input.agentId,
            status: "ACTIVE",
        },
        data: {
            status: "ARCHIVED",
        },
    });
}

export async function createLegalAgentMessage(input: {
    conversationId: string;
    role: "USER" | "ASSISTANT" | "SYSTEM";
    content: string;
    model?: string | null;
    promptChars?: number;
    attachments?: LegalAgentAttachmentPersistInput[];
}) {
    const normalizedContent = (input.content || "").trim();
    if (!normalizedContent) {
        throw new Error("Mensagem vazia nao pode ser persistida.");
    }

    const created = await db.legalAgentMessage.create({
        data: {
            conversationId: input.conversationId,
            role: input.role,
            content: normalizedContent,
            model: input.model || null,
            promptChars: input.promptChars || null,
            attachments: input.attachments?.length
                ? {
                      create: input.attachments.map((item) => ({
                          fileName: item.fileName,
                          mimeType: item.mimeType,
                          fileSize:
                              typeof item.fileSize === "number" && Number.isFinite(item.fileSize)
                                  ? item.fileSize
                                  : null,
                          fileUrl: item.fileUrl,
                          extractedText: item.extractedText || null,
                          extractedChars: item.extractedChars || 0,
                          extractionStatus: item.extractionStatus || "unsupported",
                          extractionMethod: item.extractionMethod || "none",
                          warning: item.warning || null,
                      })),
                  }
                : undefined,
        },
        include: {
            attachments: true,
        },
    });

    await db.legalAgentConversation.update({
        where: { id: input.conversationId },
        data: {
            lastMessageAt: created.createdAt,
        },
    });

    return created;
}

export async function saveLegalAgentResponseLog(input: {
    messageId: string;
    userId: string;
    agentId: string;
    model: string | null;
    promptSource: string;
    ragEnabled: boolean;
    confidenceScore: number | null;
    citations: LegalAgentRagReference[];
    usageMeta?: Record<string, unknown> | null;
}) {
    await db.$executeRaw`
        insert into legal_agent_response_logs (
            message_id,
            user_id,
            agent_id,
            model,
            prompt_source,
            rag_enabled,
            confidence_score,
            citations,
            usage_meta,
            created_at,
            updated_at
        )
        values (
            ${input.messageId},
            ${input.userId},
            ${input.agentId},
            ${input.model},
            ${input.promptSource},
            ${input.ragEnabled},
            ${input.confidenceScore},
            ${JSON.stringify(input.citations)}::jsonb,
            ${JSON.stringify(input.usageMeta ?? {})}::jsonb,
            now(),
            now()
        )
        on conflict (message_id) do update set
            user_id = excluded.user_id,
            agent_id = excluded.agent_id,
            model = excluded.model,
            prompt_source = excluded.prompt_source,
            rag_enabled = excluded.rag_enabled,
            confidence_score = excluded.confidence_score,
            citations = excluded.citations,
            usage_meta = excluded.usage_meta,
            updated_at = now()
    `;
}

export async function setLegalAgentMessageFeedback(input: {
    userId: string;
    messageId: string;
    value: -1 | 1;
    note?: string | null;
}) {
    await db.$executeRaw`
        insert into legal_agent_message_feedback (
            id,
            message_id,
            user_id,
            value,
            note,
            created_at,
            updated_at
        )
        values (
            ${randomUUID()},
            ${input.messageId},
            ${input.userId},
            ${input.value},
            ${input.note?.trim() || null},
            now(),
            now()
        )
        on conflict (message_id, user_id) do update set
            value = excluded.value,
            note = excluded.note,
            updated_at = now()
    `;

    const rows = await db.$queryRaw<Array<{ createdAt: Date }>>`
        select created_at as "createdAt"
        from legal_agent_message_feedback
        where message_id = ${input.messageId}
          and user_id = ${input.userId}
        limit 1
    `;

    return {
        value: input.value,
        note: input.note?.trim() || null,
        createdAt: rows[0]?.createdAt.toISOString() || new Date().toISOString(),
    } satisfies LegalAgentMessageFeedbackView;
}

export async function getLegalAgentAssistantMessageForUser(input: {
    userId: string;
    messageId: string;
}) {
    return db.legalAgentMessage.findFirst({
        where: {
            id: input.messageId,
            role: "ASSISTANT",
            conversation: {
                userId: input.userId,
            },
        },
        select: {
            id: true,
            conversationId: true,
        },
    });
}

export async function buildConversationContextForAgentCall(
    input: BuildConversationContextInput
): Promise<BuildConversationContextResult> {
    const conversation = await db.legalAgentConversation.findFirst({
        where: {
            id: input.conversationId,
            userId: input.userId,
        },
        select: {
            id: true,
            memorySummary: true,
            summaryMessageCount: true,
        },
    });

    if (!conversation) {
        throw new Error("Conversa juridica nao encontrada.");
    }

    const messages = await db.legalAgentMessage.findMany({
        where: { conversationId: input.conversationId },
        select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
            attachments: {
                select: {
                    fileName: true,
                    extractedText: true,
                },
            },
        },
        orderBy: { createdAt: "asc" },
    });

    const dialogMessages = messages.filter(
        (msg): msg is QueryMessage => msg.role === "USER" || msg.role === "ASSISTANT"
    );

    const refreshedMemory = await ensureMemorySummaryUpToDate({
        conversationId: conversation.id,
        memorySummary: conversation.memorySummary || "",
        summaryMessageCount: conversation.summaryMessageCount,
        dialogMessages,
    });

    const olderCutoff = Math.max(0, dialogMessages.length - RECENT_MESSAGES_FOR_MODEL);
    const olderMessages = dialogMessages.slice(0, olderCutoff);
    const recentMessages = dialogMessages.slice(-RECENT_MESSAGES_FOR_MODEL);
    const retrievalQuery = `${input.pergunta}\n${input.contexto || ""}`;
    const retrieved = pickRelevantOlderMessages(olderMessages, retrievalQuery);

    const history: Array<{ role: ModelRole; content: string }> = [];
    if (refreshedMemory.memorySummary) {
        history.push({
            role: "assistant",
            content: [
                "Memoria cumulativa da conversa (persistida em banco):",
                normalizeText(refreshedMemory.memorySummary, MAX_MEMORY_FOR_MODEL_CHARS),
            ].join("\n"),
        });
    }

    if (retrieved.length) {
        history.push({
            role: "assistant",
            content: [
                "Trechos recuperados do historico completo por relevancia:",
                ...retrieved.map(buildRetrievalSnippet),
            ].join("\n"),
        });
    }

    for (const message of recentMessages) {
        const role = toModelRole(message.role);
        if (!role) continue;
        history.push({
            role,
            content: normalizeText(message.content, 8_000),
        });
    }

    return {
        conversationId: conversation.id,
        history,
        memorySummary: refreshedMemory.memorySummary,
    };
}
