import type { LegalAgentRagReference } from "./types";

interface RetrievalCandidate {
    id: string;
    titulo: string;
    tribunal: string | null;
    area: string | null;
    dataReferencia: string | null;
    texto: string;
    rerankScore: number;
    semanticScore: number;
    originType?: string | null;
    originId?: string | null;
    metadata?: Record<string, unknown> | null;
    matchReasons: string[];
}

export interface AgentConfidenceInput {
    references: LegalAgentRagReference[];
    ragEnabled: boolean;
    retrievalSelectedCount: number;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function normalizeText(value: string, maxLength: number) {
    const normalized = (value || "").replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength - 1)}...`;
}

function resolveReferenceLabel(item: RetrievalCandidate) {
    const metadataLabel =
        typeof item.metadata?.identificador === "string"
            ? item.metadata.identificador
            : typeof item.metadata?.numeroAcordao === "string"
            ? item.metadata.numeroAcordao
            : null;

    return metadataLabel || item.titulo;
}

export function buildAgentRagReferences(items: RetrievalCandidate[]): LegalAgentRagReference[] {
    return items.map((item) => ({
        id: item.id,
        title: item.titulo,
        displayLabel: resolveReferenceLabel(item),
        tribunal: item.tribunal,
        area: item.area,
        dataReferencia: item.dataReferencia,
        excerpt: normalizeText(item.texto, 280),
        sourceId: item.id ?? null,
        originType: item.originType ?? null,
        originId: item.originId ?? null,
        score: Number(item.rerankScore.toFixed(4)),
        matchReasons: item.matchReasons,
    }));
}

export function buildAgentRagContextBlock(references: LegalAgentRagReference[]) {
    if (!references.length) return "";

    return [
        "Jurisprudencia recuperada para grounding da resposta:",
        "Use somente as referencias abaixo quando mencionar precedentes. Se houver incerteza, sinalize verificacao humana.",
        ...references.map((reference, index) =>
            [
                `[${index + 1}] ${reference.displayLabel}`,
                reference.tribunal ? `Tribunal: ${reference.tribunal}` : null,
                reference.area ? `Area: ${reference.area}` : null,
                reference.dataReferencia ? `Data: ${reference.dataReferencia.slice(0, 10)}` : null,
                `Score: ${reference.score.toFixed(3)}`,
                `Trecho relevante: ${reference.excerpt}`,
            ]
                .filter(Boolean)
                .join("\n")
        ),
    ].join("\n\n");
}

export function estimateAgentConfidenceScore(input: AgentConfidenceInput) {
    if (!input.ragEnabled || input.retrievalSelectedCount === 0 || input.references.length === 0) {
        return 0.42;
    }

    const averageScore =
        input.references.reduce((total, item) => total + item.score, 0) / input.references.length;
    const citationCoverage = clamp(input.references.length / Math.max(input.retrievalSelectedCount, 1), 0, 1);
    const tribunalSignals =
        input.references.filter((item) => (item.matchReasons || []).includes("tribunal")).length /
        input.references.length;

    return Number(
        clamp(0.48 + averageScore * 0.28 + citationCoverage * 0.12 + tribunalSignals * 0.08, 0.35, 0.99).toFixed(2)
    );
}

export function appendAgentReferencesToAnswer(
    answer: string,
    references: LegalAgentRagReference[],
    confidenceScore: number | null
) {
    const base = (answer || "").trim();
    const footer: string[] = [];

    if (typeof confidenceScore === "number") {
        footer.push(`Confianca estimada: ${(confidenceScore * 100).toFixed(0)}%`);
    }

    if (references.length > 0) {
        footer.push(
            [
                "Referencias recuperadas:",
                ...references.map((reference, index) => {
                    const parts = [
                        `${index + 1}. ${reference.displayLabel}`,
                        reference.tribunal,
                        reference.dataReferencia ? reference.dataReferencia.slice(0, 10) : null,
                    ].filter(Boolean);

                    return `${parts.join(" | ")}\nTrecho: ${reference.excerpt}`;
                }),
            ].join("\n")
        );
    }

    if (!footer.length) return base;
    return [base, ...footer].filter(Boolean).join("\n\n");
}
