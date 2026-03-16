"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    List, FolderOpen, Plus, Trash2, Edit2, Users,
    Loader2, X, Check, ChevronRight, Send, UserPlus,
    ArrowRight, Tag, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CRMListFolder {
    id: string;
    name: string;
    color: string;
    _count: { lists: number };
}

interface CRMList {
    id: string;
    name: string;
    description?: string | null;
    color: string;
    folderId?: string | null;
    folder?: { id: string; name: string; color: string } | null;
    _count?: { members: number };
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const COLORS = [
    "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899",
    "#F43F5E", "#EF4444", "#F97316", "#EAB308",
    "#22C55E", "#10B981", "#14B8A6", "#06B6D4",
];

// ─── Inline Form ─────────────────────────────────────────────────────────────

function InlineForm({
    placeholder, onSave, onCancel, initialValue = "", initialColor = "#3B82F6",
}: {
    placeholder: string;
    onSave: (name: string, color: string) => Promise<void>;
    onCancel: () => void;
    initialValue?: string;
    initialColor?: string;
}) {
    const [name, setName] = useState(initialValue);
    const [color, setColor] = useState(initialColor);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [showPicker, setShowPicker] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        setError("");
        try {
            await onSave(name.trim(), color);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erro ao salvar.");
            setSaving(false);
        }
    };

