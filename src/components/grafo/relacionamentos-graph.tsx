"use client";

import {
    Background,
    BackgroundVariant,
    Controls,
    type Edge,
    type EdgeChange,
    MiniMap,
    type Node,
    type NodeChange,
    ReactFlow,
    applyEdgeChanges,
    applyNodeChanges,
    useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlertCircle, Loader2, RefreshCw, Users, FileText, Scale, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { GrafoData, GrafoNode } from "@/app/api/grafo/route";

// --- Node colors by type ---
const NODE_COLORS: Record<GrafoNode["type"], { bg: string; border: string; text: string }> = {
    cliente: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
    processo: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
    advogado: { bg: "#dcfce7", border: "#22c55e", text: "#14532d" },
    parte: { bg: "#fce7f3", border: "#ec4899", text: "#831843" },
};

const NODE_ICONS: Record<GrafoNode["type"], React.ReactNode> = {
    cliente: <User className="w-3 h-3" />,
    processo: <FileText className="w-3 h-3" />,
    advogado: <Scale className="w-3 h-3" />,
    parte: <Users className="w-3 h-3" />,
};

function grafoNodeToFlow(grafoNode: GrafoNode, index: number, total: number): Node {
    const colors = NODE_COLORS[grafoNode.type];
    const angle = (index / total) * 2 * Math.PI;
    const radiusMap: Record<GrafoNode["type"], number> = {
        processo: 0,
        cliente: 280,
        advogado: 280,
        parte: 400,
    };
    const radius = radiusMap[grafoNode.type];
    const centerX = 600;
    const centerY = 400;

    return {
        id: grafoNode.id,
        type: "default",
        position:
            grafoNode.type === "processo"
                ? { x: centerX + index * 200, y: centerY }
                : {
                      x: centerX + radius * Math.cos(angle),
                      y: centerY + radius * Math.sin(angle),
                  },
        data: {
            label: (
                <div className="flex flex-col items-start gap-0.5">
                    <div className="flex items-center gap-1 font-semibold text-xs">
                        {NODE_ICONS[grafoNode.type]}
                        <span className="truncate max-w-[120px]">{grafoNode.label}</span>
                    </div>
                    {grafoNode.sublabel && (
                        <span className="text-[10px] opacity-70 truncate max-w-[120px]">
                            {grafoNode.sublabel}
                        </span>
                    )}
                </div>
            ),
        },
        style: {
            background: colors.bg,
            border: `2px solid ${colors.border}`,
            color: colors.text,
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "12px",
            minWidth: "140px",
        },
    };
}

function autoLayout(nodes: GrafoNode[]): Node[] {
    const processos = nodes.filter((n) => n.type === "processo");
    const clientes = nodes.filter((n) => n.type === "cliente");
    const advogados = nodes.filter((n) => n.type === "advogado");
    const partes = nodes.filter((n) => n.type === "parte");

    const PROC_X_START = 300;
    const PROC_Y = 350;
    const PROC_GAP = 220;

    const flowNodes: Node[] = [];

    // Processos — linha central
    processos.forEach((n, i) => {
        flowNodes.push({
            id: n.id,
            type: "default",
            position: { x: PROC_X_START + i * PROC_GAP, y: PROC_Y },
            data: {
                label: (
                    <div className="flex flex-col items-start gap-0.5">
                        <div className="flex items-center gap-1 font-semibold text-xs">
                            {NODE_ICONS[n.type]}
                            <span className="truncate max-w-[120px]">{n.label}</span>
                        </div>
                        {n.sublabel && (
                            <span className="text-[10px] opacity-70 truncate max-w-[120px]">
                                {n.sublabel}
                            </span>
                        )}
                    </div>
                ),
            },
            style: {
                background: NODE_COLORS[n.type].bg,
                border: `2px solid ${NODE_COLORS[n.type].border}`,
                color: NODE_COLORS[n.type].text,
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "12px",
                minWidth: "140px",
            },
        });
    });

    // Clientes — linha superior
    clientes.forEach((n, i) => {
        flowNodes.push({
            id: n.id,
            type: "default",
            position: {
                x: PROC_X_START + i * 180,
                y: PROC_Y - 200,
            },
            data: {
                label: (
                    <div className="flex flex-col items-start gap-0.5">
                        <div className="flex items-center gap-1 font-semibold text-xs">
                            {NODE_ICONS[n.type]}
                            <span className="truncate max-w-[120px]">{n.label}</span>
                        </div>
                        {n.sublabel && (
                            <span className="text-[10px] opacity-70 truncate max-w-[120px]">
                                {n.sublabel}
                            </span>
                        )}
                    </div>
                ),
            },
            style: {
                background: NODE_COLORS[n.type].bg,
                border: `2px solid ${NODE_COLORS[n.type].border}`,
                color: NODE_COLORS[n.type].text,
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "12px",
                minWidth: "140px",
            },
        });
    });

    // Advogados — linha inferior
    advogados.forEach((n, i) => {
        flowNodes.push({
            id: n.id,
            type: "default",
            position: {
                x: PROC_X_START + i * 200,
                y: PROC_Y + 200,
            },
            data: {
                label: (
                    <div className="flex flex-col items-start gap-0.5">
                        <div className="flex items-center gap-1 font-semibold text-xs">
                            {NODE_ICONS[n.type]}
                            <span className="truncate max-w-[120px]">{n.label}</span>
                        </div>
                        {n.sublabel && (
                            <span className="text-[10px] opacity-70 truncate max-w-[120px]">
                                {n.sublabel}
                            </span>
                        )}
                    </div>
                ),
            },
            style: {
                background: NODE_COLORS[n.type].bg,
                border: `2px solid ${NODE_COLORS[n.type].border}`,
                color: NODE_COLORS[n.type].text,
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "12px",
                minWidth: "140px",
            },
        });
    });

    // Partes contrárias — segunda linha superior
    partes.forEach((n, i) => {
        flowNodes.push({
            id: n.id,
            type: "default",
            position: {
                x: PROC_X_START + i * 180,
                y: PROC_Y - 380,
            },
            data: {
                label: (
                    <div className="flex flex-col items-start gap-0.5">
                        <div className="flex items-center gap-1 font-semibold text-xs">
                            {NODE_ICONS[n.type]}
                            <span className="truncate max-w-[120px]">{n.label}</span>
                        </div>
                        {n.sublabel && (
                            <span className="text-[10px] opacity-70 truncate max-w-[120px]">
                                {n.sublabel}
                            </span>
                        )}
                    </div>
                ),
            },
            style: {
                background: NODE_COLORS[n.type].bg,
                border: `2px solid ${NODE_COLORS[n.type].border}`,
                color: NODE_COLORS[n.type].text,
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "12px",
                minWidth: "140px",
            },
        });
    });

    return flowNodes;
}

// --- Edge color by label ---
const EDGE_COLORS: Record<string, string> = {
    cliente: "#3b82f6",
    advogado: "#22c55e",
    REQUERENTE: "#3b82f6",
    REQUERIDO: "#ec4899",
    TERCEIRO: "#a78bfa",
    LITISCONSORTE: "#f59e0b",
};

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="bg-white rounded-lg border p-3 flex flex-col gap-1">
            <span className="text-xs text-gray-500">{label}</span>
            <span className={`text-2xl font-bold ${color}`}>{value}</span>
        </div>
    );
}

