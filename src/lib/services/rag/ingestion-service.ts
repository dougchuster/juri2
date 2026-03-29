import { createHash } from "node:crypto";

import { db } from "@/lib/db";
import { embedTexts } from "@/lib/services/rag/embedding-service";
import {
    chunkRagDocument,
    inferLegalAreaFromText,
    normalizeRagText,
} from "@/lib/services/rag/rag-core";
import {
    findRagSourceByOrigin,
    upsertRagSourceWithChunks,
} from "@/lib/services/rag/vector-store";

interface IngestPublicacoesInput {
    escritorioId: string;
    limit?: number;
    tribunal?: string | null;
    since?: string | Date | null;
}

export interface RagIngestionResult {
    scanned: number;
    imported: number;
    skipped: number;
    chunksInserted: number;
}

function normalizeSince(value: string | Date | null | undefined) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function buildPublicationTitle(publicacao: {
    tribunal: string;
    processoNumero: string | null;
    identificador: string | null;
}) {
    const fragments = [publicacao.tribunal, publicacao.processoNumero, publicacao.identificador].filter(Boolean);
    return fragments.length > 0 ? fragments.join(" - ") : "Publicacao judicial";
}

function buildContentHash(payload: string) {
    return createHash("sha256").update(payload).digest("hex");
}

export async function ingestPublicacoesForRag(
    input: IngestPublicacoesInput
): Promise<RagIngestionResult> {
    const publicacoes = await db.publicacao.findMany({
        where: {
            OR: [
                {
                    processo: {
                        escritorioId: input.escritorioId,
                    },
                },
                {
                    advogado: {
                        user: {
                            escritorioId: input.escritorioId,
                        },
                    },
                },
            ],
            ...(input.tribunal ? { tribunal: input.tribunal } : {}),
            ...(normalizeSince(input.since)
                ? {
                      dataPublicacao: {
                          gte: normalizeSince(input.since)!,
                      },
                  }
                : {}),
        },
        orderBy: [{ dataPublicacao: "desc" }, { importadaEm: "desc" }],
        take: input.limit ?? 50,
        select: {
            id: true,
            tribunal: true,
            dataPublicacao: true,
            conteudo: true,
            identificador: true,
            processoNumero: true,
        },
    });

    const summary: RagIngestionResult = {
        scanned: publicacoes.length,
        imported: 0,
        skipped: 0,
        chunksInserted: 0,
    };

    for (const publicacao of publicacoes) {
        const textoIntegral = normalizeRagText(publicacao.conteudo);
        if (!textoIntegral) {
            summary.skipped += 1;
            continue;
        }

        const titulo = buildPublicationTitle(publicacao);
        const area = inferLegalAreaFromText(`${titulo}\n${textoIntegral}`);
        const hashConteudo = buildContentHash(
            JSON.stringify({
                tribunal: publicacao.tribunal,
                dataPublicacao: publicacao.dataPublicacao.toISOString(),
                identificador: publicacao.identificador,
                processoNumero: publicacao.processoNumero,
                textoIntegral,
            })
        );

        const current = await findRagSourceByOrigin(input.escritorioId, "PUBLICACAO", publicacao.id);
        if (current?.hashConteudo === hashConteudo) {
            summary.skipped += 1;
            continue;
        }

        const chunks = chunkRagDocument({
            sourceId: publicacao.id,
            titulo,
            texto: textoIntegral,
            tribunal: publicacao.tribunal,
            area,
            dataReferencia: publicacao.dataPublicacao,
        });

        if (chunks.length === 0) {
            summary.skipped += 1;
            continue;
        }

        const embeddings = await embedTexts(
            chunks.map((chunk) => chunk.texto),
            {
                taskType: "RETRIEVAL_DOCUMENT",
                title: titulo,
            }
        );

        await upsertRagSourceWithChunks({
            escritorioId: input.escritorioId,
            originType: "PUBLICACAO",
            originId: publicacao.id,
            titulo,
            tribunal: publicacao.tribunal,
            area,
            dataReferencia: publicacao.dataPublicacao,
            ementa: textoIntegral.slice(0, 500),
            textoIntegral,
            hashConteudo,
            metadados: {
                identificador: publicacao.identificador,
                processoNumero: publicacao.processoNumero,
            },
            chunks: chunks.map((chunk, index) => ({
                chunkIndex: chunk.chunkIndex,
                texto: chunk.texto,
                tokensEstimados: chunk.tokensEstimados,
                embedding: embeddings[index] ?? [],
            })),
        });

        summary.imported += 1;
        summary.chunksInserted += chunks.length;
    }

    return summary;
}
