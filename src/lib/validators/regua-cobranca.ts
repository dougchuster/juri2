import { z } from "zod";

export const reguaCobrancaChannelSchema = z.enum(["WHATSAPP", "EMAIL"]);

export const reguaCobrancaStepSchema = z.object({
    id: z.string().trim().min(1, "Identificador da etapa obrigatorio"),
    label: z.string().trim().min(2, "Nome da etapa obrigatorio"),
    dayOffset: z.coerce.number().int().min(-30).max(180),
    active: z.coerce.boolean(),
    channels: z.array(reguaCobrancaChannelSchema).min(1, "Informe ao menos um canal"),
    whatsappTemplate: z.string().trim().min(2, "Template WhatsApp obrigatorio"),
    emailSubject: z.string().trim().min(2, "Assunto do email obrigatorio"),
    emailTemplate: z.string().trim().min(2, "Template do email obrigatorio"),
});

export const reguaCobrancaConfigSchema = z.object({
    enabled: z.coerce.boolean(),
    syncGatewayBeforeRun: z.coerce.boolean(),
    maxInvoicesPerRun: z.coerce.number().int().min(1).max(1000),
    steps: z.array(reguaCobrancaStepSchema).min(1, "Informe ao menos uma etapa"),
});

export type ReguaCobrancaConfigInput = z.infer<typeof reguaCobrancaConfigSchema>;
export type ReguaCobrancaStepInput = z.infer<typeof reguaCobrancaStepSchema>;
