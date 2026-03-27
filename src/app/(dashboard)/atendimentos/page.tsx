import {
    AlertTriangle,
    BriefcaseBusiness,
    FileSearch,
    Gavel,
    Handshake,
    Scale,
} from "lucide-react";
import { AtendimentoPipeline } from "@/components/atendimentos/atendimento-pipeline";
import { Badge } from "@/components/ui/badge";
import { getAtendimentoStats, getAtendimentosPipeline } from "@/lib/dal/atendimentos";
import { getAdvogados, getClientesForSelect } from "@/lib/dal/processos";
import { formatCurrency } from "@/lib/utils";

export default async function AtendimentosPage() {
    const [pipeline, stats, advogados, clientes] = await Promise.all([
        getAtendimentosPipeline(),
        getAtendimentoStats(),
        getAdvogados(),
        getClientesForSelect(),
    ]);

    const kpis = [
        {
            label: "Novos atendimentos",
            value: stats.novosUltimos7,
            detail: `${stats.variationNovos >= 0 ? "+" : ""}${stats.variationNovos}% vs. 7 dias anteriores`,
            icon: Scale,
            tone: "cat-amber",
        },
        {
            label: "Em analise",
            value: stats.emAnalise,
            detail: "Qualificacao e analise juridica",
            icon: FileSearch,
            tone: "cat-info",
        },
        {
            label: "Propostas pendentes",
            value: stats.propostasPendentes,
            detail: formatCurrency(stats.propostasPendentesValor),
            icon: BriefcaseBusiness,
            tone: "cat-warning",
        },
        {
            label: "Taxa de conversao",
            value: `${stats.taxaConversao}%`,
            detail: "Ultimos 30 dias",
            icon: Handshake,
            tone: "cat-success",
        },
        {
            label: "Contratados no mes",
            value: stats.contratadosMes,
            detail: formatCurrency(stats.contratadosMesValor),
            icon: Gavel,
            tone: "cat-success",
        },
        {
            label: "Alertas de prazo",
            value: stats.alertasPrazo,
            detail: `${stats.semInteracaoCritica} sem interacao critica`,
            icon: AlertTriangle,
            tone: "cat-danger",
        },
    ];

    const topArea = stats.areaDistribution[0];

    return (
        <div className="space-y-6 p-6 animate-fade-in">
            <section className="glass-card relative overflow-hidden rounded-[30px] border border-[var(--border-color)] p-6 md:p-7">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,171,111,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(120,78,52,0.18),transparent_40%)]" />
                <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-text-muted">
                            Painel juridico de atendimento
                        </p>
                        <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.04em] text-text-primary md:text-4xl">
                            Pipeline juridico com foco em prazo, proposta e conversao.
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
                            A pagina agora acompanha a jornada real do atendimento juridico: entrada, qualificacao,
                            analise, proposta, retorno do cliente e contratacao, com contexto de documentacao e valor
                            potencial do caso.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[440px] xl:max-w-[520px]">
                        <div className="surface-soft rounded-[24px] border border-[var(--border-color)] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Pipeline aberto</p>
                            <p className="mt-2 font-mono text-2xl font-bold text-text-primary">{stats.pipelineAbertos}</p>
                            <p className="mt-1 text-xs text-text-muted">Casos em curso antes da contratação ou encerramento.</p>
                        </div>
                        <div className="surface-soft rounded-[24px] border border-[var(--border-color)] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Área dominante</p>
                            <p className="mt-2 text-base font-semibold text-text-primary">{topArea?.label || "Sem dados"}</p>
                            <p className="mt-1 text-xs text-text-muted">{topArea ? `${topArea.value} atendimentos mapeados.` : "Classifique as áreas jurídicas para ver a distribuição."}</p>
                        </div>
                        <div className="surface-soft rounded-[24px] border border-[var(--border-color)] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">SLA de retorno</p>
                            <p className="mt-2 text-base font-semibold text-text-primary">{stats.alertasPrazo} críticos</p>
                            <p className="mt-1 text-xs text-text-muted">Prazos vencendo em até 48h pedem ação imediata.</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className={`glass-card kpi-card rounded-[26px] p-5 ${kpi.tone}`}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{kpi.label}</span>
                            <div className="adv-icon-badge flex h-9 w-9 items-center justify-center rounded-xl">
                                <kpi.icon size={16} strokeWidth={1.75} className="text-text-primary" />
                            </div>
                        </div>
                        <p className="font-mono text-3xl font-bold text-text-primary">{kpi.value}</p>
                        <p className="mt-2 text-xs leading-5 text-text-muted">{kpi.detail}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
                <section className="glass-card rounded-[28px] p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Distribuição por área</p>
                            <h2 className="mt-1 text-lg font-semibold text-text-primary">Áreas do direito mais recorrentes</h2>
                        </div>
                        <Badge variant="muted">{stats.areaDistribution.length} faixas</Badge>
                    </div>
                    <div className="mt-5 space-y-4">
                        {stats.areaDistribution.length === 0 ? (
                            <p className="text-sm text-text-muted">Nenhuma área jurídica classificada ainda.</p>
                        ) : (
                            stats.areaDistribution.map((item) => (
                                <div key={item.label} className="space-y-2">
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <span className="font-medium text-text-primary">{item.label}</span>
                                        <span className="text-text-muted">{item.value}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-[var(--surface-soft)]">
                                        <div
                                            className="h-2 rounded-full bg-[linear-gradient(90deg,var(--accent),color-mix(in_srgb,var(--accent)_44%,white))]"
                                            style={{
                                                width: `${Math.max(12, Math.min(100, (item.value / Math.max(stats.areaDistribution[0]?.value || 1, 1)) * 100))}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section className="glass-card rounded-[28px] p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Equipe</p>
                            <h2 className="mt-1 text-lg font-semibold text-text-primary">Ranking de advogados</h2>
                        </div>
                        <Badge variant="muted">Conversão</Badge>
                    </div>
                    <div className="mt-5 space-y-3">
                        {stats.lawyerRanking.length === 0 ? (
                            <p className="text-sm text-text-muted">Sem distribuição por responsável ainda.</p>
                        ) : (
                            stats.lawyerRanking.map((item) => (
                                <div key={item.label} className="surface-soft rounded-[20px] border border-[var(--border-color)] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                                        <Badge variant={item.taxa >= 35 ? "success" : item.taxa >= 20 ? "warning" : "muted"}>{item.taxa}%</Badge>
                                    </div>
                                    <p className="mt-2 text-xs text-text-muted">
                                        {item.atendimentos} atendimentos | {item.convertidos} convertidos
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section className="glass-card rounded-[28px] p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Risco operacional</p>
                            <h2 className="mt-1 text-lg font-semibold text-text-primary">Tempo medio por fase</h2>
                        </div>
                        <Badge variant="warning">{stats.alertasPrazo} alertas</Badge>
                    </div>
                    <div className="mt-5 space-y-3">
                        {stats.tempoMedioPorFase.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--border-color)] px-4 py-3">
                                <span className="text-sm text-text-secondary">{item.label}</span>
                                <span className="font-mono text-sm font-bold text-text-primary">{item.value}d</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <AtendimentoPipeline
                pipeline={JSON.parse(JSON.stringify(pipeline))}
                advogados={JSON.parse(JSON.stringify(advogados))}
                clientes={JSON.parse(JSON.stringify(clientes))}
                stats={JSON.parse(JSON.stringify(stats))}
            />
        </div>
    );
}
