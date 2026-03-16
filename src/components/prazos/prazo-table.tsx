"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    AlertTriangle,
    Bot,
    CalendarDays,
    Check,
    ChevronLeft,
    ChevronRight,
    Filter,
    LinkIcon,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    Trash2,
    X,
} from "lucide-react";

import { concluirPrazo, createPrazo, deletePrazo, reprocessarPrazoIa, updatePrazo } from "@/actions/agenda";
import { gerarPrazosPublicacoesIA } from "@/actions/publicacoes";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { getActionErrorMessage } from "@/lib/action-errors";
import { formatDate } from "@/lib/utils";

interface PrazoItem {
    id: string;
    descricao: string;
    dataFatal: string;
    dataCortesia: string | null;
    tipoContagem: string;
    status: string;
    fatal: boolean;
    origem: "MANUAL" | "PUBLICACAO_IA";
    origemConfianca: number | null;
    observacoes?: string | null;
    publicacaoOrigem: {
        id: string;
        tribunal: string;
        dataPublicacao: string;
        processoNumero: string | null;
    } | null;
    processo: {
        id: string;
        numeroCnj: string | null;
        cliente: { nome: string } | null;
    };
    advogado: { user: { name: string | null } };
}

interface ProcessoOption {
    id: string;
    numeroCnj: string | null;
    cliente: { nome: string } | null;
}

interface AdvOption {
    id: string;
    user: { name: string | null };
}

interface PrazoTableProps {
    prazos: PrazoItem[];
    processos: ProcessoOption[];
    advogados: AdvOption[];
    total: number;
    page: number;
    totalPages: number;
    searchParams: Record<string, string>;
}

type FeedbackState =
    | {
          variant: "success" | "info" | "error";
          title: string;
          message: string;
      }
    | null;