export function RelacionamentosGraph() {
    const [data, setData] = useState<GrafoData | null>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [limit, setLimit] = useState(30);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/grafo?limit=${limit}`);
            if (!res.ok) throw new Error("Erro ao carregar dados do grafo");
            const json: GrafoData = await res.json();
            setData(json);

            const flowNodes = autoLayout(json.nodes);
            const flowEdges: Edge[] = json.edges.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                label: e.label,
                animated: false,
                style: {
                    stroke: EDGE_COLORS[e.label ?? ""] ?? "#94a3b8",
                    strokeWidth: 2,
                },
                labelStyle: { fontSize: 10, fill: "#64748b" },
                labelBgStyle: { fill: "#f8fafc", fillOpacity: 0.8 },
            }));

            setNodes(flowNodes);
            setEdges(flowEdges);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro desconhecido");
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );
    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Grafo de Relacionamentos</h2>
                    <p className="text-sm text-gray-500">
                        Visualize conexões entre clientes, processos, advogados e partes
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="text-sm border rounded-md px-3 py-1.5 bg-white"
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                    >
                        <option value={20}>20 processos</option>
                        <option value={30}>30 processos</option>
                        <option value={50}>50 processos</option>
                        <option value={100}>100 processos</option>
                    </select>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Stats */}
            {data && (
                <div className="grid grid-cols-4 gap-3">
                    <StatCard
                        label="Clientes"
                        value={data.stats.totalClientes}
                        color="text-blue-600"
                    />
                    <StatCard
                        label="Processos"
                        value={data.stats.totalProcessos}
                        color="text-amber-600"
                    />
                    <StatCard
                        label="Advogados"
                        value={data.stats.totalAdvogados}
                        color="text-green-600"
                    />
                    <StatCard
                        label="Partes Contrárias"
                        value={data.stats.totalPartes}
                        color="text-pink-600"
                    />
                </div>
            )}

            {/* Legenda */}
            <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                <span className="font-medium text-gray-700">Legenda:</span>
                {(
                    [
                        ["cliente", "Cliente"],
                        ["processo", "Processo"],
                        ["advogado", "Advogado"],
                        ["parte", "Parte Contrária"],
                    ] as [GrafoNode["type"], string][]
                ).map(([type, label]) => (
                    <span key={type} className="flex items-center gap-1.5">
                        <span
                            className="inline-block w-3 h-3 rounded-sm border"
                            style={{
                                background: NODE_COLORS[type].bg,
                                borderColor: NODE_COLORS[type].border,
                            }}
                        />
                        {label}
                    </span>
                ))}
            </div>

            {/* Graph */}
            <div className="flex-1 rounded-xl border bg-gray-50 overflow-hidden" style={{ minHeight: 500 }}>
                {error ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-red-600">
                        <AlertCircle className="w-8 h-8" />
                        <p className="text-sm">{error}</p>
                        <button
                            onClick={fetchData}
                            className="px-4 py-2 text-sm bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                        >
                            Tentar novamente
                        </button>
                    </div>
                ) : loading && nodes.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : nodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                        <FileText className="w-8 h-8" />
                        <p className="text-sm">Nenhum processo encontrado para gerar o grafo</p>
                    </div>
                ) : (
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                        minZoom={0.1}
                        maxZoom={2}
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
                        <Controls />
                        <MiniMap
                            nodeColor={(n) => {
                                const id = n.id;
                                if (id.startsWith("cliente_")) return "#3b82f6";
                                if (id.startsWith("processo_")) return "#f59e0b";
                                if (id.startsWith("advogado_")) return "#22c55e";
                                return "#ec4899";
                            }}
                            maskColor="rgba(248,250,252,0.7)"
                        />
                    </ReactFlow>
                )}
            </div>
        </div>
    );
}
