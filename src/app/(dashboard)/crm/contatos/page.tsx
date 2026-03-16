"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Search, Filter, Users, Download, CheckSquare, MessageCircle, Mail,
    Upload, ListPlus, Tag, UserCheck, Trash2, X, ChevronDown, Loader2,
    Send, Bookmark, BookmarkCheck, Plus, BookmarkX, MapPin, List,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-fields";
import { TagSelector } from "@/components/crm/tag-selector";
import { useMessageStore } from "@/store/use-message-store";
import { useRouter } from "next/navigation";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ContactTagItem = {
    tag?: { id: string; name: string; color: string } | null;
};

type ContactListItem = {
    list?: { id: string; name: string; color: string } | null;
};

type CRMContact = {
    id: string;
    nome: string;
    email?: string | null;
    telefone?: string | null;
    celular?: string | null;
    whatsapp?: string | null;
    status?: string | null;
    tipoPessoa?: string | null;
    crmRelationship?: string | null;
    crmScore?: number | null;
    cidade?: string | null;
    estado?: string | null;
    contactTags?: ContactTagItem[];
    listMembers?: ContactListItem[];
};

type CRMList = { id: string; name: string; color: string };
type SavedView = { id: string; name: string; filters: Record<string, unknown>; isShared: boolean; userId: string };

type BulkAction =
    | { type: "addToList" }
    | { type: "changeStage" }
    | { type: "addTag" }
    | { type: "exportSelected" }
    | { type: "delete" }
    | { type: "sendCampaign" };

