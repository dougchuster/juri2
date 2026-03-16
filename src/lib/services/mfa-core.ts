import crypto from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(size = 20) {
    return crypto.randomBytes(size);
}

export function base32Encode(buffer: Buffer) {
    let bits = 0;
    let value = 0;
    let output = "";

    for (const byte of buffer) {
        value = (value << 8) | byte;
        bits += 8;

        while (bits >= 5) {
            output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    return output;
}

export function base32Decode(input: string) {
    const normalized = input.toUpperCase().replace(/=+$/g, "").replace(/[^A-Z2-7]/g, "");
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];

    for (const char of normalized) {
        const index = BASE32_ALPHABET.indexOf(char);
        if (index === -1) continue;

        value = (value << 5) | index;
        bits += 5;

        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }

    return Buffer.from(bytes);
}

export function generateHotp(secret: Buffer, counter: number, digits = 6) {
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    counterBuffer.writeUInt32BE(counter % 0x100000000, 4);

    const digest = crypto.createHmac("sha1", secret).update(counterBuffer).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const code =
        ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff);

    return String(code % 10 ** digits).padStart(digits, "0");
}

export function generateTotpCode(params: {
    secret: Buffer;
    timestamp?: number;
    period?: number;
    digits?: number;
}) {
    const timestamp = params.timestamp ?? Date.now();
    const period = params.period ?? 30;
    const counter = Math.floor(timestamp / 1000 / period);
    return generateHotp(params.secret, counter, params.digits ?? 6);
}

export function verifyTotpCode(params: {
    secret: Buffer;
    code: string;
    timestamp?: number;
    period?: number;
    digits?: number;
    window?: number;
}) {
    const normalizedCode = (params.code || "").trim().replace(/\s+/g, "");
    if (!/^\d{6,8}$/.test(normalizedCode)) return false;

    const timestamp = params.timestamp ?? Date.now();
    const period = params.period ?? 30;
    const digits = params.digits ?? 6;
    const window = params.window ?? 1;
    const currentCounter = Math.floor(timestamp / 1000 / period);

    for (let offset = -window; offset <= window; offset += 1) {
        const counter = currentCounter + offset;
        if (counter < 0) continue;
        const generated = generateHotp(params.secret, counter, digits);
        if (crypto.timingSafeEqual(Buffer.from(generated), Buffer.from(normalizedCode))) {
            return true;
        }
    }

    return false;
}

export function buildTotpOtpAuthUrl(params: {
    issuer: string;
    accountName: string;
    secretBase32: string;
}) {
    const label = `${params.issuer}:${params.accountName}`;
    const search = new URLSearchParams({
        secret: params.secretBase32,
        issuer: params.issuer,
        algorithm: "SHA1",
        digits: "6",
        period: "30",
    });

    return `otpauth://totp/${encodeURIComponent(label)}?${search.toString()}`;
}
