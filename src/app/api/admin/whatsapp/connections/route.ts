import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
    createWhatsappConnection,
    listWhatsappConnections,
} from "@/lib/whatsapp/application/connection-service";
import { requireWhatsAppAdminContext } from "@/app/api/admin/whatsapp/utils";

const createConnectionSchema = z.discriminatedUnion("providerType", [
    z.object({
        providerType: z.literal("META_CLOUD_API"),
        displayName: z.string().min(2).max(120),
        isPrimary: z.boolean().optional(),
        phoneNumberId: z.string().min(1),
        accessToken: z.string().min(10),
        verifyToken: z.string().min(6),
        businessAccountId: z.string().optional().nullable(),
        appSecret: z.string().optional().nullable(),
    }),
    z.object({
        providerType: z.literal("EVOLUTION_WHATSMEOW"),
        displayName: z.string().min(2).max(120),
        isPrimary: z.boolean().optional(),
        baseUrl: z.string().url(),
        apiKey: z.string().min(6),
        instanceName: z.string().min(2).max(120),
        webhookSecret: z.string().optional().nullable(),
        integration: z.string().optional().nullable(),
    }),
    z.object({
        providerType: z.literal("EMBEDDED_BAILEYS_LEGACY"),
        displayName: z.string().min(2).max(120),
        isPrimary: z.boolean().optional(),
    }),
]);

export async function GET() {
    const auth = await requireWhatsAppAdminContext();
    if (!auth.ok) return auth.response;

    const connections = await listWhatsappConnections(auth.escritorioId);
    return NextResponse.json({
        connections: connections.map((connection) => ({
            ...connection,
            secret: connection.secret ? { id: connection.secret.id } : null,
        })),
    });
}

export async function POST(request: NextRequest) {
    const auth = await requireWhatsAppAdminContext();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = createConnectionSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Payload invalido", details: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;
    const connection = await createWhatsappConnection(
        input.providerType === "META_CLOUD_API"
            ? {
                escritorioId: auth.escritorioId,
                providerType: input.providerType,
                displayName: input.displayName,
                isPrimary: input.isPrimary,
                secretPayload: {
                    providerType: input.providerType,
                    accessToken: input.accessToken,
                    verifyToken: input.verifyToken,
                    phoneNumberId: input.phoneNumberId,
                    businessAccountId: input.businessAccountId || undefined,
                    appSecret: input.appSecret || undefined,
                },
            }
            : input.providerType === "EVOLUTION_WHATSMEOW"
                ? {
                    escritorioId: auth.escritorioId,
                    providerType: input.providerType,
                    displayName: input.displayName,
                    isPrimary: input.isPrimary,
                    baseUrl: input.baseUrl,
                    externalInstanceName: input.instanceName,
                    secretPayload: {
                        providerType: input.providerType,
                        apiKey: input.apiKey,
                        webhookSecret: input.webhookSecret || undefined,
                        integration: input.integration || "WHATSAPP-BAILEYS",
                    },
                }
                : {
                    escritorioId: auth.escritorioId,
                    providerType: input.providerType,
                    displayName: input.displayName,
                    isPrimary: input.isPrimary,
                    secretPayload: {
                        providerType: input.providerType,
                        enabled: true,
                    },
                }
    );

    return NextResponse.json({
        ok: true,
        connection: {
            ...connection,
            secret: connection.secret ? { id: connection.secret.id } : null,
        },
    });
}
