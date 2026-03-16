import "server-only";
import { resolveCredential } from "@/lib/integrations/credentials-store";

// ─── Configuração (resolve env var OU banco de dados) ─────────────────────────

async function getConfig(): Promise<{ token: string; baseUrl: string }> {
    const token = (await resolveCredential("CLICKSIGN_ACCESS_TOKEN", "clicksign_access_token")) ?? "";
    const env = (await resolveCredential("CLICKSIGN_ENV", "clicksign_env")) ?? "sandbox";
    const baseUrl =
        env === "production"
            ? "https://app.clicksign.com/api/v1"
            : "https://sandbox.clicksign.com/api/v1";
    return { token, baseUrl };
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ClickSignDeliveryMethod = "email" | "link";
export type ClickSignSignatureMethod = "assinatura_digital" | "assinatura_eletronica";

export interface ClickSignSignatory {
    email: string;
    nome: string;
    cpf?: string;
    birthDate?: string; // "YYYY-MM-DD"
    phone?: string;
    deliverBy?: ClickSignDeliveryMethod;
    hasDocumentation?: boolean;
}

export interface ClickSignDocumentInput {
    /** URL pública do PDF para upload ou conteúdo base64 */
    fileUrl?: string;
    fileBase64?: string;
    fileName: string;
    /** Prazo para assinatura (dias a partir de hoje) */
    deadlineDays?: number;
    /** Mensagem para os signatários */
    message?: string;
    remindAfterDays?: number;
    skipEmail?: boolean;
}

export interface ClickSignDocument {
    key: string;
    path: string;
    filename: string;
    status: "draft" | "running" | "closed" | "canceled";
    originalFile?: string;
    signedFile?: string;
    downloadedAt?: string;
    updatedAt?: string;
    requestSignatureKey?: string;
}

export interface ClickSignSignatory_ {
    key: string;
    requestSignatureKey: string;
    email: string;
    name: string;
    status: "signed" | "unsigned" | "rejected";
    signedAt?: string;
    signedHash?: string;
    signLink?: string;
}

export interface ClickSignError {
    errors?: Record<string, string[]>;
    message?: string;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function clicksignRequest<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: object
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
    const { token, baseUrl } = await getConfig();
    if (!token) {
        return { ok: false, error: "CLICKSIGN_ACCESS_TOKEN não configurada. Configure em Admin → Integrações.", status: 500 };
    }

    const url = `${baseUrl}${path}?access_token=${token}`;
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    };

    try {
        const res = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) {
            let errorMsg = `ClickSign API ${res.status}`;
            try {
                const errBody = (await res.json()) as ClickSignError;
                if (errBody.message) errorMsg = errBody.message;
                else if (errBody.errors) {
                    errorMsg = Object.entries(errBody.errors)
                        .map(([k, v]) => `${k}: ${v.join(", ")}`)
                        .join("; ");
                }
            } catch {
                // ignora
            }
            return { ok: false, error: errorMsg, status: res.status };
        }

        // 204 No Content
        if (res.status === 204) return { ok: true, data: {} as T };

        const data = (await res.json()) as T;
        return { ok: true, data };
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        return { ok: false, error: msg, status: 500 };
    }
}

// ─── API de Documentos ────────────────────────────────────────────────────────

export async function uploadDocumento(
    input: ClickSignDocumentInput
): Promise<{ ok: true; document: ClickSignDocument } | { ok: false; error: string }> {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + (input.deadlineDays ?? 30));

    let filePayload: Record<string, unknown>;

    if (input.fileUrl) {
        // Upload via URL — ClickSign faz o download
        filePayload = {
            document: {
                path: `/${input.fileName}`,
                content_base64: null,
                deadline_at: deadline.toISOString(),
                auto_close: true,
                locale: "pt-BR",
                remind_interval: input.remindAfterDays ?? 3,
                skip_email: input.skipEmail ?? false,
                sequence_enabled: false,
            },
        };
    } else if (input.fileBase64) {
        filePayload = {
            document: {
                path: `/${input.fileName}`,
                content_base64: input.fileBase64,
                deadline_at: deadline.toISOString(),
                auto_close: true,
                locale: "pt-BR",
                remind_interval: input.remindAfterDays ?? 3,
                skip_email: input.skipEmail ?? false,
                sequence_enabled: false,
            },
        };
    } else {
        return { ok: false, error: "fileUrl ou fileBase64 obrigatório" };
    }

    const result = await clicksignRequest<{ document: ClickSignDocument }>(
        "POST",
        "/documents",
        filePayload
    );

    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, document: result.data.document };
}

export async function buscarDocumento(
    documentKey: string
): Promise<{ ok: true; document: ClickSignDocument } | { ok: false; error: string }> {
    const result = await clicksignRequest<{ document: ClickSignDocument }>(
        "GET",
        `/documents/${documentKey}`
    );
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, document: result.data.document };
}

export async function cancelarDocumento(
    documentKey: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const result = await clicksignRequest<unknown>(
        "PATCH",
        `/documents/${documentKey}/cancel`
    );
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true };
}

// ─── API de Signatários ───────────────────────────────────────────────────────

export async function criarSignatario(
    signatory: ClickSignSignatory
): Promise<{ ok: true; key: string } | { ok: false; error: string }> {
    const body = {
        signer: {
            email: signatory.email,
            phone_number: signatory.phone?.replace(/\D/g, "") || null,
            name: signatory.nome,
            documentation: signatory.cpf?.replace(/\D/g, "") || null,
            birthday: signatory.birthDate || null,
            has_documentation: signatory.hasDocumentation ?? !!signatory.cpf,
            delivery_method: signatory.deliverBy ?? "email",
            official_document_enabled: false,
            selfie_enabled: false,
            handwritten_enabled: false,
            liveness_enabled: false,
            facial_biometrics_enabled: false,
        },
    };

    const result = await clicksignRequest<{ signer: { key: string } }>(
        "POST",
        "/signers",
        body
    );

    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, key: result.data.signer.key };
}

export async function adicionarSignatarioAoDocumento(
    documentKey: string,
    signerKey: string,
    signAs: "sign" | "approve" | "party" | "witness" | "endorser" = "sign",
    message?: string
): Promise<{ ok: true; requestKey: string; signLink?: string } | { ok: false; error: string }> {
    const body = {
        list: {
            document_key: documentKey,
            signer_key: signerKey,
            sign_as: signAs,
            message: message || null,
        },
    };

    const result = await clicksignRequest<{
        list: { document_key: string; signer_key: string; request_signature_key: string; sign_url?: string };
    }>("POST", "/lists", body);

    if (!result.ok) return { ok: false, error: result.error };
    return {
        ok: true,
        requestKey: result.data.list.request_signature_key,
        signLink: result.data.list.sign_url,
    };
}

// ─── Enviar notificações para signatários ─────────────────────────────────────

export async function notificarSignatario(
    requestSignatureKey: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const result = await clicksignRequest<unknown>("POST", "/notifications", {
        request_signature_key: requestSignatureKey,
        message: "Por favor, assine o documento enviado pelo escritório de advocacia.",
    });
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true };
}

// ─── Mapear status ────────────────────────────────────────────────────────────

export function mapClickSignStatus(
    status: ClickSignDocument["status"]
): "PENDENTE" | "ASSINADO" | "CANCELADO" | "EXPIRADO" {
    switch (status) {
        case "closed":
            return "ASSINADO";
        case "canceled":
            return "CANCELADO";
        case "running":
            return "PENDENTE";
        default:
            return "PENDENTE";
    }
}
