"use client";

import { createContext, useContext, useMemo } from "react";

type PermissionContextValue = {
    permissions: Set<string>;
    has: (permission: string) => boolean;
    hasAny: (permissions: string[]) => boolean;
    hasAll: (permissions: string[]) => boolean;
};

const PermissionContext = createContext<PermissionContextValue | null>(null);

type PermissionProviderProps = {
    permissions: string[];
    children: React.ReactNode;
};

export function PermissionProvider({ permissions, children }: PermissionProviderProps) {
    const permissionSet = useMemo(() => new Set(permissions), [permissions]);

    const value = useMemo<PermissionContextValue>(() => ({
        permissions: permissionSet,
        has: (permission) => permissionSet.has(permission),
        hasAny: (candidatePermissions) => candidatePermissions.some((permission) => permissionSet.has(permission)),
        hasAll: (candidatePermissions) => candidatePermissions.every((permission) => permissionSet.has(permission)),
    }), [permissionSet]);

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    );
}

export function usePermissions() {
    const context = useContext(PermissionContext);

    if (!context) {
        throw new Error("usePermissions must be used inside PermissionProvider.");
    }

    return context;
}

type PermissionGateProps = {
    permission: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
};

export function PermissionGate({
    permission,
    children,
    fallback = null,
}: PermissionGateProps) {
    const { has } = usePermissions();
    if (!has(permission)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
