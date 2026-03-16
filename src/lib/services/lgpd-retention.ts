import { promises as fs } from "fs";
import type { Prisma, PrismaClient } from "@/generated/prisma";
import { db } from "@/lib/db";
import { registrarLogAuditoria } from "@/lib/services/audit-log";
import { applyClienteLgpdOperation } from "@/lib/services/lgpd-operations";
import {
    calculateRetentionCutoff,
    formatRetentionActionLabel,
    formatRetentionEntityLabel,
    LGPD_RETENTION_DEFAULTS,
    type RetentionActionType,
    type RetentionExecutionStatus,
    type RetentionExecutionMode,
    type RetentionPolicyEntity,
    summarizeRetentionExecution,
} from "@/lib/services/lgpd-retention-core";

type RetentionDbClient = PrismaClient | Prisma.TransactionClient;

const CLIENT_ACTIVE_PROCESS_STATUSES = [
    "PROSPECCAO",
    "CONSULTORIA",
    "AJUIZADO",
    "EM_ANDAMENTO",
    "AUDIENCIA_MARCADA",
    "SENTENCA",
    "RECURSO",
    "TRANSITO_JULGADO",
    "EXECUCAO",
] as const;

const OPEN_LGPD_STATUSES = ["ABERTA", "EM_ANALISE", "EM_ATENDIMENTO"] as const;

export type LgpdRetentionPolicyItem = {
    id: string;
    entityName: RetentionPolicyEntity;
    actionType: RetentionActionType;
    retentionDays: number;
    isActive: boolean;
    notes: string | null;
    lastExecutedAt: string | null;
    createdAt: string;
    updatedAt: string;
    createdBy: { id: string; name: string; role: string } | null;
    updatedBy: { id: string; name: string; role: string } | null;
    latestExecution: {
        id: string;
        status: RetentionExecutionStatus;
        mode: RetentionExecutionMode;
        dryRun: boolean;
        processedCount: number;
        errorCount: number;
        skippedCount: number;
        startedAt: string;
        completedAt: string | null;
        triggeredBy: { id: string; name: string; role: string } | null;
    } | null;
};

export type LgpdRetentionExecutionItem = {
    id: string;
    policyId: string;
    policyEntityName: RetentionPolicyEntity;
    policyActionType: RetentionActionType;
    status: RetentionExecutionStatus;
    mode: RetentionExecutionMode;
    dryRun: boolean;
    processedCount: number;
    errorCount: number;
    skippedCount: number;
    startedAt: string;
    completedAt: string | null;
    summary: Prisma.JsonValue | null;
    triggeredBy: { id: string; name: string; role: string } | null;
};

export type LgpdRetentionOverview = {
    activePolicies: number;
    inactivePolicies: number;
    expiredExportsPendingPurge: number;
    archivedClientsEligible: number;
    recentExecutions: number;
};

function getPolicyDefaults(entityName: RetentionPolicyEntity) {
    return LGPD_RETENTION_DEFAULTS[entityName];
}

async function resolveEscritorioId(client: RetentionDbClient) {
    const escritorio = await client.escritorio.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
    });

    if (!escritorio?.id) {
        throw new Error("Nenhum escritorio configurado para retencao LGPD.");
    }

    return escritorio.id;
}

export async function ensureDefaultRetentionPolicies(client: RetentionDbClient = db) {
    for (const entityName of Object.keys(LGPD_RETENTION_DEFAULTS) as RetentionPolicyEntity[]) {
        const defaults = getPolicyDefaults(entityName);
        await client.retentionPolicy.upsert({
            where: { entityName },
            update: {},
            create: {
                entityName,
                actionType: defaults.actionType,
                retentionDays: defaults.retentionDays,
                notes: defaults.description,
            },
        });
    }
}

