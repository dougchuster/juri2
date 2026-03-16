import { NextRequest, NextResponse } from "next/server";
import { handleOutlookCallback } from "@/lib/integrations/outlook-calendar";

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
        await handleOutlookCallback(code, state);
        return NextResponse.redirect(
            new URL("/admin/integracoes?success=outlook", request.url)
        );
    } catch (err) {
        console.error("[Outlook Callback] Error:", err);
        return NextResponse.redirect(
            new URL("/admin/integracoes?error=outlook_auth_failed", request.url)
        );
    }
}
