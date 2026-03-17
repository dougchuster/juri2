import { ConfidentialClientApplication } from "@azure/msal-node";
import { NextResponse } from "next/server";
import { buildLoginErrorUrl, createOAuthState, getAppBaseUrl } from "@/lib/auth/oauth-login";

export const runtime = "nodejs";

const MICROSOFT_SCOPES = ["openid", "profile", "email", "User.Read"];

export async function GET() {
    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
        return NextResponse.redirect(buildLoginErrorUrl("Microsoft login nao configurado."));
    }

    const state = await createOAuthState("microsoft");
    const redirectUri = `${getAppBaseUrl()}/api/auth/microsoft/callback`;
    const msalClient = new ConfidentialClientApplication({
        auth: {
            clientId: process.env.MICROSOFT_CLIENT_ID,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
            authority: "https://login.microsoftonline.com/common",
        },
    });

    const authUrl = await msalClient.getAuthCodeUrl({
        scopes: MICROSOFT_SCOPES,
        redirectUri,
        prompt: "select_account",
        state,
    });

    return NextResponse.redirect(authUrl);
}