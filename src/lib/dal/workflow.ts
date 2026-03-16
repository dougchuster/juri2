import "server-only";
import { db } from "@/lib/db";

export async function getWorkflowTemplates() {
    return db.workflowTemplate.findMany({
        include: {
            faseProcessual: { select: { id: true, nome: true, cor: true } },
            etapas: { orderBy: { ordem: "asc" } },
        },
        orderBy: { nome: "asc" },
    });
}

export async function getWorkflowTemplateById(id: string) {
    return db.workflowTemplate.findUnique({
        where: { id },
        include: {
            faseProcessual: { select: { id: true, nome: true, cor: true } },
            etapas: { orderBy: { ordem: "asc" } },
        },
    });
}
