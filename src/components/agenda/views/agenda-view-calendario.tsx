"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AgendamentoCard, type AgendamentoCardData } from "@/components/agenda/agendamento-card";
import { TIPO_META, formatDataAgendamento } from "@/components/agenda/agendamento-meta";

type CalendarMode = "month" | "week" | "day" | "list";

interface Props {
    items: AgendamentoCardData[];
    onEdit: (id: string) => void;
    initialDate?: Date;
}

interface DayBucket {
    day: Date;
    allDay: AgendamentoCardData[];
    timed: AgendamentoCardData[];
}

const CALENDAR_MODES: { id: CalendarMode; label: string }[] = [
    { id: "month", label: "Mes" },
    { id: "week", label: "Semana" },
    { id: "day", label: "Dia" },
    { id: "list", label: "Lista" },
];

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const WEEKDAY_HEADER = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
const HOURS = Array.from({ length: 14 }, (_, index) => index + 7);

function startOfDay(date: Date): Date {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
}

function addDays(date: Date, amount: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
}

function startOfWeek(date: Date): Date {
    const next = startOfDay(date);
    next.setDate(next.getDate() - next.getDay());
    return next;
}

function toDayKey(date: Date): string {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

function sameDay(left: Date, right: Date): boolean {
    return toDayKey(left) === toDayKey(right);
}

function getReferenceDate(item: AgendamentoCardData): Date {
    return new Date(item.dataFatal ?? item.dataInicio);
}

function isTimedItem(item: AgendamentoCardData): boolean {
    if (item.diaInteiro) return false;
    const date = getReferenceDate(item);
    return date.getHours() !== 0 || date.getMinutes() !== 0;
}

function sortItems(items: AgendamentoCardData[]): AgendamentoCardData[] {
    return [...items].sort((left, right) => {
        const leftDate = getReferenceDate(left).getTime();
        const rightDate = getReferenceDate(right).getTime();

        if (leftDate !== rightDate) return leftDate - rightDate;
        if (left.diaInteiro !== right.diaInteiro) return left.diaInteiro ? -1 : 1;
        return left.titulo.localeCompare(right.titulo, "pt-BR");
    });
}

function buildMonthWeeks(activeDate: Date): Date[][] {
    const monthStart = new Date(activeDate.getFullYear(), activeDate.getMonth(), 1);
    const gridStart = startOfWeek(monthStart);

    return Array.from({ length: 6 }, (_, weekIndex) =>
        Array.from({ length: 7 }, (_, dayIndex) => addDays(gridStart, weekIndex * 7 + dayIndex))
    );
}

function formatHour(hour: number): string {
    return `${String(hour).padStart(2, "0")}:00`;
}

function formatMonthTitle(date: Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
    }).format(date);
}

function formatWeekTitle(date: Date): string {
    const start = startOfWeek(date);
    const end = addDays(start, 6);
    const startLabel = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
    }).format(start);
    const endLabel = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(end);

    return `${startLabel} - ${endLabel}`;
}

function formatDayTitle(date: Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(date);
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-border bg-bg-secondary/70 px-4 py-10 text-center text-sm text-text-muted">
            {label}
        </div>
    );
}

function CalendarPill({
    item,
    onEdit,
    showTime,
    className,
}: {
    item: AgendamentoCardData;
    onEdit: (id: string) => void;
    showTime?: boolean;
    className?: string;
}) {
    const meta = TIPO_META[item.tipo];
    const Icon = meta.icon;
    const date = getReferenceDate(item);

    return (
        <button
            type="button"
            onClick={() => onEdit(item.id)}
            className={cn(
                "flex w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] transition-colors hover:opacity-85",
                meta.badgeClass,
                className
            )}
        >
            <Icon size={11} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate font-medium">
                {showTime && isTimedItem(item) ? `${formatDataAgendamento(date)} • ${item.titulo}` : item.titulo}
            </span>
        </button>
    );
}

function DaySection({
    title,
    items,
    onEdit,
    showTime,
}: {
    title: string;
    items: AgendamentoCardData[];
    onEdit: (id: string) => void;
    showTime?: boolean;
}) {
    if (items.length === 0) return null;

    return (
        <section className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                {title}
            </div>
            <div className="space-y-2">
                {items.map((item) => (
                    <CalendarPill key={item.id} item={item} onEdit={onEdit} showTime={showTime} />
                ))}
            </div>
        </section>
    );
}

