import type {
    MessageStatus,
    WhatsappConnection,
    WhatsappConnectionSecret,
    WhatsappProviderType,
} from "@/generated/prisma";

export type WhatsappConnectionWithSecret = WhatsappConnection & {
    secret: WhatsappConnectionSecret | null;
};

export type WhatsappConnectionSecretPayload =
    | {
        providerType: "META_CLOUD_API";
        accessToken: string;
        appSecret?: string;
        verifyToken: string;
        phoneNumberId: string;
        businessAccountId?: string;
    }
    | {
        providerType: "EVOLUTION_WHATSMEOW";
        apiKey: string;
        webhookSecret?: string;
        integration?: string;
    }
    | {
        providerType: "EMBEDDED_BAILEYS_LEGACY";
        enabled: true;
    };

export interface ValidationResult {
    ok: boolean;
    error?: string;
    metadata?: Record<string, unknown>;
}

export interface ConnectResult {
    ok: boolean;
    status: string;
    qrCode?: string | null;
    qrCodeRaw?: string | null;
    connectedPhone?: string | null;
    connectedName?: string | null;
    error?: string;
}

export interface ConnectionSnapshot {
    ok: boolean;
    status: string;
    connected: boolean;
    qrCode?: string | null;
    qrCodeRaw?: string | null;
    connectedPhone?: string | null;
    connectedName?: string | null;
    lastError?: string | null;
}

export interface HealthSnapshot {
    ok: boolean;
    status: string;
    details?: Record<string, unknown>;
    error?: string;
}

export interface ProviderSendResult {
    ok: boolean;
    providerMessageId?: string | null;
    status?: MessageStatus;
    raw?: unknown;
    error?: string;
}

export interface SendTextInput {
    connection: WhatsappConnectionWithSecret;
    to: string;
    text: string;
}

export interface SendMediaInput {
    connection: WhatsappConnectionWithSecret;
    to: string;
    fileUrl?: string;
    mimeType: string;
    fileName: string;
    caption?: string;
    fileBuffer?: Buffer;
    asVoiceNote?: boolean;
}

export interface QrCodeSnapshot {
    qrCode: string | null;
    qrCodeRaw: string | null;
}

export type NormalizedWebhookEvent =
    | {
        type: "message.inbound";
        connectionId: string;
        providerMessageId: string;
        phone: string;
        senderName?: string | null;
        text?: string | null;
        media?: {
            mimeType?: string | null;
            fileName?: string | null;
            url?: string | null;
            caption?: string | null;
        } | null;
        receivedAt: string;
        rawEvent: unknown;
    }
    | {
        type: "message.status";
        connectionId: string;
        providerMessageId: string;
        status: MessageStatus;
        occurredAt: string;
        rawEvent: unknown;
    }
    | {
        type: "connection.status";
        connectionId: string;
        status: string;
        qrCode?: string | null;
        qrCodeRaw?: string | null;
        phone?: string | null;
        name?: string | null;
        rawEvent: unknown;
    };

export interface WhatsappProviderAdapter {
    readonly providerType: WhatsappProviderType;
    validate(connection: WhatsappConnectionWithSecret): Promise<ValidationResult>;
    connect(connection: WhatsappConnectionWithSecret): Promise<ConnectResult>;
    disconnect(connection: WhatsappConnectionWithSecret): Promise<void>;
    getStatus(connection: WhatsappConnectionWithSecret): Promise<ConnectionSnapshot>;
    getQrCode(connection: WhatsappConnectionWithSecret): Promise<QrCodeSnapshot | null>;
    sendText(input: SendTextInput): Promise<ProviderSendResult>;
    sendMedia(input: SendMediaInput): Promise<ProviderSendResult>;
    healthCheck(connection: WhatsappConnectionWithSecret): Promise<HealthSnapshot>;
    normalizeWebhook(request: Request, connection: WhatsappConnectionWithSecret): Promise<NormalizedWebhookEvent[]>;
}
