export type AttendanceAutomationKeywordMode = "ANY" | "ALL" | "EXACT" | "FUZZY";

export type HumanizationStylePresetId =
    | "cordial_profissional"
    | "direto_objetivo"
    | "acolhedor_empatico"
    | "formal_tecnico"
    | "personalizado";

export const ATTENDANCE_KEYWORD_MODE_OPTIONS: Array<{
    value: AttendanceAutomationKeywordMode;
    label: string;
    description: string;
}> = [
    { value: "ANY", label: "Qualquer palavra", description: "Ativa se pelo menos uma keyword aparecer." },
    { value: "ALL", label: "Todas as palavras", description: "Exige todas as keywords configuradas." },
    { value: "EXACT", label: "Frase exata", description: "Busca a frase ou termo configurado sem fuzzy." },
    { value: "FUZZY", label: "Fuzzy IA", description: "Tolera variacoes, erros de digitacao e proximidade textual." },
];

export const LEGAL_KEYWORD_SUGGESTIONS = [
    "consulta",
    "advogado",
    "juridico",
    "processo",
    "agendar",
    "agendamento",
    "horario",
    "reuniao",
    "urgente",
    "prazo",
    "emergencia",
    "documento",
    "contrato",
    "procuracao",
    "honorarios",
    "valor",
    "pagamento",
    "delegacia",
    "prisao",
];

export const HUMANIZATION_STYLE_OPTIONS: Array<{
    id: HumanizationStylePresetId;
    name: string;
    description: string;
    example: string;
    emoji: string;
    promptStyle: string;
}> = [
    {
        id: "cordial_profissional",
        name: "Cordial e Profissional",
        description: "Calido, seguro e humano, sem parecer robotico.",
        example: "Oi! Recebi sua mensagem e ja deixei o assunto encaminhado para a equipe.",
        emoji: "A",
        promptStyle: "Tom cordial, profissional, calmo e confiavel. Soe humano e organizado, sem excesso de formalidade.",
    },
    {
        id: "direto_objetivo",
        name: "Direto e Objetivo",
        description: "Respostas curtas, praticas e sem voltas.",
        example: "Mensagem recebida. Vou direcionar isso com prioridade.",
        emoji: "B",
        promptStyle: "Tom direto, enxuto e pragmatico. Frases curtas, sem rodeios, mantendo educacao.",
    },
    {
        id: "acolhedor_empatico",
        name: "Acolhedor e Empatico",
        description: "Mais proximo e sensivel ao contexto emocional do cliente.",
        example: "Entendo que isso possa preocupar voce. Vou organizar tudo com prioridade.",
        emoji: "C",
        promptStyle: "Tom acolhedor, empatico e humano. Reconheca emocao do cliente sem dramatizar.",
    },
    {
        id: "formal_tecnico",
        name: "Formal e Tecnico",
        description: "Mais institucional e adequado para escritorio empresarial.",
        example: "Confirmamos o recebimento da sua solicitacao e o devido encaminhamento interno.",
        emoji: "D",
        promptStyle: "Tom formal, tecnico e institucional, com clareza e polidez. Evite coloquialismos.",
    },
    {
        id: "personalizado",
        name: "Personalizado",
        description: "Define manualmente o estilo desejado do fluxo.",
        example: "",
        emoji: "E",
        promptStyle: "",
    },
];

const HUMANIZATION_STYLE_PREFIX = "preset:";
const HUMANIZATION_CUSTOM_PREFIX = "custom:";

export function serializeHumanizedStyle(input: {
    presetId: HumanizationStylePresetId;
    customText?: string | null;
}) {
    if (input.presetId === "personalizado") {
        const customText = String(input.customText || "").trim();
        return customText ? `${HUMANIZATION_CUSTOM_PREFIX}${customText}` : "";
    }

    return `${HUMANIZATION_STYLE_PREFIX}${input.presetId}`;
}

export function parseHumanizedStyle(value: string | null | undefined) {
    const raw = String(value || "").trim();
    if (!raw) {
        return {
            presetId: "cordial_profissional" as HumanizationStylePresetId,
            customText: "",
            promptStyle: HUMANIZATION_STYLE_OPTIONS[0]!.promptStyle,
        };
    }

    if (raw.startsWith(HUMANIZATION_STYLE_PREFIX)) {
        const presetId = raw.slice(HUMANIZATION_STYLE_PREFIX.length) as HumanizationStylePresetId;
        const preset = HUMANIZATION_STYLE_OPTIONS.find((item) => item.id === presetId);
        if (preset) {
            return {
                presetId,
                customText: "",
                promptStyle: preset.promptStyle,
            };
        }
    }

    if (raw.startsWith(HUMANIZATION_CUSTOM_PREFIX)) {
        return {
            presetId: "personalizado" as HumanizationStylePresetId,
            customText: raw.slice(HUMANIZATION_CUSTOM_PREFIX.length),
            promptStyle: raw.slice(HUMANIZATION_CUSTOM_PREFIX.length),
        };
    }

    return {
        presetId: "personalizado" as HumanizationStylePresetId,
        customText: raw,
        promptStyle: raw,
    };
}

export function resolveHumanizedPromptStyle(value: string | null | undefined) {
    return parseHumanizedStyle(value).promptStyle || HUMANIZATION_STYLE_OPTIONS[0]!.promptStyle;
}
