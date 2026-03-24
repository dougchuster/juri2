"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@/generated/prisma";
import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { refreshCurrentPermissionCacheCookie, requirePermission } from "@/lib/rbac/check-permission";
import {
    DEFAULT_ROLE_TEMPLATE_KEYS,
    ROLE_ORDER,
    expandPermissionKeys,
    getPermissionResourcesByModule,
    isValidPermissionKey,
    RBAC_ENABLED,
} from "@/lib/rbac/permissions";
import {
    getRoleTemplatePermissions as getResolvedRoleTemplatePermissions,
    isRoleTemplateCustomized,
    resolveUserPermissions,
    resolveUserPermissionsWithSources,
} from "@/lib/rbac/resolve-permissions";

const roleTemplateSchema = z.object({
    role: z.enum(ROLE_ORDER),
    permissionKeys: z.array(z.string()),
});

const userOverrideSchema = z.object({
    userId: z.string().min(1),
    permissionKey: z.string().min(1),
    granted: z.boolean(),
    reason: z.string().max(300).optional(),
});

async function requirePermissionManager() {
    const session = await getSession();
    const escritorioId = session?.escritorioId;
    if (!session?.id || !escritorioId) {
        return { error: "Sessao invalida ou sem escritorio vinculado." };
    }

    const permissionResult = await requirePermission("admin:permissoes:gerenciar", {
        fallbackRoles: ["ADMIN"],
        errorMessage: "Voce nao tem permissao para gerenciar RBAC.",
    });

    if ("error" in permissionResult) {
        return { error: permissionResult.error };
    }

    return { session, escritorioId };
}

async function getPermissionIds(permissionKeys: string[]) {
    const permissions = await db.permission.findMany({
        where: {
            key: { in: permissionKeys },
        },
        select: {
            id: true,
            key: true,
        },
    });

    const permissionIdByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));
    const missingKeys = permissionKeys.filter((permissionKey) => !permissionIdByKey.has(permissionKey));

    return {
        permissionIdByKey,
        missingKeys,
    };
}

async function assertActorCanAssign(permissionKeys: string[]) {
    if (!RBAC_ENABLED) return { ok: true as const };

    const session = await getSession();
    if (!session) {
        return { ok: false as const, error: "Sessao invalida." };
    }

    const actorPermissions = await resolveUserPermissions({
        userId: session.id,
        role: session.role,
        escritorioId: session.escritorioId,
    });
    const actorPermissionSet = new Set(actorPermissions);
    const notAllowed = permissionKeys.filter((permissionKey) => !actorPermissionSet.has(permissionKey));

    if (notAllowed.length > 0) {
        return {
            ok: false as const,
            error: `Voce nao pode atribuir permissoes que nao possui: ${notAllowed.slice(0, 3).join(", ")}`,
        };
    }

    return { ok: true as const };
}

async function bumpUsersPermissionVersion(where: { role?: Role; id?: string; escritorioId: string }) {
    await db.user.updateMany({
        where,
        data: {
            permissionVersion: {
                increment: 1,
            },
        },
    });
}

function normalizeRequestedKeys(role: Role, permissionKeys: string[]) {
    const validKeys = permissionKeys.filter((permissionKey) => isValidPermissionKey(permissionKey));
    const normalized = expandPermissionKeys(validKeys);

    if (role === "ADMIN" && !normalized.includes("admin:permissoes:gerenciar")) {
        normalized.push("admin:permissoes:gerenciar");
    }

    return Array.from(new Set(normalized)).sort();
}

export async function updateRoleTemplate(role: Role, permissionKeys: string[]) {
    const parsed = roleTemplateSchema.safeParse({ role, permissionKeys });
    if (!parsed.success) {
        return { success: false as const, error: "Payload de template invalido." };
    }

    const auth = await requirePermissionManager();
    if ("error" in auth) {
        return { success: false as const, error: auth.error };
    }

    const normalizedKeys = normalizeRequestedKeys(role, parsed.data.permissionKeys);
    const actorCanAssign = await assertActorCanAssign(normalizedKeys);
    if (!actorCanAssign.ok) {
        return { success: false as const, error: actorCanAssign.error };
    }

    const { permissionIdByKey, missingKeys } = await getPermissionIds(normalizedKeys);
    if (missingKeys.length > 0) {
        return { success: false as const, error: `Permissoes nao encontradas no banco: ${missingKeys.slice(0, 3).join(", ")}` };
    }

    await db.$transaction(async (tx) => {
        await tx.rolePermission.deleteMany({
            where: {
                role,
                escritorioId: auth.escritorioId,
            },
        });

        if (normalizedKeys.length > 0) {
            await tx.rolePermission.createMany({
                data: normalizedKeys.map((permissionKey) => ({
                    role,
                    escritorioId: auth.escritorioId,
                    permissionId: permissionIdByKey.get(permissionKey)!,
                })),
            });
        }
    });

    await bumpUsersPermissionVersion({
        role,
        escritorioId: auth.escritorioId,
    });

    await refreshCurrentPermissionCacheCookie();
    revalidatePath("/admin/permissoes");
    revalidatePath("/");

    return { success: true as const };
}

