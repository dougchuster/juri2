"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import { registrarLogAuditoria } from "@/lib/services/audit-log";
import { getLgpdAllowedNextStatuses } from "@/lib/services/lgpd-core";
import { generateLgpdDataExport } from "@/lib/services/lgpd-export";
import { applyClienteLgpdOperation } from "@/lib/services/lgpd-operations";
import {
    executeActiveRetentionPolicies,
    executeRetentionPolicy,
    upsertRetentionPolicy,
} from "@/lib/services/lgpd-retention";

const lgpdRequestTypeSchema = z.enum([
    "ACESSO",
    "CORRECAO",
    "ANONIMIZACAO",
    "EXCLUSAO",
    "REVOGACAO_CONSENTIMENTO",
    "OUTRO",
]);

const lgpdRequestStatusSchema = z.enum([
    "ABERTA",
    "EM_ANALISE",
    "EM_ATENDIMENTO",
    "CONCLUIDA",
    "CANCELADA",
]);

const createLgpdRequestSchema = z.object({
    clienteId: z.string().min(1, "Selecione o titular."),
    requestType: lgpdRequestTypeSchema,
    legalBasis: z.string().trim().min(3, "Informe a base legal ou contexto do pedido."),
    notes: z.string().trim().max(2000, "Observacao muito longa.").optional().or(z.literal("")),
});

const updateLgpdRequestStatusSchema = z.object({
    requestId: z.string().min(1, "Informe a solicitacao."),
    status: lgpdRequestStatusSchema,
    resolutionNotes: z.string().trim().max(2000, "Observacao muito longa.").optional().or(z.literal("")),
});

const generateLgpdExportSchema = z.object({
    requestId: z.string().min(1, "Informe a solicitacao."),
});

const executeLgpdRequestSchema = z.object({
    requestId: z.string().min(1, "Informe a solicitacao."),
    resolutionNotes: z.string().trim().max(2000, "Observacao muito longa.").optional().or(z.literal("")),
});

const retentionPolicyEntitySchema = z.enum(["LGPD_DATA_EXPORT", "CLIENTE_ARQUIVADO"]);

const upsertRetentionPolicySchema = z.object({
    entityName: retentionPolicyEntitySchema,
    retentionDays: z.coerce.number().int().min(0, "Retencao deve ser zero ou positiva.").max(3650, "Retencao muito longa."),
    isActive: z.coerce.boolean(),
    notes: z.string().trim().max(1000, "Observacao muito longa.").optional().or(z.literal("")),
});

const executeRetentionPolicySchema = z.object({
    policyId: z.string().min(1, "Informe a politica."),
    dryRun: z.coerce.boolean().optional().default(false),
});

const executeAllRetentionPoliciesSchema = z.object({
    dryRun: z.coerce.boolean().optional().default(false),
});

async function requireLgpdSession() {
    const session = await getSession();
    if (!session?.id) {
        throw new Error("Sessao invalida.");
    }

    if (!["ADMIN", "SOCIO", "CONTROLADOR"].includes(String(session.role))) {
        throw new Error("Sem permissao para operar LGPD.");
    }

    return session;
}

async function resolveEscritorioId() {
    const escritorio = await db.escritorio.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
    });

    if (!escritorio?.id) {
        throw new Error("Nenhum escritorio configurado para registrar a solicitacao.");
    }

    return escritorio.id;
}

function revalidateLgpdPaths(clienteId?: string | null) {
    revalidatePath("/admin/lgpd");
    if (clienteId) {
        revalidatePath(`/crm/contatos/${clienteId}`);
    }
}

export async function createLgpdRequestAction(input: z.infer<typeof createLgpdRequestSchema>) {
    const parsed = createLgpdRequestSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const session = await requireLgpdSession();
        const escritorioId = await resolveEscritorioId();

        const cliente = await db.cliente.findUnique({
            where: { id: parsed.data.clienteId },
            select: { id: true, nome: true },
        });
        if (!cliente) {
            return { success: false, error: "Titular nao encontrado." };
        }

        const request = await db.lgpdRequest.create({
            data: {
                escritorioId,
                clienteId: cliente.id,
                requestType: parsed.data.requestType,
                legalBasis: parsed.data.legalBasis,
                notes: parsed.data.notes || null,
                requestedById: session.id,
            },
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "LGPD_REQUEST_OPENED",
            entidade: "LGPD_REQUEST",
            entidadeId: request.id,
            dadosDepois: {
                clienteId: cliente.id,
                clienteNome: cliente.nome,
                requestType: request.requestType,
                legalBasis: request.legalBasis,
                notes: request.notes,
            },
        });

        revalidateLgpdPaths(cliente.id);

        return { success: true, requestId: request.id };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao abrir solicitacao LGPD.",
        };
    }
}

