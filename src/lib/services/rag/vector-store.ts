import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";

import type {
    RagRetrievedChunk,
    RagRetrievalObservation,
} from "@/lib/services/rag/rag-core";

export interface RagSchemaStatus {
    hasVectorExtension: boolean;
    hasVectorColumn: boolean;
    hasSourcesTable: boolean;
    hasChunksTable: boolean;
    hasQueriesTable: boolean;
    ready: boolean;
}

export interface RagStoredChunkInput {
    chunkIndex: number;
    texto: string;
    tokensEstimados: number;
    embedding: number[];
}

export interface RagSourceSnapshot {
    id: string;
    hashConteudo: string;
}

export interface RagUpsertSourceInput {
    escritorioId: string;
    originType: string;
    originId: string;
    titulo: string;
    tribunal?: string | null;
    area?: string | null;
    dataReferencia?: string | Date | null;
    ementa?: string | null;
    textoIntegral: string;
    hashConteudo: string;
    metadados?: Record<string, unknown> | null;
    chunks: RagStoredChunkInput[];
}

export interface RagSimilaritySearchInput {
    escritorioId: string;
    embedding: number[];
    topK: number;
    tribunal?: string | null;
    area?: string | null;
}

export interface RagCorpusStats {
    sourceCount: number;
    chunkCount: number;
    queryCount: number;
    latestSourceAt: string | null;
    latestQueryAt: string | null;
}

function normalizeDate(value: string | Date | null | undefined) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function serializeVector(values: number[]) {
    if (values.length === 0) {
        throw new Error("Nao e possivel consultar o vetor juridico com embedding vazio.");
    }

    return `[${values
        .map((value) => {
            if (!Number.isFinite(value)) {
                throw new Error("Embedding juridico contem valor invalido.");
            }

            return Number(value).toString();
        })
        .join(",")}]`;
}

function parseEmbeddingJson(value: unknown) {
    if (!Array.isArray(value)) return [];

    return value
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item));
}

function cosineSimilarity(left: number[], right: number[]) {
    if (left.length === 0 || right.length === 0 || left.length !== right.length) return 0;

    let dot = 0;
    let normLeft = 0;
    let normRight = 0;

    for (let index = 0; index < left.length; index += 1) {
        const leftValue = left[index] ?? 0;
        const rightValue = right[index] ?? 0;

        dot += leftValue * rightValue;
        normLeft += leftValue * leftValue;
        normRight += rightValue * rightValue;
    }

    if (normLeft === 0 || normRight === 0) return 0;

    return dot / (Math.sqrt(normLeft) * Math.sqrt(normRight));
}

export async function detectRagSchemaStatus(): Promise<RagSchemaStatus> {
    const [tableRows, extensionRows, columnRows] = await Promise.all([
        db.$queryRaw<Array<{ table_name: string }>>`
        select table_name
        from information_schema.tables
        where table_schema = 'public'
          and table_name in ('rag_juridico_fontes', 'rag_juridico_chunks', 'rag_juridico_consultas')
    `,
        db.$queryRaw<Array<{ extname: string }>>`
        select extname
        from pg_extension
        where extname = 'vector'
    `,
        db.$queryRaw<Array<{ column_name: string }>>`
        select column_name
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'rag_juridico_chunks'
          and column_name in ('embedding_json', 'embedding_vector')
    `,
    ]);

    const tables = new Set(tableRows.map((row) => row.table_name));
    const columns = new Set(columnRows.map((row) => row.column_name));
    const hasVectorExtension = extensionRows.length > 0;
    const hasVectorColumn = columns.has("embedding_vector");
    const hasSourcesTable = tables.has("rag_juridico_fontes");
    const hasChunksTable = tables.has("rag_juridico_chunks");
    const hasQueriesTable = tables.has("rag_juridico_consultas");

    return {
        hasVectorExtension,
        hasVectorColumn,
        hasSourcesTable,
        hasChunksTable,
        hasQueriesTable,
        ready: hasSourcesTable && hasChunksTable && hasQueriesTable && columns.has("embedding_json"),
    };
}

export async function ensureRagSchemaReady() {
    const status = await detectRagSchemaStatus();
    if (!status.ready) {
        throw new Error(
            "Schema do RAG juridico indisponivel. Execute a migracao da Fase 9 antes de usar ingestao ou retrieval."
        );
    }

    return status;
}

export async function findRagSourceByOrigin(escritorioId: string, originType: string, originId: string) {
    await ensureRagSchemaReady();

    const rows = await db.$queryRaw<Array<{ id: string; hashConteudo: string }>>`
        select id, hash_conteudo as "hashConteudo"
        from rag_juridico_fontes
        where escritorio_id = ${escritorioId}
          and origem_tipo = ${originType}
          and origem_id = ${originId}
        limit 1
    `;

    return rows[0] ?? null;
}

