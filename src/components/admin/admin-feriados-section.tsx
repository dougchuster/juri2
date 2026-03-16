"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FeriadoItem } from "@/components/admin/admin-panel-types";
import { formatDate } from "@/lib/utils";

interface AdminFeriadosSectionProps {
    feriados: FeriadoItem[];
    onCreate: () => void;
    onEdit: (feriado: FeriadoItem) => void;
    onDelete: (feriado: FeriadoItem) => void;
}

export function AdminFeriadosSection({
    feriados,
    onCreate,
    onEdit,
    onDelete,
}: AdminFeriadosSectionProps) {
    return (
        <div>
            <div className="mb-4 flex justify-end">
                <Button size="sm" onClick={onCreate}>
                    <Plus size={16} /> Novo feriado
                </Button>
            </div>
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                    <thead>
                        <tr className="border-b border-border bg-bg-tertiary/50">
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Nome</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Data</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Abrangencia</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">Recorrente</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {feriados.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-sm text-text-muted">
                                    Nenhum feriado cadastrado.
                                </td>
                            </tr>
                        ) : (
                            feriados.map((feriado) => (
                                <tr
                                    key={feriado.id}
                                    className="border-b border-border last:border-0 transition-colors hover:bg-bg-tertiary"
                                >
                                    <td className="px-4 py-3 text-sm text-text-primary">{feriado.nome}</td>
                                    <td className="px-4 py-3 text-sm font-mono text-text-primary">{formatDate(feriado.data)}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant="default">{feriado.abrangencia}</Badge>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-text-muted">{feriado.recorrente ? "Sim" : "Nao"}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="inline-flex items-center gap-1">
                                            <button
                                                onClick={() => onEdit(feriado)}
                                                className="rounded-lg p-1.5 text-text-muted transition-colors hover:text-accent"
                                                title="Editar feriado"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                onClick={() => onDelete(feriado)}
                                                className="rounded-lg p-1.5 text-text-muted transition-colors hover:text-danger"
                                                title="Excluir feriado"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
}
