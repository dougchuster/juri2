import React from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/form-fields";
import { X, Save, MessageCircle, Clock, Tag, Settings2, CheckSquare } from "lucide-react";

type NodePanelData = {
    label?: string;
    type?: string;
    channel?: string;
    messageBody?: string;
    delayAmount?: number;
    delayUnit?: string;
    tagName?: string;
    tagAction?: "add" | "remove";
    taskTitle?: string;
    taskDescription?: string;
    priority?: "urgent" | "high" | "normal" | "low";
    dueInDays?: number;
    triggerEvent?: string;
    [key: string]: unknown;
};

type EditableNode = {
    id: string;
    type?: string;
    data?: NodePanelData;
};

interface NodePropertiesPanelProps {
    node: EditableNode;
    onClose: () => void;
    onUpdateNode: (nodeId: string, newData: Partial<NodePanelData>) => void;
}

export function NodePropertiesPanel({ node, onClose, onUpdateNode }: NodePropertiesPanelProps) {
    const nodeType = node.type === "default" ? node.data?.type : node.type;
    const normalizedNodeType = String(nodeType || "").toUpperCase();
    const triggerNodeTypes = new Set([
        "TRIGGER",
        "TRIGGERNODE",
        "CLIENTE_CADASTRADO",
        "PROCESSO_ABERTO",
        "PRAZO_VENCENDO",
        "PRAZO_D5",
        "PRAZO_D3",
        "PRAZO_D1",
        "PRAZO_D0",
        "FATURA_VENCENDO",
        "FATURA_VENCIDA",
        "CLIENTE_INATIVO_30D",
        "MENSAGEM_RECEBIDA",
        "TAG_ADICIONADA",
        "WEBHOOK",
        "CRON",
        "MANUAL",
    ]);
    const isTriggerNodeType = triggerNodeTypes.has(normalizedNodeType);

    const [formData, setFormData] = React.useState<NodePanelData>(node.data || {});

    React.useEffect(() => {
        setFormData(node.data || {});
    }, [node.id, node.data]);

    const handleSave = () => {
        onUpdateNode(
            node.id,
            isTriggerNodeType
                ? {
                    ...formData,
                    type: "TRIGGER",
                }
                : formData
        );
        onClose();
    };

    const renderFields = () => {
        if (isTriggerNodeType) {
            return (
                <>
                    <Select
                        label="Evento de Entrada (Gatilho)"
                        value={formData.triggerEvent || "pipeline_moved"}
                        onChange={(e) => setFormData({ ...formData, triggerEvent: e.target.value })}
                        options={[
                            { value: "pipeline_moved", label: "Cliente mudou de fase no funil" },
                            { value: "tag_added", label: "Tag especifica adicionada" },
                            { value: "inbound_message", label: "Recebeu mensagem inbound" },
                            { value: "meeting_confirmed", label: "Cliente confirmou reuniao" },
                            { value: "meeting_reschedule_requested", label: "Cliente pediu remarcacao" },
                            { value: "meeting_cancelled", label: "Cliente cancelou reuniao" },
                            { value: "scheduled", label: "Agendamento de data especifica" },
                        ]}
                    />
                    <div className="bg-info/10 text-info p-3 rounded-md text-xs border border-info/20 mt-2">
                        Atencao: modificar o gatilho principal afeta como a automacao captura novos contatos.
                    </div>
                </>
            );
        }

        switch (nodeType) {
            case "messageNode":
                return (
                    <>
                        <Select
                            label="Canal de Disparo"
                            value={formData.channel || "whatsapp"}
                            onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                            options={[
                                { value: "whatsapp", label: "WhatsApp (API Oficial)" },
                                { value: "email", label: "E-mail Transacional" },
                                { value: "sms", label: "SMS" },
                            ]}
                        />
                        <Textarea
                            label="Conteudo da Mensagem"
                            placeholder="Ola {nome_cliente}, seu processo mudou de fase para {fase_atual}..."
                            rows={6}
                            value={formData.messageBody || ""}
                            onChange={(e) => setFormData({ ...formData, messageBody: e.target.value })}
                        />
                        <p className="text-xs text-text-muted mt-[-8px]">
                            Variaveis permitidas: <code className="text-accent">{"{nome_cliente}"}</code>,{" "}
                            <code className="text-accent">{"{fase}"}</code>
                        </p>
                    </>
                );
            case "waitNode":
                return (
                    <>
                        <Input
                            label="Quantidade de Tempo"
                            type="number"
                            min="1"
                            value={formData.delayAmount || 1}
                            onChange={(e) => setFormData({ ...formData, delayAmount: Number(e.target.value || 1) })}
                        />
                        <Select
                            label="Unidade de Tempo"
                            value={formData.delayUnit || "days"}
                            onChange={(e) => setFormData({ ...formData, delayUnit: e.target.value })}
                            options={[
                                { value: "minutes", label: "Minutos" },
                                { value: "hours", label: "Horas" },
                                { value: "days", label: "Dias" },
                                { value: "weeks", label: "Semanas" },
                            ]}
                        />
                    </>
                );
            case "tagNode":
                return (
                    <>
                        <Input
                            label="Nome da Tag a aplicar"
                            placeholder="Ex: Cliente VIP, Processo Parado..."
                            value={formData.tagName || ""}
                            onChange={(e) => setFormData({ ...formData, tagName: e.target.value })}
                        />
                        <Select
                            label="Acao no CRM"
                            value={formData.tagAction || "add"}
                            onChange={(e) => setFormData({ ...formData, tagAction: e.target.value as "add" | "remove" })}
                            options={[
                                { value: "add", label: "Adicionar Tag" },
                                { value: "remove", label: "Remover Tag" },
                            ]}
                        />
                    </>
                );
            case "createTaskNode":
            case "CREATE_TASK":
                return (
                    <>
                        <Input
                            label="Titulo da Tarefa"
                            placeholder="Ex: Ligar para cliente em ate 2h"
                            value={formData.taskTitle || ""}
                            onChange={(e) => setFormData({ ...formData, taskTitle: e.target.value })}
                        />
                        <Textarea
                            label="Descricao"
                            rows={4}
                            placeholder="Detalhes da tarefa que sera criada no modulo de tarefas."
                            value={formData.taskDescription || ""}
                            onChange={(e) => setFormData({ ...formData, taskDescription: e.target.value })}
                        />
                        <Select
                            label="Prioridade"
                            value={formData.priority || "normal"}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    priority: e.target.value as "urgent" | "high" | "normal" | "low",
                                })
                            }
                            options={[
                                { value: "urgent", label: "Urgente" },
                                { value: "high", label: "Alta" },
                                { value: "normal", label: "Normal" },
                                { value: "low", label: "Baixa" },
                            ]}
                        />
                        <Input
                            label="Prazo (dias)"
                            type="number"
                            min="0"
                            value={formData.dueInDays || 1}
                            onChange={(e) => setFormData({ ...formData, dueInDays: Number(e.target.value || 0) })}
                        />
                    </>
                );
            default:
                return (
                    <div className="bg-bg-tertiary p-4 rounded-md text-text-muted text-sm text-center">
                        Este no nao possui propriedades configuraveis avancadas.
                    </div>
                );
        }
    };

    const getIcon = () => {
        if (nodeType === "messageNode") return <MessageCircle size={18} className="text-blue-400" />;
        if (nodeType === "waitNode") return <Clock size={18} className="text-slate-400" />;
        if (nodeType === "tagNode") return <Tag size={18} className="text-green-400" />;
        if (nodeType === "createTaskNode" || nodeType === "CREATE_TASK") {
            return <CheckSquare size={18} className="text-orange-400" />;
        }
        return <Settings2 size={18} className="text-accent" />;
    };

    return (
        <div className="absolute top-0 right-0 w-80 h-full bg-bg-secondary border-l border-border shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
            <div className="h-16 flex items-center justify-between px-4 border-b border-border bg-bg-tertiary/50">
                <div className="flex items-center gap-2">
                    {getIcon()}
                    <h3 className="font-semibold text-text-primary">Configurar No</h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-bg-elevated rounded-md text-text-muted hover:text-text-primary transition-colors"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 pb-24 space-y-5">
                <Input
                    label="Rotulo Visivel (Nome)"
                    value={formData.label || ""}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                />
                <hr className="border-border/50" />

                <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-[-8px]">
                    Parametros Especificos
                </h4>
                {renderFields()}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-bg-secondary border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
                <Button className="w-full gap-2 btn-gradient font-bold" onClick={handleSave}>
                    <Save size={16} /> Salvar Alteracoes
                </Button>
            </div>
        </div>
    );
}
