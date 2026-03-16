import "server-only";
import { db } from "@/lib/db";
import {
    criarOuBuscarClienteAsaas,
    criarCobrancaAsaas,
    buscarCobrancaAsaas,
    buscarPixQrCode,
    cancelarCobrancaAsaas,
    mapAsaasStatusToFatura,
    type AsaasBillingType,
} from "@/lib/integrations/asaas";

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface GerarCobrancaInput {
    faturaId: string;
    tipoPagamento: "PIX" | "BOLETO";
}

export interface GerarCobrancaResult {
    ok: boolean;
    faturaId: string;
    gatewayId?: string;
    boletoUrl?: string;
    pixPayload?: string;
    pixImageBase64?: string;
    invoiceUrl?: string;
    error?: string;
}

export interface StatusCobrancaResult {
    ok: boolean;
    faturaId: string;
    statusAsaas?: string;
    statusFatura?: "PENDENTE" | "PAGA" | "ATRASADA" | "CANCELADA";
    error?: string;
}

// ─── Resolver CPF/CNPJ do cliente ────────────────────────────────────────────

async function resolverDocumentoCliente(clienteId: string): Promise<string | null> {
    const cliente = await db.cliente.findUnique({
        where: { id: clienteId },
        select: { cpf: true, cnpj: true },
    });
    if (!cliente) return null;
    // Remove formatação
    const doc = cliente.cpf || cliente.cnpj;
    return doc ? doc.replace(/\D/g, "") : null;
}

// ─── Gerar cobrança (PIX ou Boleto) ──────────────────────────────────────────

export async function gerarCobrancaAsaas(
    input: GerarCobrancaInput
): Promise<GerarCobrancaResult> {
    const { faturaId, tipoPagamento } = input;

    // Busca fatura com dados do cliente
    const fatura = await db.fatura.findUnique({
        where: { id: faturaId },
        select: {
            id: true,
            numero: true,
            valorTotal: true,
            dataVencimento: true,
            descricao: true,
            gatewayId: true,
            clienteId: true,
            cliente: {
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    telefone: true,
                    celular: true,
                    cpf: true,
                    cnpj: true,
                },
            },
        },
    });

    if (!fatura) {
        return { ok: false, faturaId, error: "Fatura não encontrada" };
    }

    if (fatura.gatewayId) {
        return {
            ok: false,
            faturaId,
            error: "Fatura já possui cobrança gerada no gateway. Use o endpoint de consulta.",
        };
    }

    // Valida CPF/CNPJ
    const cpfCnpj = await resolverDocumentoCliente(fatura.clienteId);
    if (!cpfCnpj) {
        return {
            ok: false,
            faturaId,
            error: "Cliente não possui CPF ou CNPJ cadastrado (obrigatório para Asaas)",
        };
    }

    // 1. Cria/busca cliente no Asaas
    const clienteAsaas = await criarOuBuscarClienteAsaas({
        name: fatura.cliente.nome,
        cpfCnpj,
        email: fatura.cliente.email,
        mobilePhone: fatura.cliente.celular,
        phone: fatura.cliente.telefone,
        externalReference: fatura.clienteId,
        notificationDisabled: false,
    });

    if (!clienteAsaas.ok) {
        return { ok: false, faturaId, error: `Erro ao criar cliente Asaas: ${clienteAsaas.error}` };
    }

    // 2. Cria cobrança
    const dueDate = fatura.dataVencimento.toISOString().slice(0, 10);
    const billingType: AsaasBillingType = tipoPagamento === "PIX" ? "PIX" : "BOLETO";

    const cobranca = await criarCobrancaAsaas({
        customer: clienteAsaas.customerId,
        billingType,
        value: Number(fatura.valorTotal),
        dueDate,
        description: fatura.descricao || `Fatura ${fatura.numero}`,
        externalReference: fatura.id,
        fine: { value: 2, type: "PERCENTAGE" },       // 2% multa
        interest: { value: 1, type: "MONTHLY_PERCENTAGE" }, // 1% a.m.
    });

    if (!cobranca.ok) {
        return { ok: false, faturaId, error: `Erro ao criar cobrança Asaas: ${cobranca.error}` };
    }

    const charge = cobranca.charge;
    const result: GerarCobrancaResult = {
        ok: true,
        faturaId,
        gatewayId: charge.id,
        invoiceUrl: charge.invoiceUrl,
    };

    // 3. Para boleto, salva URL
    if (tipoPagamento === "BOLETO" && charge.bankSlipUrl) {
        result.boletoUrl = charge.bankSlipUrl;
        await db.fatura.update({
            where: { id: faturaId },
            data: {
                gatewayId: charge.id,
                boletoUrl: charge.bankSlipUrl,
            },
        });
    }

    // 4. Para PIX, busca QR Code
    if (tipoPagamento === "PIX") {
        const pixResult = await buscarPixQrCode(charge.id);
        if (pixResult.ok) {
            result.pixPayload = pixResult.qrCode.payload;
            result.pixImageBase64 = pixResult.qrCode.encodedImage;
        }
        await db.fatura.update({
            where: { id: faturaId },
            data: {
                gatewayId: charge.id,
                pixCode: pixResult.ok ? pixResult.qrCode.payload : null,
            },
        });
    }

    return result;
}

