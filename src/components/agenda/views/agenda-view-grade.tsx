"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIPO_META } from "@/components/agenda/agendamento-meta";
import type { AgendamentoCardData } from "@/components/agenda/agendamento-card";

const HORAS = Array.from({ length: 14 }, (_, i) => i + 7); // 07h - 20h
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

interface Props {
    items: AgendamentoCardData[];
    onEdit: (id: string) => void;
    initialDate?: Date;
}

function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatHour(hour: number): string {
    return `${String(hour).padStart(2, "0")}:00`;
}

export function AgendaViewGrade({ items, onEdit, initialDate }: Props) {
    const [weekStart, setWeekStart] = useState(() => getStartOfWeek(initialDate ?? new Date()));

    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [weekStart]);

    // Indexar items por dia + hora
    const itemsByDayHour = useMemo(() => {
        const map = new Map<string, AgendamentoCardData[]>();
        for (const item of items) {
            const d = new Date(item.dataInicio);
            const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const hour = d.getHours();
            const key = `${dayKey}-${hour}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(item);
        }
        return map;
    }, [items]);

    function prevWeek() {
        setWeekStart((w) => {
            const d = new Date(w);
            d.setDate(d.getDate() - 7);
            return d;
        });
    }

    function nextWeek() {
        setWeekStart((w) => {
            const d = new Date(w);
            d.setDate(d.getDate() + 7);
            return d;
        });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    return (
        <div className="glass-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                    <button onClick={prevWeek} className="rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary transition-colors">
                        <ChevronLeft size={16} />
                    </button>
                    <button onClick={nextWeek} className="rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary transition-colors">
                        <ChevronRight size={16} />
                    </button>
                    <span className="text-sm font-semibold text-text-primary ml-1">
                        {weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} —{" "}
                        {weekEnd.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                </div>
                <button
                    onClick={() => setWeekStart(getStartOfWeek(new Date()))}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs text-text-muted hover:border-border-hover transition-colors"
                >
                    Esta semana
                </button>
            </div>

            {/* Grade */}
            <div className="overflow-auto max-h-[600px]">
                <div className="min-w-[700px]">
                    {/* Cabecalho dias */}
                    <div className="grid border-b border-border" style={{ gridTemplateColumns: "64px repeat(7, 1fr)" }}>
                        <div className="py-2 text-center text-[10px] text-text-muted uppercase">H</div>
                        {weekDays.map((day, i) => {
                            const isToday = day.getTime() === today.getTime();
                            return (
                                <div key={i} className={cn(
                                    "py-2 text-center border-l border-border/40",
                                    isToday && "bg-accent/5"
                                )}>
                                    <div className="text-[10px] text-text-muted uppercase">{DIAS_SEMANA[i]}</div>
                                    <div className={cn(
                                        "text-sm font-semibold mt-0.5",
                                        isToday ? "text-accent" : "text-text-secondary"
                                    )}>
                                        {day.getDate()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Linhas de hora */}
                    {HORAS.map((hour) => (
                        <div
                            key={hour}
                            className="grid border-b border-border/30 min-h-[60px]"
                            style={{ gridTemplateColumns: "64px repeat(7, 1fr)" }}
                        >
                            {/* Label hora */}
                            <div className="py-1 pr-2 text-right text-[10px] text-text-muted self-start pt-1">
                                {formatHour(hour)}
                            </div>

                            {/* Celulas por dia */}
                            {weekDays.map((day, di) => {
                                const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                                const cellKey = `${dayKey}-${hour}`;
                                const cellItems = itemsByDayHour.get(cellKey) ?? [];
                                const isToday = day.getTime() === today.getTime();

                                return (
                                    <div
                                        key={di}
                                        className={cn(
                                            "border-l border-border/40 p-0.5 relative",
                                            isToday && "bg-accent/3"
                                        )}
                                    >
                                        {cellItems.map((item) => {
                                            const m = TIPO_META[item.tipo];
                                            const Icon = m.icon;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => onEdit(item.id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-1 rounded p-1 text-[10px] text-left transition-all hover:opacity-80 mb-0.5",
                                                        m.bgClass, m.textClass
                                                    )}
                                                >
                                                    <Icon size={9} className="shrink-0" />
                                                    <span className="truncate font-medium">{item.titulo}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
