import { z } from "zod";

// ── Honorário ──
export const honorarioSchema = z.object({
    processoId: z.string().min(1, "Processo é obrigatório"),
    clienteId: z.string().min(1, "Cliente é obrigatório"),
    tipo: z.enum(["FIXO", "EXITO", "POR_HORA", "MISTO"]),
    status: z.enum(["ATIVO", "SUSPENSO", "ENCERRADO"]).default("ATIVO"),
    valorTotal: z.string().min(1, "Valor total é obrigatório"),
    percentualExito: z.string().optional().or(z.literal("")),
    valorHora: z.string().optional().or(z.literal("")),
    descricao: z.string().max(500).optional().or(z.literal("")),
    dataContrato: z.string().min(1, "Data do contrato é obrigatória"),
});
export type HonorarioFormData = z.infer<typeof honorarioSchema>;

// ── Fatura ──
export const faturaSchema = z.object({
    honorarioId: z.string().optional().or(z.literal("")),
    clienteId: z.string().min(1, "Cliente é obrigatório"),
    valorTotal: z.string().min(1, "Valor é obrigatório"),
    dataEmissao: z.string().min(1, "Data de emissão é obrigatória"),
    dataVencimento: z.string().min(1, "Data de vencimento é obrigatória"),
    descricao: z.string().max(500).optional().or(z.literal("")),
    recorrente: z.coerce.boolean().default(false),
    centroCustoId: z.string().optional().or(z.literal("")),
    parcelas: z.coerce.number().int().min(1).max(48).default(1),
});
export type FaturaFormData = z.infer<typeof faturaSchema>;

// ── Conta a Pagar ──
export const contaPagarSchema = z.object({
    descricao: z.string().min(2, "Descrição é obrigatória"),
    tipo: z.enum(["CUSTO_PROCESSUAL", "DESPESA_ESCRITORIO", "FORNECEDOR", "IMPOSTO", "OUTRO"]).default("DESPESA_ESCRITORIO"),
    valor: z.string().min(1, "Valor é obrigatório"),
    dataVencimento: z.string().min(1, "Data de vencimento é obrigatória"),
    processoId: z.string().optional().or(z.literal("")),
    centroCustoId: z.string().optional().or(z.literal("")),
    contaBancariaId: z.string().optional().or(z.literal("")),
});
export type ContaPagarFormData = z.infer<typeof contaPagarSchema>;
