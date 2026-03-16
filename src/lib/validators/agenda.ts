import { z } from "zod";

// Prazo
export const prazoSchema = z.object({
    processoId: z.string().min(1, "Processo e obrigatorio"),
    advogadoId: z.string().min(1, "Advogado responsavel e obrigatorio"),
    descricao: z.string().min(3, "Descricao e obrigatoria"),
    dataFatal: z.string().min(1, "Data fatal e obrigatoria"),
    dataCortesia: z.string().optional().or(z.literal("")),
    tipoContagem: z.enum(["DIAS_UTEIS", "DIAS_CORRIDOS"]).default("DIAS_UTEIS"),
    fatal: z.coerce.boolean().default(true),
    observacoes: z.string().max(1000).optional().or(z.literal("")),
});
export type PrazoFormData = z.infer<typeof prazoSchema>;

export const updatePrazoSchema = prazoSchema.extend({
    id: z.string().min(1, "Prazo e obrigatorio"),
});
export type UpdatePrazoFormData = z.infer<typeof updatePrazoSchema>;

// Audiencia
export const audienciaSchema = z.object({
    processoId: z.string().min(1, "Processo e obrigatorio"),
    advogadoId: z.string().min(1, "Advogado responsavel e obrigatorio"),
    tipo: z.enum(["CONCILIACAO", "INSTRUCAO", "JULGAMENTO", "UNA", "OUTRA"]),
    data: z.string().min(1, "Data e obrigatoria"),
    local: z.string().max(200).optional().or(z.literal("")),
    sala: z.string().max(100).optional().or(z.literal("")),
    observacoes: z.string().max(1000).optional().or(z.literal("")),
});
export type AudienciaFormData = z.infer<typeof audienciaSchema>;

// Compromisso
export const compromissoSchema = z.object({
    advogadoId: z.string().min(1, "Advogado e obrigatorio"),
    clienteId: z.string().optional().or(z.literal("")),
    atendimentoId: z.string().optional().or(z.literal("")),
    tipo: z.enum(["REUNIAO", "CONSULTA", "VISITA", "DILIGENCIA", "OUTRO"]),
    titulo: z.string().min(2, "Titulo e obrigatorio"),
    descricao: z.string().max(1000).optional().or(z.literal("")),
    dataInicio: z.string().min(1, "Data/hora de inicio e obrigatoria"),
    dataFim: z.string().optional().or(z.literal("")),
    local: z.string().max(200).optional().or(z.literal("")),
});
export type CompromissoFormData = z.infer<typeof compromissoSchema>;
