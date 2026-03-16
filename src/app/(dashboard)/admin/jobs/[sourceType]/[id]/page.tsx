import Link from "next/link";
import { AdminJobCenterActions } from "@/components/admin/admin-job-center-actions";
import { notFound } from "next/navigation";
import {
    formatJobCenterDate,
    formatJobCenterSourceTypeLabel,
    JobCenterStatusBadge,
} from "@/components/admin/admin-jobs-center-shared";
import {
    getJobCenterDetail,
    type JobCenterSourceType,
} from "@/lib/services/job-center";

function isSourceType(value: string): value is JobCenterSourceType {
    return value === "AUTOMACAO_NACIONAL_JOB" || value === "FLOW_EXECUTION";
}

function toPrettyJson(value: unknown) {
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

export default async function AdminJobDetailPage({
    params,
}: {
    params: Promise<{ sourceType: string; id: string }>;
}) {
    const resolvedParams = await params;
    if (!isSourceType(resolvedParams.sourceType)) {
        notFound();
    }

    const detail = await getJobCenterDetail(resolvedParams.sourceType, resolvedParams.id);
    if (!detail) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                        <Link
                            href="/admin/jobs"
                            className="inline-flex text-sm font-semibold text-[var(--accent)] transition hover:opacity-80"
                        >
                            Voltar para a central
                        </Link>
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                                {formatJobCenterSourceTypeLabel(detail.sourceType)}
                            </p>
                            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                                {detail.item.title}
                            </h1>
                            <p className="text-sm text-[var(--text-secondary)]">{detail.item.id}</p>
                        </div>
                    </div>

                    <JobCenterStatusBadge status={detail.item.status} />
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-[20px] border border-[var(--card-border)] bg-[var(--surface-soft)] p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">Criado em</p>
                        <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                            {formatJobCenterDate(detail.item.createdAt)}
                        </p>
                    </div>
                    <div className="rounded-[20px] border border-[var(--card-border)] bg-[var(--surface-soft)] p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">Iniciado em</p>
                        <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                            {formatJobCenterDate(detail.item.startedAt)}
                        </p>
                    </div>
                    <div className="rounded-[20px] border border-[var(--card-border)] bg-[var(--surface-soft)] p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">Finalizado em</p>
                        <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                            {formatJobCenterDate(detail.item.finishedAt)}
                        </p>
                    </div>
                </div>
            </section>

            <AdminJobCenterActions
                sourceType={detail.sourceType}
                sourceId={detail.item.id}
                canRetry={detail.canRetry}
                canCancel={detail.canCancel}
            />

            <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Historico de tentativas</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Cadeia completa de execucoes, retries manuais e resultados operacionais deste item.
                    </p>
                </div>

                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--card-border)] text-sm">
                        <thead className="bg-[var(--surface-soft)] text-left text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Tentativa</th>
                                <th className="px-4 py-3 font-semibold">Origem</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold">Responsavel</th>
                                <th className="px-4 py-3 font-semibold">Inicio</th>
                                <th className="px-4 py-3 font-semibold">Fim</th>
                                <th className="px-4 py-3 font-semibold">Motivo / erro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--card-border)]">
                            {detail.attempts.length ? (
                                detail.attempts.map((attempt) => (
                                    <tr key={attempt.id}>
                                        <td className="px-4 py-3 text-[var(--text-primary)]">
                                            <Link
                                                href={attempt.href}
                                                className="font-semibold text-[var(--accent)] transition hover:opacity-80"
                                            >
                                                #{attempt.attemptNumber}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                                            {attempt.triggerSource}
                                        </td>
                                        <td className="px-4 py-3">
                                            <JobCenterStatusBadge status={attempt.status} />
                                        </td>
                                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                                            {attempt.triggeredBy?.name || attempt.triggeredBy?.email || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                                            {formatJobCenterDate(attempt.startedAt || attempt.createdAt)}
                                        </td>
                                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                                            {formatJobCenterDate(attempt.finishedAt)}
                                        </td>
                                        <td className="max-w-lg px-4 py-3 text-[var(--text-secondary)]">
                                            <div className="space-y-1">
                                                <p className="line-clamp-2">
                                                    {attempt.reason || attempt.errorMessage || "-"}
                                                </p>
                                                {attempt.retryOfSourceId ? (
                                                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                                                        Retry de {attempt.retryOfSourceId}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-[var(--text-secondary)]">
                                        Nenhuma tentativa registrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {detail.sourceType === "AUTOMACAO_NACIONAL_JOB" ? (
                <>
                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {[
                            { label: "Logs", value: detail.data?.resumo.totalLogs || 0 },
                            { label: "Publicacoes capturadas", value: detail.data?.job.publicacoesCapturadas || 0 },
                            { label: "Publicacoes importadas", value: detail.data?.job.publicacoesImportadas || 0 },
                            { label: "Prazos criados", value: detail.data?.job.prazosCriados || 0 },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="rounded-[24px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-5"
                            >
                                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                                    {item.label}
                                </p>
                                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                                    {item.value}
                                </p>
                            </div>
                        ))}
                    </section>

                    <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Resumo operacional</h2>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div className="rounded-[20px] border border-[var(--card-border)] bg-[var(--surface-soft)] p-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">Responsavel</p>
                                <p className="mt-2 text-sm text-[var(--text-primary)]">
                                    {detail.data?.job.advogado.user.name || "-"}
                                </p>
                            </div>
                            <div className="rounded-[20px] border border-[var(--card-border)] bg-[var(--surface-soft)] p-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">Erro resumo</p>
                                <p className="mt-2 text-sm text-[var(--text-primary)]">
                                    {detail.data?.job.erroResumo || "-"}
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Ultimos logs</h2>
                        <div className="mt-4 overflow-x-auto">
                            <table className="min-w-full divide-y divide-[var(--card-border)] text-sm">
                                <thead className="bg-[var(--surface-soft)] text-left text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Tribunal</th>
                                        <th className="px-4 py-3 font-semibold">Fonte</th>
                                        <th className="px-4 py-3 font-semibold">Status</th>
                                        <th className="px-4 py-3 font-semibold">Inicio</th>
                                        <th className="px-4 py-3 font-semibold">Erro</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--card-border)]">
                                    {detail.data?.job.logs.length ? (
                                        detail.data.job.logs.slice(0, 30).map((log) => (
                                            <tr key={log.id}>
                                                <td className="px-4 py-3 text-[var(--text-primary)]">{log.tribunal}</td>
                                                <td className="px-4 py-3 text-[var(--text-secondary)]">{log.sourceType}</td>
                                                <td className="px-4 py-3 text-[var(--text-secondary)]">{log.status}</td>
                                                <td className="px-4 py-3 text-[var(--text-secondary)]">
                                                    {formatJobCenterDate(log.inicio)}
                                                </td>
                                                <td className="max-w-md px-4 py-3 text-[var(--text-secondary)]">
                                                    <span className="line-clamp-2">{log.erro || "-"}</span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-10 text-center text-[var(--text-secondary)]">
                                                Nenhum log encontrado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            ) : (
                <>
                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-[24px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-5">
                            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">Flow</p>
                            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                                {detail.data.flow?.name || "-"}
                            </p>
                        </div>
                        <div className="rounded-[24px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-5">
                            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">Node atual</p>
                            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                                {detail.data.currentNodeId || "-"}
                            </p>
                        </div>
                        <div className="rounded-[24px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-5">
                            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">Cliente</p>
                            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                                {detail.data.cliente?.nome || "-"}
                            </p>
                        </div>
                        <div className="rounded-[24px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-5">
                            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">Processo</p>
                            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                                {detail.data.processo?.numeroCnj || detail.data.processo?.id || "-"}
                            </p>
                        </div>
                    </section>

                    <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Erro principal</h2>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">
                            {detail.data.errorMessage || "Sem erro registrado."}
                        </p>
                    </section>

                    <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Log da execucao</h2>
                        <pre className="mt-4 overflow-x-auto rounded-[20px] border border-[var(--card-border)] bg-[var(--surface-soft)] p-4 text-xs text-[var(--text-primary)]">
                            {toPrettyJson(detail.data.log)}
                        </pre>
                    </section>
                </>
            )}
        </div>
    );
}
