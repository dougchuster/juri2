import Fuse from "fuse.js";
import {
    type AttendanceAutomationKeywordMode,
    resolveHumanizedPromptStyle,
} from "@/lib/services/attendance-automation-config";

export interface AttendanceAutomationFlowLike {
    id: string;
    name: string;
    triggerType: "AFTER_HOURS" | "KEYWORD" | "ALWAYS";
    keywordMode: string;
    keywords: unknown;
    businessHoursStart: number;
    businessHoursEnd: number;
    initialReplyTemplate: string;
    followUpReplyTemplate: string | null;
    aiEnabled: boolean;
    aiInstructions: string | null;
    humanizedStyle: string | null;
    maxAutoReplies: number;
    cooldownMinutes: number;
}

export interface AttendanceAutomationSessionLike {
    replyCount: number;
    lastReplyAt: Date | string | null;
}

export interface AttendanceAutomationMatchResult {
    matched: boolean;
    reason: string | null;
    score?: number;
    matchedKeywords?: string[];
}

const URGENCY_PATTERNS = [
    /\burgent[ea]?\b/i,
    /\bpris[ãa]o\b/i,
    /\bpres[oa]\b/i,
    /\bdelegacia\b/i,
    /\bflagrante\b/i,
    /\bhabeas\s+corpus\b/i,
    /\bhospital\b/i,
    /\bviol[êe]ncia\b/i,
    /\bagress[ãa]o\b/i,
    /\bmedida\s+protetiva\b/i,
    /\bsocorro\b/i,
];