const RELATIONSHIP_STAGES = [
    { value: "LEAD", label: "Lead", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
    { value: "PROSPECT", label: "Prospecto", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
    { value: "CLIENT", label: "Cliente", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
    { value: "FORMER_CLIENT", label: "Ex-Cliente", color: "bg-gray-500/10 text-gray-400 border-gray-500/30" },
    { value: "PARTNER", label: "Parceiro", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
];

const stageColor = (rel?: string | null) =>
    RELATIONSHIP_STAGES.find(s => s.value === rel)?.color || "bg-info/10 text-info border-info/30";

const stageLabel = (rel?: string | null) =>
    RELATIONSHIP_STAGES.find(s => s.value === rel)?.label || rel || "—";

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function AudienciaContatosPage() {
    const router = useRouter();
    const [clientes, setClientes] = useState<CRMContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterRelationship, setFilterRelationship] = useState("");
    const [filterListId, setFilterListId] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkDropdown, setBulkDropdown] = useState<string | null>(null);
    const [lists, setLists] = useState<CRMList[]>([]);
    const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([]);
    const [savedViews, setSavedViews] = useState<SavedView[]>([]);
    const [savingView, setSavingView] = useState(false);
    const [viewNameInput, setViewNameInput] = useState("");
    const [showSaveView, setShowSaveView] = useState(false);
    const { openMessageModal } = useMessageStore();

    const fetchContacts = useCallback(async (search?: string, relationship?: string, listId?: string) => {
        setLoading(true);
        try {
            const qs = new URLSearchParams();
            qs.set("pageSize", "200");
            if (search) qs.set("search", search);
            if (relationship) qs.set("crmRelationship", relationship);
            if (listId) qs.set("listId", listId);
            const res = await fetch(`/api/crm/contatos?${qs.toString()}`, { cache: "no-store" });
            if (!res.ok) throw new Error("Falha ao carregar contatos");
            const data = await res.json();
            setClientes(data.items || []);
        } catch (error) {
            console.error(error);
            setClientes([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchSavedViews = useCallback(async () => {
        try {
            const res = await fetch("/api/crm/contatos/views");
            if (res.ok) setSavedViews(await res.json());
        } catch { /* silent */ }
    }, []);

    const applyView = useCallback((view: SavedView) => {
        const f = view.filters;
        const s = typeof f.search === "string" ? f.search : searchTerm;
        const r = typeof f.relationship === "string" ? f.relationship : filterRelationship;
        const l = typeof f.listId === "string" ? f.listId : filterListId;
        setSearchTerm(s);
        setFilterRelationship(r);
        setFilterListId(l);
        void fetchContacts(s, r, l);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchContacts]);

    const saveCurrentView = async () => {
        if (!viewNameInput.trim()) return;
        setSavingView(true);
        try {
            const filters: Record<string, unknown> = {};
            if (searchTerm) filters.search = searchTerm;
            if (filterRelationship) filters.relationship = filterRelationship;
            if (filterListId) filters.listId = filterListId;
            const res = await fetch("/api/crm/contatos/views", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: viewNameInput.trim(), filters }),
            });
            if (res.ok) {
                setViewNameInput("");
                setShowSaveView(false);
                await fetchSavedViews();
            }
        } finally { setSavingView(false); }
    };

    const deleteView = async (id: string) => {
        if (!confirm("Remover esta view salva?")) return;
        await fetch(`/api/crm/contatos/views/${id}`, { method: "DELETE" });
        await fetchSavedViews();
    };

    useEffect(() => {
        void fetchContacts();
        fetch("/api/crm/listas").then(r => r.json()).then(d => setLists(d.listas || [])).catch(() => { });
        fetch("/api/crm/tags").then(r => r.json()).then(d => setTags(Array.isArray(d) ? d : [])).catch(() => { });
        void fetchSavedViews();
    }, [fetchContacts, fetchSavedViews]);

    const filteredClientes = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return clientes.filter((c) => {
            if (term) {
                const phone = c.whatsapp || c.celular || c.telefone || "";
                if (
                    !c.nome?.toLowerCase().includes(term) &&
                    !c.email?.toLowerCase().includes(term) &&
                    !String(phone).toLowerCase().includes(term)
                ) return false;
            }
            return true;
        });
    }, [clientes, searchTerm]);

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredClientes.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredClientes.map((c) => c.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const n = new Set(selectedIds);
        if (n.has(id)) n.delete(id); else n.add(id);
        setSelectedIds(n);
    };

    const handleTagsChange = async (clienteId: string, tagIds: string[]) => {
        try {
            await fetch(`/api/crm/contatos/${clienteId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "setTags", tagIds }),
            });
            await fetchContacts(searchTerm, filterRelationship, filterListId);
        } catch (error) {
            console.error(error);
        }
    };

    // ─── Bulk Actions ─────────────────────────────────────────────────────────

    const selectedArray = Array.from(selectedIds);

    const bulkAddToList = async (listId: string) => {
        setBulkLoading(true);
        try {
            await fetch(`/api/crm/listas/${listId}/membros`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clienteIds: selectedArray }),
            });
            alert(`${selectedArray.length} contatos adicionados à lista com sucesso.`);
            setBulkDropdown(null);
            setSelectedIds(new Set());
        } catch { alert("Erro ao adicionar à lista."); }
        finally { setBulkLoading(false); }
    };

    const bulkChangeStage = async (stage: string) => {
        setBulkLoading(true);
        try {
            await fetch("/api/crm/contatos/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "changeStage", clienteIds: selectedArray, value: stage }),
            });
            await fetchContacts(searchTerm, filterRelationship, filterListId);
            setBulkDropdown(null);
            setSelectedIds(new Set());
        } catch { alert("Erro ao alterar estágio."); }
        finally { setBulkLoading(false); }
    };

    const bulkAddTag = async (tagId: string) => {
        setBulkLoading(true);
        try {
            await fetch("/api/crm/contatos/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "addTag", clienteIds: selectedArray, value: tagId }),
            });
            await fetchContacts(searchTerm, filterRelationship, filterListId);
            setBulkDropdown(null);
            setSelectedIds(new Set());
        } catch { alert("Erro ao adicionar tag."); }
        finally { setBulkLoading(false); }
    };

    const bulkDelete = async () => {
        if (!confirm(`Deseja excluir ${selectedArray.length} contatos? Esta ação não pode ser desfeita.`)) return;
        setBulkLoading(true);
        try {
            await fetch("/api/crm/contatos/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "delete", clienteIds: selectedArray }),
            });
            await fetchContacts(searchTerm, filterRelationship, filterListId);
            setSelectedIds(new Set());
        } catch { alert("Erro ao excluir contatos."); }
        finally { setBulkLoading(false); }
    };

    const bulkExport = () => {
        const selected = filteredClientes.filter(c => selectedIds.has(c.id));
        const rows = [
            ["nome", "email", "telefone", "estagio", "tipoPessoa", "cidade", "estado", "listas", "tags"],
            ...selected.map((c) => [
                c.nome || "",
                c.email || "",
                c.whatsapp || c.celular || c.telefone || "",
                stageLabel(c.crmRelationship),
                c.tipoPessoa || "",
                c.cidade || "",
                c.estado || "",
                (c.listMembers || []).map((lm) => lm.list?.name).filter(Boolean).join("; "),
                (c.contactTags || []).map((ct) => ct.tag?.name).filter(Boolean).join("; "),
            ]),
        ];
        const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `crm-selecionados-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportAllCsv = () => {
        const rows = [
            ["nome", "email", "telefone", "estagio", "tipoPessoa", "cidade", "estado", "listas", "tags"],
            ...filteredClientes.map((c) => [
                c.nome || "",
                c.email || "",
                c.whatsapp || c.celular || c.telefone || "",
                stageLabel(c.crmRelationship),
                c.tipoPessoa || "",
                c.cidade || "",
                c.estado || "",
                (c.listMembers || []).map((lm) => lm.list?.name).filter(Boolean).join("; "),
                (c.contactTags || []).map((ct) => ct.tag?.name).filter(Boolean).join("; "),
            ]),
        ];
        const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `crm-contatos-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const hasSelection = selectedIds.size > 0;
    const activeFiltersCount = [filterRelationship, filterListId].filter(Boolean).length;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-bg-primary">
            {/* Header */}
            <div className="h-20 border-b border-border bg-bg-secondary px-8 flex items-center justify-between shadow-sm shrink-0">
                <div>
                    <h1 className="font-bold text-text-primary text-xl flex items-center gap-2">
                        <Users className="text-accent" /> Base de Contatos CRM
                    </h1>
                    <p className="text-xs text-text-muted mt-1">
                        Gestão unificada de leads, clientes e parceiros.
                        {activeFiltersCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-bold">
                                {activeFiltersCount} filtro{activeFiltersCount !== 1 ? "s" : ""} ativo{activeFiltersCount !== 1 ? "s" : ""}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/crm/listas">
                        <Button variant="outline" className="border-border bg-bg-tertiary gap-2 text-sm">
                            <List size={16} /> Gerenciar Listas
                        </Button>
                    </Link>
                    <Link href="/crm/contatos/importar">
                        <Button variant="outline" className="border-border bg-bg-tertiary gap-2 text-sm">
                            <Upload size={16} /> Importar
                        </Button>
                    </Link>
                    <Button variant="outline" className="border-border bg-bg-tertiary gap-2 text-sm" onClick={exportAllCsv}>
                        <Download size={16} /> Exportar CSV
                    </Button>
                </div>
            </div>

            {/* Saved Views Bar */}
            {savedViews.length > 0 && (
                <div className="px-6 pt-4 shrink-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-text-muted flex items-center gap-1 mr-1">
                            <Bookmark size={12} /> Views salvas:
                        </span>
                        {savedViews.map(view => (
                            <div key={view.id} className="flex items-center gap-0.5 group">
                                <button
                                    onClick={() => applyView(view)}
                                    className="px-3 py-1.5 text-xs rounded-lg bg-bg-tertiary border border-border text-text-secondary hover:border-accent hover:text-accent transition-colors font-medium"
                                >
                                    {view.isShared && <span className="mr-1 opacity-50">↗</span>}
                                    {view.name}
                                </button>
                                <button
                                    onClick={() => deleteView(view.id)}
                                    className="p-1 opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all"
                                    title="Remover view"
                                >
                                    <BookmarkX size={11} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="p-6 pb-2 shrink-0">
                <div className="glass-card p-4 flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row items-center gap-3">
                        {/* Search */}
                        <div className="relative w-full md:flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <Input
                                placeholder="Buscar por nome, email ou telefone..."
                                className="pl-10 bg-bg-primary border-border"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Stage filter */}
                        <select
                            className="h-10 px-3 rounded-lg border border-border bg-bg-primary text-text-secondary text-sm shrink-0"
                            value={filterRelationship}
                            onChange={e => {
                                setFilterRelationship(e.target.value);
                                void fetchContacts(searchTerm, e.target.value, filterListId);
                            }}
                        >
                            <option value="">Todos os estágios</option>
                            {RELATIONSHIP_STAGES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>

                        {/* List filter */}
                        <select
                            className="h-10 px-3 rounded-lg border border-border bg-bg-primary text-text-secondary text-sm shrink-0"
                            value={filterListId}
                            onChange={e => {
                                setFilterListId(e.target.value);
                                void fetchContacts(searchTerm, filterRelationship, e.target.value);
                            }}
                        >
                            <option value="">Todas as listas</option>
                            {lists.map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                variant="outline"
                                className="h-10 gap-2 border-border text-text-muted"
                                onClick={() => fetchContacts(searchTerm, filterRelationship, filterListId)}
                            >
                                <Filter size={16} /> Filtrar
                            </Button>

                            {(filterRelationship || filterListId || searchTerm) && (
                                <Button
                                    variant="outline"
                                    className="h-10 gap-1.5 border-border text-text-muted hover:text-danger"
                                    onClick={() => {
                                        setSearchTerm("");
                                        setFilterRelationship("");
                                        setFilterListId("");
                                        void fetchContacts();
                                    }}
                                    title="Limpar filtros"
                                >
                                    <X size={14} /> Limpar
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                className="h-10 gap-2 border-border text-text-muted"
                                onClick={() => setShowSaveView(!showSaveView)}
                                title="Salvar filtros como view"
                            >
                                <BookmarkCheck size={16} />
                            </Button>
                        </div>
                    </div>

                    {/* Active list indicator */}
                    {filterListId && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-text-muted">Filtrando pela lista:</span>
                            {(() => {
                                const l = lists.find(x => x.id === filterListId);
                                return l ? (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-tertiary border border-border font-medium text-text-secondary">
                                        <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                                        {l.name}
                                        <button onClick={() => { setFilterListId(""); void fetchContacts(searchTerm, filterRelationship, ""); }} className="ml-1 hover:text-danger">
                                            <X size={10} />
                                        </button>
                                    </span>
                                ) : null;
                            })()}
                            <Link href={`/crm/listas/${filterListId}`} className="text-accent hover:underline flex items-center gap-1">
                                <List size={11} /> Ver lista completa
                            </Link>
                        </div>
                    )}

                    {/* Save View Panel */}
                    {showSaveView && (
                        <div className="flex items-center gap-2 mt-1 pt-3 border-t border-border animate-fade-in">
                            <span className="text-xs text-text-muted font-medium whitespace-nowrap">Salvar como view:</span>
                            <input
                                type="text"
                                className="flex-1 h-8 px-3 rounded-lg border border-border bg-bg-primary text-text-secondary text-xs"
                                placeholder="Ex: Clientes do DF, Leads Trabalhista..."
                                value={viewNameInput}
                                onChange={e => setViewNameInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && saveCurrentView()}
                            />
                            <button
                                className="flex items-center gap-1 h-8 px-3 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-50"
                                onClick={saveCurrentView}
                                disabled={savingView || !viewNameInput.trim()}
                            >
                                {savingView ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                Salvar
                            </button>
                            <button className="h-8 px-2 text-text-muted hover:text-danger text-xs" onClick={() => setShowSaveView(false)}>
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Bulk Action Toolbar */}
            {hasSelection && (
                <div className="mx-6 mb-2 animate-fade-in">
                    <div className="flex items-center gap-2 px-4 py-3 bg-accent/10 border border-accent/30 rounded-xl flex-wrap">
                        <span className="text-sm font-bold text-accent mr-2">
                            {selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}
                        </span>

                        {/* Add to List */}
                        <div className="relative">
                            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs border-border bg-bg-secondary"
                                onClick={() => setBulkDropdown(bulkDropdown === "list" ? null : "list")}>
                                <ListPlus size={13} /> Adicionar à Lista <ChevronDown size={11} />
                            </Button>
                            {bulkDropdown === "list" && (
                                <div className="absolute top-full left-0 mt-1 z-50 bg-bg-elevated border border-border rounded-xl shadow-xl min-w-[220px] py-1">
                                    {lists.length === 0 ? (
                                        <div className="px-4 py-3 text-xs text-text-muted">Nenhuma lista cadastrada</div>
                                    ) : lists.map(l => (
                                        <button key={l.id} className="w-full text-left px-4 py-2.5 text-sm hover:bg-bg-tertiary text-text-secondary transition-colors flex items-center gap-2"
                                            onClick={() => bulkAddToList(l.id)}>
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: l.color }} />
                                            {l.name}
                                        </button>
                                    ))}
                                    <div className="border-t border-border mt-1 pt-1 px-2 pb-1">
                                        <Link href="/crm/listas" className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-text-muted hover:text-accent transition-colors">
                                            <Plus size={11} /> Criar nova lista
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Change Stage */}
                        <div className="relative">
                            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs border-border bg-bg-secondary"
                                onClick={() => setBulkDropdown(bulkDropdown === "stage" ? null : "stage")}>
                                <UserCheck size={13} /> Alterar Estágio <ChevronDown size={11} />
                            </Button>
                            {bulkDropdown === "stage" && (
                                <div className="absolute top-full left-0 mt-1 z-50 bg-bg-elevated border border-border rounded-xl shadow-xl min-w-[200px] py-1">
                                    {RELATIONSHIP_STAGES.map(s => (
                                        <button key={s.value} className="w-full text-left px-4 py-2.5 text-sm hover:bg-bg-tertiary text-text-secondary transition-colors"
                                            onClick={() => bulkChangeStage(s.value)}>
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add Tag */}
                        <div className="relative">
                            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs border-border bg-bg-secondary"
                                onClick={() => setBulkDropdown(bulkDropdown === "tag" ? null : "tag")}>
                                <Tag size={13} /> Adicionar Tag <ChevronDown size={11} />
                            </Button>
                            {bulkDropdown === "tag" && (
                                <div className="absolute top-full left-0 mt-1 z-50 bg-bg-elevated border border-border rounded-xl shadow-xl min-w-[200px] py-1">
                                    {tags.length === 0 ? (
                                        <div className="px-4 py-3 text-xs text-text-muted">Nenhuma tag cadastrada</div>
                                    ) : tags.map(t => (
                                        <button key={t.id} className="w-full text-left px-4 py-2.5 text-sm hover:bg-bg-tertiary transition-colors flex items-center gap-2"
                                            onClick={() => bulkAddTag(t.id)}>
                                            <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Send Campaign */}
                        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs border-border bg-bg-secondary"
                            onClick={() => router.push(`/crm/campanhas/nova?ids=${selectedArray.join(",")}`)}>
                            <Send size={13} /> Disparar Campanha
                        </Button>

                        {/* Export */}
                        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs border-border bg-bg-secondary" onClick={bulkExport}>
                            <Download size={13} /> Exportar ({selectedIds.size})
                        </Button>

                        {/* Delete */}
                        <Button size="sm" variant="outline"
                            className="gap-1.5 h-8 text-xs border-destructive/50 text-destructive bg-bg-secondary hover:bg-destructive/10"
                            onClick={bulkDelete}>
                            <Trash2 size={13} /> Excluir
                        </Button>

                        {bulkLoading && <Loader2 size={16} className="animate-spin text-accent ml-1" />}
                        <button className="ml-auto text-text-muted hover:text-text-primary" onClick={() => setSelectedIds(new Set())}>
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 p-6 pt-2 overflow-hidden flex flex-col">
                <div className="glass-card flex-1 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto overflow-y-auto flex-1" onClick={() => setBulkDropdown(null)}>
                        <table className="w-full text-left text-sm text-text-secondary">
                            <thead className="bg-bg-tertiary/80 text-xs uppercase text-text-muted border-b border-border sticky top-0 z-10 backdrop-blur-md">
                                <tr>
                                    <th className="px-5 py-4 w-10">
                                        <div
                                            className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${selectedIds.size === filteredClientes.length && filteredClientes.length > 0
                                                ? "bg-accent border-accent text-[#090705]"
                                                : "border-text-muted hover:border-text-primary bg-bg-primary"}`}
                                            onClick={toggleSelectAll}
                                        >
                                            {selectedIds.size === filteredClientes.length && filteredClientes.length > 0 && <CheckSquare size={14} />}
                                        </div>
                                    </th>
                                    <th className="px-5 py-4 font-semibold">Contato</th>
                                    <th className="px-5 py-4 font-semibold">Estágio</th>
                                    <th className="px-5 py-4 font-semibold">
                                        <div className="flex items-center gap-1"><MapPin size={12} /> Localização</div>
                                    </th>
                                    <th className="px-5 py-4 font-semibold">
                                        <div className="flex items-center gap-1"><List size={12} /> Listas</div>
                                    </th>
                                    <th className="px-5 py-4 font-semibold">Tags</th>
                                    <th className="px-5 py-4 font-semibold">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {loading && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-text-muted">
                                            <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                                            Carregando contatos...
                                        </td>
                                    </tr>
                                )}
                                {!loading && filteredClientes.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-text-muted">
                                            <Users size={32} className="mx-auto mb-3 opacity-40" />
                                            <p>Nenhum contato encontrado.</p>
                                            {filterListId && (
                                                <button
                                                    className="mt-2 text-xs text-accent hover:underline"
                                                    onClick={() => { setFilterListId(""); void fetchContacts(searchTerm, filterRelationship, ""); }}
                                                >
                                                    Limpar filtro de lista
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )}
                                {!loading && filteredClientes.map((cliente) => {
                                    const selectedTagIds = (cliente.contactTags || [])
                                        .map((ct) => ct.tag?.id)
                                        .filter((v): v is string => Boolean(v));
                                    const phone = cliente.whatsapp || cliente.celular || cliente.telefone || "—";
                                    const isSelected = selectedIds.has(cliente.id);
                                    const clienteLists = (cliente.listMembers || [])
                                        .map(lm => lm.list)
                                        .filter(Boolean) as { id: string; name: string; color: string }[];

                                    return (
                                        <tr
                                            key={cliente.id}
                                            className={`hover:bg-bg-elevated/50 transition-colors group ${isSelected ? "bg-accent/5 border-l-2 border-l-accent" : ""}`}
                                        >
                                            <td className="px-5 py-3.5">
                                                <div
                                                    className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${isSelected ? "bg-accent border-accent text-[#090705]" : "border-text-muted hover:border-text-primary bg-bg-primary group-hover:border-text-secondary"}`}
                                                    onClick={() => toggleSelect(cliente.id)}
                                                >
                                                    {isSelected && <CheckSquare size={14} />}
                                                </div>
                                            </td>

                                            {/* Contato */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-xs font-bold text-text-primary border border-border shadow-sm shrink-0">
                                                        {String(cliente.nome || "?").charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span
                                                            className="font-bold text-text-primary group-hover:text-accent transition-colors cursor-pointer truncate"
                                                            onClick={() => router.push(`/crm/contatos/${cliente.id}`)}
                                                        >
                                                            {cliente.nome}
                                                        </span>
                                                        <span className="text-xs text-text-muted font-mono truncate">{phone}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Estágio */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border w-fit ${stageColor(cliente.crmRelationship)}`}>
                                                        {stageLabel(cliente.crmRelationship)}
                                                    </span>
                                                    {cliente.crmScore != null && (
                                                        <div className="flex items-center gap-1">
                                                            <div className="w-14 h-1 rounded bg-border overflow-hidden">
                                                                <div className="h-full rounded bg-accent" style={{ width: `${Math.min(100, cliente.crmScore)}%` }} />
                                                            </div>
                                                            <span className="text-[10px] text-text-muted">{cliente.crmScore}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Localização */}
                                            <td className="px-5 py-3.5">
                                                {(cliente.cidade || cliente.estado) ? (
                                                    <div className="flex items-center gap-1 text-xs text-text-muted">
                                                        <MapPin size={11} className="shrink-0" />
                                                        <span className="truncate max-w-[120px]">
                                                            {[cliente.cidade, cliente.estado].filter(Boolean).join(" / ")}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-text-muted/40 text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Listas */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-wrap gap-1 max-w-[180px]">
                                                    {clienteLists.length === 0 ? (
                                                        <span className="text-text-muted/40 text-xs">—</span>
                                                    ) : clienteLists.slice(0, 3).map(l => (
                                                        <button
                                                            key={l.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.push(`/crm/listas/${l.id}`);
                                                            }}
                                                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-border/60 text-[10px] text-text-muted hover:border-accent hover:text-accent transition-colors"
                                                            title={`Ver lista: ${l.name}`}
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: l.color }} />
                                                            {l.name}
                                                        </button>
                                                    ))}
                                                    {clienteLists.length > 3 && (
                                                        <span className="text-[10px] text-text-muted/60">+{clienteLists.length - 3}</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Tags */}
                                            <td className="px-5 py-3.5">
                                                <TagSelector
                                                    selectedTagIds={selectedTagIds}
                                                    onTagsChange={(tagIds) => handleTagsChange(cliente.id, tagIds)}
                                                />
                                            </td>

                                            {/* Ações */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        className="p-1.5 rounded-lg bg-bg-tertiary text-text-muted border border-border hover:bg-success/10 hover:text-success hover:border-success/30 transition-colors"
                                                        onClick={() => openMessageModal(cliente.id, "WHATSAPP")}
                                                        title="WhatsApp"
                                                    >
                                                        <MessageCircle size={13} />
                                                    </button>
                                                    <button
                                                        className="p-1.5 rounded-lg bg-bg-tertiary text-text-muted border border-border hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30 transition-colors"
                                                        onClick={() => openMessageModal(cliente.id, "EMAIL")}
                                                        title="Email"
                                                    >
                                                        <Mail size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="h-12 border-t border-border flex items-center justify-between px-6 bg-bg-tertiary/50">
                        <span className="text-xs text-text-muted">
                            {filteredClientes.length} contato{filteredClientes.length !== 1 ? "s" : ""} exibido{filteredClientes.length !== 1 ? "s" : ""}
                            {filterListId && lists.find(l => l.id === filterListId) && (
                                <span className="ml-2 text-text-muted/60">
                                    na lista &ldquo;{lists.find(l => l.id === filterListId)?.name}&rdquo;
                                </span>
                            )}
                        </span>
                        <div className="text-xs text-text-muted">
                            {selectedIds.size > 0 ? (
                                <span className="text-accent font-semibold">{selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}</span>
                            ) : "Clique nas caixas para selecionar"}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
