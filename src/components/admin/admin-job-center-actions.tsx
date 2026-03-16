"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelJobCenterAction, retryJobCenterAction } from "@/actions/job-center";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { Button } from "@/components/ui/button";
import type { JobCenterSourceType } from "@/lib/services/job-center";

type FeedbackState =
    | { variant: "success" | "error" | "info"; message: string }
    | null;

export function AdminJobCenterActions({
    sourceType,
    sourceId,
    canRetry,
    canCancel,
}: {
    sourceType: JobCenterSourceType;
    sourceId: string;
    canRetry: boolean;
    canCancel: boolean;
}) {
    const router = useRouter();
    const [reason, setReason] = useState("");
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const [isPending, startTransition] = useTransition();

    async function handleRetry() {
        startTransition(async () => {
            const result = await retryJobCenterAction({
                sourceType,
                sourceId,
                reason,
            });

            if (!result.success) {
                const errorMessage =
                    typeof result.error === "string"
                        ? result.error
                        : "Nao foi possivel reprocessar o item.";
                setFeedback({ variant: "error", message: errorMessage });
                return;
            }

            setReason("");
            setFeedback({ variant: "success", message: "Reprocessamento iniciado com sucesso." });
            router.refresh();

            if (result.result?.newSourceId) {
                router.push(`/admin/jobs/${result.result.newSourceType}/${result.result.newSourceId}`);
            }
        });
    }

    async function handleCancel() {
        startTransition(async () => {
            const result = await cancelJobCenterAction({
                sourceType,
                sourceId,
            });

            if (!result.success) {
                const errorMessage =
                    typeof result.error === "string"
                        ? result.error
                        : "Nao foi possivel cancelar o item.";
                setFeedback({ variant: "error", message: errorMessage });
                return;
            }

            setFeedback({ variant: "success", message: "Item cancelado com sucesso." });
            router.refresh();
        });
    }

    if (!canRetry && !canCancel) {
        return null;
    }

    return (
        <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
            <div className="space-y-2">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Acoes operacionais</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                    Use retry manual para criar uma nova tentativa ou cancele quando a operacao ainda estiver cancelavel.
                </p>
            </div>

            {canRetry ? (
                <div className="mt-4 space-y-3">
                    <label className="block text-sm font-medium text-[var(--text-primary)]">
                        Motivo do reprocessamento
                    </label>
                    <textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        rows={3}
                        placeholder="Descreva por que este item deve ser reprocessado."
                        className="w-full rounded-[20px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    />
                </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
                {canRetry ? (
                    <Button
                        type="button"
                        onClick={() => void handleRetry()}
                        disabled={isPending || reason.trim().length < 5}
                    >
                        {isPending ? "Processando..." : "Reprocessar"}
                    </Button>
                ) : null}

                {canCancel ? (
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => void handleCancel()}
                        disabled={isPending}
                    >
                        {isPending ? "Cancelando..." : "Cancelar"}
                    </Button>
                ) : null}
            </div>

            {feedback ? (
                <ActionFeedback
                    variant={feedback.variant}
                    message={feedback.message}
                    onDismiss={() => setFeedback(null)}
                    className="mt-4"
                />
            ) : null}
        </section>
    );
}
