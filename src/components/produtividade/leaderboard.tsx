"use client";

import { useState } from "react";
import { Trophy, Medal, Star, Zap, Target, Clock, CheckCircle, AlertCircle, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";

const BADGE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    ZERO_ATRASOS: { label: "Zero Atrasos",  icon: CheckCircle, color: "text-success" },
    MARATONISTA:  { label: "Maratonista",   icon: Zap,         color: "text-accent" },
    DESTAQUE:     { label: "Destaque",      icon: Star,        color: "text-warning" },
};

interface Entry {
    advogadoId: string;
    nome: string;
    avatarUrl: string | null;
    oab: string;
    taskscore: number;
    total: number;
    concluidas: number;
    emAndamento: number;
    aFazer: number;
    noPrazo: number;
    foraPrazo: number;
    taxaEntrega: number;
    badges: string[];
}

interface Props {
    leaderboard: Entry[];
    stats: {
        totalTarefasMes: number;
        concluidasMes: number;
        foraPrazoMes: number;
        taxaGeral: number;
        taskscoreTotal: number;
    };
    mesLabel: string;
}

function RankIcon({ position }: { position: number }) {
    if (position === 0) return <Trophy size={20} className="text-yellow-400" />;
    if (position === 1) return <Medal size={18} className="text-slate-400" />;
    if (position === 2) return <Medal size={16} className="text-amber-600" />;
    return <span className="w-5 text-center text-sm font-bold text-text-muted">{position + 1}</span>;
}

function Avatar({ nome, avatarUrl, size = 40 }: { nome: string; avatarUrl: string | null; size?: number }) {
    if (avatarUrl) {
        return <img src={avatarUrl} alt={nome} className="rounded-full object-cover" style={{ width: size, height: size }} />;
    }
    return (
        <div className="flex items-center justify-center rounded-full bg-accent/20 font-semibold text-accent text-xs"
            style={{ width: size, height: size }}>
            {getInitials(nome)}
        </div>
    );
}

