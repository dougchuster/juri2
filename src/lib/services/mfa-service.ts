import crypto from "node:crypto";
import QRCode from "qrcode";
import type { Role, User } from "@/generated/prisma";
import { db } from "@/lib/db";
import { base32Decode, base32Encode, buildTotpOtpAuthUrl, generateTotpSecret, verifyTotpCode } from "@/lib/services/mfa-core";
import { createMfaSecurityNotification } from "@/lib/services/mfa-alerts";

const MFA_SETUP_TTL_MS = 10 * 60 * 1000;
const MFA_LOGIN_TTL_MS = 10 * 60 * 1000;
const MFA_MAX_ATTEMPTS = 5;
const MFA_LOCK_THRESHOLD = 8;
const MFA_LOCK_TTL_MS = 15 * 60 * 1000;
const MFA_RECOVERY_CODE_COUNT = 8;
const MFA_TRUSTED_DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MFA_MAX_TRUSTED_DEVICES = 5;
type TransactionClient = Omit<
    typeof db,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

export class MfaError extends Error {}

function getMfaEncryptionKey() {
    const raw = process.env.MFA_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET || "";
    if (!raw) {
        throw new MfaError("Chave de criptografia MFA nao configurada.");
    }
    return crypto.createHash("sha256").update(raw).digest();
}

