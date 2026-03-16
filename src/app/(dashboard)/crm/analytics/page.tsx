"use client";

import React from "react";
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    CartesianGrid,
    XAxis,
    YAxis,
    BarChart,
    Bar,
    LineChart,
    Line,
    RadialBarChart,
    RadialBar,
} from "recharts";
import { TrendingUp, Send, Clock3, Target, Download, RefreshCw, Star, Flame, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCRMAnalytics, type CRMAnalyticsPeriod } from "@/actions/crm-analytics";

type AnalyticsPayload = NonNullable<Awaited<ReturnType<typeof getCRMAnalytics>>["data"]>;

type ScoringData = {
    totalWithScore: number;
    avgScore: number;
    buckets: { range: string; count: number; label: string }[];
    topLeads: { id: string; nome: string; score: number; relationship: string | null; hasEmail: boolean; hasWhatsapp: boolean }[];
    byRelationship: { relationship: string; count: number; avgScore: number }[];
};

const COLORS = ["#f59e0b", "#38bdf8", "#4ade80", "#f87171", "#a78bfa", "#22d3ee", "#f97316"];

function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatPercent(value: number) {
    return `${value.toFixed(1)}%`;
}

export default function AnalyticsDashboard() {
    const [period, setPeriod] = React.useState<CRMAnalyticsPeriod>(30);
    const [loading, setLoading] = React.useState(true);
    const [analytics, setAnalytics] = React.useState<AnalyticsPayload | null>(null);
    const [scoring, setScoring] = React.useState<ScoringData | null>(null);

    const loadAnalytics = React.useCallback(async (targetPeriod: CRMAnalyticsPeriod) => {
        setLoading(true);
        const [res, scoreRes] = await Promise.all([
            getCRMAnalytics({ periodDays: targetPeriod }),
            fetch("/api/crm/contatos/scoring").then(r => r.json()).catch(() => null),
        ]);
        if (res.success) setAnalytics(res.data);
        if (scoreRes) setScoring(scoreRes as ScoringData);
        setLoading(false);
    }, []);

    React.useEffect(() => {
        void loadAnalytics(period);
    }, [period, loadAnalytics]);

    const exportCsv = () => {
        if (!analytics) return;

        const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
        const row = (cols: (string | number)[]) => cols.map(c => esc(String(c))).join(",");

        const sections: string[] = [];

        // ── Secao 1: metricas gerais ──────────────────────────────────────
        sections.push(
            row(["=== METRICAS GERAIS ==="]),
            row(["metrica", "valor"]),
            row(["periodo_dias", analytics.periodDays]),
            row(["total_funil", analytics.metrics.totalFunilValue]),
            row(["receita_ponderada", analytics.metrics.weightedRevenue]),
            row(["oportunidades", analytics.metrics.totalOportunidades]),
            row(["ganhas", analytics.metrics.wonCount]),
            row(["perdidas", analytics.metrics.lostCount]),
            row(["conversao_oportunidade_contrato", analytics.metrics.conversaoOportunidadeContrato]),
            "",
        );

        // ── Secao 2: cadencia diaria ──────────────────────────────────────
        sections.push(
            row(["=== CADENCIA DIARIA ==="]),
            row(["data", "oportunidades_criadas", "oportunidades_ganhas", "atividades", "campanhas_enviadas"]),
            ...analytics.cadence.map(item => row([
                item.date,
                item.oportunidadesCriadas,
                item.oportunidadesGanhas,
                item.atividades,
                item.campanhasEnviadas,
            ])),
            "",
        );

        // ── Secao 3: lead scoring ─────────────────────────────────────────
        if (scoring) {
            sections.push(
                row(["=== LEAD SCORING ==="]),
                row(["score_medio", scoring.avgScore]),
                row(["total_contatos_com_score", scoring.totalWithScore]),
                "",
                row(["=== DISTRIBUICAO DE SCORE ==="]),
                row(["faixa", "label", "contatos"]),
                ...scoring.buckets.map(b => row([b.range, b.label, b.count])),
                "",
                row(["=== SCORE POR ESTAGIO ==="]),
                row(["estagio", "contatos", "score_medio"]),
                ...scoring.byRelationship.map(r => row([r.relationship, r.count, r.avgScore])),
                "",
                row(["=== TOP 20 LEADS POR SCORE ==="]),
                row(["nome", "score", "estagio", "tem_email", "tem_whatsapp"]),
                ...scoring.topLeads.map(l => row([
                    l.nome,
                    l.score,
                    l.relationship ?? "",
                    l.hasEmail ? "Sim" : "Não",
                    l.hasWhatsapp ? "Sim" : "Não",
                ])),
            );
        }

        const csv = sections.join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `crm-analytics-${analytics.periodDays}d-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-bg-primary">
            <div className="flex-1 flex flex-col h-full overflow-y-auto p-8 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary tracking-tight">Analytics do CRM</h1>
                        <p className="text-text-muted mt-1">Conversao, previsao de receita, origem e performance comercial.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-bg-secondary border border-border rounded-sm p-1">
                            {[7, 30, 90].map((value) => (
                                <button
                                    key={value}
                                    onClick={() => setPeriod(value as CRMAnalyticsPeriod)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors ${
                                        period === value ? "bg-accent text-[#090705]" : "text-text-muted hover:text-text-primary"
                                    }`}
                                >
                                    {value}d
                                </button>
                            ))}
                        </div>
                        <Button variant="outline" className="gap-2 border-border bg-bg-secondary" onClick={() => loadAnalytics(period)}>
                            <RefreshCw size={15} /> Atualizar
                        </Button>
                        <Button variant="gradient" className="gap-2 font-bold shadow-glow" onClick={exportCsv}>
                            <Download size={16} /> Exportar CSV
                        </Button>
                    </div>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
                    </div>
                )}

                {!loading && !analytics && (
                    <div className="glass-card p-8 text-center text-text-muted">Nao foi possivel carregar os dados do CRM.</div>
                )}

                {!loading && analytics && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <div className="glass-card p-5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-text-muted">Receita no Funil</p>
                                        <h3 className="text-2xl font-bold text-text-primary mt-1">{formatCurrency(analytics.metrics.totalFunilValue)}</h3>
                                    </div>
                                    <div className="p-2 bg-success/10 rounded-sm text-success"><TrendingUp size={20} /></div>
                                </div>
                                <p className="text-xs text-text-muted mt-4">Ponderada: {formatCurrency(analytics.metrics.weightedRevenue)}</p>
                            </div>

                            <div className="glass-card p-5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-text-muted">Conversao Oportunidade</p>
                                        <h3 className="text-2xl font-bold text-text-primary mt-1">{formatPercent(analytics.metrics.conversaoOportunidadeContrato)}</h3>
                                    </div>
                                    <div className="p-2 bg-blue-500/10 rounded-sm text-blue-400"><Target size={20} /></div>
                                </div>
                                <p className="text-xs text-text-muted mt-4">
                                    Ganhas: {analytics.metrics.wonCount} | Perdidas: {analytics.metrics.lostCount}
                                </p>
                            </div>

                            <div className="glass-card p-5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-text-muted">Campanhas (Entrega)</p>
                                        <h3 className="text-2xl font-bold text-text-primary mt-1">{formatPercent(analytics.metrics.taxaEntregabilidadeCampanha)}</h3>
                                    </div>
                                    <div className="p-2 bg-cyan-500/10 rounded-sm text-cyan-400"><Send size={20} /></div>
                                </div>
                                <p className="text-xs text-text-muted mt-4">
                                    Enviadas: {analytics.metrics.totalSent} | Falhas: {analytics.metrics.totalFailed}
                                </p>
                            </div>

                            <div className="glass-card p-5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-text-muted">SLA de Resposta</p>
                                        <h3 className="text-2xl font-bold text-text-primary mt-1">{analytics.metrics.tempoMedioPrimeiraRespostaHoras.toFixed(1)}h</h3>
                                    </div>
                                    <div className="p-2 bg-amber-500/10 rounded-sm text-amber-400"><Clock3 size={20} /></div>
                                </div>
                                <p className="text-xs text-text-muted mt-4">
                                    Fechamento medio: {analytics.metrics.tempoMedioFechamentoDias.toFixed(1)} dias
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <div className="glass-card p-6 xl:col-span-2">
                                <h3 className="text-lg font-bold text-text-primary mb-2">Cadencia comercial</h3>
                                <p className="text-sm text-text-muted mb-5">Evolucao diaria de oportunidades, ganhos, atividades e envios.</p>
                                <div className="w-full h-[320px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={analytics.cadence}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                                            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                                            <Tooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="oportunidadesCriadas" stroke="#f59e0b" strokeWidth={2} dot={false} name="Oportunidades criadas" />
                                            <Line type="monotone" dataKey="oportunidadesGanhas" stroke="#22c55e" strokeWidth={2} dot={false} name="Oportunidades ganhas" />
                                            <Line type="monotone" dataKey="atividades" stroke="#38bdf8" strokeWidth={2} dot={false} name="Atividades" />
                                            <Line type="monotone" dataKey="campanhasEnviadas" stroke="#a855f7" strokeWidth={2} dot={false} name="Campanhas enviadas" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="glass-card p-6">
                                <h3 className="text-lg font-bold text-text-primary mb-2">Funil por etapa</h3>
                                <p className="text-sm text-text-muted mb-5">Distribuicao atual das oportunidades.</p>
                                <div className="w-full h-[320px]">
                                    {analytics.pipelineData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={analytics.pipelineData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={95} paddingAngle={2}>
                                                    {analytics.pipelineData.map((entry, index) => (
                                                        <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-text-muted">Sem dados de funil.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <div className="glass-card p-6">
                                <h3 className="text-lg font-bold text-text-primary mb-2">Performance por area</h3>
                                <p className="text-sm text-text-muted mb-5">Conversao e receita ponderada por area do Direito.</p>
                                <div className="w-full h-[320px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.byArea.slice(0, 8)}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                            <XAxis dataKey="area" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="oportunidades" fill="#38bdf8" name="Oportunidades" />
                                            <Bar dataKey="ganhos" fill="#22c55e" name="Ganhos" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="glass-card p-6">
                                <h3 className="text-lg font-bold text-text-primary mb-2">Origem dos clientes</h3>
                                <p className="text-sm text-text-muted mb-5">Top origens por volume e taxa de ganho.</p>
                                <div className="overflow-auto max-h-[320px]">
                                    <table className="w-full text-sm">
                                        <thead className="text-left text-xs uppercase text-text-muted border-b border-border">
                                            <tr>
                                                <th className="py-2">Origem</th>
                                                <th className="py-2">Total</th>
                                                <th className="py-2">Ganhos</th>
                                                <th className="py-2">Conversao</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analytics.byOrigem.slice(0, 12).map((item) => (
                                                <tr key={item.origem} className="border-b border-border/40">
                                                    <td className="py-2 text-text-primary">{item.origem}</td>
                                                    <td className="py-2">{item.total}</td>
                                                    <td className="py-2">{item.ganhos}</td>
                                                    <td className="py-2">{formatPercent(item.taxaConversao)}</td>
                                                </tr>
                                            ))}
                                            {analytics.byOrigem.length === 0 && (
                                                <tr>
                                                    <td className="py-4 text-text-muted" colSpan={4}>
                                                        Sem dados de origem no periodo.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6">
                            <h3 className="text-lg font-bold text-text-primary mb-2">Responsaveis comerciais</h3>
                            <p className="text-sm text-text-muted mb-5">Ranking por receita ponderada e taxa de ganho.</p>
                            <div className="overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-xs uppercase text-text-muted border-b border-border">
                                        <tr>
                                            <th className="py-2">Responsavel</th>
                                            <th className="py-2">Oportunidades</th>
                                            <th className="py-2">Ganhos</th>
                                            <th className="py-2">Conversao</th>
                                            <th className="py-2">Receita Ponderada</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analytics.byResponsavel.slice(0, 15).map((item) => (
                                            <tr key={item.ownerId} className="border-b border-border/40">
                                                <td className="py-2 text-text-primary">{item.ownerName}</td>
                                                <td className="py-2">{item.oportunidades}</td>
                                                <td className="py-2">{item.ganhos}</td>
                                                <td className="py-2">{formatPercent(item.taxaConversao)}</td>
                                                <td className="py-2">{formatCurrency(item.receitaPonderada)}</td>
                                            </tr>
                                        ))}
                                        {analytics.byResponsavel.length === 0 && (
                                                <tr>
                                                    <td className="py-4 text-text-muted" colSpan={5}>
                                                        Sem responsaveis no periodo.
                                                    </td>
                                                </tr>
                                            )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Lead Scoring Panel */}
                        {scoring && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Flame size={18} className="text-accent" />
                                    <h2 className="text-xl font-bold text-text-primary">Lead Scoring</h2>
                                    <span className="text-sm text-text-muted">— Distribuição e top leads por pontuação</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* KPI Cards */}
                                    <div className="glass-card p-5 flex items-center gap-4">
                                        <div className="p-3 bg-accent/10 rounded-xl">
                                            <Star size={22} className="text-accent" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-text-muted">Score Médio</p>
                                            <p className="text-2xl font-bold text-text-primary">{scoring.avgScore}</p>
                                            <p className="text-xs text-text-muted">{scoring.totalWithScore} contatos com score</p>
                                        </div>
                                    </div>

                                    {/* Score buckets */}
                                    <div className="glass-card p-5 md:col-span-2">
                                        <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-1">
                                            <Thermometer size={14} className="text-accent" /> Distribuição de Score
                                        </h3>
                                        <div className="space-y-2">
                                            {scoring.buckets.map((bucket, i) => {
                                                const colors = ["#94a3b8", "#38bdf8", "#fbbf24", "#f97316", "#ef4444"];
                                                const maxCount = Math.max(...scoring.buckets.map(b => b.count), 1);
                                                const pct = Math.round((bucket.count / maxCount) * 100);
                                                return (
                                                    <div key={bucket.range} className="flex items-center gap-3 text-sm">
                                                        <span className="w-20 text-xs text-text-muted shrink-0">{bucket.range}</span>
                                                        <div className="flex-1 h-5 bg-border rounded-sm overflow-hidden">
                                                            <div
                                                                className="h-full rounded-sm transition-all duration-500"
                                                                style={{ width: `${pct}%`, background: colors[i] }}
                                                            />
                                                        </div>
                                                        <span className="w-8 text-xs text-right font-mono text-text-secondary">{bucket.count}</span>
                                                        <span className="text-xs text-text-muted w-24 shrink-0">{bucket.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    {/* Top Leads */}
                                    <div className="glass-card p-6">
                                        <h3 className="text-lg font-bold text-text-primary mb-4">Top 20 Leads por Score</h3>
                                        <div className="overflow-auto max-h-80">
                                            <table className="w-full text-sm">
                                                <thead className="text-left text-xs uppercase text-text-muted border-b border-border">
                                                    <tr>
                                                        <th className="py-2">#</th>
                                                        <th className="py-2">Nome</th>
                                                        <th className="py-2">Estágio</th>
                                                        <th className="py-2 text-right">Score</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {scoring.topLeads.map((lead, i) => (
                                                        <tr key={lead.id} className="border-b border-border/40 hover:bg-bg-elevated/50 transition-colors">
                                                            <td className="py-2 text-text-muted font-mono text-xs">{i + 1}</td>
                                                            <td className="py-2 text-text-primary font-medium">
                                                                <a href={`/crm/contatos/${lead.id}`} className="hover:text-accent transition-colors">
                                                                    {lead.nome}
                                                                </a>
                                                            </td>
                                                            <td className="py-2">
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-info/10 text-info border border-info/20">
                                                                    {lead.relationship ?? "—"}
                                                                </span>
                                                            </td>
                                                            <td className="py-2 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <div className="w-16 h-1.5 rounded bg-border overflow-hidden">
                                                                        <div
                                                                            className="h-full rounded"
                                                                            style={{
                                                                                width: `${lead.score}%`,
                                                                                background: lead.score >= 80 ? "#ef4444" : lead.score >= 60 ? "#f97316" : lead.score >= 40 ? "#fbbf24" : "#38bdf8",
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <span className="font-bold font-mono text-text-primary w-8 text-right">{lead.score}</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Score by Relationship */}
                                    <div className="glass-card p-6">
                                        <h3 className="text-lg font-bold text-text-primary mb-4">Score por Estágio CRM</h3>
                                        <div className="h-[280px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={scoring.byRelationship}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                                    <XAxis dataKey="relationship" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                                    <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} domain={[0, 100]} />
                                                    <Tooltip
                                                        formatter={(value, name) => [
                                                            name === "avgScore" ? `${value} pts` : value,
                                                            name === "avgScore" ? "Score Médio" : "Contatos"
                                                        ]}
                                                    />
                                                    <Legend formatter={v => v === "avgScore" ? "Score Médio" : "Contatos"} />
                                                    <Bar dataKey="avgScore" fill="#f59e0b" name="avgScore" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="count" fill="#38bdf8" name="count" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
