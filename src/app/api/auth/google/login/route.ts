import { NextResponse } from "next/server";
import { buildLoginErrorUrl, createOAuthState } from "@/lib/auth/oauth-login";
import { buildGoogleLoginUrl, isGoogleOAuthConfigured } from "@/lib/auth/google-oauth";

export const runtime = "nodejs";

export async function GET() {
    if (!isGoogleOAuthConfigured()) {
        return NextResponse.redirect(buildLoginErrorUrl("Google login nao configurado."));
    }

    const state = await createOAuthState("google");
    return NextResponse.redirect(buildGoogleLoginUrl(state));
}
