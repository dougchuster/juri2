import Link from "next/link";
import { AdminJobCenterTable } from "@/components/admin/admin-job-center-table";
import {
    formatJobCenterSourceTypeLabel,
} from "@/components/admin/admin-jobs-center-shared";
import {
    getJobCenterOperationalMetricsSnapshot,
    getJobCenterSummary,
    listJobCenterItems,
    type JobCenterFilters,
    type JobCenterSourceType,
    type JobCenterStatus,
} from "@/lib/services/job-center";

type SearchParamsInput = Record<string, string | string[] | undefined>;

function getFirstValue(value?: string | string[]) {
    return Array.isArray(value) ? value[0] : value;
}

function parseStatus(value?: string): JobCenterStatus | undefined {
    if (!value) return undefined;
    const normalized = value.toUpperCase();
    if (normalized === "QUEUED") return "QUEUED";
    if (normalized === "RUNNING") return "RUNNING";
    if (normalized === "COMPLETED") return "COMPLETED";
    if (normalized === "FAILED") return "FAILED";
    if (normalized === "CANCELLED") return "CANCELLED";
    return undefined;
}

function parseSourceType(value?: string): JobCenterSourceType | undefined {
    if (value === "AUTOMACAO_NACIONAL_JOB" || value === "FLOW_EXECUTION") {
        return value;
    }

    return undefined;
}

function parsePeriodDays(value?: string): JobCenterFilters["periodDays"] | undefined {
    if (value === "1") return 1;
    if (value === "7") return 7;
    if (value === "30") return 30;
    if (value === "90") return 90;
    return undefined;
}

function buildFilters(searchParams: SearchParamsInput): JobCenterFilters {
    const status = parseStatus(getFirstValue(searchParams.status));
    const sourceType = parseSourceType(getFirstValue(searchParams.sourceType));
    const periodDays = parsePeriodDays(getFirstValue(searchParams.period)) || 7;
    const query = getFirstValue(searchParams.q)?.trim() || undefined;

    return {
        ...(status ? { status } : {}),
        ...(sourceType ? { sourceType } : {}),
        periodDays,
        ...(query ? { query } : {}),
    };
}

