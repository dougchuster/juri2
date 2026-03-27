"use server";

import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import { revalidatePath } from "next/cache";
import { sendConversionEvent } from "@/lib/meta/conversions";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireAdminSession() {
    const session = await getSession();
    if (!session) throw new Error("Não autenticado");
    if (!["ADMIN", "SOCIO", "CONTROLADOR"].includes(session.role)) {
        throw new Error("Sem permissão");
    }
    return session;
}

// ── Actions ──────────────────────────────────────────────────────────────────

export async function getMetaPixelConfig() {
    const session = await requireAdminSession();

    const config = await db.metaPixelConfig.findUnique({
        where: { escritorioId: session.escritorioId! },
        select: {
            id: true,
            pixelId: true,
            // Mascara o token — retorna apenas os últimos 6 caracteres
            accessToken: false,
            testEventCode: true,
            isActive: true,
            lastEventAt: true,
            eventsCount: true,
            updatedAt: true,
        },
    });

    if (!config) return null;

    // Busca o token mascarado separadamente
    const raw = await db.metaPixelConfig.findUnique({
        where: { escritorioId: session.escritorioId! },
        select: { accessToken: true },
    });

    return {
        ...config,
        accessTokenMasked: raw?.accessToken
            ? `${"*".repeat(Math.max(0, raw.accessToken.length - 6))}${raw.accessToken.slice(-6)}`
            : null,
    };
}

export async function upsertMetaPixelConfig(data: {
    pixelId: string;
    accessToken: string;
    testEventCode?: string;
    isActive?: boolean;
}) {
    const session = await requireAdminSession();

    if (!data.pixelId.trim() || !data.accessToken.trim()) {
        return { success: false, error: "Pixel ID e Access Token são obrigatórios" };
    }

    await db.metaPixelConfig.upsert({
        where: { escritorioId: session.escritorioId! },
        create: {
            escritorioId: session.escritorioId!,
            pixelId: data.pixelId.trim(),
            accessToken: data.accessToken.trim(),
            testEventCode: data.testEventCode?.trim() || null,
            isActive: data.isActive ?? true,
        },
        update: {
            pixelId: data.pixelId.trim(),
            // Só atualiza o token se não for o token mascarado (***xxx)
            ...(!data.accessToken.startsWith("*") && {
                accessToken: data.accessToken.trim(),
            }),
            testEventCode: data.testEventCode?.trim() || null,
            isActive: data.isActive ?? true,
        },
    });

    revalidatePath("/admin/integracoes");
    return { success: true };
}

export async function toggleMetaPixelActive(isActive: boolean) {
    const session = await requireAdminSession();

    await db.metaPixelConfig.updateMany({
        where: { escritorioId: session.escritorioId! },
        data: { isActive },
    });

    revalidatePath("/admin/integracoes");
    return { success: true };
}

export async function deleteMetaPixelConfig() {
    const session = await requireAdminSession();

    await db.metaPixelConfig.deleteMany({
        where: { escritorioId: session.escritorioId! },
    });

    revalidatePath("/admin/integracoes");
    return { success: true };
}

export async function testMetaPixelEvent() {
    const session = await requireAdminSession();

    const result = await sendConversionEvent(session.escritorioId!, {
        eventName: "Lead",
        userData: {
            email: session.email ?? undefined,
        },
        customData: {
            contentName: "Teste de Pixel - Sistema Jurídico",
        },
        actionSource: "system_generated",
    });

    return result;
}
