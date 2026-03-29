import assert from "node:assert/strict";

import {
    DEFAULT_REGUA_COBRANCA_CONFIG,
    normalizeReguaCobrancaConfig,
} from "@/lib/services/regua-cobranca-config";
import {
    buildReguaDashboard,
    buildReguaJobDrafts,
    calculateInvoiceDayOffset,
    classifyInvoiceReguaStage,
} from "@/lib/services/regua-cobranca";

const config = normalizeReguaCobrancaConfig({
    enabled: true,
    steps: [
        {
            id: "pre-vencimento-3",
            label: "Lembrete amigavel",
            dayOffset: -3,
            active: true,
            channels: ["WHATSAPP"],
            whatsappTemplate: "Ola {nome}, sua fatura {fatura_numero} vence em {dias_para_vencer} dias.",
            emailSubject: "Fatura {fatura_numero} vence em breve",
            emailTemplate: "<p>Ola {nome}</p>",
        },
        {
            id: "atraso-1",
            label: "Primeiro atraso",
            dayOffset: 1,
            active: true,
            channels: ["WHATSAPP", "EMAIL"],
            whatsappTemplate: "Ola {nome}, a fatura {fatura_numero} venceu ha {dias_em_atraso} dia(s).",
            emailSubject: "Fatura {fatura_numero} em atraso",
            emailTemplate: "<p>Fatura em atraso</p>",
        },
        {
            id: "atraso-7",
            label: "Cobranca formal",
            dayOffset: 7,
            active: true,
            channels: ["EMAIL"],
            whatsappTemplate: "Mensagem",
            emailSubject: "Fatura {fatura_numero} com 7 dias",
            emailTemplate: "<p>Cobranca formal</p>",
        },
    ],
});

assert.equal(DEFAULT_REGUA_COBRANCA_CONFIG.steps.length > 0, true, "config padrao deve possuir etapas");
assert.equal(calculateInvoiceDayOffset("2026-03-29", "2026-03-28"), 1, "ontem deve resultar em 1 dia de atraso");
assert.equal(calculateInvoiceDayOffset("2026-03-29", "2026-04-01"), -3, "fatura futura deve resultar em offset negativo");

const overdueInvoice = {
    id: "fat-1",
    numero: "FAT-001",
    status: "PENDENTE" as const,
    valorTotal: 1200,
    dataVencimento: "2026-03-28",
    dataPagamento: null,
    clienteId: "cli-1",
    clienteNome: "Cliente A",
    clienteEmail: "cliente@example.com",
    clientePhone: "5511999999999",
    processoId: "proc-1",
    processoNumero: "0001111-22.2026.8.26.0001",
    boletoUrl: "https://example.com/boleto/fat-1",
    pixCode: "pix-fat-1",
};

const upcomingInvoice = {
    ...overdueInvoice,
    id: "fat-2",
    numero: "FAT-002",
    dataVencimento: "2026-04-01",
    clienteNome: "Cliente B",
};

const paidInvoice = {
    ...overdueInvoice,
    id: "fat-3",
    numero: "FAT-003",
    status: "PAGA" as const,
    dataPagamento: "2026-03-29",
};

const drafts = buildReguaJobDrafts({
    invoice: overdueInvoice,
    config,
    today: "2026-03-29",
    existingCorrelationIds: [],
});

assert.equal(drafts.length, 2, "etapa de D+1 deve gerar jobs para WhatsApp e email");
assert.equal(drafts[0]?.stepId, "atraso-1", "deve usar a etapa correspondente ao offset");
assert.equal(
    drafts.every((item) => item.correlationId === `regua-cobranca:${overdueInvoice.id}:atraso-1`),
    true,
    "todos os canais da mesma etapa devem compartilhar correlation id"
);

const duplicateDrafts = buildReguaJobDrafts({
    invoice: overdueInvoice,
    config,
    today: "2026-03-29",
    existingCorrelationIds: [`regua-cobranca:${overdueInvoice.id}:atraso-1`],
});

assert.equal(duplicateDrafts.length, 0, "nao deve recriar job para etapa ja registrada");

const paidDrafts = buildReguaJobDrafts({
    invoice: paidInvoice,
    config,
    today: "2026-03-29",
    existingCorrelationIds: [],
});

assert.equal(paidDrafts.length, 0, "fatura paga deve pausar a regua");

const stage = classifyInvoiceReguaStage({
    invoice: overdueInvoice,
    config,
    today: "2026-03-29",
});

assert.equal(stage.stepId, "atraso-1", "fatura atrasada em 1 dia deve cair na etapa correta");

const dashboard = buildReguaDashboard({
    invoices: [overdueInvoice, upcomingInvoice, paidInvoice],
    jobs: [
        {
            id: "job-1",
            correlationId: `regua-cobranca:${overdueInvoice.id}:atraso-1`,
            canal: "WHATSAPP",
            status: "COMPLETED",
            recipientPhone: overdueInvoice.clientePhone,
            recipientEmail: null,
            scheduledFor: "2026-03-29T08:00:00.000Z",
            completedAt: "2026-03-29T08:01:00.000Z",
            errorMessage: null,
        },
        {
            id: "job-2",
            correlationId: `regua-cobranca:${overdueInvoice.id}:atraso-1`,
            canal: "EMAIL",
            status: "PENDING",
            recipientPhone: null,
            recipientEmail: overdueInvoice.clienteEmail,
            scheduledFor: "2026-03-29T08:00:00.000Z",
            completedAt: null,
            errorMessage: null,
        },
    ],
    config,
    today: "2026-03-29",
});

assert.equal(dashboard.summary.totalFaturasAtivas, 2, "dashboard deve considerar apenas faturas nao pagas");
assert.equal(dashboard.summary.totalFaturasPagas, 1, "dashboard deve separar faturas pagas");
assert.equal(
    dashboard.byStep.find((item) => item.stepId === "atraso-1")?.faturas,
    1,
    "dashboard deve contar faturas na etapa atual"
);
assert.equal(
    dashboard.byStep.find((item) => item.stepId === "atraso-1")?.jobsCompleted,
    1,
    "dashboard deve agregar jobs concluidos por etapa"
);
assert.equal(dashboard.recentJobs[0]?.stepId, "atraso-1", "dashboard deve expor historico recente por etapa");

console.log("test-regua-cobranca-core: ok");
