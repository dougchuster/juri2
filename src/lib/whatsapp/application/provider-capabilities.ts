import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { whatsappService } from "@/lib/integrations/baileys-service";
import {
    getDecryptedConnectionSecret,
    getPrimaryWhatsappConnection,
    listWhatsappConnections,
    updateWhatsappConnection,
} from "@/lib/whatsapp/application/connection-service";
import type { WhatsappConnectionWithSecret } from "@/lib/whatsapp/providers/types";
import { normalizeWhatsApp } from "@/lib/utils/phone";

type CapabilityResult<T> = T & {
    providerType?: string | null;
};

function normalizePhoneDigits(phone: string) {
    return normalizeWhatsApp(phone);
}

function assertEvolutionConnection(connection: WhatsappConnectionWithSecret) {
    const secret = getDecryptedConnectionSecret(connection);
    if (!secret || secret.providerType !== "EVOLUTION_WHATSMEOW") {
        throw new Error("Credenciais Evolution nao configuradas para esta conexao.");
    }

    const baseUrl = String(connection.baseUrl || "").replace(/\/+$/, "");
    if (!baseUrl) {
        throw new Error("Base URL da Evolution nao configurada.");
    }

    return {
        baseUrl,
        apiKey: secret.apiKey,
        webhookSecret: secret.webhookSecret || process.env.EVOLUTION_WEBHOOK_SECRET || secret.apiKey,
        instanceName: connection.externalInstanceName || `whatsapp-${connection.id}`,
    };
}

async function evolutionRequest<T>(
    connection: WhatsappConnectionWithSecret,
    path: string,
    init?: RequestInit,
    expectedStatuses: number[] = [200, 201]
): Promise<T> {
    const config = assertEvolutionConnection(connection);
    const response = await fetch(`${config.baseUrl}${path}`, {
        ...init,
        headers: {
            apikey: config.apiKey,
            ...(init?.headers || {}),
        },
        cache: "no-store",
    });

    if (!expectedStatuses.includes(response.status)) {
        const body = await response.text().catch(() => "");
        throw new Error(body || `Evolution API respondeu ${response.status}`);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    const text = await response.text();
    return text ? JSON.parse(text) as T : undefined as T;
}

export async function checkWhatsappNumberCapability(phone: string): Promise<CapabilityResult<{
    ok: boolean;
    exists: boolean;
    jid?: string;
    error?: string;
}>> {
    const connection = await getPrimaryWhatsappConnection();
    if (!connection) {
        return { ok: false, exists: false, error: "Nenhuma conexao primaria configurada" };
    }

    if (connection.providerType === "META_CLOUD_API") {
        return {
            ok: false,
            exists: false,
            error: "Verificacao de numero nao suportada para Meta Cloud API nesta integracao.",
            providerType: connection.providerType,
        };
    }

    if (connection.providerType === "EMBEDDED_BAILEYS_LEGACY") {
        const result = await whatsappService.checkNumber(phone);
        return { ...result, providerType: connection.providerType };
    }

    try {
        const result = await evolutionRequest<Array<{ exists?: boolean; jid?: string }>>(
            connection,
            `/chat/whatsappNumbers/${encodeURIComponent(assertEvolutionConnection(connection).instanceName)}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numbers: [normalizePhoneDigits(phone)] }),
            }
        );

        const first = Array.isArray(result) ? result[0] : undefined;
        return {
            ok: true,
            exists: Boolean(first?.exists),
            jid: first?.jid || undefined,
            providerType: connection.providerType,
        };
    } catch (error) {
        return {
            ok: false,
            exists: false,
            error: error instanceof Error ? error.message : "Falha ao verificar numero",
            providerType: connection.providerType,
        };
    }
}

export async function getWhatsappAvatarCapability(phone: string): Promise<CapabilityResult<{
    ok: boolean;
    url: string | null;
    error?: string;
}>> {
    const connection = await getPrimaryWhatsappConnection();
    if (!connection) {
        return { ok: false, url: null, error: "Nenhuma conexao primaria configurada" };
    }

    if (connection.providerType === "META_CLOUD_API") {
        return {
            ok: false,
            url: null,
            error: "Avatar remoto nao suportado para Meta Cloud API nesta integracao.",
            providerType: connection.providerType,
        };
    }

    if (connection.providerType === "EMBEDDED_BAILEYS_LEGACY") {
        const result = await whatsappService.getProfilePictureUrl(phone);
        return { ...result, providerType: connection.providerType };
    }

    try {
        const result = await evolutionRequest<{ profilePictureUrl?: string | null; url?: string | null }>(
            connection,
            `/chat/fetchProfilePictureUrl/${encodeURIComponent(assertEvolutionConnection(connection).instanceName)}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ number: normalizePhoneDigits(phone) }),
            }
        );

        return {
            ok: true,
            url: result?.profilePictureUrl || result?.url || null,
            providerType: connection.providerType,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao buscar avatar";
        if (message.includes("404") || message.toLowerCase().includes("not found")) {
            return { ok: true, url: null, providerType: connection.providerType };
        }
        return { ok: false, url: null, error: message, providerType: connection.providerType };
    }
}

