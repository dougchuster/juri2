import "server-only";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma";
import { getSession } from "@/actions/auth";
import { getUserOrganizationMappings, resolveUserOrganization } from "@/lib/root-admin/user-organization";
import { RBAC_ENABLED } from "@/lib/rbac/permissions";
import { resolveUserPermissions } from "@/lib/rbac/resolve-permissions";

const CRM_VIEW_PERMISSIONS = [
    "crm:contatos:ver",
    "crm:listas:ver",
    "crm:segmentos:ver",
    "crm:pipeline:ver",
    "crm:atividades:ver",
    "crm:campanhas:ver",
    "crm:fluxos:ver",
    "crm:analytics:ver",
    "crm:configuracoes:ver",
];

const CRM_MANAGE_CONFIGURATION_PERMISSIONS = [
    "crm:configuracoes:editar",
    "crm:configuracoes:gerenciar",
    "crm:campanhas:gerenciar",
    "crm:fluxos:gerenciar",
];

export type CRMAuthUser = {
    id: string;
    role: Role;
    isActive: boolean;
    escritorioId: string | null;
    advogadoId: string | null;
    teamIds: string[];
    teamNames: string[];
    crmAreas: string[];
    permissions: string[];
};

function normalizeArea(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .toUpperCase()
        .trim();
}

function parseCRMUserAreas(raw?: string | null) {
    if (!raw) return [];
    const list = raw
        .split(/[,;|/\n]+/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

    const all = new Set<string>();
    for (const item of list) {
        all.add(item);
        all.add(normalizeArea(item));
    }
    return Array.from(all);
}

export async function getCRMAuthUser(): Promise<CRMAuthUser | null> {
    const session = await getSession();
    if (!session?.id || !session.isActive) return null;

    const user = await db.user.findUnique({
        where: { id: session.id },
        select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            advogado: {
                select: {
                    id: true,
                    especialidades: true,
                    timeMembros: {
                        select: {
                            time: { select: { id: true, nome: true } },
                        },
                    },
                },
            },
        },
    });

    if (!user?.isActive) {
        return null;
    }

    const permissions = RBAC_ENABLED
        ? Array.from(await resolveUserPermissions({
            userId: user.id,
            role: user.role,
            escritorioId: session.escritorioId,
        }))
        : CRM_VIEW_PERMISSIONS;

    if (RBAC_ENABLED && !CRM_VIEW_PERMISSIONS.some((permission) => permissions.includes(permission))) {
        return null;
    }

    const [escritorios, mappings] = await Promise.all([
        db.escritorio.findMany({ select: { id: true, nome: true, email: true, slug: true } }),
        getUserOrganizationMappings(),
    ]);

    const resolved = resolveUserOrganization(
        { id: user.id, email: user.email },
        escritorios,
        mappings
    );

    const fallbackEscritorioId = session.escritorioId ?? resolved?.id ?? escritorios[0]?.id ?? null;

    return {
        id: user.id,
        role: user.role,
        isActive: user.isActive,
        escritorioId: fallbackEscritorioId,
        advogadoId: user.advogado?.id || null,
        teamIds: (user.advogado?.timeMembros || []).map((item) => item.time.id),
        teamNames: (user.advogado?.timeMembros || []).map((item) => item.time.nome),
        crmAreas: parseCRMUserAreas(user.advogado?.especialidades),
        permissions,
    };
}

export function canManageCRMConfiguration(user: CRMAuthUser) {
    if (!RBAC_ENABLED) {
        return user.role === "ADMIN" || user.role === "SOCIO" || user.role === "CONTROLADOR";
    }

    return CRM_MANAGE_CONFIGURATION_PERMISSIONS.some((permission) =>
        user.permissions.includes(permission),
    );
}

export function isUserScopedCRM(user: CRMAuthUser) {
    return user.role === "ADVOGADO";
}

export async function requireCRMAuth() {
    const user = await getCRMAuthUser();
    if (!user) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: "Nao autorizado." }, { status: 401 }),
        };
    }
    return { ok: true as const, user };
}
