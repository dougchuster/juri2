"use client";

import { useMemo, useState, useTransition } from "react";
import type { Role } from "@/generated/prisma";
import { resetRoleTemplate, updateRoleTemplate } from "@/actions/permissoes";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form-fields";
import { PermissionMatrix } from "@/components/admin/permissoes/permission-matrix";
import { DEFAULT_ROLE_TEMPLATE_KEYS, ROLE_LABELS, ROLE_ORDER } from "@/lib/rbac/permissions";

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

type RoleTemplateEditorProps = {
    sections: PermissionMatrixSection[];
    templates: RoleTemplateSnapshot[];
    onTemplatesChange: (templates: RoleTemplateSnapshot[]) => void;
    onStatusChange: (message: { type: "success" | "error"; text: string } | null) => void;
};

export function RoleTemplateEditor({
    sections,
    templates,
    onTemplatesChange,
    onStatusChange,
}: RoleTemplateEditorProps) {
    const [selectedRole, setSelectedRole] = useState<Role>("ADMIN");
    const [draftTemplates, setDraftTemplates] = useState<Record<Role, string[]>>(
        () =>
            Object.fromEntries(
                templates.map((template) => [template.role, [...template.permissionKeys].sort()]),
            ) as Record<Role, string[]>,
    );
    const [isPending, startTransition] = useTransition();

    const selectedTemplate = useMemo(
        () => templates.find((template) => template.role === selectedRole) ?? null,
        [selectedRole, templates],
    );

    const selectedKeys = useMemo(
        () => new Set(draftTemplates[selectedRole] ?? selectedTemplate?.permissionKeys ?? []),
        [draftTemplates, selectedRole, selectedTemplate],
    );

    function handleToggle(resourceKeys: string[], key: string, checked: boolean) {
        setDraftTemplates((current) => {
            const next = new Set(current[selectedRole] ?? selectedTemplate?.permissionKeys ?? []);
            const isManageKey = key.endsWith(":gerenciar");

            if (checked) {
                if (isManageKey) {
                    resourceKeys.forEach((resourceKey) => next.add(resourceKey));
                } else {
                    next.add(key);
                }
                return { ...current, [selectedRole]: Array.from(next).sort() };
            }

            if (isManageKey) {
                resourceKeys.forEach((resourceKey) => next.delete(resourceKey));
                return { ...current, [selectedRole]: Array.from(next).sort() };
            }

            next.delete(key);
            const manageKey = resourceKeys.find((resourceKey) => resourceKey.endsWith(":gerenciar"));
            if (manageKey) {
                next.delete(manageKey);
            }
            return { ...current, [selectedRole]: Array.from(next).sort() };
        });
    }

    function refreshTemplate(role: Role, permissionKeys: string[], isCustomized: boolean) {
        const normalizedKeys = [...permissionKeys].sort();
        setDraftTemplates((current) => ({
            ...current,
            [role]: normalizedKeys,
        }));
        onTemplatesChange(
            templates.map((template) =>
                template.role === role
                    ? { ...template, permissionKeys: normalizedKeys, isCustomized }
                    : template,
            ),
        );
    }

    function handleSave() {
        onStatusChange(null);
        startTransition(async () => {
            const result = await updateRoleTemplate(selectedRole, [...selectedKeys]);
            if (!result.success) {
                onStatusChange({ type: "error", text: result.error ?? "Nao foi possivel salvar o template." });
                return;
            }

            refreshTemplate(selectedRole, [...selectedKeys], true);
            onStatusChange({ type: "success", text: "Template atualizado com sucesso." });
        });
    }

    function handleReset() {
        onStatusChange(null);
        startTransition(async () => {
            const result = await resetRoleTemplate(selectedRole);
            if (!result.success) {
                onStatusChange({ type: "error", text: result.error ?? "Nao foi possivel restaurar o template." });
                return;
            }

            const defaultKeys = DEFAULT_ROLE_TEMPLATE_KEYS[selectedRole] ?? [];
            refreshTemplate(selectedRole, defaultKeys, false);
            onStatusChange({ type: "success", text: "Template restaurado para o padrao global." });
        });
    }

    return (
        <div className="space-y-5">
            <div className="glass-card border border-border/70 p-5">
                <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_1fr] md:items-end">
                    <Select
                        label="Role"
                        value={selectedRole}
                        onChange={(event) => setSelectedRole(event.target.value as Role)}
                        options={ROLE_ORDER.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-border/60 bg-bg-tertiary/30 px-4 py-3">
                        <div>
                            <p className="text-sm font-medium text-text-primary">
                                {selectedTemplate?.isCustomized ? "Template customizado por escritorio" : "Template global padrao"}
                            </p>
                            <p className="text-xs text-text-muted">
                                {selectedKeys.size} permissoes marcadas para {ROLE_LABELS[selectedRole]}.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleReset}>
                                Restaurar padrao
                            </Button>
                            <Button type="button" size="sm" disabled={isPending} onClick={handleSave}>
                                {isPending ? "Salvando..." : "Salvar template"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <PermissionMatrix
                sections={sections}
                selectedKeys={selectedKeys}
                disabled={isPending}
                onToggle={handleToggle}
            />
        </div>
    );
}
