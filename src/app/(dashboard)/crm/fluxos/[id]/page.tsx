"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    type Node,
    type ReactFlowInstance,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    ReactFlowProvider,
    MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Play, MessageCircle, Clock, Tag, CheckSquare, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { NodePropertiesPanel } from "@/components/crm/node-properties-panel";

// Types Customizados p/ estetica
const nodeColors = {
    triggerNode: "#fbbf24", // accent color
    messageNode: "#38bdf8", // blue
    waitNode: "#94a3b8",    // slate
    tagNode: "#4ade80",     // green
    createTaskNode: "#f97316", // orange
};

type FlowVisualNodeType = keyof typeof nodeColors;

type FlowNodeData = {
    label?: string;
    type?: string;
    channel?: string;
    messageBody?: string;
    subject?: string;
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

type FlowNode = Node<FlowNodeData>;

type FlowDetail = {
    id: string;
    name: string;
    triggerType: string;
    triggerConfig?: Record<string, unknown> | null;
    nodes?: unknown;
    edges?: unknown;
};

const getId = () => `node_${Math.random().toString(36).slice(2, 11)}`;

function parseNodes(raw: unknown): FlowNode[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is FlowNode => Boolean(item && typeof item === "object" && "id" in item));
}

function parseEdges(raw: unknown): Edge[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is Edge => Boolean(item && typeof item === "object" && "source" in item && "target" in item));
}

function isFlowVisualNodeType(value: string): value is FlowVisualNodeType {
    return value in nodeColors;
}

function getNodeBorderColor(type: string) {
    return isFlowVisualNodeType(type) ? nodeColors[type] : "#38bdf8";
}

function isTriggerNode(node: FlowNode) {
    const visualType = String(node.type || "").toLowerCase();
    if (visualType === "triggernode") return true;

    const dataType = String(node.data?.type || "").toLowerCase();
    if (dataType === "trigger" || dataType === "triggernode") return true;
    return node.id === "trigger-1";
}

function buildTriggerConfigFromNodes(nodes: FlowNode[]) {
    const triggerNode = nodes.find(isTriggerNode);
    if (!triggerNode) return null;

    const triggerEvent = String(triggerNode.data?.triggerEvent || "").trim().toLowerCase();
    const source = String(triggerNode.data?.source || "").trim();
    const tagName = String(triggerNode.data?.tagName || "").trim();

    const config: Record<string, string> = {};
    if (triggerEvent) config.triggerEvent = triggerEvent;
    if (source) config.source = source;
    if (tagName) config.tagName = tagName;

    return Object.keys(config).length > 0 ? config : null;
}

