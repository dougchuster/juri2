import "dotenv/config";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { base32Decode, generateTotpCode } from "@/lib/services/mfa-core";
import {
    beginMfaSetup,
    confirmMfaSetup,
    consumeTrustedDevice,
    MfaError,
    registerTrustedDevice,
    revokeAllTrustedDevices,
    revokeTrustedDevice,
    startMfaLoginChallenge,
    verifyMfaLoginChallenge,
} from "@/lib/services/mfa-service";

async function main() {
    const email = `mfa-hardening-${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash("123456", 10);

    const user = await db.user.create({
        data: {
            email,
            name: "Usuario MFA Hardening",
            passwordHash,
            role: "ADMIN",
        },
    });

    try {
        const setup = await db.$transaction(async (tx) => {
            return beginMfaSetup(tx, {
                id: user.id,
                email: user.email,
            });
        });

        const setupCode = generateTotpCode({
            secret: base32Decode(setup.manualKey),
            timestamp: Date.now(),
        });

        await db.$transaction(async (tx) => {
            await confirmMfaSetup(tx, user.id, setupCode);
        });

        const trustedDevice = await db.$transaction(async (tx) => {
            return registerTrustedDevice(tx, {
                userId: user.id,
                userAgent:
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
            });
        });

        assert.equal(trustedDevice.device.deviceLabel, "Chrome em Windows", "deve rotular o dispositivo com base no user agent");

        const consumedDevice = await db.$transaction(async (tx) => {
            return consumeTrustedDevice(tx, {
                userId: user.id,
                token: trustedDevice.token,
            });
        });

        assert.equal(consumedDevice?.id, trustedDevice.device.id, "deve validar o token do trusted device");

        const revokedOne = await db.$transaction(async (tx) => {
            return revokeTrustedDevice(tx, user.id, trustedDevice.device.id);
        });

        assert.equal(revokedOne.count, 1, "deve revogar um trusted device individual");

        const consumedAfterRevoke = await db.$transaction(async (tx) => {
            return consumeTrustedDevice(tx, {
                userId: user.id,
                token: trustedDevice.token,
            });
        });

        assert.equal(consumedAfterRevoke, null, "trusted device revogado nao pode mais ser consumido");

        const deviceA = await db.$transaction(async (tx) => registerTrustedDevice(tx, { userId: user.id, userAgent: "Mozilla/5.0 Chrome/124.0 Windows" }));
        const deviceB = await db.$transaction(async (tx) => registerTrustedDevice(tx, { userId: user.id, userAgent: "Mozilla/5.0 Firefox/125.0 Linux" }));

        const revokeAllResult = await db.$transaction(async (tx) => revokeAllTrustedDevices(tx, user.id));
        assert.equal(revokeAllResult.count >= 2, true, "deve revogar todos os trusted devices ativos");

        const consumeAfterRevokeAll = await db.$transaction(async (tx) => consumeTrustedDevice(tx, { userId: user.id, token: deviceA.token }));
        assert.equal(consumeAfterRevokeAll, null, "trusted device revogado em massa nao pode ser consumido");
        void deviceB;

        let lastError = "";
        for (let attempt = 0; attempt < 8; attempt++) {
            const challenge = await db.$transaction(async (tx) => startMfaLoginChallenge(tx, user.id));
            try {
                await verifyMfaLoginChallenge(db, challenge.token, "000000");
            } catch (error) {
                if (error instanceof MfaError) {
                    lastError = error.message;
                } else {
                    throw error;
                }
            }
        }

        assert.equal(
            lastError,
            "MFA temporariamente bloqueado. Aguarde 15 minutos e tente novamente.",
            "deve bloquear temporariamente apos falhas consecutivas"
        );

        const blockedChallenge = await db.$transaction(async (tx) => startMfaLoginChallenge(tx, user.id));
        const validCode = generateTotpCode({
            secret: base32Decode(setup.manualKey),
            timestamp: Date.now(),
        });

        await assert.rejects(
            verifyMfaLoginChallenge(db, blockedChallenge.token, validCode),
            (error: unknown) =>
                error instanceof MfaError &&
                error.message === "MFA temporariamente bloqueado. Aguarde 15 minutos e tente novamente.",
            "deve manter o bloqueio temporario mesmo com codigo valido"
        );

        const securityAlert = await db.notificacao.findFirst({
            where: {
                userId: user.id,
                titulo: "Seguranca: MFA bloqueado temporariamente",
            },
        });

        assert.ok(securityAlert, "deve registrar alerta de seguranca quando o MFA e bloqueado");

        console.log("test-mfa-hardening: ok");
    } finally {
        await db.user.deleteMany({
            where: { id: user.id },
        });
        await db.$disconnect();
    }
}

void main();
