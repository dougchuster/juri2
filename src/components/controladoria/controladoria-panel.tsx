"use client";

import { useState } from "react";
import Link from "next/link";
import {
    AlertTriangle, TrendingUp, BarChart3, Clock,
    Scale, PieChart, Calendar, Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
    PROSPECCAO: "Prospecção", CONSULTORIA: "Consultoria", AJUIZADO: "Ajuizado",
    EM_ANDAMENTO: "Em Andamento", AUDIENCIA_MARCADA: "Audiência", SENTENCA: "Sentença",
    RECURSO: "Recurso", TRANSITO_JULGADO: "Trânsito", EXECUCAO: "Execução",
    ENCERRADO: "Encerrado", ARQUIVADO: "Arquivado",
};

const TIPO_LABELS: Record<string, string> = {
    JUDICIAL: "Judicial", ADMINISTRATIVO: "Administrativo", CONSULTIVO: "Consultivo",
    SERVICO: "Serviço", PROSPECCAO: "Prospecção",
};

const RISCO_CONFIG: Record<string, { label: string; color: string }> = {
    PROVAVEL: { label: "Provável", color: "text-danger" },
    POSSIVEL: { label: "Possível", color: "text-warning" },
    REMOTO: { label: "Remoto", color: "text-success" },
};

interface EstoqueData {
    total: number; ativos: number; encerrados: number; arquivados: number;
    porStatus: { status: string; count: number }[];
    porTipo: { tipo: string; count: number }[];
}
interface ResultadoData {
    total: number; ganhos: number; perdidos: number; acordos: number;
    desistencias: number; pendentes: number; taxaExito: number;
}
interface ContingenciaData {
    totalValor: number; totalProcessos: number;
    porRisco: { risco: string; valor: number; count: number }[];
}
interface TempoData {
    mediaDias: number; mediaMeses: number;
    porTipo: { tipo: string; mediaDias: number }[];
}
interface EstagnadoItem {
    id: string; numeroCnj: string | null; status: string;
    cliente: { nome: string }; advogado: { user: { name: string | null } };
    faseProcessual: { nome: string } | null; updatedAt: string;
    _count: { movimentacoes: number };
}
interface SafraItem {
    ano: number; total: number; ativos: number; encerrados: number;
    ganhos: number; perdidos: number; acordos: number;
}

interface ControladoriaPanelProps {
    stats: { estoque: EstoqueData; resultados: ResultadoData; contingencia: ContingenciaData; tempoMedio: TempoData; estagnados: number };
    estagnados: EstagnadoItem[];
    safras: SafraItem[];
    contingencia: ContingenciaData;
}

type TabId = "estoque" | "estagnados" | "resultados" | "safras" | "contingencia" | "tempo";

const TABS: { id: TabId; label: string; icon: typeof Scale }[] = [
    { id: "estoque", label: "Estoque", icon: Scale },
    { id: "estagnados", label: "Estagnados", icon: AlertTriangle },
    { id: "resultados", label: "Ganhos/Perdidos", icon: TrendingUp },
    { id: "safras", label: "Safras", icon: Calendar },
    { id: "contingencia", label: "Contingência", icon: Shield },
    { id: "tempo", label: "Tempo Médio", icon: Clock },
];

