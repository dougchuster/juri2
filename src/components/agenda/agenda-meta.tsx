"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CalendarDays, CheckSquare, Gavel, PhoneCall } from "lucide-react";

export type AgendaTipo = "prazo" | "audiencia" | "compromisso" | "tarefa" | "retorno";

export const AGENDA_TYPE_META: Record<
    AgendaTipo,
    {
        label: string;
        icon: LucideIcon;
        textClass: string;
        bgClass: string;
        color: string;
    }
> = {
    prazo: {
        label: "Prazo",
        icon: AlertTriangle,
        textClass: "text-danger",
        bgClass: "bg-danger/10",
        color: "var(--danger)",
    },
    audiencia: {
        label: "Audiência",
        icon: Gavel,
        textClass: "text-info",
        bgClass: "bg-info/10",
        color: "var(--info)",
    },
    compromisso: {
        label: "Compromisso",
        icon: CalendarDays,
        textClass: "text-warning",
        bgClass: "bg-warning/10",
        color: "var(--warning)",
    },
    tarefa: {
        label: "Tarefa",
        icon: CheckSquare,
        textClass: "text-accent",
        bgClass: "bg-accent/10",
        color: "var(--accent)",
    },
    retorno: {
        label: "Retorno",
        icon: PhoneCall,
        textClass: "text-highlight",
        bgClass: "bg-[color-mix(in_srgb,var(--highlight)_16%,transparent)]",
        color: "var(--highlight)",
    },
};

export function formatAgendaDayTitle(date: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    if (target.getTime() === today.getTime()) return "Hoje";
    if (target.getTime() === tomorrow.getTime()) return "Amanha";

    return target.toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
    });
}

export function formatAgendaTime(date: Date) {
    const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;

    if (!hasTime) return "Dia todo";

    return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}
