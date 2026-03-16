import {
    AlertTriangle,
    Clock,
    Gavel,
    CalendarDays,
    CheckSquare,
    Users,
    PhoneCall,
    Eye,
    MapPin,
    Sparkles,
    type LucideIcon,
} from "lucide-react";
import type { TipoAgendamento, StatusAgendamento, PrioridadeAgendamento } from "@/generated/prisma";

// ============================================================
// TIPO META
// ============================================================

export interface AgendamentoTipoMeta {
    label: string;
    labelPlural: string;
    icon: LucideIcon;
    color: string; // hex
    bgClass: string; // tailwind
    textClass: string; // tailwind
    borderClass: string; // tailwind
    badgeClass: string; // tailwind
}

export const TIPO_META: Record<TipoAgendamento, AgendamentoTipoMeta> = {
    PRAZO_FATAL: {
        label: "Prazo Fatal",
        labelPlural: "Prazos Fatais",
        icon: AlertTriangle,
        color: "#ef4444",
        bgClass: "bg-red-500/15",
        textClass: "text-red-400",
        borderClass: "border-red-500/40",
        badgeClass: "bg-red-500/15 text-red-400 border-red-500/30",
    },
    PRAZO_INTERMEDIARIO: {
        label: "Prazo",
        labelPlural: "Prazos",
        icon: Clock,
        color: "#f97316",
        bgClass: "bg-orange-500/15",
        textClass: "text-orange-400",
        borderClass: "border-orange-500/40",
        badgeClass: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    },
    AUDIENCIA: {
        label: "Audiencia",
        labelPlural: "Audiencias",
        icon: Gavel,
        color: "#3b82f6",
        bgClass: "bg-blue-500/15",
        textClass: "text-blue-400",
        borderClass: "border-blue-500/40",
        badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    },
    COMPROMISSO: {
        label: "Compromisso",
        labelPlural: "Compromissos",
        icon: CalendarDays,
        color: "#eab308",
        bgClass: "bg-yellow-500/15",
        textClass: "text-yellow-400",
        borderClass: "border-yellow-500/40",
        badgeClass: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    },
    TAREFA: {
        label: "Tarefa",
        labelPlural: "Tarefas",
        icon: CheckSquare,
        color: "#22c55e",
        bgClass: "bg-green-500/15",
        textClass: "text-green-400",
        borderClass: "border-green-500/40",
        badgeClass: "bg-green-500/15 text-green-400 border-green-500/30",
    },
    REUNIAO: {
        label: "Reuniao",
        labelPlural: "Reunioes",
        icon: Users,
        color: "#a855f7",
        bgClass: "bg-purple-500/15",
        textClass: "text-purple-400",
        borderClass: "border-purple-500/40",
        badgeClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    },
    RETORNO: {
        label: "Retorno",
        labelPlural: "Retornos",
        icon: PhoneCall,
        color: "#ec4899",
        bgClass: "bg-pink-500/15",
        textClass: "text-pink-400",
        borderClass: "border-pink-500/40",
        badgeClass: "bg-pink-500/15 text-pink-400 border-pink-500/30",
    },
    VERIFICACAO: {
        label: "Verificar",
        labelPlural: "Verificacoes",
        icon: Eye,
        color: "#6b7280",
        bgClass: "bg-gray-500/15",
        textClass: "text-gray-400",
        borderClass: "border-gray-500/40",
        badgeClass: "bg-gray-500/15 text-gray-400 border-gray-500/30",
    },
    DILIGENCIA: {
        label: "Diligencia",
        labelPlural: "Diligencias",
        icon: MapPin,
        color: "#14b8a6",
        bgClass: "bg-teal-500/15",
        textClass: "text-teal-400",
        borderClass: "border-teal-500/40",
        badgeClass: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    },
    PRAZO_IA: {
        label: "Prazo IA",
        labelPlural: "Prazos por IA",
        icon: Sparkles,
        color: "#f59e0b",
        bgClass: "bg-amber-500/15",
        textClass: "text-amber-400",
        borderClass: "border-amber-500/40",
        badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    },
};

