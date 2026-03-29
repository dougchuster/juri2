import "server-only";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function readBooleanFlag(name: string, defaultValue = false) {
    const rawValue = process.env[name];
    if (typeof rawValue !== "string") return defaultValue;
    return TRUE_VALUES.has(rawValue.trim().toLowerCase());
}

export const LEGAL_AI_DISABLED_MESSAGE =
    "IA juridica desativada neste ambiente para reduzir consumo do servidor.";

export const LEGAL_ATTACHMENT_OCR_REMOVED_MESSAGE =
    "OCR de anexos foi removido desta instalacao para reduzir consumo do servidor.";

export const LEGAL_RAG_DISABLED_MESSAGE =
    "RAG juridico desativado neste ambiente.";

export const LEGAL_RAG_AGENT_DISABLED_MESSAGE =
    "Agentes com RAG juridico desativados neste ambiente.";

export function isLegalAiEnabled() {
    return readBooleanFlag("ENABLE_LEGAL_AI", false);
}

export function isRagJuridicoEnabled() {
    return readBooleanFlag("FEATURE_RAG_JURIDICO", false);
}

export function isRagAgentsEnabled() {
    return readBooleanFlag("FEATURE_AGENTES_COM_RAG", false);
}
