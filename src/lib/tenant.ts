import { cache } from "react";
import { getSession } from "@/actions/auth";

// ─── Errors ──────────────────────────────────────────────────────────────────

export class TenantAccessError extends Error {
    constructor(message = "Acesso negado: recurso pertence a outro escritório.") {
        super(message);
        this.name = "TenantAccessError";
    }
}

export class NoTenantError extends Error {
    constructor(message = "Usuário não está vinculado a um escritório.") {
        super(message);
        this.name = "NoTenantError";
    }
}

// ─── Core helpers ─────────────────────────────────────────────────────────────

/**
 * Retorna o escritorioId do usuário autenticado.
 * Cacheia por request (React cache). Lança NoTenantError se ausente.
 */
export const getEscritorioId = cache(async (): Promise<string> => {
    const user = await getSession();
    if (!user) throw new TenantAccessError("Sessão inválida ou expirada.");
    if (!user.escritorioId) throw new NoTenantError();
    return user.escritorioId;
});

/**
 * Retorna o escritorioId ou null — para contextos onde o admin root não tem tenant.
 */
export const getEscritorioIdOptional = cache(async (): Promise<string | null> => {
    const user = await getSession();
    return user?.escritorioId ?? null;
});

/**
 * Filtro Prisma para injetar escritorioId no where das queries.
 * Uso: `db.cliente.findMany({ where: { ...tenantFilter(), nome: "X" } })`
 */
export async function tenantFilter(): Promise<{ escritorioId: string }> {
    const escritorioId = await getEscritorioId();
    return { escritorioId };
}

/**
 * Garante que o registroEscritorioId pertence ao tenant autenticado.
 * Lança TenantAccessError se diferente.
 */
export async function assertTenantOwnership(
    registroEscritorioId: string | null | undefined,
    message?: string,
): Promise<void> {
    const escritorioId = await getEscritorioId();
    if (registroEscritorioId !== escritorioId) {
        throw new TenantAccessError(message);
    }
}