// ============================================================
// STATUS META
// ============================================================

export interface StatusMeta {
    label: string;
    badgeClass: string;
    dotClass: string;
}

export const STATUS_META: Record<StatusAgendamento, StatusMeta> = {
    PENDENTE: {
        label: "Pendente",
        badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        dotClass: "bg-blue-400",
    },
    VISUALIZADO: {
        label: "Visualizado",
        badgeClass: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
        dotClass: "bg-indigo-400",
    },
    CONCLUIDO: {
        label: "Concluido",
        badgeClass: "bg-green-500/15 text-green-400 border-green-500/30",
        dotClass: "bg-green-400",
    },
    CONFERIDO: {
        label: "Conferido",
        badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        dotClass: "bg-emerald-400",
    },
    CANCELADO: {
        label: "Cancelado",
        badgeClass: "bg-gray-500/15 text-gray-400 border-gray-500/30",
        dotClass: "bg-gray-400",
    },
    VENCIDO: {
        label: "Vencido",
        badgeClass: "bg-red-500/15 text-red-400 border-red-500/30",
        dotClass: "bg-red-400",
    },
};

// ============================================================
// PRIORIDADE META
// ============================================================

export interface PrioridadeMeta {
    label: string;
    badgeClass: string;
    order: number;
}

export const PRIORIDADE_META: Record<PrioridadeAgendamento, PrioridadeMeta> = {
    URGENTE: {
        label: "Urgente",
        badgeClass: "bg-red-500/20 text-red-400 border-red-500/40",
        order: 0,
    },
    ALTA: {
        label: "Alta",
        badgeClass: "bg-orange-500/20 text-orange-400 border-orange-500/40",
        order: 1,
    },
    NORMAL: {
        label: "Normal",
        badgeClass: "bg-bg-tertiary text-text-muted border-border",
        order: 2,
    },
    BAIXA: {
        label: "Baixa",
        badgeClass: "bg-gray-500/10 text-gray-500 border-gray-500/20",
        order: 3,
    },
};

// ============================================================
// DATE HELPERS
// ============================================================

export function getDayDiff(date: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export interface DateChip {
    label: string;
    variant: "danger" | "warning" | "info" | "default" | "muted";
}

export function getDateChip(date: Date): DateChip {
    const diff = getDayDiff(date);
    if (diff < -7) return { label: `Vencido ha ${Math.abs(diff)}d`, variant: "danger" };
    if (diff < 0) return { label: `Vencido ${Math.abs(diff)}d`, variant: "danger" };
    if (diff === 0) return { label: "Hoje", variant: "warning" };
    if (diff === 1) return { label: "Amanha", variant: "info" };
    if (diff <= 3) return { label: `D-${diff}`, variant: "warning" };
    if (diff <= 7) return { label: `D-${diff}`, variant: "default" };
    return { label: `Em ${diff}d`, variant: "muted" };
}

export function formatDataAgendamento(date: Date, diaInteiro?: boolean): string {
    if (diaInteiro) {
        return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
    }
    const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
    if (!hasTime) {
        return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
    }
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export const ALL_TIPOS: TipoAgendamento[] = [
    "PRAZO_FATAL",
    "PRAZO_INTERMEDIARIO",
    "AUDIENCIA",
    "COMPROMISSO",
    "TAREFA",
    "REUNIAO",
    "RETORNO",
    "VERIFICACAO",
    "DILIGENCIA",
    "PRAZO_IA",
];

export const ALL_STATUS: StatusAgendamento[] = [
    "PENDENTE",
    "VISUALIZADO",
    "CONCLUIDO",
    "CONFERIDO",
    "CANCELADO",
    "VENCIDO",
];
