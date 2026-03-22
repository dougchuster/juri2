import { db } from "@/lib/db";
import {
    getDecryptedConnectionSecret,
    getPrimaryWhatsappConnection,
} from "@/lib/whatsapp/application/connection-service";

export type WhatsappConfig = {
    mode: "none" | "evolution" | "meta";
    evolution: {
        url: string;
        apiKey: string;
        instanceName: string;
        integration: "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS";
        webhookSecret: string;
    };
    meta: {
        phoneNumberId: string;
        accessToken: string;
        webhookVerifyToken: string;
        businessId: string;
    };
};

const DEFAULT_CONFIG: WhatsappConfig = {
    mode: "none",
    evolution: {
        url: process.env.EVOLUTION_API_URL ?? "",
        apiKey: process.env.EVOLUTION_API_KEY ?? "",
        instanceName: process.env.EVOLUTION_INSTANCE_NAME ?? "",
        integration: "WHATSAPP-BAILEYS",
        webhookSecret: process.env.EVOLUTION_WEBHOOK_SECRET ?? "",
    },
    meta: {
        phoneNumberId: process.env.META_PHONE_NUMBER_ID ?? "",
        accessToken: process.env.META_ACCESS_TOKEN ?? "",
        webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN ?? "",
        businessId: process.env.META_BUSINESS_ID ?? "",
    },
};

const SETTING_KEY = "whatsapp.config";
const CACHE_TTL_MS = 30_000;

let cachedConfig: WhatsappConfig | null = null;
let cacheExpiresAt = 0;

export async function getWhatsappConfig(): Promise<WhatsappConfig> {
    const now = Date.now();
    if (cachedConfig && now < cacheExpiresAt) {
        return cachedConfig;
    }

    const primaryConnection = await getPrimaryWhatsappConnection();
    const primarySecret = primaryConnection ? getDecryptedConnectionSecret(primaryConnection) : null;

    if (primaryConnection?.isActive && primarySecret) {
        let resolvedFromConnection: WhatsappConfig | null = null;

        if (
            primaryConnection.providerType === "EVOLUTION_WHATSMEOW" &&
            primarySecret.providerType === "EVOLUTION_WHATSMEOW"
        ) {
            resolvedFromConnection = {
                mode: "evolution",
                evolution: {
                    url: primaryConnection.baseUrl ?? DEFAULT_CONFIG.evolution.url,
                    apiKey: primarySecret.apiKey,
                    instanceName: primaryConnection.externalInstanceName ?? DEFAULT_CONFIG.evolution.instanceName,
                    integration:
                        primarySecret.integration === "WHATSAPP-BAILEYS" || primarySecret.integration === "WHATSAPP-BUSINESS"
                            ? primarySecret.integration
                            : DEFAULT_CONFIG.evolution.integration,
                    webhookSecret: primarySecret.webhookSecret ?? DEFAULT_CONFIG.evolution.webhookSecret,
                },
                meta: DEFAULT_CONFIG.meta,
            };
        }

        if (
            primaryConnection.providerType === "META_CLOUD_API" &&
            primarySecret.providerType === "META_CLOUD_API"
        ) {
            resolvedFromConnection = {
                mode: "meta",
                evolution: DEFAULT_CONFIG.evolution,
                meta: {
                    phoneNumberId: primarySecret.phoneNumberId,
                    accessToken: primarySecret.accessToken,
                    webhookVerifyToken: primarySecret.verifyToken,
                    businessId: primarySecret.businessAccountId ?? DEFAULT_CONFIG.meta.businessId,
                },
            };
        }

        if (resolvedFromConnection) {
            cachedConfig = resolvedFromConnection;
            cacheExpiresAt = now + CACHE_TTL_MS;
            return resolvedFromConnection;
        }
    }

    const setting = await db.appSetting.findUnique({ where: { key: SETTING_KEY } });

    let config: WhatsappConfig;
    if (setting?.value && typeof setting.value === "object" && !Array.isArray(setting.value)) {
        const raw = setting.value as Record<string, unknown>;
        config = {
            mode: (raw.mode as WhatsappConfig["mode"]) ?? DEFAULT_CONFIG.mode,
            evolution: {
                ...DEFAULT_CONFIG.evolution,
                ...((raw.evolution as Partial<WhatsappConfig["evolution"]>) ?? {}),
            },
            meta: {
                ...DEFAULT_CONFIG.meta,
                ...((raw.meta as Partial<WhatsappConfig["meta"]>) ?? {}),
            },
        };
    } else {
        config = DEFAULT_CONFIG;
    }

    cachedConfig = config;
    cacheExpiresAt = now + CACHE_TTL_MS;

    return config;
}

export async function getWhatsappMode(): Promise<"none" | "evolution" | "meta"> {
    const config = await getWhatsappConfig();
    return config.mode;
}

export function invalidateWhatsappConfigCache(): void {
    cachedConfig = null;
    cacheExpiresAt = 0;
}
