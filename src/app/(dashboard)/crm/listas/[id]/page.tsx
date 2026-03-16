"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Users, Search, Plus, Trash2, Mail, MessageCircle,
    Loader2, X, CheckSquare, Download, Send, ChevronLeft, ChevronRight,
    UserPlus, MapPin, Star, Filter,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMessageStore } from "@/store/use-message-store";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ListaInfo {
    id: string;
    name: string;
    description?: string | null;
    color: string;
    folder?: { name: string; color: string } | null;
    _count: { members: number };
}

interface MembroContato {
    id: string; // listMember id
    addedAt: string;
    cliente: {
        id: string;
        nome: string;
        email?: string | null;
        whatsapp?: string | null;
        telefone?: string | null;
        crmRelationship?: string | null;
        crmScore?: number | null;
        status?: string | null;
        cidade?: string | null;
        estado?: string | null;
    };
}

interface ContatoParaAdicionar {
    id: string;
    nome: string;
    email?: string | null;
    whatsapp?: string | null;
    crmRelationship?: string | null;
    cidade?: string | null;
    estado?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
    LEAD:          "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    PROSPECT:      "bg-blue-500/10 text-blue-400 border-blue-500/30",
    CLIENT:        "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    FORMER_CLIENT: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    PARTNER:       "bg-purple-500/10 text-purple-400 border-purple-500/30",
};

const STAGE_LABELS: Record<string, string> = {
    LEAD: "Lead", PROSPECT: "Prospecto", CLIENT: "Cliente",
    FORMER_CLIENT: "Ex-Cliente", PARTNER: "Parceiro",
};

