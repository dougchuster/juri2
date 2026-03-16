"use client";

import { cn } from "@/lib/utils";
import { AgendamentoKanbanCard, type AgendamentoCardData } from "@/components/agenda/agendamento-card";

interface KanbanColumn {
    id: string;
    label: string;
    items: AgendamentoCardData[];
    headerClass: string;
    countClass: string;
}

interface Props {
    vencidos: AgendamentoCardData[];
    hoje: AgendamentoCardData[];
    estaSemana: AgendamentoCardData[];
    proximaSemana: AgendamentoCardData[];
    futuro: AgendamentoCardData[];
    onEdit: (id: string) => void;
}

export function AgendaViewKanban({ vencidos, hoje, estaSemana, proximaSemana, futuro, onEdit }: Props) {
    const columns: KanbanColumn[] = [
        {
            id: "vencidos",
            label: "Vencidos",
            items: vencidos,
            headerClass: "border-red-500/40 bg-red-500/5",
            countClass: "bg-red-500/20 text-red-400",
        },
        {
            id: "hoje",
            label: "Vence hoje",
            items: hoje,
            headerClass: "border-amber-500/40 bg-amber-500/5",
            countClass: "bg-amber-500/20 text-amber-400",
        },
        {
            id: "esta-semana",
            label: "Esta semana",
            items: estaSemana,
            headerClass: "border-blue-500/40 bg-blue-500/5",
            countClass: "bg-blue-500/20 text-blue-400",
        },
        {
            id: "proxima-semana",
            label: "Proxima semana",
            items: proximaSemana,
            headerClass: "border-indigo-500/40 bg-indigo-500/5",
            countClass: "bg-indigo-500/20 text-indigo-400",
        },
        {
            id: "futuro",
            label: "Futuro",
            items: futuro,
            headerClass: "border-border bg-bg-secondary",
            countClass: "bg-bg-tertiary text-text-muted",
        },
    ];

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
            {columns.map((col) => (
                <div key={col.id} className="flex-shrink-0 w-72">
                    {/* Header da coluna */}
                    <div className={cn(
                        "flex items-center justify-between rounded-t-xl border px-3 py-2.5 mb-2",
                        col.headerClass
                    )}>
                        <span className="text-sm font-semibold text-text-primary">{col.label}</span>
                        <span className={cn(
                            "text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center",
                            col.countClass
                        )}>
                            {col.items.length}
                        </span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2 min-h-[120px]">
                        {col.items.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border/50 p-4 text-center text-xs text-text-muted">
                                Nenhum item
                            </div>
                        ) : (
                            col.items.map((item) => (
                                <AgendamentoKanbanCard
                                    key={item.id}
                                    item={item}
                                    onEdit={onEdit}
                                />
                            ))
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
