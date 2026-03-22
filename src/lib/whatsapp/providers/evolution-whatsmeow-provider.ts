import { createHmac, timingSafeEqual } from "crypto";
import { getEvolutionRuntimeState, updateEvolutionRuntimeState } from "@/lib/integrations/evolution-runtime-state";
import {
    getDecryptedConnectionSecret,
    updateWhatsappConnection,
} from "@/lib/whatsapp/application/connection-service";
import type {
    ConnectionSnapshot,
    WhatsappConnectionWithSecret,
    WhatsappProviderAdapter,
} from "@/lib/whatsapp/providers/types";

type EvolutionApiResponse<T = unknown> = {
    key?: { id?: string };
    message?: { key?: { id?: string } };
    instance?: {
        instanceName?: string;
        instanceId?: string;
        state?: string;
        status?: string;
        owner?: string | null;
        profileName?: string | null;
        name?: string | null;
    };
    qrcode?: {
        base64?: string;
        code?: string;
    };
} & T;

type EvolutionConnectResponse = {
    pairingCode?: string;
    code?: string;
    base64?: string;
    count?: number;
};

type EvolutionCreateInstanceResponse = EvolutionApiResponse & {
    hash?: string;
};

function getConfig(connection: WhatsappConnectionWithSecret) {
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
        integration: secret.integration || "WHATSAPP-BAILEYS",
        instanceName: connection.externalInstanceName || `whatsapp-${connection.id}`,
    };
}

function getWebhookBaseUrl() {
    const base =
        String(process.env.EVOLUTION_APP_URL || "").trim()
        || String(process.env.NEXT_PUBLIC_APP_URL || "").trim()
        || String(process.env.BETTER_AUTH_URL || "").trim();
    if (!base) return "";

    try {
        const parsed = new URL(base);
        const evolutionUrl = String(process.env.EVOLUTION_API_URL || "").trim().toLowerCase();
        const isLocalDocker = evolutionUrl.includes("localhost") || evolutionUrl.includes("127.0.0.1");
        if (isLocalDocker && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) {
            parsed.hostname = "host.docker.internal";
        }
        return parsed.toString().replace(/\/+$/, "");
    } catch {
        return base.replace(/\/+$/, "");
    }
}

function buildWebhookPayload(connection: WhatsappConnectionWithSecret) {
    const baseUrl = getWebhookBaseUrl();
    if (!baseUrl) return null;

    const config = getConfig(connection);
    return {
        url: `${baseUrl}/api/webhooks/evolution/messages`,
        enabled: true,
        byEvents: false,
        base64: false,
        headers: {
            apikey: config.webhookSecret,
            "x-connection-id": connection.id,
        },
        events: [
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "CONNECTION_UPDATE",
            "QRCODE_UPDATED",
        ],
    };
}

function normalizePhoneDigits(phone: string) {
    const digits = String(phone || "").replace(/\D/g, "");
    return digits.startsWith("55") ? digits : `55${digits}`;
}

/**
 * Maps Evolution API state strings to internal status codes.
 *
 * IMPORTANT: "connecting" means the engine is initializing — no QR yet.
 * QR_REQUIRED is only set when we actually receive a QR code (via QRCODE_UPDATED webhook
 * or when the state is explicitly "qr"/"qrcode").
 */
function normalizeState(rawState?: string | null): string {
    const state = String(rawState || "").trim().toLowerCase();
    if (!state) return "DISCONNECTED";
    if (state === "open" || state === "connected") return "CONNECTED";
    if (state === "qr" || state === "qrcode" || state === "qr_required") return "QR_REQUIRED";
    if (state === "connecting") return "CONNECTING";
    if (state === "close" || state === "closed" || state === "disconnected") return "DISCONNECTED";
    return state.toUpperCase();
}

async function request<T>(
    connection: WhatsappConnectionWithSecret,
    path: string,
    init?: RequestInit,
    expectedStatuses: number[] = [200, 201]
): Promise<T> {
    const config = getConfig(connection);
    let response: Response;

    try {
        response = await fetch(`${config.baseUrl}${path}`, {
            ...init,
            headers: {
                apikey: config.apiKey,
                ...(init?.headers || {}),
            },
            cache: "no-store",
        });
    } catch (error) {
        const reason = error instanceof Error && error.message ? ` (${error.message})` : "";
        throw new Error(
            `Nao foi possivel acessar a Evolution API em ${config.baseUrl}. Verifique se o servico esta online.${reason}`
        );
    }

    if (!expectedStatuses.includes(response.status)) {
        const body = await response.text().catch(() => "");
        throw new Error(body || `Evolution API respondeu ${response.status}`);
    }

    if (response.status === 204) return undefined as T;

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
}

