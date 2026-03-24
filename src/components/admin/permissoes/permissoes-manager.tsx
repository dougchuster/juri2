"use client";

import { useState } from "react";
import type { Role } from "@/generated/prisma";
import { RoleTemplateEditor } from "@/components/admin/permissoes/role-template-editor";
import { UserOverrideEditor } from "@/components/admin/permissoes/user-override-editor";
import { cn } from "@/lib/utils";

type RoleTemplateSnapshot = {
    role: Role;
    permissionKeys: string[];
    isCustomized: boolean;
};

type PermissionMatrixSection = {
    module: string;
    moduleLabel: string;
    resources: Array<{
        module: string;
        moduleLabel: string;
        resource: string;
        resourceLabel: string;
        actions: string[];
        keys: string[];
    }>;
};

type PermissionUser = {
    id: string;
    name: string;
    email: string;
    role: Role;
    overrideCount: number;
};

type UserPermissionItem = {
    key: string;
    source: "global_template" | "escritorio_template" | "user_override";
    granted: boolean;
};

type PermissionsManagerProps = {
    sections: PermissionMatrixSection[];
    templates: RoleTemplateSnapshot[];
    users: PermissionUser[];
    initialUserId: string;
    initialUserPermissions: UserPermissionItem[];
};

type StatusMessage = {
    type: "success" | "error";
    text: string;
} | null;

const TABS = [
    { id: "templates", label: "Templates por role" },
    { id: "usuarios", label: "Overrides por usuario" },
] as const;

export function PermissoesManager({
    sections,
    templates: initialTemplates,
    users,
    initialUserId,
    initialUserPermissions,
}: PermissionsManagerProps) {
    const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("templates");
    const [templates, setTemplates] = useState<RoleTemplateSnapshot[]>(initialTemplates);
    const [status, setStatus] = useState<StatusMessage>(null);

    return (
        <div className="space-y-6">
            {status ? (
                <div
                    className={cn(
                        "rounded-[22px] border px-4 py-3 text-sm",
                        status.type === "success"
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-danger/30 bg-danger/10 text-danger",
                    )}
                >
                    {status.text}
                </div>
            ) : null}

            <div className="glass-card flex flex-wrap gap-2 border border-border/70 p-3">
                {TABS.map((tab) => {
                    const active = tab.id === activeTab;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                setStatus(null);
                                setActiveTab(tab.id);
                            }}
                            className={cn(
                                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                                active
                                    ? "bg-accent text-white"
                                    : "bg-bg-tertiary/30 text-text-muted hover:bg-bg-tertiary/60 hover:text-text-primary",
                            )}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeTab === "templates" ? (
                <RoleTemplateEditor
                    sections={sections}
                    templates={templates}
                    onTemplatesChange={setTemplates}
                    onStatusChange={setStatus}
                />
            ) : (
                <UserOverrideEditor
                    sections={sections}
                    users={users}
                    initialUserId={initialUserId}
                    initialPermissions={initialUserPermissions}
                    onStatusChange={setStatus}
                />
            )}
        </div>
    );
}
