"use client";

import React, { useState, useCallback } from "react";
import {
    Filter, Users, Plus, Edit2, Play, Trash2, Clock, CheckCircle2,
    Sparkles, ChevronRight, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentBuilderModal, Rule } from "@/components/crm/segment-builder-modal";

type SegmentItem = {
    id: string;
    name: string;
    description?: string | null;
    isDynamic: boolean;
    memberCount?: number | null;
    lastCalculatedAt?: string | null;
    rules?: Rule[];
};

// ─── Templates prontos de segmentos ───────────────────────────────────────────

interface SegmentTemplate {
    name: string;
    description: string;
    icon: string;
    rules: Rule[];
    color: string;
}

const SEGMENT_TEMPLATES: SegmentTemplate[] = [
    {
        name: "Clientes Ativos",
        description: "Clientes com relacionamento ativo, excluindo inadimplentes.",
        icon: "✅",
        color: "text-success border-success/30 bg-success/5",
        rules: [
            { id: "t1r1", field: "crmRelationship", operator: "EQUALS", value: "CLIENT" },
            { id: "t1r2", field: "inadimplente", operator: "EQUALS", value: "false" },
        ],
    },
    {
        name: "Leads sem resposta 30+ dias",
        description: "Leads sem contato nos últimos 30 dias — ideal para reengajamento.",
        icon: "⏳",
        color: "text-warning border-warning/30 bg-warning/5",
        rules: [
            { id: "t2r1", field: "crmRelationship", operator: "EQUALS", value: "LEAD" },
            { id: "t2r2", field: "lastInteraction", operator: "GREATER_THAN", value: "30" },
        ],
    },
    {
        name: "Aniversariantes do Mês",
        description: "Contatos que fazem aniversário neste mês.",
        icon: "🎂",
        color: "text-purple-400 border-purple-500/30 bg-purple-500/5",
        rules: [
            { id: "t3r1", field: "dataNascimentoMes", operator: "EQUALS", value: String(new Date().getMonth() + 1) },
        ],
    },
    {
        name: "Clientes Previdenciários",
        description: "Clientes ativos na área previdenciária.",
        icon: "🏛️",
        color: "text-blue-400 border-blue-500/30 bg-blue-500/5",
        rules: [
            { id: "t4r1", field: "crmRelationship", operator: "EQUALS", value: "CLIENT" },
            { id: "t4r2", field: "areaJuridica", operator: "EQUALS", value: "Previdenciário" },
        ],
    },
    {
        name: "Clientes Trabalhistas",
        description: "Clientes ativos na área trabalhista.",
        icon: "⚖️",
        color: "text-amber-400 border-amber-500/30 bg-amber-500/5",
        rules: [
            { id: "t5r1", field: "crmRelationship", operator: "EQUALS", value: "CLIENT" },
            { id: "t5r2", field: "areaJuridica", operator: "EQUALS", value: "Trabalhista" },
        ],
    },
    {
        name: "Leads com Score Alto",
        description: "Leads com score ≥ 70 — potencial de conversão elevado.",
        icon: "🔥",
        color: "text-orange-400 border-orange-500/30 bg-orange-500/5",
        rules: [
            { id: "t6r1", field: "crmRelationship", operator: "EQUALS", value: "LEAD" },
            { id: "t6r2", field: "crmScore", operator: "GTE", value: "70" },
        ],
    },
    {
        name: "Sem Email Cadastrado",
        description: "Contatos sem email — prioridade para coleta de dados.",
        icon: "📧",
        color: "text-red-400 border-red-500/30 bg-red-500/5",
        rules: [
            { id: "t7r1", field: "hasEmail", operator: "EQUALS", value: "false" },
        ],
    },
    {
        name: "Canal WhatsApp",
        description: "Contatos com WhatsApp válido e canal preferido.",
        icon: "💬",
        color: "text-green-400 border-green-500/30 bg-green-500/5",
        rules: [
            { id: "t8r1", field: "hasWhatsapp", operator: "EQUALS", value: "true" },
            { id: "t8r2", field: "canalPreferido", operator: "EQUALS", value: "WHATSAPP" },
        ],
    },
    {
        name: "Inadimplentes com Oportunidade",
        description: "Clientes inadimplentes que ainda possuem oportunidades abertas.",
        icon: "🚨",
        color: "text-rose-400 border-rose-500/30 bg-rose-500/5",
        rules: [
            { id: "t9r1", field: "inadimplente", operator: "EQUALS", value: "true" },
        ],
    },
    {
        name: "Novos Leads (7 dias)",
        description: "Leads cadastrados nos últimos 7 dias.",
        icon: "🆕",
        color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5",
        rules: [
            { id: "t10r1", field: "crmRelationship", operator: "EQUALS", value: "LEAD" },
            { id: "t10r2", field: "createdAfter", operator: "EQUALS", value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) },
        ],
    },
];

