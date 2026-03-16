import { ShieldCheck } from "lucide-react";
import { AdminLgpdConsole } from "@/components/admin/admin-lgpd-console";
import { AdminLgpdRetentionConsole } from "@/components/admin/admin-lgpd-retention-console";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
    getLgpdConsentMetrics,
    getLgpdRequestSummary,
    listLgpdConsentHistory,
    listLgpdRequestClientOptions,
    listLgpdRequests,
    type LgpdRequestFilters,
} from "@/lib/services/lgpd-service";
import {
    getRetentionOverview,
    listRetentionExecutions,
    listRetentionPolicies,
} from "@/lib/services/lgpd-retention";

type SearchParamsInput = Record<string, string | string[] | undefined>;

function getFirstValue(value?: string | string[]) {
    return Array.isArray(value) ? value[0] : value;
}

function buildFilters(searchParams: SearchParamsInput): LgpdRequestFilters {
    const status = getFirstValue(searchParams.status);
    const requestType = getFirstValue(searchParams.requestType);
    const query = getFirstValue(searchParams.q)?.trim() || undefined;

    return {
        ...(status ? { status: status as LgpdRequestFilters["status"] } : {}),
        ...(requestType ? { requestType: requestType as LgpdRequestFilters["requestType"] } : {}),
        ...(query ? { query } : {}),
    };
}

export default async function AdminLgpdPage({
    searchParams,
}: {
    searchParams?: Promise<SearchParamsInput>;
}) {
    const resolvedSearchParams = (await searchParams) || {};
    const filters = buildFilters(resolvedSearchParams);

    const [summary, consentMetrics, requests, consentHistory, clientOptions, retentionOverview, retentionPolicies, retentionExecutions] = await Promise.all([
        getLgpdRequestSummary(filters),
        getLgpdConsentMetrics(),
        listLgpdRequests(filters, 50),
        listLgpdConsentHistory(12, filters.query),
        listLgpdRequestClientOptions(80),
        getRetentionOverview(),
        listRetentionPolicies(10),
        listRetentionExecutions(12),
    ]);

    return (
        <div className="space-y-6 px-4 py-4 md:px-6 md:py-6">
            <AdminPageHeader
                title="LGPD Operacional"
                description="Fila administrativa de privacidade, historico de consentimento e governanca minima do titular."
                icon={ShieldCheck}
                backHref="/admin"
                backLabel="Voltar para administracao"
            />

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {[
                    { label: "Solicitacoes", value: summary.total },
                    { label: "Abertas", value: summary.abertas },
                    { label: "Em analise", value: summary.emAnalise },
                    { label: "Em atendimento", value: summary.emAtendimento },
                    { label: "Consentimentos ativos", value: consentMetrics.activeTotal },
                ].map((item) => (
                    <div
                        key={item.label}
                        className="glass-card rounded-[24px] border border-[var(--card-border)] p-5"
                    >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                            {item.label}
                        </p>
                        <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                            {item.value}
                        </p>
                    </div>
                ))}
            </section>

            <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                <form className="grid gap-3 md:grid-cols-[1.3fr_220px_220px_auto]">
                    <input
                        type="search"
                        name="q"
                        defaultValue={filters.query || ""}
                        placeholder="Buscar por titular, observacao, base legal ou operador"
                        className="h-11 rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    />
                    <select
                        name="status"
                        defaultValue={filters.status || ""}
                        className="h-11 rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    >
                        <option value="">Todos os status</option>
                        <option value="ABERTA">Abertas</option>
                        <option value="EM_ANALISE">Em analise</option>
                        <option value="EM_ATENDIMENTO">Em atendimento</option>
                        <option value="CONCLUIDA">Concluidas</option>
                        <option value="CANCELADA">Canceladas</option>
                    </select>
                    <select
                        name="requestType"
                        defaultValue={filters.requestType || ""}
                        className="h-11 rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    >
                        <option value="">Todos os tipos</option>
                        <option value="ACESSO">Acesso</option>
                        <option value="CORRECAO">Correcao</option>
                        <option value="ANONIMIZACAO">Anonimizacao</option>
                        <option value="EXCLUSAO">Exclusao</option>
                        <option value="REVOGACAO_CONSENTIMENTO">Revogacao de consentimento</option>
                        <option value="OUTRO">Outro</option>
                    </select>
                    <button
                        type="submit"
                        className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:opacity-95"
                    >
                        Filtrar
                    </button>
                </form>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-[22px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                            Consentimentos concedidos em 30 dias
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                            {consentMetrics.grantedLast30Days}
                        </p>
                    </div>
                    <div className="rounded-[22px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                            Revogacoes em 30 dias
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                            {consentMetrics.revokedLast30Days}
                        </p>
                    </div>
                </div>
            </section>

            <AdminLgpdConsole
                requests={requests}
                consentHistory={consentHistory}
                clientOptions={clientOptions}
            />

            <AdminLgpdRetentionConsole
                overview={retentionOverview}
                policies={retentionPolicies}
                executions={retentionExecutions}
            />
        </div>
    );
}
