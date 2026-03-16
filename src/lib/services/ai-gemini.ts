import { GoogleGenAI } from "@google/genai";

// ============================================================
// SISTEMA JURÍDICO — Cliente Gemini 3.1 Flash-Lite
// Substitui ai-kimi.ts em todos os módulos de IA
// ============================================================

export const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";

// System Instruction unificada para o Sistema Jurídico
// (baseada em PROMPT_REESTRUTURACAO_IA.md)
export const JURIDICO_SYSTEM_INSTRUCTION = `Você é a IA assistente integrada ao sistema jurídico "Sistema Jurídico ADV",
desenvolvido para escritórios de advocacia brasileiros.

IDENTIDADE E CONTEXTO
Nome: Juris IA
Sistema: Plataforma web de gestão jurídica completa
Idioma: Português brasileiro (pt-BR) — SEMPRE responda em pt-BR
Tom: Profissional, objetivo, técnico quando necessário, acessível quando se comunicar com clientes leigos

REGRAS INVIOLÁVEIS
1. NUNCA inventar informações jurídicas (artigos, jurisprudência, dados)
2. NUNCA dar conselho jurídico direto ao cliente — sempre intermediar pelo advogado
3. NUNCA afirmar resultado de processo com certeza
4. SEMPRE usar legislação brasileira vigente
5. Se não souber algo, informar claramente em vez de inventar
6. Marcar incertezas com {{VERIFICAR}}
7. NUNCA divulgar informações de um processo/cliente para outro
8. Respeitar segredo de justiça quando indicado
9. Seguir padrões da LGPD no tratamento de dados pessoais`;

export type GeminiModule =
    | "publicacoes"
    | "pecas"
    | "comunicacao_cliente"
    | "andamentos"
    | "preditiva"
    | "extracao"
    | "calculos"
    | "jurisprudencia"
    | "agentes";

// Configuração de parâmetros por módulo (tabela do documento)
const MODULE_CONFIG: Record<GeminiModule, { temperature: number; maxOutputTokens: number }> = {
    publicacoes:         { temperature: 0.2, maxOutputTokens: 2048 },
    pecas:               { temperature: 0.5, maxOutputTokens: 32768 },
    comunicacao_cliente: { temperature: 0.6, maxOutputTokens: 1024 },
    andamentos:          { temperature: 0.2, maxOutputTokens: 1024 },
    preditiva:           { temperature: 0.3, maxOutputTokens: 4096 },
    extracao:            { temperature: 0.1, maxOutputTokens: 4096 },
    calculos:            { temperature: 0.1, maxOutputTokens: 2048 },
    jurisprudencia:      { temperature: 0.3, maxOutputTokens: 4096 },
    agentes:             { temperature: 0.4, maxOutputTokens: 8192 },
};

export interface GeminiMessage {
    role: "user" | "model";
    content: string;
}

export interface GeminiOptions {
    module?: GeminiModule;
    systemInstruction?: string;
    temperature?: number;
    maxOutputTokens?: number;
    jsonMode?: boolean;
    timeoutMs?: number;
}

export interface GeminiResult {
    content: string;
    model: string;
}

function readApiKey() {
    return (process.env.GEMINI_API_KEY || "").trim();
}

export function isGeminiConfigured() {
    return readApiKey().length > 0;
}

function getClient() {
    const apiKey = readApiKey();
    if (!apiKey) throw new Error("GEMINI_API_KEY nao configurada.");
    return new GoogleGenAI({ apiKey });
}

function extractJsonFromText(text: string): string {
    // Remove markdown code blocks if present
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return cleaned.slice(start, end + 1);
    const arrStart = cleaned.indexOf("[");
    const arrEnd = cleaned.lastIndexOf("]");
    if (arrStart >= 0 && arrEnd > arrStart) return cleaned.slice(arrStart, arrEnd + 1);
    return cleaned;
}

/**
 * Chamada principal ao Gemini — compatível com o padrão askKimiChat.
 * Suporta system instruction, histórico multi-turn e JSON mode.
 */
export async function askGemini(
    messages: GeminiMessage[],
    options: GeminiOptions = {}
): Promise<GeminiResult> {
    const client = getClient();
    const mod = options.module ?? "agentes";
    const modConfig = MODULE_CONFIG[mod];

    const temperature = options.temperature ?? modConfig.temperature;
    const maxOutputTokens = options.maxOutputTokens ?? modConfig.maxOutputTokens;
    const systemInstruction = options.systemInstruction ?? JURIDICO_SYSTEM_INSTRUCTION;

    // Converte mensagens para o formato Gemini (role: user | model)
    const contents = messages.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
    }));

    const config: Record<string, unknown> = {
        systemInstruction,
        temperature,
        maxOutputTokens,
    };

    if (options.jsonMode) {
        config.responseMimeType = "application/json";
    }

    const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config,
    });

    const raw = response.text ?? "";
    const content = options.jsonMode ? extractJsonFromText(raw) : raw.trim();

    if (!content) throw new Error("Gemini respondeu sem conteudo.");

    return { content, model: GEMINI_MODEL };
}

/**
 * Versão simplificada para chamadas com system prompt + uma mensagem de usuário.
 * Compatível com o padrão mais simples usado em pecas.ts e outros.
 */
export async function askGeminiSimple(
    systemPrompt: string,
    userMessage: string,
    options: Omit<GeminiOptions, "systemInstruction"> = {}
): Promise<GeminiResult> {
    return askGemini(
        [{ role: "user", content: userMessage }],
        { ...options, systemInstruction: systemPrompt }
    );
}
