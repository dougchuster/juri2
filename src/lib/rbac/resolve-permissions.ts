"use server";

import "server-only";

import type { Role } from "@/generated/prisma";
import { db } from "@/lib/db";
import {
    DEFAULT_ROLE_TEMPLATE_KEYS,
    expandPermissionKeys,
    getNavigationPermissionKeys,
} from "@/lib/rbac/permissions";
import type { EffectivePermissionEntry, PermissionKey, PermissionSource } from "@/lib/rbac/types";

type ResolvePermissionsInput = {
    userId: string;
    role: Role;
    escritorioId?: string | null;
};

type RoleTemplateResolution = {
    keys: PermissionKey[];
    source: Extract<PermissionSource, "global_template" | "escritorio_template">;
    isCustomized: boolean;
};

async function resolveRoleTemplate({
    role,
    escritorioId,
}: {
    role: Role;
    escritorioId?: string | null;
}): Promise<RoleTemplateResolution> {
    const templates = await db.rolePermission.findMany({
        where: {
            role,
            OR: [
                { escritorioId: null },
                ...(escritorioId ? [{ escritorioId }] : []),
            ],
        },
        include: {
            permission: {
                select: {
                    key: true,
                },
            },
        },
    });

    const escritorioTemplateKeys = escritorioId
        ? templates
            .filter((entry) => entry.escritorioId === escritorioId)
            .map((entry) => entry.permission.key)
        : [];

    if (escritorioTemplateKeys.length > 0) {
        return {
            keys: expandPermissionKeys(escritorioTemplateKeys),
            source: "escritorio_template",
            isCustomized: true,
        };
    }

    const globalTemplateKeys = templates
        .filter((entry) => entry.escritorioId === null)
        .map((entry) => entry.permission.key);

    const fallbackKeys = globalTemplateKeys.length > 0
        ? globalTemplateKeys
        : DEFAULT_ROLE_TEMPLATE_KEYS[role] ?? [];

    return {
        keys: expandPermissionKeys(fallbackKeys),
        source: "global_template",
        isCustomized: false,
    };
}

export async function resolveUserPermissions({
    userId,
    role,
    escritorioId,
}: ResolvePermissionsInput) {
    const template = await resolveRoleTemplate({ role, escritorioId });
    const permissions = new Set(template.keys);

    const overrides = await db.userPermissionOverride.findMany({
        where: { userId },
        include: {
            permission: {
                select: {
                    key: true,
                },
            },
        },
    });

    for (const override of overrides) {
        const overrideKeys = expandPermissionKeys([override.permission.key]);

        if (override.granted) {
            for (const key of overrideKeys) {
                permissions.add(key);
            }
        } else {
            for (const key of overrideKeys) {
                permissions.delete(key);
            }
        }
    }

    return permissions;
}

export async function resolveUserPermissionsWithSources({
    userId,
    role,
    escritorioId,
}: ResolvePermissionsInput) {
    const template = await resolveRoleTemplate({ role, escritorioId });
    const entries = new Map<PermissionKey, EffectivePermissionEntry>();

    for (const key of template.keys) {
        entries.set(key, {
            key,
            source: template.source,
            granted: true,
        });
    }

    const overrides = await db.userPermissionOverride.findMany({
        where: { userId },
        include: {
            permission: {
                select: {
                    key: true,
                },
            },
        },
        orderBy: {
            updatedAt: "desc",
        },
    });

    for (const override of overrides) {
        const overrideKeys = expandPermissionKeys([override.permission.key]);
        for (const key of overrideKeys) {
            entries.set(key, {
                key,
                source: "user_override",
                granted: override.granted,
            });
        }
    }

    return Array.from(entries.values()).sort((left, right) => left.key.localeCompare(right.key));
}

export async function getRoleTemplatePermissions(role: Role, escritorioId?: string | null) {
    const template = await resolveRoleTemplate({ role, escritorioId });
    return template.keys;
}

export async function getRoleTemplateNavigationPermissions(role: Role, escritorioId?: string | null) {
    const keys = await getRoleTemplatePermissions(role, escritorioId);
    return getNavigationPermissionKeys(keys);
}

export async function isRoleTemplateCustomized(role: Role, escritorioId?: string | null) {
    const template = await resolveRoleTemplate({ role, escritorioId });
    return template.isCustomized;
}
