import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getDerivedKey(): Buffer {
    const secret =
        process.env.APP_SECRET_KEY
        || process.env.NEXTAUTH_SECRET
        || process.env.DATABASE_URL
        || "sistema-juridico-adv-fallback-key";

    return scryptSync(secret, "adv-credentials-salt-v1", 32);
}

export function encryptString(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const key = getDerivedKey();
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptString(encoded: string): string {
    const buffer = Buffer.from(encoded, "base64");
    const iv = buffer.subarray(0, IV_LENGTH);
    const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const key = getDerivedKey();
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function encryptJson<T>(value: T): { ciphertext: string } {
    return {
        ciphertext: encryptString(JSON.stringify(value)),
    };
}

export function decryptJson<T>(value: unknown): T | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const ciphertext = typeof (value as { ciphertext?: unknown }).ciphertext === "string"
        ? (value as { ciphertext: string }).ciphertext
        : null;

    if (!ciphertext) return null;

    try {
        return JSON.parse(decryptString(ciphertext)) as T;
    } catch {
        return null;
    }
}
