import { NextResponse } from "next/server";
import { whatsappService } from "@/lib/integrations/baileys-service";

export const dynamic = "force-dynamic";

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

async function lookupAvatarUrl(normalizedPhone: string): Promise<{ ok: boolean; url: string | null; error?: string }> {
  const service = whatsappService as unknown as {
    getProfilePictureUrl?: (phone: string) => Promise<{ ok: boolean; url: string | null; error?: string }>;
    isConnected: () => boolean;
    checkNumber: (phone: string) => Promise<{ ok: boolean; exists: boolean; jid?: string; error?: string }>;
    socket?: {
      profilePictureUrl: (jid: string, type: "image" | "preview") => Promise<string | undefined>;
    } | null;
    normalizeJid?: (phone: string) => string;
  };

  if (typeof service.getProfilePictureUrl === "function") {
    return service.getProfilePictureUrl(normalizedPhone);
  }

  if (!service.isConnected()) {
    return { ok: false, url: null, error: "WhatsApp nao conectado" };
  }

  try {
    const check = await service.checkNumber(normalizedPhone);
    if (!check.ok) return { ok: false, url: null, error: check.error || "Falha ao validar numero" };
    if (!check.exists) return { ok: true, url: null };

    const jid = check.jid
      || (typeof service.normalizeJid === "function"
        ? service.normalizeJid(normalizedPhone)
        : `${normalizedPhone.replace(/\D/g, "")}@s.whatsapp.net`);

    const url = await service.socket?.profilePictureUrl(jid, "image");
    return { ok: true, url: typeof url === "string" ? url : null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("not-authorized")
      || message.includes("item-not-found")
      || message.includes("404")
    ) {
      return { ok: true, url: null };
    }
    return { ok: false, url: null, error: message };
  }
}

export async function GET(request: Request) {
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

    const result = await lookupAvatarUrl(normalizedPhone);
    const ttlMs = result.url ? 10 * 60 * 1000 : 2 * 60 * 1000;
    avatarCache.set(cacheKey, {
      url: result.url,
      expiresAt: now + ttlMs,
    });

    return NextResponse.json({
      ok: result.ok,
      url: result.url,
      cached: false,
      error: result.error || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ ok: false, url: null, error: message }, { status: 500 });
  }
}
