"use server";

import { z } from "zod";
import { getSession } from "@/actions/auth";
import {
    archiveActiveLegalAgentConversations,
    buildConversationContextForAgentCall,
    createNewLegalAgentConversationForUser,
    createLegalAgentMessage,
    getLegalAgentAssistantMessageForUser,
    deleteLegalAgentConversationForUser,
    getLegalAgentConversationByIdForUser,
    getOrCreateActiveLegalAgentConversation,
    listLegalAgentConversationsForUser,
    loadLegalAgentConversationMessages,
    saveLegalAgentResponseLog,
    setLegalAgentMessageFeedback,
    type LegalAgentAttachmentPersistInput,
    type LegalAgentMessageView,
} from "@/lib/dal/juridico-agents";
import {
    conversarComAgenteJuridico,
    getLegalAgentByIdOrThrow,
    listLegalAgentsCatalog,
    type LegalAgentChatInput,
} from "@/lib/services/juridico-agents";
import { LEGAL_AI_DISABLED_MESSAGE, isLegalAiEnabled } from "@/lib/runtime-features";

const attachmentSchema = z.object({
    fileName: z.string().min(1).max(300),
    mimeType: z.string().min(1).max(180),
    fileSize: z.coerce.number().int().min(0).max(200 * 1024 * 1024).optional(),
    fileUrl: z.string().min(1).max(1024),
    extractedText: z.string().max(12000).optional().default(""),
    extractedChars: z.coerce.number().int().min(0).max(120000).optional().default(0),
    extractionStatus: z.string().max(60).optional().default("unsupported"),
    extractionMethod: z.string().max(100).optional().default("none"),
    warning: z.string().max(500).optional().nullable(),
});

const carregarConversaSchema = z.object({
    agentId: z.string().min(1).max(120),
    conversationId: z.string().min(1).max(120).optional(),
});

const conversarSchema = z.object({
    conversationId: z.string().min(1).max(120).optional(),
    agentId: z.string().min(1).max(120),
    pergunta: z.string().min(3).max(12000),
    contexto: z.string().max(16000).optional().default(""),
    attachments: z.array(attachmentSchema).max(20).optional().default([]),
    model: z.string().max(120).optional(),
    maxTokens: z.coerce.number().int().min(300).max(6000).optional(),
    thinking: z.enum(["enabled", "disabled"]).optional(),
    temperature: z.coerce.number().min(0).max(2).optional(),
});

const reiniciarConversaSchema = z.object({
    agentId: z.string().min(1).max(120),
});

const listarConversasSchema = z.object({
    agentId: z.string().min(1).max(120),
    status: z.enum(["ACTIVE", "ARCHIVED", "CLOSED"]).optional(),
});

const criarConversaSchema = z.object({
    agentId: z.string().min(1).max(120),
    title: z.string().max(220).optional(),
    archiveCurrent: z.coerce.boolean().optional().default(true),
});

const excluirConversaSchema = z.object({
    agentId: z.string().min(1).max(120),
    conversationId: z.string().min(1).max(120),
});

const feedbackSchema = z.object({
    messageId: z.string().min(1).max(120),
    value: z.union([z.literal(1), z.literal(-1)]),
    note: z.string().max(1000).optional().nullable(),
});

function normalizeStoredMessageContent(pergunta: string, contexto: string) {
    const cleanQuestion = pergunta.trim();
    const cleanContext = (contexto || "").trim();
    if (!cleanContext) return cleanQuestion;
    return `${cleanQuestion}\n\n[Contexto adicional enviado]\n${cleanContext}`;
}

function toPersistableAttachments(
    attachments: z.infer<typeof attachmentSchema>[]
): LegalAgentAttachmentPersistInput[] {
    return attachments.map((item) => ({
        fileName: item.fileName,
        mimeType: item.mimeType,
        fileSize: item.fileSize,
        fileUrl: item.fileUrl,
        extractedText: item.extractedText || "",
        extractedChars: item.extractedChars || 0,
        extractionStatus: item.extractionStatus || "unsupported",
        extractionMethod: item.extractionMethod || "none",
        warning: item.warning || null,
    }));
}

