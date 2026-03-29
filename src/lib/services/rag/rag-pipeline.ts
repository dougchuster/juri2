import { searchRagJuridico, type RagSearchInput } from "@/lib/services/rag/retrieval-service";

export function buildRagContextBlock(items: Array<{
    titulo: string;
    tribunal: string | null;
    area: string | null;
    dataReferencia: string | null;
    originId?: string | null;
    metadata?: Record<string, unknown> | null;
    texto: string;
    rerankScore: number;
}>) {
    if (items.length === 0) {
        return "Nenhum precedente relevante foi recuperado na base juridica.";
    }

    return items
        .map((item, index) => {
            const header = [
                `[${index + 1}] ${item.titulo}`,
                item.tribunal ? `Tribunal: ${item.tribunal}` : null,
                item.area ? `Area: ${item.area}` : null,
                item.dataReferencia ? `Data: ${item.dataReferencia.slice(0, 10)}` : null,
                typeof item.metadata?.identificador === "string"
                    ? `Ref: ${item.metadata.identificador}`
                    : item.originId
                    ? `Origem: ${item.originId}`
                    : null,
                `Score: ${item.rerankScore.toFixed(3)}`,
            ]
                .filter(Boolean)
                .join(" | ");

            return `${header}\nTrecho: ${item.texto}`;
        })
        .join("\n\n");
}

export async function retrieveRagContext(input: RagSearchInput) {
    const result = await searchRagJuridico(input);

    return {
        ...result,
        contextBlock: buildRagContextBlock(result.items),
    };
}
