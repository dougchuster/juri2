import assert from "node:assert/strict";
import {
    calculateRetentionCutoff,
    formatRetentionEntityLabel,
    summarizeRetentionExecution,
} from "@/lib/services/lgpd-retention-core";

function main() {
    const now = new Date("2026-03-11T18:00:00.000Z");
    const cutoff = calculateRetentionCutoff(30, now);

    assert.equal(cutoff.toISOString(), "2026-02-09T18:00:00.000Z");
    assert.equal(formatRetentionEntityLabel("LGPD_DATA_EXPORT"), "Pacotes LGPD expirados");

    assert.equal(
        summarizeRetentionExecution({
            processedCount: 10,
            errorCount: 0,
            skippedCount: 0,
            dryRun: true,
        }),
        "DRY_RUN"
    );
    assert.equal(
        summarizeRetentionExecution({
            processedCount: 4,
            errorCount: 1,
            skippedCount: 0,
        }),
        "PARTIAL"
    );
    assert.equal(
        summarizeRetentionExecution({
            processedCount: 0,
            errorCount: 2,
            skippedCount: 0,
        }),
        "FAILED"
    );

    console.log("test-lgpd-retention-core: ok");
}

main();