export async function updateLgpdRequestStatusAction(input: z.infer<typeof updateLgpdRequestStatusSchema>) {
    const parsed = updateLgpdRequestStatusSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const session = await requireLgpdSession();
        const existing = await db.lgpdRequest.findUnique({
            where: { id: parsed.data.requestId },
            select: {
                id: true,
                status: true,
                clienteId: true,
                assignedToId: true,
                startedAt: true,
                completedAt: true,
                resolutionNotes: true,
            },
        });

        if (!existing) {
            return { success: false, error: "Solicitacao LGPD nao encontrada." };
        }

        const allowed = getLgpdAllowedNextStatuses(existing.status);
        if (!allowed.includes(parsed.data.status)) {
            return { success: false, error: "Transicao de status invalida para esta solicitacao." };
        }

        const now = new Date();
        const isClosingStatus = parsed.data.status === "CONCLUIDA" || parsed.data.status === "CANCELADA";

        const updated = await db.lgpdRequest.update({
            where: { id: existing.id },
            data: {
                status: parsed.data.status,
                assignedToId:
                    parsed.data.status === "EM_ATENDIMENTO" && !existing.assignedToId
                        ? session.id
                        : existing.assignedToId,
                startedAt:
                    parsed.data.status === "EM_ATENDIMENTO" && !existing.startedAt
                        ? now
                        : existing.startedAt,
                completedAt: isClosingStatus ? now : existing.completedAt,
                resolutionNotes:
                    parsed.data.resolutionNotes !== undefined && parsed.data.resolutionNotes !== ""
                        ? parsed.data.resolutionNotes
                        : existing.resolutionNotes,
            },
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "LGPD_REQUEST_STATUS_UPDATED",
            entidade: "LGPD_REQUEST",
            entidadeId: updated.id,
            dadosAntes: {
                status: existing.status,
                assignedToId: existing.assignedToId,
                completedAt: existing.completedAt?.toISOString() || null,
                resolutionNotes: existing.resolutionNotes,
            },
            dadosDepois: {
                status: updated.status,
                assignedToId: updated.assignedToId,
                completedAt: updated.completedAt?.toISOString() || null,
                resolutionNotes: updated.resolutionNotes,
            },
        });

        revalidateLgpdPaths(existing.clienteId);

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao atualizar solicitacao LGPD.",
        };
    }
}

export async function generateLgpdExportAction(input: z.infer<typeof generateLgpdExportSchema>) {
    const parsed = generateLgpdExportSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const session = await requireLgpdSession();

        const result = await db.$transaction(async (tx) => {
            const existing = await tx.lgpdRequest.findUnique({
                where: { id: parsed.data.requestId },
                select: {
                    id: true,
                    clienteId: true,
                    status: true,
                    assignedToId: true,
                    startedAt: true,
                },
            });

            if (!existing) {
                throw new Error("Solicitacao LGPD nao encontrada.");
            }

            const exportResult = await generateLgpdDataExport(tx as unknown as typeof db, {
                requestId: existing.id,
                actorUserId: session.id,
            });

            if (existing.status === "ABERTA" || existing.status === "EM_ANALISE") {
                await tx.lgpdRequest.update({
                    where: { id: existing.id },
                    data: {
                        status: "EM_ATENDIMENTO",
                        assignedToId: existing.assignedToId || session.id,
                        startedAt: existing.startedAt || new Date(),
                    },
                });
            }

            return exportResult;
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "LGPD_EXPORT_GENERATED",
            entidade: "LGPD_REQUEST",
            entidadeId: parsed.data.requestId,
            dadosDepois: {
                exportId: result.exportRow.id,
                fileUrl: result.exportRow.fileUrl,
                expiresAt: result.exportRow.expiresAt.toISOString(),
                payloadSizeBytes: result.exportRow.payloadSizeBytes,
            },
        });

        revalidateLgpdPaths(result.request.clienteId);

        return {
            success: true,
            exportId: result.exportRow.id,
            fileUrl: result.exportRow.fileUrl,
            expiresAt: result.exportRow.expiresAt.toISOString(),
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao gerar exportacao LGPD.",
        };
    }
}

