import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import {
    buildLoginErrorUrl,
    getAppBaseUrl,
    resolveOAuthLogin,
    validateOAuthState,
} from "@/lib/auth/oauth-login";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const oauthError = request.nextUrl.searchParams.get("error");

    if (oauthError) {
        return NextResponse.redirect(buildLoginErrorUrl("Login com Google cancelado ou recusado."));
    }

    const isValidState = await validateOAuthState("google", state);
    if (!isValidState || !code) {
        return NextResponse.redirect(buildLoginErrorUrl("Falha ao validar o login com Google."));
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return NextResponse.redirect(buildLoginErrorUrl("Google login nao configurado."));
    }

    try {
        const redirectUri = `${getAppBaseUrl()}/api/auth/google/callback`;
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            redirectUri,
        );

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const profile = await oauth2.userinfo.get();
        const email = profile.data.email?.trim();

        if (!email) {
            return NextResponse.redirect(buildLoginErrorUrl("Nao foi possivel obter o e-mail da conta Google."));
        }

        const result = await resolveOAuthLogin(email);
        if ("error" in result) {
            return NextResponse.redirect(buildLoginErrorUrl(result.error ?? "Erro desconhecido."));
        }

        return NextResponse.redirect(new URL(result.redirectTo, getAppBaseUrl()));
    } catch {
        return NextResponse.redirect(buildLoginErrorUrl("Falha ao concluir o login com Google."));
    }
}