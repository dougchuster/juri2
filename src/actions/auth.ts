"use server";

import { cache } from "react";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { registrarLogAuditoria } from "@/lib/services/audit-log";
import { createMfaSecurityNotification } from "@/lib/services/mfa-alerts";
import { checkRateLimitAsync, getClientIp } from "@/lib/middleware/rate-limit";
import {
    consumeTrustedDevice,
    MfaError,
    getPendingMfaLoginChallenge,
    registerTrustedDevice,
    startMfaLoginChallenge,
    verifyMfaLoginChallenge,
} from "@/lib/services/mfa-service";

const SESSION_INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_COOKIE_MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 days
const SESSION_REFRESH_THRESHOLD_MS = 10 * 60 * 1000; // refresh DB expiry when < 10 min left
const MFA_COOKIE_NAME = "mfa_challenge_token";
const MFA_SETUP_REQUIRED_COOKIE_NAME = "mfa_setup_required";
const MFA_TRUSTED_DEVICE_COOKIE_NAME = "mfa_trusted_device";
const MFA_TRUSTED_DEVICE_MAX_AGE_SEC = 30 * 24 * 60 * 60;

function isSessionInfrastructureError(error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "ECONNREFUSED") {
        return true;
    }

    if (error instanceof Error) {
        return error.message.includes("ECONNREFUSED") || error.message.includes("Can't reach database server");
    }

    return false;
}

async function setSessionCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set("session_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_COOKIE_MAX_AGE_SEC,
        path: "/",
    });
}

async function clearMfaChallengeCookie() {
    const cookieStore = await cookies();
    cookieStore.delete(MFA_COOKIE_NAME);
}

async function clearMfaSetupRequiredCookie() {
    const cookieStore = await cookies();
    cookieStore.delete(MFA_SETUP_REQUIRED_COOKIE_NAME);
}

async function clearTrustedDeviceCookie() {
    const cookieStore = await cookies();
    cookieStore.delete(MFA_TRUSTED_DEVICE_COOKIE_NAME);
}

async function setMfaChallengeCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set(MFA_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 60,
        path: "/",
    });
}

async function setTrustedDeviceCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set(MFA_TRUSTED_DEVICE_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: MFA_TRUSTED_DEVICE_MAX_AGE_SEC,
        path: "/",
    });
}

async function createAuthenticatedSession(userId: string) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_INACTIVITY_MS);

    await db.session.create({
        data: {
            userId,
            token,
            expiresAt,
        },
    });

    await db.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() },
    });

    await setSessionCookie(token);
}

export async function login(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "E-mail e senha sao obrigatorios." };
    }

    // Rate limiting: 10 tentativas por email a cada 15 minutos
    const headerStore = await headers();
    const ip = getClientIp(headerStore as unknown as Headers);
    const emailKey = `login:email:${email.toLowerCase().trim()}`;
    const ipKey = `login:ip:${ip}`;

    const [emailLimit, ipLimit] = await Promise.all([
        checkRateLimitAsync(emailKey, { maxRequests: 10, windowMs: 15 * 60 * 1000, prefix: "" }),
        checkRateLimitAsync(ipKey, { maxRequests: 30, windowMs: 15 * 60 * 1000, prefix: "" }),
    ]);

    if (!emailLimit.allowed || !ipLimit.allowed) {
        return { error: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente." };
    }

    const user = await db.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: {
            mfaConfig: true,
        },
    });

    if (!user) {
        return { error: "E-mail ou senha invalidos." };
    }

    if (!user.isActive) {
        return { error: "Conta desativada. Entre em contato com o administrador." };
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
        return { error: "E-mail ou senha invalidos." };
    }

    if (user.mfaConfig?.isEnabled) {
        const cookieStore = await cookies();
        const trustedDeviceToken = cookieStore.get(MFA_TRUSTED_DEVICE_COOKIE_NAME)?.value || "";
        if (trustedDeviceToken) {
            const trustedDevice = await db.$transaction(async (tx) => {
                return consumeTrustedDevice(tx, {
                    userId: user.id,
                    token: trustedDeviceToken,
                });
            });

            if (trustedDevice) {
                await createAuthenticatedSession(user.id);
                await clearMfaChallengeCookie();
                await clearMfaSetupRequiredCookie();
                await registrarLogAuditoria({
                    actorUserId: user.id,
                    acao: "MFA_TRUSTED_DEVICE_LOGIN_VERIFICADO",
                    entidade: "User",
                    entidadeId: user.id,
                    dadosDepois: {
                        email: user.email,
                        trustedDeviceId: trustedDevice.id,
                        deviceLabel: trustedDevice.deviceLabel,
                    },
                });
                redirect("/dashboard");
            }

            await clearTrustedDeviceCookie();
        }

        const challenge = await db.$transaction(async (tx) => {
            return startMfaLoginChallenge(tx, user.id);
        });

        await setMfaChallengeCookie(challenge.token);
        await clearMfaSetupRequiredCookie();
        return { mfaRequired: true };
    }

    await createAuthenticatedSession(user.id);
    await clearMfaChallengeCookie();
    await clearMfaSetupRequiredCookie();
    redirect("/dashboard");
}

