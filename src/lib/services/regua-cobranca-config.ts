import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";

export const REGUA_COBRANCA_CONFIG_KEY = "REGUA_COBRANCA_CONFIG";

export type ReguaCobrancaChannel = "WHATSAPP" | "EMAIL";

export interface ReguaCobrancaStepConfig {
    id: string;
    label: string;
    dayOffset: number;
    active: boolean;
    channels: ReguaCobrancaChannel[];
    whatsappTemplate: string;
    emailSubject: string;
    emailTemplate: string;
}

export interface ReguaCobrancaConfig {
    enabled: boolean;
    syncGatewayBeforeRun: boolean;
    maxInvoicesPerRun: number;
    steps: ReguaCobrancaStepConfig[];
}

export const DEFAULT_REGUA_COBRANCA_CONFIG: ReguaCobrancaConfig = {
    enabled: true,
    syncGatewayBeforeRun: true,
    maxInvoicesPerRun: 200,
    steps: [
        {
            id: "pre-vencimento-3",
            label: "Lembrete amigavel",
            dayOffset: -3,
            active: true,
            channels: ["WHATSAPP"],
            whatsappTemplate:
                "Ola, {nome}. Tudo bem? Este e um lembrete amigavel de que a fatura {fatura_numero}, no valor de {valor_formatado}, vence em {dias_para_vencer} dia(s), em {data_vencimento}. Se desejar, posso reenviar os dados para pagamento.",
            emailSubject: "Lembrete amigavel da fatura {fatura_numero}",
            emailTemplate:
                "<p>Prezado(a) {nome},</p><p>Este e um lembrete amigavel de que a fatura <strong>{fatura_numero}</strong>, referente ao atendimento juridico prestado, vence em <strong>{dias_para_vencer} dia(s)</strong>, na data de <strong>{data_vencimento}</strong>.</p><p>Valor: <strong>{valor_formatado}</strong><br/>Processo: <strong>{processo_numero}</strong></p><p>Caso precise, permanecemos a disposicao para reenviar os dados de pagamento.</p><p>{instrucoes_pagamento_html}</p>",
        },
        {
            id: "vencimento-0",
            label: "Dia do vencimento",
            dayOffset: 0,
            active: true,
            channels: ["WHATSAPP", "EMAIL"],
            whatsappTemplate:
                "Ola, {nome}. Passando para lembrar que a fatura {fatura_numero}, no valor de {valor_formatado}, vence hoje ({data_vencimento}). Se o pagamento ja tiver sido realizado, desconsidere esta mensagem.",
            emailSubject: "Fatura {fatura_numero} vence hoje",
            emailTemplate:
                "<p>Prezado(a) {nome},</p><p>Informamos que a fatura <strong>{fatura_numero}</strong> vence hoje, em <strong>{data_vencimento}</strong>.</p><p>Valor: <strong>{valor_formatado}</strong><br/>Processo: <strong>{processo_numero}</strong></p><p>Para sua comodidade, seguem os dados atualmente disponiveis para pagamento:</p><p>{instrucoes_pagamento_html}</p><p>Se o pagamento ja foi efetuado, esta comunicacao pode ser desconsiderada.</p>",
        },
        {
            id: "atraso-1",
            label: "Primeiro atraso",
            dayOffset: 1,
            active: true,
            channels: ["WHATSAPP", "EMAIL"],
            whatsappTemplate:
                "Ola, {nome}. Identificamos que a fatura {fatura_numero}, no valor de {valor_formatado}, venceu em {data_vencimento} e esta em aberto ha {dias_em_atraso} dia(s). Se o pagamento ja foi realizado, por favor desconsidere esta mensagem.",
            emailSubject: "Fatura {fatura_numero} em atraso",
            emailTemplate:
                "<p>Prezado(a) {nome},</p><p>Constatamos que a fatura <strong>{fatura_numero}</strong>, com vencimento em <strong>{data_vencimento}</strong>, permanece em aberto ha <strong>{dias_em_atraso} dia(s)</strong>.</p><p>Valor: <strong>{valor_formatado}</strong><br/>Processo: <strong>{processo_numero}</strong></p><p>Para facilitar a regularizacao, seguem os dados de pagamento disponiveis:</p><p>{instrucoes_pagamento_html}</p><p>Se houver comprovante ou necessidade de ajuste, nossa equipe permanece a disposicao.</p>",
        },
        {
            id: "atraso-7",
            label: "Cobranca recorrente",
            dayOffset: 7,
            active: true,
            channels: ["WHATSAPP", "EMAIL"],
            whatsappTemplate:
                "Ola, {nome}. A fatura {fatura_numero}, no valor de {valor_formatado}, segue em aberto ha {dias_em_atraso} dia(s). Caso necessite de nova via, apoio no pagamento ou alinhamento da regularizacao, seguimos a disposicao.",
            emailSubject: "Regularizacao da fatura {fatura_numero}",
            emailTemplate:
                "<p>Prezado(a) {nome},</p><p>Verificamos que a fatura <strong>{fatura_numero}</strong> permanece pendente ha <strong>{dias_em_atraso} dia(s)</strong>.</p><p>Valor: <strong>{valor_formatado}</strong><br/>Vencimento original: <strong>{data_vencimento}</strong><br/>Processo: <strong>{processo_numero}</strong></p><p>Se for util, podemos reenviar os dados ou apoiar na confirmacao do pagamento:</p><p>{instrucoes_pagamento_html}</p>",
        },
        {
            id: "atraso-15",
            label: "Cobranca formal",
            dayOffset: 15,
            active: true,
            channels: ["EMAIL"],
            whatsappTemplate: "Mensagem formal por email.",
            emailSubject: "Aviso formal de regularizacao da fatura {fatura_numero}",
            emailTemplate:
                "<p>Prezado(a) {nome},</p><p>Registramos que a fatura <strong>{fatura_numero}</strong>, no valor de <strong>{valor_formatado}</strong>, permanece pendente ha <strong>{dias_em_atraso} dia(s)</strong>.</p><p>Solicitamos, por gentileza, a regularizacao do pagamento ou o contato com nossa equipe financeira para alinhamento da tratativa.</p><p>Dados disponiveis para pagamento:</p><p>{instrucoes_pagamento_html}</p><p>Em caso de pagamento ja realizado, pedimos a gentileza de desconsiderar esta comunicacao.</p>",
        },
    ],
};

