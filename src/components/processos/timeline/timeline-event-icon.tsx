import {
    Scale, Newspaper, FileText, Gavel, AlertTriangle,
    CalendarClock, CheckCircle, Calendar, CheckSquare,
    Paperclip, FileCheck, Users, Phone, Mail,
    StickyNote, DollarSign, PenLine, ArrowRightLeft,
    BookOpen, ClipboardList,
} from "lucide-react";
import type { TipoEvento } from "@/lib/dal/timeline";

interface Props {
    tipo: TipoEvento;
    size?: number;
    variant?: "sm" | "md" | "lg";
}

export interface EventoConfig {
    icon: React.ElementType;
    bg: string;
    color: string;
    ring: string;
    border: string; // border-l-* class for card accent
}

export const EVENTO_CONFIG: Record<TipoEvento, EventoConfig> = {
    ANDAMENTO_JUDICIAL:  { icon: Scale,          bg: "bg-blue-500/12",    color: "text-blue-600",    ring: "ring-blue-500/20",    border: "border-l-blue-500"    },
    PUBLICACAO:          { icon: Newspaper,       bg: "bg-amber-500/12",   color: "text-amber-600",   ring: "ring-amber-500/20",   border: "border-l-amber-500"   },
    DESPACHO:            { icon: FileText,        bg: "bg-slate-500/12",   color: "text-slate-500",   ring: "ring-slate-500/20",   border: "border-l-slate-400"   },
    SENTENCA:            { icon: Gavel,           bg: "bg-red-500/12",     color: "text-red-600",     ring: "ring-red-500/20",     border: "border-l-red-500"     },
    DECISAO:             { icon: Gavel,           bg: "bg-orange-500/12",  color: "text-orange-600",  ring: "ring-orange-500/20",  border: "border-l-orange-500"  },
    JUNTADA:             { icon: Paperclip,       bg: "bg-indigo-500/12",  color: "text-indigo-500",  ring: "ring-indigo-500/20",  border: "border-l-indigo-500"  },
    CONCLUSAO:           { icon: ArrowRightLeft,  bg: "bg-slate-500/12",   color: "text-slate-500",   ring: "ring-slate-500/20",   border: "border-l-slate-400"   },
    PRAZO_CRIADO:        { icon: CalendarClock,   bg: "bg-yellow-400/12",  color: "text-yellow-600",  ring: "ring-yellow-500/20",  border: "border-l-yellow-500"  },
    PRAZO_VENCIDO:       { icon: AlertTriangle,   bg: "bg-red-500/12",     color: "text-red-600",     ring: "ring-red-500/25",     border: "border-l-red-600"     },
    PRAZO_CONCLUIDO:     { icon: CheckCircle,     bg: "bg-green-500/12",   color: "text-green-600",   ring: "ring-green-500/20",   border: "border-l-green-500"   },
    AUDIENCIA_AGENDADA:  { icon: Calendar,        bg: "bg-violet-500/12",  color: "text-violet-600",  ring: "ring-violet-500/20",  border: "border-l-violet-500"  },
    AUDIENCIA_REALIZADA: { icon: CheckSquare,     bg: "bg-green-500/12",   color: "text-green-600",   ring: "ring-green-500/20",   border: "border-l-green-500"   },
    DOCUMENTO_ANEXADO:   { icon: Paperclip,       bg: "bg-sky-500/12",     color: "text-sky-600",     ring: "ring-sky-500/20",     border: "border-l-sky-500"     },
    DOCUMENTO_PUBLICADO: { icon: FileCheck,       bg: "bg-emerald-500/12", color: "text-emerald-600", ring: "ring-emerald-500/20", border: "border-l-emerald-500" },
    REUNIAO_CLIENTE:     { icon: Users,           bg: "bg-teal-500/12",    color: "text-teal-600",    ring: "ring-teal-500/20",    border: "border-l-teal-500"    },
    CONTATO_TELEFONICO:  { icon: Phone,           bg: "bg-cyan-500/12",    color: "text-cyan-600",    ring: "ring-cyan-500/20",    border: "border-l-cyan-500"    },
    EMAIL_ENVIADO:       { icon: Mail,            bg: "bg-blue-400/12",    color: "text-blue-500",    ring: "ring-blue-400/20",    border: "border-l-blue-400"    },
    ANOTACAO_INTERNA:    { icon: StickyNote,      bg: "bg-yellow-300/15",  color: "text-yellow-600",  ring: "ring-yellow-400/20",  border: "border-l-yellow-400"  },
    HONORARIO_PAGO:      { icon: DollarSign,      bg: "bg-green-500/12",   color: "text-green-700",   ring: "ring-green-500/20",   border: "border-l-green-600"   },
    MANUAL:              { icon: PenLine,         bg: "bg-slate-400/12",   color: "text-slate-500",   ring: "ring-slate-400/20",   border: "border-l-slate-400"   },
};

const SIZE_MAP = {
    sm: { wrapper: "h-8 w-8",   icon: 14 },
    md: { wrapper: "h-10 w-10", icon: 17 },
    lg: { wrapper: "h-12 w-12", icon: 20 },
};

export function TimelineEventIcon({ tipo, variant = "md", size }: Props) {
    const cfg = EVENTO_CONFIG[tipo] ?? EVENTO_CONFIG.MANUAL;
    const { wrapper, icon: iconSize } = SIZE_MAP[variant];
    const Icon = cfg.icon;
    return (
        <div className={`flex shrink-0 items-center justify-center rounded-full ring-1 ${wrapper} ${cfg.bg} ${cfg.ring}`}>
            <Icon size={size ?? iconSize} className={cfg.color} strokeWidth={1.8} />
        </div>
    );
}

export function getEventoColor(tipo: TipoEvento): string {
    return EVENTO_CONFIG[tipo]?.color ?? "text-slate-400";
}

export function getEventoBorderClass(tipo: TipoEvento): string {
    return EVENTO_CONFIG[tipo]?.border ?? "border-l-slate-400";
}
