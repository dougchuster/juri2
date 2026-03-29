export type LegalAgentId = string;

export type LegalAgentPromptSource =
    | {
          type: "inline";
          content: string;
      }
    | {
          type: "file";
          path: string;
      };

export interface LegalAgentDefinition {
    id: LegalAgentId;
    slug: string;
    name: string;
    specialty: string;
    description: string;
    prompt: LegalAgentPromptSource;
    defaultModel?: string;
    defaultThinking?: string;
    defaultMaxTokens?: number;
    maxHistoryMessages?: number;
}

export interface LegalAgentConversationMessage {
    role: "user" | "assistant";
    content: string;
}

export interface LegalAgentRagReference {
    id: string;
    title: string;
    displayLabel: string;
    tribunal: string | null;
    area: string | null;
    dataReferencia: string | null;
    excerpt: string;
    sourceId: string | null;
    originType: string | null;
    originId: string | null;
    score: number;
    matchReasons: string[];
}

export interface LegalAgentChatInput {
    agentId: LegalAgentId;
    pergunta: string;
    contexto?: string;
    historico?: LegalAgentConversationMessage[];
    escritorioId?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    thinking?: string;
}

export interface LegalAgentCatalogItem {
    id: LegalAgentId;
    slug: string;
    name: string;
    specialty: string;
    description: string;
}

export interface LegalAgentChatResult {
    agent: {
        id: LegalAgentId;
        name: string;
        specialty: string;
    };
    ai: {
        provider: string;
        enabled: boolean;
        model: string | null;
        resposta: string;
        confidenceScore: number | null;
        ragEnabled: boolean;
        citations: LegalAgentRagReference[];
        ragContextUsed: boolean;
        ragObservation?: {
            selectedCount: number;
            latencyMs: number;
        } | null;
    };
    prompt: {
        source: string;
    };
    messagesUsed: number;
}
