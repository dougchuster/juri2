import { google } from "googleapis";
import { NextResponse } from "next/server";
import { buildLoginErrorUrl, createOAuthState, getAppBaseUrl } from "@/lib/auth/oauth-login";

export const runtime = "nodejs";

export async function GET() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return NextResponse.redirect(buildLoginErrorUrl("Google login nao configurado."));
    }

    const state = await createOAuthState("google");
    const redirectUri = `${getAppBaseUrl()}/api/auth/google/callback`;
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri,
    );

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "online",
        scope: ["openid", "email", "profile"],
        prompt: "select_account",
        state,
    });

    return NextResponse.redirect(authUrl);
}