export async function verifyMfaLogin(formData: FormData) {
    const code = String(formData.get("code") || "").trim();
    const rememberDevice = String(formData.get("rememberDevice") || "") === "on";
    if (!code) {
        return { error: "Informe o codigo do autenticador ou um recovery code." };
    }

    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(MFA_COOKIE_NAME)?.value || "";
    if (!challengeToken) {
        return { error: "Desafio MFA expirado. Faca login novamente." };
    }

    // Rate limiting: 5 tentativas por desafio MFA (previne brute force do código)
    const mfaLimit = await checkRateLimitAsync(
        `mfa:challenge:${challengeToken}`,
        { maxRequests: 5, windowMs: 10 * 60 * 1000, prefix: "" }
    );
    if (!mfaLimit.allowed) {
        return { error: "Muitas tentativas incorretas. Faca login novamente para obter um novo codigo." };
    }

    try {
        const headerStore = await headers();
        const userAgent = headerStore.get("user-agent");

        const verified = await verifyMfaLoginChallenge(db, challengeToken, code);
        const trustedDevice =
            rememberDevice && verified.method === "TOTP"
                ? await registerTrustedDevice(db, {
                    userId: verified.user.id,
                    userAgent,
                })
                : null;

        await createAuthenticatedSession(verified.user.id);
        await clearMfaChallengeCookie();
        await clearMfaSetupRequiredCookie();
        if (trustedDevice) {
            await setTrustedDeviceCookie(trustedDevice.token);
        }

        await registrarLogAuditoria({
            actorUserId: verified.user.id,
            acao: verified.method === "RECOVERY_CODE" ? "MFA_LOGIN_RECOVERY_CODE_VERIFICADO" : "MFA_LOGIN_VERIFICADO",
            entidade: "User",
            entidadeId: verified.user.id,
            dadosDepois: { email: verified.user.email, method: verified.method, rememberDevice },
        });

        if (verified.method === "RECOVERY_CODE") {
            await createMfaSecurityNotification(db, {
                userId: verified.user.id,
                titulo: "Seguranca: recovery code utilizado",
                mensagem: "Um recovery code foi usado para concluir seu login MFA. Revogue ou regenere os codigos se isso nao era esperado.",
            });
        }

        if (trustedDevice) {
            await registrarLogAuditoria({
                actorUserId: verified.user.id,
                acao: "MFA_TRUSTED_DEVICE_REGISTRADO",
                entidade: "User",
                entidadeId: verified.user.id,
                dadosDepois: {
                    trustedDeviceId: trustedDevice.device.id,
                    deviceLabel: trustedDevice.device.deviceLabel,
                    expiresAt: trustedDevice.device.expiresAt.toISOString(),
                },
            });
            await createMfaSecurityNotification(db, {
                userId: verified.user.id,
                titulo: "Seguranca: novo dispositivo confiavel",
                mensagem: `Um novo dispositivo confiavel foi registrado: ${trustedDevice.device.deviceLabel}.`,
            });
        }

        redirect("/dashboard");
    } catch (error) {
        if (error instanceof MfaError) {
            const challenge = await db.mfaLoginChallenge.findUnique({
                where: { token: challengeToken },
                select: { userId: true },
            });
            if (challenge?.userId) {
                await registrarLogAuditoria({
                    actorUserId: challenge.userId,
                    acao: "MFA_LOGIN_FALHOU",
                    entidade: "User",
                    entidadeId: challenge.userId,
                    dadosDepois: { reason: error.message },
                });
            }
            return { error: error.message };
        }
        return { error: "Nao foi possivel validar o MFA." };
    }
}

export async function logout() {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;

    if (token) {
        await db.session.deleteMany({ where: { token } });
    }

    cookieStore.delete("session_token");
    cookieStore.delete(MFA_COOKIE_NAME);
    cookieStore.delete(MFA_SETUP_REQUIRED_COOKIE_NAME);

    redirect("/login");
}

export const getSession = cache(async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;

    if (!token) return null;

    try {
        const session = await db.session.findUnique({
            where: { token },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        avatarUrl: true,
                        isActive: true,
                        onboardingCompleted: true,
                        escritorioId: true,
                        advogado: {
                            select: { id: true, oab: true, seccional: true },
                        },
                        mfaConfig: {
                            select: {
                                isEnabled: true,
                                enabledAt: true,
                                lastUsedAt: true,
                                enforcedByPolicy: true,
                            },
                        },
                    },
                },
            },
        });

        const now = new Date();
        if (!session || session.expiresAt < now || !session.user.isActive) {
            if (session) {
                await db.session.delete({ where: { id: session.id } });
            }
            return null;
        }

        const remainingMs = session.expiresAt.getTime() - now.getTime();
        if (remainingMs <= SESSION_REFRESH_THRESHOLD_MS) {
            await db.session.update({
                where: { id: session.id },
                data: { expiresAt: new Date(now.getTime() + SESSION_INACTIVITY_MS) },
            });
        }

        return session.user;
    } catch (error) {
        if (isSessionInfrastructureError(error)) {
            console.warn("[auth] Session lookup unavailable; continuing as anonymous.");
            return null;
        }

        throw error;
    }
});

export async function getPendingMfaLoginState() {
    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(MFA_COOKIE_NAME)?.value || "";
    if (!challengeToken) return null;

    return db.$transaction(async (tx) => {
        const challenge = await getPendingMfaLoginChallenge(tx, challengeToken);
        if (!challenge) {
            await clearMfaChallengeCookie();
            return null;
        }

        return {
            userName: challenge.user.name,
            email: challenge.user.email,
            expiresAt: challenge.expiresAt,
        };
    });
}
