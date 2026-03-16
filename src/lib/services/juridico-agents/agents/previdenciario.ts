import type { LegalAgentDefinition } from "../types";

export const agentePrevidenciario: LegalAgentDefinition = {
    id: "agente_previdenciario",
    slug: "previdenciario",
    name: "Agente Previdenciario",
    specialty: "PREVIDENCIARIO",
    description:
        "Assistente juridico virtual para suporte tecnico a advogados em Direito Previdenciario.",
    prompt: {
        type: "file",
        path: "docs/agente-juridico-prev.md",
    },
    defaultModel: "kimi-k2.5",
    defaultThinking: "enabled",
    defaultMaxTokens: 2400,
    maxHistoryMessages: 28,
};