export default async function AdminJobsPage({
    searchParams,
}: {
    searchParams?: Promise<SearchParamsInput>;
}) {
    const resolvedSearchParams = (await searchParams) || {};
    const filters = buildFilters(resolvedSearchParams);
    const items = await listJobCenterItems(filters, 50);
    const summary = getJobCenterSummary(items);
    const operationalMetrics = await getJobCenterOperationalMetricsSnapshot(filters, items);

    const currentStatus = filters.status || "";
    const currentSourceType = filters.sourceType || "";
    const currentQuery = filters.query || "";
    const currentPeriod = String(filters.periodDays || 7);

    return (
        <div className="space-y-6">
            <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6 shadow-[0_24px_48px_color-mix(in_srgb,var(--shadow-color)_10%,transparent)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                            Administracao
                        </p>
                        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                            Central de Jobs
                        </h1>
                        <p className="max-w-3xl text-sm text-[var(--text-secondary)]">
                            Visao unica de jobs, retries e recuperacao operacional para controladoria e suporte interno.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Link
                            href="/admin/publicacoes"
                            className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--card-border)] px-5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-soft)]"
                        >
                            Voltar para publicacoes
                        </Link>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {[
                    { label: "Total", value: summary.total },
                    { label: "Falharam", value: summary.failed },
                    { label: "Em execucao", value: summary.running },
                    { label: "Concluidos", value: summary.completed },
                    { label: "Na fila", value: summary.queued },
                ].map((item) => (
                    <div
                        key={item.label}
                        className="rounded-[24px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-5"
                    >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                            {item.label}
                        </p>
                        <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                            {item.value}
                        </p>
                    </div>
                ))}
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {[
                    { label: "Acionaveis", value: operationalMetrics.actionableTotal },
                    { label: "Retries manuais", value: operationalMetrics.manualRetryTotal },
                    { label: "Recuperados", value: operationalMetrics.recoveredAfterRetryTotal },
                    { label: "Cancelamentos manuais", value: operationalMetrics.manualCancelTotal },
                    { label: "Sucesso do retry", value: `${operationalMetrics.retrySuccessRate}%` },
                ].map((item) => (
                    <div
                        key={item.label}
                        className="rounded-[24px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-5"
                    >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                            {item.label}
                        </p>
                        <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                            {item.value}
                        </p>
                    </div>
                ))}
            </section>

            <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                <form className="grid gap-3 md:grid-cols-[1.2fr_180px_220px_180px_auto]">
                    <input
                        type="search"
                        name="q"
                        defaultValue={currentQuery}
                        placeholder="Buscar por id, erro, responsavel ou titulo"
                        className="h-11 rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    />
                    <select
                        name="status"
                        defaultValue={currentStatus}
                        className="h-11 rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    >
                        <option value="">Todos os status</option>
                        <option value="FAILED">Falharam</option>
                        <option value="RUNNING">Em execucao</option>
                        <option value="COMPLETED">Concluidos</option>
                        <option value="QUEUED">Na fila</option>
                        <option value="CANCELLED">Cancelados</option>
                    </select>
                    <select
                        name="period"
                        defaultValue={currentPeriod}
                        className="h-11 rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    >
                        <option value="1">Ultimas 24h</option>
                        <option value="7">Ultimos 7 dias</option>
                        <option value="30">Ultimos 30 dias</option>
                        <option value="90">Ultimos 90 dias</option>
                    </select>
                    <select
                        name="sourceType"
                        defaultValue={currentSourceType}
                        className="h-11 rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    >
                        <option value="">Todas as origens</option>
                        <option value="AUTOMACAO_NACIONAL_JOB">Automacao nacional</option>
                        <option value="FLOW_EXECUTION">Flow execution</option>
                    </select>
                    <button
                        type="submit"
                        className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:opacity-95"
                    >
                        Filtrar
                    </button>
                </form>
            </section>

            <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Leitura operacional por origem</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Acompanha volume, falha e recuperacao por modulo no recorte atual.
                        </p>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Taxa de falha atual: <span className="font-semibold text-[var(--text-primary)]">{operationalMetrics.failureRate}%</span>
                    </p>
                </div>

                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--card-border)] text-sm">
                        <thead className="bg-[var(--surface-soft)] text-left text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Origem</th>
                                <th className="px-4 py-3 font-semibold">Total</th>
                                <th className="px-4 py-3 font-semibold">Falhas</th>
                                <th className="px-4 py-3 font-semibold">Em execucao</th>
                                <th className="px-4 py-3 font-semibold">Acionaveis</th>
                                <th className="px-4 py-3 font-semibold">Retries</th>
                                <th className="px-4 py-3 font-semibold">Recuperados</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--card-border)]">
                            {operationalMetrics.bySource.map((metric) => (
                                <tr key={metric.sourceType}>
                                    <td className="px-4 py-3 text-[var(--text-primary)]">
                                        {formatJobCenterSourceTypeLabel(metric.sourceType)}
                                    </td>
                                    <td className="px-4 py-3 text-[var(--text-secondary)]">{metric.total}</td>
                                    <td className="px-4 py-3 text-[var(--text-secondary)]">{metric.failed}</td>
                                    <td className="px-4 py-3 text-[var(--text-secondary)]">{metric.running}</td>
                                    <td className="px-4 py-3 text-[var(--text-secondary)]">{metric.actionable}</td>
                                    <td className="px-4 py-3 text-[var(--text-secondary)]">{metric.manualRetryTotal}</td>
                                    <td className="px-4 py-3 text-[var(--text-secondary)]">{metric.recoveredAfterRetryTotal}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <AdminJobCenterTable items={items} />
        </div>
    );
}