export function encryptMfaSecret(secretBase32: string) {
    const key = getMfaEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(secretBase32, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptMfaSecret(payload: string) {
    const [ivRaw, tagRaw, contentRaw] = payload.split(":");
    if (!ivRaw || !tagRaw || !contentRaw) {
        throw new MfaError("Payload MFA invalido.");
    }
    const key = getMfaEncryptionKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivRaw, "base64"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
    const plaintext = Buffer.concat([
        decipher.update(Buffer.from(contentRaw, "base64")),
        decipher.final(),
    ]);
    return plaintext.toString("utf8");
}

function normalizeTotpCode(value: string) {
    return (value || "").trim().replace(/\s+/g, "");
}

function normalizeRecoveryCode(value: string) {
    return (value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hashRecoveryCode(value: string) {
    return crypto.createHash("sha256").update(value).digest("hex");
}

function hashTrustedDeviceToken(value: string) {
    return crypto.createHash("sha256").update(value).digest("hex");
}

function generateRecoveryCode() {
    return crypto.randomBytes(5).toString("hex").toUpperCase();
}

function buildDeviceLabel(userAgent?: string | null) {
    if (!userAgent) return "Dispositivo confiavel";

    const ua = userAgent.toLowerCase();
    const os =
        ua.includes("iphone") || ua.includes("ipad") ? "iOS" :
            ua.includes("android") ? "Android" :
                ua.includes("windows") ? "Windows" :
                    ua.includes("mac os") || ua.includes("macintosh") ? "macOS" :
                        ua.includes("linux") ? "Linux" :
                            "Sistema desconhecido";

    const browser =
        ua.includes("edg/") ? "Edge" :
            ua.includes("chrome/") ? "Chrome" :
                ua.includes("firefox/") ? "Firefox" :
                    ua.includes("safari/") && !ua.includes("chrome/") ? "Safari" :
                        "Navegador";

    return `${browser} em ${os}`;
}

async function replaceRecoveryCodes(tx: TransactionClient, userId: string) {
    const codes = Array.from({ length: MFA_RECOVERY_CODE_COUNT }, () => generateRecoveryCode());

    await tx.userRecoveryCode.deleteMany({
        where: { userId },
    });

    await tx.userRecoveryCode.createMany({
        data: codes.map((code) => ({
            userId,
            codeHash: hashRecoveryCode(code),
        })),
    });

    return codes;
}

export function requiresMfaForRole(role: Role) {
    void role;
    return false;
}

export async function syncMfaPolicyFlag(tx: TransactionClient, input: { userId: string; role: Role }) {
    const enforcedByPolicy = requiresMfaForRole(input.role);
    const existing = await tx.userMfaConfig.findUnique({
        where: { userId: input.userId },
    });

    if (!existing) return null;

    if (existing.enforcedByPolicy === enforcedByPolicy) {
        return existing;
    }

    return tx.userMfaConfig.update({
        where: { userId: input.userId },
        data: {
            enforcedByPolicy,
        },
    });
}

export async function beginMfaSetup(tx: TransactionClient, user: Pick<User, "id" | "email">) {
    const secret = generateTotpSecret();
    const manualKey = base32Encode(secret);
    const secretEncrypted = encryptMfaSecret(manualKey);
    const otpAuthUrl = buildTotpOtpAuthUrl({
        issuer: process.env.NEXT_PUBLIC_APP_NAME || "Sistema Juridico ADV",
        accountName: user.email,
        secretBase32: manualKey,
    });

    await tx.mfaSetupChallenge.upsert({
        where: { userId: user.id },
        update: {
            secretEncrypted,
            expiresAt: new Date(Date.now() + MFA_SETUP_TTL_MS),
            createdAt: new Date(),
        },
        create: {
            userId: user.id,
            secretEncrypted,
            expiresAt: new Date(Date.now() + MFA_SETUP_TTL_MS),
        },
    });

    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
        margin: 1,
        width: 256,
    });

    return {
        qrCodeDataUrl,
        manualKey,
        expiresAt: new Date(Date.now() + MFA_SETUP_TTL_MS),
    };
}

export async function getMfaSetupSnapshot(tx: TransactionClient, user: Pick<User, "id" | "email" | "role">) {
    await syncMfaPolicyFlag(tx, {
        userId: user.id,
        role: user.role,
    });

    const [config, challenge] = await Promise.all([
        tx.userMfaConfig.findUnique({
            where: { userId: user.id },
        }),
        tx.mfaSetupChallenge.findUnique({
            where: { userId: user.id },
        }),
    ]);

    if (!challenge || challenge.expiresAt <= new Date()) {
        return {
            config,
            pendingSetup: null,
            recoveryCodesCount: await tx.userRecoveryCode.count({
                where: { userId: user.id, usedAt: null },
            }),
            trustedDevices: await tx.mfaTrustedDevice.findMany({
                where: {
                    userId: user.id,
                    revokedAt: null,
                    expiresAt: { gt: new Date() },
                },
                orderBy: [{ lastUsedAt: "desc" }, { createdAt: "desc" }],
                select: {
                    id: true,
                    deviceLabel: true,
                    userAgent: true,
                    createdAt: true,
                    lastUsedAt: true,
                    expiresAt: true,
                },
            }),
        };
    }

    const manualKey = decryptMfaSecret(challenge.secretEncrypted);
    const otpAuthUrl = buildTotpOtpAuthUrl({
        issuer: process.env.NEXT_PUBLIC_APP_NAME || "Sistema Juridico ADV",
        accountName: user.email,
        secretBase32: manualKey,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
        margin: 1,
        width: 256,
    });

    return {
        config,
        pendingSetup: {
            qrCodeDataUrl,
            manualKey,
            expiresAt: challenge.expiresAt,
        },
        recoveryCodesCount: await tx.userRecoveryCode.count({
            where: { userId: user.id, usedAt: null },
        }),
        trustedDevices: await tx.mfaTrustedDevice.findMany({
            where: {
                userId: user.id,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: [{ lastUsedAt: "desc" }, { createdAt: "desc" }],
            select: {
                id: true,
                deviceLabel: true,
                userAgent: true,
                createdAt: true,
                lastUsedAt: true,
                expiresAt: true,
            },
        }),
    };
}

export async function confirmMfaSetup(tx: TransactionClient, userId: string, code: string) {
    const challenge = await tx.mfaSetupChallenge.findUnique({
        where: { userId },
    });

    if (!challenge || challenge.expiresAt <= new Date()) {
        throw new MfaError("Configuracao MFA expirada. Gere um novo QR code.");
    }

    const secretBase32 = decryptMfaSecret(challenge.secretEncrypted);
    const isValid = verifyTotpCode({
        secret: base32Decode(secretBase32),
        code: normalizeTotpCode(code),
    });

    if (!isValid) {
        throw new MfaError("Codigo MFA invalido.");
    }

    const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });

    const config = await tx.userMfaConfig.upsert({
        where: { userId },
        update: {
            isEnabled: true,
            secretEncrypted: challenge.secretEncrypted,
            enabledAt: new Date(),
            lastUsedAt: new Date(),
            enforcedByPolicy: currentUser ? requiresMfaForRole(currentUser.role) : false,
            failedAttemptCount: 0,
            lastFailedAt: null,
            lockedUntil: null,
        },
        create: {
            userId,
            isEnabled: true,
            secretEncrypted: challenge.secretEncrypted,
            enabledAt: new Date(),
            lastUsedAt: new Date(),
            enforcedByPolicy: currentUser ? requiresMfaForRole(currentUser.role) : false,
            failedAttemptCount: 0,
            lastFailedAt: null,
            lockedUntil: null,
        },
    });

    const recoveryCodes = await replaceRecoveryCodes(tx, userId);

    await tx.mfaSetupChallenge.delete({
        where: { userId },
    });

    return {
        config,
        recoveryCodes,
    };
}

export async function disableMfa(tx: TransactionClient, userId: string) {
    await tx.mfaLoginChallenge.deleteMany({
        where: { userId, status: "PENDENTE" },
    });
    await tx.mfaSetupChallenge.deleteMany({
        where: { userId },
    });
    await tx.userRecoveryCode.deleteMany({
        where: { userId },
    });
    await tx.mfaTrustedDevice.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
    return tx.userMfaConfig.delete({
        where: { userId },
    });
}

export async function regenerateRecoveryCodes(tx: TransactionClient, userId: string) {
    const config = await tx.userMfaConfig.findUnique({
        where: { userId },
        select: { isEnabled: true },
    });

    if (!config?.isEnabled) {
        throw new MfaError("Ative o MFA antes de gerar recovery codes.");
    }

    return replaceRecoveryCodes(tx, userId);
}

export async function revokeRecoveryCodes(tx: TransactionClient, userId: string) {
    return tx.userRecoveryCode.deleteMany({
        where: { userId, usedAt: null },
    });
}

export async function registerTrustedDevice(
    tx: TransactionClient,
    input: {
        userId: string;
        userAgent?: string | null;
    }
) {
    const plainToken = crypto.randomBytes(32).toString("hex");
    const deviceLabel = buildDeviceLabel(input.userAgent);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + MFA_TRUSTED_DEVICE_TTL_MS);

    await tx.mfaTrustedDevice.updateMany({
        where: {
            userId: input.userId,
            OR: [
                { revokedAt: { not: null } },
                { expiresAt: { lte: now } },
            ],
        },
        data: {
            revokedAt: now,
        },
    });

    const activeDevices = await tx.mfaTrustedDevice.findMany({
        where: {
            userId: input.userId,
            revokedAt: null,
            expiresAt: { gt: now },
        },
        orderBy: [{ lastUsedAt: "asc" }, { createdAt: "asc" }],
        select: { id: true },
    });

    if (activeDevices.length >= MFA_MAX_TRUSTED_DEVICES) {
        const devicesToRevoke = activeDevices.slice(0, activeDevices.length - MFA_MAX_TRUSTED_DEVICES + 1);
        await tx.mfaTrustedDevice.updateMany({
            where: { id: { in: devicesToRevoke.map((device) => device.id) } },
            data: { revokedAt: now },
        });
    }

    const device = await tx.mfaTrustedDevice.create({
        data: {
            userId: input.userId,
            tokenHash: hashTrustedDeviceToken(plainToken),
            deviceLabel,
            userAgent: input.userAgent || null,
            expiresAt,
        },
        select: {
            id: true,
            deviceLabel: true,
            expiresAt: true,
        },
    });

    return {
        token: plainToken,
        device,
    };
}

