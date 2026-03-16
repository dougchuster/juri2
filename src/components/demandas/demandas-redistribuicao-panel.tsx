"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRightLeft, CheckSquare, Loader2 } from "lucide-react";
import {
    aplicarSugestoesRedistribuicaoDemandas,
    gerarSugestoesRedistribuicaoDemandas,
} from "@/actions/demandas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Sugestao {
    tarefaId: string;
    tarefaTitulo: string;
    fromAdvogadoId: string;
    fromAdvogadoNome: string;
    toAdvogadoId: string;
    toAdvogadoNome: string;
    prioridadeAtual: "URGENTE" | "ALTA" | "NORMAL" | "BAIXA";
    prioridadeSugerida: "URGENTE" | "ALTA" | "NORMAL" | "BAIXA";
    motivo: string;
    area: string;
}

interface DemandasRedistribuicaoPanelProps {
    area: string;
    advogadoId: string;
    periodoDias: number;
    canApplyLote: boolean;
}

export function DemandasRedistribuicaoPanel({
    area,
    advogadoId,
    periodoDias,
    canApplyLote,
}: DemandasRedistribuicaoPanelProps) {
    const [isGenerating, startGenerating] = useTransition();
    const [isApplying, startApplying] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [planoId, setPlanoId] = useState<string | null>(null);

    const allSelected = useMemo(() => {
        return sugestoes.length > 0 && selectedIds.length === sugestoes.length;
    }, [selectedIds, sugestoes.length]);

    function toggleAll() {
        if (allSelected) {
            setSelectedIds([]);
            return;
        }
        setSelectedIds(sugestoes.map((item) => item.tarefaId));
    }

    function toggleOne(id: string) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    }

    function handleGenerate() {
        setError(null);
        setInfo(null);
        startGenerating(async () => {
            const result = await gerarSugestoesRedistribuicaoDemandas({
                area,
                advogadoId,
                periodoDias,
                maxMovimentos: 12,
                persistirPlano: true,
            });
            if (!result.success) {
                setError(result.error || "Erro ao gerar sugestoes.");
                return;
            }
            const list = (result.sugestoes || []) as Sugestao[];
            setSugestoes(list);
            setSelectedIds(list.map((item) => item.tarefaId));
            setPlanoId((result.planoId as string | null) || null);
            setInfo(result.diagnostico || `Sugestoes geradas: ${list.length}.`);
        });
    }

    function handleApply() {
        setError(null);
        if (!canApplyLote) {
            setError("Seu perfil nao possui permissao para aplicar redistribuicao em lote.");
            return;
        }
        if (selectedIds.length === 0) {
            setError("Selecione ao menos uma sugestao para aplicar.");
            return;
        }

        const selected = sugestoes.filter((item) => selectedIds.includes(item.tarefaId));
        startApplying(async () => {
            const result = await aplicarSugestoesRedistribuicaoDemandas({
                origem: "IA",
                pergunta:
                    "Aplicacao manual das sugestoes de redistribuicao geradas automaticamente pelo modulo de demandas.",
                sugestoes: selected,
                planoId: planoId || undefined,
            });
            if (!result.success) {
                setError(result.error || "Erro ao aplicar redistribuicao.");
                return;
            }
            setInfo(
                `Redistribuicao aplicada: ${result.aplicadas || 0} tarefa(s). Ignoradas: ${
                    result.ignoradas?.length || 0
                }.`
            );
            const remaining = sugestoes.filter((item) => !selectedIds.includes(item.tarefaId));
            setSugestoes(remaining);
            setSelectedIds([]);
        });
    }

    return (
        <section className="glass-card p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-warning/15 text-warning flex items-center justify-center">
                        <ArrowRightLeft size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-text-primary">Redistribuicao assistida</h3>
                        <p className="text-xs text-text-muted">
                            Sugestoes de balanceamento com confirmacao humana
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={handleGenerate} disabled={isGenerating}>
                        {isGenerating ? (
                            <>
                                <Loader2 size={14} className="animate-spin" /> Gerando...
                            </>
                        ) : (
                            <>
                                <ArrowRightLeft size={14} /> Gerar sugestoes
                            </>
                        )}
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleApply}
                        disabled={isApplying || selectedIds.length === 0 || !canApplyLote}
                        title={
                            canApplyLote
                                ? undefined
                                : "Perfil sem permissao para aplicar redistribuicao em lote."
                        }
                    >
                        {isApplying ? (
                            <>
                                <Loader2 size={14} className="animate-spin" /> Aplicando...
                            </>
                        ) : (
                            <>
                                <CheckSquare size={14} /> Aplicar selecionadas
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger mb-3">
                    {error}
                </div>
            )}
            {info && (
                <div className="rounded-lg border border-border bg-bg-tertiary/30 px-3 py-2 text-xs text-text-secondary mb-3">
                    {info}
                </div>
            )}
            {!canApplyLote && (
                <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning mb-3">
                    A aplicacao em lote exige perfil autorizado (advogado, socio, controlador ou admin).
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full min-w-[860px]">
                    <thead>
                        <tr className="border-b border-border bg-bg-tertiary/20">
                            <th className="px-3 py-2 text-left">
                                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                            </th>
                            <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Tarefa</th>
                            <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Origem</th>
                            <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Destino</th>
                            <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Prioridade</th>
                            <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Area</th>
                            <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Motivo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sugestoes.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-3 py-8 text-center text-sm text-text-muted">
                                    Nenhuma sugestao carregada.
                                </td>
                            </tr>
                        ) : (
                            sugestoes.map((item) => (
                                <tr key={item.tarefaId} className="border-b border-border last:border-0 hover:bg-bg-tertiary/20">
                                    <td className="px-3 py-2.5">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(item.tarefaId)}
                                            onChange={() => toggleOne(item.tarefaId)}
                                        />
                                    </td>
                                    <td className="px-3 py-2.5 text-sm text-text-primary">{item.tarefaTitulo}</td>
                                    <td className="px-3 py-2.5 text-xs text-text-secondary">{item.fromAdvogadoNome}</td>
                                    <td className="px-3 py-2.5 text-xs text-text-secondary">{item.toAdvogadoNome}</td>
                                    <td className="px-3 py-2.5 text-xs">
                                        <Badge variant={item.prioridadeSugerida === "URGENTE" ? "danger" : item.prioridadeSugerida === "ALTA" ? "warning" : "muted"}>
                                            {item.prioridadeAtual} -&gt; {item.prioridadeSugerida}
                                        </Badge>
                                    </td>
                                    <td className="px-3 py-2.5 text-xs text-text-secondary">{item.area}</td>
                                    <td className="px-3 py-2.5 text-xs text-text-muted">{item.motivo}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
