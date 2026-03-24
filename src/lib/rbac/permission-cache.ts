import { createHmac, timingSafeEqual } from "node:crypto";

export const PERMISSION_CACHE_COOKIE_NAME = "perm_cache";

type PermissionCachePayload = {
    permissions: string[];
    version?: number;
};

function getPermissionCacheSecret() {
    const secret = process.env.PERM_CACHE_SECRET;
    return secret && secret.trim().length > 0 ? secret.trim() : null;
}

function signPayload(payload: string) {
    const secret = getPermissionCacheSecret();
    if (!secret) return null;
    return createHmac("sha256", secret).update(payload).digest("hex");
}

export function encodePermissionCache(payload: PermissionCachePayload) {
    const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const signature = signPayload(encodedPayload);
    if (!signature) return null;
    return `${encodedPayload}.${signature}`;
}

export function decodePermissionCache(value: string | undefined | null): PermissionCachePayload | null {
    if (!value) return null;

    const [encodedPayload, signature] = value.split(".");
    if (!encodedPayload || !signature) return null;

    const expectedSignature = signPayload(encodedPayload);
    if (!expectedSignature) return null;

    const received = Buffer.from(signature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
        return null;
    }

    try {
        const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as PermissionCachePayload;
        return {
            permissions: Array.isArray(parsed.permissions)
                ? parsed.permissions.filter((permission) => typeof permission === "string")
                : [],
            version: typeof parsed.version === "number" ? parsed.version : undefined,
        };
    } catch {
        return null;
    }
}
