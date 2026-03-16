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

export interface LegalAgentChatInput {
    agentId: LegalAgentId;
    pergunta: string;
    contexto?: string;
    historico?: LegalAgentConversationMessage[];
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
    };
    prompt: {
        source: string;
    };
    messagesUsed: number;
}
