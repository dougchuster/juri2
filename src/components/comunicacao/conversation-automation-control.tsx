"use client";

import { useMemo, useState, useTransition } from "react";
import { Bot, BotOff, Clock3, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type AutomationControlState = {
    iaDesabilitada: boolean;
    iaDesabilitadaEm: string | null;
    iaDesabilitadaPor: string | null;
    autoAtendimentoPausado: boolean;
    pausadoAte: string | null;
    motivoPausa: string | null;
};

function formatRemainingPause(pausadoAte: string | null) {
    if (!pausadoAte) return null;
    const diffMs = new Date(pausadoAte).getTime() - Date.now();
    if (diffMs <= 0) return "Retomando...";
    const diffMinutes = Math.ceil(diffMs / 60000);
    if (diffMinutes >= 60) {
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    }
    return `${diffMinutes} min`;
}

export function ConversationAutomationControl({
    conversationId,
    state,
    disabled,
    onUpdated,
}: {
    conversationId: string;
    state: AutomationControlState;
    disabled?: boolean;
    onUpdated: (nextState: AutomationControlState) => void;
}) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState(state.motivoPausa || "");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const statusLabel = useMemo(() => {
        if (state.iaDesabilitada) return "IA pausada";
        if (state.autoAtendimentoPausado && state.pausadoAte) {
            return `Volta em ${formatRemainingPause(state.pausadoAte)}`;
        }
        if (state.autoAtendimentoPausado) return "Manual";
        return "IA ativa";
    }, [state.autoAtendimentoPausado, state.iaDesabilitada, state.pausadoAte]);

    function submitPatch(payload: Record<string, unknown>) {
        setError(null);
        startTransition(async () => {
            try {
                const response = await fetch(`/api/comunicacao/conversations/${conversationId}/automation-control`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ...payload,
                        motivo: reason.trim() || null,
                    }),
                });
                const result = await response.json();
                if (!response.ok || !result?.success || !result?.conversation) {
                    throw new Error(result?.error || "Falha ao atualizar controle da IA.");
                }
                onUpdated(result.conversation as AutomationControlState);
                setOpen(false);
            } catch (requestError) {
                setError(
                    requestError instanceof Error
                        ? requestError.message
                        : "Falha ao atualizar controle da IA."
                );
            }
        });
    }

    return (
        <div className="relative">
            <button
                type="button"
                disabled={disabled || isPending}
                onClick={() => setOpen((current) => !current)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                    state.iaDesabilitada || state.autoAtendimentoPausado
                        ? "border-warning/30 bg-warning/10 text-warning"
                        : "border-success/30 bg-success/10 text-success"
                }`}
                title="Controlar IA e autoatendimento desta conversa"
            >
                {state.iaDesabilitada || state.autoAtendimentoPausado ? <BotOff size={14} /> : <Bot size={14} />}
                {statusLabel}
            </button>

            {open ? (
                <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-[310px] rounded-[22px] border border-border bg-[var(--bg-primary)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.16)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--highlight)]">
                        Controle desta conversa
                    </p>

                    <div className="mt-4 space-y-3">
                        <div className="flex items-start justify-between gap-3 rounded-[18px] border border-border bg-[var(--surface-soft)] p-3">
                            <div>
                                <p className="text-sm font-semibold text-text-primary">Respostas com IA</p>
                                <p className="mt-1 text-xs text-text-muted">
                                    Pausa as respostas automaticas de IA para esta conversa.
                                </p>
                            </div>
                            <Button
                                variant={state.iaDesabilitada ? "outline" : "primary"}
                                size="xs"
                                onClick={() => submitPatch({ iaDesabilitada: !state.iaDesabilitada })}
                                disabled={disabled || isPending}
                            >
                                {state.iaDesabilitada ? <PlayCircle size={12} /> : <PauseCircle size={12} />}
                                {state.iaDesabilitada ? "Retomar" : "Pausar"}
                            </Button>
                        </div>

                        <div className="flex items-start justify-between gap-3 rounded-[18px] border border-border bg-[var(--surface-soft)] p-3">
                            <div>
                                <p className="text-sm font-semibold text-text-primary">Fluxos automaticos</p>
                                <p className="mt-1 text-xs text-text-muted">
                                    Ignora triggers e autoatendimento para esta conversa.
                                </p>
                            </div>
                            <Button
                                variant={state.autoAtendimentoPausado ? "outline" : "primary"}
                                size="xs"
                                onClick={() =>
                                    submitPatch({ autoAtendimentoPausado: !state.autoAtendimentoPausado })
                                }
                                disabled={disabled || isPending}
                            >
                                {state.autoAtendimentoPausado ? <PlayCircle size={12} /> : <PauseCircle size={12} />}
                                {state.autoAtendimentoPausado ? "Retomar" : "Pausar"}
                            </Button>
                        </div>

                        <div className="rounded-[18px] border border-border bg-[var(--surface-soft)] p-3">
                            <div className="flex items-center gap-2">
                                <Clock3 size={14} className="text-text-secondary" />
                                <p className="text-sm font-semibold text-text-primary">Pausa temporaria</p>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {[15, 30, 60, 120].map((minutes) => (
                                    <Button
                                        key={minutes}
                                        variant="outline"
                                        size="xs"
                                        onClick={() => submitPatch({ autoAtendimentoPausado: true, pausarPorMinutos: minutes })}
                                        disabled={disabled || isPending}
                                    >
                                        {minutes >= 60 ? `${minutes / 60}h` : `${minutes}min`}
                                    </Button>
                                ))}
                            </div>
                            {state.autoAtendimentoPausado && state.pausadoAte ? (
                                <p className="mt-2 text-xs text-warning">
                                    Retorno automatico em {formatRemainingPause(state.pausadoAte)}.
                                </p>
                            ) : null}
                        </div>

                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                                Motivo
                            </label>
                            <select
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                className="mt-2 h-10 w-full rounded-[14px] border border-border bg-[var(--surface-soft)] px-3 text-sm text-text-primary outline-none transition focus:border-accent"
                            >
                                <option value="">Sem motivo especifico</option>
                                <option value="atendimento_humano">Assumi o atendimento</option>
                                <option value="caso_complexo">Caso complexo</option>
                                <option value="cliente_pediu">Cliente pediu humano</option>
                                <option value="teste">Teste / desenvolvimento</option>
                                <option value="outro">Outro</option>
                            </select>
                        </div>

                        {error ? (
                            <div className="rounded-[16px] border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">
                                {error}
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