function mapMessageForClient(
    message: LegalAgentMessageView | (Awaited<ReturnType<typeof createLegalAgentMessage>> & {
        responseLog?: LegalAgentMessageView["responseLog"];
        feedback?: LegalAgentMessageView["feedback"];
    })
) {
    return {
        id: message.id,
        role:
            message.role === "USER"
                ? "user"
                : message.role === "ASSISTANT"
                ? "assistant"
                : "assistant",
        content: message.content,
        model: message.model,
        createdAt: message.createdAt.toISOString(),
        attachments: message.attachments.map((item) => ({
            id: item.id,
            fileName: item.fileName,
            mimeType: item.mimeType,
            fileSize: item.fileSize || 0,
            fileUrl: item.fileUrl,
            extractedText: item.extractedText || "",
            extractedChars: item.extractedChars,
            extractionStatus: item.extractionStatus,
            extractionMethod: item.extractionMethod,
            warning: item.warning,
        })),
        confidenceScore: message.responseLog?.confidenceScore || null,
        ragEnabled: message.responseLog?.ragEnabled || false,
        citations: message.responseLog?.citations || [],
        feedback: message.feedback || null,
    };
}

async function resolveConversationForUser(input: {
    userId: string;
    agentId: string;
    conversationId?: string;
}) {
    if (input.conversationId) {
        const existing = await getLegalAgentConversationByIdForUser({
            userId: input.userId,
            conversationId: input.conversationId,
        });
        if (!existing) {
            throw new Error("Conversa juridica nao encontrada.");
        }
        if (existing.agentId !== input.agentId) {
            throw new Error("Conversa informada nao corresponde ao agente selecionado.");
        }
        return existing;
    }

    return getOrCreateActiveLegalAgentConversation({
        userId: input.userId,
        agentId: input.agentId,
    });
}

function getLegalAiDisabledResult() {
    return { success: false as const, error: LEGAL_AI_DISABLED_MESSAGE };
}

export async function listarAgentesJuridicosAction() {
    if (!isLegalAiEnabled()) {
        return getLegalAiDisabledResult();
    }

    const session = await getSession();
    if (!session) {
        return { success: false as const, error: "Nao autenticado." };
    }

    return {
        success: true as const,
        data: listLegalAgentsCatalog(),
    };
}

export async function carregarConversaAgenteJuridicoAction(input: unknown) {
    if (!isLegalAiEnabled()) {
        return getLegalAiDisabledResult();
    }

    const session = await getSession();
    if (!session) {
        return { success: false as const, error: "Nao autenticado." };
    }

    const parsed = carregarConversaSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false as const, error: "Entrada invalida para carregar conversa." };
    }

    try {
        getLegalAgentByIdOrThrow(parsed.data.agentId);
        const conversation = parsed.data.conversationId
            ? await getLegalAgentConversationByIdForUser({
                  userId: session.id,
                  conversationId: parsed.data.conversationId,
              })
            : await getOrCreateActiveLegalAgentConversation({
                  userId: session.id,
                  agentId: parsed.data.agentId,
              });

        if (!conversation) {
            return { success: false as const, error: "Conversa nao encontrada." };
        }
        if (conversation.agentId !== parsed.data.agentId) {
            return {
                success: false as const,
                error: "Conversa nao pertence ao agente selecionado.",
            };
        }

        const messages = await loadLegalAgentConversationMessages({
            userId: session.id,
            conversationId: conversation.id,
            take: 800,
        });

        const conversations = await listLegalAgentConversationsForUser({
            userId: session.id,
            agentId: parsed.data.agentId,
            take: 100,
        });

        return {
            success: true as const,
            data: {
                conversation: {
                    id: conversation.id,
                    agentId: conversation.agentId,
                    status: conversation.status,
                    title: conversation.title,
                    memoryUpdatedAt: conversation.memoryUpdatedAt?.toISOString() || null,
                    lastMessageAt: conversation.lastMessageAt?.toISOString() || null,
                },
                messages: messages.map(mapMessageForClient),
                conversations,
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao carregar conversa.";
        return { success: false as const, error: message };
    }
}

export async function reiniciarConversaAgenteJuridicoAction(input: unknown) {
    if (!isLegalAiEnabled()) {
        return getLegalAiDisabledResult();
    }

    const session = await getSession();
    if (!session) {
        return { success: false as const, error: "Nao autenticado." };
    }

    const parsed = reiniciarConversaSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false as const, error: "Entrada invalida para reiniciar conversa." };
    }

    try {
        getLegalAgentByIdOrThrow(parsed.data.agentId);
        await archiveActiveLegalAgentConversations({
            userId: session.id,
            agentId: parsed.data.agentId,
        });

        const conversation = await getOrCreateActiveLegalAgentConversation({
            userId: session.id,
            agentId: parsed.data.agentId,
        });

        return {
            success: true as const,
            data: {
                conversation: {
                    id: conversation.id,
                    agentId: conversation.agentId,
                    status: conversation.status,
                },
                messages: [],
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao reiniciar conversa.";
        return { success: false as const, error: message };
    }
}

export async function listarConversasAgenteJuridicoAction(input: unknown) {
    if (!isLegalAiEnabled()) {
        return getLegalAiDisabledResult();
    }

    const session = await getSession();
    if (!session) {
        return { success: false as const, error: "Nao autenticado." };
    }

    const parsed = listarConversasSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false as const, error: "Entrada invalida para listar conversas." };
    }

    try {
        getLegalAgentByIdOrThrow(parsed.data.agentId);
        const conversations = await listLegalAgentConversationsForUser({
            userId: session.id,
            agentId: parsed.data.agentId,
            status: parsed.data.status,
            take: 100,
        });
        return {
            success: true as const,
            data: conversations,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao listar conversas.";
        return { success: false as const, error: message };
    }
}

