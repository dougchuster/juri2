import { getLeaderboard, getProdutividadeStats } from "@/lib/dal/produtividade";
import { getSession } from "@/actions/auth";
import { Leaderboard } from "@/components/produtividade/leaderboard";
import { Trophy, CheckCircle, Target, Zap } from "lucide-react";

interface Props {
    searchParams: Promise<Record<string, string | string[]>>;
}

const MES_LABELS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function ProdutividadePage({ searchParams }: Props) {
    const params = await searchParams;
    await getSession();

    const now = new Date();
    const mes = typeof params.mes === "string" ? parseInt(params.mes) : now.getMonth() + 1;
    const ano = typeof params.ano === "string" ? parseInt(params.ano) : now.getFullYear();

    const [leaderboard, stats] = await Promise.all([
        getLeaderboard(mes, ano),
        getProdutividadeStats(),
    ]);

    const mesLabel = `${MES_LABELS[mes - 1]} ${ano}`;
    const topPlayer = leaderboard[0];

    const kpis = [
        { label: "Taskscore Total",  value: stats.taskscoreTotal,   icon: Trophy,       tone: "cat-success" },
        { label: "Tarefas no Mês",   value: stats.totalTarefasMes,  icon: Zap,          tone: "cat-neutral" },
        { label: "Concluídas",       value: stats.concluidasMes,    icon: CheckCircle,  tone: "cat-prazos7d" },
        { label: "Taxa Geral",       value: `${stats.taxaGeral}%`,  icon: Target,       tone: "cat-amber" },
    ];

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold text-text-primary flex items-center gap-2">
                        Produtividade
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-400/15 text-yellow-400 uppercase tracking-wider">Taskscore</span>
                    </h1>
                    <p className="text-sm text-text-muted mt-1">
                        Ranking de produtividade por pontuação — {mesLabel}
                        {topPlayer && topPlayer.taskscore > 0 && (
                            <span className="ml-2 text-yellow-400 font-medium">🏆 Líder: {topPlayer.nome.split(" ")[0]} ({topPlayer.taskscore} pts)</span>
                        )}
                    </p>
                </div>

                {/* Month/year navigation */}
                <div className="flex items-center gap-2">
                    <form className="flex items-center gap-2">
                        <select name="mes" defaultValue={mes}
                            className="rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent">
                            {MES_LABELS.map((m, i) => (
                                <option key={i} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <select name="ano" defaultValue={ano}
                            className="rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent">
                            {[ano - 1, ano, ano + 1].map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <button type="submit"
                            className="rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-sm text-text-primary hover:bg-bg-tertiary transition-colors">
                            Filtrar
                        </button>
                    </form>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className={`glass-card kpi-card p-5 ${kpi.tone}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{kpi.label}</span>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg adv-icon-badge">
                                <kpi.icon size={15} strokeWidth={1.75} className="text-text-primary" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-text-primary font-mono">{kpi.value}</p>
                    </div>
                ))}
            </div>

            <Leaderboard
                leaderboard={JSON.parse(JSON.stringify(leaderboard))}
                stats={stats}
                mesLabel={mesLabel}
            />
        </div>
    );
}
