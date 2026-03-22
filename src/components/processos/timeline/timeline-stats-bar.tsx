import { CalendarClock, Calendar, Paperclip, Activity } from "lucide-react";
import type { TimelineStats } from "@/lib/dal/timeline";

interface Props {
    stats: TimelineStats;
}

function formatDate(d: Date | null): string {
    if (!d) return "Sem registros";
    return new Date(d).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

export function TimelineStatsBar({ stats }: Props) {
    return (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <StatCard
                icon={Activity}
                label="Total de eventos"
                value={stats.totalEventos.toString()}
                sub={`Última atualização: ${formatDate(stats.ultimaAtualizacao)}`}
                color="text-accent"
                bg="bg-accent/10"
            />
            <StatCard
                icon={CalendarClock}
                label="Prazos pendentes"
                value={stats.prazosPendentes.toString()}
                sub={stats.prazosPendentes > 0 ? "Requerem atenção" : "Tudo em dia"}
                color={stats.prazosPendentes > 0 ? "text-warning" : "text-success"}
                bg={stats.prazosPendentes > 0 ? "bg-warning/10" : "bg-success/10"}
            />
            <StatCard
                icon={Calendar}
                label="Audiências próx."
                value={stats.audienciasProximas.toString()}
                sub="Nos próximos 30 dias"
                color="text-violet-500"
                bg="bg-violet-500/10"
            />
            <StatCard
                icon={Paperclip}
                label="Documentos"
                value={stats.documentosAnexados.toString()}
                sub="Anexados ao processo"
                color="text-sky-500"
                bg="bg-sky-500/10"
            />
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    color,
    bg,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    sub: string;
    color: string;
    bg: string;
}) {
    return (
        <div className="rounded-xl border border-border bg-bg-tertiary/40 px-3 py-3">
            <div className="flex items-center gap-2 mb-2">
                <div className={`rounded-lg p-1.5 ${bg}`}>
                    <Icon size={13} className={color} />
                </div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-text-muted font-medium">{label}</p>
            </div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="mt-0.5 text-[11px] text-text-muted">{sub}</p>
        </div>
    );
}
