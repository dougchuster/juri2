import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { resolveCredential } from "@/lib/integrations/credentials-store";

const EXPIRY_DAYS = 30;
const FALLBACK_SECRET = process.env.NEXTAUTH_SECRET ?? "portal-dev-secret-change-in-production";

interface PortalTokenPayload {
    clienteId: string;
    exp: number; // unix timestamp ms
    nonce: string;
}

function base64urlEncode(data: string): string {
    return Buffer.from(data, "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

function base64urlDecode(data: string): string {
    const padded = data.replace(/-/g, "+").replace(/_/g, "/");
    const padding = (4 - (padded.length % 4)) % 4;
    return Buffer.from(padded + "=".repeat(padding), "base64").toString("utf8");
}

async function getSecret(): Promise<string> {
    return (
        (await resolveCredential("PORTAL_TOKEN_SECRET", "portal_token_secret")) ??
        FALLBACK_SECRET
    );
}

function sign(payload: string, secret: string): string {
    return createHmac("sha256", secret).update(payload).digest("base64url");
}

export async function gerarTokenPortal(clienteId: string): Promise<string> {
    const secret = await getSecret();
    const payload: PortalTokenPayload = {
        clienteId,
        exp: Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        nonce: randomBytes(8).toString("hex"),
    };
    const payloadEncoded = base64urlEncode(JSON.stringify(payload));
    const signature = sign(payloadEncoded, secret);
    return `${payloadEncoded}.${signature}`;
}

export async function verificarTokenPortal(
    token: string
): Promise<{ ok: true; clienteId: string } | { ok: false; error: string }> {
    try {
        const parts = token.split(".");
        if (parts.length !== 2) return { ok: false, error: "Token inválido" };

        const [payloadEncoded, signature] = parts;
        const secret = await getSecret();
        const expectedSig = sign(payloadEncoded, secret);

        // comparação timing-safe
        const sigBuf = Buffer.from(signature, "base64url");
        const expBuf = Buffer.from(expectedSig, "base64url");

        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
            return { ok: false, error: "Assinatura inválida" };
        }

        const payload = JSON.parse(base64urlDecode(payloadEncoded)) as PortalTokenPayload;

        if (Date.now() > payload.exp) {
            return { ok: false, error: "Token expirado" };
        }

        return { ok: true, clienteId: payload.clienteId };
    } catch {
        return { ok: false, error: "Token inválido" };
    }
}
