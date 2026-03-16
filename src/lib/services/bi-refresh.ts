import { Prisma, type PrismaClient } from "@/generated/prisma";
import { db } from "@/lib/db";
import { registrarLogAuditoria } from "@/lib/services/audit-log";
import {
    BI_METRIC_DEFINITIONS,
    formatBIDimensionLabel,
    formatBIMetricLabel,
    normalizeSnapshotDate,
    type BIDimensionType,
    type BIMetricKey,
} from "@/lib/services/bi-core";

type SnapshotRow = {
    metricKey: BIMetricKey;
    dimensionType: BIDimensionType;
    dimensionValue: string;
    metricValue: number;
    meta?: Prisma.InputJsonValue;
};

function decimalToNumber(value: Prisma.Decimal | null | undefined) {
    if (!value) return 0;
    return typeof value === "number" ? value : value.toNumber();
}

function toDecimalNumber(value: number) {
    return new Prisma.Decimal(value.toFixed(4));
}

export async function ensureBIMetricDefinitions(client: PrismaClient | Prisma.TransactionClient = db) {
    for (const [key, definition] of Object.entries(BI_METRIC_DEFINITIONS) as Array<
        [BIMetricKey, (typeof BI_METRIC_DEFINITIONS)[BIMetricKey]]
    >) {
        await client.juriMetricDefinition.upsert({
            where: { key: key as never },
            update: {
                name: definition.name,
                description: definition.description,
                formulaText: definition.formulaText,
                isActive: true,
            },
            create: {
                key: key as never,
                name: definition.name,
                description: definition.description,
                formulaText: definition.formulaText,
                isActive: true,
            },
        });
    }
}

