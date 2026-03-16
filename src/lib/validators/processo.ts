import { z } from "zod";

const CNJ_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

function normalizeNumeroCnj(input: string) {
    const raw = (input || "").trim();
    if (!raw) return "";

    const digits = raw.replace(/\D/g, "");
    if (digits.length === 20) {
        return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
    }
    return raw;
}

const numeroCnjSchema = z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => normalizeNumeroCnj(value || ""))
    .refine((value) => value === "" || CNJ_REGEX.test(value), {
        message: "Numero CNJ invalido. Use o formato NNNNNNN-DD.AAAA.J.TR.OOOO.",
    });

export const processoSchema = z.object({
    tipo: z.enum(["JUDICIAL", "ADMINISTRATIVO", "CONSULTIVO", "SERVICO", "PROSPECCAO"]).default("JUDICIAL"),
    status: z.enum([
        "PROSPECCAO", "CONSULTORIA", "AJUIZADO", "EM_ANDAMENTO",
        "AUDIENCIA_MARCADA", "SENTENCA", "RECURSO", "TRANSITO_JULGADO",
        "EXECUCAO", "ENCERRADO", "ARQUIVADO",
    ]).default("EM_ANDAMENTO"),
    resultado: z.enum(["GANHO", "PERDIDO", "ACORDO", "DESISTENCIA", "PENDENTE"]).default("PENDENTE"),

    numeroCnj: numeroCnjSchema,
    tipoAcaoId: z.string().optional().or(z.literal("")),
    faseProcessualId: z.string().optional().or(z.literal("")),

    tribunal: z.string().max(100).optional().or(z.literal("")),
    vara: z.string().max(100).optional().or(z.literal("")),
    comarca: z.string().max(100).optional().or(z.literal("")),
    foro: z.string().max(100).optional().or(z.literal("")),
    objeto: z.string().max(500).optional().or(z.literal("")),

    valorCausa: z.string().optional().or(z.literal("")),
    valorContingencia: z.string().optional().or(z.literal("")),
    riscoContingencia: z.string().max(20).optional().or(z.literal("")),

    dataDistribuicao: z.string().optional().or(z.literal("")),
    dataEncerramento: z.string().optional().or(z.literal("")),

    advogadoId: z.string().min(1, "Advogado responsavel e obrigatorio"),
    clienteId: z.string().optional().or(z.literal("")),

    observacoes: z.string().max(2000).optional().or(z.literal("")),
});

export type ProcessoFormData = z.infer<typeof processoSchema>;

export const movimentacaoSchema = z.object({
    data: z.string().min(1, "Data é obrigatória"),
    descricao: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres"),
    tipo: z.string().optional().or(z.literal("")),
    fonte: z.string().optional().or(z.literal("")),
});

export type MovimentacaoFormData = z.infer<typeof movimentacaoSchema>;

// --- Partes do Processo ---
export const parteProcessoSchema = z.object({
    tipoParte: z.enum(["AUTOR", "REU", "TERCEIRO", "TESTEMUNHA", "PERITO", "ASSISTENTE_TECNICO"]),
    clienteId: z.string().optional().or(z.literal("")),
    nome: z.string().max(200).optional().or(z.literal("")),
    cpfCnpj: z.string().max(20).optional().or(z.literal("")),
    advogado: z.string().max(200).optional().or(z.literal("")),
});

export type ParteProcessoFormData = z.infer<typeof parteProcessoSchema>;

// --- Audiências ---
export const audienciaSchema = z.object({
    tipo: z.enum(["CONCILIACAO", "INSTRUCAO", "JULGAMENTO", "UNA", "OUTRA"]),
    data: z.string().min(1, "Data é obrigatória"),
    advogadoId: z.string().min(1, "Advogado é obrigatório"),
    local: z.string().max(200).optional().or(z.literal("")),
    sala: z.string().max(100).optional().or(z.literal("")),
    observacoes: z.string().max(2000).optional().or(z.literal("")),
});

export type AudienciaFormData = z.infer<typeof audienciaSchema>;

// --- Prazos ---
export const prazoSchema = z.object({
    descricao: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres"),
    dataFatal: z.string().min(1, "Data fatal é obrigatória"),
    tipoContagem: z.enum(["DIAS_UTEIS", "DIAS_CORRIDOS"]).default("DIAS_UTEIS"),
    advogadoId: z.string().min(1, "Advogado é obrigatório"),
    fatal: z.boolean().default(true),
    observacoes: z.string().max(2000).optional().or(z.literal("")),
});

export type PrazoFormData = z.infer<typeof prazoSchema>;

// --- Documentos ---
export const documentoSchema = z.object({
    titulo: z.string().min(2, "Título deve ter no mínimo 2 caracteres"),
    categoria: z.string().min(1, "Categoria é obrigatória"),
    arquivoNome: z.string().optional().or(z.literal("")),
    arquivoUrl: z.string().optional().or(z.literal("")),
});

export type DocumentoFormData = z.infer<typeof documentoSchema>;
