import { embedQuery } from "@/lib/services/rag/embedding-service";
import {
    buildRetrievalObservation,
    rerankRagCandidates,
    type RagRerankedChunk,
    type RagRetrievalObservation,
} from "@/lib/services/rag/rag-core";
import {
    logRagRetrievalObservation,
    similaritySearchRagChunks,
} from "@/lib/services/rag/vector-store";

export interface RagSearchInput {
    escritorioId: string;
    query: string;
    tribunal?: string | null;
    area?: string | null;
    topK?: number;
    referenceDate?: string | Date | null;
}

export interface RagSearchResult {
    items: RagRerankedChunk[];
    observation: RagRetrievalObservation;
}

export async function searchRagJuridico(input: RagSearchInput): Promise<RagSearchResult> {
    const topK = Math.max(1, Math.min(input.topK ?? 6, 12));
    const startedAtMs = Date.now();
    const queryEmbedding = await embedQuery(input.query);
    const rawCandidates = await similaritySearchRagChunks({
        escritorioId: input.escritorioId,
        embedding: queryEmbedding,
        topK: Math.max(topK * 2, 8),
        tribunal: input.tribunal ?? null,
        area: input.area ?? null,
    });

    const reranked = rerankRagCandidates(rawCandidates, {
        query: input.query,
        tribunal: input.tribunal ?? null,
        area: input.area ?? null,
        referenceDate: input.referenceDate ?? null,
    }).slice(0, topK);

    const observation = buildRetrievalObservation({
        query: input.query,
        topK,
        rawCandidateCount: rawCandidates.length,
        selectedCandidates: reranked,
        startedAtMs,
        endedAtMs: Date.now(),
    });

    try {
        await logRagRetrievalObservation(input.escritorioId, observation, {
            tribunal: input.tribunal ?? null,
            area: input.area ?? null,
            rawTopIds: rawCandidates.slice(0, topK).map((item) => item.id),
        });
    } catch (error) {
        console.warn("[rag-juridico] Falha ao registrar observabilidade da consulta:", error);
    }

    return {
        items: reranked,
        observation,
    };
}