async function buildSnapshotRows(client: PrismaClient | Prisma.TransactionClient, snapshotDate: Date) {
    const stagnationCutoff = new Date(snapshotDate);
    stagnationCutoff.setDate(stagnationCutoff.getDate() - 120);

    const rolling30Cutoff = new Date(snapshotDate);
    rolling30Cutoff.setDate(rolling30Cutoff.getDate() - 30);

    const [
        processos,
        clientesInadimplentes,
        casosFinanceiros,
        tarefasConcluidasRecentes,
        horasRecentes,
        advogados,
    ] = await Promise.all([
        client.processo.findMany({
            select: {
                id: true,
                tipo: true,
                status: true,
                resultado: true,
                updatedAt: true,
                valorContingencia: true,
                riscoContingencia: true,
                dataDistribuicao: true,
                dataEncerramento: true,
                cliente: { select: { id: true, nome: true } },
            },
        }),
        client.cliente.count({ where: { inadimplente: true } }),
        client.casoFinanceiro.findMany({
            select: {
                valorRecebidoEscritorio: true,
                valorAReceberEscritorio: true,
                cliente: { select: { id: true, nome: true } },
            },
        }),
        client.tarefa.findMany({
            where: {
                concluidaEm: { gte: rolling30Cutoff },
            },
            select: {
                id: true,
                advogado: { select: { user: { select: { name: true } } } },
            },
        }),
        client.tarefaRegistroHora.findMany({
            where: {
                data: { gte: rolling30Cutoff },
            },
            select: {
                horas: true,
                tarefa: {
                    select: {
                        advogado: { select: { user: { select: { name: true } } } },
                    },
                },
            },
        }),
        client.advogado.findMany({
            select: {
                id: true,
                user: { select: { name: true } },
            },
        }),
    ]);

    const activeProcesses = processos.filter((item) => !["ENCERRADO", "ARQUIVADO"].includes(item.status));
    const closedProcesses = processos.filter((item) => ["ENCERRADO", "ARQUIVADO"].includes(item.status));
    const wonOrSettled = closedProcesses.filter((item) => ["GANHO", "ACORDO"].includes(item.resultado)).length;
    const successRate = closedProcesses.length > 0 ? (wonOrSettled / closedProcesses.length) * 100 : 0;

    const closureDays = closedProcesses
        .filter((item) => item.dataDistribuicao && item.dataEncerramento)
        .map((item) => {
            const start = new Date(item.dataDistribuicao as Date).getTime();
            const end = new Date(item.dataEncerramento as Date).getTime();
            return Math.max(Math.round((end - start) / (1000 * 60 * 60 * 24)), 0);
        });
    const averageClosureDays =
        closureDays.length > 0 ? closureDays.reduce((sum, value) => sum + value, 0) / closureDays.length : 0;

    const contingencyTotal = activeProcesses.reduce(
        (sum, item) => sum + decimalToNumber(item.valorContingencia),
        0
    );
    const receivedTotal = casosFinanceiros.reduce(
        (sum, item) => sum + decimalToNumber(item.valorRecebidoEscritorio),
        0
    );
    const receivableTotal = casosFinanceiros.reduce(
        (sum, item) => sum + decimalToNumber(item.valorAReceberEscritorio),
        0
    );

    const lawyerTaskCounts = new Map<string, number>(
        advogados.map((item) => [item.user.name, 0])
    );
    for (const task of tarefasConcluidasRecentes) {
        const lawyerName = task.advogado.user.name;
        lawyerTaskCounts.set(lawyerName, (lawyerTaskCounts.get(lawyerName) || 0) + 1);
    }

    const lawyerHourTotals = new Map<string, number>(
        advogados.map((item) => [item.user.name, 0])
    );
    for (const entry of horasRecentes) {
        const lawyerName = entry.tarefa.advogado.user.name;
        lawyerHourTotals.set(lawyerName, (lawyerHourTotals.get(lawyerName) || 0) + entry.horas);
    }

    const byProcessType = new Map<
        string,
        { totalClosed: number; wonOrSettled: number; closureDaysTotal: number; closureDaysCount: number }
    >();
    for (const process of closedProcesses) {
        const bucket = byProcessType.get(process.tipo) || {
            totalClosed: 0,
            wonOrSettled: 0,
            closureDaysTotal: 0,
            closureDaysCount: 0,
        };
        bucket.totalClosed += 1;
        if (["GANHO", "ACORDO"].includes(process.resultado)) bucket.wonOrSettled += 1;
        if (process.dataDistribuicao && process.dataEncerramento) {
            bucket.closureDaysTotal += Math.max(
                Math.round(
                    (new Date(process.dataEncerramento as Date).getTime() -
                        new Date(process.dataDistribuicao as Date).getTime()) /
                        (1000 * 60 * 60 * 24)
                ),
                0
            );
            bucket.closureDaysCount += 1;
        }
        byProcessType.set(process.tipo, bucket);
    }

    const byRisk = new Map<string, number>();
    for (const process of activeProcesses) {
        const risk = process.riscoContingencia || "Nao informado";
        byRisk.set(risk, (byRisk.get(risk) || 0) + decimalToNumber(process.valorContingencia));
    }

    const byClientReceivable = new Map<string, { recebido: number; aReceber: number }>();
    for (const item of casosFinanceiros) {
        const clientKey = item.cliente.nome;
        const bucket = byClientReceivable.get(clientKey) || { recebido: 0, aReceber: 0 };
        bucket.recebido += decimalToNumber(item.valorRecebidoEscritorio);
        bucket.aReceber += decimalToNumber(item.valorAReceberEscritorio);
        byClientReceivable.set(clientKey, bucket);
    }

    const rows: SnapshotRow[] = [
        {
            metricKey: "PROCESSOS_ATIVOS",
            dimensionType: "GLOBAL",
            dimensionValue: "global",
            metricValue: activeProcesses.length,
            meta: { label: formatBIMetricLabel("PROCESSOS_ATIVOS") },
        },
        {
            metricKey: "PROCESSOS_ESTAGNADOS_120D",
            dimensionType: "GLOBAL",
            dimensionValue: "global",
            metricValue: activeProcesses.filter((item) => item.updatedAt < stagnationCutoff).length,
            meta: { cutoffDays: 120 },
        },
        {
            metricKey: "TAXA_EXITO_PERCENT",
            dimensionType: "GLOBAL",
            dimensionValue: "global",
            metricValue: successRate,
            meta: { totalClosed: closedProcesses.length, wonOrSettled },
        },
        {
            metricKey: "TEMPO_MEDIO_ENCERRAMENTO_DIAS",
            dimensionType: "GLOBAL",
            dimensionValue: "global",
            metricValue: averageClosureDays,
            meta: { totalClosedWithDates: closureDays.length },
        },
        {
            metricKey: "CONTINGENCIA_TOTAL",
            dimensionType: "GLOBAL",
            dimensionValue: "global",
            metricValue: contingencyTotal,
        },
        {
            metricKey: "CLIENTES_INADIMPLENTES",
            dimensionType: "GLOBAL",
            dimensionValue: "global",
            metricValue: clientesInadimplentes,
        },
        {
            metricKey: "RECEBIDO_TOTAL",
            dimensionType: "GLOBAL",
            dimensionValue: "global",
            metricValue: receivedTotal,
        },
        {
            metricKey: "A_RECEBER_TOTAL",
            dimensionType: "GLOBAL",
            dimensionValue: "global",
            metricValue: receivableTotal,
        },
        {
            metricKey: "TAREFAS_CONCLUIDAS_30D",
            dimensionType: "GLOBAL",
            dimensionValue: "global",
            metricValue: tarefasConcluidasRecentes.length,
            meta: { rollingWindowDays: 30 },
        },
        {
            metricKey: "HORAS_TRABALHADAS_30D",
            dimensionType: "GLOBAL",
            dimensionValue: "global",
            metricValue: horasRecentes.reduce((sum, item) => sum + item.horas, 0),
            meta: { rollingWindowDays: 30 },
        },
    ];

    for (const [lawyerName, total] of lawyerTaskCounts.entries()) {
        rows.push({
            metricKey: "TAREFAS_CONCLUIDAS_30D",
            dimensionType: "ADVOGADO",
            dimensionValue: lawyerName,
            metricValue: total,
            meta: { label: lawyerName, dimensionLabel: formatBIDimensionLabel("ADVOGADO") },
        });
    }

    for (const [lawyerName, total] of lawyerHourTotals.entries()) {
        rows.push({
            metricKey: "HORAS_TRABALHADAS_30D",
            dimensionType: "ADVOGADO",
            dimensionValue: lawyerName,
            metricValue: total,
            meta: { label: lawyerName, dimensionLabel: formatBIDimensionLabel("ADVOGADO") },
        });
    }

    for (const [processType, values] of byProcessType.entries()) {
        rows.push({
            metricKey: "TAXA_EXITO_PERCENT",
            dimensionType: "TIPO_PROCESSO",
            dimensionValue: processType,
            metricValue: values.totalClosed > 0 ? (values.wonOrSettled / values.totalClosed) * 100 : 0,
            meta: { totalClosed: values.totalClosed, wonOrSettled: values.wonOrSettled },
        });

        rows.push({
            metricKey: "TEMPO_MEDIO_ENCERRAMENTO_DIAS",
            dimensionType: "TIPO_PROCESSO",
            dimensionValue: processType,
            metricValue:
                values.closureDaysCount > 0 ? values.closureDaysTotal / values.closureDaysCount : 0,
            meta: { totalClosedWithDates: values.closureDaysCount },
        });
    }

    for (const [risk, value] of byRisk.entries()) {
        rows.push({
            metricKey: "CONTINGENCIA_TOTAL",
            dimensionType: "RISCO_CONTINGENCIA",
            dimensionValue: risk,
            metricValue: value,
            meta: { label: risk },
        });
    }

    for (const [clientName, value] of byClientReceivable.entries()) {
        rows.push({
            metricKey: "RECEBIDO_TOTAL",
            dimensionType: "CLIENTE",
            dimensionValue: clientName,
            metricValue: value.recebido,
            meta: { label: clientName },
        });
        rows.push({
            metricKey: "A_RECEBER_TOTAL",
            dimensionType: "CLIENTE",
            dimensionValue: clientName,
            metricValue: value.aReceber,
            meta: { label: clientName },
        });
    }

    return rows;
}

