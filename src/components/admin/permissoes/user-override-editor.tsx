"use client";

import { useMemo, useState, useTransition } from "react";
import { getUserEffectivePermissions, removeUserPermissionOverride, setUserPermissionOverride } from "@/actions/permissoes";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { PermissionMatrix } from "@/components/admin/permissoes/permission-matrix";
import { ROLE_LABELS } from "@/lib/rbac/permissions";

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

type UserPermissionItem = {
    key: string;
    source: "global_template" | "escritorio_template" | "user_override";
    granted: boolean;
};

type PermissionUser = {
    id: string;
    name: string;
    email: string;
    role: keyof typeof ROLE_LABELS;
    overrideCount: number;
};

type UserOverrideEditorProps = {
    sections: PermissionMatrixSection[];
    users: PermissionUser[];
    initialUserId: string;
    initialPermissions: UserPermissionItem[];
    onStatusChange: (message: { type: "success" | "error"; text: string } | null) => void;
};

export function UserOverrideEditor({
    sections,
    users,
    initialUserId,
    initialPermissions,
    onStatusChange,
}: UserOverrideEditorProps) {
    const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId);
    const [permissions, setPermissions] = useState<UserPermissionItem[]>(initialPermissions);
    const [reason, setReason] = useState("");
    const [manualPermissionKey, setManualPermissionKey] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isPending, startTransition] = useTransition();

    const selectedUser = useMemo(
        () => users.find((user) => user.id === selectedUserId) ?? null,
        [selectedUserId, users],
    );

    const selectedKeys = useMemo(
        () => new Set(permissions.filter((permission) => permission.granted).map((permission) => permission.key)),
        [permissions],
    );

    const overrideEntries = useMemo(
        () => permissions.filter((permission) => permission.source === "user_override"),
        [permissions],
    );

    const allPermissionOptions = useMemo(
        () => sections.flatMap((section) =>
            section.resources.flatMap((resource) =>
                resource.keys.map((key) => ({
                    value: key,
                    label: `${resource.resourceLabel} - ${key.split(":").at(-1) ?? key}`,
                })),
            ),
        ),
        [sections],
    );

    async function loadPermissions(userId: string) {
        if (!userId) {
            setPermissions([]);
            return;
        }

        setIsLoading(true);
        const result = await getUserEffectivePermissions(userId);
        setPermissions(result.permissions);
        setIsLoading(false);
    }

    async function handleUserSelection(nextUserId: string) {
        setSelectedUserId(nextUserId);
        onStatusChange(null);
        await loadPermissions(nextUserId);
    }

    function handleMatrixToggle(_resourceKeys: string[], key: string, checked: boolean) {
        if (!selectedUserId) return;

        onStatusChange(null);
        startTransition(async () => {
            const result = await setUserPermissionOverride(
                selectedUserId,
                key,
                checked,
                reason.trim() || "Ajuste via matriz de permissoes",
            );

            if (!result.success) {
                onStatusChange({ type: "error", text: result.error ?? "Nao foi possivel salvar o override." });
                return;
            }

            await loadPermissions(selectedUserId);
            onStatusChange({ type: "success", text: "Override salvo com sucesso." });
        });
    }

    function handleManualGrant(granted: boolean) {
        if (!selectedUserId || !manualPermissionKey) return;

        onStatusChange(null);
        startTransition(async () => {
            const result = await setUserPermissionOverride(
                selectedUserId,
                manualPermissionKey,
                granted,
                reason.trim() || "Ajuste manual de permissao",
            );

            if (!result.success) {
                onStatusChange({ type: "error", text: result.error ?? "Nao foi possivel aplicar o override." });
                return;
            }

            setManualPermissionKey("");
            setReason("");
            await loadPermissions(selectedUserId);
            onStatusChange({ type: "success", text: "Override aplicado." });
        });
    }

    function handleRemoveOverride(permissionKey: string) {
        if (!selectedUserId) return;

        onStatusChange(null);
        startTransition(async () => {
            const result = await removeUserPermissionOverride(selectedUserId, permissionKey);
            if (!result.success) {
                onStatusChange({ type: "error", text: result.error ?? "Nao foi possivel remover o override." });
                return;
            }

            await loadPermissions(selectedUserId);
            onStatusChange({ type: "success", text: "Override removido. O usuario voltou ao template." });
        });
    }

    return (
        <div className="space-y-5">
            <div className="glass-card border border-border/70 p-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                    <div className="space-y-4">
                        <Select
                            label="Usuario"
                            value={selectedUserId}
                            onChange={(event) => {
                                void handleUserSelection(event.target.value);
                            }}
                            options={users.map((user) => ({
                                value: user.id,
                                label: `${user.name} (${ROLE_LABELS[user.role]})`,
                            }))}
                        />

                        {selectedUser ? (
                            <div className="rounded-[22px] border border-border/60 bg-bg-tertiary/30 p-4">
                                <p className="text-sm font-semibold text-text-primary">{selectedUser.name}</p>
                                <p className="text-xs text-text-muted">{selectedUser.email}</p>
                                <p className="mt-2 text-xs text-text-muted">
                                    Role base: {ROLE_LABELS[selectedUser.role]} · overrides atuais: {overrideEntries.length}
                                </p>
                            </div>
                        ) : null}
                    </div>

                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                            <Select
                                label="Permissao manual"
                                value={manualPermissionKey}
                                onChange={(event) => setManualPermissionKey(event.target.value)}
                                options={allPermissionOptions}
                                placeholder="Selecione uma permissao"
                            />
                            <div className="flex items-end gap-2">
                                <Button type="button" variant="outline" size="sm" disabled={isPending || !manualPermissionKey} onClick={() => handleManualGrant(false)}>
                                    Revogar
                                </Button>
                                <Button type="button" size="sm" disabled={isPending || !manualPermissionKey} onClick={() => handleManualGrant(true)}>
                                    Conceder
                                </Button>
                            </div>
                        </div>

                        <Textarea
                            label="Motivo"
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder="Opcional. Ex.: acesso temporario ao modulo financeiro."
                            rows={3}
                        />
                    </div>
                </div>
            </div>

            <div className="glass-card border border-border/70 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-text-primary">Overrides explicitos</p>
                        <p className="text-xs text-text-muted">
                            Remova um override para voltar ao template da role.
                        </p>
                    </div>
                    <Input
                        value={String(overrideEntries.length)}
                        readOnly
                        className="max-w-[92px] text-center font-semibold"
                    />
                </div>

                <div className="mt-4 space-y-2">
                    {overrideEntries.length > 0 ? overrideEntries.map((permission) => (
                        <div key={permission.key} className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border/60 bg-bg-tertiary/20 px-4 py-3">
                            <div>
                                <p className="font-medium text-text-primary">{permission.key}</p>
                                <p className="text-xs text-text-muted">
                                    {permission.granted ? "Concedido individualmente" : "Revogado individualmente"}
                                </p>
                            </div>
                            <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => handleRemoveOverride(permission.key)}>
                                Remover override
                            </Button>
                        </div>
                    )) : (
                        <div className="rounded-[18px] border border-dashed border-border/60 px-4 py-5 text-sm text-text-muted">
                            Nenhum override individual para este usuario.
                        </div>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="glass-card border border-border/70 p-6 text-sm text-text-muted">
                    Carregando permissoes efetivas...
                </div>
            ) : (
                <PermissionMatrix
                    sections={sections}
                    selectedKeys={selectedKeys}
                    disabled={isPending}
                    onToggle={handleMatrixToggle}
                />
            )}
        </div>
    );
}
