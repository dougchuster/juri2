CREATE TABLE IF NOT EXISTS rag_juridico_fontes (
    id TEXT PRIMARY KEY,
    escritorio_id TEXT NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
    origem_tipo VARCHAR(32) NOT NULL,
    origem_id TEXT NOT NULL,
    titulo TEXT NOT NULL,
    tribunal VARCHAR(32),
    area VARCHAR(32),
    data_referencia TIMESTAMPTZ,
    ementa TEXT,
    texto_integral TEXT NOT NULL,
    hash_conteudo VARCHAR(64) NOT NULL,
    metadados JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT rag_juridico_fontes_origem_unique UNIQUE (escritorio_id, origem_tipo, origem_id)
);

CREATE TABLE IF NOT EXISTS rag_juridico_chunks (
    id TEXT PRIMARY KEY,
    fonte_id TEXT NOT NULL REFERENCES rag_juridico_fontes(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    texto TEXT NOT NULL,
    tokens_estimados INTEGER NOT NULL DEFAULT 0,
    embedding_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT rag_juridico_chunks_unique UNIQUE (fonte_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS rag_juridico_consultas (
    id TEXT PRIMARY KEY,
    escritorio_id TEXT NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    query_hash VARCHAR(64) NOT NULL,
    tribunal VARCHAR(32),
    area VARCHAR(32),
    top_k INTEGER NOT NULL,
    hit_count INTEGER NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    resultado_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    metadados JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rag_juridico_fontes_tribunal_data_idx
    ON rag_juridico_fontes (escritorio_id, tribunal, data_referencia DESC);

CREATE INDEX IF NOT EXISTS rag_juridico_fontes_area_idx
    ON rag_juridico_fontes (escritorio_id, area);

CREATE INDEX IF NOT EXISTS rag_juridico_chunks_fonte_idx
    ON rag_juridico_chunks (fonte_id, chunk_index);

CREATE INDEX IF NOT EXISTS rag_juridico_consultas_created_idx
    ON rag_juridico_consultas (escritorio_id, created_at DESC);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_available_extensions
        WHERE name = 'vector'
    ) THEN
        CREATE EXTENSION IF NOT EXISTS vector;

        ALTER TABLE rag_juridico_chunks
            ADD COLUMN IF NOT EXISTS embedding_vector vector(768);

        CREATE INDEX IF NOT EXISTS rag_juridico_chunks_embedding_hnsw_idx
            ON rag_juridico_chunks
            USING hnsw (embedding_vector vector_cosine_ops);
    END IF;
END $$;
