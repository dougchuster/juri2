import { GoogleGenAI } from "@google/genai";

export const RAG_EMBEDDING_MODEL = "gemini-embedding-001";
export const RAG_EMBEDDING_DIMENSION = 768;

type RagEmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

interface EmbedTextsOptions {
    taskType?: RagEmbeddingTaskType;
    title?: string;
    outputDimensionality?: number;
}

function readGeminiApiKey() {
    return (process.env.GEMINI_API_KEY || "").trim();
}

function getEmbeddingClient() {
    const apiKey = readGeminiApiKey();
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY nao configurada para embeddings juridicos.");
    }

    return new GoogleGenAI({ apiKey });
}

function normalizeEmbedding(values: number[] | undefined, expectedLength: number) {
    if (!Array.isArray(values) || values.length === 0) {
        throw new Error("Embedding juridico retornou vazio.");
    }

    if (values.length !== expectedLength) {
        throw new Error(
            `Embedding juridico retornou dimensao inesperada: ${values.length}. Esperado: ${expectedLength}.`
        );
    }

    return values.map((value) => {
        if (!Number.isFinite(value)) {
            throw new Error("Embedding juridico contem valores invalidos.");
        }

        return Number(value);
    });
}

export function isRagEmbeddingConfigured() {
    return readGeminiApiKey().length > 0;
}

export async function embedTexts(
    texts: string[],
    options: EmbedTextsOptions = {}
) {
    if (texts.length === 0) return [];

    const client = getEmbeddingClient();
    const outputDimensionality = options.outputDimensionality ?? RAG_EMBEDDING_DIMENSION;
    const response = await client.models.embedContent({
        model: RAG_EMBEDDING_MODEL,
        contents: texts,
        config: {
            taskType: options.taskType ?? "RETRIEVAL_DOCUMENT",
            title: options.title,
            outputDimensionality,
        },
    });

    const embeddings = response.embeddings?.map((item) => normalizeEmbedding(item.values, outputDimensionality)) ?? [];

    if (embeddings.length !== texts.length) {
        throw new Error(
            `Quantidade de embeddings divergente do lote enviado. Recebido: ${embeddings.length}. Esperado: ${texts.length}.`
        );
    }

    return embeddings;
}

export async function embedQuery(text: string) {
    const [embedding] = await embedTexts([text], { taskType: "RETRIEVAL_QUERY" });
    if (!embedding) {
        throw new Error("Nao foi possivel gerar embedding para a consulta juridica.");
    }

    return embedding;
}
