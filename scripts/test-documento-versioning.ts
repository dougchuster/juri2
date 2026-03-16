import assert from "node:assert/strict";
import {
    buildDocumentoRestoreSummary,
    getDocumentoDeletePolicy,
    getNextDocumentoVersionNumber,
    summarizeDocumentoVersionChanges,
} from "@/lib/services/documento-versioning-core";

async function main() {
    assert.equal(getNextDocumentoVersionNumber(1), 2, "deve incrementar a numeracao da versao");

    const diff = summarizeDocumentoVersionChanges(
        {
            titulo: "Peticao inicial",
            conteudo: "Texto curto.",
            categoriaNome: "Inicial",
            pastaNome: "Cliente A",
            arquivoNome: "peticao-v1.docx",
        },
        {
            titulo: "Peticao inicial revisada",
            conteudo: "Texto curto com ajustes e fundamentacao adicional.",
            categoriaNome: "Revisao",
            pastaNome: "Cliente B",
            arquivoNome: "peticao-v2.docx",
        }
    );

    assert.match(diff, /titulo atualizado/i);
    assert.match(diff, /categoria:/i);
    assert.match(diff, /pasta:/i);
    assert.match(diff, /arquivo vinculado atualizado/i);
    assert.match(diff, /conteudo revisado/i);

    const restoreSummary = buildDocumentoRestoreSummary(3, "Retomar versao aprovada pelo socio");
    assert.match(restoreSummary, /versao 3/i);
    assert.match(restoreSummary, /motivo/i);

    const blockedByPublish = getDocumentoDeletePolicy({
        statusFluxo: "PUBLICADA",
        versionCount: 4,
        hasPublishedVersion: true,
    });
    assert.equal(blockedByPublish.allow, false);
    assert.match(blockedByPublish.reason || "", /publicada/i);

    const blockedByHistory = getDocumentoDeletePolicy({
        statusFluxo: "RASCUNHO",
        versionCount: 2,
        hasPublishedVersion: false,
    });
    assert.equal(blockedByHistory.allow, false);
    assert.match(blockedByHistory.reason || "", /historico/i);

    const allowed = getDocumentoDeletePolicy({
        statusFluxo: "RASCUNHO",
        versionCount: 1,
        hasPublishedVersion: false,
    });
    assert.equal(allowed.allow, true);

    console.log("test-documento-versioning: ok");
}

void main();