export async function setUserPermissionOverride(
    userId: string,
    permissionKey: string,
    granted: boolean,
    reason?: string,
) {
    const parsed = userOverrideSchema.safeParse({ userId, permissionKey, granted, reason });
    if (!parsed.success || !isValidPermissionKey(permissionKey)) {
        return { success: false as const, error: "Override invalido." };
    }

    const auth = await requirePermissionManager();
    if ("error" in auth) {
        return { success: false as const, error: auth.error };
    }

    const targetUser = await db.user.findFirst({
        where: {
            id: userId,
            escritorioId: auth.escritorioId,
        },
        select: {
            id: true,
            role: true,
            escritorioId: true,
        },
    });

    if (!targetUser) {
        return { success: false as const, error: "Usuario nao encontrado neste escritorio." };
    }

    if (targetUser.role === "ADMIN" && permissionKey === "admin:permissoes:gerenciar" && !granted) {
        return { success: false as const, error: "Nao e permitido revogar o gerenciamento de permissoes do ADMIN." };
    }

    const actorCanAssign = await assertActorCanAssign(expandPermissionKeys([permissionKey]));
    if (!actorCanAssign.ok) {
        return { success: false as const, error: actorCanAssign.error };
    }

    const permission = await db.permission.findUnique({
        where: { key: permissionKey },
        select: { id: true },
    });

    if (!permission) {
        return { success: false as const, error: "Permissao nao encontrada." };
    }

    await db.userPermissionOverride.upsert({
        where: {
            userId_permissionId: {
                userId,
                permissionId: permission.id,
            },
        },
        update: {
            granted,
            reason: reason?.trim() || null,
            grantedBy: auth.session.id,
        },
        create: {
            userId,
            permissionId: permission.id,
            granted,
            reason: reason?.trim() || null,
            grantedBy: auth.session.id,
        },
    });

    await bumpUsersPermissionVersion({
        id: userId,
        escritorioId: auth.escritorioId,
    });

    await refreshCurrentPermissionCacheCookie();
    revalidatePath("/admin/permissoes");

    return { success: true as const };
}

export async function removeUserPermissionOverride(userId: string, permissionKey: string) {
    const auth = await requirePermissionManager();
    if ("error" in auth) {
        return { success: false as const, error: auth.error };
    }

    const targetUser = await db.user.findFirst({
        where: {
            id: userId,
            escritorioId: auth.escritorioId,
        },
        select: {
            id: true,
            role: true,
        },
    });

    if (!targetUser) {
        return { success: false as const, error: "Usuario nao encontrado neste escritorio." };
    }

    if (targetUser.role === "ADMIN" && permissionKey === "admin:permissoes:gerenciar") {
        return { success: false as const, error: "Nao e permitido remover esta protecao do ADMIN." };
    }

    const permission = await db.permission.findUnique({
        where: { key: permissionKey },
        select: { id: true },
    });

    if (!permission) {
        return { success: false as const, error: "Permissao nao encontrada." };
    }

    await db.userPermissionOverride.deleteMany({
        where: {
            userId,
            permissionId: permission.id,
        },
    });

    await bumpUsersPermissionVersion({
        id: userId,
        escritorioId: auth.escritorioId,
    });

    await refreshCurrentPermissionCacheCookie();
    revalidatePath("/admin/permissoes");

    return { success: true as const };
}

export async function getUserEffectivePermissions(userId: string) {
    const auth = await requirePermissionManager();
    if ("error" in auth) {
        return { permissions: [], error: auth.error };
    }

    const user = await db.user.findFirst({
        where: {
            id: userId,
            escritorioId: auth.escritorioId,
        },
        select: {
            id: true,
            role: true,
            escritorioId: true,
        },
    });

    if (!user) {
        return { permissions: [], error: "Usuario nao encontrado." };
    }

    const permissions = await resolveUserPermissionsWithSources({
        userId: user.id,
        role: user.role,
        escritorioId: user.escritorioId,
    });

    return { permissions };
}

export async function getRoleTemplatePermissions(role: Role) {
    const auth = await requirePermissionManager();
    if ("error" in auth) {
        return [];
    }

    return getResolvedRoleTemplatePermissions(role, auth.escritorioId);
}

export async function getRoleTemplateSnapshots() {
    const auth = await requirePermissionManager();
    if ("error" in auth) {
        return [];
    }

    return Promise.all(
        ROLE_ORDER.map(async (role) => ({
            role,
            permissionKeys: await getResolvedRoleTemplatePermissions(role, auth.escritorioId),
            isCustomized: await isRoleTemplateCustomized(role, auth.escritorioId),
        })),
    );
}

export async function listUsersForPermissions() {
    const auth = await requirePermissionManager();
    if ("error" in auth) {
        return [];
    }

    const users = await db.user.findMany({
        where: {
            escritorioId: auth.escritorioId,
        },
        orderBy: [
            { role: "asc" },
            { name: "asc" },
        ],
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            _count: {
                select: {
                    permissionOverrides: true,
                },
            },
        },
    });

    return users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        overrideCount: user._count.permissionOverrides,
    }));
}

export async function getPermissionCatalog() {
    const auth = await requirePermissionManager();
    if ("error" in auth) {
        return [];
    }

    return getPermissionResourcesByModule();
}

export async function resetRoleTemplate(role: Role) {
    return updateRoleTemplate(role, DEFAULT_ROLE_TEMPLATE_KEYS[role] ?? []);
}