async function listExpiredExportsPendingPurge(client: RetentionDbClient, retentionDays = 0, now = new Date()) {
    const cutoff = calculateRetentionCutoff(retentionDays, now);
    return client.lgpdDataExport.findMany({
        where: {
            purgedAt: null,
            expiresAt: { lte: cutoff },
        },
        select: {
            id: true,
            filePath: true,
            fileName: true,
            expiresAt: true,
        },
        orderBy: { expiresAt: "asc" },
    });
}

async function listArchivedClientsEligibleForRetention(
    client: RetentionDbClient,
    retentionDays: number,
    now = new Date()
) {
    const cutoff = calculateRetentionCutoff(retentionDays, now);
    return client.cliente.findMany({
        where: {
            status: "ARQUIVADO",
            anonymizedAt: null,
            updatedAt: { lte: cutoff },
            processos: {
                none: {
                    status: { in: [...CLIENT_ACTIVE_PROCESS_STATUSES] },
                },
            },
            lgpdRequests: {
                none: {
                    status: { in: [...OPEN_LGPD_STATUSES] },
                },
            },
        },
        select: {
            id: true,
            nome: true,
            updatedAt: true,
        },
        orderBy: { updatedAt: "asc" },
    });
}

export async function listRetentionPolicies(limit = 10): Promise<LgpdRetentionPolicyItem[]> {
    await ensureDefaultRetentionPolicies(db);

    const items = await db.retentionPolicy.findMany({
        include: {
            createdBy: { select: { id: true, name: true, role: true } },
            updatedBy: { select: { id: true, name: true, role: true } },
            executions: {
                take: 1,
                orderBy: { startedAt: "desc" },
                include: {
                    triggeredBy: { select: { id: true, name: true, role: true } },
                },
            },
        },
        orderBy: [{ isActive: "desc" }, { entityName: "asc" }],
        take: limit,
    });

    return items.map((item) => ({
        id: item.id,
        entityName: item.entityName,
        actionType: item.actionType,
        retentionDays: item.retentionDays,
        isActive: item.isActive,
        notes: item.notes,
        lastExecutedAt: item.lastExecutedAt?.toISOString() || null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        createdBy: item.createdBy
            ? { id: item.createdBy.id, name: item.createdBy.name, role: item.createdBy.role }
            : null,
        updatedBy: item.updatedBy
            ? { id: item.updatedBy.id, name: item.updatedBy.name, role: item.updatedBy.role }
            : null,
        latestExecution: item.executions[0]
            ? {
                  id: item.executions[0].id,
                  status: item.executions[0].status,
                  mode: item.executions[0].mode,
                  dryRun: item.executions[0].dryRun,
                  processedCount: item.executions[0].processedCount,
                  errorCount: item.executions[0].errorCount,
                  skippedCount: item.executions[0].skippedCount,
                  startedAt: item.executions[0].startedAt.toISOString(),
                  completedAt: item.executions[0].completedAt?.toISOString() || null,
                  triggeredBy: item.executions[0].triggeredBy
                      ? {
                            id: item.executions[0].triggeredBy.id,
                            name: item.executions[0].triggeredBy.name,
                            role: item.executions[0].triggeredBy.role,
                        }
                      : null,
              }
            : null,
    }));
}

