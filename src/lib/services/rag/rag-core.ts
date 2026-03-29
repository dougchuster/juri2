const DEFAULT_MAX_CHARS = 1200;
const DEFAULT_OVERLAP_CHARS = 180;

export interface RagChunkInput {
    sourceId: string;
    titulo: string;
    texto: string;
    tribunal?: string | null;
    area?: string | null;
    dataReferencia?: string | Date | null;
    maxChars?: number;
    overlapChars?: number;
}

export interface RagDocumentChunk {
    id: string;
    sourceId: string;
    chunkIndex: number;
    titulo: string;
    texto: string;
    tribunal: string | null;
    area: string | null;
    dataReferencia: string | null;
    tokensEstimados: number;
}

export interface RagRetrievedChunk {
    id: string;
    sourceId: string;
    chunkIndex: number;
    titulo: string;
    texto: string;
    originType?: string | null;
    originId?: string | null;
    tribunal: string | null;
    area: string | null;
    dataReferencia: string | null;
    ementa?: string | null;
    metadata?: Record<string, unknown> | null;
    semanticScore: number;
}

export interface RagRerankedChunk extends RagRetrievedChunk {
    rerankScore: number;
    matchReasons: string[];
}

export interface RagRerankContext {
    query: string;
    tribunal?: string | null;
    area?: string | null;
    referenceDate?: string | Date | null;
}

export interface RagRetrievalObservationInput {
    query: string;
    topK: number;
    rawCandidateCount: number;
    selectedCandidates: Array<{ id: string }>;
    startedAtMs: number;
    endedAtMs: number;
}

export interface RagRetrievalObservation {
    query: string;
    topK: number;
    rawCandidateCount: number;
    selectedCount: number;
    selectedIds: string[];
    latencyMs: number;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function normalizeDate(value: string | Date | null | undefined) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function estimateTokens(text: string) {
    return Math.max(1, Math.ceil(text.length / 4));
}

function tokenize(text: string) {
    return Array.from(
        new Set(
            normalizeRagText(text)
                .toLowerCase()
                .split(/[^a-z0-9à-ÿ]+/i)
                .filter((token) => token.length >= 3)
        )
    );
}

function splitIntoChunks(text: string, maxChars: number, overlapChars: number) {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        let end = Math.min(start + maxChars, text.length);

        if (end < text.length) {
            const hardFloor = start + Math.floor(maxChars * 0.55);
            const paragraphBreak = text.lastIndexOf("\n\n", end);
            const sentenceBreak = text.lastIndexOf(". ", end);
            const lineBreak = text.lastIndexOf("\n", end);
            const spaceBreak = text.lastIndexOf(" ", end);
            const boundary = [paragraphBreak, sentenceBreak, lineBreak, spaceBreak].find(
                (candidate) => candidate >= hardFloor
            );

            if (typeof boundary === "number" && boundary > start) {
                end = boundary + 1;
            }
        }

        const chunk = text.slice(start, end).trim();
        if (chunk) {
            chunks.push(chunk);
        }

        if (end >= text.length) {
            break;
        }

        start = Math.max(end - overlapChars, start + 1);
    }

    return chunks;
}

function calculateRecencyBoost(
    dataReferencia: string | null,
    referenceDate: string | Date | null | undefined
) {
    const baseDate = normalizeDate(referenceDate);
    const itemDate = normalizeDate(dataReferencia);
    if (!baseDate || !itemDate) return 0;

    const diffMs = new Date(baseDate).getTime() - new Date(itemDate).getTime();
    if (diffMs <= 0) return 0.08;

    const diffDays = diffMs / 86_400_000;
    return clamp((365 - diffDays) / 365, 0, 1) * 0.08;
}

