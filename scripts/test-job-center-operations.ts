import assert from "node:assert/strict";
import {
    buildJobCenterList,
    buildJobCenterOperationalMetrics,
    type JobCenterAttemptMetricInput,
} from "@/lib/services/job-center-core";

const now = new Date("2026-03-11T12:00:00.000Z");

const automacaoJobs = [
    {
        id: "job-recent-failed",
        modo: "NACIONAL",
        status: "FAILED",
        erroResumo: "Falha de captura",
        createdAt: new Date("2026-03-10T09:00:00.000Z"),
        startedAt: new Date("2026-03-10T09:01:00.000Z"),
        finishedAt: new Date("2026-03-10T09:05:00.000Z"),
        publicacoesCapturadas: 10,
        publicacoesImportadas: 0,
        prazosCriados: 0,
        _count: { logs: 3 },
        advogado: {
            id: "adv-1",
            user: { name: "Ana Braga" },
        },
    },
    {
        id: "job-old-completed",
        modo: "NACIONAL",
        status: "COMPLETED",
        erroResumo: null,
        createdAt: new Date("2026-01-01T09:00:00.000Z"),
        startedAt: new Date("2026-01-01T09:01:00.000Z"),
        finishedAt: new Date("2026-01-01T09:05:00.000Z"),
        publicacoesCapturadas: 4,
        publicacoesImportadas: 4,
        prazosCriados: 1,
        _count: { logs: 1 },
        advogado: {
            id: "adv-2",
            user: { name: "Bruno Lima" },
        },
    },
] as const;

const flowExecutions = [
    {
        id: "flow-running",
        flowId: "flow-template-1",
        status: "RUNNING",
        currentNodeId: "wait-node",
        errorMessage: null,
        startedAt: new Date("2026-03-11T10:00:00.000Z"),
        completedAt: null,
        flow: { id: "flow-template-1", nome: "Fluxo de onboarding" },
        clienteId: "cliente-1",
        processoId: "processo-1",
        log: [],
    },
] as const;

const attempts: JobCenterAttemptMetricInput[] = [
    {
        sourceType: "AUTOMACAO_NACIONAL_JOB",
        status: "FAILED",
        triggerSource: "MANUAL_RETRY",
        createdAt: new Date("2026-03-10T10:00:00.000Z"),
    },
    {
        sourceType: "AUTOMACAO_NACIONAL_JOB",
        status: "COMPLETED",
        triggerSource: "MANUAL_RETRY",
        createdAt: new Date("2026-03-10T10:10:00.000Z"),
    },
    {
        sourceType: "FLOW_EXECUTION",
        status: "CANCELLED",
        triggerSource: "MANUAL_CANCEL",
        createdAt: new Date("2026-03-11T10:20:00.000Z"),
    },
];

async function main() {
    const recentItems = buildJobCenterList({
        automacaoJobs,
        flowExecutions,
        filters: { periodDays: 7 },
        now,
    });

    assert.deepEqual(
        recentItems.map((item) => item.id),
        ["flow-running", "job-recent-failed"],
        "deve filtrar por periodo recente antes de montar o painel"
    );

    const metrics = buildJobCenterOperationalMetrics({
        items: recentItems,
        attempts,
        now,
    });

    assert.equal(metrics.actionableTotal, 2, "deve contar itens operaveis no periodo");
    assert.equal(metrics.manualRetryTotal, 2, "deve contar retries manuais");
    assert.equal(metrics.recoveredAfterRetryTotal, 1, "deve contar recuperacoes apos retry");
    assert.equal(metrics.manualCancelTotal, 1, "deve contar cancelamentos manuais");
    assert.equal(metrics.retrySuccessRate, 50, "deve calcular taxa de sucesso do retry");
    assert.equal(metrics.failureRate, 50, "deve calcular taxa de falha do painel filtrado");
    assert.equal(metrics.bySource[0]?.sourceType, "AUTOMACAO_NACIONAL_JOB");
    assert.equal(metrics.bySource[0]?.manualRetryTotal, 2);
    assert.equal(metrics.bySource[1]?.sourceType, "FLOW_EXECUTION");
    assert.equal(metrics.bySource[1]?.running, 1);

    console.log("test-job-center-operations: ok");
}

void main();