export async function upsertRagSourceWithChunks(input: RagUpsertSourceInput) {
    const schema = await ensureRagSchemaReady();

    return db.$transaction(async (tx) => {
        const upserted = await tx.$queryRaw<Array<{ id: string }>>`
            insert into rag_juridico_fontes (
                id,
                escritorio_id,
                origem_tipo,
                origem_id,
                titulo,
                tribunal,
                area,
                data_referencia,
                ementa,
                texto_integral,
                hash_conteudo,
                metadados,
                updated_at
            )
            values (
                ${randomUUID()},
                ${input.escritorioId},
                ${input.originType},
                ${input.originId},
                ${input.titulo},
                ${input.tribunal ?? null},
                ${input.area ?? null},
                ${normalizeDate(input.dataReferencia)},
                ${input.ementa ?? null},
                ${input.textoIntegral},
                ${input.hashConteudo},
                ${JSON.stringify(input.metadados ?? {})}::jsonb,
                now()
            )
            on conflict (escritorio_id, origem_tipo, origem_id) do update set
                escritorio_id = excluded.escritorio_id,
                titulo = excluded.titulo,
                tribunal = excluded.tribunal,
                area = excluded.area,
                data_referencia = excluded.data_referencia,
                ementa = excluded.ementa,
                texto_integral = excluded.texto_integral,
                hash_conteudo = excluded.hash_conteudo,
                metadados = excluded.metadados,
                updated_at = now()
            returning id
        `;

        const sourceId = upserted[0]?.id;
        if (!sourceId) {
            throw new Error("Falha ao persistir a fonte do RAG juridico.");
        }

        await tx.$executeRaw`
            delete from rag_juridico_chunks
            where fonte_id = ${sourceId}
        `;

        for (const chunk of input.chunks) {
            const vectorLiteral = serializeVector(chunk.embedding);
            const embeddingJson = JSON.stringify(chunk.embedding);

            if (schema.hasVectorExtension && schema.hasVectorColumn) {
                await tx.$executeRawUnsafe(
                    `
                        insert into rag_juridico_chunks (
                            id,
                            fonte_id,
                            chunk_index,
                            texto,
                            tokens_estimados,
                            embedding_json,
                            embedding_vector
                        )
                        values ($1, $2, $3, $4, $5, $6::jsonb, $7::vector)
                    `,
                    randomUUID(),
                    sourceId,
                    chunk.chunkIndex,
                    chunk.texto,
                    chunk.tokensEstimados,
                    embeddingJson,
                    vectorLiteral
                );
            } else {
                await tx.$executeRawUnsafe(
                    `
                        insert into rag_juridico_chunks (
                            id,
                            fonte_id,
                            chunk_index,
                            texto,
                            tokens_estimados,
                            embedding_json
                        )
                        values ($1, $2, $3, $4, $5, $6::jsonb)
                    `,
                    randomUUID(),
                    sourceId,
                    chunk.chunkIndex,
                    chunk.texto,
                    chunk.tokensEstimados,
                    embeddingJson
                );
            }
        }

        return {
            sourceId,
            chunkCount: input.chunks.length,
        };
    });
}

