"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Search,
    Plus,
    Eye,
    Pencil,
    Trash2,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Phone,
    Mail,
    MessageCircle,
    Flame,
    Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, STATUS_CLIENTE_BADGE } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { deleteCliente } from "@/actions/clientes";
import { getInitials } from "@/lib/utils";
import { useMessageStore } from "@/store/use-message-store";
import { getActionErrorMessage } from "@/lib/action-errors";

interface ClienteListItem {
    id: string;
    nome: string;
    tipoPessoa: string;
    status: string;
    cpf: string | null;
    cnpj: string | null;
    email: string | null;
    celular: string | null;
    inadimplente: boolean;
    temperatura?: string | null;
    createdAt: Date;
    origem: { id: string; nome: string } | null;
}

interface Origem {
    id: string;
    nome: string;
}

interface ClienteTableProps {
    clientes: ClienteListItem[];
    origens: Origem[];
    total: number;
    page: number;
    totalPages: number;
    searchParams: Record<string, string>;
}

export function ClienteTable({
    clientes,
    origens,
    total,
    page,
    totalPages,
    searchParams,
}: ClienteTableProps) {
    const router = useRouter();
    const { openMessageModal } = useMessageStore();
    const [showCreate, setShowCreate] = useState(false);
    const [editingCliente, setEditingCliente] = useState<ClienteListItem | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    function buildUrl(params: Record<string, string>) {
        const merged = { ...searchParams, ...params };
        const qs = new URLSearchParams(
            Object.entries(merged).filter(([, v]) => v !== "")
        ).toString();
        return `/clientes${qs ? `?${qs}` : ""}`;
    }

    async function handleDelete() {
        if (!deletingId) return;
        const result = await deleteCliente(deletingId);
        if (result.success) {
            setDeletingId(null);
            setDeleteError(null);
            router.refresh();
            return;
        }
        setDeleteError(getActionErrorMessage(result.error, "Nao foi possivel excluir o cliente."));
    }

    return (
        <>
            {/* Toolbar */}
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                {/* Search */}
                <form className="flex w-full items-center gap-3 rounded-lg bg-bg-tertiary px-3 py-2 xl:max-w-sm">
                    <Search size={16} className="text-text-muted" />
                    <input
                        name="search"
                        type="text"
                        defaultValue={searchParams.search || ""}
                        placeholder="Buscar por nome, CPF, CNPJ, email..."
                        className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                    />
                </form>

                {/* Filters */}
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <select
                        defaultValue={searchParams.status || ""}
                        onChange={(e) => router.push(buildUrl({ status: e.target.value, page: "1" }))}
                        className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-primary outline-none"
                    >
                        <option value="">Todos status</option>
                        <option value="PROSPECTO">Prospecto</option>
                        <option value="ATIVO">Ativo</option>
                        <option value="INATIVO">Inativo</option>
                        <option value="ARQUIVADO">Arquivado</option>
                    </select>

                    <select
                        defaultValue={searchParams.tipoPessoa || ""}
                        onChange={(e) => router.push(buildUrl({ tipoPessoa: e.target.value, page: "1" }))}
                        className="min-h-11 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-primary outline-none"
                    >
                        <option value="">Tipo</option>
                        <option value="FISICA">Pessoa Física</option>
                        <option value="JURIDICA">Pessoa Jurídica</option>
                    </select>

                    <Button size="sm" className="w-full sm:w-auto" onClick={() => setShowCreate(true)}>
                        <Plus size={16} />
                        Novo Cliente
                    </Button>
                </div>
            </div>

            <div className="space-y-3 md:hidden">
                {clientes.length === 0 ? (
                    <div className="glass-card overflow-hidden">
                        <EmptyState
                            icon={Users}
                            title="Nenhum cliente encontrado"
                            description="Ajuste os filtros ou cadastre um novo cliente para iniciar os atendimentos e processos vinculados."
                            action={<Button size="sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Novo Cliente</Button>}
                        />
                    </div>
                ) : (
                    clientes.map((cliente) => {
                        const statusConfig = STATUS_CLIENTE_BADGE[cliente.status];
                        return (
                            <div key={cliente.id} className="glass-card rounded-[22px] p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                                        {getInitials(cliente.nome)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <Link href={`/clientes/${cliente.id}`} className="truncate text-sm font-medium text-text-primary hover:text-accent transition-colors">
                                                {cliente.nome}
                                            </Link>
                                            {cliente.inadimplente && <AlertTriangle size={14} className="shrink-0 text-danger" />}
                                            {cliente.temperatura === "QUENTE" && <Flame size={14} className="shrink-0 text-danger" />}
                                            {cliente.temperatura === "MORNO" && <Flame size={14} className="shrink-0 text-warning" />}
                                            {cliente.temperatura === "FRIO" && <Flame size={14} className="shrink-0 text-info" />}
                                        </div>
                                        <p className="mt-1 text-xs font-mono text-text-muted">{cliente.cpf || cliente.cnpj || "-"}</p>
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <p className="uppercase tracking-wider text-text-muted">Contato</p>
                                        <div className="mt-1 space-y-1">
                                            {cliente.email && <div className="flex items-center gap-1.5 text-text-secondary"><Mail size={12} /><span className="truncate">{cliente.email}</span></div>}
                                            {cliente.celular && <div className="flex items-center gap-1.5 text-text-secondary"><Phone size={12} /><span>{cliente.celular}</span></div>}
                                            {!cliente.email && !cliente.celular && <span className="text-text-muted">-</span>}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="uppercase tracking-wider text-text-muted">Status</p>
                                        <div className="mt-1">
                                            <Badge variant={statusConfig?.variant}>
                                                {statusConfig?.label || cliente.status}
                                            </Badge>
                                        </div>
                                        <p className="mt-2 text-text-secondary">{cliente.tipoPessoa === "FISICA" ? "PF" : "PJ"}</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-xs text-text-secondary">Origem: {cliente.origem?.nome || "-"}</p>
                                <div className="mt-4 flex items-center justify-end gap-1">
                                    <button
                                        onClick={() => openMessageModal(cliente.id, "WHATSAPP")}
                                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-success hover:bg-success/10 transition-colors"
                                        title="Enviar WhatsApp"
                                    >
                                        <MessageCircle size={16} />
                                    </button>
                                    <button
                                        onClick={() => openMessageModal(cliente.id, "EMAIL")}
                                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-accent transition-colors"
                                        title="Enviar E-mail"
                                    >
                                        <Mail size={16} />
                                    </button>
                                    <Link href={`/clientes/${cliente.id}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-accent transition-colors">
                                        <Eye size={16} />
                                    </Link>
                                    <button
                                        onClick={() => setEditingCliente(cliente)}
                                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-accent transition-colors"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => setDeletingId(cliente.id)}
                                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-danger transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Table */}
            <div className="glass-card hidden overflow-hidden md:block">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[840px]">
                    <thead>
                        <tr className="border-b border-border bg-bg-tertiary/50">
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Cliente</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Contato</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Tipo</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Origem</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clientes.length === 0 ? (
                            <tr>
                                <td colSpan={6}>
                                    <EmptyState
                                        icon={Users}
                                        title="Nenhum cliente encontrado"
                                        description="Ajuste os filtros ou cadastre um novo cliente para iniciar os atendimentos e processos vinculados."
                                        action={<Button size="sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Novo Cliente</Button>}
                                    />
                                </td>
                            </tr>
                        ) : (
                            clientes.map((cliente) => {
                                const statusConfig = STATUS_CLIENTE_BADGE[cliente.status];
                                return (
                                    <tr
                                        key={cliente.id}
                                        className="border-b border-border last:border-0 hover:bg-bg-tertiary transition-colors"
                                    >
                                        {/* Nome + Avatar */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent text-sm font-bold shrink-0">
                                                    {getInitials(cliente.nome)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            href={`/clientes/${cliente.id}`}
                                                            className="text-sm font-medium text-text-primary hover:text-accent transition-colors"
                                                        >
                                                            {cliente.nome}
                                                        </Link>
                                                        {cliente.inadimplente && (
                                                            <AlertTriangle size={14} className="text-danger" />
                                                        )}
                                                        {cliente.temperatura === "QUENTE" && <span title="Lead Quente"><Flame size={14} className="text-danger" /></span>}
                                                        {cliente.temperatura === "MORNO" && <span title="Lead Morno"><Flame size={14} className="text-warning" /></span>}
                                                        {cliente.temperatura === "FRIO" && <span title="Lead Frio"><Flame size={14} className="text-info" /></span>}
                                                    </div>
                                                    <p className="text-xs font-mono text-text-muted">
                                                        {cliente.cpf || cliente.cnpj || "—"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Contato */}
                                        <td className="px-4 py-3">
                                            <div className="space-y-1">
                                                {cliente.email && (
                                                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                                                        <Mail size={12} />
                                                        <span>{cliente.email}</span>
                                                    </div>
                                                )}
                                                {cliente.celular && (
                                                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                                                        <Phone size={12} />
                                                        <span>{cliente.celular}</span>
                                                    </div>
                                                )}
                                                {!cliente.email && !cliente.celular && (
                                                    <span className="text-xs text-text-muted">—</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Tipo */}
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-text-secondary">
                                                {cliente.tipoPessoa === "FISICA" ? "PF" : "PJ"}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            <Badge variant={statusConfig?.variant}>
                                                {statusConfig?.label || cliente.status}
                                            </Badge>
                                        </td>

                                        {/* Origem */}
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-text-secondary">
                                                {cliente.origem?.nome || "—"}
                                            </span>
                                        </td>

                                        {/* Ações */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openMessageModal(cliente.id, "WHATSAPP")}
                                                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-success hover:bg-success/10 transition-colors"
                                                    title="Enviar WhatsApp"
                                                >
                                                    <MessageCircle size={16} />
                                                </button>
                                                <button
                                                    onClick={() => openMessageModal(cliente.id, "EMAIL")}
                                                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-accent transition-colors"
                                                    title="Enviar E-mail"
                                                >
                                                    <Mail size={16} />
                                                </button>
                                                <div className="w-px h-4 bg-border mx-1"></div>
                                                <Link
                                                    href={`/clientes/${cliente.id}`}
                                                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-accent transition-colors"
                                                >
                                                    <Eye size={16} />
                                                </Link>
                                                <button
                                                    onClick={() => setEditingCliente(cliente)}
                                                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-accent transition-colors"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setDeletingId(cliente.id)}
                                                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-danger transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-bg-tertiary/50">
                        <span className="text-xs text-text-muted">
                            {total} resultados — Página {page} de {totalPages}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => router.push(buildUrl({ page: String(page - 1) }))}
                            >
                                <ChevronLeft size={16} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => router.push(buildUrl({ page: String(page + 1) }))}
                            >
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Modal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                title="Novo Cliente"
                size="xl"
            >
                <ClienteForm
                    origens={origens}
                    onSuccess={() => {
                        setShowCreate(false);
                        router.refresh();
                    }}
                    onCancel={() => setShowCreate(false)}
                />
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={!!editingCliente}
                onClose={() => setEditingCliente(null)}
                title="Editar Cliente"
                size="xl"
            >
                {editingCliente && (
                    <ClienteForm
                        origens={origens}
                        initialData={{
                            id: editingCliente.id,
                            nome: editingCliente.nome,
                            tipoPessoa: editingCliente.tipoPessoa as "FISICA" | "JURIDICA",
                            status: editingCliente.status as "PROSPECTO" | "ATIVO" | "INATIVO" | "ARQUIVADO",
                            cpf: editingCliente.cpf || "",
                            cnpj: editingCliente.cnpj || "",
                            email: editingCliente.email || "",
                            celular: editingCliente.celular || "",
                        }}
                        onSuccess={() => {
                            setEditingCliente(null);
                            router.refresh();
                        }}
                        onCancel={() => setEditingCliente(null)}
                    />
                )}
            </Modal>

            {/* Delete Confirmation */}
            <Modal
                isOpen={!!deletingId}
                onClose={() => {
                    setDeletingId(null);
                    setDeleteError(null);
                }}
                title="Excluir Cliente"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-sm text-text-secondary">
                        Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
                    </p>
                    {deleteError && (
                        <div className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
                            {deleteError}
                        </div>
                    )}
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => {
                            setDeletingId(null);
                            setDeleteError(null);
                        }}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" className="w-full sm:w-auto" onClick={handleDelete}>
                            Excluir
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