export async function requestWhatsappHistorySyncCapability(): Promise<CapabilityResult<{
    ok: boolean;
    error?: string;
}>> {
    const connection = await getPrimaryWhatsappConnection();
    if (!connection) {
        return { ok: false, error: "Nenhuma conexao primaria configurada" };
    }

    if (connection.providerType === "META_CLOUD_API") {
        return { ok: false, error: "Sync de historico nao e suportado na Meta Cloud API", providerType: connection.providerType };
    }

    if (connection.providerType === "EMBEDDED_BAILEYS_LEGACY") {
        try {
            await whatsappService.requestHistorySync();
            return { ok: true, providerType: connection.providerType };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : "Falha no history sync", providerType: connection.providerType };
        }
    }

    try {
        const config = assertEvolutionConnection(connection);
        await evolutionRequest(
            connection,
            `/settings/set/${encodeURIComponent(config.instanceName)}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rejectCall: true,
                    msgCall: "No momento nao atendemos chamadas por este numero.",
                    groupsIgnore: true,
                    alwaysOnline: true,
                    readMessages: false,
                    readStatus: true,
                    syncFullHistory: true,
                }),
            }
        );
        await evolutionRequest(
            connection,
            `/instance/restart/${encodeURIComponent(config.instanceName)}`,
            { method: "PUT" },
            [200, 201, 204]
        );
        await updateWhatsappConnection(connection.id, {
            status: "CONNECTING",
            lastError: null,
            lastSyncAt: new Date(),
        });
        return { ok: true, providerType: connection.providerType };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Falha no history sync", providerType: connection.providerType };
    }
}

export async function validateEvolutionWebhookSignatureCapability(payload: string, signature: string | null) {
    if (!signature) return false;

    const candidateSecrets = new Set<string>();
    const connections = await listWhatsappConnections();

    for (const connection of connections) {
        if (connection.providerType !== "EVOLUTION_WHATSMEOW") continue;
        const secret = getDecryptedConnectionSecret(connection);
        if (secret?.providerType === "EVOLUTION_WHATSMEOW") {
            if (secret.webhookSecret) candidateSecrets.add(secret.webhookSecret);
            if (secret.apiKey) candidateSecrets.add(secret.apiKey);
        }
    }

    if (process.env.EVOLUTION_WEBHOOK_SECRET) candidateSecrets.add(process.env.EVOLUTION_WEBHOOK_SECRET);
    if (process.env.EVOLUTION_API_KEY) candidateSecrets.add(process.env.EVOLUTION_API_KEY);

    for (const candidate of candidateSecrets) {
        const expectedHmac = createHmac("sha256", candidate).update(payload, "utf8").digest("hex");
        if (safeCompare(signature, expectedHmac) || safeCompare(signature, candidate)) {
            return true;
        }
    }

    if (process.env.NODE_ENV === "production") {
        console.error("[provider-capabilities] Nenhum segredo Evolution valido para o webhook em producao");
        return false;
    }

    return candidateSecrets.size === 0;
}

function safeCompare(value: string, expected: string) {
    try {
        const valueBuffer = Buffer.from(value);
        const expectedBuffer = Buffer.from(expected);
        if (valueBuffer.length !== expectedBuffer.length) return false;
        return timingSafeEqual(valueBuffer, expectedBuffer);
    } catch {
        return false;
    }
}
