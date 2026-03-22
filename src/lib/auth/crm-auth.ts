import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma";
import { getUserOrganizationMappings, resolveUserOrganization } from "@/lib/root-admin/user-organization";

const CRM_ALLOWED_ROLES = new Set<Role>([
    "ADMIN",
    "SOCIO",
    "ADVOGADO",
    "CONTROLADOR",
    "ASSISTENTE",
    "SECRETARIA",
]);

export type CRMAuthUser = {
    id: string;
    role: Role;
    isActive: boolean;
    escritorioId: string | null;
    advogadoId: string | null;
    teamIds: string[];
    teamNames: string[];
    crmAreas: string[];
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
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token) return null;

    const session = await db.session.findUnique({
        where: { token },
        select: {
            expiresAt: true,
            user: {
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
            },
        },
    });

    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
        return null;
    }

    if (!CRM_ALLOWED_ROLES.has(session.user.role)) {
        return null;
    }

    const [escritorios, mappings] = await Promise.all([
        db.escritorio.findMany({ select: { id: true, nome: true, email: true, slug: true } }),
        getUserOrganizationMappings(),
    ]);

    const resolved = resolveUserOrganization(
        { id: session.user.id, email: session.user.email },
        escritorios,
        mappings
    );

    return {
        id: session.user.id,
        role: session.user.role,
        isActive: session.user.isActive,
        escritorioId: resolved?.id || null,
        advogadoId: session.user.advogado?.id || null,
        teamIds: (session.user.advogado?.timeMembros || []).map((item) => item.time.id),
        teamNames: (session.user.advogado?.timeMembros || []).map((item) => item.time.nome),
        crmAreas: parseCRMUserAreas(session.user.advogado?.especialidades),
    };
}

export function canManageCRMConfiguration(user: CRMAuthUser) {
    return user.role === "ADMIN" || user.role === "SOCIO" || user.role === "CONTROLADOR";
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
