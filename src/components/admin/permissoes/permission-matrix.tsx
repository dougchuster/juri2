"use client";

import { cn } from "@/lib/utils";

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

type PermissionMatrixProps = {
    sections: PermissionMatrixSection[];
    selectedKeys: Set<string>;
    disabled?: boolean;
    onToggle: (resourceKeys: string[], key: string, checked: boolean) => void;
};

const ACTION_LABELS: Record<string, string> = {
    ver: "Ver",
    criar: "Criar",
    editar: "Editar",
    excluir: "Excluir",
    exportar: "Exportar",
    gerenciar: "Gerenciar",
};

export function PermissionMatrix({
    sections,
    selectedKeys,
    disabled = false,
    onToggle,
}: PermissionMatrixProps) {
    return (
        <div className="space-y-6">
            {sections.map((section) => (
                <section key={section.module} className="glass-card overflow-hidden border border-border/70">
                    <div className="border-b border-border/70 px-5 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                            Modulo
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-text-primary">
                            {section.moduleLabel}
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-bg-tertiary/40 text-left text-xs uppercase tracking-[0.18em] text-text-muted">
                                <tr>
                                    <th className="px-5 py-3">Recurso</th>
                                    {Object.entries(ACTION_LABELS).map(([action, label]) => (
                                        <th key={action} className="px-3 py-3 text-center">{label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {section.resources.map((resource) => (
                                    <tr key={`${resource.module}:${resource.resource}`} className="border-t border-border/50">
                                        <td className="px-5 py-3">
                                            <div className="font-medium text-text-primary">{resource.resourceLabel}</div>
                                            <div className="text-xs text-text-muted">{resource.module}:{resource.resource}</div>
                                        </td>
                                        {Object.keys(ACTION_LABELS).map((action) => {
                                            const key = `${resource.module}:${resource.resource}:${action}`;
                                            const available = resource.actions.includes(action);
                                            const checked = selectedKeys.has(key);

                                            return (
                                                <td key={key} className="px-3 py-3 text-center">
                                                    {available ? (
                                                        <label className="inline-flex items-center justify-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                disabled={disabled}
                                                                onChange={(event) =>
                                                                    onToggle(resource.keys, key, event.target.checked)
                                                                }
                                                                className={cn(
                                                                    "h-4 w-4 rounded border-border bg-bg-primary",
                                                                    "text-accent focus:ring-accent/30",
                                                                )}
                                                            />
                                                        </label>
                                                    ) : (
                                                        <span className="text-text-muted">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ))}
        </div>
    );
}
