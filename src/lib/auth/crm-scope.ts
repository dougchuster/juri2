import type { Prisma } from "@/generated/prisma";
import type { CRMAuthUser } from "@/lib/auth/crm-auth";
import { isUserScopedCRM } from "@/lib/auth/crm-auth";

function noAccessWhere(): Prisma.ClienteWhereInput {
    return { id: "__no_access__" };
}

function buildScopedCardConditions(user: CRMAuthUser): Prisma.CRMCardWhereInput[] {
    const conditions: Prisma.CRMCardWhereInput[] = [{ ownerId: user.id }];

    if (user.advogadoId) {
        conditions.push({ responsavelAdvogadoId: user.advogadoId });
    }

    if (user.teamIds.length > 0) {
        conditions.push({
            responsavelAdvogado: {
                timeMembros: {
                    some: {
                        timeId: { in: user.teamIds },
                    },
                },
            },
        });
    }

    if (user.teamNames.length > 0) {
        conditions.push({
            equipeResponsavel: {
                in: user.teamNames,
            },
        });
    }

    if (user.crmAreas.length > 0) {
        conditions.push({
            OR: [
                { areaDireito: { in: user.crmAreas } },
                { pipeline: { areaDireito: { in: user.crmAreas } } },
            ],
        });
    }

    return conditions;
}

export function buildContatoVisibilityWhere(user: CRMAuthUser): Prisma.ClienteWhereInput {
    const tenantFilter: Prisma.ClienteWhereInput = user.escritorioId
        ? { escritorioId: user.escritorioId }
        : {};

    if (!isUserScopedCRM(user)) return tenantFilter;

    const cardScope = buildCardVisibilityWhere(user);

    return {
        ...tenantFilter,
        OR: [
            { crmCards: { some: cardScope } },
            { crmActivities: { some: { ownerId: user.id } } },
            { processos: { some: { advogado: { userId: user.id } } } },
        ],
    };
}

export function buildCardVisibilityWhere(user: CRMAuthUser): Prisma.CRMCardWhereInput {
    if (!isUserScopedCRM(user)) return {};

    const or = buildScopedCardConditions(user);

    return or.length > 0 ? { OR: or } : { id: "__no_access__" };
}

export function buildActivityVisibilityWhere(user: CRMAuthUser): Prisma.CRMActivityWhereInput {
    if (!isUserScopedCRM(user)) return {};

    const cardScope = buildCardVisibilityWhere(user);

    return {
        OR: [
            { ownerId: user.id },
            { card: cardScope },
            { processo: { advogado: { userId: user.id } } },
        ],
    };
}

export function buildDocumentVisibilityWhere(user: CRMAuthUser): Prisma.CRMCommercialDocumentWhereInput {
    if (!isUserScopedCRM(user)) return {};

    const cardScope = buildCardVisibilityWhere(user);

    return {
        OR: [
            { createdById: user.id },
            { card: cardScope },
            { processo: { advogado: { userId: user.id } } },
        ],
    };
}

export function ensureScopedWhere<T extends Prisma.ClienteWhereInput>(
    base: T,
    scope: Prisma.ClienteWhereInput
): Prisma.ClienteWhereInput {
    const hasScope = scope && Object.keys(scope).length > 0;
    if (!hasScope) return base;
    const hasBase = base && Object.keys(base).length > 0;
    if (!hasBase) return scope;
    return { AND: [base, scope] };
}

export function enforceNoAccessIfEmpty<T extends object>(scope: T): T {
    if (Object.keys(scope).length > 0) return scope;
    return noAccessWhere() as unknown as T;
}