async function configureWebhook(connection: WhatsappConnectionWithSecret) {
    const webhook = buildWebhookPayload(connection);
    if (!webhook) return;

    const config = getConfig(connection);
    await request(
        connection,
        `/webhook/set/${encodeURIComponent(config.instanceName)}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ webhook }),
        }
    );
}

async function fetchConnectionState(connection: WhatsappConnectionWithSecret) {
    const config = getConfig(connection);
    return request<EvolutionApiResponse>(
        connection,
        `/instance/connectionState/${encodeURIComponent(config.instanceName)}`,
        undefined,
        [200, 404]
    );
}

async function fetchInstances(connection: WhatsappConnectionWithSecret) {
    const config = getConfig(connection);
    const result = await request<unknown>(
        connection,
        `/instance/fetchInstances?instanceName=${encodeURIComponent(config.instanceName)}`,
        undefined,
        [200, 404]
    );

    if (Array.isArray(result)) return result as EvolutionApiResponse[];
    if (result && typeof result === "object" && Array.isArray((result as { instances?: unknown[] }).instances)) {
        return ((result as { instances?: unknown[] }).instances || []) as EvolutionApiResponse[];
    }
    return result ? [result as EvolutionApiResponse] : [];
}

async function requestConnectQr(connection: WhatsappConnectionWithSecret) {
    const config = getConfig(connection);
    return request<EvolutionConnectResponse>(
        connection,
        `/instance/connect/${encodeURIComponent(config.instanceName)}`,
        { method: "GET" },
        [200, 201]
    );
}

function buildConnectionSnapshot(
    connection: WhatsappConnectionWithSecret,
    data: EvolutionApiResponse | null | undefined
): ConnectionSnapshot {
    const instance = data?.instance;
    const state = normalizeState(
        instance?.state
        || instance?.status
        || (data as { state?: string })?.state
        || (data as { status?: string })?.status
    );

    return {
        ok: true,
        status: state,
        connected: state === "CONNECTED",
        qrCode: data?.qrcode?.base64 || null,
        qrCodeRaw: data?.qrcode?.code || null,
        connectedPhone: instance?.owner || connection.connectedPhone || null,
        connectedName: instance?.profileName || instance?.name || connection.connectedName || null,
        lastError: connection.lastError || null,
    };
}

export const evolutionWhatsmeowProvider: WhatsappProviderAdapter = {
    providerType: "EVOLUTION_WHATSMEOW",

    async validate(connection) {
        try {
            await fetchInstances(connection);
            return { ok: true };
        } catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : "Falha ao validar Evolution API",
            };
        }
    },

    async connect(connection) {
        let activeConnection = connection;
        const config = getConfig(activeConnection);

        // 1. Verifica se a instância já existe
        const existing = await fetchInstances(activeConnection);
        const hasInstance = existing.some((item) => {
            const name =
                item.instance?.instanceName
                || (item as { instanceName?: string }).instanceName
                || (item as { name?: string }).name;
            return name === config.instanceName;
        });

        // 2. Cria instância se não existir
        if (!hasInstance) {
            const webhook = buildWebhookPayload(activeConnection);
            const created = await request<EvolutionCreateInstanceResponse>(
                activeConnection,
                "/instance/create",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        instanceName: config.instanceName,
                        integration: config.integration,
                        token: String(process.env.EVOLUTION_INSTANCE_TOKEN || ""),
                        qrcode: true,
                        rejectCall: true,
                        groupsIgnore: true,
                        alwaysOnline: true,
                        readMessages: false,
                        readStatus: true,
                        syncFullHistory: false,
                        ...(webhook ? { webhook } : {}),
                    }),
                }
            );

            // Salva webhook secret se a Evolution retornou um hash
            const createdHash = typeof created?.hash === "string" ? created.hash : null;
            const currentSecret = getDecryptedConnectionSecret(activeConnection);
            if (
                createdHash
                && currentSecret?.providerType === "EVOLUTION_WHATSMEOW"
                && currentSecret.webhookSecret !== createdHash
            ) {
                const updated = await updateWhatsappConnection(activeConnection.id, {
                    secretPayload: { ...currentSecret, webhookSecret: createdHash },
                });
                if (updated) activeConnection = updated;
            }
        }

        // 3. Configura webhook por instância (garante que chegue ao app correto)
        await configureWebhook(activeConnection);

        // 4. Dispara geração de QR — com whatsmeow, o QR chega via webhook QRCODE_UPDATED
        //    Não esperamos o QR aqui; apenas iniciamos o processo.
        await requestConnectQr(activeConnection).catch(() => null);

        // 5. Atualiza status para CONNECTING no banco
        await updateWhatsappConnection(activeConnection.id, {
            status: "CONNECTING",
            lastError: null,
            externalInstanceName: config.instanceName,
        });

        return {
            ok: true,
            status: "CONNECTING",
            qrCode: null,
            qrCodeRaw: null,
            connectedPhone: null,
            connectedName: null,
        };
    },

    async disconnect(connection) {
        const config = getConfig(connection);
        await request(
            connection,
            `/instance/logout/${encodeURIComponent(config.instanceName)}`,
            { method: "DELETE" },
            [200, 201, 204]
        ).catch(async () => {
            await request(
                connection,
                `/instance/delete/${encodeURIComponent(config.instanceName)}`,
                { method: "DELETE" },
                [200, 201, 204]
            ).catch(() => null);
        });
    },

    async getStatus(connection) {
        const state = await fetchConnectionState(connection).catch(() => null);
        return buildConnectionSnapshot(connection, state);
    },

    async getQrCode(connection) {
        // 1. Prioridade: runtime state atualizado pelo webhook QRCODE_UPDATED
        const runtime = getEvolutionRuntimeState();
        if (runtime.qrCodeRaw || runtime.qrCode) {
            return {
                qrCode: runtime.qrCode,
                qrCodeRaw: runtime.qrCodeRaw,
            };
        }

        // 2. Fallback: consultar connectionState da Evolution (pode ter qrcode inline)
        const state = await fetchConnectionState(connection).catch(() => null);
        if (state?.qrcode?.base64 || state?.qrcode?.code) {
            return {
                qrCode: state.qrcode.base64 || null,
                qrCodeRaw: state.qrcode.code || null,
            };
        }

        // 3. Último recurso: endpoint /instance/connect retorna QR se disponível
        const connectResult = await requestConnectQr(connection).catch(() => null);
        return {
            qrCode: connectResult?.base64 || null,
            qrCodeRaw: connectResult?.code || null,
        };
    },

    async sendText(input) {
        const config = getConfig(input.connection);
        const result = await request<EvolutionApiResponse>(
            input.connection,
            `/message/sendText/${encodeURIComponent(config.instanceName)}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    number: normalizePhoneDigits(input.to),
                    text: input.text,
                    delay: 0,
                }),
            }
        );

        return {
            ok: true,
            providerMessageId: result?.key?.id || result?.message?.key?.id || null,
            status: "SENT",
            raw: result,
        };
    },

    async sendMedia(input) {
        const config = getConfig(input.connection);
        const payload = input.fileBuffer
            ? `data:${input.mimeType};base64,${input.fileBuffer.toString("base64")}`
            : input.fileUrl;

        if (!payload) {
            return { ok: false, status: "FAILED", error: "Arquivo ou URL de midia nao informado." };
        }

        const isVoice = input.mimeType.startsWith("audio/") && input.asVoiceNote;
        const endpoint = isVoice
            ? `/message/sendWhatsAppAudio/${encodeURIComponent(config.instanceName)}`
            : `/message/sendMedia/${encodeURIComponent(config.instanceName)}`;

        const body = isVoice
            ? { number: normalizePhoneDigits(input.to), audio: payload, delay: 0 }
            : {
                number: normalizePhoneDigits(input.to),
                mediatype: input.mimeType,
                mimetype: input.mimeType,
                caption: input.caption || "",
                media: payload,
                fileName: input.fileName,
                delay: 0,
            };

        const result = await request<EvolutionApiResponse>(
            input.connection,
            endpoint,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }
        );

        return {
            ok: true,
            providerMessageId: result?.key?.id || result?.message?.key?.id || null,
            status: "SENT",
            raw: result,
        };
    },

    async healthCheck(connection) {
        try {
            const status = await fetchConnectionState(connection);
            const snapshot = buildConnectionSnapshot(connection, status);
            return {
                ok: snapshot.connected,
                status: snapshot.status,
                details: {
                    connectedPhone: snapshot.connectedPhone,
                    connectedName: snapshot.connectedName,
                },
                error: snapshot.connected ? undefined : snapshot.lastError || "Instancia nao conectada",
            };
        } catch (error) {
            return {
                ok: false,
                status: "ERROR",
                error: error instanceof Error ? error.message : "Health check falhou",
            };
        }
    },

    async normalizeWebhook(request, connection) {
        const bodyText = await request.text();
        const signature =
            request.headers.get("x-api-key")
            || request.headers.get("apikey")
            || request.headers.get("x-signature");
        const headerConnectionId = request.headers.get("x-connection-id");
        const config = getConfig(connection);

        if (signature) {
            const digest = createHmac("sha256", config.webhookSecret).update(bodyText).digest("hex");
            const received = signature.trim();
            const isValidHmac =
                received.length === digest.length
                && timingSafeEqual(Buffer.from(received), Buffer.from(digest));
            const isDirectKey = received === config.webhookSecret || received === config.apiKey;
            const isScopedConnection = headerConnectionId === connection.id;

            if (!isValidHmac && !isDirectKey && !isScopedConnection) {
                throw new Error("Assinatura do webhook Evolution invalida.");
            }
        }

        const payload = JSON.parse(bodyText) as Record<string, unknown>;
        const event = String(payload.event || "").toUpperCase();
        const data = (payload.data as Record<string, unknown>) || payload;

        // ── MESSAGES_UPDATE ─────────────────────────────────────────────────────────
        if (event === "MESSAGES_UPDATE" || event === "MESSAGES.UPDATE") {
            // Evolution API v2 sends data as an array of updates
            const updates = Array.isArray(payload.data)
                ? (payload.data as Record<string, unknown>[])
                : [data];

            const results: NormalizedWebhookEvent[] = [];
            for (const item of updates) {
                const key = item.key as Record<string, unknown> | undefined;
                const update = item.update as Record<string, unknown> | undefined;
                if (!key?.id) continue;

                const rawStatus = update?.status;
                const status =
                    rawStatus === 4 || rawStatus === 5 || rawStatus === "READ" || rawStatus === "PLAYED"
                        ? "READ"
                        : rawStatus === 3 || rawStatus === "DELIVERY_ACK"
                            ? "DELIVERED"
                            : rawStatus === 2 || rawStatus === "SERVER_ACK"
                                ? "SENT"
                                : rawStatus === 0 || rawStatus === "ERROR"
                                    ? "FAILED"
                                    : "SENT";

                results.push({
                    type: "message.status",
                    connectionId: connection.id,
                    providerMessageId: String(key.id),
                    status,
                    occurredAt: new Date().toISOString(),
                    rawEvent: payload,
                });
            }
            return results;
        }

        // ── CONNECTION_UPDATE / QRCODE_UPDATED ──────────────────────────────────────
        if (
            event === "CONNECTION_UPDATE"
            || event === "CONNECTION.UPDATE"
            || event === "QRCODE_UPDATED"
            || event === "QRCODE.UPDATED"
        ) {
            const instanceData =
                typeof data.instance === "object" && data.instance !== null
                    ? (data.instance as Record<string, unknown>)
                    : undefined;
            const qrPayload =
                typeof data.qrcode === "object" && data.qrcode !== null
                    ? (data.qrcode as Record<string, unknown>)
                    : undefined;

            const qrCode =
                typeof qrPayload?.base64 === "string"
                    ? qrPayload.base64
                    : typeof data.qrcode === "string"
                        ? data.qrcode
                        : null;
            const qrCodeRaw =
                typeof qrPayload?.code === "string"
                    ? qrPayload.code
                    : typeof data.code === "string"
                        ? data.code
                        : typeof data.qrcode === "string"
                            ? data.qrcode
                            : null;

            // Se tem payload de QR, status é QR_REQUIRED independente do campo state
            const hasQr = Boolean(qrCode || qrCodeRaw);
            const normalizedStatus = hasQr
                ? "QR_REQUIRED"
                : normalizeState(
                    String(
                        data.state
                        || data.status
                        || instanceData?.state
                        || instanceData?.status
                        || ""
                    )
                );

            return [{
                type: "connection.status",
                connectionId: connection.id,
                status: normalizedStatus,
                qrCode,
                qrCodeRaw,
                phone:
                    typeof data.owner === "string"
                        ? data.owner
                        : typeof instanceData?.owner === "string"
                            ? instanceData.owner
                            : null,
                name:
                    typeof data.profileName === "string"
                        ? data.profileName
                        : typeof data.name === "string"
                            ? data.name
                            : typeof instanceData?.profileName === "string"
                                ? instanceData.profileName
                                : typeof instanceData?.name === "string"
                                    ? instanceData.name
                                    : null,
                rawEvent: payload,
            }];
        }

        // ── MESSAGES_UPSERT ─────────────────────────────────────────────────────────
        const key = data.key as Record<string, unknown> | undefined;
        const message = data.message as Record<string, unknown> | undefined;
        if (!key || !message || key.fromMe || String(key.remoteJid || "").includes("@g.us")) {
            return [];
        }

        const remoteJid = String(key.remoteJid || "");
        const phone = remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "");
        const text =
            (message.conversation as string)
            || (message.extendedTextMessage as { text?: string } | undefined)?.text
            || null;

        return [{
            type: "message.inbound",
            connectionId: connection.id,
            providerMessageId: String(key.id || ""),
            phone,
            text,
            receivedAt: new Date().toISOString(),
            rawEvent: payload,
        }];
    },
};
