import { NextResponse } from "next/server";
import { requireWhatsAppAdminContext } from "@/app/api/admin/whatsapp/utils";
import { getWhatsappProviderAdapter } from "@/lib/whatsapp/providers/provider-registry";
import type {
    WhatsappConnectionSecretPayload,
    WhatsappConnectionWithSecret,
} from "@/lib/whatsapp/providers/types";

interface LegacyEvolutionTestBody {
    url?: string;
    apiKey?: string;
    instanceName?: string;
}

interface LegacyMetaTestBody {
    phoneNumberId?: string;
    accessToken?: string;
    webhookVerifyToken?: string;
    businessId?: string;
}

export async function POST(request: Request) {
    const auth = await requireWhatsAppAdminContext();
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as LegacyEvolutionTestBody &
        LegacyMetaTestBody & {
            providerType?: "EVOLUTION_WHATSMEOW" | "META_CLOUD_API";
        };

    const providerType =
        body.providerType
        || (body.phoneNumberId && body.accessToken && body.webhookVerifyToken ? "META_CLOUD_API" : "EVOLUTION_WHATSMEOW");

    const payload: WhatsappConnectionSecretPayload | null =
        providerType === "META_CLOUD_API"
            ? body.phoneNumberId && body.accessToken && body.webhookVerifyToken
                ? {
                    providerType,
                    phoneNumberId: body.phoneNumberId,
                    accessToken: body.accessToken,
                    verifyToken: body.webhookVerifyToken,
                    businessAccountId: body.businessId,
                }
                : null
            : body.url && body.apiKey && body.instanceName
                ? {
                    providerType,
                    apiKey: body.apiKey,
                    integration: "whatsmeow",
                }
                : null;

    if (!payload) {
        return NextResponse.json({ ok: false, error: "Campos obrigatorios ausentes" }, { status: 400 });
    }

    const connection = buildTransientConnection({
        providerType,
        baseUrl: providerType === "EVOLUTION_WHATSMEOW" ? body.url || null : null,
        instanceName: providerType === "EVOLUTION_WHATSMEOW" ? body.instanceName || null : null,
        secretPayload: payload,
    });

    try {
        const result = await getWhatsappProviderAdapter(providerType).validate(connection);
        return NextResponse.json({ ...result, deprecated: true, providerType });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Erro desconhecido";
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}

function buildTransientConnection(params: {
    providerType: "EVOLUTION_WHATSMEOW" | "META_CLOUD_API";
    baseUrl: string | null;
    instanceName: string | null;
    secretPayload: WhatsappConnectionSecretPayload;
}): WhatsappConnectionWithSecret {
    const now = new Date();

    return {
        id: "legacy-whatsapp-test",
        escritorioId: "legacy-whatsapp-test",
        providerType: params.providerType,
        displayName: "Legacy WhatsApp Test",
        isPrimary: false,
        isActive: true,
        status: "DRAFT",
        baseUrl: params.baseUrl,
        externalInstanceName: params.instanceName,
        externalInstanceId: null,
        connectedPhone: null,
        connectedName: null,
        healthStatus: null,
        lastHealthAt: null,
        lastConnectedAt: null,
        lastSyncAt: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
        secret: {
            id: "legacy-whatsapp-test-secret",
            connectionId: "legacy-whatsapp-test",
            payload: params.secretPayload,
            createdAt: now,
            updatedAt: now,
        },
    };
}