export async function criarNovaConversaAgenteJuridicoAction(input: unknown) {
    if (!isLegalAiEnabled()) {
        return getLegalAiDisabledResult();
    }

    const session = await getSession();
    if (!session) {
        return { success: false as const, error: "Nao autenticado." };
    }

    const parsed = criarConversaSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false as const, error: "Entrada invalida para criar conversa." };
    }

    try {
        getLegalAgentByIdOrThrow(parsed.data.agentId);
        const conversation = await createNewLegalAgentConversationForUser({
            userId: session.id,
            agentId: parsed.data.agentId,
            title: parsed.data.title || null,
            archiveCurrent: parsed.data.archiveCurrent,
        });
        const conversations = await listLegalAgentConversationsForUser({
            userId: session.id,
            agentId: parsed.data.agentId,
            take: 100,
        });
        return {
            success: true as const,
            data: {
                conversation: {
                    id: conversation.id,
                    agentId: conversation.agentId,
                    status: conversation.status,
                    title: conversation.title,
                    memoryUpdatedAt: conversation.memoryUpdatedAt?.toISOString() || null,
                    lastMessageAt: conversation.lastMessageAt?.toISOString() || null,
                },
                conversations,
                messages: [],
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao criar nova conversa.";
        return { success: false as const, error: message };
    }
}

export async function deletarConversaAgenteJuridicoAction(input: unknown) {
    if (!isLegalAiEnabled()) {
        return getLegalAiDisabledResult();
    }

    const session = await getSession();
    if (!session) {
        return { success: false as const, error: "Nao autenticado." };
    }

    const parsed = excluirConversaSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false as const, error: "Entrada invalida para excluir conversa." };
    }

    try {
        getLegalAgentByIdOrThrow(parsed.data.agentId);
        const deleted = await deleteLegalAgentConversationForUser({
            userId: session.id,
            conversationId: parsed.data.conversationId,
        });

        if (deleted.agentId !== parsed.data.agentId) {
            return { success: false as const, error: "Conversa nao pertence ao agente informado." };
        }

        let nextConversation = await getOrCreateActiveLegalAgentConversation({
            userId: session.id,
            agentId: parsed.data.agentId,
        });

        if (nextConversation.id === deleted.id) {
            nextConversation = await createNewLegalAgentConversationForUser({
                userId: session.id,
                agentId: parsed.data.agentId,
                archiveCurrent: false,
            });
        }

        const [messages, conversations] = await Promise.all([
            loadLegalAgentConversationMessages({
                userId: session.id,
                conversationId: nextConversation.id,
                take: 800,
            }),
            listLegalAgentConversationsForUser({
                userId: session.id,
                agentId: parsed.data.agentId,
                take: 100,
            }),
        ]);

        return {
            success: true as const,
            data: {
                deletedConversationId: deleted.id,
                conversation: {
                    id: nextConversation.id,
                    agentId: nextConversation.agentId,
                    status: nextConversation.status,
                    title: nextConversation.title,
                    memoryUpdatedAt: nextConversation.memoryUpdatedAt?.toISOString() || null,
                    lastMessageAt: nextConversation.lastMessageAt?.toISOString() || null,
                },
                conversations,
                messages: messages.map(mapMessageForClient),
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao excluir conversa.";
        return { success: false as const, error: message };
    }
}

export async function conversarComAgenteJuridicoAction(input: unknown) {
    if (!isLegalAiEnabled()) {
        return getLegalAiDisabledResult();
    }

    const session = await getSession();
    if (!session) {
        return { success: false as const, error: "Nao autenticado." };
    }

    const parsed = conversarSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false as const,
            error: "Entrada invalida para conversa com agente juridico.",
            details: parsed.error.flatten(),
        };
    }

    try {
        getLegalAgentByIdOrThrow(parsed.data.agentId);
        const conversation = await resolveConversationForUser({
            userId: session.id,
            agentId: parsed.data.agentId,
            conversationId: parsed.data.conversationId,
        });

        const storedUserContent = normalizeStoredMessageContent(
            parsed.data.pergunta,
            parsed.data.contexto || ""
        );
        const persistAttachments = toPersistableAttachments(parsed.data.attachments);

        await createLegalAgentMessage({
            conversationId: conversation.id,
            role: "USER",
            content: storedUserContent,
            attachments: persistAttachments,
            promptChars: storedUserContent.length,
        });

        const contextualized = await buildConversationContextForAgentCall({
            userId: session.id,
            conversationId: conversation.id,
            pergunta: parsed.data.pergunta,
            contexto: parsed.data.contexto || "",
        });

        const historyForModel = [...contextualized.history];
        if (historyForModel.length > 0 && historyForModel[historyForModel.length - 1].role === "user") {
            historyForModel.pop();
        }

        const payload: LegalAgentChatInput = {
            agentId: parsed.data.agentId,
            pergunta: parsed.data.pergunta,
            contexto: parsed.data.contexto || "",
            historico: historyForModel,
            escritorioId: session.escritorioId || undefined,
            model: parsed.data.model,
            maxTokens: parsed.data.maxTokens,
            thinking: parsed.data.thinking,
            temperature: parsed.data.temperature,
        };

        const result = await conversarComAgenteJuridico(payload);

        const assistantMessage = await createLegalAgentMessage({
            conversationId: conversation.id,
            role: "ASSISTANT",
            content: result.ai.resposta,
            model: result.ai.model,
            promptChars: result.ai.resposta.length,
        });

        await saveLegalAgentResponseLog({
            messageId: assistantMessage.id,
            userId: session.id,
            agentId: parsed.data.agentId,
            model: result.ai.model,
            promptSource: result.prompt.source,
            ragEnabled: result.ai.ragContextUsed,
            confidenceScore: result.ai.confidenceScore,
            citations: result.ai.citations,
            usageMeta: {
                provider: result.ai.provider,
                messagesUsed: result.messagesUsed,
                ragEnabled: result.ai.ragEnabled,
                ragContextUsed: result.ai.ragContextUsed,
                ragObservation: result.ai.ragObservation,
            },
        });

        return {
            success: true as const,
            data: {
                ...result,
                conversation: {
                    id: conversation.id,
                    agentId: conversation.agentId,
                },
                message: mapMessageForClient({
                    ...assistantMessage,
                    attachments: assistantMessage.attachments,
                    responseLog: {
                        ragEnabled: result.ai.ragContextUsed,
                        confidenceScore: result.ai.confidenceScore,
                        citations: result.ai.citations,
                        usageMeta: {
                            provider: result.ai.provider,
                            messagesUsed: result.messagesUsed,
                            ragObservation: result.ai.ragObservation,
                        },
                    },
                    feedback: null,
                }),
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao processar conversa juridica.";
        return { success: false as const, error: message };
    }
}

export async function registrarFeedbackAgenteJuridicoAction(input: unknown) {
    if (!isLegalAiEnabled()) {
        return getLegalAiDisabledResult();
    }

    const session = await getSession();
    if (!session) {
        return { success: false as const, error: "Nao autenticado." };
    }

    const parsed = feedbackSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false as const, error: "Entrada invalida para feedback do agente." };
    }

    try {
        const message = await getLegalAgentAssistantMessageForUser({
            userId: session.id,
            messageId: parsed.data.messageId,
        });

        if (!message) {
            return { success: false as const, error: "Mensagem do agente nao encontrada." };
        }

        const feedback = await setLegalAgentMessageFeedback({
            userId: session.id,
            messageId: parsed.data.messageId,
            value: parsed.data.value,
            note: parsed.data.note || null,
        });

        return {
            success: true as const,
            data: {
                messageId: message.id,
                feedback,
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao registrar feedback do agente.";
        return { success: false as const, error: message };
    }
}
