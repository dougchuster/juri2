"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Search, Plus, Eye, Pencil, Trash2, Loader2,
    Scale, Clock, FileText, LayoutGrid, List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { ConfirmActionModal } from "@/components/ui/confirm-action-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportButton } from "@/components/ui/export-button";
import { TablePagination } from "@/components/ui/table-pagination";
import { ProcessoForm } from "@/components/processos/processo-form";
import { ProcessosKanbanBoard } from "@/components/processos/processos-kanban-board";
import {
    deleteProcesso,
    getProcessoEditData,
    listarIdsProcessosFiltrados,
    excluirProcessosEmLote,
    atualizarStatusProcessosEmLote,
    atribuirClienteProcessosEmLote,
    atribuirAdvogadoProcessosEmLote,
} from "@/actions/processos";
import { getActionErrorMessage } from "@/lib/action-errors";

const STATUS_COLORS: Record<string, string> = {
    PROSPECCAO: "info", CONSULTORIA: "info", AJUIZADO: "default",
    EM_ANDAMENTO: "success", AUDIENCIA_MARCADA: "warning", SENTENCA: "warning",
    RECURSO: "danger", TRANSITO_JULGADO: "success", EXECUCAO: "default",
    ENCERRADO: "muted", ARQUIVADO: "muted",
};

const STATUS_LABELS: Record<string, string> = {
    PROSPECCAO: "Prospecao", CONSULTORIA: "Consultoria", AJUIZADO: "Ajuizado",
    EM_ANDAMENTO: "Em Andamento", AUDIENCIA_MARCADA: "Audiencia", SENTENCA: "Sentenca",
    RECURSO: "Recurso", TRANSITO_JULGADO: "Transito", EXECUCAO: "Execucao",
    ENCERRADO: "Encerrado", ARQUIVADO: "Arquivado",
};

interface ProcessoListItem {
    id: string;
    numeroCnj: string | null;
    tipo: string;
    status: string;
    objeto: string | null;
    valorCausa: unknown;
    cliente: { id: string; nome: string } | null;
    advogado: { id: string; user: { name: string | null } };
    faseProcessual: { id: string; nome: string; cor: string | null } | null;
    tipoAcao: { id: string; nome: string } | null;
    _count: { prazos: number; tarefas: number; movimentacoes: number };
    updatedAt: string;
}

interface RefOption { id: string; nome: string }
interface AdvOption { id: string; user: { name: string | null } }
interface ClienteOption { id: string; nome: string; cpf: string | null; cnpj: string | null }
interface FaseOption { id: string; nome: string; cor: string | null }

interface ProcessoTableProps {
    processos: ProcessoListItem[];
    tiposAcao: RefOption[];
    fases: FaseOption[];
    advogados: AdvOption[];
    clientes: ClienteOption[];
    total: number;
    page: number;
    totalPages: number;
    searchParams: Record<string, string>;
    view?: "list" | "kanban";
}

