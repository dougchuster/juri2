"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import {
    createLgpdRequestAction,
    executeLgpdRequestAction,
    generateLgpdExportAction,
    updateLgpdRequestStatusAction,
} from "@/actions/lgpd";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    formatLgpdConsentActionLabel,
    formatLgpdRequestStatusLabel,
    formatLgpdRequestTypeLabel,
    getLgpdAllowedNextStatuses,
} from "@/lib/services/lgpd-core";
import { formatDate } from "@/lib/utils";
import type {
    LgpdClientOption,
    LgpdConsentHistoryItem,
    LgpdRequestListItem,
} from "@/lib/services/lgpd-service";

type FeedbackState =
    | { variant: "success" | "error" | "info"; message: string }
    | null;

const REQUEST_TYPE_OPTIONS = [
    "ACESSO",
    "CORRECAO",
    "ANONIMIZACAO",
    "EXCLUSAO",
    "REVOGACAO_CONSENTIMENTO",
    "OUTRO",
] as const;

type RequestTypeOption = (typeof REQUEST_TYPE_OPTIONS)[number];

function getStatusVariant(status: LgpdRequestListItem["status"]) {
    if (status === "CONCLUIDA") return "success" as const;
    if (status === "CANCELADA") return "danger" as const;
    if (status === "EM_ATENDIMENTO") return "warning" as const;
    return "muted" as const;
}

function getConsentVariant(marketingConsent: boolean) {
    return marketingConsent ? ("success" as const) : ("warning" as const);
}

function canExecuteRequest(request: LgpdRequestListItem) {
    return (
        ["ANONIMIZACAO", "EXCLUSAO", "REVOGACAO_CONSENTIMENTO"].includes(request.requestType) &&
        !["CONCLUIDA", "CANCELADA"].includes(request.status)
    );
}

