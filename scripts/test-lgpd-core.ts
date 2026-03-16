import assert from "node:assert/strict";
import {
    formatLgpdConsentActionLabel,
    formatLgpdRequestStatusLabel,
    formatLgpdRequestTypeLabel,
    getLgpdAllowedNextStatuses,
    summarizeLgpdRequests,
} from "@/lib/services/lgpd-core";

function main() {
    const summary = summarizeLgpdRequests([
        { status: "ABERTA" },
        { status: "EM_ANALISE" },
        { status: "EM_ATENDIMENTO" },
        { status: "EM_ATENDIMENTO" },
        { status: "CONCLUIDA" },
        { status: "CANCELADA" },
    ]);

    assert.deepEqual(summary, {
        total: 6,
        abertas: 1,
        emAnalise: 1,
        emAtendimento: 2,
        concluidas: 1,
        canceladas: 1,
    });

    assert.deepEqual(getLgpdAllowedNextStatuses("ABERTA"), ["EM_ANALISE", "CANCELADA"]);
    assert.deepEqual(getLgpdAllowedNextStatuses("EM_ATENDIMENTO"), ["CONCLUIDA", "CANCELADA"]);
    assert.deepEqual(getLgpdAllowedNextStatuses("CONCLUIDA"), []);

    assert.equal(formatLgpdRequestTypeLabel("REVOGACAO_CONSENTIMENTO"), "Revogacao de consentimento");
    assert.equal(formatLgpdRequestStatusLabel("EM_ANALISE"), "Em analise");
    assert.equal(formatLgpdConsentActionLabel("CONSENTIMENTO"), "Consentimento");

    console.log("test-lgpd-core: ok");
}

main();
