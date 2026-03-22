import { NextResponse } from "next/server";
import { z } from "zod";
import {
    createWhatsappConnection,
    getDecryptedConnectionSecret,
    getPrimaryWhatsappConnection,
    listWhatsappConnections,
    updateWhatsappConnection,
} from "@/lib/whatsapp/application/connection-service";
import { getWhatsappConfig } from "@/lib/integrations/whatsapp-config";
import { requireWhatsAppAdminContext } from "@/app/api/admin/whatsapp/utils";

const configSchema = z.object({
    mode: z.enum(["none", "evolution", "meta"]),
    evolution: z.object({
        url: z.string().optional().default(""),
        apiKey: z.string().optional().default(""),
        instanceName: z.string().optional().default(""),
        integration: z.enum(["WHATSAPP-BAILEYS", "WHATSAPP-BUSINESS"]).optional().default("WHATSAPP-BAILEYS"),
        webhookSecret: z.string().optional().default(""),
    }).optional(),
    meta: z.object({
        phoneNumberId: z.string().optional().default(""),
        accessToken: z.string().optional().default(""),
        webhookVerifyToken: z.string().optional().default(""),
        businessId: z.string().optional().default(""),
    }).optional(),
});

export async function GET() {
    const auth = await requireWhatsAppAdminContext();
    if (!auth.ok) return auth.response;

    const config = await getWhatsappConfig();
    return NextResponse.json({
        ...config,
        deprecated: true,
        source: "primary-connection",
    });
}

export async function POST(request: Request) {
    const auth = await requireWhatsAppAdminContext();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = configSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Payload invalido", details: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;
    const connections = await listWhatsappConnections(auth.escritorioId);
    const primary = await getPrimaryWhatsappConnection(auth.escritorioId);

    if (input.mode === "none") {
        if (primary) {
            await updateWhatsappConnection(primary.id, {
                isActive: false,
                status: "DISCONNECTED",
                lastError: null,
            });
        }

        return NextResponse.json({
            ok: true,
            deprecated: true,
            mode: "none",
        });
    }

    if (input.mode === "evolution") {
        const evolution = input.evolution;
        if (!evolution?.url || !evolution.apiKey || !evolution.instanceName) {
            return NextResponse.json({ error: "Campos obrigatorios da Evolution ausentes" }, { status: 400 });
        }

        const existing = connections.find((connection) => connection.providerType === "EVOLUTION_WHATSMEOW");
        const connection = existing
            ? await updateWhatsappConnection(existing.id, {
                displayName: existing.displayName || "WhatsApp Evolution",
                isPrimary: true,
                isActive: true,
                baseUrl: evolution.url,
                externalInstanceName: evolution.instanceName,
                secretPayload: {
                    providerType: "EVOLUTION_WHATSMEOW",
                    apiKey: evolution.apiKey,
                    webhookSecret: evolution.webhookSecret || undefined,
                    integration: evolution.integration === "WHATSAPP-BUSINESS" ? "WHATSAPP-BUSINESS" : "WHATSAPP-BAILEYS",
                },
            })
            : await createWhatsappConnection({
                escritorioId: auth.escritorioId,
                providerType: "EVOLUTION_WHATSMEOW",
                displayName: "WhatsApp Evolution",
                isPrimary: true,
                isActive: true,
                baseUrl: evolution.url,
                externalInstanceName: evolution.instanceName,
                secretPayload: {
                    providerType: "EVOLUTION_WHATSMEOW",
                    apiKey: evolution.apiKey,
                    webhookSecret: evolution.webhookSecret || undefined,
                    integration: evolution.integration === "WHATSAPP-BUSINESS" ? "WHATSAPP-BUSINESS" : "WHATSAPP-BAILEYS",
                },
            });

        if (!connection) {
            return NextResponse.json({ error: "Falha ao salvar conexao Evolution" }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            deprecated: true,
            connectionId: connection.id,
            providerType: connection.providerType,
        });
    }

    const meta = input.meta;
    if (!meta?.phoneNumberId || !meta.accessToken || !meta.webhookVerifyToken) {
        return NextResponse.json({ error: "Campos obrigatorios da Meta ausentes" }, { status: 400 });
    }

    const existing = connections.find((connection) => connection.providerType === "META_CLOUD_API");
    const existingSecret = existing ? getDecryptedConnectionSecret(existing) : null;
    const connection = existing
        ? await updateWhatsappConnection(existing.id, {
            displayName: existing.displayName || "WhatsApp Meta",
            isPrimary: true,
            isActive: true,
            secretPayload: {
                providerType: "META_CLOUD_API",
                phoneNumberId: meta.phoneNumberId,
                accessToken: meta.accessToken,
                verifyToken: meta.webhookVerifyToken,
                businessAccountId: meta.businessId || undefined,
                appSecret: existingSecret?.providerType === "META_CLOUD_API" ? existingSecret.appSecret : undefined,
            },
        })
        : await createWhatsappConnection({
            escritorioId: auth.escritorioId,
            providerType: "META_CLOUD_API",
            displayName: "WhatsApp Meta",
            isPrimary: true,
            isActive: true,
            secretPayload: {
                providerType: "META_CLOUD_API",
                phoneNumberId: meta.phoneNumberId,
                accessToken: meta.accessToken,
                verifyToken: meta.webhookVerifyToken,
                businessAccountId: meta.businessId || undefined,
            },
        });

    if (!connection) {
        return NextResponse.json({ error: "Falha ao salvar conexao Meta" }, { status: 500 });
    }

    return NextResponse.json({
        ok: true,
        deprecated: true,
        connectionId: connection.id,
        providerType: connection.providerType,
    });
}
