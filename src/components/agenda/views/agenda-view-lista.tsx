"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AgendamentoCard, type AgendamentoCardData } from "@/components/agenda/agendamento-card";
import { getDayDiff } from "@/components/agenda/agendamento-meta";

interface Props {
    items: AgendamentoCardData[];
    canConferir: boolean;
    onEdit: (id: string) => void;
}

export function AgendaViewLista({ items, canConferir, onEdit }: Props) {
    const grouped = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const map = new Map<string, AgendamentoCardData[]>();

        for (const item of items) {
            const dateRef = item.dataFatal ?? item.dataInicio;
            const dateKey = new Date(dateRef).toISOString().split("T")[0];
            if (!map.has(dateKey)) map.set(dateKey, []);
            map.get(dateKey)!.push(item);
        }

        // Ordenar chaves
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [items]);

    if (items.length === 0) {
        return (
            <div className="rounded-xl border border-border p-12 text-center text-sm text-text-muted bg-bg-secondary">
                Nenhum agendamento encontrado para os filtros atuais.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {grouped.map(([dateKey, dayItems]) => {
                const dateObj = new Date(`${dateKey}T12:00:00`);
                const diff = getDayDiff(dateObj);
                const isToday = diff === 0;
                const isOverdue = diff < 0;

                return (
                    <section key={dateKey}>
                        {/* Cabecalho do grupo */}
                        <div className="flex items-center gap-3 mb-2.5">
                            <div className={cn(
                                "text-sm font-semibold capitalize",
                                isToday ? "text-amber-400" : isOverdue ? "text-red-400" : "text-text-secondary"
                            )}>
                                {isToday
                                    ? "Hoje"
                                    : dateObj.toLocaleDateString("pt-BR", {
                                        weekday: "long",
                                        day: "2-digit",
                                        month: "long",
                                    })}
                            </div>
                            <div className="flex-1 h-px bg-border" />
                            {isOverdue && <Badge variant="danger">Vencido</Badge>}
                            {isToday && <Badge variant="warning">Hoje</Badge>}
                            <Badge variant="muted">{dayItems.length}</Badge>
                        </div>

                        {/* Items do dia */}
                        <div className="space-y-1.5">
                            {dayItems.map((item) => (
                                <AgendamentoCard
                                    key={item.id}
                                    item={{ ...item, canConferir }}
                                    onEdit={onEdit}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
