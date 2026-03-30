"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    AlertCircle,
    Check,
    ChevronDown,
    LinkIcon,
    Loader2,
    PlusCircle,
    Search,
    UserRoundSearch,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { criarProcessoParaPublicacao, vincularPublicacao } from "@/actions/publicacoes";

interface ClienteOption {
    id: string;
    nome: string;
}

interface ProcessoOption {
    id: string;
    numeroCnj: string | null;
    clienteId: string | null;
    clienteNome: string;
}

interface Props {
    publicacaoId: string;
    linkedProcessoId?: string | null;
    linkedClienteId?: string | null;
    suggestedProcessId?: string | null;
    suggestedProcessNumber?: string | null;
    detectedProcessNumberMissing?: boolean;
    clients: ClienteOption[];
    processes: ProcessoOption[];
}

export function PublicacaoLinkWorkbench({
    publicacaoId,
    linkedProcessoId,
    linkedClienteId,
    suggestedProcessId,
    suggestedProcessNumber,
    detectedProcessNumberMissing = false,
    clients,
    processes,
}: Props) {
    const router = useRouter();
    const clientPickerRef = useRef<HTMLDivElement | null>(null);
    const processPickerRef = useRef<HTMLDivElement | null>(null);
    const [selectedClientId, setSelectedClientId] = useState(linkedClienteId || "");
    const [selectedProcessoId, setSelectedProcessoId] = useState(linkedProcessoId || suggestedProcessId || "");
    const [clientSearch, setClientSearch] = useState("");
    const [processSearch, setProcessSearch] = useState("");
    const [clientPickerOpen, setClientPickerOpen] = useState(false);
    const [processPickerOpen, setProcessPickerOpen] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;

            if (clientPickerRef.current && !clientPickerRef.current.contains(target)) {
                setClientPickerOpen(false);
            }

            if (processPickerRef.current && !processPickerRef.current.contains(target)) {
                setProcessPickerOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const visibleClients = useMemo(() => {
        const normalizedQuery = clientSearch.trim().toLowerCase();
        if (!normalizedQuery) return clients;

        return clients.filter((client) => client.nome.toLowerCase().includes(normalizedQuery));
    }, [clientSearch, clients]);

    const selectedClient = useMemo(
        () => clients.find((client) => client.id === selectedClientId) ?? null,
        [clients, selectedClientId]
    );

    const visibleProcesses = useMemo(() => {
        const normalizedSuggested = (suggestedProcessNumber || "").replace(/\D/g, "");
        const normalizedQuery = processSearch.trim().toLowerCase();

        return [...processes]
            .filter((processo) => !selectedClientId || processo.clienteId === selectedClientId)
            .filter((processo) => {
                if (!normalizedQuery) return true;

                const processLabel = `${processo.numeroCnj || "Sem numero"} ${processo.clienteNome}`.toLowerCase();
                return processLabel.includes(normalizedQuery);
            })
            .sort((left, right) => {
                const leftSuggested =
                    normalizedSuggested &&
                    (left.numeroCnj || "").replace(/\D/g, "") === normalizedSuggested;
                const rightSuggested =
                    normalizedSuggested &&
                    (right.numeroCnj || "").replace(/\D/g, "") === normalizedSuggested;

                if (leftSuggested && !rightSuggested) return -1;
                if (!leftSuggested && rightSuggested) return 1;

                return (left.numeroCnj || "").localeCompare(right.numeroCnj || "", "pt-BR");
            });
    }, [processSearch, processes, selectedClientId, suggestedProcessNumber]);

    const selectedProcess = useMemo(
        () => processes.find((processo) => processo.id === selectedProcessoId) ?? null,
        [processes, selectedProcessoId]
    );

    function handleLinkProcesso() {
        if (!selectedProcessoId) return;

        setFeedback(null);
        setError(null);

        startTransition(async () => {
            const result = await vincularPublicacao(publicacaoId, selectedProcessoId);
            if (!result.success) {
                setError(result.error || "Nao foi possivel vincular a publicacao ao processo.");
                return;
            }

            setFeedback("Publicacao vinculada ao processo selecionado.");
            router.refresh();
        });
    }

    function handleCreateProcesso() {
        if (!selectedClientId) return;

        setFeedback(null);
        setError(null);

        startTransition(async () => {
            const result = await criarProcessoParaPublicacao({
                publicacaoId,
                clienteId: selectedClientId,
                advogadoId: "",
            });

            if (!result.success) {
                setError(result.error || "Nao foi possivel criar o processo para esta publicacao.");
                return;
            }

            setFeedback(
                result.reused
                    ? "Processo existente encontrado e vinculado automaticamente."
                    : "Processo criado e vinculado com sucesso."
            );
            router.refresh();
        });
    }

    function handleCreateProcessoSemCliente() {
        setFeedback(null);
        setError(null);

        startTransition(async () => {
            const result = await criarProcessoParaPublicacao({
                publicacaoId,
                clienteId: null,
                advogadoId: "",
            });

            if (!result.success) {
                setError(result.error || "Nao foi possivel criar o processo sem cliente para esta publicacao.");
                return;
            }

            setFeedback(
                result.reused
                    ? "Processo existente encontrado e vinculado automaticamente."
                    : "Processo criado em modo de triagem, sem cliente vinculado."
            );
            router.refresh();
        });
    }

    return (
        <div className="relative z-30 space-y-4 rounded-2xl border border-border bg-bg-secondary/50 p-4 text-left">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <UserRoundSearch size={16} className="text-accent" />
                    Tratamento manual da publicacao
                </div>
                <p className="text-xs leading-5 text-text-muted">
                    Informe o cliente manualmente e, se preferir, vincule a publicacao a outro processo relacionado.
                </p>
            </div>

            {suggestedProcessNumber ? (
                <div
                    className={`rounded-xl border px-3 py-2 text-xs ${
                        detectedProcessNumberMissing
                            ? "border-warning/30 bg-warning/8 text-warning"
                            : "border-info/30 bg-info/8 text-info"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <AlertCircle size={14} />
                        <span className="font-medium">
                            CNJ detectado no texto: <span className="font-mono">{suggestedProcessNumber}</span>
                        </span>
                    </div>
                    {detectedProcessNumberMissing ? (
                        <p className="mt-1 text-[11px] opacity-90">
                            Esta publicacao veio sem o numero persistido no cadastro antigo, apesar de o CNJ estar
                            explicito no conteudo.
                        </p>
                    ) : null}
                </div>
            ) : null}

            {suggestedProcessId && !linkedProcessoId ? (
                <div className="rounded-xl border border-info/30 bg-info/8 px-3 py-2 text-xs text-info">
                    Já existe um processo cadastrado com esse CNJ no sistema. Ele foi pré-selecionado para vínculo.
                </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        Cliente da publicacao
                    </span>

                    <div className="relative z-40" ref={clientPickerRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setClientPickerOpen((open) => !open);
                                if (!clientPickerOpen) setClientSearch("");
                            }}
                            className={`flex h-10 w-full items-center justify-between rounded-xl border px-3 text-sm transition-colors ${
                                clientPickerOpen
                                    ? "border-accent ring-2 ring-accent/20"
                                    : "border-border bg-bg-tertiary hover:border-border-hover"
                            }`}
                        >
                            <span className={selectedClient ? "text-text-primary" : "text-text-muted"}>
                                {selectedClient ? selectedClient.nome : "Selecionar cliente"}
                            </span>
                            <div className="flex items-center gap-1">
                                {selectedClient ? (
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setSelectedClientId("");
                                            setSelectedProcessoId(suggestedProcessId || "");
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                setSelectedClientId("");
                                                setSelectedProcessoId(suggestedProcessId || "");
                                            }
                                        }}
                                        className="rounded p-0.5 text-text-muted hover:bg-bg-secondary hover:text-text-primary"
                                    >
                                        <X size={13} />
                                    </span>
                                ) : null}
                                <ChevronDown
                                    size={15}
                                    className={`text-text-muted transition-transform ${clientPickerOpen ? "rotate-180" : ""}`}
                                />
                            </div>
                        </button>

                        {clientPickerOpen ? (
                            <div className="absolute z-[120] mt-1 w-full rounded-xl border border-border bg-bg-primary shadow-lg">
                                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                                    <Search size={14} className="shrink-0 text-text-muted" />
                                    <input
                                        autoFocus
                                        type="text"
                                        value={clientSearch}
                                        onChange={(event) => setClientSearch(event.target.value)}
                                        placeholder="Buscar cliente..."
                                        className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                                    />
                                </div>

                                <ul className="max-h-56 overflow-y-auto py-1">
                                    <li>
                                        <button
                                            type="button"
                                            className="w-full px-3 py-2 text-left text-sm text-text-muted hover:bg-bg-secondary"
                                            onClick={() => {
                                                setSelectedClientId("");
                                                setSelectedProcessoId(suggestedProcessId || "");
                                                setClientPickerOpen(false);
                                                setClientSearch("");
                                            }}
                                        >
                                            Nenhum
                                        </button>
                                    </li>
                                    {visibleClients.map((client) => (
                                        <li key={client.id}>
                                            <button
                                                type="button"
                                                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-bg-secondary ${
                                                    client.id === selectedClientId
                                                        ? "bg-accent/10 font-medium text-accent"
                                                        : "text-text-primary"
                                                }`}
                                                onClick={() => {
                                                    setSelectedClientId(client.id);
                                                    setSelectedProcessoId("");
                                                    setClientPickerOpen(false);
                                                    setClientSearch("");
                                                }}
                                            >
                                                <span>{client.nome}</span>
                                                {client.id === selectedClientId ? <Check size={14} /> : null}
                                            </button>
                                        </li>
                                    ))}
                                    {visibleClients.length === 0 ? (
                                        <li className="px-3 py-2 text-sm text-text-muted">
                                            Nenhum cliente encontrado.
                                        </li>
                                    ) : null}
                                </ul>
                            </div>
                        ) : null}
                    </div>

                    <p className="text-[11px] text-text-muted">
                        {visibleClients.length} cliente(s) encontrado(s)
                    </p>
                </label>

                <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        Processo relacionado
                    </span>

                    <div className="relative z-40" ref={processPickerRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setProcessPickerOpen((open) => !open);
                                if (!processPickerOpen) setProcessSearch("");
                            }}
                            className={`flex h-10 w-full items-center justify-between rounded-xl border px-3 text-sm transition-colors ${
                                processPickerOpen
                                    ? "border-accent ring-2 ring-accent/20"
                                    : "border-border bg-bg-tertiary hover:border-border-hover"
                            }`}
                        >
                            <span className={selectedProcess ? "text-text-primary" : "text-text-muted"}>
                                {selectedProcess
                                    ? `${selectedProcess.numeroCnj || "Sem numero"} - ${selectedProcess.clienteNome}`
                                    : "Selecionar processo"}
                            </span>
                            <div className="flex items-center gap-1">
                                {selectedProcess ? (
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setSelectedProcessoId("");
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                setSelectedProcessoId("");
                                            }
                                        }}
                                        className="rounded p-0.5 text-text-muted hover:bg-bg-secondary hover:text-text-primary"
                                    >
                                        <X size={13} />
                                    </span>
                                ) : null}
                                <ChevronDown
                                    size={15}
                                    className={`text-text-muted transition-transform ${processPickerOpen ? "rotate-180" : ""}`}
                                />
                            </div>
                        </button>

                        {processPickerOpen ? (
                            <div className="absolute z-[120] mt-1 w-full rounded-xl border border-border bg-bg-primary shadow-lg">
                                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                                    <Search size={14} className="shrink-0 text-text-muted" />
                                    <input
                                        autoFocus
                                        type="text"
                                        value={processSearch}
                                        onChange={(event) => setProcessSearch(event.target.value)}
                                        placeholder="Buscar processo ou cliente..."
                                        className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                                    />
                                </div>

                                <ul className="max-h-56 overflow-y-auto py-1">
                                    <li>
                                        <button
                                            type="button"
                                            className="w-full px-3 py-2 text-left text-sm text-text-muted hover:bg-bg-secondary"
                                            onClick={() => {
                                                setSelectedProcessoId("");
                                                setProcessPickerOpen(false);
                                                setProcessSearch("");
                                            }}
                                        >
                                            Nenhum
                                        </button>
                                    </li>
                                    {visibleProcesses.map((processo) => {
                                        const matchesSuggested =
                                            suggestedProcessNumber &&
                                            (processo.numeroCnj || "").replace(/\D/g, "") ===
                                                suggestedProcessNumber.replace(/\D/g, "");

                                        return (
                                            <li key={processo.id}>
                                                <button
                                                    type="button"
                                                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-bg-secondary ${
                                                        processo.id === selectedProcessoId
                                                            ? "bg-accent/10 font-medium text-accent"
                                                            : "text-text-primary"
                                                    }`}
                                                    onClick={() => {
                                                        setSelectedProcessoId(processo.id);
                                                        setProcessPickerOpen(false);
                                                        setProcessSearch("");
                                                    }}
                                                >
                                                    <span className="min-w-0">
                                                        <span className="block truncate">
                                                            {processo.numeroCnj || "Sem numero"} - {processo.clienteNome}
                                                        </span>
                                                        {matchesSuggested ? (
                                                            <span className="block text-[11px] text-info">
                                                                CNJ detectado
                                                            </span>
                                                        ) : null}
                                                    </span>
                                                    {processo.id === selectedProcessoId ? <Check size={14} /> : null}
                                                </button>
                                            </li>
                                        );
                                    })}
                                    {visibleProcesses.length === 0 ? (
                                        <li className="px-3 py-2 text-sm text-text-muted">
                                            Nenhum processo encontrado.
                                        </li>
                                    ) : null}
                                </ul>
                            </div>
                        ) : null}
                    </div>

                    <p className="text-[11px] text-text-muted">
                        {visibleProcesses.length} processo(s) encontrado(s)
                    </p>
                </label>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={handleLinkProcesso}
                    disabled={!selectedProcessoId || isPending}
                >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <LinkIcon size={14} />}
                    Vincular processo selecionado
                </Button>

                <Button
                    type="button"
                    onClick={handleCreateProcesso}
                    disabled={!selectedClientId || isPending}
                >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
                    Criar processo para este cliente
                </Button>

                <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCreateProcessoSemCliente}
                    disabled={isPending}
                >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
                    Criar processo sem cliente
                </Button>
            </div>

            {feedback ? (
                <div className="rounded-xl border border-success/30 bg-success/8 px-3 py-2 text-xs text-success">
                    {feedback}
                </div>
            ) : null}

            {error ? (
                <div className="rounded-xl border border-danger/30 bg-danger/8 px-3 py-2 text-xs text-danger">
                    {error}
                </div>
            ) : null}
        </div>
    );
}
