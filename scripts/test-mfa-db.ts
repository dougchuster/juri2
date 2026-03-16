import "dotenv/config";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { base32Decode, generateTotpCode } from "@/lib/services/mfa-core";
import {
    beginMfaSetup,
    confirmMfaSetup,
    disableMfa,
    getPendingMfaLoginChallenge,
    MfaError,
    regenerateRecoveryCodes,
    revokeRecoveryCodes,
    startMfaLoginChallenge,
    verifyMfaLoginChallenge,
} from "@/lib/services/mfa-service";

async function main() {
    const email = `mfa-test-${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash("123456", 10);

    const user = await db.user.create({
        data: {
            email,
            name: "Usuario MFA Teste",
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

        assert.ok(setup.qrCodeDataUrl.startsWith("data:image/png;base64,"), "deve gerar QR code");

        const setupCode = generateTotpCode({
            secret: base32Decode(setup.manualKey),
            timestamp: Date.now(),
        });

        const activation = await db.$transaction(async (tx) => {
            return confirmMfaSetup(tx, user.id, setupCode);
        });

        assert.equal(activation.config.isEnabled, true, "deve ativar MFA apos codigo valido");
        assert.equal(activation.config.enforcedByPolicy, true, "admin deve ficar com MFA obrigatorio");
        assert.equal(activation.recoveryCodes.length, 8, "deve gerar oito recovery codes na ativacao");

        const challenge = await db.$transaction(async (tx) => {
            return startMfaLoginChallenge(tx, user.id);
        });

        const pending = await db.$transaction(async (tx) => {
            return getPendingMfaLoginChallenge(tx, challenge.token);
        });

        assert.ok(pending, "deve localizar desafio MFA pendente");

        const verifiedRecovery = await db.$transaction(async (tx) => {
            return verifyMfaLoginChallenge(tx, challenge.token, activation.recoveryCodes[0]);
        });

        assert.equal(verifiedRecovery.user.id, user.id, "deve verificar o desafio e retornar o usuario");
        assert.equal(verifiedRecovery.method, "RECOVERY_CODE", "deve aceitar recovery code no login");

        const challengeReuse = await db.$transaction(async (tx) => {
            return startMfaLoginChallenge(tx, user.id);
        });

        await assert.rejects(
            db.$transaction(async (tx) => {
                return verifyMfaLoginChallenge(tx, challengeReuse.token, activation.recoveryCodes[0]);
            }),
            (error: unknown) => error instanceof MfaError && error.message === "Codigo MFA invalido.",
            "nao deve permitir reutilizar recovery code"
        );

        const regeneratedCodes = await db.$transaction(async (tx) => {
            return regenerateRecoveryCodes(tx, user.id);
        });

        assert.equal(regeneratedCodes.length, 8, "deve regenerar oito recovery codes");
        assert.notDeepEqual(regeneratedCodes, activation.recoveryCodes, "regeneracao deve invalidar os codigos anteriores");

        const challengeTotp = await db.$transaction(async (tx) => {
            return startMfaLoginChallenge(tx, user.id);
        });

        const loginCode = generateTotpCode({
            secret: base32Decode(setup.manualKey),
            timestamp: Date.now(),
        });

        const verifiedTotp = await db.$transaction(async (tx) => {
            return verifyMfaLoginChallenge(tx, challengeTotp.token, loginCode);
        });

        assert.equal(verifiedTotp.user.id, user.id, "deve manter login TOTP funcionando");
        assert.equal(verifiedTotp.method, "TOTP", "deve identificar o metodo TOTP");

        const challengeRecoveryAfterRotate = await db.$transaction(async (tx) => {
            return startMfaLoginChallenge(tx, user.id);
        });

        const verifiedNewRecovery = await db.$transaction(async (tx) => {
            return verifyMfaLoginChallenge(tx, challengeRecoveryAfterRotate.token, regeneratedCodes[0]);
        });

        assert.equal(verifiedNewRecovery.method, "RECOVERY_CODE", "deve aceitar recovery code regenerado");

        const revoked = await db.$transaction(async (tx) => {
            return revokeRecoveryCodes(tx, user.id);
        });

        assert.equal(revoked.count, 7, "deve revogar os recovery codes restantes nao usados");

        await db.$transaction(async (tx) => {
            await disableMfa(tx, user.id);
        });

        const disabledConfig = await db.userMfaConfig.findUnique({
            where: { userId: user.id },
        });
        assert.equal(disabledConfig, null, "deve remover a configuracao ao desativar MFA");

        const remainingRecoveryCodes = await db.userRecoveryCode.count({
            where: { userId: user.id },
        });
        assert.equal(remainingRecoveryCodes, 0, "deve remover recovery codes ao desativar MFA");

        console.log("test-mfa-db: ok");
    } finally {
        await db.user.deleteMany({
            where: { id: user.id },
        });
        await db.$disconnect();
    }
}

void main();