export async function listRetentionExecutions(limit = 12): Promise<LgpdRetentionExecutionItem[]> {
    const items = await db.retentionExecution.findMany({
        include: {
            policy: { select: { entityName: true, actionType: true } },
            triggeredBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { startedAt: "desc" },
        take: limit,
    });

    return items.map((item) => ({
        id: item.id,
        policyId: item.policyId,
        policyEntityName: item.policy.entityName,
        policyActionType: item.policy.actionType,
        status: item.status,
        mode: item.mode,
        dryRun: item.dryRun,
        processedCount: item.processedCount,
        errorCount: item.errorCount,
        skippedCount: item.skippedCount,
        startedAt: item.startedAt.toISOString(),
        completedAt: item.completedAt?.toISOString() || null,
        summary: item.summary as Prisma.JsonValue | null,
        triggeredBy: item.triggeredBy
            ? { id: item.triggeredBy.id, name: item.triggeredBy.name, role: item.triggeredBy.role }
            : null,
    }));
}

export async function getRetentionOverview(): Promise<LgpdRetentionOverview> {
    await ensureDefaultRetentionPolicies(db);

    const [activePolicies, inactivePolicies, expiredExportsPendingPurge, archivedClientsEligible, recentExecutions] =
        await Promise.all([
            db.retentionPolicy.count({ where: { isActive: true } }),
            db.retentionPolicy.count({ where: { isActive: false } }),
            db.lgpdDataExport.count({
                where: {
                    purgedAt: null,
                    expiresAt: { lte: new Date() },
                },
            }),
            db.cliente.count({
                where: {
                    status: "ARQUIVADO",
                    anonymizedAt: null,
                    processos: {
                        none: {
                            status: { in: [...CLIENT_ACTIVE_PROCESS_STATUSES] },
                        },
                    },
                    lgpdRequests: {
                        none: {
                            status: { in: [...OPEN_LGPD_STATUSES] },
                        },
                    },
                },
            }),
            db.retentionExecution.count({
                where: {
                    startedAt: {
                        gte: calculateRetentionCutoff(30),
                    },
                },
            }),
        ]);

    return {
        activePolicies,
        inactivePolicies,
        expiredExportsPendingPurge,
        archivedClientsEligible,
        recentExecutions,
    };
}

export async function upsertRetentionPolicy(
    input: {
        entityName: RetentionPolicyEntity;
        retentionDays: number;
        isActive: boolean;
        notes?: string | null;
        actorUserId?: string | null;
    },
    client: RetentionDbClient = db
) {
    const defaults = getPolicyDefaults(input.entityName);

    return client.retentionPolicy.upsert({
        where: { entityName: input.entityName },
        update: {
            retentionDays: input.retentionDays,
            isActive: input.isActive,
            notes: input.notes || defaults.description,
            updatedById: input.actorUserId || null,
        },
        create: {
            entityName: input.entityName,
            actionType: defaults.actionType,
            retentionDays: input.retentionDays,
            isActive: input.isActive,
            notes: input.notes || defaults.description,
            createdById: input.actorUserId || null,
            updatedById: input.actorUserId || null,
        },
    });
}

export async function executeRetentionPolicy(
    input: {
        policyId: string;
        mode: RetentionExecutionMode;
        actorUserId?: string | null;
        dryRun?: boolean;
    },
    client: RetentionDbClient = db
) {
    const policy = await client.retentionPolicy.findUnique({
        where: { id: input.policyId },
    });

    if (!policy) {
        throw new Error("Politica de retencao nao encontrada.");
    }

    const now = new Date();
    let processedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    let summary: Prisma.JsonObject = {
        entityName: policy.entityName,
        actionType: policy.actionType,
        retentionDays: policy.retentionDays,
        policyLabel: formatRetentionEntityLabel(policy.entityName),
        actionLabel: formatRetentionActionLabel(policy.actionType),
    };

    if (policy.entityName === "LGPD_DATA_EXPORT") {
        const candidates = await listExpiredExportsPendingPurge(client, policy.retentionDays, now);
        summary = {
            ...summary,
            cutoffAt: calculateRetentionCutoff(policy.retentionDays, now).toISOString(),
            candidateCount: candidates.length,
            candidateIds: candidates.slice(0, 20).map((item) => item.id),
        };

        if (input.dryRun) {
            processedCount = candidates.length;
        } else {
            for (const item of candidates) {
                try {
                    await fs.unlink(item.filePath).catch((error: NodeJS.ErrnoException) => {
                        if (error.code !== "ENOENT") {
                            throw error;
                        }
                    });

                    await client.lgpdDataExport.update({
                        where: { id: item.id },
                        data: {
                            purgedAt: new Date(),
                            purgeError: null,
                        },
                    });
                    processedCount += 1;
                } catch (error) {
                    errorCount += 1;
                    await client.lgpdDataExport.update({
                        where: { id: item.id },
                        data: {
                            purgeError: error instanceof Error ? error.message : "Falha ao purgar pacote LGPD.",
                        },
                    });
                }
            }
        }
    } else if (policy.entityName === "CLIENTE_ARQUIVADO") {
        const escritorioId = await resolveEscritorioId(client);
        const candidates = await listArchivedClientsEligibleForRetention(client, policy.retentionDays, now);

        summary = {
            ...summary,
            cutoffAt: calculateRetentionCutoff(policy.retentionDays, now).toISOString(),
            candidateCount: candidates.length,
            candidateIds: candidates.slice(0, 20).map((item) => item.id),
        };

        if (input.dryRun) {
            processedCount = candidates.length;
        } else {
            for (const item of candidates) {
                try {
                    await applyClienteLgpdOperation(client as Prisma.TransactionClient, {
                        clienteId: item.id,
                        escritorioId,
                        actorUserId: input.actorUserId || null || (await resolveSystemActorId(client)),
                        requestType: "ANONIMIZACAO",
                        details: `Retencao automatizada para cliente arquivado apos ${policy.retentionDays} dias.`,
                    });
                    processedCount += 1;
                } catch {
                    errorCount += 1;
                }
            }
        }
    } else {
        skippedCount += 1;
    }

    const status = summarizeRetentionExecution({
        processedCount,
        errorCount,
        skippedCount,
        dryRun: input.dryRun,
    });

    const execution = await client.retentionExecution.create({
        data: {
            policyId: policy.id,
            status,
            mode: input.mode,
            dryRun: Boolean(input.dryRun),
            processedCount,
            errorCount,
            skippedCount,
            summary,
            startedAt: now,
            completedAt: new Date(),
            triggeredById: input.actorUserId || null,
        },
    });

    await client.retentionPolicy.update({
        where: { id: policy.id },
        data: {
            lastExecutedAt: execution.completedAt || new Date(),
        },
    });

    return {
        policy,
        execution,
    };
}

async function resolveSystemActorId(client: RetentionDbClient) {
    const user = await client.user.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
    });

    if (!user?.id) {
        throw new Error("Nenhum usuario disponivel para registrar a execucao de retencao.");
    }

    return user.id;
}

