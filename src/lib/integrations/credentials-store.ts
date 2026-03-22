/**
 * credentials-store.ts
 *
 * Armazena e recupera credenciais de integração (ClickSign, Asaas, Portal)
 * no modelo AppSetting do banco, usando AES-256-GCM para criptografar os valores.
 *
 * A chave de criptografia vem de APP_SECRET_KEY (env). Caso não configurada,
 * usa um segredo derivado do NEXTAUTH_SECRET/DATABASE_URL como fallback.
 */

import "server-only";
import { db } from "@/lib/db";
import { decryptString, encryptString } from "@/lib/security/encrypted-json";

// ─── Tipos das credenciais ─────────────────────────────────────────────────────

export type IntegrationKey =
    | "clicksign_access_token"
    | "clicksign_env"
    | "asaas_api_key"
    | "asaas_env"
    | "portal_token_secret";

export interface IntegrationCredentials {
    clicksign_access_token?: string;
    clicksign_env?: "sandbox" | "production";
    asaas_api_key?: string;
    asaas_env?: "sandbox" | "production";
    portal_token_secret?: string;
}

// ─── Criptografia AES-256-GCM ─────────────────────────────────────────────────


// ─── Persistência ─────────────────────────────────────────────────────────────

const DB_KEY = "integration_credentials_v1";

/** Lê todas as credenciais de integração do banco (descriptografadas). */
export async function getIntegrationCredentials(): Promise<IntegrationCredentials> {
    try {
        const record = await db.appSetting.findUnique({ where: { key: DB_KEY } });
        if (!record || !record.value) return {};

        const raw = record.value as Record<string, string>;
        const result: IntegrationCredentials = {};

        for (const [k, v] of Object.entries(raw)) {
            if (typeof v !== "string") continue;
            try {
                const decrypted = decryptString(v);
                (result as Record<string, string>)[k] = decrypted;
            } catch {
                // ignora valores corrompidos
            }
        }

        return result;
    } catch {
        return {};
    }
}

/** Salva credenciais de integração no banco (criptografadas). */
export async function saveIntegrationCredentials(
    updates: Partial<IntegrationCredentials>
): Promise<void> {
    // Lê o estado atual para fazer merge
    const record = await db.appSetting.findUnique({ where: { key: DB_KEY } });
    const current = (record?.value as Record<string, string>) ?? {};

    const next: Record<string, string> = { ...current };

    for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === undefined || v === "") {
            delete next[k];
        } else {
            next[k] = encryptString(String(v));
        }
    }

    await db.appSetting.upsert({
        where: { key: DB_KEY },
        create: { key: DB_KEY, value: next },
        update: { value: next },
    });
}

/** Remove uma credencial específica. */
export async function deleteIntegrationCredential(key: IntegrationKey): Promise<void> {
    await saveIntegrationCredentials({ [key]: undefined } as Partial<IntegrationCredentials>);
}

/**
 * Retorna o valor de uma credencial, priorizando variável de ambiente.
 * Útil para as integrações consultarem o token de forma transparente.
 */
export async function resolveCredential(
    envKey: string,
    credentialKey: IntegrationKey
): Promise<string | undefined> {
    // Env var tem prioridade absoluta
    const fromEnv = process.env[envKey];
    if (fromEnv) return fromEnv;

    // Fallback: banco de dados
    const creds = await getIntegrationCredentials();
    return (creds as Record<string, string>)[credentialKey] || undefined;
}
