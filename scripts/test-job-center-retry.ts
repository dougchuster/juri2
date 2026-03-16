import assert from "node:assert/strict";
import {
    deriveAttemptContext,
    extractRetryPayloadFromFlowExecutionLog,
} from "@/lib/services/job-attempts";

async function main() {
    const contextWithoutAttempts = deriveAttemptContext(
        "AUTOMACAO_NACIONAL_JOB",
        "job-original",
        []
    );
    assert.equal(contextWithoutAttempts.chainKey, "AUTOMACAO_NACIONAL_JOB:job-original");
    assert.equal(contextWithoutAttempts.nextAttemptNumber, 1);

    const contextWithHistory = deriveAttemptContext(
        "FLOW_EXECUTION",
        "flow-2",
        [
            { chainKey: "FLOW_EXECUTION:flow-1", attemptNumber: 1 },
            { chainKey: "FLOW_EXECUTION:flow-1", attemptNumber: 2 },
        ]
    );
    assert.equal(contextWithHistory.chainKey, "FLOW_EXECUTION:flow-1");
    assert.equal(contextWithHistory.nextAttemptNumber, 3);

    const payload = extractRetryPayloadFromFlowExecutionLog([
        {
            at: "2026-03-11T10:00:00.000Z",
            action: "EXECUTION_STARTED",
            payload: {
                escritorioId: "esc-1",
                clienteId: "cli-1",
                processoId: "proc-1",
                source: "manual",
            },
        },
        {
            at: "2026-03-11T10:01:00.000Z",
            action: "WAIT_STARTED",
            nodeId: "wait-node",
        },
    ]);

    assert.deepEqual(payload, {
        escritorioId: "esc-1",
        clienteId: "cli-1",
        processoId: "proc-1",
        source: "manual",
    });

    const missingPayload = extractRetryPayloadFromFlowExecutionLog([
        {
            at: "2026-03-11T10:05:00.000Z",
            action: "WAIT_STARTED",
            nodeId: "wait-node",
        },
    ]);

    assert.equal(missingPayload, null);

    console.log("test-job-center-retry: ok");
}

void main();
