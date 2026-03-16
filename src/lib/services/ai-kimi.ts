
export interface KimiChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface KimiChatOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    thinking?: "enabled" | "disabled";
    timeoutMs?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
}

const DEFAULT_KIMI_BASE_URL = "https://api.moonshot.ai/v1";
const DEFAULT_KIMI_MODEL = "kimi-k2.5";

const FALLBACK_K2_MODELS = [
    "kimi-k2-thinking",
    "kimi-k2-thinking-turbo",
    "kimi-k2.5",
    "kimi-k2-0905-preview",
];

function readKimiApiKey() {
    return (process.env.KIMI_API_KEY || "").trim();
}

function readBaseUrl() {
    const raw = (process.env.KIMI_API_BASE_URL || DEFAULT_KIMI_BASE_URL).trim();
    return raw.replace(/\/$/, "");
}

function resolveModelName(model?: string) {
    const normalized = (model || "").trim().toLowerCase();
    if (!normalized) return DEFAULT_KIMI_MODEL;

    if (normalized === "kimi-k2.5" || normalized === "kimi2.5" || normalized === "k2.5") {
        return "kimi-k2.5";
    }

    return model!.trim();
}

function isK2Model(model: string) {
    return model.toLowerCase().includes("kimi-k2");
}

function readModel() {
    return resolveModelName(process.env.KIMI_MODEL || DEFAULT_KIMI_MODEL);
}

function isModelUnavailableError(errorText: string) {
    const normalized = (errorText || "").toLowerCase();
    return (
        normalized.includes("model_not_found") ||
        normalized.includes("invalid model") ||
        normalized.includes("unsupported model") ||
        normalized.includes("no such model")
    );
}

function buildModelCandidates(primaryModel: string) {
    const candidates = [primaryModel, ...FALLBACK_K2_MODELS];
    return Array.from(new Set(candidates.map((item) => item.trim()).filter(Boolean)));
}

function extractMessageContent(payload: unknown) {
    if (!payload || typeof payload !== "object") return "";

    const root = payload as {
        choices?: Array<{
            message?: {
                content?:
                    | string
                    | Array<{
                          type?: string;
                          text?: string;
                      }>;
            };
        }>;
    };

    const content = root.choices?.[0]?.message?.content;
    if (typeof content === "string") return content.trim();
    if (Array.isArray(content)) {
        return content
            .map((part) => (typeof part?.text === "string" ? part.text : ""))
            .filter(Boolean)
            .join("\n")
            .trim();
    }

    return "";
}

export function isKimiConfigured() {
    return readKimiApiKey().length > 0;
}

export async function askKimiChat(
    messages: KimiChatMessage[],
    options: KimiChatOptions = {}
) {
    const apiKey = readKimiApiKey();
    if (!apiKey) {
        throw new Error("KIMI_API_KEY nao configurada.");
    }

    const preferredModel = resolveModelName(options.model || readModel());
    const modelCandidates = buildModelCandidates(preferredModel);

    let lastError = "Falha desconhecida";

    for (let index = 0; index < modelCandidates.length; index += 1) {
        const model = modelCandidates[index];
        const isK2 = isK2Model(model);
        const timeoutMs = Math.max(1_000, Math.min(options.timeoutMs ?? 20_000, 60_000));
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const requestBody: Record<string, unknown> = {
            model,
            max_tokens: options.maxTokens ?? 1400,
            messages,
        };

        if (isK2) {
            requestBody.thinking = {
                type: options.thinking || "disabled",
            };
            if (typeof options.temperature === "number") {
                requestBody.temperature = options.temperature;
            }
        } else if (typeof options.temperature === "number") {
            requestBody.temperature = options.temperature;
        } else {
            requestBody.temperature = 0.2;
        }

        if (typeof options.frequencyPenalty === "number") {
            requestBody.frequency_penalty = options.frequencyPenalty;
        }
        if (typeof options.presencePenalty === "number") {
            requestBody.presence_penalty = options.presencePenalty;
        }

        let response: Response;
        try {
            response = await fetch(`${readBaseUrl()}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify(requestBody),
                cache: "no-store",
                signal: controller.signal,
            });
        } catch (error) {
            clearTimeout(timeout);
            if (error instanceof Error && error.name === "AbortError") {
                throw new Error(`Kimi timeout apos ${timeoutMs}ms.`);
            }
            throw error;
        }
        clearTimeout(timeout);

        if (!response.ok) {
            const errorText = await response.text();
            lastError = `Kimi HTTP ${response.status}: ${errorText.slice(0, 400)}`;
            const shouldTryFallback =
                response.status >= 400 &&
                response.status < 500 &&
                isModelUnavailableError(errorText) &&
                index < modelCandidates.length - 1;
            if (shouldTryFallback) {
                continue;
            }
            throw new Error(lastError);
        }

        const payload = await response.json();
        const content = extractMessageContent(payload);
        if (!content) {
            lastError = "Kimi respondeu sem conteudo.";
            if (index < modelCandidates.length - 1) {
                continue;
            }
            throw new Error(lastError);
        }

        return {
            content,
            model,
        };
    }

    throw new Error(lastError);
}
