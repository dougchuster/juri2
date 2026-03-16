"use client";

import { useState, useTransition } from "react";
import { CheckCheck, Clock3, Loader2, Trash2 } from "lucide-react";
import { atualizarStatusPlanoDemandasIA } from "@/actions/demandas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { DemandaIaPlano } from "@/lib/types/demandas";
import { getDemandaPlanoStatusLabel } from "@/lib/types/demandas";

interface DemandasPlanosPanelProps {
    planos: DemandaIaPlano[];
    canManage: boolean;
    userId: string;
}

function getStatusVariant(status: DemandaIaPlano["status"]): "success" | "muted" | "warning" {
    if (status === "APLICADO") return "success";
    if (status === "DESCARTADO") return "muted";
    return "warning";
}

export function DemandasPlanosPanel({ planos, canManage, userId }: DemandasPlanosPanelProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    function handleStatus(planoId: string, status: DemandaIaPlano["status"]) {
        setError(null);
        setFeedback(null);
        startTransition(async () => {
            const result = await atualizarStatusPlanoDemandasIA({ planoId, status });
            if (!result.success) {
                setError(result.error || "Falha ao atualizar plano.");
                return;
            }
            setFeedback(`Plano atualizado para ${getDemandaPlanoStatusLabel(status).toLowerCase()}.`);
            router.refresh();
        });
    }

    return (
        <section className="glass-card p-4 md:p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                    <h3 className="text-sm font-semibold text-text-primary">Planos da IA (persistidos)</h3>
                    <p className="text-xs text-text-muted">
                        Status auditavel para sugestoes pendentes, aplicadas e descartadas.
                    </p>
                </div>
                {isPending && (
                    <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                        <Loader2 size={12} className="animate-spin" /> Salvando...
                    </span>
                )}
            </div>

            {error && (
                <div className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                    {error}
                </div>
            )}
            {feedback && (
                <div className="mb-3 rounded-lg border border-border bg-bg-tertiary/30 px-3 py-2 text-xs text-text-secondary">
                    {feedback}
                </div>
            )}

            <div className="space-y-2.5">
                {planos.length === 0 ? (
                    <div className="rounded-lg border border-border bg-bg-tertiary/20 p-4 text-xs text-text-muted">
                        Nenhum plano de IA salvo ate o momento.
                    </div>
                ) : (
                    planos.map((plano) => {
                        const canChange = canManage || plano.solicitadoPorId === userId;
                        return (
                            <div
                                key={plano.id}
                                className="rounded-lg border border-border bg-bg-tertiary/20 p-3 space-y-2"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="info">{plano.tipo === "ANALISE" ? "Analise" : "Redistribuicao"}</Badge>
                                    <Badge variant={getStatusVariant(plano.status)}>
                                        {getDemandaPlanoStatusLabel(plano.status)}
                                    </Badge>
                                    <span className="text-[11px] text-text-muted">
                                        {new Date(plano.solicitadoEm).toLocaleString("pt-BR")}
                                    </span>
                                </div>
                                <p className="text-xs text-text-secondary">
                                    <span className="text-text-muted">Pergunta:</span> {plano.pergunta || "-"}
                                </p>
                                <p className="text-xs text-text-primary">{plano.resumo || "Sem resumo."}</p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="muted">
                                        <Clock3 size={12} /> Area: {plano.area}
                                    </Badge>
                                    {plano.model && <Badge variant="muted">Modelo: {plano.model}</Badge>}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <Button
                                        size="xs"
                                        variant="secondary"
                                        disabled={!canChange || plano.status === "APLICADO" || isPending}
                                        onClick={() => handleStatus(plano.id, "APLICADO")}
                                    >
                                        <CheckCheck size={12} /> Marcar aplicado
                                    </Button>
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        disabled={!canChange || plano.status === "DESCARTADO" || isPending}
                                        onClick={() => handleStatus(plano.id, "DESCARTADO")}
                                    >
                                        <Trash2 size={12} /> Descartar
                                    </Button>
                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        disabled={!canChange || plano.status === "PENDENTE" || isPending}
                                        onClick={() => handleStatus(plano.id, "PENDENTE")}
                                    >
                                        Reabrir
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </section>
    );
}
