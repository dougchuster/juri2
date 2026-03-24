import type { Role } from "@/generated/prisma";
import type { PermissionAction } from "@/lib/rbac/permissions";

export type PermissionKey = string;

export type PermissionSource = "global_template" | "escritorio_template" | "user_override";

export type EffectivePermissionEntry = {
    key: PermissionKey;
    source: PermissionSource;
    granted: boolean;
};

export type RoleTemplateSnapshot = {
    role: Role;
    permissionKeys: PermissionKey[];
    isCustomized: boolean;
};

export type PermissionMatrixResource = {
    module: string;
    moduleLabel: string;
    resource: string;
    resourceLabel: string;
    actions: PermissionAction[];
    keys: PermissionKey[];
};