export async function consumeTrustedDevice(
    tx: TransactionClient,
    input: { userId: string; token: string }
) {
    if (!input.token) return null;

    const now = new Date();
    const device = await tx.mfaTrustedDevice.findFirst({
        where: {
            userId: input.userId,
            tokenHash: hashTrustedDeviceToken(input.token),
            revokedAt: null,
            expiresAt: { gt: now },
        },
        select: {
            id: true,
            deviceLabel: true,
            expiresAt: true,
        },
    });

    if (!device) return null;

    return tx.mfaTrustedDevice.update({
        where: { id: device.id },
        data: { lastUsedAt: now },
        select: {
            id: true,
            deviceLabel: true,
            expiresAt: true,
        },
    });
}

export async function revokeTrustedDevice(tx: TransactionClient, userId: string, deviceId: string) {
    return tx.mfaTrustedDevice.updateMany({
        where: {
            id: deviceId,
            userId,
            revokedAt: null,
        },
        data: {
            revokedAt: new Date(),
        },
    });
}

export async function revokeAllTrustedDevices(tx: TransactionClient, userId: string) {
    return tx.mfaTrustedDevice.updateMany({
        where: {
            userId,
            revokedAt: null,
        },
        data: {
            revokedAt: new Date(),
        },
    });
}

export async function startMfaLoginChallenge(tx: TransactionClient, userId: string) {
    await tx.mfaLoginChallenge.updateMany({
        where: {
            userId,
            status: "PENDENTE",
        },
        data: {
            status: "EXPIRADO",
        },
    });

    const challenge = await tx.mfaLoginChallenge.create({
        data: {
            userId,
            token: crypto.randomBytes(32).toString("hex"),
            expiresAt: new Date(Date.now() + MFA_LOGIN_TTL_MS),
        },
    });

    return challenge;
}

export async function getPendingMfaLoginChallenge(tx: TransactionClient, token: string) {
    if (!token) return null;
    const challenge = await tx.mfaLoginChallenge.findUnique({
        where: { token },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                },
            },
        },
    });

    if (!challenge) return null;
    if (challenge.status !== "PENDENTE" || challenge.expiresAt <= new Date()) {
        if (challenge.status === "PENDENTE") {
            await tx.mfaLoginChallenge.update({
                where: { id: challenge.id },
                data: { status: "EXPIRADO" },
            });
        }
        return null;
    }

    return challenge;
}

