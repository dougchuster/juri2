import { NextRequest, NextResponse } from "next/server";
import { handleGoogleCallback } from "@/lib/integrations/google-calendar";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // userId
    const error = searchParams.get("error");

    if (error) {
        return NextResponse.redirect(
            new URL(`/admin/integracoes?error=${encodeURIComponent(error)}`, request.url)
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            new URL("/admin/integracoes?error=missing_params", request.url)
        );
    }

    try {
        await handleGoogleCallback(code, state);
        return NextResponse.redirect(
            new URL("/admin/integracoes?success=google", request.url)
        );
    } catch (err) {
        console.error("[Google Callback] Error:", err);
        return NextResponse.redirect(
            new URL("/admin/integracoes?error=google_auth_failed", request.url)
        );
    }
}