export function ProcessoTable({
    processos,
    tiposAcao,
    fases,
    advogados,
    clientes,
    total,
    page,
    totalPages,
    searchParams,
    view = "list",
}: ProcessoTableProps) {
    const router = useRouter();
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editLoadingId, setEditLoadingId] = useState<string | null>(null);
    const [editInitialData, setEditInitialData] = useState<Record<string, unknown> | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectionLoading, setSelectionLoading] = useState(false);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
    const [bulkStatus, setBulkStatus] = useState<string>("EM_ANDAMENTO");
    const [bulkClienteId, setBulkClienteId] = useState<string>("");
    const [bulkAdvogadoId, setBulkAdvogadoId] = useState<string>("");
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    function buildUrl(params: Record<string, string>) {
        const merged = { ...searchParams, ...params };
        const qs = new URLSearchParams(Object.entries(merged).filter(([, v]) => v !== "")).toString();
        return `/processos${qs ? `?${qs}` : ""}`;
    }

    async function handleDelete() {
        if (!deletingId) return;
        setDeleteError(null);
        const res = await deleteProcesso(deletingId);
        if (!res.success) {
            setDeleteError(getActionErrorMessage((res as { error?: unknown }).error, "Erro ao excluir processo."));
            return;
        }
        setDeletingId(null);
        router.refresh();
    }

    function toggleSelectOne(id: string) {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }

    function toggleSelectAllCurrentPage() {
        const pageIds = processos.map((p) => p.id);
        const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
        } else {
            setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
        }
    }

    async function handleSelectAllFiltered() {
        setSelectionLoading(true);
        setBulkFeedback(null);
        const res = await listarIdsProcessosFiltrados(searchParams);
        setSelectionLoading(false);
        if (!res.success) {
            setBulkFeedback(getActionErrorMessage((res as { error?: unknown }).error, "Erro ao selecionar processos."));
            return;
        }
        setSelectedIds((res as { ids: string[] }).ids || []);
    }

    async function handleBulkDelete() {
        if (selectedIds.length === 0) return;
        setBulkDeleteLoading(true);
        setBulkFeedback(null);
        const res = await excluirProcessosEmLote({ ids: selectedIds });
        setBulkDeleteLoading(false);
        if (!res.success) {
            setBulkFeedback(getActionErrorMessage((res as { error?: unknown }).error, "Erro ao excluir em lote."));
            return;
        }
        setSelectedIds([]);
        setBulkDeleteOpen(false);
        router.refresh();
    }

    async function handleBulkStatus() {
        if (selectedIds.length === 0 || !bulkStatus) return;
        setBulkLoading(true);
        setBulkFeedback(null);
        const res = await atualizarStatusProcessosEmLote({ ids: selectedIds, status: bulkStatus });
        setBulkLoading(false);
        if (!res.success) {
            setBulkFeedback(getActionErrorMessage((res as { error?: unknown }).error, "Erro ao atualizar status em lote."));
            return;
        }
        router.refresh();
    }

    async function handleBulkCliente() {
        if (selectedIds.length === 0) return;
        setBulkLoading(true);
        setBulkFeedback(null);
        const res = await atribuirClienteProcessosEmLote({ ids: selectedIds, clienteId: bulkClienteId });
        setBulkLoading(false);
        if (!res.success) {
            setBulkFeedback(getActionErrorMessage((res as { error?: unknown }).error, "Erro ao atribuir cliente em lote."));
            return;
        }
        router.refresh();
    }

    async function handleBulkAdvogado() {
        if (selectedIds.length === 0 || !bulkAdvogadoId) return;
        setBulkLoading(true);
        setBulkFeedback(null);
        const res = await atribuirAdvogadoProcessosEmLote({ ids: selectedIds, advogadoId: bulkAdvogadoId });
        setBulkLoading(false);
        if (!res.success) {
            setBulkFeedback(getActionErrorMessage((res as { error?: unknown }).error, "Erro ao atribuir advogado em lote."));
            return;
        }
        router.refresh();
    }

    async function openEdit(id: string) {
        setEditLoadingId(id);
        const res = await getProcessoEditData(id);
        setEditLoadingId(null);
        if (!res.success) return;
        setEditInitialData(res.data as unknown as Record<string, unknown>);
        setShowEdit(true);
    }

    return (
        <>
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <form className="flex w-full items-center gap-3 rounded-lg bg-bg-tertiary px-3 py-2 xl:max-w-sm">
                    <Search size={16} className="text-text-muted" />
                    <input
                        name="search"
                        type="text"
                        defaultValue={searchParams.search || ""}
                        placeholder="Buscar por numero, objeto, cliente..."
                        className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                    />
                </form>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <select
                        defaultValue={searchParams.status || ""}
                        onChange={(e) => router.push(buildUrl({ status: e.target.value, page: "1" }))}
                        className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-primary outline-none"
                    >
                        <option value="">Todos status</option>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                        ))}
                    </select>
                    <select
                        defaultValue={searchParams.tipo || ""}
                        onChange={(e) => router.push(buildUrl({ tipo: e.target.value, page: "1" }))}
                        className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-primary outline-none"
                    >
                        <option value="">Tipo</option>
                        <option value="JUDICIAL">Judicial</option>
                        <option value="ADMINISTRATIVO">Administrativo</option>
                        <option value="CONSULTIVO">Consultivo</option>
                    </select>
                    <select
                        defaultValue={searchParams.triagem || ""}
                        onChange={(e) => router.push(buildUrl({ triagem: e.target.value, page: "1" }))}
                        className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-primary outline-none"
                        title="Filtro rapido para processos sem cliente (triagem)"
                    >
                        <option value="">Cliente</option>
                        <option value="com_cliente">Com cliente</option>
                        <option value="sem_cliente">Sem cliente (triagem)</option>
                    </select>
                    <div className="flex items-center rounded-lg border border-border bg-bg-tertiary p-1">
                        <Button
                            size="sm"
                            variant={view === "list" ? "secondary" : "ghost"}
                            onClick={() => router.push(buildUrl({ view: "list", page: "1" }))}
                        >
                            <List size={14} />
                            Lista
                        </Button>
                        <Button
                            size="sm"
                            variant={view === "kanban" ? "secondary" : "ghost"}
                            onClick={() => router.push(buildUrl({ view: "kanban", page: "1" }))}
                        >
                            <LayoutGrid size={14} />
                            Kanban
                        </Button>
                    </div>
                    <ExportButton basePath="/api/processos/export" query={searchParams} />
                    <Button size="sm" className="w-full sm:w-auto" onClick={() => setShowCreate(true)}>
                        <Plus size={16} /> Novo Processo
                    </Button>
                </div>
            </div>

            {view === "list" ? (
            <div className="mb-4 rounded-lg border border-border bg-bg-tertiary/30 p-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
                    <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                        <input
                            type="checkbox"
                            checked={processos.length > 0 && processos.every((p) => selectedIds.includes(p.id))}
                            onChange={toggleSelectAllCurrentPage}
                        />
                        Selecionar pagina
                    </label>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleSelectAllFiltered}
                        disabled={selectionLoading || total === 0}
                    >
                        {selectionLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                        Selecionar todas filtradas ({total})
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setSelectedIds([]); setBulkFeedback(null); }}
                        disabled={selectedIds.length === 0}
                    >
                        Limpar selecao
                    </Button>
                    <span className="ml-1 text-xs text-text-muted">
                        Selecionados: <span className="font-mono text-text-primary">{selectedIds.length}</span>
                    </span>
                    <div className="hidden flex-1 lg:block" />
                    <Button
                        size="sm"
                        variant="destructive"
                        className="w-full lg:w-auto"
                        onClick={() => setBulkDeleteOpen(true)}
                        disabled={selectedIds.length === 0}
                    >
                        <Trash2 size={14} /> Excluir selecionados
                    </Button>
                </div>

                {bulkFeedback ? (
                    <ActionFeedback
                        variant="error"
                        title="Operacao em lote interrompida"
                        message={bulkFeedback}
                        className="mt-3"
                        onDismiss={() => setBulkFeedback(null)}
                    />
                ) : null}

                {selectedIds.length > 0 && (
                    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(0,180px)_auto_minmax(0,220px)_auto_minmax(0,220px)_auto]">
                        <select
                            value={bulkStatus}
                            onChange={(e) => setBulkStatus(e.target.value)}
                            className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-primary outline-none"
                            title="Status em lote"
                        >
                            {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                        <Button size="sm" variant="secondary" className="w-full md:w-auto" onClick={handleBulkStatus} disabled={bulkLoading}>
                            {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                            Atualizar status
                        </Button>

                        <select
                            value={bulkClienteId}
                            onChange={(e) => setBulkClienteId(e.target.value)}
                            className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-primary outline-none"
                            title="Cliente em lote"
                        >
                            <option value="">Sem cliente (triagem)</option>
                            {clientes.map((c) => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                            ))}
                        </select>
                        <Button size="sm" variant="secondary" className="w-full md:w-auto" onClick={handleBulkCliente} disabled={bulkLoading}>
                            {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                            Atribuir cliente
                        </Button>

                        <select
                            value={bulkAdvogadoId}
                            onChange={(e) => setBulkAdvogadoId(e.target.value)}
                            className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-primary outline-none"
                            title="Advogado em lote"
                        >
                            <option value="">Selecionar advogado</option>
                            {advogados.map((a) => (
                                <option key={a.id} value={a.id}>{a.user.name || "-"}</option>
                            ))}
                        </select>
                        <Button size="sm" variant="secondary" className="w-full md:w-auto" onClick={handleBulkAdvogado} disabled={bulkLoading || !bulkAdvogadoId}>
                            {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                            Atribuir advogado
                        </Button>
                    </div>
                )}
            </div>
            ) : null}

            {view === "kanban" ? <ProcessosKanbanBoard processos={processos} /> : null}

            {view === "list" ? <div className="space-y-3 md:hidden">
                {processos.length === 0 ? (
                    <div className="glass-card overflow-hidden">
                        <EmptyState
                            icon={FileText}
                            title="Nenhum processo encontrado"
                            description="Ajuste os filtros ou cadastre um novo processo para iniciar o acompanhamento juridico."
                            action={<Button size="sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Novo Processo</Button>}
                        />
                    </div>
                ) : processos.map((proc) => (
                    <div key={proc.id} className="glass-card rounded-[22px] p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <Link href={`/processos/${proc.id}`} className="text-sm font-mono text-accent hover:underline">
                                    {proc.numeroCnj || "Sem numero"}
                                </Link>
                                <p className="mt-1 line-clamp-2 text-xs text-text-muted">
                                    {proc.objeto || proc.tipoAcao?.nome || "-"}
                                </p>
                            </div>
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(proc.id)}
                                onChange={() => toggleSelectOne(proc.id)}
                                className="mt-1 h-4 w-4"
                            />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <p className="uppercase tracking-wider text-text-muted">Cliente</p>
                                <p className="mt-1 text-text-secondary">{proc.cliente?.nome || "Sem cliente"}</p>
                            </div>
                            <div>
                                <p className="uppercase tracking-wider text-text-muted">Advogado</p>
                                <p className="mt-1 text-text-secondary">{proc.advogado.user.name || "-"}</p>
                            </div>
                            <div>
                                <p className="uppercase tracking-wider text-text-muted">Fase</p>
                                <p className="mt-1 text-text-secondary">{proc.faseProcessual?.nome || "-"}</p>
                            </div>
                            <div>
                                <p className="uppercase tracking-wider text-text-muted">Status</p>
                                <div className="mt-1">
                                    <Badge variant={(STATUS_COLORS[proc.status] || "muted") as "success" | "warning" | "danger" | "info" | "default" | "muted"}>
                                        {STATUS_LABELS[proc.status] || proc.status}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-3 text-xs text-text-muted">
                            <span className="flex items-center gap-1" title="Prazos"><Clock size={12} />{proc._count.prazos}</span>
                            <span className="flex items-center gap-1" title="Tarefas"><Scale size={12} />{proc._count.tarefas}</span>
                            <span className="flex items-center gap-1" title="Movimentacoes"><FileText size={12} />{proc._count.movimentacoes}</span>
                        </div>
                        <div className="mt-4 flex items-center justify-end gap-1">
                            <Link href={`/processos/${proc.id}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-accent transition-colors" title="Abrir">
                                <Eye size={16} />
                            </Link>
                            <button
                                onClick={() => openEdit(proc.id)}
                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-accent transition-colors disabled:opacity-50"
                                disabled={editLoadingId === proc.id}
                                title="Editar"
                            >
                                {editLoadingId === proc.id ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
                            </button>
                            <button
                                onClick={() => setDeletingId(proc.id)}
                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-danger transition-colors"
                                title="Excluir"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div> : null}

            {view === "list" ? <div className="glass-card hidden overflow-hidden md:block">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[920px]">
                    <thead>
                        <tr className="border-b border-border bg-bg-tertiary/50">
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                                <input
                                    type="checkbox"
                                    checked={processos.length > 0 && processos.every((p) => selectedIds.includes(p.id))}
                                    onChange={toggleSelectAllCurrentPage}
                                    title="Selecionar pagina"
                                />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Processo</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Cliente</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Advogado</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Fase</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider">Info</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processos.length === 0 ? (
                            <tr>
                                <td colSpan={8}>
                                    <EmptyState
                                        icon={FileText}
                                        title="Nenhum processo encontrado"
                                        description="Ajuste os filtros ou cadastre um novo processo para iniciar o acompanhamento juridico."
                                        action={<Button size="sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Novo Processo</Button>}
                                    />
                                </td>
                            </tr>
                        ) : processos.map((proc) => (
                            <tr key={proc.id} className="border-b border-border last:border-0 hover:bg-bg-tertiary transition-colors">
                                <td className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(proc.id)}
                                        onChange={() => toggleSelectOne(proc.id)}
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <Link href={`/processos/${proc.id}`} className="text-sm font-mono text-accent hover:underline">
                                        {proc.numeroCnj || "Sem número"}
                                    </Link>
                                    <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                                        {proc.objeto || proc.tipoAcao?.nome || "-"}
                                    </p>
                                </td>
                                <td className="px-4 py-3 text-sm text-text-secondary">
                                    {proc.cliente?.nome || <span className="text-text-muted">Sem cliente</span>}
                                </td>
                                <td className="px-4 py-3 text-sm text-text-secondary">{proc.advogado.user.name || "-"}</td>
                                <td className="px-4 py-3">
                                    {proc.faseProcessual ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: proc.faseProcessual.cor || "#6B7280" }} />
                                            {proc.faseProcessual.nome}
                                        </span>
                                    ) : <span className="text-xs text-text-muted">-</span>}
                                </td>
                                <td className="px-4 py-3">
                                    <Badge variant={(STATUS_COLORS[proc.status] || "muted") as "success" | "warning" | "danger" | "info" | "default" | "muted"}>
                                        {STATUS_LABELS[proc.status] || proc.status}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-3 text-xs text-text-muted">
                                        <span className="flex items-center gap-1" title="Prazos"><Clock size={12} />{proc._count.prazos}</span>
                                        <span className="flex items-center gap-1" title="Tarefas"><Scale size={12} />{proc._count.tarefas}</span>
                                        <span className="flex items-center gap-1" title="Movimentacoes"><FileText size={12} />{proc._count.movimentacoes}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-1">
                                        <Link href={`/processos/${proc.id}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-accent transition-colors" title="Abrir">
                                            <Eye size={16} />
                                        </Link>
                                        <button
                                            onClick={() => openEdit(proc.id)}
                                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-accent transition-colors disabled:opacity-50"
                                            disabled={editLoadingId === proc.id}
                                            title="Editar"
                                        >
                                            {editLoadingId === proc.id ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
                                        </button>
                                        <button
                                            onClick={() => setDeletingId(proc.id)}
                                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-danger transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>

                {totalPages > 1 && (
                    <TablePagination
                        total={total}
                        page={page}
                        totalPages={totalPages}
                        onPrev={() => router.push(buildUrl({ page: String(page - 1) }))}
                        onNext={() => router.push(buildUrl({ page: String(page + 1) }))}
                    />
                )}
            </div> : null}

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Novo processo" size="xl">
                <ProcessoForm
                    tiposAcao={tiposAcao}
                    fases={fases}
                    advogados={advogados}
                    clientes={clientes}
                    onSuccess={() => { setShowCreate(false); router.refresh(); }}
                    onCancel={() => setShowCreate(false)}
                />
            </Modal>

            <Modal isOpen={showEdit} onClose={() => { setShowEdit(false); setEditInitialData(null); }} title="Editar processo" size="xl">
                <ProcessoForm
                    tiposAcao={tiposAcao}
                    fases={fases}
                    advogados={advogados}
                    clientes={clientes}
                    initialData={editInitialData as never}
                    onSuccess={() => { setShowEdit(false); setEditInitialData(null); router.refresh(); }}
                    onCancel={() => { setShowEdit(false); setEditInitialData(null); }}
                />
            </Modal>

            <ConfirmActionModal
                isOpen={!!deletingId}
                onClose={() => { setDeletingId(null); setDeleteError(null); }}
                onConfirm={handleDelete}
                title="Excluir processo"
                description="Tem certeza? Movimentacoes, prazos e tarefas vinculadas tambem serao excluidos."
                confirmLabel="Excluir processo"
                error={deleteError}
            />

            <ConfirmActionModal
                isOpen={bulkDeleteOpen}
                onClose={() => setBulkDeleteOpen(false)}
                onConfirm={handleBulkDelete}
                title="Excluir processos selecionados"
                description={`Tem certeza? Isso vai excluir ${selectedIds.length} processo(s) e todos os itens vinculados, como prazos, tarefas e movimentacoes.`}
                confirmLabel="Excluir selecionados"
                loading={bulkDeleteLoading}
                error={bulkFeedback}
            />
        </>
    );
}