export function normalizeRagText(text: string) {
    return text
        .replace(/\r/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export function inferLegalAreaFromText(text: string) {
    const lowered = normalizeRagText(text).toLowerCase();

    if (/\b(inss|aposentador|beneficio|previdenci)/.test(lowered)) return "PREVIDENCIARIO";
    if (/\b(icms|ipi|pis|cofins|tribut|fiscal|imposto)\b/.test(lowered)) return "TRIBUTARIO";
    if (/\b(clt|trabalh|rescis|verbas|empregad|empregador)\b/.test(lowered)) return "TRABALHISTA";
    if (/\b(crime|penal|homicidio|furto|roubo|prisao)\b/.test(lowered)) return "CRIMINAL";
    if (/\b(contrato|indeniza|danos morais|responsabilidade civil|consumidor)\b/.test(lowered)) {
        return "CIVEL";
    }

    return null;
}

export function chunkRagDocument(input: RagChunkInput): RagDocumentChunk[] {
    const maxChars = input.maxChars ?? DEFAULT_MAX_CHARS;
    const overlapChars = Math.min(input.overlapChars ?? DEFAULT_OVERLAP_CHARS, Math.floor(maxChars / 3));
    const normalizedText = normalizeRagText(input.texto);

    if (!normalizedText) return [];

    return splitIntoChunks(normalizedText, maxChars, overlapChars).map((texto, chunkIndex) => ({
        id: `${input.sourceId}:chunk:${chunkIndex}`,
        sourceId: input.sourceId,
        chunkIndex,
        titulo: input.titulo,
        texto,
        tribunal: input.tribunal?.trim() || null,
        area: input.area?.trim() || null,
        dataReferencia: normalizeDate(input.dataReferencia),
        tokensEstimados: estimateTokens(texto),
    }));
}

export function rerankRagCandidates(
    candidates: RagRetrievedChunk[],
    context: RagRerankContext
): RagRerankedChunk[] {
    const queryTokens = tokenize(context.query);
    const requestedTribunal = context.tribunal?.trim().toLowerCase() || null;
    const requestedArea = context.area?.trim().toLowerCase() || null;

    return [...candidates]
        .map((candidate) => {
            const titleTokens = tokenize(candidate.titulo);
            const textTokens = tokenize(candidate.texto);
            const candidateTokenSet = new Set([...titleTokens, ...textTokens]);
            const matchedTokens = queryTokens.filter((token) => candidateTokenSet.has(token));
            const overlapRatio =
                queryTokens.length === 0 ? 0 : clamp(matchedTokens.length / queryTokens.length, 0, 1);
            const titleBoost =
                queryTokens.length === 0
                    ? 0
                    : clamp(queryTokens.filter((token) => titleTokens.includes(token)).length / queryTokens.length, 0, 1) *
                      0.08;
            const tribunalMatches =
                !!requestedTribunal && candidate.tribunal?.trim().toLowerCase() === requestedTribunal;
            const areaMatches = !!requestedArea && candidate.area?.trim().toLowerCase() === requestedArea;
            const tribunalMismatch =
                !!requestedTribunal &&
                !!candidate.tribunal &&
                candidate.tribunal.trim().toLowerCase() !== requestedTribunal;
            const areaMismatch =
                !!requestedArea &&
                !!candidate.area &&
                candidate.area.trim().toLowerCase() !== requestedArea;
            const recencyBoost = calculateRecencyBoost(candidate.dataReferencia, context.referenceDate);

            const rerankScore =
                candidate.semanticScore * 0.72 +
                overlapRatio * 0.18 +
                titleBoost +
                (tribunalMatches ? 0.08 : 0) +
                (areaMatches ? 0.06 : 0) +
                (tribunalMismatch ? -0.03 : 0) +
                (areaMismatch ? -0.12 : 0) +
                recencyBoost;

            const matchReasons = [
                ...(matchedTokens.length > 0 ? ["query_overlap"] : []),
                ...(titleBoost > 0 ? ["title_overlap"] : []),
                ...(tribunalMatches ? ["tribunal"] : []),
                ...(areaMatches ? ["area"] : []),
                ...(tribunalMismatch ? ["tribunal_mismatch"] : []),
                ...(areaMismatch ? ["area_mismatch"] : []),
                ...(recencyBoost > 0 ? ["recencia"] : []),
            ];

            return {
                ...candidate,
                rerankScore: Number(rerankScore.toFixed(6)),
                matchReasons,
            };
        })
        .sort((left, right) => {
            if (right.rerankScore !== left.rerankScore) {
                return right.rerankScore - left.rerankScore;
            }
            return right.semanticScore - left.semanticScore;
        });
}

export function buildRetrievalObservation(
    input: RagRetrievalObservationInput
): RagRetrievalObservation {
    return {
        query: input.query,
        topK: input.topK,
        rawCandidateCount: input.rawCandidateCount,
        selectedCount: input.selectedCandidates.length,
        selectedIds: input.selectedCandidates.map((candidate) => candidate.id),
        latencyMs: Math.max(0, Math.round(input.endedAtMs - input.startedAtMs)),
    };
}
