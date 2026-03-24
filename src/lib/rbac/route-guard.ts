"use server";

import "server-only";

import { headers } from "next/headers";
import { requirePermissionOrRedirect } from "@/lib/rbac/check-permission";
import { getRequiredPermissionForPath, RBAC_ENABLED } from "@/lib/rbac/permissions";

export async function guardPage(requiredPermission: string) {
    if (!RBAC_ENABLED) return;
    await requirePermissionOrRedirect(requiredPermission);
}

export async function guardCurrentDashboardRoute() {
    if (!RBAC_ENABLED) return;

    const headerStore = await headers();
    const pathname = headerStore.get("x-rbac-pathname");
    if (!pathname) return;

    const requiredPermission = getRequiredPermissionForPath(pathname);
    if (!requiredPermission) return;

    await requirePermissionOrRedirect(requiredPermission);
}
