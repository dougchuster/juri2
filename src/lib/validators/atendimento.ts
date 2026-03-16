import { z } from "zod";

export const atendimentoSchema = z.object({
    clienteId: z.string().min(1, "Cliente e obrigatorio"),
    advogadoId: z.string().min(1, "Advogado e obrigatorio"),
    statusOperacional: z.enum([
        "NOVO",
        "TRIAGEM",
        "AGUARDANDO_CLIENTE",
        "AGUARDANDO_EQUIPE_INTERNA",
        "EM_ANALISE_JURIDICA",
        "AGUARDANDO_DOCUMENTOS",
        "REUNIAO_AGENDADA",
        "REUNIAO_CONFIRMADA",
        "PROPOSTA_ENVIADA",
        "EM_NEGOCIACAO",
        "CONTRATADO",
        "NAO_CONTRATADO",
        "ENCERRADO",
    ]).default("NOVO"),
    prioridade: z.enum(["BAIXA", "NORMAL", "ALTA", "URGENTE"]).default("NORMAL"),
    canal: z.enum(["PRESENCIAL", "TELEFONE", "EMAIL", "WHATSAPP", "SITE", "INDICACAO"]).default("PRESENCIAL"),
    assunto: z.string().min(2, "Assunto e obrigatorio"),
    resumo: z.string().max(2000).optional().or(z.literal("")),
    areaJuridica: z.string().max(80).optional().or(z.literal("")),
    origemAtendimento: z.string().max(80).optional().or(z.literal("")),
    proximaAcao: z.string().max(160).optional().or(z.literal("")),
    dataRetorno: z.string().optional().or(z.literal("")),
    proximaAcaoAt: z.string().optional().or(z.literal("")),
    dataReuniao: z.string().optional().or(z.literal("")),
    valorEstimado: z.string().optional().or(z.literal("")),
    motivoPerda: z.string().max(300).optional().or(z.literal("")),
    observacoesReuniao: z.string().max(1000).optional().or(z.literal("")),
    situacaoDocumental: z.enum(["SEM_DOCUMENTOS", "PARCIAL", "COMPLETA", "CONFERIDA"]).default("SEM_DOCUMENTOS"),
    statusReuniao: z.enum(["NAO_AGENDADA", "AGENDADA", "CONFIRMADA", "REMARCADA", "CANCELADA", "REALIZADA", "NAO_COMPARECEU"]).default("NAO_AGENDADA"),
});

export type AtendimentoFormData = z.infer<typeof atendimentoSchema>;

export const atendimentoHistoricoSchema = z.object({
    canal: z.enum(["PRESENCIAL", "TELEFONE", "EMAIL", "WHATSAPP", "SITE", "INDICACAO"]),
    descricao: z.string().min(3, "Descricao e obrigatoria"),
});

export type AtendimentoHistoricoFormData = z.infer<typeof atendimentoHistoricoSchema>;
