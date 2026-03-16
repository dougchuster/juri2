"use client";

import { useState, useTransition } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { executarAssistenteDemandasIA } from "@/actions/demandas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-fields";
import { Badge } from "@/components/ui/badge";

interface DemandasAiPanelProps {
    area: string;
    advogadoId: string;
    periodoDias: number;
    sugestoesOperacionais: string[];
}

interface AssistenteResult {
    provider: string;
    enabled: boolean;
    model: string | null;
    planoId: string | null;
    resposta: string;
}

export function DemandasAiPanel({
    area,
    advogadoId,
    periodoDias,
    sugestoesOperacionais,
}: DemandasAiPanelProps) {
    const [question, setQuestion] = useState(
        "Monte um plano de priorizacao para os proximos 7 dias, com foco em prazos criticos e redistribuicao equilibrada."
    );
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AssistenteResult | null>(null);

    function handleRun() {
        setError(null);
        startTransition(async () => {
            const response = await executarAssistenteDemandasIA({
                pergunta: question,
                area,
                advogadoId,
                periodoDias,
                persistirPlano: true,
            });
            if (!response.success) {
                setError(response.error || "Erro ao executar assistente de demandas.");
                return;
            }
            setResult(response.result as AssistenteResult);
        });
    }

    return (
        <section className="glass-card p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
                        <Bot size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-text-primary">Assistente de Demandas IA</h3>
                        <p className="text-xs text-text-muted">Analise inteligente de priorizacao e distribuicao</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="info">
                        <Sparkles size={12} /> Analise assistida
                    </Badge>
                </div>
            </div>

            <div className="space-y-3">
                <Textarea
                    id="demandas-ia-pergunta"
                    label="Pergunta para a IA"
                    rows={4}
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ex.: Priorize tarefas e sugira redistribuicao por carga."
                />

                <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={handleRun} disabled={isPending || question.trim().length < 3}>
                        {isPending ? (
                            <>
                                <Loader2 size={16} className="animate-spin" /> Analisando...
                            </>
                        ) : (
                            <>
                                <Bot size={14} /> Rodar assistente
                            </>
                        )}
                    </Button>
                    <span className="text-xs text-text-muted">
                        Alteracoes operacionais continuam sob validacao humana.
                    </span>
                </div>
            </div>

            {error && (
                <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                    {error}
                </div>
            )}

            {result && (
                <div className="mt-4 rounded-lg border border-border bg-bg-tertiary/30 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                    {result.planoId && <span>Plano salvo</span>}
                    {!result.enabled && <Badge variant="muted">IA indisponivel (fallback)</Badge>}
                </div>
                    <pre className="whitespace-pre-wrap text-xs text-text-secondary leading-relaxed">
                        {result.resposta}
                    </pre>
                </div>
            )}

            {sugestoesOperacionais.length > 0 && !result && (
                <div className="mt-4 rounded-lg border border-border bg-bg-tertiary/30 p-3">
                    <p className="text-xs font-medium text-text-primary mb-2">Sugestoes operacionais locais</p>
                    <ul className="space-y-1.5 text-xs text-text-secondary">
                        {sugestoesOperacionais.slice(0, 4).map((item) => (
                            <li key={item}>- {item}</li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
