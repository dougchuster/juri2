import { z } from "zod";

export const publicacaoSchema = z.object({
    tribunal: z.string().min(1, "Tribunal e obrigatorio"),
    diario: z.string().optional().or(z.literal("")),
    dataPublicacao: z.string().min(1, "Data da publicacao e obrigatoria"),
    conteudo: z.string().min(10, "Conteudo e obrigatorio (min. 10 caracteres)"),
    identificador: z.string().optional().or(z.literal("")),
    processoNumero: z.string().optional().or(z.literal("")),
});
export type PublicacaoFormData = z.infer<typeof publicacaoSchema>;

export const importacaoLoteSchema = z.object({
    tribunal: z.string().min(1, "Tribunal e obrigatorio"),
    dataPublicacao: z.string().min(1, "Data e obrigatoria"),
    conteudoBruto: z.string().min(10, "Conteudo e obrigatorio"),
    clientePadraoId: z.string().optional().or(z.literal("")),
});
export type ImportacaoLoteFormData = z.infer<typeof importacaoLoteSchema>;

export const capturaOabSchema = z.object({
    dataInicio: z.string().min(1, "Data inicial obrigatoria"),
    dataFim: z.string().min(1, "Data final obrigatoria"),
    tribunaisCsv: z.string().optional().or(z.literal("")),
    limitePorConsulta: z.coerce.number().min(1).max(200).default(50),
    clientePadraoId: z.string().optional().or(z.literal("")),
});
export type CapturaOabFormData = z.infer<typeof capturaOabSchema>;

export const distribuicaoManualSchema = z.object({
    publicacaoId: z.string().min(1),
    advogadoId: z.string().min(1, "Advogado e obrigatorio"),
});
export type DistribuicaoManualFormData = z.infer<typeof distribuicaoManualSchema>;
