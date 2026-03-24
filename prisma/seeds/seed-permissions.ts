import type { PrismaClient } from "../../src/generated/prisma";
import {
    DEFAULT_ROLE_TEMPLATE_KEYS,
    PERMISSION_DEFINITIONS,
    ROLE_ORDER,
} from "../../src/lib/rbac/permissions";

export async function seedPermissions(prisma: PrismaClient) {
    await prisma.permission.createMany({
        data: PERMISSION_DEFINITIONS.map((permission) => ({
            key: permission.key,
            module: permission.module,
            resource: permission.resource,
            action: permission.action,
            description: permission.description,
        })),
        skipDuplicates: true,
    });

    const persistedPermissions = await prisma.permission.findMany({
        select: {
            id: true,
            key: true,
        },
    });

    const permissionIdByKey = new Map(
        persistedPermissions.map((permission) => [permission.key, permission.id]),
    );

    for (const role of ROLE_ORDER) {
        await prisma.rolePermission.deleteMany({
            where: {
                role,
                escritorioId: null,
            },
        });

        const permissionKeys = DEFAULT_ROLE_TEMPLATE_KEYS[role] ?? [];
        if (permissionKeys.length === 0) {
            continue;
        }

        await prisma.rolePermission.createMany({
            data: permissionKeys
                .map((permissionKey) => permissionIdByKey.get(permissionKey))
                .filter((permissionId): permissionId is string => Boolean(permissionId))
                .map((permissionId) => ({
                    role,
                    permissionId,
                    escritorioId: null,
                })),
            skipDuplicates: true,
        });
    }
}
