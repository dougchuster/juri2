"use server";

import { getSession } from "@/actions/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { registrarLogAuditoria } from "@/lib/services/audit-log";
import {
    cancelJobCenterItem,
    retryJobCenterItem,
    type JobCenterSourceType,
} from "@/lib/services/job-center";

const sourceTypeSchema = z.enum(["AUTOMACAO_NACIONAL_JOB", "FLOW_EXECUTION"]);

const retrySchema = z.object({
    sourceType: sourceTypeSchema,
    sourceId: z.string().min(1, "Informe o item."),
    reason: z.string().min(5, "Informe um motivo mais detalhado."),
});

const cancelSchema = z.object({
    sourceType: sourceTypeSchema,
    sourceId: z.string().min(1, "Informe o item."),
});

function getEntityName(sourceType: JobCenterSourceType) {
    return sourceType === "AUTOMACAO_NACIONAL_JOB" ? "AUTOMACAO_JOB" : "FLOW_EXECUTION";
}

async function requireJobCenterSession() {
    const session = await getSession();
    if (!session?.id) {
        throw new Error("Sessao invalida.");
    }

    if (!["ADMIN", "SOCIO", "CONTROLADOR"].includes(String(session.role))) {
        throw new Error("Sem permissao para operar a Central de Jobs.");
    }

    return session;
}

function revalidateJobCenterPaths(sourceType: JobCenterSourceType, sourceId: string) {
    revalidatePath("/admin/jobs");
    revalidatePath(`/admin/jobs/${sourceType}/${sourceId}`);
    revalidatePath("/admin/publicacoes");
}

export async function retryJobCenterAction(input: z.infer<typeof retrySchema>) {
    const parsed = retrySchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const session = await requireJobCenterSession();
        const result = await retryJobCenterItem({
            sourceType: parsed.data.sourceType,
            sourceId: parsed.data.sourceId,
            actorUserId: session.id,
            reason: parsed.data.reason,
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "JOB_CENTER_RETRY",
            entidade: getEntityName(parsed.data.sourceType),
            entidadeId: parsed.data.sourceId,
            dadosDepois: {
                reason: parsed.data.reason,
                newSourceType: result.newSourceType,
                newSourceId: result.newSourceId,
            },
        });

        revalidateJobCenterPaths(parsed.data.sourceType, parsed.data.sourceId);
        revalidatePath(`/admin/jobs/${result.newSourceType}/${result.newSourceId}`);

        return {
            success: true,
            result,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao reprocessar item.",
        };
    }
}

export async function cancelJobCenterAction(input: z.infer<typeof cancelSchema>) {
    const parsed = cancelSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const session = await requireJobCenterSession();
        const result = await cancelJobCenterItem({
            sourceType: parsed.data.sourceType,
            sourceId: parsed.data.sourceId,
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "JOB_CENTER_CANCEL",
            entidade: getEntityName(parsed.data.sourceType),
            entidadeId: parsed.data.sourceId,
            dadosDepois: {
                cancelled: result.cancelled,
            },
        });

        revalidateJobCenterPaths(parsed.data.sourceType, parsed.data.sourceId);

        return {
            success: true,
            result,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao cancelar item.",
        };
    }
}
