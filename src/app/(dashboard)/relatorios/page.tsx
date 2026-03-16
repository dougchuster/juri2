import {
    getRelatorioClientes, getRelatorioProcessos, getRelatorioTarefas,
    getRelatorioPrazos, getRelatorioPublicacoes, getRelatorioStats,
} from "@/lib/dal/relatorios";
import { getSession } from "@/actions/auth";
import { RelatoriosPanel } from "@/components/relatorios/relatorios-panel";
import { BarChart3, Users, Scale, CheckSquare, CalendarClock } from "lucide-react";
import { getAdvogados } from "@/lib/dal/processos";

interface Props {
    searchParams: Promise<Record<string, string | string[]>>;
}

export default async function RelatoriosPage({ searchParams }: Props) {
    const params = await searchParams;
    const session = await getSession();
    const visibilityScope = session
        ? { role: session.role, advogadoId: session.advogado?.id || null }
        : undefined;
    const scopedAdvogadoId = visibilityScope?.role === "ADVOGADO" ? visibilityScope.advogadoId : null;

    const deStr  = typeof params.de  === "string" ? params.de  : undefined;
    const ateStr = typeof params.ate === "string" ? params.ate : undefined;

    const filters = {
        de:  deStr  ? new Date(deStr)  : undefined,
        ate: ateStr ? new Date(ateStr) : undefined,
        advogadoId: scopedAdvogadoId || (typeof params.advogadoId === "string" ? params.advogadoId : undefined),
    };

    const [clientes, processos, tarefas, prazos, publicacoes, stats, advogados] = await Promise.all([
        getRelatorioClientes(filters),
        getRelatorioProcessos(filters),
        getRelatorioTarefas(filters),
        getRelatorioPrazos(filters),
        getRelatorioPublicacoes(filters),
        getRelatorioStats(filters),
        scopedAdvogadoId ? [] : getAdvogados(),
    ]);

    const kpis = [
        { label: "Clientes",    value: stats.clientes,    icon: Users,         tone: "cat-neutral" },
        { label: "Processos",   value: stats.processos,   icon: Scale,         tone: "cat-prazos7d" },
        { label: "Tarefas",     value: stats.tarefas,     icon: CheckSquare,   tone: "cat-amber" },
        { label: "Prazos",      value: stats.prazos,      icon: CalendarClock, tone: "cat-warning" },
    ];

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold text-text-primary flex items-center gap-2">
                        <BarChart3 size={22} className="text-accent" /> Relatórios
                    </h1>
                    <p className="text-sm text-text-muted mt-1">Consultas e exportações de dados do sistema</p>
                </div>

                {/* Date filter */}
                <form className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-xs">
                        <span className="text-text-muted">De:</span>
                        <input type="date" name="de" defaultValue={deStr || ""}
                            className="bg-transparent text-text-primary outline-none" />
                    </div>
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-xs">
                        <span className="text-text-muted">Até:</span>
                        <input type="date" name="ate" defaultValue={ateStr || ""}
                            className="bg-transparent text-text-primary outline-none" />
                    </div>
                    {!scopedAdvogadoId && Array.isArray(advogados) && advogados.length > 0 && (
                        <select name="advogadoId" defaultValue={typeof params.advogadoId === "string" ? params.advogadoId : ""}
                            className="rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent">
                            <option value="">Todos advogados</option>
                            {advogados.map((a) => (
                                <option key={a.id} value={a.id}>{a.user.name}</option>
                            ))}
                        </select>
                    )}
                    <button type="submit"
                        className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors">
                        Filtrar
                    </button>
                    {(deStr || ateStr) && (
                        <a href="/relatorios" className="text-xs text-text-muted hover:text-text-primary transition-colors">Limpar</a>
                    )}
                </form>
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

            <RelatoriosPanel
                clientes={JSON.parse(JSON.stringify(clientes))}
                processos={JSON.parse(JSON.stringify(processos))}
                tarefas={JSON.parse(JSON.stringify(tarefas))}
                prazos={JSON.parse(JSON.stringify(prazos))}
                publicacoes={JSON.parse(JSON.stringify(publicacoes))}
                stats={stats}
                advogados={JSON.parse(JSON.stringify(Array.isArray(advogados) ? advogados : []))}
                searchParams={params as Record<string, string>}
            />
        </div>
    );
}
