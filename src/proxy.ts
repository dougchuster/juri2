import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodePermissionCache, PERMISSION_CACHE_COOKIE_NAME } from "@/lib/rbac/permission-cache";
import { getRequiredPermissionForPath, RBAC_ENABLED } from "@/lib/rbac/permissions";

const PUBLIC_ROUTES = [
    "/login",
    "/admin-login",
    "/esqueci-senha",
    "/redefinir-senha",
    "/api/chatbot-triagem",
    "/api/portal-cliente",
    "/api/webhooks",
];

const SESSION_COOKIE = "session_token";

function isPublicRoute(pathname: string) {
    return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function addSecurityHeaders(response: NextResponse) {
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.headers.set("X-XSS-Protection", "1; mode=block");

    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://api.datajud.cnj.jus.br https://api.clicksign.com",
        "frame-src 'self'",
        "frame-ancestors 'none'",
    ].join("; ");

    response.headers.set("Content-Security-Policy", csp);
    return response;
}

export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-rbac-pathname", pathname);

    function nextResponse() {
        const response = NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });

        return addSecurityHeaders(response);
    }

    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon") ||
        pathname.startsWith("/icons") ||
        pathname.startsWith("/images") ||
        pathname.startsWith("/uploads") ||
        pathname === "/manifest.webmanifest"
    ) {
        return nextResponse();
    }

    if (pathname.startsWith("/api") || pathname.startsWith("/root-admin/api")) {
        return nextResponse();
    }

    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
    if (isPublicRoute(pathname) || pathname === "/") {
        return nextResponse();
    }

    if (!sessionToken && !pathname.startsWith("/root-admin") && !pathname.startsWith("/admin-login")) {
        const loginUrl = new URL("/login", request.url);
        if (pathname !== "/dashboard") {
            loginUrl.searchParams.set("callbackUrl", pathname);
        }
        return NextResponse.redirect(loginUrl);
    }

    if (RBAC_ENABLED && !pathname.startsWith("/root-admin") && !pathname.startsWith("/admin-login")) {
        const permCacheRaw = request.cookies.get(PERMISSION_CACHE_COOKIE_NAME)?.value;
        if (permCacheRaw) {
            const parsed = decodePermissionCache(permCacheRaw);
            if (!parsed) {
                const response = nextResponse();
                response.cookies.delete(PERMISSION_CACHE_COOKIE_NAME);
                return response;
            }

            const requiredPermission = getRequiredPermissionForPath(pathname);
            if (requiredPermission && !parsed.permissions.includes(requiredPermission)) {
                requestHeaders.set("x-rbac-cookie-miss", requiredPermission);
            }
        }
    }

    return nextResponse();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
