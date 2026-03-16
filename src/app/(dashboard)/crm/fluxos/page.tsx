"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Zap, Activity, MoreVertical, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

type FlowItem = {
    id: string;
    name: string;
    triggerType: string;
    triggerConfig?: Record<string, unknown> | null;
    isActive: boolean;
    executionCount: number;
};

function getTriggerLabel(flow: FlowItem) {
    const triggerType = String(flow.triggerType || "");
    const triggerConfig = flow.triggerConfig && typeof flow.triggerConfig === "object" ? flow.triggerConfig : null;
    const triggerEvent = String(triggerConfig?.triggerEvent || "").toLowerCase();

    if (triggerType === "MANUAL" || triggerType === "WEBHOOK") {
        if (triggerEvent === "pipeline_moved") return "Movimentacao de pipeline";
        if (triggerEvent === "tag_added") return "Tag adicionada";
        if (triggerEvent === "inbound_message") return "Mensagem inbound";
        if (triggerEvent === "meeting_confirmed") return "Reuniao confirmada";
        if (triggerEvent === "meeting_reschedule_requested") return "Pedido de remarcacao";
        if (triggerEvent === "meeting_cancelled") return "Reuniao cancelada";
        if (triggerEvent) return triggerEvent.replace(/_/g, " ");
    }

    return triggerType.replace(/_/g, " ");
}

