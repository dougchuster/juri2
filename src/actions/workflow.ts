"use server";

import { db } from "@/lib/db";
import { workflowTemplateSchema, workflowEtapaSchema } from "@/lib/validators/workflow";
import type { WorkflowTemplateFormData, WorkflowEtapaFormData } from "@/lib/validators/workflow";
import { revalidatePath } from "next/cache";
import { getEscritorioIdOptional } from "@/lib/tenant";

function emptyToNull(val: unknown) {
    return val === "" ? null : val;
}

// ── Templates ──

export async function createWorkflowTemplate(formData: WorkflowTemplateFormData) {
    const parsed = workflowTemplateSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const d = parsed.data;
        await db.workflowTemplate.create({
            data: {
                nome: d.nome,
                descricao: emptyToNull(d.descricao) as string | null,
                faseProcessualId: emptyToNull(d.faseProcessualId) as string | null,
            },
        });
        revalidatePath("/admin/workflows");
        return { success: true };
    } catch (error) {
        console.error("Error creating workflow:", error);
        return { success: false, error: { _form: ["Erro ao criar workflow."] } };
    }
}

export async function toggleWorkflowTemplate(id: string) {
    try {
        const wf = await db.workflowTemplate.findUnique({ where: { id }, select: { ativo: true } });
        if (!wf) return { success: false, error: "Workflow não encontrado." };

        await db.workflowTemplate.update({ where: { id }, data: { ativo: !wf.ativo } });
        revalidatePath("/admin/workflows");
        return { success: true };
    } catch (error) {
        console.error("Error toggling workflow:", error);
        return { success: false, error: "Erro ao atualizar workflow." };
    }
}

export async function deleteWorkflowTemplate(id: string) {
    try {
        await db.workflowTemplate.delete({ where: { id } });
        revalidatePath("/admin/workflows");
        return { success: true };
    } catch (error) {
        console.error("Error deleting workflow:", error);
        return { success: false, error: "Erro ao excluir workflow." };
    }
}

// ── Etapas ──

export async function addWorkflowEtapa(templateId: string, formData: WorkflowEtapaFormData) {
    const parsed = workflowEtapaSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const d = parsed.data;
        const maxOrder = await db.workflowEtapa.findFirst({
            where: { workflowTemplateId: templateId },
            orderBy: { ordem: "desc" },
            select: { ordem: true },
        });

        await db.workflowEtapa.create({
            data: {
                workflowTemplateId: templateId,
                titulo: d.titulo,
                descricao: emptyToNull(d.descricao) as string | null,
                pontos: d.pontos,
                diasPrazo: d.diasPrazo,
                ordem: (maxOrder?.ordem ?? -1) + 1,
            },
        });

        revalidatePath("/admin/workflows");
        return { success: true };
    } catch (error) {
        console.error("Error adding etapa:", error);
        return { success: false, error: { _form: ["Erro ao adicionar etapa."] } };
    }
}

export async function deleteWorkflowEtapa(id: string) {
    try {
        await db.workflowEtapa.delete({ where: { id } });
        revalidatePath("/admin/workflows");
        return { success: true };
    } catch (error) {
        console.error("Error deleting etapa:", error);
        return { success: false, error: "Erro ao excluir etapa." };
    }
}

// ── Apply workflow to processo (creates tarefas from template) ──

export async function applyWorkflowToProcesso(templateId: string, processoId: string, advogadoId: string, criadoPorId: string) {
    try {
        const template = await db.workflowTemplate.findUnique({
            where: { id: templateId },
            include: { etapas: { orderBy: { ordem: "asc" } } },
        });

        if (!template || template.etapas.length === 0) {
            return { success: false, error: "Workflow sem etapas." };
        }

        const escritorioId = await getEscritorioIdOptional();
        const now = new Date();
        for (const etapa of template.etapas) {
            const dataLimite = new Date(now);
            dataLimite.setDate(dataLimite.getDate() + etapa.diasPrazo);

            await db.tarefa.create({
                data: {
                    titulo: etapa.titulo,
                    descricao: etapa.descricao,
                    pontos: etapa.pontos,
                    processoId,
                    advogadoId,
                    criadoPorId,
                    dataLimite,
                    status: "A_FAZER",
                    prioridade: "NORMAL",
                    escritorioId: escritorioId ?? null,
                },
            });
        }

        revalidatePath("/tarefas");
        revalidatePath(`/processos/${processoId}`);
        return { success: true, count: template.etapas.length };
    } catch (error) {
        console.error("Error applying workflow:", error);
        return { success: false, error: "Erro ao aplicar workflow." };
    }
}