export function ControladoriaPanel({ stats, estagnados, safras, contingencia }: ControladoriaPanelProps) {
    const [tab, setTab] = useState<TabId>("estoque");

    const now = new Date();

    return (
        <>
            {/* Tab Navigation */}
            <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
                {TABS.map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t.id ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-primary"}`}>
                        <t.icon size={16} />{t.label}
                    </button>
                ))}
            </div>

            {/* ── TAB: Estoque Processual ── */}
            {tab === "estoque" && (
                <div className="grid grid-cols-2 gap-6">
                    {/* Por Status */}
                    <div className="glass-card p-5">
                        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <BarChart3 size={16} className="text-accent" />Por Status
                        </h3>
                        <div className="space-y-2">
                            {stats.estoque.porStatus.sort((a, b) => b.count - a.count).map((item) => {
                                const pct = stats.estoque.total > 0 ? (item.count / stats.estoque.total) * 100 : 0;
                                return (
                                    <div key={item.status} className="flex items-center gap-3">
                                        <span className="text-xs text-text-muted w-28 truncate">{STATUS_LABELS[item.status] || item.status}</span>
                                        <div className="flex-1 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                                            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-xs font-mono text-text-primary w-8 text-right">{item.count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Por Tipo */}
                    <div className="glass-card p-5">
                        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <PieChart size={16} className="text-info" />Por Tipo
                        </h3>
                        <div className="space-y-2">
                            {stats.estoque.porTipo.sort((a, b) => b.count - a.count).map((item) => {
                                const pct = stats.estoque.total > 0 ? (item.count / stats.estoque.total) * 100 : 0;
                                return (
                                    <div key={item.tipo} className="flex items-center gap-3">
                                        <span className="text-xs text-text-muted w-28 truncate">{TIPO_LABELS[item.tipo] || item.tipo}</span>
                                        <div className="flex-1 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                                            <div className="h-full rounded-full bg-info transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-xs font-mono text-text-primary w-8 text-right">{item.count}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4 text-center">
                            <div><span className="text-lg font-bold text-text-primary">{stats.estoque.ativos}</span><p className="text-[10px] text-text-muted">Ativos</p></div>
                            <div><span className="text-lg font-bold text-text-primary">{stats.estoque.encerrados}</span><p className="text-[10px] text-text-muted">Encerrados</p></div>
                            <div><span className="text-lg font-bold text-text-primary">{stats.estoque.arquivados}</span><p className="text-[10px] text-text-muted">Arquivados</p></div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: Estagnados ── */}
            {tab === "estagnados" && (
                <div>
                    {estagnados.length === 0 ? (
                        <div className="rounded-xl border border-border p-12 text-center text-sm text-text-muted bg-bg-secondary">
                            Nenhum processo estagnado (+120 dias sem movimentação).
                        </div>
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border bg-bg-tertiary/50">
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Processo</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Cliente</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Fase</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Responsável</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Parado há</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {estagnados.map((p) => {
                                        const diasParado = Math.round((now.getTime() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
                                        return (
                                            <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg-tertiary transition-colors">
                                                <td className="px-4 py-3">
                                                    <Link href={`/processos/${p.id}`} className="text-sm font-mono text-accent hover:underline">
                                                        {p.numeroCnj || "Sem nº"}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-text-primary">{p.cliente.nome}</td>
                                                <td className="px-4 py-3"><Badge variant="default">{p.faseProcessual?.nome || p.status}</Badge></td>
                                                <td className="px-4 py-3 text-sm text-text-secondary">{p.advogado.user.name}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-sm font-bold ${diasParado > 180 ? "text-danger" : "text-warning"}`}>
                                                        {diasParado} dias
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB: Resultados ── */}
            {tab === "resultados" && (
                <div className="grid grid-cols-2 gap-6">
                    <div className="glass-card p-5">
                        <h3 className="text-sm font-semibold text-text-primary mb-4">Resultados Processuais</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 rounded-lg bg-success/5 border border-success/20">
                                <span className="text-3xl font-bold text-success">{stats.resultados.ganhos}</span>
                                <p className="text-xs text-text-muted mt-1">Ganhos</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-danger/5 border border-danger/20">
                                <span className="text-3xl font-bold text-danger">{stats.resultados.perdidos}</span>
                                <p className="text-xs text-text-muted mt-1">Perdidos</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-info/5 border border-info/20">
                                <span className="text-3xl font-bold text-info">{stats.resultados.acordos}</span>
                                <p className="text-xs text-text-muted mt-1">Acordos</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-warning/5 border border-warning/20">
                                <span className="text-3xl font-bold text-warning">{stats.resultados.desistencias}</span>
                                <p className="text-xs text-text-muted mt-1">Desistências</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass-card p-5 flex flex-col items-center justify-center">
                        <div className="text-center">
                            <span className="text-6xl font-bold text-accent">{stats.resultados.taxaExito}%</span>
                            <p className="text-sm text-text-muted mt-2">Taxa de Êxito</p>
                            <p className="text-xs text-text-muted">(Ganhos + Acordos) / Total Encerrados</p>
                        </div>
                        <p className="text-xs text-text-muted mt-4">Total encerrados: {stats.resultados.total}</p>
                    </div>
                </div>
            )}

            {/* ── TAB: Safras ── */}
            {tab === "safras" && (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-bg-tertiary/50">
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Safra (Ano)</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Total</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Ativos</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Encerrados</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Ganhos</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Perdidos</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Acordos</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Taxa Êxito</th>
                            </tr>
                        </thead>
                        <tbody>
                            {safras.length === 0 ? (
                                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-text-muted">Nenhum processo registrado.</td></tr>
                            ) : safras.map((s) => {
                                const taxa = s.encerrados > 0 ? Math.round(((s.ganhos + s.acordos) / s.encerrados) * 100) : 0;
                                return (
                                    <tr key={s.ano} className="border-b border-border last:border-0 hover:bg-bg-tertiary transition-colors">
                                        <td className="px-4 py-3 text-sm font-bold text-text-primary">{s.ano}</td>
                                        <td className="px-4 py-3 text-sm text-right font-mono text-text-primary">{s.total}</td>
                                        <td className="px-4 py-3 text-sm text-right font-mono text-accent">{s.ativos}</td>
                                        <td className="px-4 py-3 text-sm text-right font-mono text-text-muted">{s.encerrados}</td>
                                        <td className="px-4 py-3 text-sm text-right font-mono text-success">{s.ganhos}</td>
                                        <td className="px-4 py-3 text-sm text-right font-mono text-danger">{s.perdidos}</td>
                                        <td className="px-4 py-3 text-sm text-right font-mono text-info">{s.acordos}</td>
                                        <td className="px-4 py-3 text-sm text-right font-bold">{taxa > 0 ? <span className="text-success">{taxa}%</span> : "—"}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── TAB: Contingência ── */}
            {tab === "contingencia" && (
                <div className="grid grid-cols-2 gap-6">
                    <div className="glass-card p-5">
                        <h3 className="text-sm font-semibold text-text-primary mb-4">Provisão Total</h3>
                        <div className="text-center py-6">
                            <span className="text-4xl font-bold text-text-primary">{formatCurrency(contingencia.totalValor)}</span>
                            <p className="text-sm text-text-muted mt-2">{contingencia.totalProcessos} processos contingenciados</p>
                        </div>
                    </div>
                    <div className="glass-card p-5">
                        <h3 className="text-sm font-semibold text-text-primary mb-4">Por Nível de Risco</h3>
                        <div className="space-y-3">
                            {contingencia.porRisco.length === 0 ? (
                                <p className="text-sm text-text-muted text-center py-4">Nenhum contingenciamento registrado.</p>
                            ) : contingencia.porRisco.map((r) => {
                                const config = RISCO_CONFIG[r.risco] || { label: r.risco, color: "text-text-muted" };
                                return (
                                    <div key={r.risco} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                        <div>
                                            <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                                            <p className="text-xs text-text-muted">{r.count} processos</p>
                                        </div>
                                        <span className="text-sm font-mono text-text-primary">{formatCurrency(r.valor)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: Tempo Médio ── */}
            {tab === "tempo" && (
                <div className="grid grid-cols-2 gap-6">
                    <div className="glass-card p-5 flex flex-col items-center justify-center">
                        <Clock size={32} className="text-accent mb-2" />
                        <span className="text-4xl font-bold text-text-primary">{stats.tempoMedio.mediaDias} dias</span>
                        <p className="text-sm text-text-muted mt-1">≈ {stats.tempoMedio.mediaMeses} meses</p>
                        <p className="text-xs text-text-muted mt-1">Tempo médio de duração dos processos encerrados</p>
                    </div>
                    <div className="glass-card p-5">
                        <h3 className="text-sm font-semibold text-text-primary mb-4">Por Tipo de Processo</h3>
                        <div className="space-y-3">
                            {stats.tempoMedio.porTipo.length === 0 ? (
                                <p className="text-sm text-text-muted text-center py-4">Sem dados suficientes.</p>
                            ) : stats.tempoMedio.porTipo.map((t) => (
                                <div key={t.tipo} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                    <span className="text-sm text-text-muted">{TIPO_LABELS[t.tipo] || t.tipo}</span>
                                    <span className="text-sm font-mono font-bold text-text-primary">{t.mediaDias} dias</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