export default function FlowEditorPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<FlowNode, Edge> | null>(null);

    const [flowData, setFlowData] = useState<FlowDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ ok: boolean; executionId?: string | null; reason?: string } | null>(null);

    // Seleção de Nós (Sidebar Properties)
    const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);

    useEffect(() => {
        const fetchFlow = async () => {
            try {
                const res = await fetch(`/api/crm/fluxos/${params.id}`);
                if (res.ok) {
                    const data = (await res.json()) as FlowDetail;
                    setFlowData(data);

                    const rawNodes = typeof data.nodes === "string" ? JSON.parse(data.nodes) : data.nodes;
                    const rawEdges = typeof data.edges === "string" ? JSON.parse(data.edges) : data.edges;
                    const parsedNodes = parseNodes(rawNodes);
                    const parsedEdges = parseEdges(rawEdges);
                    const configuredTriggerEvent = String(data.triggerConfig?.triggerEvent || "").trim().toLowerCase();

                    if (parsedNodes.length > 0) {
                        setNodes(
                            parsedNodes.map((node) => {
                                if (!isTriggerNode(node)) return node;
                                const currentType = String(node.data?.type || "").toLowerCase();
                                const normalizedType = currentType && currentType !== "triggernode" ? "TRIGGER" : node.data?.type;
                                return {
                                    ...node,
                                    data: {
                                        ...node.data,
                                        type: normalizedType || "TRIGGER",
                                        triggerEvent: configuredTriggerEvent || node.data?.triggerEvent || undefined,
                                    },
                                };
                            })
                        );
                    }
                    if (parsedEdges.length > 0) {
                        setEdges(parsedEdges);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        void fetchFlow();
    }, [params.id, setEdges, setNodes]);

    const onConnect = useCallback((params: Connection | Edge) => {
        setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds));
    }, [setEdges]);

    const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();

        const type = event.dataTransfer.getData("application/reactflow");
        if (typeof type !== "string" || !type) return;

        if (!reactFlowInstance || !reactFlowWrapper.current) return;

        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const position = reactFlowInstance.screenToFlowPosition({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
        });

        const newNode = {
            id: getId(),
            type: 'default', // Para usar node default customizável pela cor
            position,
            data: { label: `${type} Node`, type: type },
            style: {
                background: 'rgba(15, 23, 42, 0.85)',
                color: '#f8fafc',
                border: `1px solid ${getNodeBorderColor(type)}`,
                borderLeft: `4px solid ${getNodeBorderColor(type)}`,
                borderRadius: '0px',
                padding: '12px 16px',
                fontSize: '12px',
                boxShadow: `0 4px 12px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)`,
                backdropFilter: 'blur(8px)',
                width: 160
            }
        };

        if (type === 'messageNode') newNode.data.label = 'Enviar Msg (WhatsApp)';
        if (type === 'waitNode') newNode.data.label = 'Aguardar (Delay)';
        if (type === 'tagNode') newNode.data.label = 'Add Tag (CRM)';
        if (type === 'createTaskNode') newNode.data.label = 'Criar Tarefa';

        setNodes((nds) => nds.concat(newNode));
    }, [reactFlowInstance, setNodes]);

    // Handlers para Seleção / Edição de Nó
    const onNodeClick = useCallback((event: React.MouseEvent, node: FlowNode) => {
        void event;
        setSelectedNode(node);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    const handleUpdateNode = useCallback((nodeId: string, newData: Partial<FlowNodeData>) => {
        setNodes((nds) =>
            nds.map((n) => {
                if (n.id === nodeId) {
                    return {
                        ...n,
                        data: {
                            ...n.data,
                            ...newData
                        }
                    };
                }
                return n;
            })
        );
    }, [setNodes]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch(`/api/crm/fluxos/${params.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nodes,
                    edges,
                    triggerConfig: buildTriggerConfigFromNodes(nodes) || undefined,
                })
            });
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch(`/api/crm/fluxos/${params.id}/test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            const data = await res.json() as { ok: boolean; executionId?: string | null; reason?: string };
            setTestResult(data);
        } catch {
            setTestResult({ ok: false, reason: "Erro de rede ao testar fluxo." });
        }
        setTesting(false);
    };

    const handleStartDrag = (type: FlowVisualNodeType) => (event: React.DragEvent<HTMLDivElement>) => {
        event.dataTransfer.setData("application/reactflow", type);
        event.dataTransfer.effectAllowed = "move";
    };

    if (loading) {
        return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
    }

    return (
        <div className="flex min-h-[calc(100dvh-64px)] w-full min-w-0 flex-col bg-bg-primary">
            {/* Header / Canvas Toolbar */}
            <div className="z-10 flex flex-col gap-3 border-b border-border bg-bg-secondary px-4 py-4 shadow-sm md:flex-row md:items-center md:justify-between md:px-6">
                <div className="flex min-w-0 items-center gap-4">
                    <button onClick={() => router.push('/crm/fluxos')} className="inline-flex min-h-11 min-w-11 items-center justify-center text-text-muted transition-colors hover:text-text-primary">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="min-w-0">
                        <h1 className="truncate text-lg font-bold text-text-primary">{flowData?.name || "Editor de Fluxo"}</h1>
                        <p className="text-xs text-text-muted">Gatilho Primário: {flowData?.triggerType}</p>
                    </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                        variant="outline"
                        className="w-full gap-2 bg-bg-tertiary sm:w-auto"
                        onClick={handleTest}
                        disabled={testing}
                    >
                        {testing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} className="text-green-500" />}
                        {testing ? "Testando..." : "Testar Fluxo"}
                    </Button>
                    <Button variant="gradient" className="w-full gap-2 shadow-glow sm:w-auto" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'Gravando...' : 'Salvar Fluxo'}
                    </Button>
                </div>
            </div>

            {/* Test Result Banner */}
            {testResult && (
                <div className={`flex items-center gap-3 px-6 py-3 text-sm animate-fade-in ${testResult.ok ? "bg-success/10 border-b border-success/30 text-success" : "bg-danger/10 border-b border-danger/30 text-danger"}`}>
                    {testResult.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {testResult.ok
                        ? `Fluxo executado com sucesso! Execução ID: ${testResult.executionId ?? "—"}`
                        : `Falha no teste: ${testResult.reason ?? "Erro desconhecido."}`
                    }
                    <button className="ml-auto opacity-70 hover:opacity-100" onClick={() => setTestResult(null)}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Main Editor Area */}
            <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
                {/* Sidebar Toolbar */}
                <div className="z-10 border-b border-border bg-bg-tertiary p-4 lg:w-64 lg:flex-shrink-0 lg:border-b-0 lg:border-r lg:overflow-y-auto">
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-muted">Bloquinhos (Arraste)</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">

                    <div
                        className="group flex min-h-20 min-w-[220px] cursor-grab items-center gap-3 border-2 border-border p-3 transition-colors hover:border-blue-500 hover:bg-bg-elevated lg:min-w-0"
                        style={{ borderRadius: 'var(--radius-sm)' }}
                        onDragStart={handleStartDrag("messageNode")}
                        draggable
                    >
                        <div className="bg-blue-500/10 p-2 rounded-sm text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors"><MessageCircle size={16} /></div>
                        <span className="text-sm text-text-primary font-medium tracking-tight">Enviar Mensagem</span>
                    </div>

                    <div
                        className="group flex min-h-20 min-w-[220px] cursor-grab items-center gap-3 border-2 border-border p-3 transition-colors hover:border-slate-400 hover:bg-bg-elevated lg:min-w-0"
                        style={{ borderRadius: 'var(--radius-sm)' }}
                        onDragStart={handleStartDrag("waitNode")}
                        draggable
                    >
                        <div className="bg-slate-500/10 p-2 rounded-sm text-slate-400 group-hover:bg-slate-500 group-hover:text-white transition-colors"><Clock size={16} /></div>
                        <span className="text-sm text-text-primary font-medium tracking-tight">Aguardar (Timer)</span>
                    </div>

                    <div
                        className="group flex min-h-20 min-w-[220px] cursor-grab items-center gap-3 border-2 border-border p-3 transition-colors hover:border-green-500 hover:bg-bg-elevated lg:min-w-0"
                        style={{ borderRadius: 'var(--radius-sm)' }}
                        onDragStart={handleStartDrag("tagNode")}
                        draggable
                    >
                        <div className="bg-green-500/10 p-2 rounded-sm text-green-400 group-hover:bg-green-500 group-hover:text-white transition-colors"><Tag size={16} /></div>
                        <span className="text-sm text-text-primary font-medium tracking-tight">Adicionar Tag</span>
                    </div>

                    <div
                        className="group flex min-h-20 min-w-[220px] cursor-grab items-center gap-3 border-2 border-border p-3 transition-colors hover:border-orange-500 hover:bg-bg-elevated lg:min-w-0"
                        style={{ borderRadius: 'var(--radius-sm)' }}
                        onDragStart={handleStartDrag("createTaskNode")}
                        draggable
                    >
                        <div className="bg-orange-500/10 p-2 rounded-sm text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors"><CheckSquare size={16} /></div>
                        <span className="text-sm text-text-primary font-medium tracking-tight">Criar Tarefa</span>
                    </div>

                    </div>

                    <div className="mt-4 rounded-xl border border-dashed border-border bg-bg-primary/50 p-4 text-xs text-text-muted lg:mt-8">
                        Selecione um bloco no centro para editar os parâmetros (Mensagem de texto, quantidade de dias pra aguardar, etc).
                    </div>
                </div>

                {/* React Flow Canvas */}
                <div className="relative min-h-[520px] flex-1 lg:min-h-0" ref={reactFlowWrapper}>
                    <ReactFlowProvider>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onInit={setReactFlowInstance}
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            onNodeClick={onNodeClick}
                            onPaneClick={onPaneClick}
                            fitView
                            colorMode="dark"
                        >
                            <Background color="#1e293b" gap={16} />
                            <MiniMap
                                nodeColor={(n) => {
                                    if (n.type === 'triggerNode' || n.data?.type === 'TRIGGER') return '#fbbf24';
                                    if (n.data?.type === 'messageNode') return '#38bdf8';
                                    if (n.data?.type === 'tagNode') return '#4ade80';
                                    if (n.data?.type === 'createTaskNode' || n.data?.type === 'CREATE_TASK') return '#f97316';
                                    return '#94a3b8';
                                }}
                                style={{ backgroundColor: '#0f172a', maskImage: 'linear-gradient(to bottom, black, transparent)' }}
                            />
                            <Controls className="bg-bg-tertiary border-border fill-white" />
                        </ReactFlow>
                    </ReactFlowProvider>

                    {/* Sliding Sidebar for Properties */}
                    {selectedNode && (
                        <NodePropertiesPanel
                            node={selectedNode}
                            onClose={() => setSelectedNode(null)}
                            onUpdateNode={handleUpdateNode}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
