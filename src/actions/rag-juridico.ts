"use server";

import { z } from "zod";

import { getSession } from "@/actions/auth";
import {
    LEGAL_RAG_DISABLED_MESSAGE,
    isRagJuridicoEnabled,
} from "@/lib/runtime-features";
import { getEscritorioId } from "@/lib/tenant";
import { ingestPublicacoesForRag } from "@/lib/services/rag/ingestion-service";
import { retrieveRagContext } from "@/lib/services/rag/rag-pipeline";
import {
    detectRagSchemaStatus,
    getRagCorpusStats,
} from "@/lib/services/rag/vector-store";
import { isRagEmbeddingConfigured } from "@/lib/services/rag/embedding-service";

const MANAGE_ROLES = new Set(["ADMIN", "SOCIO", "CONTROLADOR"]);

const searchSchema = z.object({
    query: z.string().min(3).max(1000),
    tribunal: z.string().max(32).optional().nullable(),
    area: z.string().max(32).optional().nullable(),
    topK: z.coerce.number().int().min(1).max(12).optional(),
});

const ingestionSchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
    tribunal: z.string().max(32).optional().nullable(),
    since: z.string().datetime().optional().nullable(),
});

function mapRagItem(item: Awaited<ReturnType<typeof retrieveRagContext>>["items"][number]) {
    return {
        id: item.id,
        titulo: item.titulo,
        tribunal: item.tribunal,
        area: item.area,
        dataReferencia: item.dataReferencia,
        texto: item.texto,
        ementa: item.ementa ?? null,
        rerankScore: item.rerankScore,
        semanticScore: item.semanticScore,
        matchReasons: item.matchReasons,
        originType: item.originType ?? null,
        originId: item.originId ?? null,
        metadata: item.metadata ?? null,
    };
}

async function requireAuthenticatedUser() {
    const session = await getSession();
    if (!session) {
        return { ok: false as const, error: "Nao autenticado." };
    }

    if (!session.escritorioId) {
        return { ok: false as const, error: "Usuario sem escritorio vinculado." };
    }

    return { ok: true as const, session };
}

async function requireRagManager() {
    const auth = await requireAuthenticatedUser();
    if (!auth.ok) return auth;

    if (!MANAGE_ROLES.has(String(auth.session.role))) {
        return { ok: false as const, error: "Acesso negado para ingestao do RAG juridico." };
    }

    return auth;
}

function getDisabledResult() {
    return { success: false as const, error: LEGAL_RAG_DISABLED_MESSAGE };
}

export async function getRagJuridicoStatusAction() {
    if (!isRagJuridicoEnabled()) {
        return getDisabledResult();
    }

    const auth = await requireAuthenticatedUser();
    if (!auth.ok) {
        return { success: false as const, error: auth.error };
    }

    try {
        const escritorioId = await getEscritorioId();
        const [schema, stats] = await Promise.all([
            detectRagSchemaStatus(),
            getRagCorpusStats(escritorioId),
        ]);

        return {
            success: true as const,
            data: {
                schema,
                stats,
                embeddingConfigured: isRagEmbeddingConfigured(),
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao carregar status do RAG juridico.";
        return { success: false as const, error: message };
    }
}

export async function buscarRagJuridicoAction(input: unknown) {
    if (!isRagJuridicoEnabled()) {
        return getDisabledResult();
    }

    const auth = await requireAuthenticatedUser();
    if (!auth.ok) {
        return { success: false as const, error: auth.error };
    }

    const parsed = searchSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false as const, error: "Entrada invalida para consulta juridica." };
    }

    try {
        const escritorioId = await getEscritorioId();
        const result = await retrieveRagContext({
            escritorioId,
            query: parsed.data.query,
            tribunal: parsed.data.tribunal ?? null,
            area: parsed.data.area ?? null,
            topK: parsed.data.topK,
            referenceDate: new Date(),
        });

        return {
            success: true as const,
            data: {
                items: result.items.map(mapRagItem),
                contextBlock: result.contextBlock,
                observation: result.observation,
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao consultar o RAG juridico.";
        return { success: false as const, error: message };
    }
}

export async function ingestRagJuridicoAction(input: unknown) {
    if (!isRagJuridicoEnabled()) {
        return getDisabledResult();
    }

    const auth = await requireRagManager();
    if (!auth.ok) {
        return { success: false as const, error: auth.error };
    }

    const parsed = ingestionSchema.safeParse(input ?? {});
    if (!parsed.success) {
        return { success: false as const, error: "Entrada invalida para ingestao do RAG juridico." };
    }

    try {
        const escritorioId = await getEscritorioId();
        const result = await ingestPublicacoesForRag({
            escritorioId,
            limit: parsed.data.limit,
            tribunal: parsed.data.tribunal ?? null,
            since: parsed.data.since ?? null,
        });
        const stats = await getRagCorpusStats(escritorioId);

        return {
            success: true as const,
            data: {
                ingestion: result,
                stats,
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao executar ingestao do RAG juridico.";
        return { success: false as const, error: message };
    }
}
