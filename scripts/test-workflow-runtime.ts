import "dotenv/config";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { setTimeout as sleep } from "node:timers/promises";

process.env.REDIS_URL = "";

import { db } from "@/lib/db";
import { FlowExecutionStatus, TriggerType } from "@/generated/prisma";
import { AutomationEngine } from "@/lib/services/automation-engine";

async function run() {
    const escritorio = await db.escritorio.findFirst({
        select: { id: true },
        orderBy: { createdAt: "asc" },
    });

    assert.ok(escritorio, "Nenhum escritorio encontrado para testar o runtime de workflows.");

    let webhookResolve: ((value: { method: string; body: string }) => void) | null = null;
    const webhookRequest = new Promise<{ method: string; body: string }>((resolve) => {
        webhookResolve = resolve;
    });

    const server = createServer((req, res) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        req.on("end", () => {
            webhookResolve?.({
                method: req.method || "GET",
                body: Buffer.concat(chunks).toString("utf8"),
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ ok: true }));
        });
    });

    await new Promise<void>((resolve) => {
        server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();
    assert.ok(address && typeof address === "object", "Nao foi possivel obter a porta do servidor de webhook.");

    const probeId = `workflow-runtime-${Date.now()}`;
    const flow = await db.automationFlow.create({
        data: {
            escritorioId: escritorio.id,
            name: `__workflow_runtime_test__${probeId}`,
            triggerType: TriggerType.MANUAL,
            triggerConfig: {
                triggerEvent: "workflow_runtime_test",
            },
            isActive: true,
            nodes: [
                {
                    id: "trigger-1",
                    type: "default",
                    position: { x: 40, y: 40 },
                    data: {
                        type: "TRIGGER",
                        label: "Gatilho",
                        triggerEvent: "workflow_runtime_test",
                    },
                },
                {
                    id: "wait-1",
                    type: "waitNode",
                    position: { x: 220, y: 40 },
                    data: {
                        type: "WAIT",
                        label: "Aguardar",
                        delayAmount: 1,
                        delayUnit: "seconds",
                    },
                },
                {
                    id: "webhook-1",
                    type: "default",
                    position: { x: 420, y: 40 },
                    data: {
                        type: "WEBHOOK",
                        label: "Webhook",
                        url: `http://127.0.0.1:${address.port}/workflow-runtime`,
                        method: "POST",
                        headers: {
                            "x-runtime-test": probeId,
                        },
                        body: {
                            probeId: "{probeId}",
                            origin: "{origin}",
                        },
                    },
                },
                {
                    id: "end-1",
                    type: "default",
                    position: { x: 620, y: 40 },
                    data: {
                        type: "END",
                        label: "Fim",
                    },
                },
            ],
            edges: [
                { id: "e1", source: "trigger-1", target: "wait-1" },
                { id: "e2", source: "wait-1", target: "webhook-1" },
                { id: "e3", source: "webhook-1", target: "end-1" },
            ],
        },
        select: { id: true },
    });

    try {
        const started = await AutomationEngine.startExecution(flow.id, {
            escritorioId: escritorio.id,
            probeId,
            origin: "script",
        });

        assert.equal(started.started, true, "Fluxo de teste nao iniciou.");
        assert.ok(started.executionId, "Fluxo de teste nao retornou executionId.");

        const executionId = started.executionId;

        await AutomationEngine.processExecutionJob(executionId, { attemptNumber: 1, maxAttempts: 1 });

        const firstState = await db.flowExecution.findUnique({
            where: { id: executionId },
            select: { status: true, log: true },
        });
        assert.ok(firstState, "Execucao de workflow nao encontrada apos iniciar.");
        assert.equal(firstState.status, FlowExecutionStatus.RUNNING);
        const firstLog = Array.isArray(firstState.log) ? firstState.log : [];
        assert.ok(
            firstLog.some((entry) => typeof entry === "object" && entry && (entry as { action?: string }).action === "WAIT_STARTED"),
            "WAIT_STARTED nao foi registrado."
        );

        await sleep(1_200);
        await AutomationEngine.processExecutionJob(executionId, { attemptNumber: 1, maxAttempts: 1 });

        const webhook = await Promise.race([
            webhookRequest,
            sleep(3_000).then(() => {
                throw new Error("Webhook nao foi recebido dentro do timeout esperado.");
            }),
        ]);

        assert.equal(webhook.method, "POST");
        const body = JSON.parse(webhook.body) as { probeId?: string; origin?: string };
        assert.equal(body.probeId, probeId);
        assert.equal(body.origin, "script");

        const finalState = await db.flowExecution.findUnique({
            where: { id: executionId },
            select: { status: true, log: true },
        });
        assert.ok(finalState, "Execucao de workflow nao encontrada ao final.");
        assert.equal(finalState.status, FlowExecutionStatus.COMPLETED);
        const finalLog = Array.isArray(finalState.log) ? finalState.log : [];
        assert.ok(
            finalLog.some((entry) => typeof entry === "object" && entry && (entry as { action?: string }).action === "WAIT_COMPLETED"),
            "WAIT_COMPLETED nao foi registrado."
        );
        assert.ok(
            finalLog.some((entry) => typeof entry === "object" && entry && (entry as { action?: string }).action === "WEBHOOK_SENT"),
            "WEBHOOK_SENT nao foi registrado."
        );

        console.log("test-workflow-runtime: ok");
    } finally {
        await db.automationFlow.delete({
            where: { id: flow.id },
        }).catch(() => null);
        await new Promise<void>((resolve, reject) => {
            server.close((error) => {
                if (error) reject(error);
                else resolve();
            });
        }).catch(() => null);
    }
}

void run()
    .catch((error) => {
        console.error("test-workflow-runtime: failed");
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.$disconnect().catch(() => null);
    });
