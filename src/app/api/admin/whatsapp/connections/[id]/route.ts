import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
    deleteWhatsappConnection,
    getDecryptedConnectionSecret,
    getWhatsappConnectionById,
    updateWhatsappConnection,
} from "@/lib/whatsapp/application/connection-service";
import { requireWhatsAppAdminContext } from "@/app/api/admin/whatsapp/utils";

const updateConnectionSchema = z.object({
    displayName: z.string().min(2).max(120).optional(),
    isPrimary: z.boolean().optional(),
    isActive: z.boolean().optional(),
    baseUrl: z.string().url().optional().nullable(),
    externalInstanceName: z.string().min(2).max(120).optional().nullable(),
    phoneNumberId: z.string().optional().nullable(),
    accessToken: z.string().min(10).optional().nullable(),
    verifyToken: z.string().min(6).optional().nullable(),
    appSecret: z.string().optional().nullable(),
    businessAccountId: z.string().optional().nullable(),
    apiKey: z.string().min(6).optional().nullable(),
    webhookSecret: z.string().optional().nullable(),
    integration: z.string().optional().nullable(),
});

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    const auth = await requireWhatsAppAdminContext();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const connection = await getWhatsappConnectionById(id);
    if (!connection || connection.escritorioId !== auth.escritorioId) {
        return NextResponse.json({ error: "Conexao nao encontrada" }, { status: 404 });
    }

    return NextResponse.json({
        connection: {
            ...connection,
            secret: connection.secret ? { id: connection.secret.id } : null,
        },
    });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const auth = await requireWhatsAppAdminContext();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateConnectionSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Payload invalido", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await getWhatsappConnectionById(id);
    if (!existing || existing.escritorioId !== auth.escritorioId) {
        return NextResponse.json({ error: "Conexao nao encontrada" }, { status: 404 });
    }

    const data = parsed.data;
    const existingSecret = getDecryptedConnectionSecret(existing);
    const secretPayload =
        existing.providerType === "META_CLOUD_API" && existingSecret?.providerType === "META_CLOUD_API"
            ? {
                providerType: "META_CLOUD_API" as const,
                accessToken: data.accessToken ?? existingSecret.accessToken,
                verifyToken: data.verifyToken ?? existingSecret.verifyToken,
                phoneNumberId: data.phoneNumberId ?? existingSecret.phoneNumberId,
                appSecret: data.appSecret ?? existingSecret.appSecret,
                businessAccountId: data.businessAccountId ?? existingSecret.businessAccountId,
            }
            : existing.providerType === "EVOLUTION_WHATSMEOW" && existingSecret?.providerType === "EVOLUTION_WHATSMEOW"
                ? {
                    providerType: "EVOLUTION_WHATSMEOW" as const,
                    apiKey: data.apiKey ?? existingSecret.apiKey,
                    webhookSecret: data.webhookSecret ?? existingSecret.webhookSecret,
                    integration: data.integration ?? existingSecret.integration,
                }
                : null;

    const updated = await updateWhatsappConnection(id, {
        ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
        ...(data.isPrimary !== undefined ? { isPrimary: data.isPrimary } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.baseUrl !== undefined ? { baseUrl: data.baseUrl } : {}),
        ...(data.externalInstanceName !== undefined ? { externalInstanceName: data.externalInstanceName } : {}),
        ...(secretPayload && Object.values(secretPayload).some(Boolean) ? { secretPayload } : {}),
    });

    return NextResponse.json({
        ok: true,
        connection: updated ? { ...updated, secret: updated.secret ? { id: updated.secret.id } : null } : null,
    });
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    const auth = await requireWhatsAppAdminContext();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const connection = await getWhatsappConnectionById(id);
    if (!connection || connection.escritorioId !== auth.escritorioId) {
        return NextResponse.json({ error: "Conexao nao encontrada" }, { status: 404 });
    }

    await deleteWhatsappConnection(id);
    return NextResponse.json({ ok: true });
}
