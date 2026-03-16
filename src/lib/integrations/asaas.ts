import "server-only";
import { resolveCredential } from "@/lib/integrations/credentials-store";

// ─── Configuração (resolve env var OU banco de dados) ─────────────────────────

async function getConfig(): Promise<{ apiKey: string; baseUrl: string }> {
    const apiKey = (await resolveCredential("ASAAS_API_KEY", "asaas_api_key")) ?? "";
    const env = (await resolveCredential("ASAAS_ENV", "asaas_env")) ?? "sandbox";
    const baseUrl =
        env === "production"
            ? "https://api.asaas.com/v3"
            : "https://sandbox.asaas.com/api/v3";
    return { apiKey, baseUrl };
}

// ─── Tipos da API Asaas ───────────────────────────────────────────────────────

export type AsaasBillingType = "BOLETO" | "PIX" | "UNDEFINED";

export interface AsaasCustomerInput {
    name: string;
    cpfCnpj: string;
    email?: string | null;
    phone?: string | null;
    mobilePhone?: string | null;
    address?: string | null;
    addressNumber?: string | null;
    complement?: string | null;
    province?: string | null;
    postalCode?: string | null;
    externalReference?: string | null;
    notificationDisabled?: boolean;
}

export interface AsaasCustomer {
    id: string;
    name: string;
    cpfCnpj: string;
    email?: string;
    deleted: boolean;
}

export interface AsaasChargeInput {
    customer: string; // Asaas customer ID
    billingType: AsaasBillingType;
    value: number;
    dueDate: string; // "YYYY-MM-DD"
    description?: string | null;
    externalReference?: string | null;
    postalService?: boolean;
    discount?: { value: number; dueDateLimitDays: number; type: "FIXED" | "PERCENTAGE" };
    fine?: { value: number; type: "FIXED" | "PERCENTAGE" };
    interest?: { value: number; type: "MONTHLY_PERCENTAGE" };
}

export interface AsaasCharge {
    id: string;
    customer: string;
    billingType: AsaasBillingType;
    status: "PENDING" | "RECEIVED" | "CONFIRMED" | "OVERDUE" | "REFUNDED" | "RECEIVED_IN_CASH" | "REFUND_REQUESTED" | "CHARGEBACK_REQUESTED" | "CHARGEBACK_DISPUTE" | "AWAITING_CHARGEBACK_REVERSAL" | "DUNNING_REQUESTED" | "DUNNING_RECEIVED" | "AWAITING_RISK_ANALYSIS";
    value: number;
    netValue: number;
    dueDate: string;
    description?: string;
    invoiceUrl: string;
    bankSlipUrl?: string;
    externalReference?: string;
    pixQrCodeId?: string;
    pixTransaction?: string;
}

export interface AsaasPixQrCode {
    encodedImage: string; // base64 PNG
    payload: string;      // código copia-e-cola
    expirationDate: string;
}

export interface AsaasError {
    errors: Array<{ code: string; description: string }>;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function asaasRequest<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: object
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
    const { apiKey, baseUrl } = await getConfig();
    if (!apiKey) {
        return { ok: false, error: "ASAAS_API_KEY não configurada. Configure em Admin → Integrações.", status: 500 };
    }

    const url = `${baseUrl}${path}`;
    const headers: Record<string, string> = {
        "access_token": apiKey,
        "Content-Type": "application/json",
    };

    try {
        const res = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) {
            let errorMsg = `Asaas API ${res.status}`;
            try {
                const errBody = (await res.json()) as AsaasError;
                errorMsg = errBody.errors?.map((e) => e.description).join("; ") || errorMsg;
            } catch {
                // ignora erro de parse
            }
            return { ok: false, error: errorMsg, status: res.status };
        }

        const data = (await res.json()) as T;
        return { ok: true, data };
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        return { ok: false, error: msg, status: 500 };
    }
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

export async function criarOuBuscarClienteAsaas(
    input: AsaasCustomerInput
): Promise<{ ok: true; customerId: string } | { ok: false; error: string }> {
    // Tenta buscar por CPF/CNPJ primeiro
    const busca = await asaasRequest<{ data: AsaasCustomer[] }>(
        "GET",
        `/customers?cpfCnpj=${encodeURIComponent(input.cpfCnpj)}&limit=1`
    );

    if (busca.ok && busca.data.data.length > 0) {
        const existente = busca.data.data.find((c) => !c.deleted);
        if (existente) return { ok: true, customerId: existente.id };
    }

    // Cria novo
    const criacao = await asaasRequest<AsaasCustomer>("POST", "/customers", input);
    if (!criacao.ok) return { ok: false, error: criacao.error };
    return { ok: true, customerId: criacao.data.id };
}

// ─── Cobranças ────────────────────────────────────────────────────────────────

export async function criarCobrancaAsaas(
    input: AsaasChargeInput
): Promise<{ ok: true; charge: AsaasCharge } | { ok: false; error: string }> {
    const result = await asaasRequest<AsaasCharge>("POST", "/payments", input);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, charge: result.data };
}

export async function buscarCobrancaAsaas(
    chargeId: string
): Promise<{ ok: true; charge: AsaasCharge } | { ok: false; error: string }> {
    const result = await asaasRequest<AsaasCharge>("GET", `/payments/${chargeId}`);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, charge: result.data };
}

export async function buscarPixQrCode(
    chargeId: string
): Promise<{ ok: true; qrCode: AsaasPixQrCode } | { ok: false; error: string }> {
    const result = await asaasRequest<AsaasPixQrCode>(
        "GET",
        `/payments/${chargeId}/pixQrCode`
    );
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, qrCode: result.data };
}

export async function cancelarCobrancaAsaas(
    chargeId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const result = await asaasRequest<{ deleted: boolean }>(
        "DELETE",
        `/payments/${chargeId}`
    );
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true };
}

// ─── Mapear status Asaas → StatusFatura ──────────────────────────────────────

export function mapAsaasStatusToFatura(
    asaasStatus: AsaasCharge["status"]
): "PENDENTE" | "PAGA" | "ATRASADA" | "CANCELADA" {
    switch (asaasStatus) {
        case "RECEIVED":
        case "CONFIRMED":
        case "RECEIVED_IN_CASH":
            return "PAGA";
        case "OVERDUE":
            return "ATRASADA";
        case "REFUNDED":
        case "REFUND_REQUESTED":
        case "CHARGEBACK_REQUESTED":
            return "CANCELADA";
        case "PENDING":
        case "AWAITING_RISK_ANALYSIS":
        default:
            return "PENDENTE";
    }
}
