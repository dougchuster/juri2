"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    FileText, Plus, Edit2, Trash2, MessageCircle, Mail, Search,
    X, Save, Loader2, Eye, Copy, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form-fields";

type MessageTemplate = {
    id: string;
    name: string;
    canal: "WHATSAPP" | "EMAIL" | "SMS" | null;
    category: string;
    subject?: string | null;
    content: string;
    contentHtml?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

type FormData = {
    name: string;
    canal: string;
    category: string;
    subject: string;
    content: string;
    contentHtml: string;
    isActive: boolean;
};

const EMPTY_FORM: FormData = {
    name: "", canal: "WHATSAPP", category: "GERAL",
    subject: "", content: "", contentHtml: "", isActive: true,
};

const CATEGORIES = ["GERAL", "BOAS_VINDAS", "REENGAJAMENTO", "INFORMATIVO", "ANIVERSARIO", "COBRANÇA", "ATUALIZAÇÃO_PROCESSUAL", "PROPOSTA", "NEWSLETTER"];
const VARIABLES = ["{{nome}}", "{{primeiroNome}}", "{{email}}", "{{telefone}}", "{{areaJuridica}}", "{{numeroProcesso}}", "{{escritorio}}"];

const CANAL_ICON = {
    WHATSAPP: <MessageCircle size={14} className="text-success" />,
    EMAIL: <Mail size={14} className="text-blue-400" />,
    SMS: <MessageCircle size={14} className="text-orange-400" />,
};

// Predefined legal templates
const LEGAL_TEMPLATES: Omit<MessageTemplate, "id" | "createdAt" | "updatedAt">[] = [
    {
        name: "Boas-vindas ao Lead",
        canal: "WHATSAPP",
        category: "BOAS_VINDAS",
        subject: null,
        content: "Olá {{primeiroNome}}! 👋 Seja bem-vindo(a) ao {{escritorio}}.\n\nEstamos aqui para ajudar com suas necessidades jurídicas. Em breve um de nossos advogados entrará em contato.\n\nQualquer dúvida, é só responder esta mensagem!",
        contentHtml: null,
        isActive: true,
    },
    {
        name: "Aniversário do Cliente",
        canal: "WHATSAPP",
        category: "ANIVERSARIO",
        subject: null,
        content: "🎂 Feliz aniversário, {{primeiroNome}}!\n\nA equipe do {{escritorio}} deseja a você um dia muito especial. É uma honra ter você como nosso cliente!\n\nConte conosco sempre que precisar. 🌟",
        contentHtml: null,
        isActive: true,
    },
    {
        name: "Newsletter Jurídica",
        canal: "EMAIL",
        category: "NEWSLETTER",
        subject: "📋 Informativo Jurídico — {{escritorio}}",
        content: "Prezado(a) {{nome}},\n\nConfira as novidades jurídicas deste mês que podem impactar seus direitos.\n\nAtenciosamente,\n{{escritorio}}",
        contentHtml: "<p>Prezado(a) <strong>{{nome}}</strong>,</p><p>Confira as novidades jurídicas deste mês que podem impactar seus direitos.</p><p>Atenciosamente,<br/><strong>{{escritorio}}</strong></p>",
        isActive: true,
    },
    {
        name: "Reengajamento de Leads Inativos",
        canal: "EMAIL",
        category: "REENGAJAMENTO",
        subject: "Sentimos a sua falta, {{primeiroNome}} 👋",
        content: "Olá {{primeiroNome}},\n\nPercebemos que faz algum tempo que não nos falamos. Gostaríamos de saber se ainda podemos ajudá-lo(a) com questões jurídicas.\n\nNossos especialistas em {{areaJuridica}} estão disponíveis para uma consulta gratuita.\n\nAguardamos seu retorno!\n\n{{escritorio}}",
        contentHtml: null,
        isActive: true,
    },
    {
        name: "Atualização Processual",
        canal: "WHATSAPP",
        category: "ATUALIZAÇÃO_PROCESSUAL",
        subject: null,
        content: "Olá {{primeiroNome}}! Há uma novidade no processo nº {{numeroProcesso}}.\n\nAcesse seu portal ou entre em contato conosco para mais detalhes.\n\n{{escritorio}} — sempre ao seu lado.",
        contentHtml: null,
        isActive: true,
    },
];

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCanal, setFilterCanal] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [copiedVar, setCopiedVar] = useState<string | null>(null);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const qs = new URLSearchParams();
            if (filterCanal) qs.set("canal", filterCanal);
            if (searchTerm) qs.set("search", searchTerm);
            const res = await fetch(`/api/crm/templates?${qs}`);
            if (res.ok) setTemplates(await res.json());
        } catch { /* ignore */ }
        setLoading(false);
    }, [filterCanal, searchTerm]);

    useEffect(() => { void fetchTemplates(); }, [fetchTemplates]);

    const openCreate = () => {
        setEditingId(null);
        setFormData(EMPTY_FORM);
        setFormOpen(true);
    };

    const openEdit = (tpl: MessageTemplate) => {
        setEditingId(tpl.id);
        setFormData({
            name: tpl.name,
            canal: tpl.canal ?? "WHATSAPP",
            category: tpl.category,
            subject: tpl.subject ?? "",
            content: tpl.content,
            contentHtml: tpl.contentHtml ?? "",
            isActive: tpl.isActive,
        });
        setFormOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.content) {
            alert("Nome e Conteúdo são obrigatórios.");
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ...formData,
                canal: formData.canal || null,
                subject: formData.subject || null,
                contentHtml: formData.contentHtml || null,
            };
            const url = editingId ? `/api/crm/templates/${editingId}` : "/api/crm/templates";
            const method = editingId ? "PATCH" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setFormOpen(false);
                await fetchTemplates();
            } else {
                const err = await res.json();
                alert(err.error || "Erro ao salvar template.");
            }
        } catch { alert("Erro ao salvar template."); }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir este template? Campanhas vinculadas perderão a referência.")) return;
        await fetch(`/api/crm/templates/${id}`, { method: "DELETE" });
        await fetchTemplates();
    };

    const importTemplate = async (tpl: typeof LEGAL_TEMPLATES[0]) => {
        try {
            await fetch("/api/crm/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tpl),
            });
            await fetchTemplates();
        } catch { alert("Erro ao importar template."); }
    };

    const copyVar = (v: string) => {
        void navigator.clipboard.writeText(v);
        setCopiedVar(v);
        setTimeout(() => setCopiedVar(null), 1500);
    };

    const insertVar = (v: string) => {
        setFormData(f => ({ ...f, content: f.content + v }));
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-bg-primary">
            {/* Header */}
            <div className="h-20 border-b border-border bg-bg-secondary px-8 flex items-center justify-between shadow-sm shrink-0">
                <div>
                    <h1 className="font-bold text-text-primary text-xl flex items-center gap-2">
                        <FileText className="text-accent" /> Templates de Mensagem
                    </h1>
                    <p className="text-xs text-text-muted mt-1">Gerencie modelos de Email e WhatsApp para campanhas.</p>
                </div>
                <Button variant="gradient" className="gap-2 font-bold" onClick={openCreate}>
                    <Plus size={16} /> Novo Template
                </Button>
            </div>

            {/* Filters */}
            <div className="p-6 pb-3 shrink-0">
                <div className="glass-card p-4 flex gap-3 flex-wrap items-center">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                        <Input
                            className="pl-9 bg-bg-primary border-border text-sm"
                            placeholder="Buscar templates..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="h-10 px-3 rounded-lg border border-border bg-bg-primary text-text-secondary text-sm"
                        value={filterCanal}
                        onChange={e => setFilterCanal(e.target.value)}
                    >
                        <option value="">Todos os canais</option>
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="EMAIL">Email</option>
                        <option value="SMS">SMS</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
                {/* Import legal templates */}
                {templates.length === 0 && !loading && (
                    <div className="glass-card p-6">
                        <h2 className="font-bold text-text-primary mb-3 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-accent" />
                            Templates Prontos para o Escritório Jurídico
                        </h2>
                        <p className="text-sm text-text-muted mb-4">Importe templates profissionais criados para advogados:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {LEGAL_TEMPLATES.map((tpl, i) => (
                                <div key={i} className="p-4 border border-border rounded-xl hover:border-accent/50 transition-colors">
                                    <div className="flex items-center gap-2 mb-2">
                                        {tpl.canal === "EMAIL" ? <Mail size={14} className="text-blue-400" /> : <MessageCircle size={14} className="text-success" />}
                                        <span className="text-xs font-bold text-text-muted uppercase">{tpl.category}</span>
                                    </div>
                                    <p className="font-semibold text-sm text-text-primary mb-1">{tpl.name}</p>
                                    <p className="text-xs text-text-muted line-clamp-2">{tpl.content.slice(0, 80)}...</p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="mt-3 text-xs h-7 gap-1"
                                        onClick={() => importTemplate(tpl)}
                                    >
                                        <Plus size={11} /> Importar
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Templates list */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="animate-spin text-accent" size={28} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map(tpl => (
                            <div key={tpl.id} className={`glass-card p-5 flex flex-col gap-3 group transition-all hover:border-accent/40 ${!tpl.isActive ? "opacity-60" : ""}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {tpl.canal ? CANAL_ICON[tpl.canal] : <FileText size={14} className="text-text-muted" />}
                                        <span className="font-bold text-text-primary text-sm truncate">{tpl.name}</span>
                                    </div>
                                    <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted border border-border ml-2 shrink-0">
                                        {tpl.category}
                                    </span>
                                </div>

                                {tpl.subject && (
                                    <p className="text-xs text-text-muted font-medium truncate">Assunto: {tpl.subject}</p>
                                )}

                                <p className="text-xs text-text-secondary line-clamp-3 flex-1">
                                    {tpl.content}
                                </p>

                                <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 gap-1 text-xs flex-1"
                                        onClick={() => openEdit(tpl)}
                                    >
                                        <Edit2 size={11} /> Editar
                                    </Button>
                                    <button
                                        className="w-7 h-7 flex items-center justify-center rounded-sm bg-bg-tertiary border border-border text-text-muted hover:text-accent hover:border-accent/50 transition-colors"
                                        onClick={() => setPreviewId(previewId === tpl.id ? null : tpl.id)}
                                        title="Pré-visualizar"
                                    >
                                        <Eye size={13} />
                                    </button>
                                    <button
                                        className="w-7 h-7 flex items-center justify-center rounded-sm bg-bg-tertiary border border-border text-text-muted hover:text-danger hover:border-danger/50 transition-colors"
                                        onClick={() => handleDelete(tpl.id)}
                                        title="Excluir"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>

                                {/* Preview panel */}
                                {previewId === tpl.id && (
                                    <div className="mt-2 p-3 bg-bg-elevated border border-border rounded-lg text-xs text-text-secondary whitespace-pre-wrap font-mono animate-fade-in">
                                        {tpl.content}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Form drawer */}
            {formOpen && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="flex-1 bg-black/50" onClick={() => setFormOpen(false)} />
                    <div className="w-full max-w-xl bg-bg-secondary border-l border-border flex flex-col h-full overflow-y-auto animate-slide-in-right">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h2 className="font-bold text-text-primary text-lg">
                                {editingId ? "Editar Template" : "Novo Template"}
                            </h2>
                            <button onClick={() => setFormOpen(false)} className="text-text-muted hover:text-text-primary">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 p-6 space-y-4">
                            <Input
                                label="Nome do template *"
                                value={formData.name}
                                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                                placeholder="Ex: Boas-vindas Lead Previdenciário"
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Canal</label>
                                    <select
                                        className="w-full h-10 px-3 rounded-lg border border-border bg-bg-primary text-text-secondary text-sm"
                                        value={formData.canal}
                                        onChange={e => setFormData(f => ({ ...f, canal: e.target.value }))}
                                    >
                                        <option value="WHATSAPP">WhatsApp</option>
                                        <option value="EMAIL">Email</option>
                                        <option value="SMS">SMS</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">Categoria</label>
                                    <select
                                        className="w-full h-10 px-3 rounded-lg border border-border bg-bg-primary text-text-secondary text-sm"
                                        value={formData.category}
                                        onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                                    >
                                        {CATEGORIES.map(c => (
                                            <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {formData.canal === "EMAIL" && (
                                <Input
                                    label="Assunto do Email"
                                    value={formData.subject}
                                    onChange={e => setFormData(f => ({ ...f, subject: e.target.value }))}
                                    placeholder="Ex: Sua consulta foi confirmada 📋"
                                />
                            )}

                            {/* Variables */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Variáveis disponíveis <span className="text-text-muted text-xs">(clique para inserir)</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {VARIABLES.map(v => (
                                        <button
                                            key={v}
                                            className="px-2 py-1 text-xs rounded border border-border bg-bg-tertiary text-text-secondary hover:border-accent/50 hover:text-accent transition-colors font-mono flex items-center gap-1"
                                            onClick={() => insertVar(v)}
                                        >
                                            {v}
                                            <Copy
                                                size={10}
                                                className="opacity-60"
                                                onClick={(e) => { e.stopPropagation(); copyVar(v); }}
                                            />
                                            {copiedVar === v && <CheckCircle2 size={10} className="text-success" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Textarea
                                label="Conteúdo da mensagem *"
                                value={formData.content}
                                onChange={e => setFormData(f => ({ ...f, content: e.target.value }))}
                                rows={8}
                                placeholder="Escreva o conteúdo aqui. Use {{nome}}, {{primeiroNome}}, etc."
                            />

                            {formData.canal === "EMAIL" && (
                                <Textarea
                                    label="Conteúdo HTML (opcional)"
                                    value={formData.contentHtml}
                                    onChange={e => setFormData(f => ({ ...f, contentHtml: e.target.value }))}
                                    rows={5}
                                    placeholder="<p>HTML do email (opcional)...</p>"
                                />
                            )}

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={e => setFormData(f => ({ ...f, isActive: e.target.checked }))}
                                    className="w-4 h-4 accent-accent"
                                />
                                <label htmlFor="isActive" className="text-sm text-text-secondary">Template ativo</label>
                            </div>
                        </div>

                        <div className="p-6 border-t border-border flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => setFormOpen(false)}>
                                Cancelar
                            </Button>
                            <Button variant="gradient" className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {saving ? "Salvando..." : "Salvar Template"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