export async function executeActiveRetentionPolicies(input: {
    mode: RetentionExecutionMode;
    actorUserId?: string | null;
    dryRun?: boolean;
}) {
    await ensureDefaultRetentionPolicies(db);

    const activePolicies = await db.retentionPolicy.findMany({
        where: { isActive: true },
        orderBy: { entityName: "asc" },
        select: { id: true },
    });

    const results = [];
    for (const policy of activePolicies) {
        results.push(
            await executeRetentionPolicy(
                {
                    policyId: policy.id,
                    mode: input.mode,
                    actorUserId: input.actorUserId,
                    dryRun: input.dryRun,
                },
                db
            )
        );
    }

    if (input.actorUserId) {
        await registrarLogAuditoria({
            actorUserId: input.actorUserId,
            acao: input.mode === "AUTO" ? "LGPD_RETENTION_AUTO_RUN" : "LGPD_RETENTION_MANUAL_RUN",
            entidade: "RetentionPolicy",
            entidadeId: activePolicies.map((item) => item.id).join(","),
            dadosDepois: {
                policies: results.map((item) => item.policy.entityName),
                executions: results.map((item) => item.execution.id),
                dryRun: Boolean(input.dryRun),
            },
        });
    }

    return {
        policiesProcessed: results.length,
        executions: results.map((item) => ({
            executionId: item.execution.id,
            entityName: item.policy.entityName,
            status: item.execution.status,
            processedCount: item.execution.processedCount,
            errorCount: item.execution.errorCount,
        })),
    };
}
