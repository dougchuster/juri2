"use client";

import { useState, useTransition } from "react";
import { RefreshCcw, ShieldEllipsis, Trash2 } from "lucide-react";
import {
    executeAllRetentionPoliciesAction,
    executeRetentionPolicyAction,
    upsertRetentionPolicyAction,
} from "@/actions/lgpd";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
    LgpdRetentionExecutionItem,
    LgpdRetentionOverview,
    LgpdRetentionPolicyItem,
} from "@/lib/services/lgpd-retention";
import {
    formatRetentionActionLabel,
    formatRetentionEntityLabel,
    formatRetentionExecutionStatusLabel,
} from "@/lib/services/lgpd-retention-core";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

type FeedbackState =
    | { variant: "success" | "error" | "info"; message: string }
    | null;

type PolicyDraftState = Record<
    string,
    {
        retentionDays: string;
        isActive: boolean;
        notes: string;
    }
>;

function getExecutionVariant(status: LgpdRetentionExecutionItem["status"]) {
    if (status === "SUCCESS") return "success" as const;
    if (status === "PARTIAL") return "warning" as const;
    if (status === "FAILED") return "danger" as const;
    return "muted" as const;
}

export function AdminLgpdRetentionConsole({
    overview,
    policies,
    executions,
}: {
    overview: LgpdRetentionOverview;
    policies: LgpdRetentionPolicyItem[];
    executions: LgpdRetentionExecutionItem[];
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const [drafts, setDrafts] = useState<PolicyDraftState>(() =>
        Object.fromEntries(
            policies.map((policy) => [
                policy.id,
                {
                    retentionDays: String(policy.retentionDays),
                    isActive: policy.isActive,
                    notes: policy.notes || "",
                },
            ])
        )
    );

    function updateDraft(
        policyId: string,
        field: keyof PolicyDraftState[string],
        value: string | boolean
    ) {
        setDrafts((current) => ({
            ...current,
            [policyId]: {
                ...current[policyId],
                [field]: value,
            },
        }));
    }

    async function handleSavePolicy(policy: LgpdRetentionPolicyItem) {
        const draft = drafts[policy.id];

        startTransition(async () => {
            const result = await upsertRetentionPolicyAction({
                entityName: policy.entityName,
                retentionDays: Number(draft?.retentionDays || policy.retentionDays),
                isActive: draft?.isActive ?? policy.isActive,
                notes: draft?.notes || "",
            });

            if (!result.success) {
                setFeedback({
                    variant: "error",
                    message:
                        typeof result.error === "string"
                            ? result.error
                            : "Nao foi possivel salvar a politica de retencao.",
                });
                return;
            }

            setFeedback({ variant: "success", message: "Politica de retencao atualizada." });
            router.refresh();
        });
    }

    async function handleRunPolicy(policyId: string, dryRun: boolean) {
        startTransition(async () => {
            const result = await executeRetentionPolicyAction({ policyId, dryRun });

            if (!result.success) {
                setFeedback({
                    variant: "error",
                    message:
                        typeof result.error === "string"
                            ? result.error
                            : "Nao foi possivel executar a politica de retencao.",
                });
                return;
            }

            setFeedback({
                variant: "success",
                message: dryRun
                    ? "Simulacao de retencao executada com sucesso."
                    : "Politica de retencao executada com sucesso.",
            });
            router.refresh();
        });
    }

    async function handleRunAll(dryRun: boolean) {
        startTransition(async () => {
            const result = await executeAllRetentionPoliciesAction({ dryRun });

            if (!result.success) {
                setFeedback({
                    variant: "error",
                    message:
                        typeof result.error === "string"
                            ? result.error
                            : "Nao foi possivel executar as politicas ativas.",
                });
                return;
            }

            setFeedback({
                variant: "success",
                message: dryRun
                    ? "Simulacao das politicas ativas concluida."
                    : "Politicas ativas executadas com sucesso.",
            });
            router.refresh();
        });
    }

    return (
        <div className="space-y-6">
            <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                            Retencao e compliance continuo
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Configure politicas por entidade, rode simulacoes e acompanhe o historico operacional de limpeza e anonimizacao.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => void handleRunAll(true)}
                        >
                            <ShieldEllipsis size={16} className="mr-2" />
                            Simular ativas
                        </Button>
                        <Button type="button" disabled={isPending} onClick={() => void handleRunAll(false)}>
                            <RefreshCcw size={16} className="mr-2" />
                            Rodar ativas
                        </Button>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        { label: "Politicas ativas", value: overview.activePolicies },
                        { label: "Politicas inativas", value: overview.inactivePolicies },
                        { label: "Pacotes expirados", value: overview.expiredExportsPendingPurge },
                        { label: "Clientes elegiveis", value: overview.archivedClientsEligible },
                        { label: "Execucoes em 30 dias", value: overview.recentExecutions },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="rounded-[22px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-4"
                        >
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                                {item.label}
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                                {item.value}
                            </p>
                        </div>
                    ))}
                </div>

                {feedback ? (
                    <ActionFeedback
                        className="mt-4"
                        variant={feedback.variant}
                        message={feedback.message}
                        onDismiss={() => setFeedback(null)}
                    />
                ) : null}
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
                {policies.map((policy) => {
                    const draft = drafts[policy.id] || {
                        retentionDays: String(policy.retentionDays),
                        isActive: policy.isActive,
                        notes: policy.notes || "",
                    };

                    return (
                        <article
                            key={policy.id}
                            className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-base font-semibold text-[var(--text-primary)]">
                                            {formatRetentionEntityLabel(policy.entityName)}
                                        </h3>
                                        <Badge variant={policy.isActive ? "success" : "muted"}>
                                            {policy.isActive ? "Ativa" : "Inativa"}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        {formatRetentionActionLabel(policy.actionType)} apos {policy.retentionDays} dia(s)
                                    </p>
                                </div>
                                <Trash2 size={18} className="text-[var(--text-secondary)]" />
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-[160px_1fr]">
                                <label className="space-y-2 text-sm">
                                    <span className="font-medium text-[var(--text-primary)]">Retencao (dias)</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={draft.retentionDays}
                                        onChange={(event) =>
                                            updateDraft(policy.id, "retentionDays", event.target.value)
                                        }
                                        className="h-11 w-full rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                                    />
                                </label>

                                <label className="space-y-2 text-sm">
                                    <span className="font-medium text-[var(--text-primary)]">Notas operacionais</span>
                                    <textarea
                                        rows={3}
                                        value={draft.notes}
                                        onChange={(event) => updateDraft(policy.id, "notes", event.target.value)}
                                        className="w-full rounded-[20px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                                    />
                                </label>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                <label className="inline-flex items-center gap-2 text-sm text-[var(--text-primary)]">
                                    <input
                                        type="checkbox"
                                        checked={draft.isActive}
                                        onChange={(event) => updateDraft(policy.id, "isActive", event.target.checked)}
                                        className="h-4 w-4 rounded border border-[var(--card-border)]"
                                    />
                                    Politica ativa
                                </label>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isPending}
                                        onClick={() => void handleRunPolicy(policy.id, true)}
                                    >
                                        Simular
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isPending}
                                        onClick={() => void handleSavePolicy(policy)}
                                    >
                                        Salvar
                                    </Button>
                                    <Button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => void handleRunPolicy(policy.id, false)}
                                    >
                                        Executar
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-4 rounded-[20px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-3 text-xs text-[var(--text-secondary)]">
                                {policy.latestExecution ? (
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span>Ultima execucao:</span>
                                            <Badge variant={getExecutionVariant(policy.latestExecution.status)}>
                                                {formatRetentionExecutionStatusLabel(policy.latestExecution.status)}
                                            </Badge>
                                        </div>
                                        <p>Iniciada em {formatDate(policy.latestExecution.startedAt)}</p>
                                        <p>
                                            Processados: {policy.latestExecution.processedCount} | Erros:{" "}
                                            {policy.latestExecution.errorCount} | Ignorados:{" "}
                                            {policy.latestExecution.skippedCount}
                                        </p>
                                    </div>
                                ) : (
                                    <p>Nenhuma execucao registrada ainda.</p>
                                )}
                            </div>
                        </article>
                    );
                })}
            </section>

            <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Historico de execucoes</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Leitura administrativa de simulacoes, rotinas automaticas e execucoes manuais.
                    </p>
                </div>

                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--card-border)] text-sm">
                        <thead className="bg-[var(--surface-soft)] text-left text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Politica</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold">Modo</th>
                                <th className="px-4 py-3 font-semibold">Impacto</th>
                                <th className="px-4 py-3 font-semibold">Responsavel</th>
                                <th className="px-4 py-3 font-semibold">Inicio</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--card-border)]">
                            {executions.map((execution) => (
                                <tr key={execution.id}>
                                    <td className="px-4 py-4">
                                        <div className="space-y-1">
                                            <p className="font-medium text-[var(--text-primary)]">
                                                {formatRetentionEntityLabel(execution.policyEntityName)}
                                            </p>
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                {formatRetentionActionLabel(execution.policyActionType)}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <Badge variant={getExecutionVariant(execution.status)}>
                                            {formatRetentionExecutionStatusLabel(execution.status)}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4 text-xs text-[var(--text-secondary)]">
                                        {execution.mode === "AUTO" ? "Automatico" : "Manual"}
                                        {execution.dryRun ? " / simulacao" : ""}
                                    </td>
                                    <td className="px-4 py-4 text-xs text-[var(--text-secondary)]">
                                        {execution.processedCount} processados / {execution.errorCount} erros /{" "}
                                        {execution.skippedCount} ignorados
                                    </td>
                                    <td className="px-4 py-4 text-xs text-[var(--text-secondary)]">
                                        {execution.triggeredBy?.name || "Sistema"}
                                    </td>
                                    <td className="px-4 py-4 text-xs text-[var(--text-secondary)]">
                                        {formatDate(execution.startedAt)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