export async function verifyMfaLoginChallenge(tx: TransactionClient, token: string, code: string) {
    const challenge = await getPendingMfaLoginChallenge(tx, token);
    if (!challenge) {
        throw new MfaError("Desafio MFA expirado. Faca login novamente.");
    }

    if (challenge.attemptCount >= MFA_MAX_ATTEMPTS) {
        await tx.mfaLoginChallenge.update({
            where: { id: challenge.id },
            data: {
                status: "EXPIRADO",
            },
        });
        throw new MfaError("Limite de tentativas MFA excedido. Faca login novamente.");
    }

    let config = await tx.userMfaConfig.findUnique({
        where: { userId: challenge.userId },
    });

    if (!config || !config.isEnabled) {
        throw new MfaError("MFA nao esta ativo para este usuario.");
    }

    const now = new Date();
    if (config.lockedUntil && config.lockedUntil > now) {
        throw new MfaError("MFA temporariamente bloqueado. Aguarde 15 minutos e tente novamente.");
    }

    if (config.lockedUntil && config.lockedUntil <= now) {
        config = await tx.userMfaConfig.update({
            where: { userId: challenge.userId },
            data: {
                failedAttemptCount: 0,
                lastFailedAt: null,
                lockedUntil: null,
            },
        });
    }

    const normalizedCode = normalizeTotpCode(code);
    const normalizedRecoveryCode = normalizeRecoveryCode(code);
    const isValidTotp = verifyTotpCode({
        secret: base32Decode(decryptMfaSecret(config.secretEncrypted)),
        code: normalizedCode,
    });

    let recoveryCodeId: string | null = null;
    if (!isValidTotp && normalizedRecoveryCode.length >= 6) {
        const recoveryCode = await tx.userRecoveryCode.findFirst({
            where: {
                userId: challenge.userId,
                codeHash: hashRecoveryCode(normalizedRecoveryCode),
                usedAt: null,
            },
            select: { id: true },
        });
        recoveryCodeId = recoveryCode?.id || null;
    }

    if (!isValidTotp && !recoveryCodeId) {
        const nextAttemptCount = challenge.attemptCount + 1;
        const nextFailureCount = (config.failedAttemptCount || 0) + 1;
        const shouldLock = nextFailureCount >= MFA_LOCK_THRESHOLD;
        const challengeShouldExpire = nextAttemptCount >= MFA_MAX_ATTEMPTS || shouldLock;
        const lockedUntil = shouldLock ? new Date(Date.now() + MFA_LOCK_TTL_MS) : null;

        await tx.userMfaConfig.update({
            where: { userId: challenge.userId },
            data: {
                failedAttemptCount: nextFailureCount,
                lastFailedAt: new Date(),
                lockedUntil,
            },
        });

        await tx.mfaLoginChallenge.update({
            where: { id: challenge.id },
            data: {
                attemptCount: nextAttemptCount,
                ...(challengeShouldExpire ? { status: "EXPIRADO" as const } : {}),
            },
        });

        if (shouldLock) {
            await createMfaSecurityNotification(tx, {
                userId: challenge.userId,
                titulo: "Seguranca: MFA bloqueado temporariamente",
                mensagem: "Detectamos varias falhas consecutivas no MFA. O segundo fator ficou bloqueado por 15 minutos.",
            });
            throw new MfaError("MFA temporariamente bloqueado. Aguarde 15 minutos e tente novamente.");
        }

        if (challengeShouldExpire) {
            throw new MfaError("Limite de tentativas MFA excedido. Faca login novamente.");
        }

        throw new MfaError("Codigo MFA invalido.");
    }

    const operations: Promise<unknown>[] = [
        tx.mfaLoginChallenge.update({
            where: { id: challenge.id },
            data: {
                status: "VERIFICADO",
                verifiedAt: new Date(),
            },
        }),
        tx.userMfaConfig.update({
            where: { userId: challenge.userId },
            data: {
                lastUsedAt: new Date(),
                failedAttemptCount: 0,
                lastFailedAt: null,
                lockedUntil: null,
            },
        }),
    ];

    if (recoveryCodeId) {
        operations.push(
            tx.userRecoveryCode.update({
                where: { id: recoveryCodeId },
                data: { usedAt: new Date() },
            })
        );
    }

    await Promise.all(operations);

    return {
        user: challenge.user,
        method: recoveryCodeId ? ("RECOVERY_CODE" as const) : ("TOTP" as const),
    };
}
