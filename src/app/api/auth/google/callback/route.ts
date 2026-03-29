import { NextRequest, NextResponse } from "next/server";
import {
    buildLoginErrorUrl,
    getAppBaseUrl,
    resolveOAuthLogin,
    validateOAuthState,
} from "@/lib/auth/oauth-login";
import { exchangeGoogleCodeForEmail, isGoogleOAuthConfigured } from "@/lib/auth/google-oauth";

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

    if (!isGoogleOAuthConfigured()) {
        return NextResponse.redirect(buildLoginErrorUrl("Google login nao configurado."));
    }

    try {
        const email = await exchangeGoogleCodeForEmail(code);

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