    return (
        <div className="rounded-xl border border-accent/40 bg-bg-elevated p-3 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
                {/* Color picker */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowPicker(v => !v)}
                        className="w-6 h-6 rounded-full border-2 border-white/20 shadow shrink-0 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title="Escolher cor"
                    />
                    {showPicker && (
                        <div className="absolute top-8 left-0 z-30 bg-bg-primary border border-border rounded-xl p-2 grid grid-cols-6 gap-1 shadow-xl">
                            {COLORS.map(c => (
                                <button key={c} type="button"
                                    onClick={() => { setColor(c); setShowPicker(false); }}
                                    className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${color === c ? "ring-2 ring-white ring-offset-1" : ""}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <input
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === "Enter") void handleSave();
                        if (e.key === "Escape") onCancel();
                    }}
                    placeholder={placeholder}
                    className="flex-1 text-sm bg-transparent outline-none text-text-primary placeholder:text-text-muted/50"
                />
                <button type="button" onClick={onCancel}
                    className="p-1 rounded-lg hover:bg-bg-tertiary text-text-muted shrink-0">
                    <X size={14} />
                </button>
                <button type="button" onClick={handleSave}
                    disabled={saving || !name.trim()}
                    className="p-1 rounded-lg hover:bg-success/10 text-success disabled:opacity-40 shrink-0">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
            </div>
            {error && (
                <div className="flex items-center gap-1.5 text-xs text-danger mt-1">
                    <AlertCircle size={11} /> {error}
                </div>
            )}
            <p className="text-[10px] text-text-muted/60 mt-1">Enter para salvar • Esc para cancelar</p>
        </div>
    );
}

// ─── List Card ───────────────────────────────────────────────────────────────

function ListCard({ lista, onEdit, onDelete }: {
    lista: CRMList;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const router = useRouter();
    const count = lista._count?.members ?? 0;

    return (
        <div
            className="group relative bg-bg-secondary border border-border rounded-2xl p-4 hover:border-accent/50 hover:shadow-lg transition-all cursor-pointer flex flex-col gap-2.5"
            onClick={() => router.push(`/crm/listas/${lista.id}`)}
        >
            {/* Color bar top */}
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl opacity-80" style={{ backgroundColor: lista.color }} />

            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: lista.color }} />
                    <span className="font-semibold text-text-primary truncate text-sm">{lista.name}</span>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={e => e.stopPropagation()}>
                    <button onClick={onEdit} className="p-1 rounded hover:bg-bg-tertiary text-text-muted" title="Editar">
                        <Edit2 size={11} />
                    </button>
                    <button onClick={onDelete} className="p-1 rounded hover:bg-danger/10 text-text-muted hover:text-danger" title="Excluir">
                        <Trash2 size={11} />
                    </button>
                </div>
            </div>

            {lista.description && (
                <p className="text-xs text-text-muted line-clamp-2">{lista.description}</p>
            )}

            {/* Stats + action */}
            <div className="flex items-center justify-between mt-auto pt-1 border-t border-border/40">
                <div className="flex items-center gap-1.5 text-text-muted">
                    <Users size={12} />
                    <span className="text-xs font-semibold text-text-primary">{count}</span>
                    <span className="text-xs">contato{count !== 1 ? "s" : ""}</span>
                </div>
                <span className="text-[10px] text-accent flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    Abrir <ArrowRight size={10} />
                </span>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ListasPage() {
    const [listas, setListas] = useState<CRMList[]>([]);
    const [pastas, setPastas] = useState<CRMListFolder[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [creatingPasta, setCreatingPasta] = useState(false);
    const [creatingLista, setCreatingLista] = useState<string | null>(null);
    const [editandoPasta, setEditandoPasta] = useState<string | null>(null);
    const [editandoLista, setEditandoLista] = useState<string | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch("/api/crm/listas", { cache: "no-store" });
            if (!res.ok) throw new Error(`Erro ${res.status}`);
            const data = await res.json();
            const novasListas: CRMList[] = data.listas ?? [];
            const novasPastas: CRMListFolder[] = data.pastas ?? [];
            setListas(novasListas);
            setPastas(novasPastas);
            // Expand all folders
            setExpandedFolders(new Set(novasPastas.map(p => p.id)));
        } catch (e) {
            console.error("[fetchData]", e);
            setErrorMsg("Não foi possível carregar as listas.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void fetchData(); }, [fetchData]);

    // ── CRUD Pastas ───────────────────────────────────────────────────────────

    async function criarPasta(name: string, color: string) {
        const res = await fetch("/api/crm/listas/pastas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, color }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao criar pasta.");
        setCreatingPasta(false);
        setLoading(true);
        await fetchData();
    }

    async function editarPasta(id: string, name: string, color: string) {
        const res = await fetch(`/api/crm/listas/pastas/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, color }),
        });
        if (!res.ok) throw new Error("Erro ao editar pasta.");
        setEditandoPasta(null);
        setLoading(true);
        await fetchData();
    }

    async function deletarPasta(id: string) {
        if (!confirm("Deletar pasta? As listas serão mantidas sem pasta.")) return;
        await fetch(`/api/crm/listas/pastas/${id}`, { method: "DELETE" });
        setLoading(true);
        await fetchData();
    }

    // ── CRUD Listas ───────────────────────────────────────────────────────────

    async function criarLista(name: string, color: string, folderId?: string) {
        const res = await fetch("/api/crm/listas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, color, folderId: folderId ?? null }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao criar lista.");
        setCreatingLista(null);
        setLoading(true);
        await fetchData();
    }

    async function editarLista(id: string, name: string, color: string) {
        const res = await fetch(`/api/crm/listas/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, color }),
        });
        if (!res.ok) throw new Error("Erro ao editar lista.");
        setEditandoLista(null);
        setLoading(true);
        await fetchData();
    }

    async function deletarLista(id: string) {
        if (!confirm("Deletar lista? Todos os membros serão removidos.")) return;
        await fetch(`/api/crm/listas/${id}`, { method: "DELETE" });
        setLoading(true);
        await fetchData();
    }

    const listasSemPasta = listas.filter(l => !l.folderId);
    const totalContatos = listas.reduce((acc, l) => acc + (l._count?.members ?? 0), 0);

    const toggleFolder = (id: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // ── Loading / Error ───────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 size={24} className="animate-spin text-text-muted" />
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="max-w-5xl mx-auto py-8 px-6 text-center">
                <AlertCircle size={32} className="mx-auto text-danger mb-3" />
                <p className="text-danger font-medium">{errorMsg}</p>
                <Button size="sm" className="mt-4" onClick={() => { setErrorMsg(""); setLoading(true); void fetchData(); }}>
                    Tentar novamente
                </Button>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="max-w-5xl mx-auto py-8 px-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                        <List size={22} className="text-accent" /> Listas de Contatos
                    </h1>
                    <p className="text-sm text-text-muted mt-1">
                        <span className="font-semibold text-text-secondary">{listas.length}</span> lista{listas.length !== 1 ? "s" : ""} •{" "}
                        <span className="font-semibold text-text-secondary">{pastas.length}</span> pasta{pastas.length !== 1 ? "s" : ""} •{" "}
                        <span className="font-semibold text-text-secondary">{totalContatos}</span> entradas no total
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCreatingPasta(true)} className="gap-1.5">
                        <FolderOpen size={14} /> Nova pasta
                    </Button>
                    <Button size="sm" onClick={() => setCreatingLista("root")} className="gap-1.5">
                        <Plus size={14} /> Nova lista
                    </Button>
                </div>
            </div>

            {/* Nova Pasta Form */}
            {creatingPasta && (
                <div className="mb-5">
                    <InlineForm
                        placeholder="Nome da pasta (ex: Trabalhista, DF, VIP...)"
                        onSave={criarPasta}
                        onCancel={() => setCreatingPasta(false)}
                    />
                </div>
            )}

            {/* Empty State */}
            {pastas.length === 0 && listasSemPasta.length === 0 && !creatingLista && !creatingPasta && (
                <div className="text-center py-20 rounded-2xl border border-dashed border-border">
                    <List size={40} className="mx-auto text-text-muted mb-4 opacity-40" />
                    <p className="text-text-muted font-medium">Nenhuma lista criada ainda</p>
                    <p className="text-xs text-text-muted/60 mt-1 mb-5">
                        Organize seus contatos em listas. Ex: &ldquo;Clientes do DF&rdquo;, &ldquo;Leads Trabalhista&rdquo;.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => setCreatingPasta(true)} className="gap-1.5">
                            <FolderOpen size={14} /> Nova pasta
                        </Button>
                        <Button size="sm" onClick={() => setCreatingLista("root")} className="gap-1.5">
                            <Plus size={14} /> Criar primeira lista
                        </Button>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {/* Pastas */}
                {pastas.map(pasta => {
                    const pastasListas = listas.filter(l => l.folderId === pasta.id);
                    const expanded = expandedFolders.has(pasta.id);
                    const pastaContatos = pastasListas.reduce((acc, l) => acc + (l._count?.members ?? 0), 0);

                    return (
                        <div key={pasta.id} className="rounded-2xl border border-border overflow-hidden">
                            {/* Folder Header */}
                            {editandoPasta === pasta.id ? (
                                <div className="p-3 bg-bg-secondary">
                                    <InlineForm
                                        placeholder="Nome da pasta"
                                        initialValue={pasta.name}
                                        initialColor={pasta.color}
                                        onSave={(n, c) => editarPasta(pasta.id, n, c)}
                                        onCancel={() => setEditandoPasta(null)}
                                    />
                                </div>
                            ) : (
                                <div
                                    className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-bg-tertiary/30 group transition-colors bg-bg-secondary"
                                    onClick={() => toggleFolder(pasta.id)}
                                >
                                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: pasta.color }} />
                                    <FolderOpen size={16} className="text-text-muted shrink-0" />
                                    <span className="flex-1 text-sm font-semibold text-text-primary">{pasta.name}</span>
                                    <div className="flex items-center gap-2 text-xs text-text-muted">
                                        <span>{pastasListas.length} lista{pastasListas.length !== 1 ? "s" : ""}</span>
                                        <span className="opacity-40">•</span>
                                        <span>{pastaContatos} contato{pastaContatos !== 1 ? "s" : ""}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                        onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => {
                                                setCreatingLista(pasta.id);
                                                setExpandedFolders(p => new Set([...p, pasta.id]));
                                            }}
                                            className="p-1 rounded hover:bg-bg-tertiary text-text-muted" title="Nova lista nesta pasta">
                                            <Plus size={13} />
                                        </button>
                                        <button onClick={() => setEditandoPasta(pasta.id)}
                                            className="p-1 rounded hover:bg-bg-tertiary text-text-muted">
                                            <Edit2 size={13} />
                                        </button>
                                        <button onClick={() => deletarPasta(pasta.id)}
                                            className="p-1 rounded hover:bg-danger/10 text-text-muted hover:text-danger">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                    <ChevronRight size={14} className={`text-text-muted transition-transform shrink-0 ${expanded ? "rotate-90" : ""}`} />
                                </div>
                            )}

                            {/* Folder Content */}
                            {expanded && (
                                <div className="border-t border-border bg-bg-primary p-4">
                                    {pastasListas.length === 0 && creatingLista !== pasta.id && (
                                        <div className="text-center py-5 rounded-xl border border-dashed border-border">
                                            <p className="text-xs text-text-muted">Nenhuma lista nesta pasta.</p>
                                            <button
                                                onClick={() => setCreatingLista(pasta.id)}
                                                className="mt-1.5 text-xs text-accent hover:underline flex items-center gap-1 mx-auto"
                                            >
                                                <Plus size={11} /> Adicionar lista
                                            </button>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {pastasListas.map(lista => {
                                            if (editandoLista === lista.id) {
                                                return (
                                                    <div key={lista.id}>
                                                        <InlineForm
                                                            placeholder="Nome da lista"
                                                            initialValue={lista.name}
                                                            initialColor={lista.color}
                                                            onSave={(n, c) => editarLista(lista.id, n, c)}
                                                            onCancel={() => setEditandoLista(null)}
                                                        />
                                                    </div>
                                                );
                                            }
                                            return (
                                                <ListCard
                                                    key={lista.id}
                                                    lista={lista}
                                                    onEdit={() => setEditandoLista(lista.id)}
                                                    onDelete={() => deletarLista(lista.id)}
                                                />
                                            );
                                        })}
                                    </div>

                                    {creatingLista === pasta.id && (
                                        <div className={pastasListas.length > 0 ? "mt-3" : ""}>
                                            <InlineForm
                                                placeholder="Nome da lista (ex: Clientes do DF)"
                                                onSave={(n, c) => criarLista(n, c, pasta.id)}
                                                onCancel={() => setCreatingLista(null)}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Listas sem pasta */}
                {(listasSemPasta.length > 0 || creatingLista === "root") && (
                    <div>
                        {pastas.length > 0 && (
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-xs font-semibold uppercase text-text-muted tracking-wider">Sem pasta</span>
                                <div className="flex-1 h-px bg-border" />
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {listasSemPasta.map(lista => {
                                if (editandoLista === lista.id) {
                                    return (
                                        <div key={lista.id}>
                                            <InlineForm
                                                placeholder="Nome da lista"
                                                initialValue={lista.name}
                                                initialColor={lista.color}
                                                onSave={(n, c) => editarLista(lista.id, n, c)}
                                                onCancel={() => setEditandoLista(null)}
                                            />
                                        </div>
                                    );
                                }
                                return (
                                    <ListCard
                                        key={lista.id}
                                        lista={lista}
                                        onEdit={() => setEditandoLista(lista.id)}
                                        onDelete={() => deletarLista(lista.id)}
                                    />
                                );
                            })}
                        </div>

                        {creatingLista === "root" && (
                            <div className={listasSemPasta.length > 0 ? "mt-3" : ""}>
                                <InlineForm
                                    placeholder="Nome da lista (ex: Leads Trabalhista, Clientes DF...)"
                                    onSave={(n, c) => criarLista(n, c)}
                                    onCancel={() => setCreatingLista(null)}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Tips */}
            {listas.length > 0 && (
                <div className="mt-8 p-4 rounded-2xl bg-bg-secondary border border-border">
                    <p className="text-xs font-semibold text-text-muted mb-2 flex items-center gap-1.5">
                        <Tag size={12} /> Dicas de organização
                    </p>
                    <ul className="text-xs text-text-muted space-y-1 list-disc list-inside">
                        <li>Um contato pode pertencer a <strong className="text-text-secondary">múltiplas listas</strong> ao mesmo tempo.</li>
                        <li>Use <strong className="text-text-secondary">pastas</strong> para agrupar listas por área jurídica ou região.</li>
                        <li>Filtre na tela de Contatos pela lista para ver e disparar campanhas segmentadas.</li>
                        <li>Exemplo: &ldquo;João Silva&rdquo; pode estar nas listas &ldquo;Clientes do DF&rdquo; e &ldquo;Trabalhista VIP&rdquo;.</li>
                    </ul>
                </div>
            )}
        </div>
    );
}