function getDiffDays(dataFatal: string) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const fatal = new Date(dataFatal);
    fatal.setHours(0, 0, 0, 0);
    return Math.ceil((fatal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function toDateInputValue(value?: string | null) {
    return value ? value.slice(0, 10) : "";
}

function getClienteNome(prazo: PrazoItem) {
    return prazo.processo.cliente?.nome || "Sem cliente";
}

function getResponsavelNome(prazo: PrazoItem) {
    return prazo.advogado.user.name || "Sem responsavel";
}

function getPrazoTone(prazo: PrazoItem) {
    const diff = getDiffDays(prazo.dataFatal);
    if (prazo.status === "CONCLUIDO") return "border-l-success";
    if (diff < 0) return "border-l-danger";
    if (diff <= 3) return "border-l-warning";
    if (diff <= 7) return "border-l-amber-400";
    return "border-l-success";
}

function CountdownBadge({ prazo }: { prazo: PrazoItem }) {
    if (prazo.status === "CONCLUIDO") {
        return <span className="text-[11px] text-success">Concluido</span>;
    }

    const diff = getDiffDays(prazo.dataFatal);
    if (diff < 0) {
        return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-danger">
                <AlertTriangle size={11} />
                {Math.abs(diff)}d de atraso
            </span>
        );
    }
    if (diff === 0) return <span className="text-[11px] font-semibold text-danger">Vence hoje</span>;
    if (diff <= 3) return <span className="text-[11px] font-semibold text-warning">{diff}d restantes</span>;
    if (diff <= 7) return <span className="text-[11px] text-amber-400">{diff}d restantes</span>;
    return <span className="text-[11px] text-text-muted">{diff}d restantes</span>;
}

function StatusBadge({ prazo }: { prazo: PrazoItem }) {
    if (prazo.status === "CONCLUIDO") return <Badge variant="success">Concluido</Badge>;
    if (getDiffDays(prazo.dataFatal) < 0) return <Badge variant="danger">Vencido</Badge>;
    return <Badge variant="warning">Pendente</Badge>;
}

function UrgencyBar({ prazos }: { prazos: PrazoItem[] }) {
    const pendentes = prazos.filter((prazo) => prazo.status === "PENDENTE");
    const vencidos = pendentes.filter((prazo) => getDiffDays(prazo.dataFatal) < 0).length;
    const urgentes = pendentes.filter((prazo) => {
        const diff = getDiffDays(prazo.dataFatal);
        return diff >= 0 && diff <= 3;
    }).length;
    const semana = pendentes.filter((prazo) => {
        const diff = getDiffDays(prazo.dataFatal);
        return diff > 3 && diff <= 7;
    }).length;
    const ok = pendentes.filter((prazo) => getDiffDays(prazo.dataFatal) > 7).length;
    const total = pendentes.length || 1;

    return (
        <div className="glass-card mb-4 p-4">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Distribuicao de urgencia</span>
                <span className="text-xs text-text-muted">{pendentes.length} pendentes nesta pagina</span>
            </div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full gap-px bg-bg-tertiary">
                {vencidos > 0 ? <div className="h-full rounded-l-full bg-danger" style={{ width: `${(vencidos / total) * 100}%` }} /> : null}
                {urgentes > 0 ? <div className="h-full bg-warning" style={{ width: `${(urgentes / total) * 100}%` }} /> : null}
                {semana > 0 ? <div className="h-full bg-amber-400" style={{ width: `${(semana / total) * 100}%` }} /> : null}
                {ok > 0 ? <div className="h-full rounded-r-full bg-success" style={{ width: `${(ok / total) * 100}%` }} /> : null}
            </div>
        </div>
    );
}

function PrazoFormModal({
    isOpen,
    title,
    submitLabel,
    error,
    hint,
    processos,
    advogados,
    values,
    onClose,
    onSubmit,
}: {
    isOpen: boolean;
    title: string;
    submitLabel: string;
    error: string | null;
    hint?: string | null;
    processos: ProcessoOption[];
    advogados: AdvOption[];
    values: {
        processoId: string;
        advogadoId: string;
        descricao: string;
        dataFatal: string;
        dataCortesia: string;
        tipoContagem: "DIAS_UTEIS" | "DIAS_CORRIDOS";
        fatal: boolean;
        observacoes: string;
    };
    onClose: () => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
            <form onSubmit={onSubmit} className="space-y-5">
                {error ? <ActionFeedback variant="error" title="Falha ao salvar" message={error} /> : null}
                {hint ? <ActionFeedback variant="info" title="Ajuste manual" message={hint} /> : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select
                        id="processoId"
                        name="processoId"
                        label="Processo"
                        required
                        defaultValue={values.processoId}
                        placeholder="Selecionar processo"
                        options={processos.map((processo) => ({
                            value: processo.id,
                            label: `${processo.numeroCnj || "Sem numero"} - ${processo.cliente?.nome || "Sem cliente"}`,
                        }))}
                    />
                    <Select
                        id="advogadoId"
                        name="advogadoId"
                        label="Responsavel"
                        required
                        defaultValue={values.advogadoId}
                        placeholder="Selecionar responsavel"
                        options={advogados.map((advogado) => ({
                            value: advogado.id,
                            label: advogado.user.name || "Sem responsavel",
                        }))}
                    />
                </div>

                <Input id="descricao" name="descricao" label="Descricao" required defaultValue={values.descricao} placeholder="Descreva o prazo" />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Input id="dataFatal" name="dataFatal" label="Data fatal" type="date" required defaultValue={values.dataFatal} />
                    <Input id="dataCortesia" name="dataCortesia" label="Data de cortesia" type="date" defaultValue={values.dataCortesia} />
                    <Select
                        id="tipoContagem"
                        name="tipoContagem"
                        label="Tipo de contagem"
                        defaultValue={values.tipoContagem}
                        options={[
                            { value: "DIAS_UTEIS", label: "Dias uteis" },
                            { value: "DIAS_CORRIDOS", label: "Dias corridos" },
                        ]}
                    />
                </div>

                <Select
                    id="fatal"
                    name="fatal"
                    label="Natureza do prazo"
                    defaultValue={values.fatal ? "true" : "false"}
                    options={[
                        { value: "true", label: "Prazo fatal" },
                        { value: "false", label: "Prazo de cortesia" },
                    ]}
                />

                <Textarea id="observacoes" name="observacoes" label="Observacoes" rows={4} defaultValue={values.observacoes} placeholder="Contexto, ajuste manual ou justificativa" />

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                    <Button variant="secondary" type="button" className="w-full sm:w-auto" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto">
                        {submitLabel}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export function PrazoTable({ prazos, processos, advogados, total, page, totalPages, searchParams }: PrazoTableProps) {
    const router = useRouter();
    const [showCreate, setShowCreate] = useState(false);
    const [editingPrazo, setEditingPrazo] = useState<PrazoItem | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [generatingAi, setGeneratingAi] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [editError, setEditError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<FeedbackState>(null);

    function buildUrl(params: Record<string, string>) {
        const merged = { ...searchParams, ...params };
        const qs = new URLSearchParams(Object.entries(merged).filter(([, value]) => value !== "")).toString();
        return `/prazos${qs ? `?${qs}` : ""}`;
    }

    function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const search = String(formData.get("search") || "");
        router.push(buildUrl({ search, page: "1" }));
    }

    async function handleConcluir(id: string) {
        setFeedback(null);
        const result = await concluirPrazo(id);
        if (!result.success) {
            setFeedback({ variant: "error", title: "Conclusao de prazo", message: getActionErrorMessage((result as { error?: unknown }).error, "Erro ao concluir prazo.") });
            return;
        }
        setFeedback({ variant: "success", title: "Conclusao de prazo", message: "Prazo marcado como concluido." });
        router.refresh();
    }

    async function handleDelete() {
        if (!deletingId) return;
        setFeedback(null);
        const result = await deletePrazo(deletingId);
        if (!result.success) {
            setFeedback({ variant: "error", title: "Exclusao de prazo", message: getActionErrorMessage((result as { error?: unknown }).error, "Erro ao excluir prazo.") });
            return;
        }
        setDeletingId(null);
        setFeedback({ variant: "success", title: "Exclusao de prazo", message: "Prazo excluido com sucesso." });
        router.refresh();
    }

    async function handleReprocessarIa(id: string) {
        setFeedback(null);
        const result = await reprocessarPrazoIa(id);
        if (!result.success) {
            setFeedback({ variant: "error", title: "Reprocessamento via IA", message: result.error || "Erro ao reprocessar prazo via IA." });
            return;
        }
        setFeedback({ variant: "success", title: "Reprocessamento via IA", message: "Prazo reprocessado com sucesso pela IA." });
        router.refresh();
    }

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setCreateError(null);
        const form = new FormData(e.currentTarget);
        const result = await createPrazo({
            processoId: String(form.get("processoId") || ""),
            advogadoId: String(form.get("advogadoId") || ""),
            descricao: String(form.get("descricao") || ""),
            dataFatal: String(form.get("dataFatal") || ""),
            dataCortesia: String(form.get("dataCortesia") || ""),
            tipoContagem: String(form.get("tipoContagem") || "DIAS_UTEIS") as "DIAS_UTEIS" | "DIAS_CORRIDOS",
            fatal: String(form.get("fatal")) === "true",
            observacoes: String(form.get("observacoes") || ""),
        });
        if (!result.success) {
            setCreateError(getActionErrorMessage((result as { error?: unknown }).error, "Erro ao criar prazo."));
            return;
        }
        setShowCreate(false);
        setFeedback({ variant: "success", title: "Cadastro de prazo", message: "Prazo criado com sucesso." });
        router.refresh();
    }

    async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!editingPrazo) return;
        setEditError(null);
        const form = new FormData(e.currentTarget);
        const result = await updatePrazo({
            id: editingPrazo.id,
            processoId: String(form.get("processoId") || ""),
            advogadoId: String(form.get("advogadoId") || ""),
            descricao: String(form.get("descricao") || ""),
            dataFatal: String(form.get("dataFatal") || ""),
            dataCortesia: String(form.get("dataCortesia") || ""),
            tipoContagem: String(form.get("tipoContagem") || "DIAS_UTEIS") as "DIAS_UTEIS" | "DIAS_CORRIDOS",
            fatal: String(form.get("fatal")) === "true",
            observacoes: String(form.get("observacoes") || ""),
        });
        if (!result.success) {
            setEditError(getActionErrorMessage((result as { error?: unknown }).error, "Erro ao atualizar prazo."));
            return;
        }
        setEditingPrazo(null);
        setFeedback({ variant: "success", title: "Edicao de prazo", message: "Prazo atualizado com sucesso." });
        router.refresh();
    }

    async function handleGerarDePublicacoes() {
        setFeedback(null);
        setGeneratingAi(true);
        const result = await gerarPrazosPublicacoesIA({
            limite: 300,
            incluirSemProcessoVinculado: true,
            criarProcessoSemVinculo: false,
            somentePendentes: true,
        });
        setGeneratingAi(false);
        if (!result.success) {
            setFeedback({ variant: "error", title: "Geracao automatica", message: typeof result.error === "string" ? result.error : "Erro ao gerar prazos das publicacoes." });
            return;
        }
        const payload = result as { avaliadas?: number; criadas?: number; jaExistentes?: number; semProcesso?: number };
        setFeedback({
            variant: "success",
            title: "Geracao automatica",
            message: `${payload.criadas || 0} prazos criados de ${payload.avaliadas || 0} publicacoes avaliadas. ${payload.jaExistentes || 0} ja existiam e ${payload.semProcesso || 0} ficaram sem processo.`,
        });
        router.refresh();
    }

    const activeFilters = [
        searchParams.status && `Status: ${searchParams.status}`,
        searchParams.origem && `Origem: ${searchParams.origem === "MANUAL" ? "Manual" : "IA"}`,
        searchParams.advogadoId && "Responsavel filtrado",
    ].filter(Boolean);

    const createValues: {
        processoId: string;
        advogadoId: string;
        descricao: string;
        dataFatal: string;
        dataCortesia: string;
        tipoContagem: "DIAS_UTEIS" | "DIAS_CORRIDOS";
        fatal: boolean;
        observacoes: string;
    } = {
        processoId: "",
        advogadoId: "",
        descricao: "",
        dataFatal: "",
        dataCortesia: "",
        tipoContagem: "DIAS_UTEIS" as const,
        fatal: true,
        observacoes: "",
    };

    const editValues: {
        processoId: string;
        advogadoId: string;
        descricao: string;
        dataFatal: string;
        dataCortesia: string;
        tipoContagem: "DIAS_UTEIS" | "DIAS_CORRIDOS";
        fatal: boolean;
        observacoes: string;
    } | null = editingPrazo
        ? {
              processoId: editingPrazo.processo.id,
              advogadoId: advogados.find((item) => item.user.name === editingPrazo.advogado.user.name)?.id || "",
              descricao: editingPrazo.descricao,
              dataFatal: toDateInputValue(editingPrazo.dataFatal),
              dataCortesia: toDateInputValue(editingPrazo.dataCortesia),
              tipoContagem: editingPrazo.tipoContagem === "DIAS_CORRIDOS" ? "DIAS_CORRIDOS" : "DIAS_UTEIS",
              fatal: editingPrazo.fatal,
              observacoes: editingPrazo.observacoes || "",
          }
        : null;

    return (
        <>
            <UrgencyBar prazos={prazos} />

            <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 xl:flex-1">
                    <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 rounded-xl border border-border bg-bg-tertiary/70 px-3 py-2 sm:flex-1 xl:max-w-sm">
                        <Search size={15} className="shrink-0 text-text-muted" />
                        <input name="search" type="text" defaultValue={searchParams.search || ""} placeholder="Buscar prazo, processo ou cliente" className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none" />
                    </form>
                    <button
                        onClick={() => setShowFilters((current) => !current)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${showFilters || activeFilters.length > 0 ? "border-accent/30 bg-accent/10 text-accent" : "border-border bg-bg-tertiary text-text-muted hover:text-text-primary"}`}
                    >
                        <Filter size={13} />
                        Filtros
                        {activeFilters.length > 0 ? <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">{activeFilters.length}</span> : null}
                    </button>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button size="sm" className="w-full sm:w-auto" onClick={() => { setCreateError(null); setShowCreate(true); }}>
                        <Plus size={15} /> Novo prazo
                    </Button>
                    <Button size="sm" className="w-full sm:w-auto" variant="secondary" onClick={handleGerarDePublicacoes} disabled={generatingAi}>
                        <Bot size={13} /> {generatingAi ? "Gerando..." : "Gerar via IA"}
                    </Button>
                </div>
            </div>

            {showFilters ? (
                <div className="glass-card mb-4 grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Status</label>
                        <select defaultValue={searchParams.status || ""} onChange={(e) => router.push(buildUrl({ status: e.target.value, page: "1" }))} className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-primary outline-none">
                            <option value="">Todos</option>
                            <option value="PENDENTE">Pendente</option>
                            <option value="CONCLUIDO">Concluido</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Origem</label>
                        <select defaultValue={searchParams.origem || ""} onChange={(e) => router.push(buildUrl({ origem: e.target.value, page: "1" }))} className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-primary outline-none">
                            <option value="">Todas</option>
                            <option value="MANUAL">Manual</option>
                            <option value="PUBLICACAO_IA">Publicacao IA</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Responsavel</label>
                        <select defaultValue={searchParams.advogadoId || ""} onChange={(e) => router.push(buildUrl({ advogadoId: e.target.value, page: "1" }))} className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-primary outline-none">
                            <option value="">Todos</option>
                            {advogados.map((advogado) => (
                                <option key={advogado.id} value={advogado.id}>{advogado.user.name || "Sem responsavel"}</option>
                            ))}
                        </select>
                    </div>
                    {activeFilters.length > 0 ? (
                        <button onClick={() => router.push(buildUrl({ status: "", origem: "", advogadoId: "", page: "1" }))} className="flex min-h-11 items-center gap-1 text-xs text-danger hover:underline">
                            <X size={12} /> Limpar filtros
                        </button>
                    ) : null}
                </div>
            ) : null}

            {feedback ? <ActionFeedback variant={feedback.variant} title={feedback.title} message={feedback.message} className="mb-4" onDismiss={() => setFeedback(null)} /> : null}

            {activeFilters.length > 0 && !showFilters ? (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    {activeFilters.map((filterLabel) => (
                        <span key={filterLabel} className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-0.5 text-[11px] text-accent">
                            {filterLabel}
                        </span>
                    ))}
                </div>
            ) : null}

            <div className="space-y-3 md:hidden">
                {prazos.length === 0 ? (
                    <div className="glass-card overflow-hidden">
                        <EmptyState icon={CalendarDays} title="Nenhum prazo encontrado" description="Ajuste os filtros ou cadastre um novo prazo manualmente." action={<Button size="sm" onClick={() => { setCreateError(null); setShowCreate(true); }}><Plus size={14} /> Criar primeiro prazo</Button>} />
                    </div>
                ) : (
                    prazos.map((prazo) => (
                        <div key={prazo.id} className={`glass-card rounded-[22px] border-l-4 p-4 ${getPrazoTone(prazo)}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-text-primary">{prazo.descricao}</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                        {prazo.fatal ? <Badge variant="danger">Fatal</Badge> : null}
                                        {prazo.origem === "PUBLICACAO_IA" ? <Badge variant="info"><Bot size={9} /> IA</Badge> : <Badge variant="success">Manual</Badge>}
                                    </div>
                                </div>
                                <StatusBadge prazo={prazo} />
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <p className="uppercase tracking-wider text-text-muted">Processo</p>
                                    <Link href={`/processos/${prazo.processo.id}`} className="mt-1 block font-mono text-accent hover:underline">{prazo.processo.numeroCnj || "Sem numero"}</Link>
                                </div>
                                <div>
                                    <p className="uppercase tracking-wider text-text-muted">Cliente</p>
                                    <p className="mt-1 text-text-secondary">{getClienteNome(prazo)}</p>
                                </div>
                                <div>
                                    <p className="uppercase tracking-wider text-text-muted">Responsavel</p>
                                    <p className="mt-1 text-text-secondary">{getResponsavelNome(prazo)}</p>
                                </div>
                                <div>
                                    <p className="uppercase tracking-wider text-text-muted">Data fatal</p>
                                    <p className="mt-1 font-mono text-text-primary">{formatDate(prazo.dataFatal)}</p>
                                    <CountdownBadge prazo={prazo} />
                                </div>
                            </div>
                            {prazo.origem === "PUBLICACAO_IA" && prazo.publicacaoOrigem ? <Link href="/publicacoes" className="mt-3 inline-flex items-center gap-1 text-[11px] text-accent hover:underline"><LinkIcon size={10} /> Publicacao vinculada</Link> : null}
                            <div className="mt-4 flex items-center justify-end gap-1">
                                <button title="Editar prazo" aria-label="Editar prazo" onClick={() => { setEditError(null); setEditingPrazo(prazo); }} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted transition-colors hover:bg-accent/10 hover:text-accent"><Pencil size={15} /></button>
                                {prazo.status === "PENDENTE" ? <button title="Marcar concluido" aria-label="Marcar concluido" onClick={() => handleConcluir(prazo.id)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted transition-colors hover:bg-success/10 hover:text-success"><Check size={15} /></button> : null}
                                {prazo.origem === "PUBLICACAO_IA" && prazo.publicacaoOrigem ? <button title="Reprocessar com IA" aria-label="Reprocessar com IA" onClick={() => handleReprocessarIa(prazo.id)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted transition-colors hover:bg-info/10 hover:text-info"><RotateCcw size={15} /></button> : null}
                                <button title="Excluir prazo" aria-label="Excluir prazo" onClick={() => setDeletingId(prazo.id)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"><Trash2 size={15} /></button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="glass-card hidden overflow-hidden md:block">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px]">
                        <thead>
                            <tr className="border-b border-border bg-bg-tertiary/40">
                                <th className="w-0 px-0 py-3" />
                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Prazo</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Processo e cliente</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Datas</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Responsavel</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Situacao</th>
                                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-text-muted">Acoes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prazos.length === 0 ? (
                                <tr>
                                    <td colSpan={7}>
                                        <EmptyState icon={CalendarDays} title="Nenhum prazo encontrado" description="Ajuste os filtros ou cadastre um novo prazo manualmente." action={<Button size="sm" onClick={() => { setCreateError(null); setShowCreate(true); }}><Plus size={14} /> Criar primeiro prazo</Button>} />
                                    </td>
                                </tr>
                            ) : (
                                prazos.map((prazo) => (
                                    <tr key={prazo.id} className="group border-b border-border last:border-0 transition-colors hover:bg-bg-tertiary/35">
                                        <td className={`border-l-[3px] py-0 ${getPrazoTone(prazo)}`} />
                                        <td className="px-4 py-4 align-top">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-medium text-text-primary">{prazo.descricao}</span>
                                                {prazo.fatal ? <Badge variant="danger">Fatal</Badge> : null}
                                                {prazo.origem === "PUBLICACAO_IA" ? <Badge variant="info"><Bot size={9} /> IA</Badge> : <Badge variant="success">Manual</Badge>}
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
                                                <span>{prazo.tipoContagem === "DIAS_CORRIDOS" ? "Dias corridos" : "Dias uteis"}</span>
                                                {typeof prazo.origemConfianca === "number" ? <span>Confianca {Math.round(prazo.origemConfianca * 100)}%</span> : null}
                                                {prazo.origem === "PUBLICACAO_IA" && prazo.publicacaoOrigem ? <Link href="/publicacoes" className="inline-flex items-center gap-1 text-accent hover:underline"><LinkIcon size={10} /> Publicacao</Link> : null}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            <Link href={`/processos/${prazo.processo.id}`} className="block font-mono text-sm text-accent hover:underline">{prazo.processo.numeroCnj || "Sem numero"}</Link>
                                            <p className="mt-1 text-xs text-text-secondary">{getClienteNome(prazo)}</p>
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            <p className="text-sm font-mono text-text-primary">{formatDate(prazo.dataFatal)}</p>
                                            {prazo.dataCortesia ? <p className="mt-0.5 text-[11px] text-text-muted">Cortesia: {formatDate(prazo.dataCortesia)}</p> : null}
                                            <div className="mt-1"><CountdownBadge prazo={prazo} /></div>
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            <p className="text-sm text-text-primary">{getResponsavelNome(prazo)}</p>
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            <StatusBadge prazo={prazo} />
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            <div className="flex items-center justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                                                <button title="Editar prazo" aria-label="Editar prazo" onClick={() => { setEditError(null); setEditingPrazo(prazo); }} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted transition-colors hover:bg-accent/10 hover:text-accent"><Pencil size={15} /></button>
                                                {prazo.status === "PENDENTE" ? <button title="Marcar concluido" aria-label="Marcar concluido" onClick={() => handleConcluir(prazo.id)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted transition-colors hover:bg-success/10 hover:text-success"><Check size={15} /></button> : null}
                                                {prazo.origem === "PUBLICACAO_IA" && prazo.publicacaoOrigem ? <button title="Reprocessar com IA" aria-label="Reprocessar com IA" onClick={() => handleReprocessarIa(prazo.id)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted transition-colors hover:bg-info/10 hover:text-info"><RotateCcw size={15} /></button> : null}
                                                <button title="Excluir prazo" aria-label="Excluir prazo" onClick={() => setDeletingId(prazo.id)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"><Trash2 size={15} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 ? (
                    <div className="flex items-center justify-between border-t border-border bg-bg-tertiary/30 px-4 py-3">
                        <span className="text-xs text-text-muted">{total} resultados · Pagina {page} de {totalPages}</span>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => router.push(buildUrl({ page: String(page - 1) }))}><ChevronLeft size={16} /></Button>
                            <span className="px-2 text-xs text-text-muted">{page} / {totalPages}</span>
                            <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => router.push(buildUrl({ page: String(page + 1) }))}><ChevronRight size={16} /></Button>
                        </div>
                    </div>
                ) : null}
            </div>

            <PrazoFormModal isOpen={showCreate} title="Adicionar prazo" submitLabel="Salvar prazo" error={createError} processos={processos} advogados={advogados} values={createValues} onClose={() => { setCreateError(null); setShowCreate(false); }} onSubmit={handleCreate} />

            {editingPrazo && editValues ? (
                <PrazoFormModal
                    isOpen={Boolean(editingPrazo)}
                    title="Editar prazo"
                    submitLabel="Salvar alteracoes"
                    error={editError}
                    hint={editingPrazo.origem === "PUBLICACAO_IA" ? "Este prazo foi gerado automaticamente. Os ajustes manuais passam a valer imediatamente." : null}
                    processos={processos}
                    advogados={advogados}
                    values={editValues}
                    onClose={() => { setEditError(null); setEditingPrazo(null); }}
                    onSubmit={handleUpdate}
                />
            ) : null}

            <Modal isOpen={Boolean(deletingId)} onClose={() => setDeletingId(null)} title="Excluir prazo" size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-text-secondary">Tem certeza de que deseja excluir este prazo? Essa acao nao pode ser desfeita.</p>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setDeletingId(null)}>Cancelar</Button>
                        <Button variant="destructive" className="w-full sm:w-auto" onClick={handleDelete}>Excluir</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
