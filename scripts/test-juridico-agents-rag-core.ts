import assert from "node:assert/strict";

import {
    appendAgentReferencesToAnswer,
    buildAgentRagContextBlock,
    buildAgentRagReferences,
    estimateAgentConfidenceScore,
} from "@/lib/services/juridico-agents/rag-support";

const references = buildAgentRagReferences([
    {
        id: "rag-1",
        titulo: "STJ - descontos indevidos em conta corrente",
        tribunal: "STJ",
        area: "CIVEL",
        dataReferencia: "2026-03-20T00:00:00.000Z",
        texto: "Descontos indevidos em conta corrente com devolucao em dobro e danos morais.",
        rerankScore: 0.94,
        semanticScore: 0.83,
        originType: "PUBLICACAO",
        originId: "pub-1",
        metadata: {
            identificador: "AgInt no REsp 123456/DF",
        },
        matchReasons: ["tribunal", "area", "query_overlap"],
    },
    {
        id: "rag-2",
        titulo: "STJ - falha na prestacao de servico bancario",
        tribunal: "STJ",
        area: "CIVEL",
        dataReferencia: "2026-02-11T00:00:00.000Z",
        texto: "Falha na prestacao de servico bancario e dever de indenizar por danos morais.",
        rerankScore: 0.88,
        semanticScore: 0.8,
        originType: "PUBLICACAO",
        originId: "pub-2",
        metadata: {
            identificador: "REsp 654321/SP",
        },
        matchReasons: ["tribunal", "query_overlap"],
    },
]);

assert.equal(references.length, 2, "as referencias devem ser derivadas dos itens do retrieval");
assert.equal(references[0]?.displayLabel, "AgInt no REsp 123456/DF", "o identificador juridico deve priorizar metadata real");

const contextBlock = buildAgentRagContextBlock(references);
assert.ok(contextBlock.includes("Jurisprudencia recuperada"), "o contexto enviado ao agente deve sinalizar claramente o bloco RAG");
assert.ok(contextBlock.includes("AgInt no REsp 123456/DF"), "o contexto deve preservar a citacao real");
assert.ok(contextBlock.includes("Trecho relevante"), "o contexto deve incluir trecho para grounding");

const confidence = estimateAgentConfidenceScore({
    references,
    ragEnabled: true,
    retrievalSelectedCount: 2,
});

assert.ok(confidence >= 0.75, "boa cobertura de retrieval deve elevar a confianca");
assert.ok(confidence <= 0.99, "a confianca precisa permanecer limitada");

const finalAnswer = appendAgentReferencesToAnswer(
    "Com base no contexto do caso, ha precedente favoravel para repeticao do indébito e danos morais.",
    references,
    confidence
);

assert.ok(finalAnswer.includes("Confianca estimada"), "a resposta final deve expor a confianca para o advogado");
assert.ok(finalAnswer.includes("Referencias recuperadas"), "a resposta final deve anexar as referencias reais");
assert.ok(finalAnswer.includes("REsp 654321/SP"), "a resposta final deve listar as citacoes recuperadas");

console.log("test-juridico-agents-rag-core: ok");
