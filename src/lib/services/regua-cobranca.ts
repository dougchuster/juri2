import type { CanalComunicacao, JobStatus, Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { renderTemplate, wrapInEmailLayout } from "@/lib/integrations/email-service";
import {
    type ReguaCobrancaConfig,
    type ReguaCobrancaStepConfig,
    getReguaCobrancaConfig,
} from "@/lib/services/regua-cobranca-config";

export interface ReguaCobrancaInvoiceSnapshot {
    id: string;
    numero: string;
    status: "PENDENTE" | "PAGA" | "ATRASADA" | "CANCELADA";
    valorTotal: number;
    dataVencimento: string | Date;
    dataPagamento?: string | Date | null;
    clienteId: string;
    clienteNome: string;
    clienteEmail?: string | null;
    clientePhone?: string | null;
    processoId?: string | null;
    processoNumero?: string | null;
    boletoUrl?: string | null;
    pixCode?: string | null;
}

export interface ReguaCobrancaJobSnapshot {
    id: string;
    correlationId: string;
    canal: CanalComunicacao;
    status: JobStatus;
    recipientPhone?: string | null;
    recipientEmail?: string | null;
    scheduledFor: string | Date;
    completedAt?: string | Date | null;
    errorMessage?: string | null;
}

export interface ReguaCobrancaJobDraft {
    stepId: string;
    stepLabel: string;
    correlationId: string;
    canal: CanalComunicacao;
    recipientPhone: string | null;
    recipientEmail: string | null;
    subject: string | null;
    content: string;
    contentHtml: string | null;
    variables: Record<string, string>;
}

export interface ReguaCobrancaStage {
    invoiceId: string;
    stepId: string | null;
    stepLabel: string;
    dayOffset: number;
    paid: boolean;
}

export interface ReguaCobrancaDashboard {
    summary: {
        totalFaturasAtivas: number;
        totalFaturasPagas: number;
        totalFaturasEmAtraso: number;
        totalJobsPendentes: number;
        totalJobsConcluidos: number;
        totalJobsFalhos: number;
    };
    byStep: Array<{
        stepId: string;
        label: string;
        dayOffset: number;
        faturas: number;
        jobsPending: number;
        jobsCompleted: number;
        jobsFailed: number;
    }>;
    recentJobs: Array<{
        id: string;
        invoiceId: string | null;
        invoiceNumber: string | null;
        clientName: string | null;
        stepId: string | null;
        stepLabel: string;
        canal: CanalComunicacao;
        status: JobStatus;
        scheduledFor: string;
        completedAt: string | null;
        errorMessage: string | null;
    }>;
}

function isDateOnlyString(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toUtcDay(value: string | Date) {
    if (value instanceof Date) {
        return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
    }

    if (isDateOnlyString(value)) {
        const [year, month, day] = value.split("-").map(Number);
        return Date.UTC(year, month - 1, day);
    }

    const parsed = new Date(value);
    return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
}

function toIsoDate(value: string | Date | null | undefined) {
    if (!value) return null;
    if (typeof value === "string" && isDateOnlyString(value)) return value;
    const parsed = value instanceof Date ? value : new Date(value);
    return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(parsed.getUTCDate()).padStart(2, "0")}`;
}

function toIsoDateTime(value: string | Date | null | undefined) {
    if (!value) return null;
    return (value instanceof Date ? value : new Date(value)).toISOString();
}

function formatCurrencyBRL(value: number) {
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
    });
}

function isInvoicePaid(invoice: Pick<ReguaCobrancaInvoiceSnapshot, "status" | "dataPagamento">) {
    return invoice.status === "PAGA" || Boolean(invoice.dataPagamento);
}

function getActiveSteps(config: ReguaCobrancaConfig) {
    return config.steps.filter((step) => step.active).sort((a, b) => a.dayOffset - b.dayOffset);
}

function getExactTriggeredSteps(config: ReguaCobrancaConfig, dayOffset: number) {
    return getActiveSteps(config).filter((step) => step.dayOffset === dayOffset);
}

function getReachedStep(config: ReguaCobrancaConfig, dayOffset: number) {
    const reached = getActiveSteps(config).filter((step) => step.dayOffset <= dayOffset);
    return reached.at(-1) ?? null;
}

export function calculateInvoiceDayOffset(today: string | Date, dueDate: string | Date) {
    return Math.round((toUtcDay(today) - toUtcDay(dueDate)) / 86_400_000);
}

export function buildReguaCorrelationId(invoiceId: string, stepId: string) {
    return `regua-cobranca:${invoiceId}:${stepId}`;
}

export function parseReguaCorrelationId(correlationId: string) {
    const match = /^regua-cobranca:([^:]+):([^:]+)$/.exec(correlationId);
    if (!match) return null;
    return { invoiceId: match[1], stepId: match[2] };
}

function buildTemplateVariables(invoice: ReguaCobrancaInvoiceSnapshot, today: string | Date, step: ReguaCobrancaStepConfig) {
    const dayOffset = calculateInvoiceDayOffset(today, invoice.dataVencimento);
    const dueDate = toIsoDate(invoice.dataVencimento) ?? "";
    const dueDateFormatted = dueDate ? dueDate.split("-").reverse().join("/") : "";
    const paymentLinesText = [
        invoice.boletoUrl ? `Boleto: ${invoice.boletoUrl}` : "",
        invoice.pixCode ? `PIX copia e cola: ${invoice.pixCode}` : "",
    ]
        .filter(Boolean)
        .join("\n");
    const paymentLinesHtml = [
        invoice.boletoUrl ? `<p><strong>Boleto:</strong> <a href="${invoice.boletoUrl}">${invoice.boletoUrl}</a></p>` : "",
        invoice.pixCode ? `<p><strong>PIX copia e cola:</strong> ${invoice.pixCode}</p>` : "",
    ]
        .filter(Boolean)
        .join("");

    return {
        nome: invoice.clienteNome,
        fatura_numero: invoice.numero,
        valor: String(invoice.valorTotal),
        valor_formatado: formatCurrencyBRL(invoice.valorTotal),
        data_vencimento: dueDateFormatted,
        dias_em_atraso: String(Math.max(dayOffset, 0)),
        dias_para_vencer: String(Math.max(dayOffset * -1, 0)),
        processo_numero: invoice.processoNumero ?? "Nao informado",
        boleto_url: invoice.boletoUrl ?? "",
        pix_code: invoice.pixCode ?? "",
        instrucoes_pagamento_texto: paymentLinesText,
        instrucoes_pagamento_html: paymentLinesHtml,
        etapa: step.label,
    };
}

export function classifyInvoiceReguaStage({
    invoice,
    config,
    today,
}: {
    invoice: ReguaCobrancaInvoiceSnapshot;
    config: ReguaCobrancaConfig;
    today: string | Date;
}): ReguaCobrancaStage {
    const dayOffset = calculateInvoiceDayOffset(today, invoice.dataVencimento);

    if (isInvoicePaid(invoice)) {
        return {
            invoiceId: invoice.id,
            stepId: null,
            stepLabel: "Pago",
            dayOffset,
            paid: true,
        };
    }

    const reachedStep = getReachedStep(config, dayOffset);
    return {
        invoiceId: invoice.id,
        stepId: reachedStep?.id ?? null,
        stepLabel: reachedStep?.label ?? "Aguardando primeira etapa",
        dayOffset,
        paid: false,
    };
}

export function buildReguaJobDrafts({
    invoice,
    config,
    today,
    existingCorrelationIds,
}: {
    invoice: ReguaCobrancaInvoiceSnapshot;
    config: ReguaCobrancaConfig;
    today: string | Date;
    existingCorrelationIds: string[];
}): ReguaCobrancaJobDraft[] {
    if (!config.enabled || isInvoicePaid(invoice) || invoice.status === "CANCELADA") {
        return [];
    }

    const dayOffset = calculateInvoiceDayOffset(today, invoice.dataVencimento);
    const triggeredSteps = getExactTriggeredSteps(config, dayOffset);

    return triggeredSteps.flatMap((step) => {
        const correlationId = buildReguaCorrelationId(invoice.id, step.id);
        if (existingCorrelationIds.includes(correlationId)) {
            return [];
        }

        const variables = buildTemplateVariables(invoice, today, step);
        const drafts: ReguaCobrancaJobDraft[] = [];

        for (const channel of step.channels) {
            if (channel === "WHATSAPP" && invoice.clientePhone) {
                drafts.push({
                    stepId: step.id,
                    stepLabel: step.label,
                    correlationId,
                    canal: "WHATSAPP",
                    recipientPhone: invoice.clientePhone ?? null,
                    recipientEmail: null,
                    subject: null,
                    content: renderTemplate(step.whatsappTemplate, variables),
                    contentHtml: null,
                    variables,
                });
            }

            if (channel === "EMAIL" && invoice.clienteEmail) {
                const emailBody = renderTemplate(step.emailTemplate, variables);
                drafts.push({
                    stepId: step.id,
                    stepLabel: step.label,
                    correlationId,
                    canal: "EMAIL",
                    recipientPhone: null,
                    recipientEmail: invoice.clienteEmail ?? null,
                    subject: renderTemplate(step.emailSubject, variables),
                    content: emailBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
                    contentHtml: wrapInEmailLayout(emailBody),
                    variables,
                });
            }
        }

        return drafts;
    });
}

export function buildReguaDashboard({
    invoices,
    jobs,
    config,
    today,
}: {
    invoices: ReguaCobrancaInvoiceSnapshot[];
    jobs: ReguaCobrancaJobSnapshot[];
    config: ReguaCobrancaConfig;
    today: string | Date;
}): ReguaCobrancaDashboard {
    const invoiceMap = new Map(invoices.map((invoice) => [invoice.id, invoice]));
    const stages = invoices.map((invoice) => classifyInvoiceReguaStage({ invoice, config, today }));
    const activeInvoices = invoices.filter((invoice) => !isInvoicePaid(invoice) && invoice.status !== "CANCELADA");
    const paidInvoices = invoices.filter((invoice) => isInvoicePaid(invoice));

    const byStep = config.steps.map((step) => {
        const relatedJobs = jobs.filter((job) => parseReguaCorrelationId(job.correlationId)?.stepId === step.id);
        return {
            stepId: step.id,
            label: step.label,
            dayOffset: step.dayOffset,
            faturas: stages.filter((stage) => stage.stepId === step.id && !stage.paid).length,
            jobsPending: relatedJobs.filter((job) => job.status === "PENDING" || job.status === "PROCESSING").length,
            jobsCompleted: relatedJobs.filter((job) => job.status === "COMPLETED").length,
            jobsFailed: relatedJobs.filter((job) => job.status === "FAILED").length,
        };
    });

    const recentJobs = [...jobs]
        .sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime())
        .map((job) => {
            const parsed = parseReguaCorrelationId(job.correlationId);
            const invoice = parsed ? invoiceMap.get(parsed.invoiceId) ?? null : null;
            const step = parsed ? config.steps.find((item) => item.id === parsed.stepId) ?? null : null;
            return {
                id: job.id,
                invoiceId: parsed?.invoiceId ?? null,
                invoiceNumber: invoice?.numero ?? null,
                clientName: invoice?.clienteNome ?? null,
                stepId: parsed?.stepId ?? null,
                stepLabel: step?.label ?? "Etapa desconhecida",
                canal: job.canal,
                status: job.status,
                scheduledFor: toIsoDateTime(job.scheduledFor) ?? "",
                completedAt: toIsoDateTime(job.completedAt),
                errorMessage: job.errorMessage ?? null,
            };
        });

    return {
        summary: {
            totalFaturasAtivas: activeInvoices.length,
            totalFaturasPagas: paidInvoices.length,
            totalFaturasEmAtraso: activeInvoices.filter((invoice) => calculateInvoiceDayOffset(today, invoice.dataVencimento) > 0).length,
            totalJobsPendentes: jobs.filter((job) => job.status === "PENDING" || job.status === "PROCESSING").length,
            totalJobsConcluidos: jobs.filter((job) => job.status === "COMPLETED").length,
            totalJobsFalhos: jobs.filter((job) => job.status === "FAILED").length,
        },
        byStep,
        recentJobs,
    };
}

function normalizeInvoiceRecord(record: {
    id: string;
    numero: string;
    status: "PENDENTE" | "PAGA" | "ATRASADA" | "CANCELADA";
    valorTotal: Prisma.Decimal | number;
    dataVencimento: Date;
    dataPagamento: Date | null;
    boletoUrl: string | null;
    pixCode: string | null;
    clienteId: string;
    cliente: { nome: string; email: string | null; whatsapp: string | null; celular: string | null };
    honorario: { processo: { id: string; numeroCnj: string | null } | null } | null;
}): ReguaCobrancaInvoiceSnapshot {
    const processo = record.honorario?.processo ?? null;
    return {
        id: record.id,
        numero: record.numero,
        status: record.status,
        valorTotal: typeof record.valorTotal === "number" ? record.valorTotal : record.valorTotal.toNumber(),
        dataVencimento: record.dataVencimento,
        dataPagamento: record.dataPagamento,
        clienteId: record.clienteId,
        clienteNome: record.cliente.nome,
        clienteEmail: record.cliente.email,
        clientePhone: record.cliente.whatsapp ?? record.cliente.celular,
        processoId: processo?.id ?? null,
        processoNumero: processo?.numeroCnj ?? null,
        boletoUrl: record.boletoUrl,
        pixCode: record.pixCode,
    };
}

export async function scheduleReguaCobrancaRun(today = new Date()) {
    const config = await getReguaCobrancaConfig();
    if (!config.enabled) {
        return {
            ok: true,
            skipped: true,
            reason: "disabled",
            jobsCreated: 0,
            invoicesMatched: 0,
            syncResult: null,
        };
    }

    const syncResult = config.syncGatewayBeforeRun
        ? await import("@/lib/services/asaas-billing").then((module) => module.sincronizarFaturasPendentes())
        : null;

    const invoices = await db.fatura.findMany({
        where: {
            status: { in: ["PENDENTE", "ATRASADA"] },
        },
        include: {
            cliente: {
                select: { nome: true, email: true, whatsapp: true, celular: true },
            },
            honorario: {
                select: {
                    processo: {
                        select: { id: true, numeroCnj: true },
                    },
                },
            },
        },
        orderBy: { dataVencimento: "asc" },
        take: config.maxInvoicesPerRun,
    });

    const invoiceSnapshots = invoices.map(normalizeInvoiceRecord);
    const existingCorrelationIds = await db.communicationJob.findMany({
        where: {
            correlationId: { startsWith: "regua-cobranca:" },
            status: { in: ["PENDING", "PROCESSING", "COMPLETED"] },
        },
        select: { correlationId: true },
    });

    const correlationSet = new Set(existingCorrelationIds.map((item) => item.correlationId));
    const invoiceByStep = new Map<string, ReguaCobrancaInvoiceSnapshot>();
    const drafts = invoiceSnapshots.flatMap((invoice) => {
        const nextDrafts = buildReguaJobDrafts({
            invoice,
            config,
            today,
            existingCorrelationIds: Array.from(correlationSet),
        });

        nextDrafts.forEach((draft) => {
            invoiceByStep.set(draft.correlationId, invoice);
            correlationSet.add(draft.correlationId);
        });

        return nextDrafts;
    });

    if (!drafts.length) {
        return {
            ok: true,
            skipped: false,
            jobsCreated: 0,
            invoicesMatched: invoiceSnapshots.length,
            syncResult,
        };
    }

    await db.$transaction(
        drafts.map((draft) =>
            db.communicationJob.create({
                data: {
                    canal: draft.canal,
                    recipientPhone: draft.recipientPhone,
                    recipientEmail: draft.recipientEmail,
                    clienteId: invoiceByStep.get(draft.correlationId)?.clienteId ?? null,
                    subject: draft.subject,
                    content: draft.content,
                    contentHtml: draft.contentHtml,
                    variables: {
                        ...draft.variables,
                        faturaId: invoiceByStep.get(draft.correlationId)?.id ?? null,
                        reguaStepId: draft.stepId,
                        reguaStepLabel: draft.stepLabel,
                    } as Prisma.InputJsonValue,
                    processoId: invoiceByStep.get(draft.correlationId)?.processoId ?? null,
                    correlationId: draft.correlationId,
                    scheduledFor: today,
                },
            })
        )
    );

    return {
        ok: true,
        skipped: false,
        jobsCreated: drafts.length,
        invoicesMatched: invoiceSnapshots.length,
        syncResult,
    };
}

export async function getReguaCobrancaDashboardData(today = new Date()) {
    const [config, invoices, jobs] = await Promise.all([
        getReguaCobrancaConfig(),
        db.fatura.findMany({
            where: {
                status: { in: ["PENDENTE", "PAGA", "ATRASADA"] },
            },
            include: {
                cliente: {
                    select: { nome: true, email: true, whatsapp: true, celular: true },
                },
                honorario: {
                    select: {
                        processo: {
                            select: { id: true, numeroCnj: true },
                        },
                    },
                },
            },
            orderBy: [{ dataVencimento: "asc" }],
            take: 250,
        }),
        db.communicationJob.findMany({
            where: {
                correlationId: { startsWith: "regua-cobranca:" },
            },
            select: {
                id: true,
                correlationId: true,
                canal: true,
                status: true,
                recipientPhone: true,
                recipientEmail: true,
                scheduledFor: true,
                completedAt: true,
                errorMessage: true,
            },
            orderBy: { scheduledFor: "desc" },
            take: 50,
        }),
    ]);

    return {
        config,
        dashboard: buildReguaDashboard({
            invoices: invoices.map(normalizeInvoiceRecord),
            jobs,
            config,
            today,
        }),
    };
}