function toBoolean(value: unknown, fallback: boolean) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return fallback;
}

function toNumber(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function toString(value: unknown, fallback: string) {
    const parsed = String(value ?? "").trim();
    return parsed || fallback;
}

function toChannels(value: unknown, fallback: ReguaCobrancaChannel[]) {
    if (!Array.isArray(value)) return fallback;
    const channels = value
        .map((item) => String(item).trim())
        .filter((item): item is ReguaCobrancaChannel => item === "WHATSAPP" || item === "EMAIL");
    return channels.length ? Array.from(new Set(channels)) : fallback;
}

function normalizeStep(step: unknown, fallback: ReguaCobrancaStepConfig, index: number): ReguaCobrancaStepConfig {
    const payload = step && typeof step === "object" ? (step as Record<string, unknown>) : {};
    return {
        id: toString(payload.id, fallback.id || `etapa-${index + 1}`),
        label: toString(payload.label, fallback.label),
        dayOffset: toNumber(payload.dayOffset, fallback.dayOffset, -30, 180),
        active: toBoolean(payload.active, fallback.active),
        channels: toChannels(payload.channels, fallback.channels),
        whatsappTemplate: toString(payload.whatsappTemplate, fallback.whatsappTemplate),
        emailSubject: toString(payload.emailSubject, fallback.emailSubject),
        emailTemplate: toString(payload.emailTemplate, fallback.emailTemplate),
    };
}

export function normalizeReguaCobrancaConfig(value: unknown): ReguaCobrancaConfig {
    const payload = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    const rawSteps = Array.isArray(payload.steps) && payload.steps.length > 0 ? payload.steps : DEFAULT_REGUA_COBRANCA_CONFIG.steps;
    const steps = rawSteps
        .map((step, index) => normalizeStep(step, DEFAULT_REGUA_COBRANCA_CONFIG.steps[index] ?? DEFAULT_REGUA_COBRANCA_CONFIG.steps.at(-1)!, index))
        .sort((a, b) => a.dayOffset - b.dayOffset);

    return {
        enabled: toBoolean(payload.enabled, DEFAULT_REGUA_COBRANCA_CONFIG.enabled),
        syncGatewayBeforeRun: toBoolean(payload.syncGatewayBeforeRun, DEFAULT_REGUA_COBRANCA_CONFIG.syncGatewayBeforeRun),
        maxInvoicesPerRun: toNumber(payload.maxInvoicesPerRun, DEFAULT_REGUA_COBRANCA_CONFIG.maxInvoicesPerRun, 1, 1000),
        steps,
    };
}

export async function getReguaCobrancaConfig(): Promise<ReguaCobrancaConfig> {
    try {
        const setting = await db.appSetting.findUnique({
            where: { key: REGUA_COBRANCA_CONFIG_KEY },
            select: { value: true },
        });
        if (!setting) return DEFAULT_REGUA_COBRANCA_CONFIG;
        return normalizeReguaCobrancaConfig(setting.value);
    } catch (error) {
        console.warn("[ReguaCobrancaConfig] Falling back to defaults:", error);
        return DEFAULT_REGUA_COBRANCA_CONFIG;
    }
}

export async function saveReguaCobrancaConfig(partial: Partial<ReguaCobrancaConfig>) {
    const current = await getReguaCobrancaConfig();
    const next = normalizeReguaCobrancaConfig({ ...current, ...partial });

    await db.appSetting.upsert({
        where: { key: REGUA_COBRANCA_CONFIG_KEY },
        update: { value: next as unknown as Prisma.InputJsonValue },
        create: { key: REGUA_COBRANCA_CONFIG_KEY, value: next as unknown as Prisma.InputJsonValue },
    });

    return next;
}