// ─── Sincronizar status da cobrança ──────────────────────────────────────────

export async function sincronizarStatusCobranca(
    faturaId: string
): Promise<StatusCobrancaResult> {
    const fatura = await db.fatura.findUnique({
        where: { id: faturaId },
        select: { id: true, gatewayId: true },
    });

    if (!fatura) {
        return { ok: false, faturaId, error: "Fatura não encontrada" };
    }

    if (!fatura.gatewayId) {
        return { ok: false, faturaId, error: "Fatura não possui cobrança no gateway" };
    }

    const consultaResult = await buscarCobrancaAsaas(fatura.gatewayId);
    if (!consultaResult.ok) {
        return { ok: false, faturaId, error: consultaResult.error };
    }

    const statusFatura = mapAsaasStatusToFatura(consultaResult.charge.status);

    // Atualiza status no banco
    await db.fatura.update({
        where: { id: faturaId },
        data: {
            status: statusFatura,
            dataPagamento:
                statusFatura === "PAGA" && !fatura.gatewayId
                    ? new Date()
                    : undefined,
        },
    });

    return {
        ok: true,
        faturaId,
        statusAsaas: consultaResult.charge.status,
        statusFatura,
    };
}

// ─── Cancelar cobrança ────────────────────────────────────────────────────────

export async function cancelarCobranca(
    faturaId: string
): Promise<{ ok: boolean; error?: string }> {
    const fatura = await db.fatura.findUnique({
        where: { id: faturaId },
        select: { gatewayId: true },
    });

    if (!fatura?.gatewayId) {
        return { ok: false, error: "Fatura não possui cobrança no gateway" };
    }

    const result = await cancelarCobrancaAsaas(fatura.gatewayId);
    if (!result.ok) return { ok: false, error: result.error };

    await db.fatura.update({
        where: { id: faturaId },
        data: { status: "CANCELADA" },
    });

    return { ok: true };
}

// ─── Sincronizar todas as faturas pendentes ───────────────────────────────────

export async function sincronizarFaturasPendentes(): Promise<{
    sincronizadas: number;
    erros: number;
}> {
    const faturas = await db.fatura.findMany({
        where: {
            status: { in: ["PENDENTE", "ATRASADA"] },
            gatewayId: { not: null },
        },
        select: { id: true },
    });

    let sincronizadas = 0;
    let erros = 0;

    for (const fatura of faturas) {
        const result = await sincronizarStatusCobranca(fatura.id);
        if (result.ok) sincronizadas++;
        else {
            erros++;
            console.error(`[Asaas] Erro ao sincronizar fatura ${fatura.id}: ${result.error}`);
        }
    }

    return { sincronizadas, erros };
}
