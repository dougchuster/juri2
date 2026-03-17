import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
    consumeTrustedDevice,
    startMfaLoginChallenge,
} from "@/lib/services/mfa-service";

const SESSION_INACTIVITY_MS = 30 * 60 * 1000;
const SESSION_COOKIE_MAX_AGE_SEC = 30 * 24 * 60 * 60;
const MFA_COOKIE_NAME = "mfa_challenge_token";
const MFA_SETUP_REQUIRED_COOKIE_NAME = "mfa_setup_required";
const MFA_TRUSTED_DEVICE_COOKIE_NAME = "mfa_trusted_device";
const OAUTH_STATE_MAX_AGE_SEC = 10 * 60;

type OAuthProvider = "google" | "microsoft";

export function getAppBaseUrl() {
    return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
}

function getOAuthStateCookieName(provider: OAuthProvider) {
    return `oauth_login_state_${provider}`;
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

export async function createAuthenticatedSession(userId: string) {
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

export async function createOAuthState(provider: OAuthProvider) {
    const state = crypto.randomBytes(24).toString("hex");
    const cookieStore = await cookies();
    cookieStore.set(getOAuthStateCookieName(provider), state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: OAUTH_STATE_MAX_AGE_SEC,
        path: "/",
    });
    return state;
}

export async function validateOAuthState(provider: OAuthProvider, state: string | null) {
    const cookieStore = await cookies();
    const cookieName = getOAuthStateCookieName(provider);
    const expectedState = cookieStore.get(cookieName)?.value || "";
    cookieStore.delete(cookieName);
    return Boolean(state && expectedState && state === expectedState);
}

export function buildLoginErrorUrl(message: string) {
    const url = new URL("/login", getAppBaseUrl());
    url.searchParams.set("error", message);
    return url;
}

export async function resolveOAuthLogin(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await db.user.findUnique({
        where: { email: normalizedEmail },
        include: { mfaConfig: true },
    });

    if (!user) {
        return { error: "Nenhuma conta ativa foi encontrada para este e-mail." } as const;
    }

    if (!user.isActive) {
        return { error: "Conta desativada. Entre em contato com o administrador." } as const;
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
                return { redirectTo: "/dashboard" } as const;
            }

            await clearTrustedDeviceCookie();
        }

        const challenge = await db.$transaction(async (tx) => {
            return startMfaLoginChallenge(tx, user.id);
        });

        await setMfaChallengeCookie(challenge.token);
        await clearMfaSetupRequiredCookie();
        return { redirectTo: "/login/mfa" } as const;
    }

    await createAuthenticatedSession(user.id);
    await clearMfaChallengeCookie();
    await clearMfaSetupRequiredCookie();
    return { redirectTo: "/dashboard" } as const;
}