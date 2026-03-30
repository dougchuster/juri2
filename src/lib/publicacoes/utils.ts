const CNJ_FORMATTED_REGEX = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g;
const CNJ_DIGITS_REGEX = /\b\d{20}\b/g;

const HTML_ENTITY_MAP: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    ndash: "-",
    mdash: "-",
    hellip: "...",
    aacute: "a",
    Aacute: "A",
    agrave: "a",
    Agrave: "A",
    acirc: "a",
    Acirc: "A",
    atilde: "a",
    Atilde: "A",
    eacute: "e",
    Eacute: "E",
    ecirc: "e",
    Ecirc: "E",
    iacute: "i",
    Iacute: "I",
    oacute: "o",
    Oacute: "O",
    ocirc: "o",
    Ocirc: "O",
    otilde: "o",
    Otilde: "O",
    uacute: "u",
    Uacute: "U",
    ccedil: "c",
    Ccedil: "C",
};

function decodeHtmlEntity(entity: string) {
    if (entity.startsWith("#x")) {
        const codePoint = Number.parseInt(entity.slice(2), 16);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : `&${entity};`;
    }

    if (entity.startsWith("#")) {
        const codePoint = Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : `&${entity};`;
    }

    return HTML_ENTITY_MAP[entity] ?? `&${entity};`;
}

export function normalizeCnjDigits(value?: string | null) {
    return (value || "").replace(/\D/g, "");
}

export function formatCnjFromDigits(digits: string) {
    const clean = normalizeCnjDigits(digits);
    if (clean.length !== 20) return null;
    return `${clean.slice(0, 7)}-${clean.slice(7, 9)}.${clean.slice(9, 13)}.${clean.slice(13, 14)}.${clean.slice(14, 16)}.${clean.slice(16, 20)}`;
}

export function extractCnjFromText(text?: string | null) {
    const source = text || "";
    const formatted = source.match(CNJ_FORMATTED_REGEX);
    if (formatted?.[0]) return formatted[0];

    const digits = source.match(CNJ_DIGITS_REGEX);
    if (digits?.[0]) return formatCnjFromDigits(digits[0]);

    return null;
}

export function extractCnjFromPublicacao(input: {
    processoNumero?: string | null;
    conteudo?: string | null;
}) {
    const fromField = input.processoNumero?.trim();
    if (fromField) {
        const formattedMatch = fromField.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
        if (formattedMatch?.[0]) return formattedMatch[0];

        const fromDigits = formatCnjFromDigits(fromField);
        if (fromDigits) return fromDigits;
    }

    return extractCnjFromText(input.conteudo);
}

export function sanitizePublicationText(content?: string | null) {
    const withLineBreaks = (content || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/<\s*br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|section|article|header|footer|li|ul|ol|tr|td|h[1-6])>/gi, "\n")
        .replace(/<li[^>]*>/gi, "- ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ");

    const decoded = withLineBreaks.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, entity) => {
        return decodeHtmlEntity(entity);
    });

    return decoded
        .replace(/\u00A0/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export function formatPublicationForReading(content?: string | null) {
    const sanitized = sanitizePublicationText(content);
    if (!sanitized) return [];

    const withMarkers = sanitized
        .replace(
            /\s+(N[úu]mero do processo:|Classe judicial:|Classe:|Assunto:|REQUERENTE:|REQUERIDO:|AUTOR:|R[EÉ]U:|EXEQUENTE:|EXECUTADO:|IMPETRANTE:|IMPETRADO:|RELATOR\(A\):|DECIS[AÃ]O INTERLOCUT[OÓ]RIA|DECIS[AÃ]O|SENTEN[CÇ]A|DESPACHO|AC[OÓ]RD[AÃ]O)/gi,
            "\n$1 "
        )
        .replace(/\s+(Intime-se\.|Cumpra-se\.|Publique-se\.|Registre-se\.|Decido\.)/gi, "\n\n$1")
        .replace(/(É o relato do necess[áa]rio\.)/gi, "\n\n$1")
        .replace(/\n{3,}/g, "\n\n");

    const paragraphs = withMarkers
        .split(/\n{2,}|\n(?=(?:N[úu]mero do processo:|Classe judicial:|Classe:|Assunto:|REQUERENTE:|REQUERIDO:|AUTOR:|R[EÉ]U:|EXEQUENTE:|EXECUTADO:|IMPETRANTE:|IMPETRADO:))/i)
        .map((item) => item.replace(/\s+/g, " ").trim())
        .filter(Boolean);

    return paragraphs.length > 0 ? paragraphs : [sanitized];
}

export function extractPartesHighlights(content?: string | null) {
    const text = sanitizePublicationText(content);
    const patterns = [
        /destinat[aá]rio(?:\(a\))?\s*:\s*([^\n\.]{5,180})/i,
        /apelante(?:\(s\))?\s*:\s*([^\n\.]{5,180})/i,
        /apelado(?:\(a\))?\s*:\s*([^\n\.]{5,180})/i,
        /exequente\s*:\s*([^\n\.]{5,180})/i,
        /executado(?:\(a\))?\s*:\s*([^\n\.]{5,180})/i,
        /autor(?:\(a\))?\s*:\s*([^\n\.]{5,180})/i,
        /r[eé]u(?:\(a\))?\s*:\s*([^\n\.]{5,180})/i,
        /requerente\s*:\s*([^\n\.]{5,180})/i,
        /requerido\s*:\s*([^\n\.]{5,180})/i,
    ];

    const highlights: string[] = [];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        const value = match?.[1]?.trim();
        if (value) highlights.push(value);
    }

    return Array.from(new Set(highlights)).slice(0, 6);
}
