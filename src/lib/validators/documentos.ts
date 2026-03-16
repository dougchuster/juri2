import { z } from "zod";

const optionalId = z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => {
        const normalized = (value || "").trim();
        return normalized || null;
    });

export const documentoVersionSchema = z.object({
    titulo: z.string().trim().min(2, "Titulo deve ter no minimo 2 caracteres."),
    categoriaId: optionalId,
    pastaId: optionalId,
    conteudo: z
        .string()
        .optional()
        .or(z.literal(""))
        .transform((value) => {
            const normalized = (value || "").trim();
            return normalized || null;
        }),
    resumoAlteracoes: z
        .string()
        .max(2000, "Resumo de alteracoes deve ter no maximo 2000 caracteres.")
        .optional()
        .or(z.literal(""))
        .transform((value) => {
            const normalized = (value || "").trim();
            return normalized || null;
        }),
});

export const documentoComentarioSchema = z.object({
    conteudo: z.string().trim().min(3, "Comentario deve ter no minimo 3 caracteres.").max(4000),
});

export const documentoRestoreSchema = z.object({
    versaoId: z.string().min(1, "Versao e obrigatoria."),
    motivo: z
        .string()
        .max(2000, "Motivo deve ter no maximo 2000 caracteres.")
        .optional()
        .or(z.literal(""))
        .transform((value) => {
            const normalized = (value || "").trim();
            return normalized || null;
        }),
});

export type DocumentoVersionFormData = z.infer<typeof documentoVersionSchema>;
export type DocumentoComentarioFormData = z.infer<typeof documentoComentarioSchema>;
export type DocumentoRestoreFormData = z.infer<typeof documentoRestoreSchema>;
