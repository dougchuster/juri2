import { getAppBaseUrl } from "@/lib/auth/oauth-login";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";

function getGoogleClientId() {
    return process.env.GOOGLE_CLIENT_ID || "";
}

function getGoogleClientSecret() {
    return process.env.GOOGLE_CLIENT_SECRET || "";
}

export function isGoogleOAuthConfigured() {
    return Boolean(getGoogleClientId() && getGoogleClientSecret());
}

export function getGoogleOAuthRedirectUri() {
    return `${getAppBaseUrl()}/api/auth/google/callback`;
}

export function buildGoogleLoginUrl(state: string) {
    const params = new URLSearchParams({
        client_id: getGoogleClientId(),
        redirect_uri: getGoogleOAuthRedirectUri(),
        response_type: "code",
        scope: "openid email profile",
        access_type: "online",
        prompt: "select_account",
        state,
    });

    return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

type GoogleTokenResponse = {
    access_token?: string;
};

type GoogleUserInfoResponse = {
    email?: string;
};

export async function exchangeGoogleCodeForEmail(code: string) {
    const tokenBody = new URLSearchParams({
        code,
        client_id: getGoogleClientId(),
        client_secret: getGoogleClientSecret(),
        redirect_uri: getGoogleOAuthRedirectUri(),
        grant_type: "authorization_code",
    });

    const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenBody.toString(),
        cache: "no-store",
    });

    if (!tokenResponse.ok) {
        throw new Error(`google_token_exchange_failed:${tokenResponse.status}`);
    }

    const tokenPayload = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenPayload.access_token) {
        throw new Error("google_token_missing_access_token");
    }

    const profileResponse = await fetch(GOOGLE_USERINFO_ENDPOINT, {
        headers: {
            Authorization: `Bearer ${tokenPayload.access_token}`,
        },
        cache: "no-store",
    });

    if (!profileResponse.ok) {
        throw new Error(`google_userinfo_failed:${profileResponse.status}`);
    }

    const profile = (await profileResponse.json()) as GoogleUserInfoResponse;
    return profile.email?.trim() || "";
}