export async function similaritySearchRagChunks(
    input: RagSimilaritySearchInput
): Promise<RagRetrievedChunk[]> {
    const schema = await ensureRagSchemaReady();

    if (schema.hasVectorExtension && schema.hasVectorColumn) {
        const vectorLiteral = serializeVector(input.embedding);
        const rows = await db.$queryRawUnsafe<
            Array<{
                id: string;
                sourceId: string;
                chunkIndex: number;
                titulo: string;
                texto: string;
                originType: string;
                originId: string;
                tribunal: string | null;
                area: string | null;
                dataReferencia: Date | null;
                ementa: string | null;
                metadata: Record<string, unknown> | null;
                semanticScore: number;
            }>
        >(
            `
                select
                    c.id,
                    c.fonte_id as "sourceId",
                    c.chunk_index as "chunkIndex",
                    f.titulo,
                    c.texto,
                    f.origem_tipo as "originType",
                    f.origem_id as "originId",
                    f.tribunal,
                    f.area,
                    f.data_referencia as "dataReferencia",
                    f.ementa,
                    f.metadados as "metadata",
                    1 - (c.embedding_vector <=> $1::vector) as "semanticScore"
                from rag_juridico_chunks c
                inner join rag_juridico_fontes f on f.id = c.fonte_id
                where f.escritorio_id = $2
                  and ($3::text is null or f.tribunal = $3)
                  and ($4::text is null or f.area = $4)
                order by c.embedding_vector <=> $1::vector asc
                limit $5
            `,
            vectorLiteral,
            input.escritorioId,
            input.tribunal ?? null,
            input.area ?? null,
            input.topK
        );

        return rows.map((row) => ({
            id: row.id,
            sourceId: row.sourceId,
            chunkIndex: Number(row.chunkIndex),
            titulo: row.titulo,
            texto: row.texto,
            originType: row.originType,
            originId: row.originId,
            tribunal: row.tribunal,
            area: row.area,
            dataReferencia: normalizeDate(row.dataReferencia),
            ementa: row.ementa,
            metadata: row.metadata,
            semanticScore: Number(row.semanticScore),
        }));
    }

    const rows = await db.$queryRaw<
        Array<{
            id: string;
            sourceId: string;
            chunkIndex: number;
            titulo: string;
            texto: string;
            originType: string;
            originId: string;
            tribunal: string | null;
            area: string | null;
            dataReferencia: Date | null;
            ementa: string | null;
            metadata: Record<string, unknown> | null;
            embeddingJson: unknown;
        }>
    >`
        select
            c.id,
            c.fonte_id as "sourceId",
            c.chunk_index as "chunkIndex",
            f.titulo,
            c.texto,
            f.origem_tipo as "originType",
            f.origem_id as "originId",
            f.tribunal,
            f.area,
            f.data_referencia as "dataReferencia",
            f.ementa,
            f.metadados as "metadata",
            c.embedding_json as "embeddingJson"
        from rag_juridico_chunks c
        inner join rag_juridico_fontes f on f.id = c.fonte_id
        where f.escritorio_id = ${input.escritorioId}
          and (${input.tribunal ?? null}::text is null or f.tribunal = ${input.tribunal ?? null})
          and (${input.area ?? null}::text is null or f.area = ${input.area ?? null})
        order by f.data_referencia desc nulls last, c.created_at desc
        limit ${Math.max(input.topK * 20, 80)}
    `;

    return rows
        .map((row) => ({
            id: row.id,
            sourceId: row.sourceId,
            chunkIndex: Number(row.chunkIndex),
            titulo: row.titulo,
            texto: row.texto,
            originType: row.originType,
            originId: row.originId,
            tribunal: row.tribunal,
            area: row.area,
            dataReferencia: normalizeDate(row.dataReferencia),
            ementa: row.ementa,
            metadata: row.metadata,
            semanticScore: Number(cosineSimilarity(parseEmbeddingJson(row.embeddingJson), input.embedding).toFixed(6)),
        }))
        .sort((left, right) => right.semanticScore - left.semanticScore)
        .slice(0, input.topK);
}

export async function logRagRetrievalObservation(
    escritorioId: string,
    observation: RagRetrievalObservation,
    metadata?: {
        tribunal?: string | null;
        area?: string | null;
        rawTopIds?: string[];
    }
) {
    await ensureRagSchemaReady();

    await db.$executeRaw`
        insert into rag_juridico_consultas (
            id,
            escritorio_id,
            query_text,
            query_hash,
            tribunal,
            area,
            top_k,
            hit_count,
            latency_ms,
            resultado_ids,
            metadados
        )
        values (
            ${randomUUID()},
            ${escritorioId},
            ${observation.query},
            md5(${observation.query}),
            ${metadata?.tribunal ?? null},
            ${metadata?.area ?? null},
            ${observation.topK},
            ${observation.selectedCount},
            ${observation.latencyMs},
            ${observation.selectedIds},
            ${JSON.stringify({
                rawCandidateCount: observation.rawCandidateCount,
                rawTopIds: metadata?.rawTopIds ?? [],
            })}::jsonb
        )
    `;
}

export async function getRagCorpusStats(escritorioId: string): Promise<RagCorpusStats> {
    await ensureRagSchemaReady();

    const [sourceRows, queryRows] = await Promise.all([
        db.$queryRaw<
            Array<{
                sourceCount: number;
                chunkCount: number;
                latestSourceAt: Date | null;
            }>
        >`
            select
                count(distinct f.id)::int as "sourceCount",
                count(c.id)::int as "chunkCount",
                max(f.updated_at) as "latestSourceAt"
            from rag_juridico_fontes f
            left join rag_juridico_chunks c on c.fonte_id = f.id
            where f.escritorio_id = ${escritorioId}
        `,
        db.$queryRaw<
            Array<{
                queryCount: number;
                latestQueryAt: Date | null;
            }>
        >`
            select
                count(*)::int as "queryCount",
                max(created_at) as "latestQueryAt"
            from rag_juridico_consultas
            where escritorio_id = ${escritorioId}
        `,
    ]);

    const source = sourceRows[0];
    const query = queryRows[0];

    return {
        sourceCount: source?.sourceCount ?? 0,
        chunkCount: source?.chunkCount ?? 0,
        queryCount: query?.queryCount ?? 0,
        latestSourceAt: normalizeDate(source?.latestSourceAt ?? null),
        latestQueryAt: normalizeDate(query?.latestQueryAt ?? null),
    };
}
