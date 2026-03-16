"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw } from "lucide-react";
import { refreshBISnapshotsAction } from "@/actions/bi";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { Button } from "@/components/ui/button";

type FeedbackState =
    | { variant: "success" | "error" | "info"; message: string }
    | null;

export function AdminBIRefreshActions() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<FeedbackState>(null);

    async function handleRefresh() {
        startTransition(async () => {
            const result = await refreshBISnapshotsAction();
            if (!result.success) {
                setFeedback({
                    variant: "error",
                    message: typeof result.error === "string" ? result.error : "Falha ao atualizar snapshots BI.",
                });
                return;
            }

            setFeedback({
                variant: "success",
                message: `Snapshots BI atualizados (${result.result?.totalSnapshots ?? 0} registros).`,
            });
            router.refresh();
        });
    }

    return (
        <div className="flex flex-col items-end gap-2">
            <Button type="button" onClick={() => void handleRefresh()} disabled={isPending}>
                <RefreshCcw size={16} className="mr-2" />
                {isPending ? "Atualizando..." : "Atualizar snapshots"}
            </Button>
            {feedback ? (
                <ActionFeedback
                    variant={feedback.variant}
                    message={feedback.message}
                    onDismiss={() => setFeedback(null)}
                />
            ) : null}
        </div>
    );
}
