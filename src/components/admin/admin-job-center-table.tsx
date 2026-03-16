"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
    formatJobCenterDate,
    formatJobCenterSourceTypeLabel,
    JobCenterStatusBadge,
} from "@/components/admin/admin-jobs-center-shared";
import { Button } from "@/components/ui/button";
import type { JobCenterListItem } from "@/lib/services/job-center-core";

export function AdminJobCenterTable({ items }: { items: readonly JobCenterListItem[] }) {
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

    const allKeys = useMemo(
        () => items.map((item) => `${item.sourceType}:${item.id}`),
        [items]
    );
    const allSelected = items.length > 0 && selectedKeys.length === items.length;

    function toggleItem(key: string) {
        setSelectedKeys((current) =>
            current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
        );
    }

    function toggleAll() {
        setSelectedKeys((current) => (current.length === items.length ? [] : allKeys));
    }

    return (
        <section className="overflow-hidden rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)]">
            <div className="flex flex-col gap-3 border-b border-[var(--card-border)] px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Fila operacional
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Selecao pronta para acoes em lote futuras. Nesta etapa, a operacao em massa ainda permanece bloqueada.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                        {selectedKeys.length} selecionado(s)
                    </span>
                    <Button type="button" variant="outline" size="sm" disabled>
                        Reprocessar em lote em breve
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled>
                        Cancelar em lote em breve
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--card-border)] text-sm">
                    <thead className="bg-[var(--surface-soft)] text-left text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        <tr>
                            <th className="px-5 py-4 font-semibold">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleAll}
                                    aria-label="Selecionar todos os jobs visiveis"
                                    className="h-4 w-4 rounded border border-[var(--card-border)] bg-[var(--surface-elevated)]"
                                />
                            </th>
                            <th className="px-5 py-4 font-semibold">Item</th>
                            <th className="px-5 py-4 font-semibold">Origem</th>
                            <th className="px-5 py-4 font-semibold">Status</th>
                            <th className="px-5 py-4 font-semibold">Responsavel</th>
                            <th className="px-5 py-4 font-semibold">Criado em</th>
                            <th className="px-5 py-4 font-semibold">Erro</th>
                            <th className="px-5 py-4 font-semibold">Acao</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--card-border)]">
                        {items.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-5 py-12 text-center text-sm text-[var(--text-secondary)]"
                                >
                                    Nenhum job encontrado com os filtros atuais.
                                </td>
                            </tr>
                        ) : (
                            items.map((item) => {
                                const key = `${item.sourceType}:${item.id}`;
                                const isSelected = selectedKeys.includes(key);

                                return (
                                    <tr
                                        key={key}
                                        className={isSelected ? "bg-[var(--surface-soft)]/60 align-top" : "align-top"}
                                    >
                                        <td className="px-5 py-4">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleItem(key)}
                                                aria-label={`Selecionar ${item.title}`}
                                                className="h-4 w-4 rounded border border-[var(--card-border)] bg-[var(--surface-elevated)]"
                                            />
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="space-y-1">
                                                <p className="font-semibold text-[var(--text-primary)]">{item.title}</p>
                                                <p className="text-xs text-[var(--text-secondary)]">{item.subtitle || item.id}</p>
                                                <p className="text-[11px] text-[var(--text-secondary)]">{item.id}</p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-[var(--text-secondary)]">
                                            {formatJobCenterSourceTypeLabel(item.sourceType)}
                                        </td>
                                        <td className="px-5 py-4">
                                            <JobCenterStatusBadge status={item.status} />
                                        </td>
                                        <td className="px-5 py-4 text-[var(--text-secondary)]">
                                            {item.ownerLabel || "-"}
                                        </td>
                                        <td className="px-5 py-4 text-[var(--text-secondary)]">
                                            {formatJobCenterDate(item.createdAt)}
                                        </td>
                                        <td className="max-w-sm px-5 py-4 text-[var(--text-secondary)]">
                                            <span className="line-clamp-2">{item.errorSummary || "-"}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <Link
                                                href={item.href}
                                                className="text-sm font-semibold text-[var(--accent)] transition hover:opacity-80"
                                            >
                                                Ver detalhe
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
