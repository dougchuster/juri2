import Link from "next/link";
import { BarChart3, Download, Filter } from "lucide-react";
import { AdminBIRefreshActions } from "@/components/admin/admin-bi-refresh-actions";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getBIDashboardData, getLatestBIRefreshRun, type BIDashboardFilters } from "@/lib/dal/bi";
import { formatCurrency, formatDate } from "@/lib/utils";

type SearchParamsInput = Record<string, string | string[] | undefined>;

function getFirstValue(value?: string | string[]) {
    return Array.isArray(value) ? value[0] : value;
}

function parseDateValue(value?: string) {
    if (!value) return undefined;
    const parsed = new Date(`${value}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseTopN(value?: string) {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function buildFilters(searchParams: SearchParamsInput): BIDashboardFilters {
    return {
        snapshotDate: parseDateValue(getFirstValue(searchParams.snapshotDate)),
        rangeFrom: parseDateValue(getFirstValue(searchParams.rangeFrom)),
        rangeTo: parseDateValue(getFirstValue(searchParams.rangeTo)),
        lawyerQuery: getFirstValue(searchParams.lawyer)?.trim() || undefined,
        clientQuery: getFirstValue(searchParams.client)?.trim() || undefined,
        tribunalQuery: getFirstValue(searchParams.tribunal)?.trim() || undefined,
        topN: parseTopN(getFirstValue(searchParams.topN)),
    };
}

function formatMetricValue(metricKey: string, value: number) {
    if (metricKey.includes("PERCENT")) return `${value.toFixed(1)}%`;
    if (metricKey.includes("TOTAL")) return formatCurrency(value);
    if (metricKey.includes("HORAS")) return `${value.toFixed(1)}h`;
    if (metricKey.includes("DIAS")) return `${value.toFixed(0)}d`;
    return value.toLocaleString("pt-BR");
}

function formatDelta(metricKey: string, deltaValue: number | null, deltaPercent: number | null) {
    if (deltaValue === null) return "Sem base anterior";

    if (metricKey.includes("PERCENT")) {
        return `${deltaValue >= 0 ? "+" : ""}${deltaValue.toFixed(1)} p.p.`;
    }

    if (metricKey.includes("TOTAL")) {
        return `${deltaValue >= 0 ? "+" : ""}${formatCurrency(deltaValue)}`;
    }

    if (metricKey.includes("HORAS")) {
        return `${deltaValue >= 0 ? "+" : ""}${deltaValue.toFixed(1)}h`;
    }

    if (metricKey.includes("DIAS")) {
        return `${deltaValue >= 0 ? "+" : ""}${deltaValue.toFixed(0)}d`;
    }

    const suffix = deltaPercent === null ? "" : ` (${deltaPercent >= 0 ? "+" : ""}${deltaPercent.toFixed(1)}%)`;
    return `${deltaValue >= 0 ? "+" : ""}${deltaValue.toLocaleString("pt-BR")}${suffix}`;
}

function dateInputValue(date?: Date | null) {
    return date ? date.toISOString().slice(0, 10) : "";
}

function buildExportHref(searchParams: SearchParamsInput) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(searchParams)) {
        const firstValue = getFirstValue(value);
        if (firstValue) params.set(key, firstValue);
    }

    const query = params.toString();
    return `/api/admin/bi/export${query ? `?${query}` : ""}`;
}

export default async function AdminBIPage({
    searchParams,
}: {
    searchParams?: Promise<SearchParamsInput>;
}) {
    const resolvedSearchParams = (await searchParams) || {};
    const filters = buildFilters(resolvedSearchParams);
    const [dashboard, latestRun] = await Promise.all([
        getBIDashboardData(filters),
        getLatestBIRefreshRun(),
    ]);

    const currentTopN = String(filters.topN || 8);

    return (
        <div className="space-y-6 px-4 py-4 md:px-6 md:py-6">
            <AdminPageHeader
                title="BI Interno"
                description="Painel gerencial com snapshots historicos, filtros de leitura e exportacao do recorte atual."
                icon={BarChart3}
                backHref="/admin"
                backLabel="Voltar para administracao"
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            href={buildExportHref(resolvedSearchParams)}
                            className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--card-border)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-soft)]"
                        >
                            <Download size={16} className="mr-2" />
                            Exportar CSV
                        </Link>
                        <AdminBIRefreshActions />
                    </div>
                }
            />

            <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                <div className="mb-4 flex items-center gap-2">
                    <Filter size={16} className="text-[var(--text-secondary)]" />
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Filtros gerenciais</h2>
                </div>

                <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_1fr_1fr_1fr_120px_auto]">
                    <select
                        name="snapshotDate"
                        defaultValue={dateInputValue(filters.snapshotDate || dashboard.snapshotDate)}
                        className="h-11 rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    >
                        {dashboard.availableSnapshots.map((snapshot) => (
                            <option key={snapshot.toISOString()} value={dateInputValue(snapshot)}>
                                {formatDate(snapshot.toISOString())}
                            </option>
                        ))}
                    </select>
                    <input
                        type="date"
                        name="rangeFrom"
                        defaultValue={dateInputValue(filters.rangeFrom || dashboard.rangeFrom)}
                        className="h-11 rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    />
                    <input
                        type="date"
                        name="rangeTo"
                        defaultValue={dateInputValue(filters.rangeTo || dashboard.rangeTo)}
                        className="h-11 rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    />
                    <input
                        type="search"
                        name="lawyer"
                        defaultValue={filters.lawyerQuery || ""}
                        placeholder="Filtrar advogado"
                        className="h-11 rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    />
                    <input
                        type="search"
                        name="client"
                        defaultValue={filters.clientQuery || ""}
                        placeholder="Filtrar cliente"
                        className="h-11 rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    />
                    <input
                        type="search"
                        name="tribunal"
                        defaultValue={filters.tribunalQuery || ""}
                        placeholder="Filtrar tribunal"
                        className="h-11 rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    />
                    <input
                        type="number"
                        name="topN"
                        min={3}
                        max={20}
                        defaultValue={currentTopN}
                        className="h-11 rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    />
                    <button
                        type="submit"
                        className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:opacity-95"
                    >
                        Aplicar
                    </button>
                </form>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {dashboard.globalMetrics.slice(0, 10).map((metric) => (
                    <div
                        key={metric.metricKey}
                        className="glass-card rounded-[24px] border border-[var(--card-border)] p-5"
                    >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                            {metric.label}
                        </p>
                        <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                            {formatMetricValue(metric.metricKey, metric.value)}
                        </p>
                        <p className="mt-2 text-xs text-[var(--text-secondary)]">
                            {formatDelta(metric.metricKey, metric.deltaValue, metric.deltaPercent)}
                        </p>
                    </div>
                ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <article className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Comparativos historicos</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Serie temporal por snapshot para acompanhar variacao gerencial do escritorio.
                        </p>
                    </div>

                    <div className="mt-5 space-y-4">
                        {dashboard.historicalSeries.map((series) => {
                            const maxValue = Math.max(...series.points.map((point) => point.value), 1);
                            return (
                                <div
                                    key={series.metricKey}
                                    className="rounded-[22px] border border-[var(--card-border)] bg-[var(--surface-soft)] p-4"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">{series.label}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">{series.points.length} snapshots</p>
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        {series.points.length === 0 ? (
                                            <p className="text-sm text-[var(--text-secondary)]">Sem historico no periodo selecionado.</p>
                                        ) : (
                                            series.points.map((point) => (
                                                <div key={`${series.metricKey}-${point.date.toISOString()}`} className="grid grid-cols-[88px_1fr_92px] items-center gap-3 text-xs">
                                                    <span className="text-[var(--text-secondary)]">
                                                        {formatDate(point.date.toISOString())}
                                                    </span>
                                                    <div className="h-2 rounded-full bg-[var(--card-border)]">
                                                        <div
                                                            className="h-2 rounded-full bg-[var(--accent)]"
                                                            style={{ width: `${Math.max((point.value / maxValue) * 100, 6)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-right font-medium text-[var(--text-primary)]">
                                                        {formatMetricValue(series.metricKey, point.value)}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </article>

                <article className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Carteira e aging</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Distribuicao dos processos ativos por faixa de idade da carteira.
                        </p>
                    </div>

                    <div className="mt-5 space-y-3">
                        {dashboard.agingBuckets.map((bucket) => {
                            const maxCount = Math.max(...dashboard.agingBuckets.map((item) => item.count), 1);
                            return (
                                <div key={bucket.label} className="rounded-[20px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-3">
                                    <div className="flex items-center justify-between gap-4">
                                        <p className="font-medium text-[var(--text-primary)]">{bucket.label}</p>
                                        <p className="text-sm text-[var(--text-secondary)]">{bucket.count} processos</p>
                                    </div>
                                    <div className="mt-3 h-2 rounded-full bg-[var(--card-border)]">
                                        <div
                                            className="h-2 rounded-full bg-[var(--accent)]"
                                            style={{ width: `${Math.max((bucket.count / maxCount) * 100, bucket.count > 0 ? 6 : 0)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </article>
            </section>

            <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[22px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                            Snapshot selecionado
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                            {dashboard.snapshotDate ? formatDate(dashboard.snapshotDate.toISOString()) : "Sem snapshot"}
                        </p>
                    </div>
                    <div className="rounded-[22px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                            Ultimo refresh
                        </p>
                        <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                            {latestRun?.startedAt ? formatDate(latestRun.startedAt.toISOString()) : "Nunca executado"}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            Status: {latestRun?.status || "N/A"}
                        </p>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
                <article className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Produtividade por advogado</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Recorte consolidado de tarefas concluidas e horas registradas nos ultimos 30 dias.
                        </p>
                    </div>
                    <div className="mt-4 space-y-3">
                        {dashboard.byLawyerTasks.map((item) => {
                            const hours = dashboard.byLawyerHours.find((hourItem) => hourItem.label === item.label)?.value || 0;
                            return (
                                <div key={item.label} className="rounded-[20px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-3">
                                    <div className="flex items-center justify-between gap-4">
                                        <p className="font-medium text-[var(--text-primary)]">{item.label}</p>
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            {item.value.toLocaleString("pt-BR")} tarefas / {hours.toFixed(1)}h
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </article>

                <article className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Jurimetria por tipo de processo</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Benchmark juridico combinando encerrados, ativos, exito, estagnacao e contingencia.
                        </p>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--card-border)] text-sm">
                            <thead className="bg-[var(--surface-soft)] text-left text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Tipo</th>
                                    <th className="px-4 py-3 font-semibold">Encerrados</th>
                                    <th className="px-4 py-3 font-semibold">Ativos</th>
                                    <th className="px-4 py-3 font-semibold">Taxa de exito</th>
                                    <th className="px-4 py-3 font-semibold">Tempo medio</th>
                                    <th className="px-4 py-3 font-semibold">Estagnados</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--card-border)]">
                                {dashboard.processTypeBenchmarks.map((item) => {
                                    return (
                                        <tr key={item.label}>
                                            <td className="px-4 py-4 font-medium text-[var(--text-primary)]">{item.label}</td>
                                            <td className="px-4 py-4 text-[var(--text-secondary)]">{item.totalClosed}</td>
                                            <td className="px-4 py-4 text-[var(--text-secondary)]">{item.activeCount}</td>
                                            <td className="px-4 py-4 text-[var(--text-secondary)]">{item.successRate.toFixed(1)}%</td>
                                            <td className="px-4 py-4 text-[var(--text-secondary)]">{item.averageClosureDays.toFixed(0)} dias</td>
                                            <td className="px-4 py-4 text-[var(--text-secondary)]">
                                                {item.stagnatedCount} ({item.stagnatedRate.toFixed(0)}%)
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </article>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
                <article className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Jurimetria por tribunal</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Recorte juridico por tribunal para comparar volume, exito, tempo medio e estagnacao.
                        </p>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--card-border)] text-sm">
                            <thead className="bg-[var(--surface-soft)] text-left text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Tribunal</th>
                                    <th className="px-4 py-3 font-semibold">Encerrados</th>
                                    <th className="px-4 py-3 font-semibold">Ativos</th>
                                    <th className="px-4 py-3 font-semibold">Exito</th>
                                    <th className="px-4 py-3 font-semibold">Tempo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--card-border)]">
                                {dashboard.byTribunal.map((item) => (
                                    <tr key={item.label}>
                                        <td className="px-4 py-4 font-medium text-[var(--text-primary)]">{item.label}</td>
                                        <td className="px-4 py-4 text-[var(--text-secondary)]">{item.totalClosed}</td>
                                        <td className="px-4 py-4 text-[var(--text-secondary)]">{item.activeCount}</td>
                                        <td className="px-4 py-4 text-[var(--text-secondary)]">{item.successRate.toFixed(1)}%</td>
                                        <td className="px-4 py-4 text-[var(--text-secondary)]">{item.averageClosureDays.toFixed(0)} dias</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </article>

                <article className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Fases processuais ativas</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Onde a carteira esta concentrada e quais fases acumulam mais envelhecimento operacional.
                        </p>
                    </div>
                    <div className="mt-4 space-y-3">
                        {dashboard.phaseDistribution.map((item) => (
                            <div key={item.label} className="rounded-[20px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-3">
                                <div className="flex items-center justify-between gap-4">
                                    <p className="font-medium text-[var(--text-primary)]">{item.label}</p>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        {item.activeCount} ativos / {item.averageAgeDays.toFixed(0)}d idade media
                                    </p>
                                </div>
                                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                                    {item.stagnatedCount} estagnados ({item.stagnatedRate.toFixed(1)}%)
                                </p>
                            </div>
                        ))}
                    </div>
                </article>
            </section>

            <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Alertas operacionais</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Sinais simples de desvio contra a media global para apoiar a leitura juridica do escritorio.
                    </p>
                </div>
                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                    {dashboard.alerts.length === 0 ? (
                        <div className="rounded-[20px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-4 text-sm text-[var(--text-secondary)]">
                            Sem alertas relevantes no recorte atual.
                        </div>
                    ) : (
                        dashboard.alerts.map((alert) => (
                            <div key={`${alert.title}-${alert.dimensionLabel}`} className="rounded-[20px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-4">
                                <div className="flex items-center justify-between gap-4">
                                    <p className="font-medium text-[var(--text-primary)]">{alert.title}</p>
                                    <span
                                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                            alert.severity === "ALTA"
                                                ? "bg-rose-500/15 text-rose-300"
                                                : "bg-amber-500/15 text-amber-300"
                                        }`}
                                    >
                                        {alert.severity}
                                    </span>
                                </div>
                                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                                    {alert.dimensionLabel}
                                </p>
                                <p className="mt-2 text-sm text-[var(--text-secondary)]">{alert.description}</p>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
                <article className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Contingencia por risco</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Valor contingenciado por nivel de risco do recorte atual.
                        </p>
                    </div>
                    <div className="mt-4 space-y-3">
                        {dashboard.byRiskContingency.map((item) => (
                            <div key={item.label} className="rounded-[20px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-3">
                                <div className="flex items-center justify-between gap-4">
                                    <p className="font-medium text-[var(--text-primary)]">{item.label}</p>
                                    <p className="text-sm text-[var(--text-secondary)]">{formatCurrency(item.value)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </article>

                <article className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Clientes com maior recebido</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Ranking de clientes com maior valor efetivamente recebido pelo escritorio.
                        </p>
                    </div>
                    <div className="mt-4 space-y-3">
                        {dashboard.byClientReceived.map((item) => (
                            <div key={item.label} className="rounded-[20px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-3">
                                <div className="flex items-center justify-between gap-4">
                                    <p className="font-medium text-[var(--text-primary)]">{item.label}</p>
                                    <p className="text-sm text-[var(--text-secondary)]">{formatCurrency(item.value)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </article>

                <article className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Clientes com maior a receber</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Carteira com maior saldo pendente segundo o snapshot selecionado.
                        </p>
                    </div>
                    <div className="mt-4 space-y-3">
                        {dashboard.byClientReceivable.map((item) => (
                            <div key={item.label} className="rounded-[20px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-3">
                                <div className="flex items-center justify-between gap-4">
                                    <p className="font-medium text-[var(--text-primary)]">{item.label}</p>
                                    <p className="text-sm text-[var(--text-secondary)]">{formatCurrency(item.value)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </article>
            </section>
        </div>
    );
}
