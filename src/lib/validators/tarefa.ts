import { z } from "zod";

export const tarefaSchema = z.object({
    titulo: z.string().min(2, "Título deve ter no mínimo 2 caracteres"),
    descricao: z.string().max(2000).optional().or(z.literal("")),
    prioridade: z.enum(["URGENTE", "ALTA", "NORMAL", "BAIXA"]).default("NORMAL"),
    status: z.enum(["A_FAZER", "EM_ANDAMENTO", "REVISAO", "CONCLUIDA", "CANCELADA"]).default("A_FAZER"),
    pontos: z.coerce.number().int().min(1).max(100).default(1),
    dataLimite: z.string().optional().or(z.literal("")),
    processoId: z.string().optional().or(z.literal("")),
    advogadoId: z.string().min(1, "Responsável é obrigatório"),
    horasEstimadas: z.coerce.number().min(0).optional(),
});

export type TarefaFormData = z.infer<typeof tarefaSchema>;

export const tarefaComentarioSchema = z.object({
    conteudo: z.string().min(1, "Comentário não pode ser vazio"),
});

export type TarefaComentarioFormData = z.infer<typeof tarefaComentarioSchema>;

export const tarefaChecklistSchema = z.object({
    texto: z.string().min(1, "Texto não pode ser vazio"),
});

export type TarefaChecklistFormData = z.infer<typeof tarefaChecklistSchema>;
