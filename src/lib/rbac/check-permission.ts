"use server";

import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma";
import { getSession } from "@/actions/auth";
import { encodePermissionCache, PERMISSION_CACHE_COOKIE_NAME } from "@/lib/rbac/permission-cache";
import {
    getNavigationPermissionKeys,
    RBAC_ENABLED,
} from "@/lib/rbac/permissions";
import { resolveUserPermissions } from "@/lib/rbac/resolve-permissions";

type RequirePermissionOptions = {
    fallbackRoles?: Role[];
    errorMessage?: string;
};

export const getCurrentPermissions = cache(async () => {
    const session = await getSession();
    if (!session) return new Set<string>();

    const permissions = await resolveUserPermissions({
        userId: session.id,
        role: session.role,
        escritorioId: session.escritorioId,
    });

    return permissions;
});

export async function getCurrentNavigationPermissions() {
    return getNavigationPermissionKeys(await getCurrentPermissions());
}

export async function hasPermission(permissionKey: string) {
    if (!RBAC_ENABLED) return true;
    const permissions = await getCurrentPermissions();
    return permissions.has(permissionKey);
}

export async function hasAnyPermission(permissionKeys: string[]) {
    if (!RBAC_ENABLED) return true;
    const permissions = await getCurrentPermissions();
    return permissionKeys.some((permissionKey) => permissions.has(permissionKey));
}

export async function hasRoleOrPermission(
    fallbackRoles: Role[],
    permissionKey: string,
) {
    const session = await getSession();
    if (!session) return false;

    if (fallbackRoles.includes(session.role)) {
        return true;
    }

    return hasPermission(permissionKey);
}

export async function requirePermission(
    permissionKey: string,
    options: RequirePermissionOptions = {},
) {
    const session = await getSession();
    if (!session) {
        return {
            error: options.errorMessage ?? "Voce precisa estar autenticado para executar esta acao.",
        };
    }

    if (options.fallbackRoles?.includes(session.role)) {
        return {};
    }

    if (!RBAC_ENABLED) {
        return {};
    }

    const allowed = await hasPermission(permissionKey);
    if (allowed) {
        return {};
    }

    return {
        error: options.errorMessage ?? "Voce nao tem permissao para esta acao.",
    };
}

export async function requirePermissionOrRedirect(
    permissionKey: string,
    options: RequirePermissionOptions = {},
) {
    const session = await getSession();
    if (!session) {
        redirect("/login");
    }

    if (options.fallbackRoles?.includes(session.role)) {
        return;
    }

    if (!RBAC_ENABLED) {
        return;
    }

    const allowed = await hasPermission(permissionKey);
    if (!allowed) {
        redirect("/dashboard?erro=sem-permissao");
    }
}

export async function refreshCurrentPermissionCacheCookie() {
    const session = await getSession();
    const cookieStore = await cookies();

    if (!session || !RBAC_ENABLED) {
        cookieStore.delete(PERMISSION_CACHE_COOKIE_NAME);
        return;
    }

    const navigationPermissions = await getCurrentNavigationPermissions();
    const encoded = encodePermissionCache({
        permissions: navigationPermissions,
        version: session.permissionVersion,
    });

    if (!encoded) {
        cookieStore.delete(PERMISSION_CACHE_COOKIE_NAME);
        return;
    }

    cookieStore.set(PERMISSION_CACHE_COOKIE_NAME, encoded, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 12,
    });
}
