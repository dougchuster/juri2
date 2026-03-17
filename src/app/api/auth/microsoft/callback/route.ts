import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import { NextRequest, NextResponse } from "next/server";
import {
    buildLoginErrorUrl,
    getAppBaseUrl,
    resolveOAuthLogin,
    validateOAuthState,
} from "@/lib/auth/oauth-login";

export const runtime = "nodejs";

const MICROSOFT_SCOPES = ["openid", "profile", "email", "User.Read"];

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const oauthError = request.nextUrl.searchParams.get("error");

    if (oauthError) {
        return NextResponse.redirect(buildLoginErrorUrl("Login com Microsoft cancelado ou recusado."));
    }

    const isValidState = await validateOAuthState("microsoft", state);
    if (!isValidState || !code) {
        return NextResponse.redirect(buildLoginErrorUrl("Falha ao validar o login com Microsoft."));
    }

    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
        return NextResponse.redirect(buildLoginErrorUrl("Microsoft login nao configurado."));
    }

    try {
        const redirectUri = `${getAppBaseUrl()}/api/auth/microsoft/callback`;
        const msalClient = new ConfidentialClientApplication({
            auth: {
                clientId: process.env.MICROSOFT_CLIENT_ID,
                clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
                authority: "https://login.microsoftonline.com/common",
            },
        });

        const tokenResult = await msalClient.acquireTokenByCode({
            code,
            scopes: MICROSOFT_SCOPES,
            redirectUri,
        });

        const graphClient = Client.init({
            authProvider: (done) => done(null, tokenResult?.accessToken || ""),
        });

        const profile = await graphClient.api("/me").select("mail,userPrincipalName").get();
        const email = String(profile.mail || profile.userPrincipalName || "").trim();

        if (!email) {
            return NextResponse.redirect(buildLoginErrorUrl("Nao foi possivel obter o e-mail da conta Microsoft."));
        }

        const result = await resolveOAuthLogin(email);
        if ("error" in result) {
            return NextResponse.redirect(buildLoginErrorUrl(result.error ?? "Erro desconhecido."));
        }

        return NextResponse.redirect(new URL(result.redirectTo, getAppBaseUrl()));
    } catch {
        return NextResponse.redirect(buildLoginErrorUrl("Falha ao concluir o login com Microsoft."));
    }
}