import "dotenv/config";

import {
    ANDAMENTO_TRADUCAO_METADATA_KEY,
    ANDAMENTO_TRADUCAO_VERSAO,
    readAndamentoTraducaoFromMetadata,
    traduzirAndamentoHeuristico,
} from "@/lib/services/andamento-tradutor";

async function main() {
    const descricaoPositiva = "Sentenca de procedencia com deferimento do pedido principal.";
    const traducaoPositiva = traduzirAndamentoHeuristico(descricaoPositiva);

    if (traducaoPositiva.tom !== "positivo") {
        throw new Error(`Tom positivo esperado, recebido: ${traducaoPositiva.tom}`);
    }

    const descricaoNegativa = "Pedido indeferido e recurso rejeitado pelo juizo.";
    const traducaoNegativa = traduzirAndamentoHeuristico(descricaoNegativa);

    if (traducaoNegativa.tom !== "negativo") {
        throw new Error(`Tom negativo esperado, recebido: ${traducaoNegativa.tom}`);
    }

    const metadata = {
        [ANDAMENTO_TRADUCAO_METADATA_KEY]: {
            ...traducaoPositiva,
            versao: ANDAMENTO_TRADUCAO_VERSAO,
        },
    };

    const lida = readAndamentoTraducaoFromMetadata(metadata, descricaoPositiva);
    if (!lida) {
        throw new Error("A traducao cacheada deveria ser recuperada.");
    }

    const invalida = readAndamentoTraducaoFromMetadata(metadata, "Descricao alterada");
    if (invalida) {
        throw new Error("A traducao deveria invalidar quando a descricao muda.");
    }

    console.log("test-andamento-tradutor: ok");
}

main().catch((error) => {
    console.error("test-andamento-tradutor: failed");
    console.error(error);
    process.exit(1);
});
