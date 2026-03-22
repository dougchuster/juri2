import { NextResponse } from "next/server";
import {
    buildLegacyWhatsappStatusPayload,
    getPrimaryWhatsappRuntime,
} from "@/app/api/comunicacao/whatsapp/compat";
import {
    getWhatsappAvatarCapability,
    requestWhatsappHistorySyncCapability,
} from "@/lib/whatsapp/application/provider-capabilities";

type AvatarCacheEntry = {
    url: string | null;
    expiresAt: number;
};

const globalForAvatarCache = globalThis as unknown as {
    whatsappAvatarCache?: Map<string, AvatarCacheEntry>;
};

const avatarCache = globalForAvatarCache.whatsappAvatarCache ?? new Map<string, AvatarCacheEntry>();
if (process.env.NODE_ENV !== "production") {
    globalForAvatarCache.whatsappAvatarCache = avatarCache;
}

function normalizePhoneToE164(raw: string): string | null {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return null;

    if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
        return `+${digits}`;
    }
    if (digits.length === 10 || digits.length === 11) {
        return `+55${digits}`;
    }
    return null;
}

export async function getWhatsappStatusResponse() {
    try {
        const runtime = await getPrimaryWhatsappRuntime();
        if (!runtime.connection || !runtime.status) {
            return NextResponse.json(
                buildLegacyWhatsappStatusPayload({
                    status: "DISCONNECTED",
                    connected: false,
                })
            );
        }

        return NextResponse.json(
            buildLegacyWhatsappStatusPayload({
                status: runtime.status.status,
                connected: runtime.status.connected,
                qrCode: runtime.qr?.qrCode || null,
                qrCodeRaw: runtime.qr?.qrCodeRaw || null,
                phoneNumber: runtime.status.connectedPhone || null,
                name: runtime.status.connectedName || null,
                error: runtime.status.ok ? null : runtime.status.lastError || null,
                providerType: runtime.connection.providerType,
            })
        );
    } catch {
        return NextResponse.json(
            { error: "Erro ao obter status do WhatsApp" },
            { status: 500 }
        );
    }
}

export async function getWhatsappAvatarResponse(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const rawPhone = searchParams.get("phone") || "";
        const normalizedPhone = normalizePhoneToE164(rawPhone);

        if (!normalizedPhone) {
            return NextResponse.json({ ok: false, url: null, error: "Numero invalido" }, { status: 400 });
        }

        const cacheKey = normalizedPhone.replace(/\D/g, "");
        const now = Date.now();
        const cached = avatarCache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
            return NextResponse.json({ ok: true, url: cached.url, cached: true });
        }

        const result = await getWhatsappAvatarCapability(normalizedPhone);
        const ttlMs = result.url ? 10 * 60 * 1000 : 2 * 60 * 1000;
        avatarCache.set(cacheKey, {
            url: result.url,
            expiresAt: now + ttlMs,
        });

        return NextResponse.json({
            ok: result.ok,
            url: result.url,
            providerType: result.providerType || null,
            cached: false,
            error: result.error || null,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro interno";
        return NextResponse.json({ ok: false, url: null, error: message }, { status: 500 });
    }
}

export async function postWhatsappSyncHistoryResponse() {
    try {
        const runtime = await getPrimaryWhatsappRuntime();
        if (!runtime.connection) {
            return NextResponse.json(
                { error: "Nenhuma conexao primaria configurada" },
                { status: 400 }
            );
        }

        if (runtime.connection.providerType === "META_CLOUD_API") {
            return NextResponse.json(
                { error: "Sync de historico nao e suportado na Meta Cloud API" },
                { status: 400 }
            );
        }

        if (!runtime.status?.connected) {
            return NextResponse.json(
                { error: "WhatsApp nao conectado" },
                { status: 400 }
            );
        }

        const result = await requestWhatsappHistorySyncCapability();
        if (!result.ok) {
            return NextResponse.json(
                { error: result.error || "Erro ao sincronizar historico" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            providerType: result.providerType || runtime.connection.providerType,
            message: "Sync de historico solicitado. Mensagens serao processadas automaticamente.",
        });
    } catch (error) {
        console.error("[API] Error syncing history:", error);
        return NextResponse.json(
            { error: "Erro ao sincronizar historico" },
            { status: 500 }
        );
    }
}
