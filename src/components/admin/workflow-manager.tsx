"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Plus, Trash2, ChevronDown, ChevronRight,
    Loader2, Power, PowerOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import {
    createWorkflowTemplate, toggleWorkflowTemplate, deleteWorkflowTemplate,
    addWorkflowEtapa, deleteWorkflowEtapa,
} from "@/actions/workflow";

interface WorkflowEtapa {
    id: string; titulo: string; descricao: string | null;
    pontos: number; ordem: number; diasPrazo: number;
}

interface WorkflowTemplate {
    id: string; nome: string; descricao: string | null; ativo: boolean;
    faseProcessual: { id: string; nome: string; cor: string | null } | null;
    etapas: WorkflowEtapa[];
}

interface FaseOption { id: string; nome: string; cor: string | null }

interface WorkflowManagerProps {
    templates: WorkflowTemplate[];
    fases: FaseOption[];
}

export function WorkflowManager({ templates, fases }: WorkflowManagerProps) {
    const router = useRouter();
    const [showCreate, setShowCreate] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [addingEtapaId, setAddingEtapaId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleCreateTemplate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const f = new FormData(e.currentTarget);
        await createWorkflowTemplate({
            nome: f.get("nome") as string,
            descricao: f.get("descricao") as string,
            faseProcessualId: f.get("faseProcessualId") as string,
        });
        setLoading(false);
        setShowCreate(false);
        router.refresh();
    }

    async function handleToggle(id: string) {
        await toggleWorkflowTemplate(id);
        router.refresh();
    }

    async function handleDeleteTemplate(id: string) {
        await deleteWorkflowTemplate(id);
        router.refresh();
    }

    async function handleAddEtapa(e: React.FormEvent<HTMLFormElement>, templateId: string) {
        e.preventDefault();
        setLoading(true);
        const f = new FormData(e.currentTarget);
        await addWorkflowEtapa(templateId, {
            titulo: f.get("titulo") as string,
            descricao: f.get("descricao") as string,
            pontos: parseInt(f.get("pontos") as string) || 1,
            diasPrazo: parseInt(f.get("diasPrazo") as string) || 3,
        });
        setLoading(false);
        setAddingEtapaId(null);
        router.refresh();
    }

    async function handleDeleteEtapa(id: string) {
        await deleteWorkflowEtapa(id);
        router.refresh();
    }

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={16} /> Novo Workflow</Button>
            </div>

            <div className="space-y-3">
                {templates.length === 0 ? (
                    <div className="rounded-xl border border-border p-12 text-center text-sm text-text-muted bg-bg-secondary">
                        Nenhum workflow criado ainda.
                    </div>
                ) : templates.map((wf) => {
                    const isExpanded = expandedId === wf.id;
                    return (
                        <div key={wf.id} className="glass-card overflow-hidden">
                            {/* Template Header */}
                            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg-tertiary transition-colors"
                                onClick={() => setExpandedId(isExpanded ? null : wf.id)}>
                                {isExpanded ? <ChevronDown size={16} className="text-text-muted" /> : <ChevronRight size={16} className="text-text-muted" />}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-text-primary">{wf.nome}</span>
                                        <Badge variant={wf.ativo ? "success" : "muted"}>{wf.ativo ? "Ativo" : "Inativo"}</Badge>
                                        {wf.faseProcessual && (
                                            <Badge variant="info">{wf.faseProcessual.nome}</Badge>
                                        )}
                                        <span className="text-xs text-text-muted">{wf.etapas.length} etapa{wf.etapas.length !== 1 ? "s" : ""}</span>
                                    </div>
                                    {wf.descricao && <p className="text-xs text-text-muted mt-0.5">{wf.descricao}</p>}
                                </div>
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => handleToggle(wf.id)} title={wf.ativo ? "Desativar" : "Ativar"}
                                        className={`rounded-lg p-1.5 transition-colors ${wf.ativo ? "text-success hover:bg-success/10" : "text-text-muted hover:bg-bg-tertiary"}`}>
                                        {wf.ativo ? <Power size={16} /> : <PowerOff size={16} />}
                                    </button>
                                    <button onClick={() => handleDeleteTemplate(wf.id)}
                                        className="rounded-lg p-1.5 text-text-muted hover:text-danger transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Etapas */}
                            {isExpanded && (
                                <div className="border-t border-border">
                                    {wf.etapas.length === 0 ? (
                                        <div className="px-4 py-6 text-center text-xs text-text-muted">Nenhuma etapa adicionada.</div>
                                    ) : (
                                        <div className="divide-y divide-border">
                                            {wf.etapas.map((etapa, idx) => (
                                                <div key={etapa.id} className="flex items-center gap-4 px-4 py-2.5 hover:bg-bg-tertiary transition-colors group">
                                                    <span className="flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold text-accent bg-accent/10">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-sm text-text-primary">{etapa.titulo}</span>
                                                        {etapa.descricao && <p className="text-xs text-text-muted truncate">{etapa.descricao}</p>}
                                                    </div>
                                                    <span className="text-xs text-text-muted">{etapa.pontos} pts</span>
                                                    <span className="text-xs text-text-muted">{etapa.diasPrazo}d</span>
                                                    <button onClick={() => handleDeleteEtapa(etapa.id)}
                                                        className="rounded p-1 text-text-muted opacity-0 group-hover:opacity-100 hover:text-danger transition-all">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="px-4 py-2 border-t border-border bg-bg-tertiary/50">
                                        <button onClick={() => setAddingEtapaId(wf.id)}
                                            className="flex items-center gap-2 text-xs font-medium text-accent hover:text-accent/80 transition-colors">
                                            <Plus size={14} />Adicionar Etapa
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Create Template Modal */}
            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Novo Workflow" size="md">
                <form onSubmit={handleCreateTemplate} className="space-y-4">
                    <Input id="wf-nome" name="nome" label="Nome *" required placeholder="Ex: Reclamação Trabalhista" />
                    <Textarea id="wf-descricao" name="descricao" label="Descrição" rows={2} />
                    <Select id="wf-faseProcessualId" name="faseProcessualId" label="Fase Processual (opcional)" placeholder="Nenhuma"
                        options={fases.map(f => ({ value: f.id, label: f.nome }))} />
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 size={16} className="animate-spin" /> : "Criar Workflow"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Add Etapa Modal */}
            <Modal isOpen={!!addingEtapaId} onClose={() => setAddingEtapaId(null)} title="Nova Etapa" size="md">
                <form onSubmit={(e) => addingEtapaId && handleAddEtapa(e, addingEtapaId)} className="space-y-4">
                    <Input id="et-titulo" name="titulo" label="Título *" required placeholder="Ex: Juntar petição inicial" />
                    <Textarea id="et-descricao" name="descricao" label="Descrição" rows={2} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input id="et-pontos" name="pontos" label="Pontos (Taskscore)" type="number" min={1} max={100} defaultValue="1" />
                        <Input id="et-diasPrazo" name="diasPrazo" label="Prazo (dias)" type="number" min={1} max={365} defaultValue="3" />
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setAddingEtapaId(null)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 size={16} className="animate-spin" /> : "Adicionar Etapa"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