export default function FluxosPage() {
    const router = useRouter();
    const [flows, setFlows] = useState<FlowItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [isCreating, setIsCreating] = useState(false);
    const [newFlowName, setNewFlowName] = useState("");
    const [newFlowTrigger, setNewFlowTrigger] = useState("CLIENTE_CADASTRADO");
    const [newFlowEvent, setNewFlowEvent] = useState("pipeline_moved");

    useEffect(() => {
        fetchFlows();
    }, []);

    const fetchFlows = async () => {
        try {
            const res = await fetch("/api/crm/fluxos");
            if (res.ok) {
                const data = (await res.json()) as FlowItem[];
                setFlows(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await fetch(`/api/crm/fluxos/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !currentStatus })
            });
            await fetchFlows();
        } catch {
            // Ignora falhas temporarias de rede nesta acao de toggle
        }
    };

    const handleCreate = async () => {
        if (!newFlowName) return;
        setIsCreating(true);
        try {
            const res = await fetch("/api/crm/fluxos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newFlowName,
                    triggerType: newFlowTrigger,
                    triggerEvent: newFlowTrigger === "MANUAL" || newFlowTrigger === "WEBHOOK" ? newFlowEvent : undefined,
                })
            });
            if (res.ok) {
                const flow = await res.json();
                router.push(`/crm/fluxos/${flow.id}`);
            }
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-text-primary flex items-center gap-2">
                        <Zap className="text-accent" /> Fluxos de Automação
                    </h1>
                    <p className="text-text-muted mt-1 max-w-2xl">
                        Crie e gerencie robôs interativos e gatilhos automatizados para a experiência do CRM.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="gradient" className="gap-2 shadow-glow" onClick={() => setIsCreating(!isCreating)}>
                        <Plus size={16} /> Nova Automação
                    </Button>
                </div>
            </div>

            {/* Quick Creation Form (inline for UX) */}
            {isCreating && (
                <div className="glass-card p-6 border border-accent/20 rounded-2xl animate-scale-in">
                    <h3 className="font-semibold text-text-primary mb-4">Configuração Inicial do Fluxo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm text-text-muted mb-1 block">Nome da Automação</label>
                            <input
                                type="text"
                                value={newFlowName}
                                onChange={(e) => setNewFlowName(e.target.value)}
                                className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2 focus:border-accent text-text-primary"
                                placeholder="Ex: Boas-vindas Lead Frio"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-text-muted mb-1 block">Gatilho (Quando iniciar?)</label>
                            <select
                                value={newFlowTrigger}
                                onChange={(e) => setNewFlowTrigger(e.target.value)}
                                className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2 focus:border-accent text-text-primary"
                            >
                                <option value="CLIENTE_CADASTRADO">Quando Cadastrar Novo Cliente</option>
                                <option value="PROCESSO_ABERTO">Quando um Processo for Aberto</option>
                                <option value="PRAZO_VENCENDO">Prazo Vencendo em Breve</option>
                                <option value="PRAZO_D5">Prazo D-5</option>
                                <option value="PRAZO_D3">Prazo D-3</option>
                                <option value="PRAZO_D1">Prazo D-1</option>
                                <option value="MENSAGEM_RECEBIDA">Quando Receber Mensagem</option>
                                <option value="FATURA_VENCIDA">Fatura Vencida</option>
                                <option value="CLIENTE_INATIVO_30D">Cliente Inativo 30 dias</option>
                                <option value="CRON">Agendamento recorrente (CRON)</option>
                                <option value="MANUAL">Evento Customizado CRM</option>
                                <option value="WEBHOOK">Evento via Webhook</option>
                            </select>
                            {(newFlowTrigger === "MANUAL" || newFlowTrigger === "WEBHOOK") && (
                                <select
                                    value={newFlowEvent}
                                    onChange={(e) => setNewFlowEvent(e.target.value)}
                                    className="mt-2 w-full bg-bg-primary border border-border rounded-xl px-4 py-2 focus:border-accent text-text-primary"
                                >
                                    <option value="pipeline_moved">Cliente mudou de fase no funil</option>
                                    <option value="tag_added">Tag adicionada</option>
                                    <option value="inbound_message">Mensagem inbound</option>
                                    <option value="meeting_confirmed">Reuniao confirmada</option>
                                    <option value="meeting_reschedule_requested">Pedido de remarcacao</option>
                                    <option value="meeting_cancelled">Reuniao cancelada</option>
                                </select>
                            )}
                        </div>
                        <div className="flex items-end">
                            <Button variant="primary" className="w-full bg-accent text-white" onClick={handleCreate}>
                                Construir Visualmente â†’
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content List */}
            {loading ? (
                <div className="flex justify-center p-12"><Activity className="animate-spin text-accent" /></div>
            ) : flows.length === 0 ? (
                <div className="glass-card p-12 text-center rounded-2xl border border-dashed border-border flex flex-col items-center">
                    <Zap className="text-text-muted w-12 h-12 mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-text-primary">Nenhuma automação registrada</h3>
                    <p className="text-text-muted max-w-sm mt-2">Dê vida ao seu CRM criando fluxos que enviam mensagens automaticamente para os seus contatos.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {flows.map((flow) => (
                        <div key={flow.id} className="glass-card p-5 rounded-2xl border border-border transition-all hover:border-accent/50 hover:shadow-glow-sm group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className={`px-2 py-1 rounded-full text-[10px] font-bold inline-block mb-2 ${flow.isActive ? 'bg-green-500/20 text-green-400' : 'bg-bg-tertiary text-text-muted'}`}>
                                        {flow.isActive ? 'ATIVO' : 'PAUSADO'}
                                    </div>
                                    <h3 className="font-semibold text-lg text-text-primary" title={flow.name}>
                                        {flow.name.length > 30 ? flow.name.slice(0, 30) + '...' : flow.name}
                                    </h3>
                                </div>
                                <div className="text-text-muted hover:text-text-primary cursor-pointer">
                                    <MoreVertical size={16} />
                                </div>
                            </div>

                            <p className="text-sm text-text-muted mb-6 flex-1 h-10">
                                <b>Gatilho:</b> {getTriggerLabel(flow)}
                            </p>

                            <div className="flex items-center justify-between border-t border-border/50 pt-4">
                                <span className="text-xs text-text-muted flex items-center gap-1">
                                    <Activity size={12} /> Execuções: <b>{flow.executionCount}</b>
                                </span>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        title={flow.isActive ? "Pausar Fluxo" : "Ativar Fluxo"}
                                        onClick={() => toggleStatus(flow.id, flow.isActive)}
                                    >
                                        {flow.isActive ? <Pause size={14} className="text-yellow-500" /> : <Play size={14} className="text-green-500" />}
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => router.push(`/crm/fluxos/${flow.id}`)}
                                        className="bg-bg-tertiary text-text-primary hover:bg-bg-primary h-8"
                                    >
                                        Editor
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