function initials(name: string) {
    return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

// ─── Modal Adicionar Contatos ──────────────────────────────────────────────────

function AdicionarContatosModal({
    listaId,
    onClose,
    onAdded,
}: {
    listaId: string;
    onClose: () => void;
    onAdded: () => void;
}) {
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<ContatoParaAdicionar[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const doSearch = useCallback(async (q: string) => {
        setLoading(true);
        try {
            const qs = new URLSearchParams({ pageSize: "50", excludeListId: listaId });
            if (q.trim()) qs.set("search", q.trim());
            const res = await fetch(`/api/crm/contatos?${qs}`);
            const data = await res.json();
            setResults(data.items || []);
        } finally { setLoading(false); }
    }, [listaId]);

    // Carrega todos os contatos disponíveis ao abrir o modal
    useEffect(() => { void doSearch(""); }, [doSearch]);

    // Filtra conforme o usuário digita (debounced)
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => void doSearch(search), 350);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [search, doSearch]);

    const toggle = (id: string) => {
        setSelected(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    };

    const handleAdd = async () => {
        if (selected.size === 0) return;
        setSaving(true);
        try {
            await fetch(`/api/crm/listas/${listaId}/membros`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clienteIds: Array.from(selected) }),
            });
            onAdded();
            onClose();
        } finally { setSaving(false); }
    };

    const modalContent = (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-bg-elevated border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <UserPlus size={18} className="text-accent" />
                        <h2 className="font-semibold text-text-primary">Adicionar Contatos à Lista</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted">
                        <X size={16} />
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 py-3 border-b border-border">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por nome, email ou telefone..."
                            className="w-full pl-9 pr-4 h-10 rounded-xl border border-border bg-bg-primary text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto py-2">
                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 size={20} className="animate-spin text-text-muted" />
                        </div>
                    )}
                    {!loading && results.length === 0 && (
                        <div className="text-center py-8 text-sm text-text-muted">
                            {search.trim() ? "Nenhum contato encontrado para esta busca." : "Todos os contatos já estão nesta lista."}
                        </div>
                    )}
                    {results.map(c => {
                        const isSel = selected.has(c.id);
                        return (
                            <div
                                key={c.id}
                                onClick={() => toggle(c.id)}
                                className={`flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-bg-tertiary/50 transition-colors ${isSel ? "bg-accent/5" : ""}`}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${isSel ? "bg-accent border-accent" : "border-text-muted"}`}>
                                    {isSel && <CheckSquare size={12} className="text-white" />}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-xs font-bold text-text-primary border border-border shrink-0">
                                    {initials(c.nome)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-text-primary truncate">{c.nome}</div>
                                    <div className="text-xs text-text-muted truncate">
                                        {c.email || c.whatsapp || "—"}
                                        {c.cidade && <span className="ml-2 text-text-muted/60">• {c.cidade}{c.estado ? `/${c.estado}` : ""}</span>}
                                    </div>
                                </div>
                                {c.crmRelationship && (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${STAGE_COLORS[c.crmRelationship] || ""}`}>
                                        {STAGE_LABELS[c.crmRelationship] || c.crmRelationship}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                    <span className="text-sm text-text-muted">
                        {selected.size > 0 ? `${selected.size} selecionado${selected.size !== 1 ? "s" : ""}` : "Nenhum selecionado"}
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
                        <Button
                            size="sm"
                            disabled={selected.size === 0 || saving}
                            onClick={handleAdd}
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            Adicionar {selected.size > 0 ? `(${selected.size})` : ""}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (typeof document === "undefined") return null;
    return createPortal(modalContent, document.body);
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function ListaDetalhePage() {
    const params = useParams();
    const router = useRouter();
    const listaId = params.id as string;
    const { openMessageModal } = useMessageStore();

    const [lista, setLista] = useState<ListaInfo | null>(null);
    const [membros, setMembros] = useState<MembroContato[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [stageFilter, setStageFilter] = useState("");
    const [cidadeFilter, setCidadeFilter] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [removingLoading, setRemovingLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const PER_PAGE = 30;

    const fetchLista = useCallback(async () => {
        const res = await fetch(`/api/crm/listas/${listaId}`);
        if (res.ok) setLista(await res.json());
        else router.push("/crm/listas");
    }, [listaId, router]);

    const fetchMembros = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const qs = new URLSearchParams({ page: String(p), perPage: String(PER_PAGE) });
            const res = await fetch(`/api/crm/listas/${listaId}/membros?${qs}`);
            const data = await res.json();
            setMembros(data.membros || []);
            setTotal(data.pagination?.total || 0);
            setTotalPages(data.pagination?.totalPages || 1);
        } finally { setLoading(false); }
    }, [listaId]);

    useEffect(() => {
        void fetchLista();
        void fetchMembros(1);
    }, [fetchLista, fetchMembros]);

    // Filtered client-side (search + stage + cidade)
    const filtered = membros.filter(m => {
        const c = m.cliente;
        if (stageFilter && c.crmRelationship !== stageFilter) return false;
        if (cidadeFilter && !c.estado?.toLowerCase().includes(cidadeFilter.toLowerCase()) &&
            !c.cidade?.toLowerCase().includes(cidadeFilter.toLowerCase())) return false;
        if (search.trim()) {
            const t = search.toLowerCase();
            if (!c.nome?.toLowerCase().includes(t) &&
                !c.email?.toLowerCase().includes(t) &&
                !(c.whatsapp || c.telefone || "").includes(t)) return false;
        }
        return true;
    });

    const toggleAll = () => {
        if (selectedIds.size === filtered.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filtered.map(m => m.cliente.id)));
    };

    const toggleOne = (id: string) => {
        setSelectedIds(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    };

    const removeSelected = async () => {
        if (!confirm(`Remover ${selectedIds.size} contato${selectedIds.size !== 1 ? "s" : ""} desta lista?`)) return;
        setRemovingLoading(true);
        try {
            await fetch(`/api/crm/listas/${listaId}/membros`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clienteIds: Array.from(selectedIds) }),
            });
            setSelectedIds(new Set());
            await fetchMembros(page);
            await fetchLista();
        } finally { setRemovingLoading(false); }
    };

    const exportCsv = () => {
        const rows = [
            ["nome", "email", "whatsapp", "estagio", "cidade", "estado", "adicionado_em"],
            ...filtered
                .filter(m => selectedIds.size === 0 || selectedIds.has(m.cliente.id))
                .map(m => [
                    m.cliente.nome,
                    m.cliente.email || "",
                    m.cliente.whatsapp || "",
                    STAGE_LABELS[m.cliente.crmRelationship || ""] || m.cliente.crmRelationship || "",
                    m.cliente.cidade || "",
                    m.cliente.estado || "",
                    new Date(m.addedAt).toLocaleDateString("pt-BR"),
                ])
        ];
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `lista-${lista?.name || listaId}-${new Date().toISOString().slice(0,10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    const uniqueCidades = Array.from(new Set(membros.map(m => m.cliente.estado).filter(Boolean) as string[])).sort();

    if (!lista && !loading) return null;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-bg-primary">

            {/* Header */}
            <div className="border-b border-border bg-bg-secondary px-6 py-4 flex items-center gap-4 shrink-0 shadow-sm">
                <Link href="/crm/listas" className="p-2 rounded-xl hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors">
                    <ArrowLeft size={18} />
                </Link>

                {lista && (
                    <>
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: lista.color }} />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="font-bold text-text-primary text-lg truncate">{lista.name}</h1>
                                {lista.folder && (
                                    <span className="text-xs px-2 py-0.5 rounded-full border border-border text-text-muted bg-bg-tertiary">
                                        {lista.folder.name}
                                    </span>
                                )}
                            </div>
                            {lista.description && (
                                <p className="text-xs text-text-muted mt-0.5 truncate">{lista.description}</p>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 mr-2">
                            <div className="text-center">
                                <div className="text-lg font-bold text-text-primary">{total}</div>
                                <div className="text-[10px] text-text-muted uppercase tracking-wider">Total</div>
                            </div>
                            {filtered.length !== total && (
                                <div className="text-center">
                                    <div className="text-lg font-bold text-accent">{filtered.length}</div>
                                    <div className="text-[10px] text-text-muted uppercase tracking-wider">Filtrado</div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}>
                                <Download size={14} /> Exportar CSV
                            </Button>
                            <Button
                                size="sm"
                                className="gap-2"
                                onClick={() => router.push(`/crm/campanhas/nova?listId=${listaId}`)}
                            >
                                <Send size={14} /> Disparar Campanha
                            </Button>
                            <Button size="sm" className="gap-2 bg-accent" onClick={() => setShowAddModal(true)}>
                                <UserPlus size={14} /> Adicionar Contatos
                            </Button>
                        </div>
                    </>
                )}
            </div>

            {/* Filters */}
            <div className="px-6 py-3 border-b border-border bg-bg-secondary/50 flex items-center gap-3 flex-wrap shrink-0">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar na lista..."
                        className="w-full pl-9 pr-4 h-9 rounded-xl border border-border bg-bg-primary text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
                    />
                </div>

                <select
                    value={stageFilter}
                    onChange={e => setStageFilter(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-border bg-bg-primary text-sm text-text-secondary"
                >
                    <option value="">Todos os estágios</option>
                    <option value="LEAD">Lead</option>
                    <option value="PROSPECT">Prospecto</option>
                    <option value="CLIENT">Cliente</option>
                    <option value="FORMER_CLIENT">Ex-Cliente</option>
                    <option value="PARTNER">Parceiro</option>
                </select>

                <select
                    value={cidadeFilter}
                    onChange={e => setCidadeFilter(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-border bg-bg-primary text-sm text-text-secondary"
                >
                    <option value="">Todos os estados</option>
                    {uniqueCidades.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>

                {(search || stageFilter || cidadeFilter) && (
                    <button
                        onClick={() => { setSearch(""); setStageFilter(""); setCidadeFilter(""); }}
                        className="flex items-center gap-1 text-xs text-text-muted hover:text-danger transition-colors"
                    >
                        <X size={13} /> Limpar filtros
                    </button>
                )}
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
                <div className="mx-6 mt-3 animate-fade-in">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-accent/10 border border-accent/30 rounded-xl">
                        <span className="text-sm font-bold text-accent mr-1">
                            {selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5 text-xs border-border"
                            onClick={() => router.push(`/crm/campanhas/nova?ids=${Array.from(selectedIds).join(",")}`)}
                        >
                            <Send size={12} /> Disparar Campanha
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5 text-xs border-border"
                            onClick={exportCsv}
                        >
                            <Download size={12} /> Exportar ({selectedIds.size})
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                            onClick={removeSelected}
                            disabled={removingLoading}
                        >
                            {removingLoading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            Remover da Lista
                        </Button>
                        <button className="ml-auto text-text-muted hover:text-text-primary" onClick={() => setSelectedIds(new Set())}>
                            <X size={15} />
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 px-6 py-4 overflow-hidden flex flex-col gap-3">
                <div className="glass-card flex-1 overflow-hidden flex flex-col">
                    <div className="overflow-y-auto flex-1">
                        <table className="w-full text-sm text-left text-text-secondary">
                            <thead className="bg-bg-tertiary/80 text-xs uppercase text-text-muted border-b border-border sticky top-0 z-10 backdrop-blur-md">
                                <tr>
                                    <th className="px-5 py-3 w-10">
                                        <div
                                            onClick={toggleAll}
                                            className={`w-4 h-4 rounded border cursor-pointer flex items-center justify-center transition-colors ${selectedIds.size === filtered.length && filtered.length > 0 ? "bg-accent border-accent" : "border-text-muted hover:border-accent"}`}
                                        >
                                            {selectedIds.size === filtered.length && filtered.length > 0 && <CheckSquare size={11} className="text-white" />}
                                        </div>
                                    </th>
                                    <th className="px-5 py-3 font-semibold">Contato</th>
                                    <th className="px-5 py-3 font-semibold">Estágio</th>
                                    <th className="px-5 py-3 font-semibold">
                                        <div className="flex items-center gap-1"><MapPin size={12} /> Localização</div>
                                    </th>
                                    <th className="px-5 py-3 font-semibold">
                                        <div className="flex items-center gap-1"><Star size={12} /> Score</div>
                                    </th>
                                    <th className="px-5 py-3 font-semibold">Adicionado em</th>
                                    <th className="px-5 py-3 font-semibold">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {loading && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-text-muted">
                                            <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                                            Carregando membros...
                                        </td>
                                    </tr>
                                )}
                                {!loading && filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center">
                                            <Users size={32} className="mx-auto text-text-muted mb-3" />
                                            <p className="text-text-muted text-sm">
                                                {search || stageFilter || cidadeFilter ? "Nenhum contato corresponde aos filtros." : "Esta lista ainda não tem contatos."}
                                            </p>
                                            {!search && !stageFilter && !cidadeFilter && (
                                                <Button size="sm" className="mt-3 gap-2" onClick={() => setShowAddModal(true)}>
                                                    <UserPlus size={14} /> Adicionar primeiros contatos
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                )}
                                {!loading && filtered.map(m => {
                                    const c = m.cliente;
                                    const isSel = selectedIds.has(c.id);
                                    const stageColor = STAGE_COLORS[c.crmRelationship || ""] || "";
                                    return (
                                        <tr
                                            key={m.id}
                                            className={`hover:bg-bg-elevated/50 transition-colors group ${isSel ? "bg-accent/5 border-l-2 border-l-accent" : ""}`}
                                        >
                                            <td className="px-5 py-3.5">
                                                <div
                                                    onClick={() => toggleOne(c.id)}
                                                    className={`w-4 h-4 rounded border cursor-pointer flex items-center justify-center transition-colors ${isSel ? "bg-accent border-accent" : "border-text-muted hover:border-accent group-hover:border-text-secondary"}`}
                                                >
                                                    {isSel && <CheckSquare size={11} className="text-white" />}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-bg-tertiary border border-border flex items-center justify-center text-xs font-bold text-text-primary shrink-0">
                                                        {initials(c.nome)}
                                                    </div>
                                                    <div>
                                                        <button
                                                            onClick={() => router.push(`/crm/contatos/${c.id}`)}
                                                            className="font-semibold text-text-primary hover:text-accent transition-colors text-left"
                                                        >
                                                            {c.nome}
                                                        </button>
                                                        <div className="text-xs text-text-muted font-mono">
                                                            {c.email || c.whatsapp || c.telefone || "—"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${stageColor}`}>
                                                    {STAGE_LABELS[c.crmRelationship || ""] || c.crmRelationship || "—"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {(c.cidade || c.estado) ? (
                                                    <div className="flex items-center gap-1 text-xs text-text-muted">
                                                        <MapPin size={11} />
                                                        {[c.cidade, c.estado].filter(Boolean).join(" / ")}
                                                    </div>
                                                ) : <span className="text-text-muted/50">—</span>}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {c.crmScore != null ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full bg-accent"
                                                                style={{ width: `${Math.min(100, c.crmScore)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-text-muted">{c.crmScore}</span>
                                                    </div>
                                                ) : <span className="text-text-muted/50">—</span>}
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-text-muted">
                                                {new Date(m.addedAt).toLocaleDateString("pt-BR")}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        className="p-1.5 rounded-lg bg-bg-tertiary text-text-muted border border-border hover:text-success hover:border-success/30 transition-colors"
                                                        title="WhatsApp"
                                                        onClick={() => openMessageModal(c.id, "WHATSAPP")}
                                                    >
                                                        <MessageCircle size={13} />
                                                    </button>
                                                    <button
                                                        className="p-1.5 rounded-lg bg-bg-tertiary text-text-muted border border-border hover:text-blue-400 hover:border-blue-500/30 transition-colors"
                                                        title="Email"
                                                        onClick={() => openMessageModal(c.id, "EMAIL")}
                                                    >
                                                        <Mail size={13} />
                                                    </button>
                                                    <button
                                                        className="p-1.5 rounded-lg bg-bg-tertiary text-text-muted border border-border hover:text-danger hover:border-danger/30 transition-colors"
                                                        title="Remover da lista"
                                                        onClick={async () => {
                                                            await fetch(`/api/crm/listas/${listaId}/membros`, {
                                                                method: "DELETE",
                                                                headers: { "Content-Type": "application/json" },
                                                                body: JSON.stringify({ clienteIds: [c.id] }),
                                                            });
                                                            void fetchMembros(page);
                                                            void fetchLista();
                                                        }}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="border-t border-border px-5 py-3 flex items-center justify-between bg-bg-tertiary/30">
                            <span className="text-xs text-text-muted">
                                {total} contato{total !== 1 ? "s" : ""} na lista
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => { const p = page - 1; setPage(p); void fetchMembros(p); }}
                                    className="p-1.5 rounded-lg hover:bg-bg-tertiary disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeft size={15} />
                                </button>
                                <span className="text-xs text-text-muted">
                                    Pág. {page} / {totalPages}
                                </span>
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => { const p = page + 1; setPage(p); void fetchMembros(p); }}
                                    className="p-1.5 rounded-lg hover:bg-bg-tertiary disabled:opacity-30 transition-colors"
                                >
                                    <ChevronRight size={15} />
                                </button>
                            </div>
                        </div>
                    )}
                    {totalPages <= 1 && (
                        <div className="border-t border-border px-5 py-2.5 bg-bg-tertiary/30 flex items-center justify-between">
                            <span className="text-xs text-text-muted">{filtered.length} de {total} exibido{filtered.length !== 1 ? "s" : ""}</span>
                            <span className="text-xs text-text-muted">{selectedIds.size > 0 ? `${selectedIds.size} selecionado${selectedIds.size !== 1 ? "s" : ""}` : "Selecione para ações em lote"}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <AdicionarContatosModal
                    listaId={listaId}
                    onClose={() => setShowAddModal(false)}
                    onAdded={() => { void fetchMembros(page); void fetchLista(); }}
                />
            )}
        </div>
    );
}