export function Leaderboard({ leaderboard, stats, mesLabel }: Props) {
    const [expanded, setExpanded] = useState<string | null>(null);

    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    return (
        <div className="space-y-6">
            {/* Podium — top 3 */}
            {top3.length > 0 && (
                <div className="glass-card p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Trophy size={16} className="text-yellow-400" />
                        <h3 className="font-semibold text-text-primary">Pódio — {mesLabel}</h3>
                    </div>
                    <div className="flex items-end justify-center gap-4">
                        {/* 2nd place */}
                        {top3[1] && (
                            <div className="flex flex-col items-center gap-2 mb-0">
                                <Avatar nome={top3[1].nome} avatarUrl={top3[1].avatarUrl} size={48} />
                                <p className="text-xs font-medium text-text-primary text-center max-w-[90px] truncate">{top3[1].nome.split(" ")[0]}</p>
                                <div className="w-20 flex flex-col items-center justify-end rounded-t-xl bg-slate-500/20 border border-slate-400/20 h-16 pb-2">
                                    <Medal size={14} className="text-slate-400 mb-1" />
                                    <span className="font-mono text-xs font-bold text-text-primary">{top3[1].taskscore} pts</span>
                                </div>
                            </div>
                        )}
                        {/* 1st place */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="relative">
                                <Avatar nome={top3[0].nome} avatarUrl={top3[0].avatarUrl} size={56} />
                                <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 shadow">
                                    <Trophy size={12} className="text-black" />
                                </div>
                            </div>
                            <p className="text-xs font-medium text-text-primary text-center max-w-[100px] truncate">{top3[0].nome.split(" ")[0]}</p>
                            <div className="w-24 flex flex-col items-center justify-end rounded-t-xl bg-yellow-400/20 border border-yellow-400/30 h-24 pb-2">
                                <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider mb-0.5">🥇 1°</span>
                                <span className="font-mono text-sm font-bold text-text-primary">{top3[0].taskscore} pts</span>
                            </div>
                        </div>
                        {/* 3rd place */}
                        {top3[2] && (
                            <div className="flex flex-col items-center gap-2">
                                <Avatar nome={top3[2].nome} avatarUrl={top3[2].avatarUrl} size={44} />
                                <p className="text-xs font-medium text-text-primary text-center max-w-[80px] truncate">{top3[2].nome.split(" ")[0]}</p>
                                <div className="w-18 flex flex-col items-center justify-end rounded-t-xl bg-amber-700/20 border border-amber-600/20 h-12 pb-2" style={{ width: 72 }}>
                                    <Medal size={12} className="text-amber-600 mb-1" />
                                    <span className="font-mono text-xs font-bold text-text-primary">{top3[2].taskscore} pts</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Full ranking */}
            <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-text-primary flex items-center gap-2">
                        <Award size={15} className="text-accent" /> Ranking Completo
                    </h3>
                    <span className="text-xs text-text-muted">{leaderboard.length} advogado{leaderboard.length !== 1 ? "s" : ""}</span>
                </div>

                <div className="divide-y divide-border">
                    {leaderboard.length === 0 ? (
                        <p className="px-6 py-10 text-sm text-text-muted text-center">Nenhuma tarefa registrada este mês</p>
                    ) : leaderboard.map((entry, idx) => {
                        const isExpanded = expanded === entry.advogadoId;
                        return (
                            <div key={entry.advogadoId}>
                                <button
                                    onClick={() => setExpanded(isExpanded ? null : entry.advogadoId)}
                                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-bg-tertiary/30 transition-colors text-left"
                                >
                                    <div className="flex h-8 w-8 items-center justify-center flex-shrink-0">
                                        <RankIcon position={idx} />
                                    </div>
                                    <Avatar nome={entry.nome} avatarUrl={entry.avatarUrl} size={36} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm text-text-primary truncate">{entry.nome}</span>
                                            {entry.badges.map((b) => {
                                                const cfg = BADGE_CONFIG[b];
                                                if (!cfg) return null;
                                                const Icon = cfg.icon;
                                                return (
                                                    <span key={b} title={cfg.label} className={`flex items-center gap-1 text-[10px] font-semibold ${cfg.color}`}>
                                                        <Icon size={10} />{cfg.label}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        <span className="text-[10px] text-text-muted">OAB {entry.oab}</span>
                                    </div>
                                    <div className="flex items-center gap-6 flex-shrink-0">
                                        <div className="hidden md:flex items-center gap-4 text-xs text-text-muted">
                                            <span title="Taxa de entrega" className="flex items-center gap-1">
                                                <Target size={11} />{entry.taxaEntrega}%
                                            </span>
                                            <span title="Concluídas" className="flex items-center gap-1 text-success">
                                                <CheckCircle size={11} />{entry.concluidas}
                                            </span>
                                            {entry.foraPrazo > 0 && (
                                                <span title="Fora do prazo" className="flex items-center gap-1 text-danger">
                                                    <AlertCircle size={11} />{entry.foraPrazo}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Trophy size={12} className="text-yellow-400" />
                                            <span className="font-mono font-bold text-sm text-text-primary">{entry.taskscore}</span>
                                            <span className="text-[10px] text-text-muted">pts</span>
                                        </div>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-border bg-bg-tertiary/20 px-6 py-4">
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                            {[
                                                { label: "Total tarefas",   value: entry.total,        icon: Clock,         color: "" },
                                                { label: "Concluídas",      value: entry.concluidas,   icon: CheckCircle,   color: "text-success" },
                                                { label: "No prazo",        value: entry.noPrazo,      icon: Target,        color: "text-accent" },
                                                { label: "Fora do prazo",   value: entry.foraPrazo,    icon: AlertCircle,   color: "text-danger" },
                                                { label: "Em andamento",    value: entry.emAndamento,  icon: Zap,           color: "text-warning" },
                                                { label: "A fazer",         value: entry.aFazer,       icon: Clock,         color: "text-text-muted" },
                                                { label: "Taxa entrega",    value: `${entry.taxaEntrega}%`, icon: Target,  color: "" },
                                                { label: "Taskscore",       value: `${entry.taskscore} pts`, icon: Trophy, color: "text-yellow-400" },
                                            ].map((s) => {
                                                const Icon = s.icon;
                                                return (
                                                    <div key={s.label} className="flex items-center gap-2 rounded-lg border border-border bg-bg-secondary p-3">
                                                        <Icon size={13} className={s.color || "text-text-muted"} />
                                                        <div>
                                                            <p className="text-[10px] text-text-muted">{s.label}</p>
                                                            <p className={`font-mono text-sm font-bold ${s.color || "text-text-primary"}`}>{s.value}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {entry.badges.length > 0 && (
                                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] text-text-muted uppercase tracking-wider">Conquistas:</span>
                                                {entry.badges.map((b) => {
                                                    const cfg = BADGE_CONFIG[b];
                                                    if (!cfg) return null;
                                                    const Icon = cfg.icon;
                                                    return (
                                                        <span key={b} className={`flex items-center gap-1 rounded-full border border-current/20 px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
                                                            <Icon size={10} />{cfg.label}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Team stats */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <Target size={15} className="text-accent" /> Estatísticas da Equipe — {mesLabel}
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[
                        { label: "Tarefas criadas",    value: stats.totalTarefasMes,  icon: Clock,         color: "" },
                        { label: "Concluídas",          value: stats.concluidasMes,    icon: CheckCircle,   color: "text-success" },
                        { label: "Fora do prazo",       value: stats.foraPrazoMes,     icon: AlertCircle,   color: "text-danger" },
                        { label: "Taxa geral",          value: `${stats.taxaGeral}%`,  icon: Target,        color: "text-accent" },
                        { label: "Pontos acumulados",   value: `${stats.taskscoreTotal} pts`, icon: Trophy, color: "text-yellow-400" },
                    ].map((s) => {
                        const Icon = s.icon;
                        return (
                            <div key={s.label} className="rounded-xl border border-border bg-bg-secondary p-4 flex items-center gap-3">
                                <Icon size={16} className={s.color || "text-text-muted"} />
                                <div>
                                    <p className="text-[10px] text-text-muted">{s.label}</p>
                                    <p className={`font-mono font-bold text-sm ${s.color || "text-text-primary"}`}>{s.value}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
