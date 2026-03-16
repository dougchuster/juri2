import { z } from "zod";

export const clienteSchema = z.object({
    tipoPessoa: z.enum(["FISICA", "JURIDICA"]).default("FISICA"),
    status: z.enum(["PROSPECTO", "ATIVO", "INATIVO", "ARQUIVADO"]).default("PROSPECTO"),

    // Pessoa Física
    nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(200),
    cpf: z
        .string()
        .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, "CPF inválido")
        .optional()
        .or(z.literal("")),
    rg: z.string().max(20).optional().or(z.literal("")),
    dataNascimento: z.string().optional().or(z.literal("")),

    // Pessoa Jurídica
    razaoSocial: z.string().max(300).optional().or(z.literal("")),
    cnpj: z
        .string()
        .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/, "CNPJ inválido")
        .optional()
        .or(z.literal("")),
    nomeFantasia: z.string().max(300).optional().or(z.literal("")),

    // Contato
    email: z.string().email("E-mail inválido").optional().or(z.literal("")),
    telefone: z.string().max(20).optional().or(z.literal("")),
    celular: z.string().max(20).optional().or(z.literal("")),
    whatsapp: z.string().max(20).optional().or(z.literal("")),

    // Endereço
    endereco: z.string().max(300).optional().or(z.literal("")),
    numero: z.string().max(10).optional().or(z.literal("")),
    complemento: z.string().max(100).optional().or(z.literal("")),
    bairro: z.string().max(100).optional().or(z.literal("")),
    cidade: z.string().max(100).optional().or(z.literal("")),
    estado: z.string().max(2).optional().or(z.literal("")),
    cep: z.string().max(10).optional().or(z.literal("")),

    // Relacionamentos
    origemId: z.string().optional().or(z.literal("")),
    observacoes: z.string().max(2000).optional().or(z.literal("")),
});

export type ClienteFormData = z.infer<typeof clienteSchema>;