export function normalizeAutomationKeywords(value: unknown) {
    if (Array.isArray(value)) {
        return value
            .map((item) => String(item || "").trim())
            .filter(Boolean);
    }

    if (typeof value === "string") {
        return value
            .split(/[,\n;]/g)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [] as string[];
}

export function normalizeAutomationText(value: string) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function resolveKeywordMode(value: string | null | undefined): AttendanceAutomationKeywordMode {
    const normalized = String(value || "ANY").trim().toUpperCase();
    if (normalized === "ALL") return "ALL";
    if (normalized === "EXACT") return "EXACT";
    if (normalized === "FUZZY") return "FUZZY";
    return "ANY";
}

export function evaluateKeywordActivation(params: {
    incomingText: string;
    keywords: string[];
    mode: string | null | undefined;
}) {
    const normalizedText = normalizeAutomationText(params.incomingText);
    const normalizedKeywords = params.keywords
        .map((keyword) => normalizeAutomationText(keyword))
        .filter(Boolean);
    const keywordMode = resolveKeywordMode(params.mode);

    if (!normalizedText || normalizedKeywords.length === 0) {
        return {
            matched: false,
            matchedKeywords: [] as string[],
            score: 0,
            mode: keywordMode,
        };
    }

    if (keywordMode === "ANY") {
        const matchedKeywords = normalizedKeywords.filter((keyword) => normalizedText.includes(keyword));
        return {
            matched: matchedKeywords.length > 0,
            matchedKeywords,
            score: matchedKeywords.length / normalizedKeywords.length,
            mode: keywordMode,
        };
    }

    if (keywordMode === "ALL") {
        const matchedKeywords = normalizedKeywords.filter((keyword) => normalizedText.includes(keyword));
        return {
            matched: matchedKeywords.length === normalizedKeywords.length,
            matchedKeywords,
            score: matchedKeywords.length === normalizedKeywords.length ? 1 : matchedKeywords.length / normalizedKeywords.length,
            mode: keywordMode,
        };
    }

    if (keywordMode === "EXACT") {
        const matchedKeywords = normalizedKeywords.filter((keyword) => normalizedText.includes(keyword));
        return {
            matched: matchedKeywords.length > 0,
            matchedKeywords,
            score: matchedKeywords.length > 0 ? 1 : 0,
            mode: keywordMode,
        };
    }

    const textTokens = Array.from(new Set(normalizedText.split(/\s+/g).filter(Boolean)));
    const fuse = new Fuse(
        [{ value: normalizedText }, ...textTokens.map((token) => ({ value: token }))],
        {
            keys: ["value"],
            includeScore: true,
            threshold: 0.38,
            ignoreLocation: true,
            minMatchCharLength: 3,
        }
    );

    const matchedKeywords = normalizedKeywords.filter((keyword) => {
        if (normalizedText.includes(keyword)) return true;
        const result = fuse.search(keyword, { limit: 1 })[0];
        return Boolean(result && (result.score ?? 1) <= 0.38);
    });

    const topScores = normalizedKeywords
        .map((keyword) => {
            if (normalizedText.includes(keyword)) return 1;
            const result = fuse.search(keyword, { limit: 1 })[0];
            return result ? 1 - (result.score ?? 1) : 0;
        })
        .filter((score) => score > 0);

    return {
        matched: matchedKeywords.length > 0,
        matchedKeywords,
        score: topScores.length > 0 ? Math.max(...topScores) : 0,
        mode: keywordMode,
    };
}

export function detectAttendanceUrgency(value: string) {
    const text = (value || "").trim();
    if (!text) return false;
    return URGENCY_PATTERNS.some((pattern) => pattern.test(text));
}

export function isWithinBusinessHours(referenceDate: Date, startHour: number, endHour: number) {
    const hour = referenceDate.getHours();
    return hour >= startHour && hour < endHour;
}

export function evaluateAttendanceAutomationFlow(params: {
    flow: AttendanceAutomationFlowLike;
    incomingText: string;
    referenceDate: Date;
}) {
    const normalizedText = normalizeAutomationText(params.incomingText);
    const keywords = normalizeAutomationKeywords(params.flow.keywords);
    const withinBusinessHours = isWithinBusinessHours(
        params.referenceDate,
        params.flow.businessHoursStart,
        params.flow.businessHoursEnd
    );

    if (params.flow.triggerType === "AFTER_HOURS") {
        return {
            matched: !withinBusinessHours,
            reason: !withinBusinessHours
                ? `Mensagem recebida fora do horario comercial (${params.flow.businessHoursStart}h-${params.flow.businessHoursEnd}h).`
                : null,
        } satisfies AttendanceAutomationMatchResult;
    }

    if (params.flow.triggerType === "ALWAYS") {
        return {
            matched: normalizedText.length > 0,
            reason: normalizedText.length > 0 ? "Fluxo configurado para responder qualquer mensagem." : null,
        } satisfies AttendanceAutomationMatchResult;
    }

    if (keywords.length === 0) {
        return {
            matched: false,
            reason: null,
            score: 0,
            matchedKeywords: [],
        } satisfies AttendanceAutomationMatchResult;
    }

    const keywordResult = evaluateKeywordActivation({
        incomingText: params.incomingText,
        keywords,
        mode: params.flow.keywordMode,
    });

    return {
        matched: keywordResult.matched,
        reason: keywordResult.matched
            ? `Palavras-chave reconhecidas (${keywordResult.mode}): ${keywordResult.matchedKeywords.join(", ")}.`
            : null,
        score: keywordResult.score,
        matchedKeywords: keywordResult.matchedKeywords,
    } satisfies AttendanceAutomationMatchResult;
}

export function canSendAutomatedReply(params: {
    flow: AttendanceAutomationFlowLike;
    session: AttendanceAutomationSessionLike | null;
    now: Date;
    bypassCooldown?: boolean;
}) {
    if (!params.session) return { allowed: true, reason: null };

    if (params.session.replyCount >= params.flow.maxAutoReplies) {
        return {
            allowed: false,
            reason: "Limite maximo de respostas automaticas atingido para este fluxo.",
        };
    }

    if (!params.session.lastReplyAt) {
        return { allowed: true, reason: null };
    }

    if (params.bypassCooldown) {
        return { allowed: true, reason: "Cooldown ignorado por urgencia explicita na mensagem." };
    }

    const lastReplyAt = new Date(params.session.lastReplyAt);
    const cooldownMs = Math.max(params.flow.cooldownMinutes, 0) * 60 * 1000;
    if (params.now.getTime() - lastReplyAt.getTime() < cooldownMs) {
        return {
            allowed: false,
            reason: "Fluxo em cooldown para evitar respostas automaticas excessivas.",
        };
    }

    return { allowed: true, reason: null };
}

export function replaceAttendanceAutomationVars(
    template: string,
    vars: Record<string, string | number | null | undefined>
) {
    return (template || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => {
        const value = vars[key];
        return value === null || value === undefined ? "" : String(value);
    });
}

export function buildAttendanceAutomationPrompt(params: {
    officeName: string;
    clientName: string;
    flow: AttendanceAutomationFlowLike;
    incomingText: string;
    replyTemplate: string;
    recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
    blockedOpenings?: string[];
}) {
    const historyBlock = params.recentMessages.length
        ? params.recentMessages
              .map((item) => `${item.role === "user" ? "Cliente" : "Assistente"}: ${item.content}`)
              .join("\n")
        : "Sem historico relevante.";
    const blockedOpenings = (params.blockedOpenings || []).filter(Boolean);
    const stylePrompt = resolveHumanizedPromptStyle(params.flow.humanizedStyle);

    return [
        `Voce e a assistente virtual humanizada do escritorio ${params.officeName}.`,
        `Cliente atual: ${params.clientName}.`,
        "Seu papel e responder em portugues-BR com tom natural, acolhedor e profissional.",
        "Nunca invente fatos juridicos, prazos ou orientacoes complexas. Quando a demanda exigir analise tecnica, diga que a equipe retornara no horario util.",
        `Fluxo ativo: ${params.flow.name}.`,
        `Instrucao do fluxo: ${params.flow.aiInstructions || "Manter a resposta objetiva, clara e simpatica."}`,
        `Estilo desejado: ${stylePrompt || "Humano, elegante e direto."}`,
        `Base padrao da resposta: ${params.replyTemplate}`,
        `Historico recente:\n${historyBlock}`,
        `Mensagem recebida agora:\n${params.incomingText}`,
        blockedOpenings.length > 0
            ? `Nao comece a mensagem com nenhuma destas aberturas recentes: ${blockedOpenings.join(" | ")}.`
            : "Varie a abertura e evite repeticao de frases entre respostas consecutivas.",
        "Use no maximo 3 paragrafos curtos, com tom brasileiro natural de WhatsApp.",
        "Gere apenas a resposta final, sem explicar o raciocinio.",
    ].join("\n\n");
}
