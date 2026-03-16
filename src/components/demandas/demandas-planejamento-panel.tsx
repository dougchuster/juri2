"use client";

import { useState, useTransition } from "react";
import { CheckCheck, ClipboardCheck, Loader2, Sparkles } from "lucide-react";
import {
    aplicarPlanejamentoDiarioDemandasIA,
    executarPlanejamentoDiarioDemandasIA,
} from "@/actions/demandas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface PlanejamentoResult {
    provider: string;
    enabled: boolean;
    model: string | null;
    planoId: string | null;
    resposta: string;
    contextoResumo?: {
        filtros?: {
            area?: string;
            periodoDias?: number;
        };
        kpis?: {
            tarefasAbertas?: number;
            tarefasAtrasadas?: number;
            prazosPendentes?: number;
            prazosAtrasados?: number;
            atendimentosAbertos?: number;
        };
        topResponsaveis?: Array<{
            advogadoId: string;
            nome: string;
            scoreCarga: number;
            tarefasPendentes: number;
            prazosPendentes: number;
        }>;
    };
}

interface DemandasPlanejamentoPanelProps {
    area: string;
    advogadoId: string;
    periodoDias: number;
}

export function DemandasPlanejamentoPanel({
    area,
    advogadoId,
    periodoDias,
}: DemandasPlanejamentoPanelProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isSimulating, startSimulating] = useTransition();
    const [isApplying, startApplying] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [result, setResult] = useState<PlanejamentoResult | null>(null);
    const [incluirRedistribuicao, setIncluirRedistribuicao] = useState(true);

    function handleRun() {
        setError(null);
        setFeedback(null);
        startTransition(async () => {
            const response = await executarPlanejamentoDiarioDemandasIA({
                area,
                advogadoId,
                periodoDias,
                incluirRedistribuicao,
                persistirPlano: true,
            });
            if (!response.success) {
                setError(response.error || "Erro ao gerar planejamento diario.");
                return;
            }
            setResult(response.result as PlanejamentoResult);
        });
    }

    function handleApplyPlan() {
        setError(null);
        setFeedback(null);
        if (!result) {
            setError("Gere o planejamento antes de aplicar o plano.");
            return;
        }

        startApplying(async () => {
            const response = await aplicarPlanejamentoDiarioDemandasIA({
                modo: "MANUAL",
                area,
                advogadoId,
                timeId: "",
                periodoDias,
                incluirRedistribuicao,
                planoId: result.planoId || undefined,
                maxResponsaveis: 6,
                simular: false,
            });
            if (!response.success) {
                setError(response.error || "Erro ao aplicar planejamento diario.");
                return;
            }

            const payload = response.result as
                | {
                      criadas?: number;
                      atualizadas?: number;
                      ignoradas?: number;
                      responsaveisAfetados?: number;
                  }
                | undefined;
            setFeedback(
                `Plano aplicado: ${payload?.criadas || 0} criado(s), ${payload?.atualizadas || 0} atualizado(s), ${payload?.ignoradas || 0} ignorado(s). Responsaveis: ${payload?.responsaveisAfetados || 0}.`
            );
            router.refresh();
        });
    }

    function handleSimulatePlan() {
        setError(null);
        setFeedback(null);
        if (!result) {
            setError("Gere o planejamento antes de simular o impacto.");
            return;
        }

        startSimulating(async () => {
            const response = await aplicarPlanejamentoDiarioDemandasIA({
                modo: "MANUAL",
                area,
                advogadoId,
                timeId: "",
                periodoDias,
                incluirRedistribuicao,
                planoId: result.planoId || undefined,
                maxResponsaveis: 6,
                simular: true,
            });
            if (!response.success) {
                setError(response.error || "Erro ao simular planejamento diario.");
                return;
            }
            const payload = response.result as
                | {
                      criadas?: number;
                      atualizadas?: number;
                      ignoradas?: number;
                      responsaveisAfetados?: number;
                  }
                | undefined;
            setFeedback(
                `Simulacao: ${payload?.criadas || 0} plano(s) seriam criados, ${payload?.atualizadas || 0} atualizados, ${payload?.ignoradas || 0} ignorados. Responsaveis: ${payload?.responsaveisAfetados || 0}.`
            );
        });
    }

    return (
        <section className="glass-card p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-info/15 text-info flex items-center justify-center">
                        <ClipboardCheck size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-text-primary">Planejamento diario com IA</h3>
                        <p className="text-xs text-text-muted">
                            Organiza prioridades do dia por risco e carga operacional.
                        </p>
                    </div>
                </div>
                <Badge variant="info">
                    <Sparkles size={12} /> Orquestracao assistida
                </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                    <input
                        type="checkbox"
                        checked={incluirRedistribuicao}
                        onChange={(e) => setIncluirRedistribuicao(e.target.checked)}
                    />
                    Incluir redistribuicao sugerida no plano do dia
                </label>
                <Button onClick={handleRun} disabled={isPending}>
                    {isPending ? (
                        <>
                            <Loader2 size={15} className="animate-spin" /> Gerando plano...
                        </>
                    ) : (
                        <>
                            <ClipboardCheck size={14} /> Planejar dia com IA
                        </>
                    )}
                </Button>
                <Button
                    variant="secondary"
                    onClick={handleSimulatePlan}
                    disabled={isSimulating || !result}
                    title={!result ? "Gere o planejamento para habilitar a simulacao." : undefined}
                >
                    {isSimulating ? (
                        <>
                            <Loader2 size={15} className="animate-spin" /> Simulando...
                        </>
                    ) : (
                        <>
                            <CheckCheck size={14} /> Simular impacto
                        </>
                    )}
                </Button>
                <Button
                    variant="secondary"
                    onClick={handleApplyPlan}
                    disabled={isApplying || !result}
                    title={!result ? "Gere o planejamento para habilitar a aplicacao." : undefined}
                >
                    {isApplying ? (
                        <>
                            <Loader2 size={15} className="animate-spin" /> Aplicando...
                        </>
                    ) : (
                        <>
                            <CheckCheck size={14} /> Aplicar plano no dia
                        </>
                    )}
                </Button>
            </div>

            {error && (
                <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                    {error}
                </div>
            )}
            {feedback && (
                <div className="mt-4 rounded-lg border border-border bg-bg-tertiary/30 px-3 py-2 text-xs text-text-secondary">
                    {feedback}
                </div>
            )}

            {result && (
                <div className="mt-4 space-y-3">
                    <div className="rounded-lg border border-border bg-bg-tertiary/25 px-3 py-2 text-xs text-text-muted">
                        {result.planoId && <span>Plano salvo</span>}
                        {!result.enabled && (
                            <span className="text-warning">
                                IA indisponivel (fallback local)
                            </span>
                        )}
                        {result.enabled && !result.planoId && <span>Analise gerada</span>}
                    </div>

                    {result.contextoResumo?.kpis && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            <div className="rounded-md border border-border bg-bg-tertiary/20 px-2.5 py-2">
                                <p className="text-[10px] uppercase text-text-muted">Tarefas</p>
                                <p className="text-sm font-mono text-text-primary">
                                    {result.contextoResumo.kpis.tarefasAbertas || 0}
                                </p>
                            </div>
                            <div className="rounded-md border border-border bg-bg-tertiary/20 px-2.5 py-2">
                                <p className="text-[10px] uppercase text-text-muted">Atrasadas</p>
                                <p className="text-sm font-mono text-danger">
                                    {result.contextoResumo.kpis.tarefasAtrasadas || 0}
                                </p>
                            </div>
                            <div className="rounded-md border border-border bg-bg-tertiary/20 px-2.5 py-2">
                                <p className="text-[10px] uppercase text-text-muted">Prazos</p>
                                <p className="text-sm font-mono text-text-primary">
                                    {result.contextoResumo.kpis.prazosPendentes || 0}
                                </p>
                            </div>
                            <div className="rounded-md border border-border bg-bg-tertiary/20 px-2.5 py-2">
                                <p className="text-[10px] uppercase text-text-muted">Prazos atrasados</p>
                                <p className="text-sm font-mono text-danger">
                                    {result.contextoResumo.kpis.prazosAtrasados || 0}
                                </p>
                            </div>
                            <div className="rounded-md border border-border bg-bg-tertiary/20 px-2.5 py-2">
                                <p className="text-[10px] uppercase text-text-muted">Atendimentos</p>
                                <p className="text-sm font-mono text-text-primary">
                                    {result.contextoResumo.kpis.atendimentosAbertos || 0}
                                </p>
                            </div>
                        </div>
                    )}

                    <pre className="rounded-lg border border-border bg-bg-tertiary/20 p-3 whitespace-pre-wrap text-xs text-text-secondary leading-relaxed">
                        {result.resposta}
                    </pre>
                </div>
            )}
        </section>
    );
}
