import assert from "node:assert/strict";
import {
    buildJobCenterList,
    getJobCenterSummary,
} from "@/lib/services/job-center-core";

const automacaoJobs = [
    {
        id: "job-1",
        modo: "NACIONAL",
        status: "FAILED",
        erroResumo: "Falha ao importar publicacoes",
        createdAt: new Date("2026-03-10T09:00:00.000Z"),
        startedAt: new Date("2026-03-10T09:01:00.000Z"),
        finishedAt: new Date("2026-03-10T09:05:00.000Z"),
        publicacoesCapturadas: 12,
        publicacoesImportadas: 0,
        prazosCriados: 0,
        _count: { logs: 4 },
        advogado: {
            id: "adv-1",
            user: { name: "Ana Braga" },
        },
    },
    {
        id: "job-2",
        modo: "NACIONAL",
        status: "COMPLETED",
        erroResumo: null,
        createdAt: new Date("2026-03-10T08:00:00.000Z"),
        startedAt: new Date("2026-03-10T08:01:00.000Z"),
        finishedAt: new Date("2026-03-10T08:03:00.000Z"),
        publicacoesCapturadas: 5,
        publicacoesImportadas: 5,
        prazosCriados: 2,
        _count: { logs: 2 },
        advogado: {
            id: "adv-2",
            user: { name: "Bruno Lima" },
        },
    },
] as const;

const flowExecutions = [
    {
        id: "flow-1",
        flowId: "flow-template-1",
        status: "RUNNING",
        currentNodeId: "wait-approval",
        errorMessage: null,
        startedAt: new Date("2026-03-10T09:10:00.000Z"),
        completedAt: null,
        createdAt: new Date("2026-03-10T09:10:00.000Z"),
        clienteId: "cliente-1",
        processoId: "processo-1",
        flow: { id: "flow-template-1", nome: "Fluxo de onboarding" },
    },
] as const;

async function main() {
    const items = buildJobCenterList({
        automacaoJobs,
        flowExecutions,
        filters: {},
    });

    assert.equal(items.length, 3, "deve consolidar jobs e execucoes na mesma lista");
    assert.equal(items[0]?.id, "flow-1", "deve ordenar por recencia decrescente");
    assert.equal(items[1]?.id, "job-1", "job mais recente deve vir antes do mais antigo");

    const failedJob = items.find((item: (typeof items)[number]) => item.id === "job-1");
    assert.ok(failedJob, "deve expor item de automacao nacional");
    assert.equal(failedJob?.sourceType, "AUTOMACAO_NACIONAL_JOB");
    assert.equal(failedJob?.status, "FAILED");
    assert.equal(failedJob?.ownerLabel, "Ana Braga");
    assert.equal(failedJob?.errorSummary, "Falha ao importar publicacoes");
    assert.equal(failedJob?.stats?.logs, 4);
    assert.equal(failedJob?.stats?.publicacoesCapturadas, 12);

    const runningFlow = items.find((item: (typeof items)[number]) => item.id === "flow-1");
    assert.ok(runningFlow, "deve expor item de flow execution");
    assert.equal(runningFlow?.sourceType, "FLOW_EXECUTION");
    assert.equal(runningFlow?.status, "RUNNING");
    assert.match(runningFlow?.title || "", /onboarding/i);

    const failedOnly = buildJobCenterList({
        automacaoJobs,
        flowExecutions,
        filters: { status: "FAILED" },
    });
    assert.deepEqual(
        failedOnly.map((item: (typeof failedOnly)[number]) => item.id),
        ["job-1"],
        "deve filtrar por status consolidado"
    );

    const automacaoOnly = buildJobCenterList({
        automacaoJobs,
        flowExecutions,
        filters: { sourceType: "AUTOMACAO_NACIONAL_JOB" },
    });
    assert.deepEqual(
        automacaoOnly.map((item: (typeof automacaoOnly)[number]) => item.id),
        ["job-1", "job-2"],
        "deve filtrar por origem"
    );

    const summary = getJobCenterSummary(items);
    assert.equal(summary.total, 3);
    assert.equal(summary.failed, 1);
    assert.equal(summary.running, 1);
    assert.equal(summary.completed, 1);

    console.log("test-job-center: ok");
}

void main();
