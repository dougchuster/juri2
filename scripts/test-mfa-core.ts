import assert from "node:assert/strict";
import "dotenv/config";
import {
    base32Decode,
    base32Encode,
    buildTotpOtpAuthUrl,
    generateTotpCode,
    generateTotpSecret,
    verifyTotpCode,
} from "@/lib/services/mfa-core";
import { decryptMfaSecret, encryptMfaSecret } from "@/lib/services/mfa-service";

async function main() {
    const secret = generateTotpSecret();
    const base32 = base32Encode(secret);
    const decoded = base32Decode(base32);

    assert.equal(decoded.toString("hex"), secret.toString("hex"), "base32 deve ser reversivel");

    const code = generateTotpCode({
        secret,
        timestamp: Date.UTC(2026, 2, 11, 12, 0, 0),
    });
    assert.equal(
        verifyTotpCode({
            secret,
            code,
            timestamp: Date.UTC(2026, 2, 11, 12, 0, 10),
        }),
        true,
        "codigo TOTP deve validar na janela corrente"
    );

    assert.equal(
        verifyTotpCode({
            secret,
            code: "000000",
            timestamp: Date.UTC(2026, 2, 11, 12, 0, 10),
        }),
        false,
        "codigo incorreto deve falhar"
    );

    const encrypted = encryptMfaSecret(base32);
    assert.equal(decryptMfaSecret(encrypted), base32, "segredo MFA precisa criptografar e descriptografar");

    const otpUrl = buildTotpOtpAuthUrl({
        issuer: "Sistema Juridico ADV",
        accountName: "usuario@example.com",
        secretBase32: base32,
    });
    assert.match(otpUrl, /^otpauth:\/\/totp\//);
    assert.match(otpUrl, /issuer=Sistema\+Juridico\+ADV/);

    console.log("test-mfa-core: ok");
}

void main();