export async function executeLgpdRequestAction(input: z.infer<typeof executeLgpdRequestSchema>) {
    const parsed = executeLgpdRequestSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const session = await requireLgpdSession();
        const escritorioId = await resolveEscritorioId();

        const result = await db.$transaction(async (tx) => {
            const request = await tx.lgpdRequest.findUnique({
                where: { id: parsed.data.requestId },
                select: {
                    id: true,
                    clienteId: true,
                    requestType: true,
                    status: true,
                    startedAt: true,
                    assignedToId: true,
                },
            });

            if (!request) {
                throw new Error("Solicitacao LGPD nao encontrada.");
            }

            if (!["ANONIMIZACAO", "EXCLUSAO", "REVOGACAO_CONSENTIMENTO"].includes(request.requestType)) {
                throw new Error("Esta solicitacao exige outra forma de atendimento.");
            }

            if (request.status === "CONCLUIDA" || request.status === "CANCELADA") {
                throw new Error("Solicitacao ja encerrada.");
            }

            const executableRequestType = request.requestType as
                | "ANONIMIZACAO"
                | "EXCLUSAO"
                | "REVOGACAO_CONSENTIMENTO";

            await applyClienteLgpdOperation(tx, {
                clienteId: request.clienteId,
                escritorioId,
                actorUserId: session.id,
                requestType: executableRequestType,
                details: parsed.data.resolutionNotes || `Execucao LGPD via painel administrativo`,
            });

            const updatedRequest = await tx.lgpdRequest.update({
                where: { id: request.id },
                data: {
                    status: "CONCLUIDA",
                    assignedToId: request.assignedToId || session.id,
                    startedAt: request.startedAt || new Date(),
                    completedAt: new Date(),
                    resolutionNotes:
                        parsed.data.resolutionNotes !== undefined && parsed.data.resolutionNotes !== ""
                            ? parsed.data.resolutionNotes
                            : null,
                },
            });

            return updatedRequest;
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "LGPD_REQUEST_EXECUTED",
            entidade: "LGPD_REQUEST",
            entidadeId: result.id,
            dadosDepois: {
                status: result.status,
                completedAt: result.completedAt?.toISOString() || null,
                resolutionNotes: result.resolutionNotes,
            },
        });

        revalidateLgpdPaths(result.clienteId);

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao executar solicitacao LGPD.",
        };
    }
}

export async function upsertRetentionPolicyAction(input: z.infer<typeof upsertRetentionPolicySchema>) {
    const parsed = upsertRetentionPolicySchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const session = await requireLgpdSession();
        const policy = await upsertRetentionPolicy({
            entityName: parsed.data.entityName,
            retentionDays: parsed.data.retentionDays,
            isActive: parsed.data.isActive,
            notes: parsed.data.notes || null,
            actorUserId: session.id,
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "LGPD_RETENTION_POLICY_UPSERTED",
            entidade: "RetentionPolicy",
            entidadeId: policy.id,
            dadosDepois: {
                entityName: policy.entityName,
                actionType: policy.actionType,
                retentionDays: policy.retentionDays,
                isActive: policy.isActive,
                notes: policy.notes,
            },
        });

        revalidatePath("/admin/lgpd");

        return { success: true, policyId: policy.id };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao salvar politica de retencao.",
        };
    }
}

export async function executeRetentionPolicyAction(input: z.infer<typeof executeRetentionPolicySchema>) {
    const parsed = executeRetentionPolicySchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const session = await requireLgpdSession();
        const result = await executeRetentionPolicy({
            policyId: parsed.data.policyId,
            mode: "MANUAL",
            actorUserId: session.id,
            dryRun: parsed.data.dryRun,
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "LGPD_RETENTION_POLICY_EXECUTED",
            entidade: "RetentionPolicy",
            entidadeId: result.policy.id,
            dadosDepois: {
                executionId: result.execution.id,
                status: result.execution.status,
                mode: result.execution.mode,
                dryRun: result.execution.dryRun,
                processedCount: result.execution.processedCount,
                errorCount: result.execution.errorCount,
            },
        });

        revalidatePath("/admin/lgpd");

        return {
            success: true,
            executionId: result.execution.id,
            status: result.execution.status,
            processedCount: result.execution.processedCount,
            errorCount: result.execution.errorCount,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao executar politica de retencao.",
        };
    }
}

export async function executeAllRetentionPoliciesAction(
    input: z.infer<typeof executeAllRetentionPoliciesSchema> = { dryRun: false }
) {
    const parsed = executeAllRetentionPoliciesSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const session = await requireLgpdSession();
        const result = await executeActiveRetentionPolicies({
            mode: "MANUAL",
            actorUserId: session.id,
            dryRun: parsed.data.dryRun,
        });

        revalidatePath("/admin/lgpd");

        return {
            success: true,
            result,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao executar politicas de retencao.",
        };
    }
}
