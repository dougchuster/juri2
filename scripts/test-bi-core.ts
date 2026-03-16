import assert from "node:assert/strict";
import {
    BI_METRIC_DEFINITIONS,
    formatBIDimensionLabel,
    formatBIMetricLabel,
    normalizeSnapshotDate,
} from "@/lib/services/bi-core";

function main() {
    assert.equal(formatBIMetricLabel("PROCESSOS_ATIVOS"), "Processos ativos");
    assert.equal(formatBIDimensionLabel("ADVOGADO"), "Advogado");
    assert.equal(BI_METRIC_DEFINITIONS.TAXA_EXITO_PERCENT.formulaText, "((GANHO + ACORDO) / encerrados) * 100");

    const normalized = normalizeSnapshotDate(new Date("2026-03-11T18:37:12.000Z"));
    assert.equal(normalized.getHours(), 0);
    assert.equal(normalized.getMinutes(), 0);
    assert.equal(normalized.getSeconds(), 0);
    assert.equal(normalized.getMilliseconds(), 0);

    console.log("test-bi-core: ok");
}

main();
