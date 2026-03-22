import { getDecryptedConnectionSecret } from "@/lib/whatsapp/application/connection-service";
import type {
    ConnectionSnapshot,
    NormalizedWebhookEvent,
    WhatsappConnectionWithSecret,
    WhatsappProviderAdapter,
} from "@/lib/whatsapp/providers/types";

const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || "v22.0";

function getConfig(connection: WhatsappConnectionWithSecret) {
    const secret = getDecryptedConnectionSecret(connection);
    if (!secret || secret.providerType !== "META_CLOUD_API") {
        throw new Error("Credenciais Meta Cloud API nao configuradas para esta conexao.");
    }

    return {
        accessToken: secret.accessToken,
        appSecret: secret.appSecret || "",
        verifyToken: secret.verifyToken,
        phoneNumberId: secret.phoneNumberId,
        businessAccountId: secret.businessAccountId || null,
        baseUrl: `https://graph.facebook.com/${META_GRAPH_API_VERSION}`,
    };
}

function normalizePhoneDigits(phone: string) {
    const digits = String(phone || "").replace(/\D/g, "");
    return digits.startsWith("55") ? digits : `55${digits}`;
}

async function request<T>(
    connection: WhatsappConnectionWithSecret,
    path: string,
    init?: RequestInit,
    expectedStatuses: number[] = [200]
): Promise<T> {
    const config = getConfig(connection);
    const response = await fetch(`${config.baseUrl}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
            ...(init?.headers || {}),
        },
        cache: "no-store",
    });

    if (!expectedStatuses.includes(response.status)) {
        const body = await response.text().catch(() => "");
        throw new Error(body || `Meta API respondeu ${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) as T : undefined as T;
}

async function fetchPhoneNumberProfile(connection: WhatsappConnectionWithSecret) {
    const config = getConfig(connection);
    return request<{
        display_phone_number?: string;
        verified_name?: string;
        id?: string;
        quality_rating?: string;
    }>(
        connection,
        `/${encodeURIComponent(config.phoneNumberId)}?fields=display_phone_number,verified_name,quality_rating`
    );
}

function connectedSnapshot(connection: WhatsappConnectionWithSecret, data?: {
    display_phone_number?: string;
    verified_name?: string;
}): ConnectionSnapshot {
    return {
        ok: true,
        status: "CONNECTED",
        connected: true,
        connectedPhone: data?.display_phone_number || connection.connectedPhone || null,
        connectedName: data?.verified_name || connection.connectedName || null,
        qrCode: null,
        qrCodeRaw: null,
        lastError: null,
    };
}

export const metaCloudProvider: WhatsappProviderAdapter = {
    providerType: "META_CLOUD_API",

    async validate(connection) {
        try {
            const profile = await fetchPhoneNumberProfile(connection);
            return {
                ok: true,
                metadata: {
                    phoneNumberId: getConfig(connection).phoneNumberId,
                    displayPhoneNumber: profile.display_phone_number || null,
                    verifiedName: profile.verified_name || null,
                },
            };
        } catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : "Falha ao validar credenciais da Meta",
            };
        }
    },

    async connect(connection) {
        const profile = await fetchPhoneNumberProfile(connection);
        const snapshot = connectedSnapshot(connection, profile);
        return {
            ok: true,
            status: snapshot.status,
            connectedPhone: snapshot.connectedPhone,
            connectedName: snapshot.connectedName,
        };
    },

    async disconnect() {
        return;
    },

    async getStatus(connection) {
        const profile = await fetchPhoneNumberProfile(connection);
        return connectedSnapshot(connection, profile);
    },

    async getQrCode() {
        return null;
    },

    async sendText(input) {
        const config = getConfig(input.connection);
        const result = await request<{ messages?: Array<{ id?: string }> }>(
            input.connection,
            `/${encodeURIComponent(config.phoneNumberId)}/messages`,
            {
                method: "POST",
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: normalizePhoneDigits(input.to),
                    type: "text",
                    text: { body: input.text },
                }),
            },
            [200, 201]
        );

        return {
            ok: true,
            providerMessageId: result.messages?.[0]?.id || null,
            status: "SENT",
            raw: result,
        };
    },

    async sendMedia(input) {
        const config = getConfig(input.connection);
        if (!input.fileUrl) {
            return {
                ok: false,
                status: "FAILED",
                error: "Meta Cloud API requer URL publica para envio de midia nesta versao da integracao.",
            };
        }

        const mediaType = input.mimeType.startsWith("image/")
            ? "image"
            : input.mimeType.startsWith("video/")
                ? "video"
                : input.mimeType.startsWith("audio/")
                    ? "audio"
                    : "document";

        const payload = mediaType === "audio"
            ? {
                messaging_product: "whatsapp",
                to: normalizePhoneDigits(input.to),
                type: "audio",
                audio: { link: input.fileUrl },
            }
            : mediaType === "image"
                ? {
                    messaging_product: "whatsapp",
                    to: normalizePhoneDigits(input.to),
                    type: "image",
                    image: { link: input.fileUrl, caption: input.caption || undefined },
                }
                : mediaType === "video"
                    ? {
                        messaging_product: "whatsapp",
                        to: normalizePhoneDigits(input.to),
                        type: "video",
                        video: { link: input.fileUrl, caption: input.caption || undefined },
                    }
                    : {
                        messaging_product: "whatsapp",
                        to: normalizePhoneDigits(input.to),
                        type: "document",
                        document: {
                            link: input.fileUrl,
                            caption: input.caption || undefined,
                            filename: input.fileName,
                        },
                    };

        const result = await request<{ messages?: Array<{ id?: string }> }>(
            input.connection,
            `/${encodeURIComponent(config.phoneNumberId)}/messages`,
            {
                method: "POST",
                body: JSON.stringify(payload),
            },
            [200, 201]
        );

        return {
            ok: true,
            providerMessageId: result.messages?.[0]?.id || null,
            status: "SENT",
            raw: result,
        };
    },

    async healthCheck(connection) {
        try {
            const profile = await fetchPhoneNumberProfile(connection);
            return {
                ok: true,
                status: "CONNECTED",
                details: {
                    displayPhoneNumber: profile.display_phone_number || null,
                    verifiedName: profile.verified_name || null,
                    qualityRating: profile.quality_rating || null,
                },
            };
        } catch (error) {
            return {
                ok: false,
                status: "ERROR",
                error: error instanceof Error ? error.message : "Falha no health check da Meta",
            };
        }
    },

    async normalizeWebhook(request, connection) {
        const payload = await request.json() as {
            entry?: Array<{
                changes?: Array<{
                    value?: {
                        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
                        messages?: Array<{
                            id?: string;
                            from?: string;
                            timestamp?: string;
                            type?: string;
                            text?: { body?: string };
                            image?: { mime_type?: string; caption?: string };
                            video?: { mime_type?: string; caption?: string };
                            audio?: { mime_type?: string };
                            document?: { mime_type?: string; filename?: string; caption?: string };
                        }>;
                        statuses?: Array<{
                            id?: string;
                            status?: string;
                            timestamp?: string;
                        }>;
                        metadata?: {
                            phone_number_id?: string;
                        };
                    };
                }>;
            }>;
        };

        const events: NormalizedWebhookEvent[] = [];

        for (const entry of payload.entry || []) {
            for (const change of entry.changes || []) {
                const value = change.value;
                if (!value) continue;

                for (const status of value.statuses || []) {
                    if (!status.id) continue;
                    const mappedStatus = status.status === "read"
                        ? "READ"
                        : status.status === "delivered"
                            ? "DELIVERED"
                            : status.status === "failed"
                                ? "FAILED"
                                : "SENT";

                    events.push({
                        type: "message.status",
                        connectionId: connection.id,
                        providerMessageId: status.id,
                        status: mappedStatus,
                        occurredAt: status.timestamp ? new Date(Number(status.timestamp) * 1000).toISOString() : new Date().toISOString(),
                        rawEvent: change,
                    });
                }

                for (const message of value.messages || []) {
                    if (!message.id || !message.from) continue;
                    const contact = (value.contacts || []).find((item) => item.wa_id === message.from);
                    const media = message.type && message.type !== "text"
                        ? {
                            mimeType:
                                message.image?.mime_type
                                || message.video?.mime_type
                                || message.audio?.mime_type
                                || message.document?.mime_type
                                || null,
                            fileName: message.document?.filename || null,
                            caption: message.image?.caption || message.video?.caption || message.document?.caption || null,
                            url: null,
                        }
                        : null;

                    events.push({
                        type: "message.inbound",
                        connectionId: connection.id,
                        providerMessageId: message.id,
                        phone: message.from,
                        senderName: contact?.profile?.name || null,
                        text: message.text?.body || media?.caption || null,
                        media,
                        receivedAt: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString(),
                        rawEvent: change,
                    });
                }
            }
        }

        return events;
    },
};