export default function SegmentosPage() {
    const [segments, setSegments] = useState<SegmentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [editingSegment, setEditingSegment] = useState<SegmentItem | null>(null);
    const [recalcLoading, setRecalcLoading] = useState<string | null>(null);
    const [showTemplates, setShowTemplates] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<SegmentTemplate | null>(null);

    const fetchSegments = useCallback(async () => {
        const res = await fetch("/api/crm/segmentos", { cache: "no-store" });
        if (res.ok) {
            const data = await res.json();
            setSegments(data);
        }
        setLoading(false);
    }, []);

    React.useEffect(() => { void fetchSegments(); }, [fetchSegments]);

    const handleSaveSegment = async (name: string, rules: Rule[]) => {
        try {
            const payload = {
                name,
                rules,
                isDynamic: true,
                description: editingSegment?.description || "Segmento criado via CRM",
            };

            if (editingSegment?.id) {
                await fetch(`/api/crm/segmentos/${editingSegment.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            } else {
                await fetch("/api/crm/segmentos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            }

            setEditingSegment(null);
            setSelectedTemplate(null);
            setIsBuilderOpen(false);
            await fetchSegments();
        } catch (error) {
            console.error("Erro ao salvar segmento", error);
            alert("Falha ao salvar segmento");
        }
    };

    const handleRecalc = async (segmentId: string) => {
        setRecalcLoading(segmentId);
        try {
            await fetch(`/api/crm/segmentos/${segmentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "recalculate" }),
            });
            await fetchSegments();
        } catch (error) {
            console.error(error);
            alert("Falha ao recalcular segmento.");
        }
        setRecalcLoading(null);
    };

    const handleDelete = async (segmentId: string) => {
        if (!confirm("Excluir este segmento? Ele será removido de todas as campanhas associadas.")) return;
        try {
            await fetch(`/api/crm/segmentos/${segmentId}`, { method: "DELETE" });
            await fetchSegments();
        } catch (error) {
            console.error(error);
            alert("Falha ao excluir segmento.");
        }
    };

    const openFromTemplate = (tpl: SegmentTemplate) => {
        setSelectedTemplate(tpl);
        setEditingSegment(null);
        setShowTemplates(false);
        setIsBuilderOpen(true);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-bg-primary">
            {/* Header */}
            <div className="h-20 border-b border-border bg-bg-secondary px-8 flex items-center justify-between shadow-sm shrink-0">
                <div>
                    <h1 className="font-bold text-text-primary text-xl flex items-center gap-2">
                        <Filter className="text-accent" /> Segmentação Dinâmica
                    </h1>
                    <p className="text-xs text-text-muted mt-1">Crie públicos-alvo com regras comerciais e jurídicas.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="gap-2 border-border"
                        onClick={() => setShowTemplates(!showTemplates)}
                    >
                        <Sparkles size={16} className="text-accent" /> Templates
                    </Button>
                    <Button
                        variant="gradient"
                        className="gap-2 font-bold shadow-glow"
                        onClick={() => { setEditingSegment(null); setSelectedTemplate(null); setIsBuilderOpen(true); }}
                    >
                        <Plus size={16} /> Novo Segmento
                    </Button>
                </div>
            </div>

            {/* Templates panel */}
            {showTemplates && (
                <div className="mx-6 mt-4 animate-fade-in">
                    <div className="glass-card p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles size={16} className="text-accent" />
                            <h2 className="font-bold text-text-primary">Templates de Segmentos</h2>
                            <span className="text-xs text-text-muted ml-1">Clique para criar a partir de um template</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {SEGMENT_TEMPLATES.map((tpl) => (
                                <button
                                    key={tpl.name}
                                    className={`text-left p-3 rounded-xl border transition-all hover:shadow-md hover:scale-[1.02] ${tpl.color}`}
                                    onClick={() => openFromTemplate(tpl)}
                                >
                                    <div className="text-2xl mb-2">{tpl.icon}</div>
                                    <div className="font-semibold text-sm leading-tight">{tpl.name}</div>
                                    <div className="text-xs text-text-muted mt-1 line-clamp-2">{tpl.description}</div>
                                    <div className="flex items-center gap-1 mt-2 text-xs font-medium opacity-70">
                                        Usar <ChevronRight size={12} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Segments grid */}
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full flex justify-center py-12">
                            <Loader2 className="animate-spin text-accent" size={28} />
                        </div>
                    ) : (
                        segments.map((segment) => (
                            <div key={segment.id} className="glass-card p-6 flex flex-col group relative overflow-hidden transition-all hover:border-accent/50 hover:shadow-glow-sm">
                                <div className="absolute -top-12 -right-12 w-32 h-32 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors pointer-events-none" />

                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div>
                                        <h3 className="text-lg font-bold text-text-primary mb-1">{segment.name}</h3>
                                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm border ${segment.isDynamic ? "bg-purple-500/10 text-purple-400 border-purple-500/30" : "bg-bg-tertiary text-text-muted border-border"}`}>
                                            {segment.isDynamic ? "Dinâmico" : "Estático"}
                                        </span>
                                    </div>
                                    <div className="p-2 bg-bg-tertiary rounded-md border border-border group-hover:border-accent/40 shadow-sm transition-colors text-text-secondary">
                                        <Users size={18} />
                                    </div>
                                </div>

                                <p className="text-sm text-text-muted mb-6 flex-1 relative z-10 line-clamp-2">
                                    {segment.description || "Sem descrição"}
                                </p>

                                <div className="flex items-center justify-between border-t border-border pt-4 mt-auto relative z-10">
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-bold text-text-primary">{segment.memberCount ?? 0}</span>
                                        <span className="text-[10px] text-text-muted uppercase tracking-widest font-semibold flex items-center gap-1">
                                            MEMBROS
                                            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block ml-1" />
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            className="w-8 h-8 flex items-center justify-center rounded-sm bg-bg-tertiary border border-border text-text-muted hover:text-accent hover:border-accent/50 transition-colors"
                                            title="Recalcular"
                                            onClick={() => handleRecalc(segment.id)}
                                        >
                                            {recalcLoading === segment.id
                                                ? <Loader2 size={14} className="animate-spin" />
                                                : <Play size={14} />
                                            }
                                        </button>
                                        <button
                                            className="w-8 h-8 flex items-center justify-center rounded-sm bg-bg-tertiary border border-border text-text-muted hover:text-blue-400 hover:border-blue-500/50 transition-colors"
                                            title="Editar"
                                            onClick={() => { setEditingSegment(segment); setSelectedTemplate(null); setIsBuilderOpen(true); }}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            className="w-8 h-8 flex items-center justify-center rounded-sm bg-bg-tertiary border border-border text-text-muted hover:text-danger hover:border-danger/50 transition-colors"
                                            title="Excluir"
                                            onClick={() => handleDelete(segment.id)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between text-[10px] text-text-muted font-mono relative z-10">
                                    <span className="flex items-center gap-1">
                                        <Clock size={10} />
                                        {segment.lastCalculatedAt
                                            ? new Date(segment.lastCalculatedAt).toLocaleString("pt-BR")
                                            : "Nunca calculado"}
                                    </span>
                                    <span className="flex items-center gap-1 text-success"><CheckCircle2 size={10} /> Ativo</span>
                                </div>
                            </div>
                        ))
                    )}

                    {/* New segment card */}
                    <div
                        className="glass-card p-6 flex flex-col items-center justify-center border-dashed border-2 hover:border-accent hover:bg-bg-tertiary/50 transition-all cursor-pointer group min-h-[250px]"
                        onClick={() => { setEditingSegment(null); setSelectedTemplate(null); setIsBuilderOpen(true); }}
                    >
                        <div className="w-12 h-12 rounded-full bg-bg-tertiary border border-border flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-accent/10 group-hover:border-accent/30 group-hover:text-accent transition-all duration-300">
                            <Plus size={24} className="text-text-muted group-hover:text-accent" />
                        </div>
                        <h3 className="text-lg font-bold text-text-primary">Novo Público-Alvo</h3>
                        <p className="text-sm text-text-muted text-center mt-2 max-w-[200px]">Crie grupos por tags, status, origem e comportamento.</p>
                    </div>
                </div>
            </div>

            {isBuilderOpen && (
                <SegmentBuilderModal
                    onClose={() => { setEditingSegment(null); setSelectedTemplate(null); setIsBuilderOpen(false); }}
                    onSave={handleSaveSegment}
                    initialName={selectedTemplate?.name || editingSegment?.name}
                    initialRules={
                        selectedTemplate?.rules ||
                        (Array.isArray(editingSegment?.rules) ? editingSegment.rules : undefined)
                    }
                />
            )}
        </div>
    );
}