export async function refreshBISnapshots(input: {
    snapshotDate?: Date;
    actorUserId?: string | null;
}) {
    const snapshotDate = normalizeSnapshotDate(input.snapshotDate);
    await ensureBIMetricDefinitions(db);

    const run = await db.bIRefreshRun.create({
        data: {
            jobType: "DAILY_BASELINE",
            status: "SUCCESS",
            startedAt: new Date(),
            summary: { snapshotDate: snapshotDate.toISOString(), phase: "started" },
        },
    });

    try {
        const rows = await buildSnapshotRows(db, snapshotDate);

        await db.$transaction(async (tx) => {
            await tx.bIIndicadorSnapshot.deleteMany({
                where: { snapshotDate },
            });

            if (rows.length > 0) {
                await tx.bIIndicadorSnapshot.createMany({
                    data: rows.map((row) => ({
                        snapshotDate,
                        metricKey: row.metricKey as never,
                        dimensionType: row.dimensionType as never,
                        dimensionValue: row.dimensionValue,
                        metricValue: toDecimalNumber(row.metricValue),
                        meta: row.meta,
                    })),
                });
            }
        });

        const finishedAt = new Date();
        await db.bIRefreshRun.update({
            where: { id: run.id },
            data: {
                status: "SUCCESS",
                finishedAt,
                summary: {
                    snapshotDate: snapshotDate.toISOString(),
                    totalSnapshots: rows.length,
                    metricsCovered: Array.from(new Set(rows.map((row) => row.metricKey))),
                },
            },
        });

        if (input.actorUserId) {
            await registrarLogAuditoria({
                actorUserId: input.actorUserId,
                acao: "BI_REFRESH_EXECUTED",
                entidade: "BIRefreshRun",
                entidadeId: run.id,
                dadosDepois: {
                    snapshotDate: snapshotDate.toISOString(),
                    totalSnapshots: rows.length,
                },
            });
        }

        return { runId: run.id, snapshotDate, totalSnapshots: rows.length };
    } catch (error) {
        await db.bIRefreshRun.update({
            where: { id: run.id },
            data: {
                status: "FAILED",
                finishedAt: new Date(),
                summary: {
                    snapshotDate: snapshotDate.toISOString(),
                    error: error instanceof Error ? error.message : "Erro ao atualizar snapshots BI.",
                },
            },
        });
        throw error;
    }
}
