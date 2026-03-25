"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, RefreshCw, Facebook, Instagram, CheckCircle2, AlertCircle, Eye, EyeOff, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-fields";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

type MetaConnection = {
    id: string;
    displayName: string;
    pageId: string;
    pageName: string | null;
    instagramAccountId: string | null;
    instagramUsername: string | null;
    verifyToken: string;
    isActive: boolean;
    lastWebhookAt: string | null;
    createdAt: string;
    _count: { conversations: number };
};

const WEBHOOK_URL_BASE =
    typeof window !== "undefined"
        ? `${window.location.origin}/api/webhooks/meta/social`
        : "/api/webhooks/meta/social";

export function MetaSocialSettings() {
    const [connections, setConnections] = useState<MetaConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showToken, setShowToken] = useState<Record<string, boolean>>({});
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const [form, setForm] = useState({
        displayName: "",
        pageId: "",
        pageName: "",
        pageAccessToken: "",
        instagramAccountId: "",
        instagramUsername: "",
        verifyToken: "",
    });
    const [formError, setFormError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/meta/connections");
            if (res.ok) setConnections(await res.json() as MetaConnection[]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const handleSave = async () => {
        setFormError(null);
        if (!form.displayName || !form.pageId || !form.pageAccessToken || !form.verifyToken) {
            setFormError("Preencha: Nome, Page ID, Token de Acesso e Verify Token.");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/meta/connections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                setShowForm(false);
                setForm({ displayName: "", pageId: "", pageName: "", pageAccessToken: "", instagramAccountId: "", instagramUsername: "", verifyToken: "" });
                void load();
            } else {
                const data = await res.json() as { error?: string };
                setFormError(data.error ?? "Erro ao salvar.");
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remover esta conexão? As conversas existentes serão preservadas.")) return;
        setDeletingId(id);
        try {
            await fetch(`/api/meta/connections/${id}`, { method: "DELETE" });
            void load();
        } finally {
            setDeletingId(null);
        }
    };

    const handleToggle = async (id: string, isActive: boolean) => {
        await fetch(`/api/meta/connections/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !isActive }),
        });
        void load();
    };

    const copyToClipboard = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                        <span className="text-[#1877F2]"><Facebook size={18} /></span>
                        <span className="text-[#E1306C]"><Instagram size={18} /></span>
                        Canais Sociais
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">
                        Receba mensagens do Facebook Messenger e Instagram DMs diretamente na caixa de entrada.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-border text-sm gap-1" onClick={load}>
                        <RefreshCw size={13} />
                    </Button>
                    <Button
                        className="gap-1.5 bg-accent text-[#090705] hover:bg-highlight border-none text-sm font-semibold"
                        onClick={() => setShowForm(true)}
                    >
                        <Plus size={14} strokeWidth={3} /> Nova conexão
                    </Button>
                </div>
            </div>

            {/* Webhook URL info */}
            <div className="glass-card rounded-xl border border-border p-4 text-sm">
                <p className="font-semibold text-text-primary mb-1">URL do Webhook (Meta Developer)</p>
                <p className="text-xs text-text-muted mb-2">
                    Configure esta URL no painel Meta for Developers em <strong>Webhooks → Adicionar</strong>. Use também o{" "}
                    <strong>Verify Token</strong> de cada conexão abaixo.
                </p>
                <div className="flex items-center gap-2">
                    <code className="flex-1 bg-bg-tertiary border border-border rounded-md px-3 py-1.5 text-xs text-accent font-mono truncate">
                        {WEBHOOK_URL_BASE}
                    </code>
                    <button
                        onClick={() => void copyToClipboard(WEBHOOK_URL_BASE, "webhook-url")}
                        className="p-1.5 hover:text-accent transition-colors text-text-muted"
                        title="Copiar"
                    >
                        {copiedId === "webhook-url" ? <CheckCircle2 size={15} className="text-success" /> : <Copy size={15} />}
                    </button>
                </div>
            </div>

            {/* Connections list */}
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
                </div>
            ) : connections.length === 0 ? (
                <div className="glass-card rounded-xl border border-border p-8 text-center">
                    <div className="flex justify-center gap-2 mb-3 text-text-muted">
                        <Facebook size={28} />
                        <Instagram size={28} />
                    </div>
                    <p className="text-sm font-semibold text-text-primary">Nenhuma conexão configurada</p>
                    <p className="text-xs text-text-muted mt-1">Adicione sua Página do Facebook ou conta do Instagram para receber mensagens aqui.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {connections.map(conn => (
                        <div key={conn.id} className="glass-card rounded-xl border border-border p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex gap-1.5 mt-0.5">
                                    <span className="text-[#1877F2]"><Facebook size={16} /></span>
                                    {conn.instagramAccountId && <span className="text-[#E1306C]"><Instagram size={16} /></span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm text-text-primary">{conn.displayName}</span>
                                        {conn.pageName && <span className="text-xs text-text-muted">({conn.pageName})</span>}
                                        <Badge variant={conn.isActive ? "success" : "muted"} size="sm">
                                            {conn.isActive ? "Ativo" : "Inativo"}
                                        </Badge>
                                        <Badge variant="muted" size="sm">{conn._count.conversations} conv.</Badge>
                                    </div>
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-muted">
                                        <span><strong>Page ID:</strong> {conn.pageId}</span>
                                        {conn.instagramUsername && <span><strong>Instagram:</strong> @{conn.instagramUsername}</span>}
                                        {conn.lastWebhookAt
                                            ? <span><strong>Último webhook:</strong> {new Date(conn.lastWebhookAt).toLocaleString("pt-BR")}</span>
                                            : <span className="text-warning flex items-center gap-1"><AlertCircle size={11} /> Nenhum webhook recebido ainda</span>
                                        }
                                        <div className="flex items-center gap-1.5">
                                            <strong>Verify Token:</strong>
                                            <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-[10px]">
                                                {showToken[conn.id] ? conn.verifyToken : "••••••••••••"}
                                            </code>
                                            <button onClick={() => setShowToken(p => ({ ...p, [conn.id]: !p[conn.id] }))} className="text-text-muted hover:text-accent transition-colors">
                                                {showToken[conn.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                                            </button>
                                            <button onClick={() => void copyToClipboard(conn.verifyToken, `vt-${conn.id}`)} className="text-text-muted hover:text-accent transition-colors">
                                                {copiedId === `vt-${conn.id}` ? <CheckCircle2 size={11} className="text-success" /> : <Copy size={11} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => void handleToggle(conn.id, conn.isActive)}
                                        className={`text-xs px-2 py-1 rounded-md border transition-colors ${conn.isActive ? "border-warning/40 text-warning hover:bg-warning/10" : "border-success/40 text-success hover:bg-success/10"}`}
                                    >
                                        {conn.isActive ? "Desativar" : "Ativar"}
                                    </button>
                                    <button
                                        onClick={() => void handleDelete(conn.id)}
                                        disabled={deletingId === conn.id}
                                        className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                                    >
                                        {deletingId === conn.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Connection Modal */}
            {showForm && (
                <Modal isOpen onClose={() => setShowForm(false)} title="Nova Conexão Meta Social" size="md">
                    <div className="space-y-4 py-1">
                        <div className="glass-card rounded-xl border border-[#1877F2]/30 bg-[#1877F2]/5 p-3 text-xs text-text-muted space-y-1">
                            <p className="font-semibold text-text-primary text-sm">Como obter as credenciais:</p>
                            <p>1. Acesse <strong>developers.facebook.com</strong> → criando ou acessando um App</p>
                            <p>2. Em <strong>Configurações → Básico</strong> anote o <strong>Page ID</strong> da sua Página</p>
                            <p>3. Em <strong>WhatsApp / Messenger → Configuração</strong> gere um <strong>Token de Acesso de Página</strong> de longo prazo</p>
                            <p>4. Defina um <strong>Verify Token</strong> de sua escolha (mínimo 6 caracteres)</p>
                            <p>5. Salve aqui e configure o webhook acima no painel Meta</p>
                        </div>

                        {formError && (
                            <div className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-xs text-danger">{formError}</div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Nome de exibição *</label>
                                <Input value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} placeholder="Ex: Página do Escritório" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Facebook Page ID *</label>
                                <Input value={form.pageId} onChange={e => setForm(p => ({ ...p, pageId: e.target.value }))} placeholder="123456789012345" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Nome da Página</label>
                                <Input value={form.pageName} onChange={e => setForm(p => ({ ...p, pageName: e.target.value }))} placeholder="Escritório Exemplo" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Token de Acesso da Página *</label>
                                <Input value={form.pageAccessToken} onChange={e => setForm(p => ({ ...p, pageAccessToken: e.target.value }))} placeholder="EAAGm..." type="password" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Verify Token *</label>
                                <Input value={form.verifyToken} onChange={e => setForm(p => ({ ...p, verifyToken: e.target.value }))} placeholder="MinhaChaveSecreta123" />
                                <p className="text-[10px] text-text-muted mt-1">Deve coincidir exatamente com o que você digitar no Meta Developer Console.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Instagram Account ID</label>
                                <Input value={form.instagramAccountId} onChange={e => setForm(p => ({ ...p, instagramAccountId: e.target.value }))} placeholder="Opcional" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Instagram Username</label>
                                <Input value={form.instagramUsername} onChange={e => setForm(p => ({ ...p, instagramUsername: e.target.value }))} placeholder="@seuescritorio" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" className="border-border" onClick={() => setShowForm(false)}>Cancelar</Button>
                            <Button
                                className="bg-accent text-[#090705] hover:bg-highlight border-none font-semibold"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? "Salvando..." : "Salvar conexão"}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
