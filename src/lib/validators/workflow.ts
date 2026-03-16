import { z } from "zod";

export const workflowTemplateSchema = z.object({
    nome: z.string().min(2, "Nome é obrigatório"),
    descricao: z.string().max(500).optional().or(z.literal("")),
    faseProcessualId: z.string().optional().or(z.literal("")),
});
export type WorkflowTemplateFormData = z.infer<typeof workflowTemplateSchema>;

export const workflowEtapaSchema = z.object({
    titulo: z.string().min(2, "Título é obrigatório"),
    descricao: z.string().max(500).optional().or(z.literal("")),
    pontos: z.coerce.number().int().min(1).max(100).default(1),
    diasPrazo: z.coerce.number().int().min(1).max(365).default(3),
});
export type WorkflowEtapaFormData = z.infer<typeof workflowEtapaSchema>;
