import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = [
    "/login",
    "/admin-login",
    "/esqueci-senha",
    "/redefinir-senha",
    "/api/chatbot-triagem",
    "/api/portal-cliente",
    "/api/webhooks",
];

// Rotas de API que devem ser protegidas (exigem sessão)
const PROTECTED_API_PREFIXES = [
    "/api/admin",
    "/api/clientes",
    "/api/processos",
    "/api/financeiro",
    "/api/comunicacao",
    "/api/agenda",
    "/api/documentos",
    "/api/crm",
    "/api/grafo",
    "/api/bi",
    "/api/datajud",
    "/root-admin/api", // Root admin APIs (validam própria autenticação)
];

// Cookies de sessão e MFA
const SESSION_COOKIE = "session_token";
const MFA_CHALLENGE_COOKIE = "mfa_challenge_token";
const MFA_SETUP_REQUIRED_COOKIE = "mfa_setup_required";

// Métodos que modificam estado — sujeitos à verificação CSRF
const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function isPublicRoute(pathname: string): boolean {
    return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function isProtectedApiRoute(pathname: string): boolean {
    return PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function checkCsrf(request: NextRequest): boolean {
    const origin = request.headers.get("origin");
    if (!origin) return true;

    // Prefer explicit base URL from env; fallback to host header for proxied setups
    const configuredBase = process.env.NEXT_PUBLIC_BASE_URL;
    if (configuredBase) {
        try {
            return new URL(configuredBase).origin === origin;
        } catch {
            // fall through
        }
    }

    // Compare origin host with the request Host header (reliable in proxy setups)
    const host = request.headers.get("host");
    if (!host) return false;

    try {
        const originHost = new URL(origin).host;
        return originHost === host;
    } catch {
        return false;
    }
}

function addSecurityHeaders(response: NextResponse): NextResponse {
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()"
    );
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
    const httpMethod = request.method;

    const response = NextResponse.next();
    addSecurityHeaders(response);

    // Assets e internos do Next.js — sempre passam
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon") ||
        pathname.startsWith("/icons") ||
        pathname.startsWith("/images") ||
        pathname.startsWith("/uploads")
    ) {
        return response;
    }

    // APIs — lidam com autenticação internamente
    if (pathname.startsWith("/api") || pathname.startsWith("/root-admin/api")) {
        return response;
    }

    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
    const mfaChallenge = request.cookies.get(MFA_CHALLENGE_COOKIE)?.value;
    const mfaSetupRequired = request.cookies.get(MFA_SETUP_REQUIRED_COOKIE)?.value;

    // Rotas públicas de auth
    if (isPublicRoute(pathname) || pathname === "/") {
        // Redirecionar usuário já autenticado (sem MFA pendente) para o dashboard
        if (
            sessionToken &&
            !mfaChallenge &&
            !mfaSetupRequired &&
            pathname !== "/" &&
            !pathname.startsWith("/admin-login") &&
            !pathname.startsWith("/root-admin")
        ) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        return response;
    }

    // Rotas protegidas — exigem session_token
    if (!sessionToken && !pathname.startsWith("/root-admin") && !pathname.startsWith("/admin-login")) {
        const loginUrl = new URL("/login", request.url);
        if (pathname !== "/dashboard") {
            loginUrl.searchParams.set("callbackUrl", pathname);
        }
        return NextResponse.redirect(loginUrl);
    }

    return response;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
