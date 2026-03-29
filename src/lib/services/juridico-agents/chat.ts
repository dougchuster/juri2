import "server-only";

import { askGemini, isGeminiConfigured } from "@/lib/services/ai-gemini";
import type { GeminiMessage } from "@/lib/services/ai-gemini";
import { retrieveRagContext } from "@/lib/services/rag/rag-pipeline";
import {
    isRagAgentsEnabled,
    isRagJuridicoEnabled,
} from "@/lib/runtime-features";
import { getLegalAgentByIdOrThrow } from "./registry";
import { resolveLegalAgentSystemPrompt } from "./prompt-resolver";
import {
    appendAgentReferencesToAnswer,
    buildAgentRagContextBlock,
    buildAgentRagReferences,
    estimateAgentConfidenceScore,
} from "./rag-support";
import type {
    LegalAgentChatInput,
    LegalAgentChatResult,
    LegalAgentConversationMessage,
} from "./types";

const MAX_PROMPT_CONTENT = 24_000;
const MAX_USER_CONTENT = 12_000;
const MAX_CONTEXT_CONTENT = 16_000;
const MAX_HISTORY_CONTENT = 8_000;
const MAX_HISTORY_ITEMS = 20;

type LegalAgentChatBuildInput = LegalAgentChatInput & {
    ragContextBlock?: string;
};

function normalizeText(value: string, maxLength: number) {
    const normalized = (value || "").replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength - 1)}...`;
}

function sanitizeHistoryMessage(message: LegalAgentConversationMessage): GeminiMessage | null {
    const content = normalizeText(message.content || "", MAX_HISTORY_CONTENT);
    if (!content) return null;
    // Gemini usa "user" | "model" (não "assistant")
    return {
        role: message.role === "assistant" ? "model" : "user",
        content,
    };
}

function buildUserMessage(input: LegalAgentChatBuildInput) {
    const pergunta = normalizeText(input.pergunta, MAX_USER_CONTENT);
    const contexto = normalizeText(input.contexto || "", MAX_CONTEXT_CONTENT);
    const ragContextBlock = normalizeText(input.ragContextBlock || "", 14_000);

    const parts = [`Pergunta principal do advogado:\n${pergunta}`];
    if (contexto) {
        parts.push(`Contexto adicional do caso:\n${contexto}`);
    }
    if (ragContextBlock) {
        parts.push(ragContextBlock);
    }
    parts.push(
        "Responda com foco tecnico-juridico e respeite o protocolo do agente, incluindo alertas de revisao profissional."
    );
    return parts.join("\n\n");
}

function buildNoKeyFallback(agentName: string) {
    return [
        `O ${agentName} esta disponivel, mas a chave GEMINI_API_KEY nao foi configurada no ambiente.`,
        "Configure a chave para habilitar o processamento de IA.",
    ].join(" ");
}

function resolveAgentArea(agentId: string) {
    if (agentId.includes("civil")) return "CIVEL";
    if (agentId.includes("criminal")) return "CRIMINAL";
    if (agentId.includes("trabalh")) return "TRABALHISTA";
    if (agentId.includes("previd")) return "PREVIDENCIARIO";
    if (agentId.includes("tribut")) return "TRIBUTARIO";
    return null;
}

export async function conversarComAgenteJuridico(
    input: LegalAgentChatInput
): Promise<LegalAgentChatResult> {
    const agent = getLegalAgentByIdOrThrow(input.agentId);
    const systemPrompt = normalizeText(
        await resolveLegalAgentSystemPrompt(agent),
        MAX_PROMPT_CONTENT
    );

    const maxHistory = Math.max(
        0,
        Math.min(MAX_HISTORY_ITEMS, agent.maxHistoryMessages ?? MAX_HISTORY_ITEMS)
    );
    const history = (input.historico || [])
        .slice(-maxHistory)
        .map(sanitizeHistoryMessage)
        .filter((item): item is GeminiMessage => Boolean(item));

    let ragContextUsed = false;
    let ragObservation: LegalAgentChatResult["ai"]["ragObservation"] = null;
    let citations = [] as LegalAgentChatResult["ai"]["citations"];
    let confidenceScore: number | null = null;
    const ragEnabled =
        Boolean(input.escritorioId) && isRagJuridicoEnabled() && isRagAgentsEnabled();

    let ragContextBlock = "";
    if (ragEnabled && input.escritorioId) {
        try {
            const ragResult = await retrieveRagContext({
                escritorioId: input.escritorioId,
                query: [input.pergunta, input.contexto || ""].filter(Boolean).join("\n\n"),
                area: resolveAgentArea(agent.id),
                topK: 3,
                referenceDate: new Date(),
            });

            citations = buildAgentRagReferences(ragResult.items);
            ragContextBlock = buildAgentRagContextBlock(citations);
            ragContextUsed = citations.length > 0;
            confidenceScore = estimateAgentConfidenceScore({
                references: citations,
                ragEnabled: ragContextUsed,
                retrievalSelectedCount: ragResult.observation.selectedCount,
            });
            ragObservation = {
                selectedCount: ragResult.observation.selectedCount,
                latencyMs: ragResult.observation.latencyMs,
            };
        } catch (error) {
            console.warn("[juridico-agents] Falha ao recuperar contexto RAG:", error);
        }
    }

    const userMessage = buildUserMessage({ ...input, ragContextBlock });
    const messages: GeminiMessage[] = [
        ...history,
        { role: "user", content: userMessage },
    ];

    if (!isGeminiConfigured()) {
        return {
            agent: {
                id: agent.id,
                name: agent.name,
                specialty: agent.specialty,
            },
            ai: {
                provider: "Gemini 3.1 Flash-Lite",
                enabled: false,
                model: null,
                resposta: buildNoKeyFallback(agent.name),
                confidenceScore,
                ragEnabled,
                citations,
                ragContextUsed,
                ragObservation,
            },
            prompt: {
                source: agent.prompt.type === "file" ? agent.prompt.path : "inline",
            },
            messagesUsed: messages.length,
        };
    }

    try {
        const completion = await askGemini(messages, {
            module: "agentes",
            systemInstruction: systemPrompt,
            temperature:
                typeof input.temperature === "number" && Number.isFinite(input.temperature)
                    ? input.temperature
                    : undefined,
            maxOutputTokens: input.maxTokens || agent.defaultMaxTokens || 4000,
        });

        return {
            agent: {
                id: agent.id,
                name: agent.name,
                specialty: agent.specialty,
            },
            ai: {
                provider: "Gemini 3.1 Flash-Lite",
                enabled: true,
                model: completion.model,
                resposta: appendAgentReferencesToAnswer(
                    completion.content,
                    citations,
                    confidenceScore
                ),
                confidenceScore,
                ragEnabled,
                citations,
                ragContextUsed,
                ragObservation,
            },
            prompt: {
                source: agent.prompt.type === "file" ? agent.prompt.path : "inline",
            },
            messagesUsed: messages.length,
        };
    } catch (error) {
        const detail = error instanceof Error ? error.message : "Falha desconhecida";
        return {
            agent: {
                id: agent.id,
                name: agent.name,
                specialty: agent.specialty,
            },
            ai: {
                provider: "Gemini 3.1 Flash-Lite",
                enabled: false,
                model: null,
                resposta: `Falha ao consultar o provedor de IA: ${detail}`,
                confidenceScore,
                ragEnabled,
                citations,
                ragContextUsed,
                ragObservation,
            },
            prompt: {
                source: agent.prompt.type === "file" ? agent.prompt.path : "inline",
            },
            messagesUsed: messages.length,
        };
    }
}
