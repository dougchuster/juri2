/**
 * Middleware — Proteção de rotas e validação de sessão (Fase 7 multi-tenancy)
 *
 * Responsabilidades:
 *  1. Redirecionar usuários não autenticados que tentam acessar rotas protegidas → /login
 *  2. Redirecionar usuários já autenticados que tentam acessar páginas de auth → /dashboard
 *  3. Preservar o fluxo de MFA (challenge + setup required)
 *  4. Deixar APIs, portal e assets estáticos passarem livremente
 *
 * NOTA: o Edge Runtime não suporta Prisma/Node.js — este middleware faz apenas
 * verificação de cookie. A validação real de sessão (DB) + verificação de
 * escritorioId acontece em getSession() / getEscritorioId() dentro de cada
 * Server Component / Server Action (Fases 2–5 já implementadas).
 */

import { NextRequest, NextResponse } from "next/server";

// ─── Cookies de sessão ────────────────────────────────────────────────────────

const SESSION_COOKIE = "session_token";
const MFA_CHALLENGE_COOKIE = "mfa_challenge_token";
const MFA_SETUP_REQUIRED_COOKIE = "mfa_setup_required";

// ─── Rotas protegidas (requerem session_token) ────────────────────────────────
// Correspondem ao grupo (dashboard) + root-admin

const PROTECTED_PREFIXES = [
    "/dashboard",
    "/agenda",
    "/calculos",
    "/clientes",
    "/comunicacao",
    "/crm",
    "/demandas",
    "/documentos",
    "/financeiro",
    "/pecas",
    "/prazos",
    "/processos",
    "/protocolos",
    "/publicacoes",
    "/tarefas",
    "/configuracoes",
    "/admin",
    "/root-admin",
];

// ─── Rotas de autenticação (redirecionar se já autenticado) ───────────────────

const AUTH_PREFIXES = [
    "/login",
    "/esqueci-senha",
    "/redefinir-senha",
    "/admin-login",
];

// ─── Rotas sempre públicas (nunca redirecionar) ───────────────────────────────

const PUBLIC_PREFIXES = [
    "/api/",       // APIs lidam com auth internamente
    "/portal",     // Portal do cliente tem auth própria
    "/_next/",
    "/favicon",
    "/images/",
    "/icons/",
    "/uploads/",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchesAny(pathname: string, prefixes: string[]): boolean {
    return prefixes.some((prefix) => pathname.startsWith(prefix));
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Sempre deixar rotas públicas passarem
    if (matchesAny(pathname, PUBLIC_PREFIXES)) {
        return NextResponse.next();
    }

    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
    const mfaChallenge = request.cookies.get(MFA_CHALLENGE_COOKIE)?.value;
    const mfaSetupRequired = request.cookies.get(MFA_SETUP_REQUIRED_COOKIE)?.value;

    // 2. Rota protegida sem session_token → redirecionar para login
    if (matchesAny(pathname, PROTECTED_PREFIXES) && !sessionToken) {
        const loginUrl = new URL("/login", request.url);
        // Preservar destino para redirecionar após login
        if (pathname !== "/dashboard") {
            loginUrl.searchParams.set("redirect", pathname);
        }
        return NextResponse.redirect(loginUrl);
    }

    // 3. Página de auth com session_token válido → redirecionar para dashboard
    //    Exceto: fluxo de MFA ainda em andamento (challenge ou setup pendente)
    if (
        matchesAny(pathname, AUTH_PREFIXES) &&
        sessionToken &&
        !mfaChallenge &&
        !mfaSetupRequired
    ) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

// ─── Matcher ─────────────────────────────────────────────────────────────────
// Exclui explicitamente assets do Next.js e ficheiros estáticos para não
// penalizar performance com o middleware em cada asset.

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon\\.ico|images/|icons/|uploads/).*)",
    ],
};
