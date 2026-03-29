import "dotenv/config";
import assert from "node:assert/strict";

import { db } from "@/lib/db";
import { isRagEmbeddingConfigured } from "@/lib/services/rag/embedding-service";
import { ingestPublicacoesForRag } from "@/lib/services/rag/ingestion-service";
import { retrieveRagContext } from "@/lib/services/rag/rag-pipeline";
import {
    detectRagSchemaStatus,
    getRagCorpusStats,
} from "@/lib/services/rag/vector-store";

function buildQueryFromText(text: string) {
    const tokens = text
        .toLowerCase()
        .replace(/[^a-z0-9à-ÿ\s]/gi, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 5);

    return Array.from(new Set(tokens)).slice(0, 8).join(" ");
}

async function main() {
    assert.ok(isRagEmbeddingConfigured(), "GEMINI_API_KEY nao configurada para o smoke do RAG juridico.");

    const schema = await detectRagSchemaStatus();
    assert.ok(schema.ready, "Schema do RAG juridico nao esta pronto. Aplique a migracao da Fase 9.");

    const tenant = await db.processo.findFirst({
        where: {
            escritorioId: { not: null },
            publicacoes: { some: {} },
        },
        select: {
            escritorioId: true,
            publicacoes: {
                take: 1,
                orderBy: [{ dataPublicacao: "desc" }, { importadaEm: "desc" }],
                select: {
                    conteudo: true,
                    tribunal: true,
                },
            },
        },
    });

    assert.ok(tenant?.escritorioId, "Nenhum escritorio com publicacoes elegiveis foi encontrado para o smoke do RAG.");
    const sample = tenant.publicacoes[0];
    assert.ok(sample?.conteudo, "Nao foi possivel localizar publicacao de amostra para o smoke do RAG.");

    const ingestion = await ingestPublicacoesForRag({
        escritorioId: tenant.escritorioId,
        limit: 3,
        tribunal: sample.tribunal,
    });

    const query = buildQueryFromText(sample.conteudo);
    assert.ok(query.length >= 10, "Nao foi possivel derivar uma query valida da publicacao de amostra.");

    const result = await retrieveRagContext({
        escritorioId: tenant.escritorioId,
        query,
        tribunal: sample.tribunal,
        topK: 3,
        referenceDate: new Date(),
    });

    assert.ok(result.items.length > 0, "A consulta semantica nao retornou resultados.");

    const stats = await getRagCorpusStats(tenant.escritorioId);

    console.log(
        JSON.stringify(
            {
                schema,
                ingestion,
                query,
                resultTopIds: result.items.map((item) => item.id),
                stats,
            },
            null,
            2
        )
    );
}

void main()
    .then(() => {
        console.log("test-rag-juridico-db: ok");
        void db.$disconnect();
    })
    .catch((error) => {
        console.error("test-rag-juridico-db: fail", error);
        void db.$disconnect();
        process.exitCode = 1;
    });