export function AgendaViewCalendario({ items, onEdit, initialDate }: Props) {
    const [mode, setMode] = useState<CalendarMode>("month");
    const [activeDate, setActiveDate] = useState(() => startOfDay(initialDate ?? new Date()));

    const sortedItems = useMemo(() => sortItems(items), [items]);

    const itemsByDay = useMemo(() => {
        const map = new Map<string, AgendamentoCardData[]>();

        for (const item of sortedItems) {
            const key = toDayKey(getReferenceDate(item));
            const bucket = map.get(key);
            if (bucket) {
                bucket.push(item);
            } else {
                map.set(key, [item]);
            }
        }

        return map;
    }, [sortedItems]);

    const monthWeeks = useMemo(() => buildMonthWeeks(activeDate), [activeDate]);

    const weekDays = useMemo(
        () => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(activeDate), index)),
        [activeDate]
    );

    const weekBuckets = useMemo<DayBucket[]>(
        () =>
            weekDays.map((day) => {
                const dayItems = itemsByDay.get(toDayKey(day)) ?? [];
                return {
                    day,
                    allDay: dayItems.filter((item) => !isTimedItem(item)),
                    timed: dayItems.filter(isTimedItem),
                };
            }),
        [itemsByDay, weekDays]
    );

    const dayItems = useMemo(() => itemsByDay.get(toDayKey(activeDate)) ?? [], [activeDate, itemsByDay]);

    const monthItems = useMemo(
        () =>
            sortedItems.filter((item) => {
                const date = getReferenceDate(item);
                return date.getMonth() === activeDate.getMonth() && date.getFullYear() === activeDate.getFullYear();
            }),
        [activeDate, sortedItems]
    );

    const monthGroups = useMemo(() => {
        const groups = new Map<string, AgendamentoCardData[]>();

        for (const item of monthItems) {
            const key = toDayKey(getReferenceDate(item));
            const bucket = groups.get(key);
            if (bucket) {
                bucket.push(item);
            } else {
                groups.set(key, [item]);
            }
        }

        return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right));
    }, [monthItems]);

    const hasTimedWeekItems = weekBuckets.some((bucket) => bucket.timed.length > 0);
    const today = startOfDay(new Date());

    function navigate(direction: -1 | 1) {
        setActiveDate((current) => {
            if (mode === "month" || mode === "list") {
                return new Date(current.getFullYear(), current.getMonth() + direction, 1);
            }

            if (mode === "week") {
                return addDays(current, direction * 7);
            }

            return addDays(current, direction);
        });
    }

    function renderMonthMode() {
        return (
            <div className="overflow-x-auto">
                <div className="min-w-[720px]">
                    <div className="grid grid-cols-7 border-b border-border">
                        {WEEKDAY_HEADER.map((label) => (
                            <div
                                key={label}
                                className="px-2 py-3 text-center text-[11px] font-semibold tracking-[0.08em] text-text-muted"
                            >
                                {label}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7">
                        {monthWeeks.flat().map((day) => {
                            const key = toDayKey(day);
                            const dayItems = itemsByDay.get(key) ?? [];
                            const isCurrentMonth = day.getMonth() === activeDate.getMonth();
                            const isToday = sameDay(day, today);

                            return (
                                <div
                                    key={key}
                                    className={cn(
                                        "min-h-[122px] border-b border-r border-border/50 p-2",
                                        !isCurrentMonth && "bg-bg-secondary/35",
                                        isToday && "bg-accent/5"
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setActiveDate(day)}
                                        className={cn(
                                            "mb-2 inline-flex h-8 min-w-[32px] items-center justify-center rounded-full px-2 text-sm font-semibold transition-colors",
                                            isToday
                                                ? "bg-accent text-white"
                                                : isCurrentMonth
                                                    ? "text-text-primary hover:bg-bg-tertiary"
                                                    : "text-text-muted hover:bg-bg-tertiary/60"
                                        )}
                                    >
                                        {day.getDate()}
                                    </button>

                                    <div className="space-y-1.5">
                                        {dayItems.slice(0, 3).map((item) => (
                                            <CalendarPill key={item.id} item={item} onEdit={onEdit} />
                                        ))}
                                        {dayItems.length > 3 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveDate(day);
                                                    setMode("day");
                                                }}
                                                className="px-1 text-xs font-medium text-text-muted hover:text-text-primary"
                                            >
                                                +{dayItems.length - 3} mais
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    function renderWeekMode() {
        return (
            <div className="space-y-4">
                <div className="space-y-3 md:hidden">
                    {weekBuckets.map((bucket) => {
                        const isToday = sameDay(bucket.day, today);
                        const label = new Intl.DateTimeFormat("pt-BR", {
                            weekday: "short",
                            day: "2-digit",
                            month: "short",
                        }).format(bucket.day);

                        return (
                            <section
                                key={toDayKey(bucket.day)}
                                className={cn(
                                    "rounded-2xl border border-border bg-bg-secondary/70 p-4",
                                    isToday && "border-accent/30 bg-accent/5"
                                )}
                            >
                                <div className="mb-3 flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveDate(bucket.day)}
                                        className="text-left text-sm font-semibold capitalize text-text-primary"
                                    >
                                        {label}
                                    </button>
                                    <span className="text-xs text-text-muted">
                                        {bucket.allDay.length + bucket.timed.length} item(ns)
                                    </span>
                                </div>

                                {bucket.allDay.length === 0 && bucket.timed.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-text-muted">
                                        Sem agendamentos
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <DaySection title="Dia inteiro" items={bucket.allDay} onEdit={onEdit} />
                                        <DaySection title="Horarios" items={bucket.timed} onEdit={onEdit} showTime />
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>

                <div className="hidden md:block">
                    {!hasTimedWeekItems ? (
                        <div className="grid grid-cols-7 gap-3">
                            {weekBuckets.map((bucket) => {
                                const isToday = sameDay(bucket.day, today);
                                return (
                                    <section
                                        key={toDayKey(bucket.day)}
                                        className={cn(
                                            "rounded-2xl border border-border bg-bg-secondary/70 p-3",
                                            isToday && "border-accent/30 bg-accent/5"
                                        )}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setActiveDate(bucket.day)}
                                            className="mb-3 flex w-full items-center justify-between gap-2 text-left"
                                        >
                                            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
                                                {WEEKDAY_SHORT[bucket.day.getDay()]}
                                            </span>
                                            <span
                                                className={cn(
                                                    "inline-flex h-8 min-w-[32px] items-center justify-center rounded-full px-2 text-sm font-semibold",
                                                    isToday ? "bg-accent text-white" : "text-text-primary"
                                                )}
                                            >
                                                {bucket.day.getDate()}
                                            </span>
                                        </button>

                                        {bucket.allDay.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-text-muted">
                                                Sem agendamentos
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {bucket.allDay.map((item) => (
                                                    <CalendarPill key={item.id} item={item} onEdit={onEdit} />
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <div className="min-w-[980px]">
                                <div
                                    className="grid border-b border-border"
                                    style={{ gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))" }}
                                >
                                    <div className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                                        H
                                    </div>
                                    {weekBuckets.map((bucket) => {
                                        const isToday = sameDay(bucket.day, today);
                                        return (
                                            <div
                                                key={toDayKey(bucket.day)}
                                                className={cn(
                                                    "border-l border-border/50 px-3 py-3 text-center",
                                                    isToday && "bg-accent/5"
                                                )}
                                            >
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                                                    {WEEKDAY_SHORT[bucket.day.getDay()]}
                                                </div>
                                                <div
                                                    className={cn(
                                                        "mt-1 text-lg font-semibold",
                                                        isToday ? "text-accent" : "text-text-primary"
                                                    )}
                                                >
                                                    {bucket.day.getDate()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div
                                    className="grid border-b border-border/60"
                                    style={{ gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))" }}
                                >
                                    <div className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                                        Dia
                                    </div>
                                    {weekBuckets.map((bucket) => {
                                        const isToday = sameDay(bucket.day, today);
                                        return (
                                            <div
                                                key={toDayKey(bucket.day)}
                                                className={cn(
                                                    "min-h-[112px] border-l border-border/50 p-2",
                                                    isToday && "bg-accent/5"
                                                )}
                                            >
                                                <div className="space-y-1.5">
                                                    {bucket.allDay.length === 0 ? (
                                                        <div className="rounded-xl border border-dashed border-border px-2 py-6 text-center text-xs text-text-muted">
                                                            Sem itens
                                                        </div>
                                                    ) : (
                                                        bucket.allDay.map((item) => (
                                                            <CalendarPill key={item.id} item={item} onEdit={onEdit} />
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {HOURS.map((hour) => (
                                    <div
                                        key={hour}
                                        className="grid border-b border-border/40"
                                        style={{ gridTemplateColumns: "72px repeat(7, minmax(0, 1fr))" }}
                                    >
                                        <div className="px-3 py-3 text-right text-[11px] font-medium text-text-muted">
                                            {formatHour(hour)}
                                        </div>
                                        {weekBuckets.map((bucket) => {
                                            const isToday = sameDay(bucket.day, today);
                                            const hourItems = bucket.timed.filter((item) => getReferenceDate(item).getHours() === hour);

                                            return (
                                                <div
                                                    key={`${toDayKey(bucket.day)}-${hour}`}
                                                    className={cn(
                                                        "min-h-[74px] border-l border-border/50 p-2",
                                                        isToday && "bg-accent/5"
                                                    )}
                                                >
                                                    <div className="space-y-1.5">
                                                        {hourItems.map((item) => (
                                                            <CalendarPill
                                                                key={item.id}
                                                                item={item}
                                                                onEdit={onEdit}
                                                                showTime
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    function renderDayMode() {
        const allDay = dayItems.filter((item) => !isTimedItem(item));
        const timed = dayItems.filter(isTimedItem);

        return (
            <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-bg-secondary/70 p-4">
                    <div className="text-sm font-semibold capitalize text-text-primary">
                        {formatDayTitle(activeDate)}
                    </div>
                    <div className="mt-1 text-xs text-text-muted">
                        {dayItems.length} agendamento(s) no dia selecionado
                    </div>
                </div>

                {dayItems.length === 0 ? (
                    <EmptyState label="Nenhum agendamento para este dia." />
                ) : (
                    <div className="space-y-6">
                        <DaySection title="Dia inteiro" items={allDay} onEdit={onEdit} />
                        <section className="space-y-2">
                            {timed.length > 0 && (
                                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                                    Horarios
                                </div>
                            )}
                            <div className="space-y-2.5">
                                {timed.map((item) => (
                                    <AgendamentoCard key={item.id} item={item} onEdit={onEdit} />
                                ))}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        );
    }

    function renderListMode() {
        if (monthGroups.length === 0) {
            return <EmptyState label="Nenhum agendamento neste mes." />;
        }

        return (
            <div className="space-y-6">
                {monthGroups.map(([key, groupedItems]) => {
                    const date = new Date(`${key}T12:00:00`);
                    return (
                        <section key={key} className="space-y-2.5">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveDate(date);
                                        setMode("day");
                                    }}
                                    className="text-left text-sm font-semibold capitalize text-text-primary"
                                >
                                    {new Intl.DateTimeFormat("pt-BR", {
                                        weekday: "long",
                                        day: "2-digit",
                                        month: "long",
                                    }).format(date)}
                                </button>
                                <div className="h-px flex-1 bg-border" />
                                <span className="rounded-full border border-border px-2 py-1 text-[11px] text-text-muted">
                                    {groupedItems.length}
                                </span>
                            </div>

                            <div className="space-y-2.5">
                                {groupedItems.map((item) => (
                                    <AgendamentoCard key={item.id} item={item} onEdit={onEdit} />
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>
        );
    }

    const title =
        mode === "month" || mode === "list"
            ? formatMonthTitle(activeDate)
            : mode === "week"
                ? formatWeekTitle(activeDate)
                : formatDayTitle(activeDate);

    return (
        <div className="glass-card overflow-hidden">
            <div className="border-b border-border px-4 py-4 md:px-5">
                <div className="flex flex-col gap-3 md:grid md:grid-cols-[auto_1fr_auto] md:items-center">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate(1)}
                            className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <Button
                            variant="outline"
                            size="xs"
                            className="h-9 rounded-xl px-3"
                            onClick={() => setActiveDate(today)}
                        >
                            Hoje
                        </Button>
                    </div>

                    <div className="text-center text-lg font-semibold capitalize text-text-primary md:text-xl">
                        {title}
                    </div>

                    <div className="overflow-x-auto">
                        <div className="ml-auto inline-flex min-w-max items-center gap-1 rounded-2xl border border-border bg-bg-secondary/70 p-1">
                            {CALENDAR_MODES.map((entry) => (
                                <button
                                    key={entry.id}
                                    type="button"
                                    onClick={() => setMode(entry.id)}
                                    className={cn(
                                        "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                                        mode === entry.id
                                            ? "bg-bg-primary text-text-primary shadow-sm"
                                            : "text-text-muted hover:text-text-primary"
                                    )}
                                >
                                    {entry.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-5">
                {mode === "month" && renderMonthMode()}
                {mode === "week" && renderWeekMode()}
                {mode === "day" && renderDayMode()}
                {mode === "list" && renderListMode()}
            </div>
        </div>
    );
}

export function CalendarioLegenda() {
    const legendItems = [
        "PRAZO_FATAL",
        "PRAZO_IA",
        "AUDIENCIA",
        "COMPROMISSO",
        "TAREFA",
        "REUNIAO",
    ] as const;

    return (
        <div className="flex flex-wrap items-center gap-2">
            {legendItems.map((tipo) => {
                const meta = TIPO_META[tipo];
                const Icon = meta.icon;
                return (
                    <span
                        key={tipo}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium",
                            meta.badgeClass
                        )}
                    >
                        <Icon size={12} />
                        {meta.label}
                    </span>
                );
            })}
        </div>
    );
}