export function AdminLgpdConsole({
    requests,
    consentHistory,
    clientOptions,
}: {
    requests: LgpdRequestListItem[];
    consentHistory: LgpdConsentHistoryItem[];
    clientOptions: LgpdClientOption[];
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const [clienteId, setClienteId] = useState(clientOptions[0]?.id || "");
    const [requestType, setRequestType] = useState<RequestTypeOption>("ACESSO");
    const [legalBasis, setLegalBasis] = useState("Solicitacao do titular");
    const [notes, setNotes] = useState("");
    const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
    const [renderedAt] = useState(() => Date.now());

    async function handleCreateRequest() {
        startTransition(async () => {
            const result = await createLgpdRequestAction({
                clienteId,
                requestType,
                legalBasis,
                notes,
            });

            if (!result.success) {
                const errorMessage =
                    typeof result.error === "string"
                        ? result.error
                        : "Nao foi possivel abrir a solicitacao.";
                setFeedback({ variant: "error", message: errorMessage });
                return;
            }

            setFeedback({ variant: "success", message: "Solicitacao LGPD aberta com sucesso." });
            setNotes("");
            router.refresh();
        });
    }

    async function handleStatusChange(requestId: string, status: LgpdRequestListItem["status"]) {
        startTransition(async () => {
            const result = await updateLgpdRequestStatusAction({
                requestId,
                status,
                resolutionNotes: resolutionNotes[requestId] || "",
            });

            if (!result.success) {
                const errorMessage =
                    typeof result.error === "string"
                        ? result.error
                        : "Nao foi possivel atualizar a solicitacao.";
                setFeedback({ variant: "error", message: errorMessage });
                return;
            }

            setFeedback({
                variant: "success",
                message: `Solicitacao movida para ${formatLgpdRequestStatusLabel(status).toLowerCase()}.`,
            });
            router.refresh();
        });
    }

    async function handleGenerateExport(requestId: string) {
        startTransition(async () => {
            const result = await generateLgpdExportAction({ requestId });

            if (!result.success) {
                const errorMessage =
                    typeof result.error === "string"
                        ? result.error
                        : "Nao foi possivel gerar o pacote LGPD.";
                setFeedback({ variant: "error", message: errorMessage });
                return;
            }

            setFeedback({ variant: "success", message: "Pacote LGPD gerado com sucesso." });
            router.refresh();
            if (result.fileUrl) {
                window.open(result.fileUrl, "_blank", "noopener,noreferrer");
            }
        });
    }

    async function handleExecuteRequest(requestId: string) {
        startTransition(async () => {
            const result = await executeLgpdRequestAction({
                requestId,
                resolutionNotes: resolutionNotes[requestId] || "",
            });

            if (!result.success) {
                const errorMessage =
                    typeof result.error === "string"
                        ? result.error
                        : "Nao foi possivel executar a solicitacao LGPD.";
                setFeedback({ variant: "error", message: errorMessage });
                return;
            }

            setFeedback({ variant: "success", message: "Solicitacao LGPD executada com sucesso." });
            router.refresh();
        });
    }

    return (
        <div className="space-y-6">
            <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Abrir solicitacao LGPD</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Registre o pedido do titular, tipo de tratamento e contexto operacional antes da execucao.
                    </p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_220px_1fr]">
                    <label className="space-y-2 text-sm">
                        <span className="font-medium text-[var(--text-primary)]">Titular</span>
                        <select
                            value={clienteId}
                            onChange={(event) => setClienteId(event.target.value)}
                            className="h-11 w-full rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                        >
                            {clientOptions.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.nome} {item.email ? `- ${item.email}` : ""}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-2 text-sm">
                        <span className="font-medium text-[var(--text-primary)]">Tipo de pedido</span>
                        <select
                            value={requestType}
                            onChange={(event) => setRequestType(event.target.value as RequestTypeOption)}
                            className="h-11 w-full rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                        >
                            {REQUEST_TYPE_OPTIONS.map((item) => (
                                <option key={item} value={item}>
                                    {formatLgpdRequestTypeLabel(item)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-2 text-sm">
                        <span className="font-medium text-[var(--text-primary)]">Base legal ou contexto</span>
                        <input
                            value={legalBasis}
                            onChange={(event) => setLegalBasis(event.target.value)}
                            className="h-11 w-full rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                        />
                    </label>
                </div>

                <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_auto]">
                    <label className="space-y-2 text-sm">
                        <span className="font-medium text-[var(--text-primary)]">Observacoes</span>
                        <textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            rows={3}
                            placeholder="Detalhes adicionais do pedido, canal de origem ou documentos de suporte."
                            className="w-full rounded-[20px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                        />
                    </label>

                    <div className="flex items-end">
                        <Button
                            type="button"
                            onClick={() => void handleCreateRequest()}
                            disabled={isPending || !clienteId || legalBasis.trim().length < 3}
                            className="min-w-44"
                        >
                            <ShieldCheck size={16} className="mr-2" />
                            {isPending ? "Registrando..." : "Abrir solicitacao"}
                        </Button>
                    </div>
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

            <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Fila de solicitacoes</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Acompanhe o pedido desde a abertura ate o fechamento, sem misturar governanca e execucao final.
                        </p>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Total exibido: <span className="font-semibold text-[var(--text-primary)]">{requests.length}</span>
                    </p>
                </div>

                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--card-border)] text-sm">
                        <thead className="bg-[var(--surface-soft)] text-left text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Titular</th>
                                <th className="px-4 py-3 font-semibold">Pedido</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold">Consentimento</th>
                                <th className="px-4 py-3 font-semibold">Responsavel</th>
                                <th className="px-4 py-3 font-semibold">Observacoes</th>
                                <th className="px-4 py-3 font-semibold">Acoes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--card-border)]">
                            {requests.map((request) => {
                                const nextStatuses = getLgpdAllowedNextStatuses(request.status);
                                const latestExport = request.latestExport;
                                const latestExportExpired = latestExport
                                    ? new Date(latestExport.expiresAt).getTime() < renderedAt
                                    : false;

                                return (
                                    <tr key={request.id} className="align-top">
                                        <td className="px-4 py-4">
                                            <div className="space-y-1">
                                                <p className="font-medium text-[var(--text-primary)]">{request.cliente.nome}</p>
                                                <p className="text-xs text-[var(--text-secondary)]">
                                                    {request.cliente.email || request.cliente.whatsapp || request.cliente.celular || "Sem contato"}
                                                </p>
                                                <p className="text-xs text-[var(--text-secondary)]">
                                                    Aberta em {formatDate(request.openedAt)}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="space-y-2">
                                                <Badge variant="default">{formatLgpdRequestTypeLabel(request.requestType)}</Badge>
                                                <p className="text-xs text-[var(--text-secondary)]">{request.legalBasis || "Sem base legal informada"}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <Badge variant={getStatusVariant(request.status)}>
                                                {formatLgpdRequestStatusLabel(request.status)}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="space-y-2">
                                                <Badge variant={getConsentVariant(request.cliente.marketingConsent)}>
                                                    {request.cliente.marketingConsent ? "Consentimento ativo" : "Consentimento revogado"}
                                                </Badge>
                                                {request.cliente.marketingConsentAt ? (
                                                    <p className="text-xs text-[var(--text-secondary)]">
                                                        Atualizado em {formatDate(request.cliente.marketingConsentAt)}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                                                <p>
                                                    Solicitado por{" "}
                                                    <span className="font-medium text-[var(--text-primary)]">
                                                        {request.requestedBy?.name || "Sistema"}
                                                    </span>
                                                </p>
                                                <p>
                                                    Em atendimento por{" "}
                                                    <span className="font-medium text-[var(--text-primary)]">
                                                        {request.assignedTo?.name || "-"}
                                                    </span>
                                                </p>
                                                {request.completedAt ? <p>Fechada em {formatDate(request.completedAt)}</p> : null}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="space-y-2">
                                                <p className="max-w-xs whitespace-pre-wrap text-xs text-[var(--text-secondary)]">
                                                    {request.notes || "Sem observacoes iniciais."}
                                                </p>
                                                <textarea
                                                    value={resolutionNotes[request.id] || request.resolutionNotes || ""}
                                                    onChange={(event) =>
                                                        setResolutionNotes((current) => ({
                                                            ...current,
                                                            [request.id]: event.target.value,
                                                        }))
                                                    }
                                                    rows={3}
                                                    placeholder="Notas de analise, encaminhamento ou encerramento."
                                                    className="w-full min-w-56 rounded-[18px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                                                />
                                                {latestExport ? (
                                                    <div className="rounded-[16px] border border-[var(--card-border)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                                                        <p className="font-medium text-[var(--text-primary)]">
                                                            Ultimo pacote: {latestExport.fileName}
                                                        </p>
                                                        <p>Gerado em {formatDate(latestExport.generatedAt)}</p>
                                                        <p>
                                                            Expira em {formatDate(latestExport.expiresAt)}
                                                            {latestExportExpired ? " (expirado)" : ""}
                                                        </p>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex min-w-52 flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => void handleGenerateExport(request.id)}
                                                    disabled={isPending}
                                                    className="h-9"
                                                >
                                                    Gerar pacote
                                                </Button>
                                                {latestExport && !latestExportExpired ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => window.open(latestExport.fileUrl, "_blank", "noopener,noreferrer")}
                                                        disabled={isPending}
                                                        className="h-9"
                                                    >
                                                        Baixar ultimo
                                                    </Button>
                                                ) : null}
                                                {canExecuteRequest(request) ? (
                                                    <Button
                                                        type="button"
                                                        onClick={() => void handleExecuteRequest(request.id)}
                                                        disabled={isPending}
                                                        className="h-9"
                                                    >
                                                        Executar pedido
                                                    </Button>
                                                ) : null}
                                                {nextStatuses.length > 0 ? (
                                                    nextStatuses.map((nextStatus) => (
                                                        <Button
                                                            key={nextStatus}
                                                            type="button"
                                                            variant={nextStatus === "CANCELADA" ? "destructive" : "outline"}
                                                            onClick={() => void handleStatusChange(request.id, nextStatus)}
                                                            disabled={isPending}
                                                            className="h-9"
                                                        >
                                                            {formatLgpdRequestStatusLabel(nextStatus)}
                                                        </Button>
                                                    ))
                                                ) : null}
                                                {nextStatuses.length === 0 && !canExecuteRequest(request) ? (
                                                    <p className="text-xs text-[var(--text-secondary)]">Solicitacao encerrada.</p>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-elevated)] p-6">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Historico consolidado de consentimento</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Leitura central dos eventos de opt-in e revogacao ja capturados pelo CRM.
                    </p>
                </div>

                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--card-border)] text-sm">
                        <thead className="bg-[var(--surface-soft)] text-left text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Titular</th>
                                <th className="px-4 py-3 font-semibold">Evento</th>
                                <th className="px-4 py-3 font-semibold">Status atual</th>
                                <th className="px-4 py-3 font-semibold">Operador</th>
                                <th className="px-4 py-3 font-semibold">Data</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--card-border)]">
                            {consentHistory.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-4">
                                        <div className="space-y-1">
                                            <p className="font-medium text-[var(--text-primary)]">{item.cliente.nome}</p>
                                            <p className="text-xs text-[var(--text-secondary)]">{item.cliente.email || "Sem e-mail"}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="space-y-1">
                                            <Badge variant={item.actionType === "CONSENTIMENTO" ? "success" : "warning"}>
                                                {formatLgpdConsentActionLabel(item.actionType)}
                                            </Badge>
                                            <p className="text-xs text-[var(--text-secondary)]">{item.details || "Sem detalhe adicional."}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <Badge variant={getConsentVariant(item.cliente.marketingConsent)}>
                                            {item.cliente.marketingConsent ? "Ativo" : "Revogado"}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4 text-xs text-[var(--text-secondary)]">
                                        {item.requestedBy?.name || "Sistema"}
                                    </td>
                                    <td className="px-4 py-4 text-xs text-[var(--text-secondary)]">
                                        {formatDate(item.createdAt)}
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
