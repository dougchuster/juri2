"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, BotOff, Clock3, PauseCircle, PlayCircle, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type AutomationControlState = {
    iaDesabilitada: boolean;
    iaDesabilitadaEm: string | null;
    iaDesabilitadaPor: string | null;
    autoAtendimentoPausado: boolean;
    pausadoAte: string | null;
    motivoPausa: string | null;
};

type TriggerPreview = {
    flowName: string | null;
    reason: string | null;
    reply: string;
    mode: string | null;
    context: string;
    recentInboundCount: number;
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
    const [triggerFeedback, setTriggerFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
    const [triggerPreview, setTriggerPreview] = useState<TriggerPreview | null>(null);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [recentInboundCount, setRecentInboundCount] = useState("4");
    const [manualInput, setManualInput] = useState("");
    const [isSavingControl, setIsSavingControl] = useState(false);
    const [isTriggering, setIsTriggering] = useState(false);

    useEffect(() => {
        setReason(state.motivoPausa || "");
    }, [state.motivoPausa]);

    const statusLabel = useMemo(() => {
        if (state.iaDesabilitada) return "IA pausada";
        if (state.autoAtendimentoPausado && state.pausadoAte) {
            return `Volta em ${formatRemainingPause(state.pausadoAte)}`;
        }
        if (state.autoAtendimentoPausado) return "Manual";
        return "IA ativa";
    }, [state.autoAtendimentoPausado, state.iaDesabilitada, state.pausadoAte]);

    async function submitPatch(payload: Record<string, unknown>) {
        setError(null);
        setIsSavingControl(true);
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
        } finally {
            setIsSavingControl(false);
        }
    }

    async function handleTriggerAI(previewOnly: boolean) {
        setTriggerFeedback(null);
        setError(null);
        if (!previewOnly) {
            setTriggerPreview(null);
        }

        setIsTriggering(true);
        try {
            const response = await fetch(
                `/api/comunicacao/conversations/${conversationId}/trigger-automation`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        previewOnly,
                        recentInboundCount: Number(recentInboundCount),
                        incomingTextOverride: manualInput.trim() || null,
                    }),
                }
            );
            const result = await response.json();

            if (!response.ok || !result) {
                throw new Error(result?.error || "Falha ao acionar IA.");
            }

            if (previewOnly) {
                const preview = result.preview as TriggerPreview | undefined;
                if (preview) {
                    setTriggerPreview(preview);
                    setPreviewModalOpen(true);
                    setTriggerFeedback({
                        ok: true,
                        msg: preview.flowName
                            ? `Simulacao pronta no fluxo ${preview.flowName}.`
                            : "Simulacao gerada.",
                    });
                    return;
                }
                throw new Error(result.error || "Nao foi possivel gerar a simulacao.");
            }

            setTriggerFeedback({
                ok: true,
                msg: result.reason || "IA processada com sucesso.",
            });
            setPreviewModalOpen(false);
        } catch (triggerError) {
            const message =
                triggerError instanceof Error
                    ? triggerError.message
                    : "Falha ao acionar IA.";
            setTriggerFeedback({ ok: false, msg: message });
        } finally {
            setIsTriggering(false);
        }
    }

    const isBusy = Boolean(disabled || isSavingControl);

    return (
        <div className="relative">
            <button
                type="button"
                disabled={isBusy}
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
                <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-[360px] rounded-[22px] border border-border bg-[var(--bg-primary)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.16)]">
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
                                onClick={() => void submitPatch({ iaDesabilitada: !state.iaDesabilitada })}
                                disabled={isBusy}
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
                                    void submitPatch({ autoAtendimentoPausado: !state.autoAtendimentoPausado })
                                }
                                disabled={isBusy}
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
                                        onClick={() =>
                                            void submitPatch({
                                                autoAtendimentoPausado: true,
                                                pausarPorMinutos: minutes,
                                            })
                                        }
                                        disabled={isBusy}
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

                        {!state.iaDesabilitada && !state.autoAtendimentoPausado ? (
                            <div className="rounded-[18px] border border-accent/20 bg-[var(--accent-subtle)] p-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={13} className="text-accent" />
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                                        Disparo assistido
                                    </p>
                                </div>
                                <p className="mt-1 text-xs text-text-muted">
                                    Monte o contexto, simule a resposta e so depois envie para o cliente.
                                </p>

                                <div className="mt-3 grid gap-3">
                                    <div className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)]">
                                        <div>
                                            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                                                Janela
                                            </label>
                                            <select
                                                value={recentInboundCount}
                                                onChange={(event) => setRecentInboundCount(event.target.value)}
                                                className="mt-2 h-10 w-full rounded-[14px] border border-border bg-white/75 px-3 text-sm text-text-primary outline-none transition focus:border-accent"
                                            >
                                                {[1, 2, 4, 6, 8].map((count) => (
                                                    <option key={count} value={count}>
                                                        {count} msg
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                                                Contexto manual
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={manualInput}
                                                onChange={(event) => setManualInput(event.target.value)}
                                                placeholder="Opcional. Use para testar uma variacao, resumir o contexto ou simular uma campanha."
                                                className="mt-2 w-full rounded-[14px] border border-border bg-white/75 px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="xs"
                                            className="flex-1"
                                            onClick={() => void handleTriggerAI(true)}
                                            disabled={isTriggering}
                                        >
                                            <Sparkles size={11} />
                                            {isTriggering ? "Simulando..." : "Simular"}
                                        </Button>
                                        <Button
                                            variant="primary"
                                            size="xs"
                                            className="flex-1"
                                            onClick={() => void handleTriggerAI(false)}
                                            disabled={isTriggering}
                                        >
                                            <Zap size={11} />
                                            {isTriggering ? "Processando..." : "Enviar agora"}
                                        </Button>
                                    </div>

                                    {triggerPreview ? (
                                        <div className="rounded-[16px] border border-accent/15 bg-white/82 p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                                                        {triggerPreview.flowName || "Simulacao pronta"}
                                                    </p>
                                                    <p className="mt-1 text-xs text-text-muted">
                                                        {triggerPreview.reason || `${triggerPreview.recentInboundCount} mensagens avaliadas.`}
                                                    </p>
                                                </div>
                                                <span className="rounded-full border border-accent/15 bg-accent/8 px-2 py-1 text-[10px] font-semibold uppercase text-accent">
                                                    {triggerPreview.mode || "auto"}
                                                </span>
                                            </div>
                                            <div className="mt-3 flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="xs"
                                                    className="flex-1"
                                                    onClick={() => setPreviewModalOpen(true)}
                                                >
                                                    Ver simulacao
                                                </Button>
                                                <Button
                                                    variant="primary"
                                                    size="xs"
                                                    className="flex-1"
                                                    onClick={() => void handleTriggerAI(false)}
                                                    disabled={isTriggering}
                                                >
                                                    <Zap size={11} />
                                                    {isTriggering ? "Processando..." : "Enviar agora"}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : null}

                                    {triggerFeedback ? (
                                        <p className={`text-xs ${triggerFeedback.ok ? "text-success" : "text-warning"}`}>
                                            {triggerFeedback.msg}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <Modal
                isOpen={previewModalOpen && Boolean(triggerPreview)}
                onClose={() => setPreviewModalOpen(false)}
                title={triggerPreview?.flowName || "Simulacao do disparo assistido"}
                description="Revise o contexto e a resposta prevista antes de enviar a mensagem para o cliente."
                size="md"
            >
                {triggerPreview ? (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-accent/15 bg-accent/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                                {triggerPreview.mode || "auto"}
                            </span>
                            <span className="rounded-full border border-border bg-[var(--surface-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                                {triggerPreview.recentInboundCount} mensagens
                            </span>
                        </div>

                        <div className="rounded-[18px] border border-border bg-[var(--surface-soft)] p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                                Motivo do fluxo
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                                {triggerPreview.reason || "Fluxo identificado sem observacoes adicionais."}
                            </p>
                        </div>

                        <div className="rounded-[18px] border border-border bg-[var(--surface-soft)] p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                                Contexto usado
                            </p>
                            <div className="mt-2 max-h-[220px] overflow-y-auto whitespace-pre-wrap rounded-[14px] bg-white/70 px-3 py-3 text-sm leading-6 text-text-secondary">
                                {triggerPreview.context}
                            </div>
                        </div>

                        <div className="rounded-[18px] border border-accent/15 bg-[color:color-mix(in_srgb,var(--accent)_6%,white_94%)] p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                                Resposta prevista
                            </p>
                            <div className="mt-2 max-h-[280px] overflow-y-auto whitespace-pre-wrap rounded-[14px] bg-white/82 px-3 py-3 text-sm leading-6 text-text-primary">
                                {triggerPreview.reply}
                            </div>
                        </div>

                        {triggerFeedback ? (
                            <div className={`rounded-[14px] border px-3 py-2 text-sm ${
                                triggerFeedback.ok
                                    ? "border-success/20 bg-success/10 text-success"
                                    : "border-warning/20 bg-warning/10 text-warning"
                            }`}>
                                {triggerFeedback.msg}
                            </div>
                        ) : null}

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPreviewModalOpen(false)}>
                                Fechar
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => void handleTriggerAI(false)}
                                disabled={isTriggering}
                            >
                                <Zap size={12} />
                                {isTriggering ? "Processando..." : "Enviar agora"}
                            </Button>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
}
