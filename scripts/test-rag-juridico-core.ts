import assert from "node:assert/strict";

import {
    buildRetrievalObservation,
    chunkRagDocument,
    rerankRagCandidates,
} from "@/lib/services/rag/rag-core";

const textoLongo = [
    "Ementa. Responsabilidade civil contratual. Instituicao financeira.",
    "A parte autora alega descontos indevidos e requer indenizacao por danos materiais e morais.",
    "O tribunal reconheceu a falha na prestacao do servico e determinou a devolucao em dobro dos valores cobrados.",
    "Tambem fixou compensacao por danos morais diante da reiteracao das cobrancas e da ausencia de solucao administrativa.",
].join(" ");

const chunks = chunkRagDocument({
    sourceId: "pub-1",
    titulo: "STJ - descontos indevidos em conta corrente",
    texto: textoLongo,
    tribunal: "STJ",
    area: "CIVEL",
    dataReferencia: "2026-03-20T00:00:00.000Z",
    maxChars: 140,
    overlapChars: 30,
});

assert.equal(chunks.length, 4, "o chunker deve dividir textos longos em blocos reutilizaveis");
assert.equal(chunks[0]?.chunkIndex, 0, "o primeiro chunk deve iniciar no indice zero");
assert.equal(chunks[1]?.sourceId, "pub-1", "cada chunk deve manter a referencia da fonte");
assert.ok(
    chunks[1]?.texto.startsWith("requer indenizacao"),
    "o overlap deve reaproveitar parte do contexto ao abrir o chunk seguinte"
);
assert.ok(
    chunks[1]?.texto.toLowerCase().includes("indenizacao"),
    "o overlap nao pode eliminar o contexto juridico relevante"
);

const reranked = rerankRagCandidates(
    [
        {
            id: "cand-1",
            sourceId: "pub-1",
            chunkIndex: 0,
            titulo: "STJ - descontos indevidos em conta corrente",
            texto: "Descontos indevidos em conta corrente com devolucao em dobro e danos morais.",
            tribunal: "STJ",
            area: "CIVEL",
            dataReferencia: "2026-03-20T00:00:00.000Z",
            semanticScore: 0.78,
        },
        {
            id: "cand-2",
            sourceId: "pub-2",
            chunkIndex: 0,
            titulo: "TJSP - atraso na entrega de imovel",
            texto: "Atraso na entrega de imovel e lucros cessantes em contrato de promessa de compra e venda.",
            tribunal: "TJSP",
            area: "CIVEL",
            dataReferencia: "2025-09-14T00:00:00.000Z",
            semanticScore: 0.81,
        },
        {
            id: "cand-3",
            sourceId: "pub-3",
            chunkIndex: 0,
            titulo: "STJ - materia tributaria",
            texto: "Discussao sobre creditos de PIS e COFINS em operacoes de revenda.",
            tribunal: "STJ",
            area: "TRIBUTARIO",
            dataReferencia: "2026-03-10T00:00:00.000Z",
            semanticScore: 0.79,
        },
    ],
    {
        query: "descontos indevidos conta corrente danos morais",
        tribunal: "STJ",
        area: "CIVEL",
        referenceDate: "2026-03-29T00:00:00.000Z",
    }
);

assert.equal(
    reranked[0]?.id,
    "cand-1",
    "o reranque deve priorizar a combinacao de similaridade, tribunal, area e recencia"
);
assert.ok(
    (reranked[0]?.rerankScore ?? 0) > (reranked[1]?.rerankScore ?? 0),
    "o score final precisa refletir a relevancia juridica contextual"
);
assert.ok(
    reranked[0]?.matchReasons.includes("tribunal"),
    "o candidato vencedor deve registrar os fatores que justificam a priorizacao"
);

const observacao = buildRetrievalObservation({
    query: "descontos indevidos conta corrente danos morais",
    topK: 6,
    rawCandidateCount: 3,
    selectedCandidates: reranked.slice(0, 2),
    startedAtMs: 1000,
    endedAtMs: 1148,
});

assert.equal(observacao.latencyMs, 148, "a observabilidade deve registrar a latencia da consulta");
assert.equal(observacao.selectedCount, 2, "a observabilidade deve registrar quantos itens seguiram para o contexto");
assert.deepEqual(
    observacao.selectedIds,
    ["cand-1", "cand-2"],
    "a observabilidade deve preservar os ids finais para auditoria e cache"
);

console.log("test-rag-juridico-core: ok");
