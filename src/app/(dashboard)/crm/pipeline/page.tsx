"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { KanbanBoard, Stage, Card } from "@/components/crm/kanban-board";
import { CRMCardModal } from "@/components/crm/crm-card-modal";
import { CardDetailSheet } from "@/components/crm/card-detail-sheet";
import { PipelineListView } from "@/components/crm/pipeline-list-view";
import { Plus, Filter, LayoutGrid, List, RefreshCw, TrendingUp, DollarSign, CheckCircle2, Target, X, Columns2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-fields";

type PipelineSummary = {
    id: string;
    name: string;
    areaDireito: string | null;
    isDefault: boolean;
};

type RawCard = {
    id: string;
    title: string;
    stage: string;
    value?: number | null;
    probability?: number | null;
    status?: string | null;
    areaDireito?: string | null;
    subareaDireito?: string | null;
    origem?: string | null;
    lastContactAt?: string | null;
    updatedAt?: string | null;
    urgency?: string | null;
    cliente: {
        id?: string;
        nome: string;
        email?: string | null;
        telefone?: string | null;
        celular?: string | null;
        whatsapp?: string | null;
        avatarUrl?: string | null;
    };
    processLinks?: Array<{
        processo?: { numeroCnj?: string | null } | null;
        numeroCnj?: string | null;
    }>;
};

type PipelineApiResponse = {
    id: string;
    name: string;
    stages: Stage[] | string;
    cards: RawCard[];
    lossReasons?: Array<{ id: string; nome: string }>;
    pipelines?: PipelineSummary[];
    crmConfig?: {
        areasDireito?: string[];
        subareasByArea?: Record<string, string[]>;
    };
};

type PipelineFilters = {
    search: string;
    stage: string;
    status: string;
    area: string;
    origem: string;
};

type CRMClienteLite = {
    id: string;
    nome: string;
};

const DEFAULT_FILTERS: PipelineFilters = { search: "", stage: "", status: "", area: "", origem: "" };

function rawToCard(raw: RawCard): Card {
    return {
        id: raw.id,
        title: raw.title,
        stage: raw.stage,
        value: raw.value ?? 0,
        probability: raw.probability ?? 0,
        status: raw.status ?? undefined,
        areaDireito: raw.areaDireito ?? undefined,
        origem: raw.origem ?? undefined,
        lastContactAt: raw.lastContactAt,
        updatedAt: raw.updatedAt,
        urgency: raw.urgency,
        cliente: {
            nome: raw.cliente.nome,
            avatarUrl: raw.cliente.avatarUrl ?? undefined,
            telefone: raw.cliente.telefone,
            celular: raw.cliente.celular,
            whatsapp: raw.cliente.whatsapp,
        },
        processLinks: raw.processLinks,
    };
}

export default function PipelinePage() {
    const [pipeline, setPipeline] = useState<PipelineApiResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
    const [showFilters, setShowFilters] = useState(false);
    const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
    const [filters, setFilters] = useState<PipelineFilters>(DEFAULT_FILTERS);

    const [clients, setClients] = useState<CRMClienteLite[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [activeCard, setActiveCard] = useState<Card | null>(null);
    const [pendingMove, setPendingMove] = useState<{ cardId: string; newStage: string; fromStage: string } | null>(null);
    const [moveNote, setMoveNote] = useState("");
    const [showColumnPanel, setShowColumnPanel] = useState(false);
    const [hiddenStageIds, setHiddenStageIds] = useState<Set<string>>(() => {
        if (typeof window === "undefined") return new Set<string>();
        try {
            const saved = localStorage.getItem("crm_hidden_stages");
            return saved ? new Set(JSON.parse(saved) as string[]) : new Set<string>();
        } catch { return new Set<string>(); }
    });
    const columnPanelRef = useRef<HTMLDivElement>(null);

    const fetchPipeline = useCallback(async (pipelineId?: string) => {
        setLoading(true);
        try {
            const query = pipelineId ? `?pipelineId=${encodeURIComponent(pipelineId)}` : "";
            const res = await fetch(`/api/crm/pipeline${query}`, { cache: "no-store" });
            if (res.ok) {
                const data = (await res.json()) as PipelineApiResponse;
                setPipeline(data);
                setSelectedPipelineId(data.id);
            }
            const clientsRes = await fetch("/api/clientes?limit=50", { cache: "no-store" });
            if (clientsRes.ok) {
                const data = await clientsRes.json();
                setClients(data.clientes || data || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void fetchPipeline(); }, [fetchPipeline]);

    const handleCardMoved = (cardId: string, newStage: string) => {
        const card = allCards.find((c) => c.id === cardId);
        setPendingMove({ cardId, newStage, fromStage: card?.stage ?? "" });
        setMoveNote("");
    };

    const confirmMove = async () => {
        if (!pendingMove) return;
        try {
            await fetch(`/api/crm/pipeline/cards/${pendingMove.cardId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stage: pendingMove.newStage,
                    ...(moveNote.trim() ? { stageTransitionNotes: moveNote.trim() } : {}),
                }),
            });
        } catch (error) {
            console.error("Failed to move card", error);
            void fetchPipeline(selectedPipelineId);
        } finally {
            setPendingMove(null);
            setMoveNote("");
        }
    };

    const cancelMove = () => {
        setPendingMove(null);
        setMoveNote("");
        void fetchPipeline(selectedPipelineId);
    };

    const handleCardClick = (card: Card) => {
        setActiveCard(card);
        setSheetOpen(true);
    };

    const handleEditFromSheet = (card: Card) => {
        setSheetOpen(false);
        setModalOpen(true);
    };

    const handleNewOpportunity = () => {
        setActiveCard(null);
        setModalOpen(true);
    };

    const stages = useMemo(() => {
        if (!pipeline) return [];
        return typeof pipeline.stages === "string" ? (JSON.parse(pipeline.stages) as Stage[]) : pipeline.stages;
    }, [pipeline]);

    const allCards = useMemo(() => (pipeline?.cards ?? []).map(rawToCard), [pipeline]);

    const filteredCards = useMemo(() => {
        const search = filters.search.trim().toLowerCase();
        return allCards.filter((card) => {
            if (search) {
                const haystack = `${card.title} ${card.cliente.nome} ${card.cliente.telefone ?? ""} ${card.cliente.celular ?? ""}`.toLowerCase();
                if (!haystack.includes(search)) return false;
            }
            if (filters.stage && card.stage !== filters.stage) return false;
            if (filters.status && card.status !== filters.status) return false;
            if (filters.area && card.areaDireito !== filters.area) return false;
            if (filters.origem && card.origem !== filters.origem) return false;
            return true;
        });
    }, [allCards, filters]);

    // ── KPI computations ──────────────────────────────────────────────────────
    const kpis = useMemo(() => {
        const open = allCards.filter(c => c.status !== "GANHA" && c.status !== "PERDIDA");
        const won = allCards.filter(c => c.status === "GANHA");
        const lost = allCards.filter(c => c.status === "PERDIDA");
        const pipelineValue = open.reduce((s, c) => s + (c.value ?? 0), 0);
        const wonValue = won.reduce((s, c) => s + (c.value ?? 0), 0);
        const totalDecided = won.length + lost.length;
        const convRate = totalDecided > 0 ? Math.round((won.length / totalDecided) * 100) : 0;
        return { openCount: open.length, pipelineValue, wonCount: won.length, wonValue, convRate, totalCards: allCards.length };
    }, [allCards]);

    const areaOptions = useMemo(() => {
        const values = new Set<string>();
        for (const card of allCards) { if (card.areaDireito) values.add(card.areaDireito); }
        return Array.from(values).sort();
    }, [allCards]);

    const origemOptions = useMemo(() => {
        const values = new Set<string>();
        for (const card of allCards) { if (card.origem) values.add(card.origem); }
        return Array.from(values).sort();
    }, [allCards]);

    const hasActiveFilters = Object.values(filters).some(v => v !== "");

    const toggleStageVisibility = useCallback((stageId: string) => {
        setHiddenStageIds(prev => {
            const next = new Set(prev);
            if (next.has(stageId)) next.delete(stageId);
            else next.add(stageId);
            try { localStorage.setItem("crm_hidden_stages", JSON.stringify([...next])); } catch { /* noop */ }
            return next;
        });
    }, []);

    const visibleStages = useMemo(
        () => stages.filter(s => !hiddenStageIds.has(s.id)),
        [stages, hiddenStageIds],
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            </div>
        );
    }

    if (!pipeline) return <div className="p-6 text-text-muted">Erro ao carregar Pipeline.</div>;

    return (
        <div className="p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col space-y-4 animate-fade-in relative z-0">

            {/* ── Page Header ── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
                <div>
                    <h1 className="font-display text-xl font-bold text-text-primary">{pipeline.name}</h1>
                    <p className="text-xs text-text-muted mt-0.5">Kanban e lista de oportunidades por funil, área e origem.</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Select
                        value={selectedPipelineId}
                        onChange={(e) => fetchPipeline(e.target.value)}
                        options={(pipeline.pipelines || []).map((item) => ({
                            value: item.id,
                            label: item.areaDireito ? `${item.name} (${item.areaDireito})` : item.name,
                        }))}
                        className="min-w-[220px]"
                    />

                    <div className="bg-bg-tertiary p-1 rounded-lg border border-border flex">
                        <button
                            onClick={() => setViewMode("kanban")}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === "kanban" ? "bg-bg-primary shadow-sm text-accent" : "text-text-muted hover:text-text-primary"}`}
                            title="Kanban"
                        ><LayoutGrid size={16} /></button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-bg-primary shadow-sm text-accent" : "text-text-muted hover:text-text-primary"}`}
                            title="Lista"
                        ><List size={16} /></button>
                    </div>

                    <Button
                        className={`gap-1.5 border border-border text-text-primary rounded-sm text-sm ${showFilters ? "bg-accent/10 text-accent border-accent/30" : "bg-bg-tertiary hover:bg-bg-elevated"}`}
                        onClick={() => setShowFilters(v => !v)}
                    >
                        <Filter size={14} />
                        Filtros
                        {hasActiveFilters && <span className="ml-0.5 w-4 h-4 rounded-full bg-accent text-[10px] font-bold text-black flex items-center justify-center">{Object.values(filters).filter(v => v).length}</span>}
                    </Button>

                    {viewMode === "kanban" && (
                        <div className="relative" ref={columnPanelRef}>
                            <Button
                                className={`gap-1.5 border border-border text-text-primary rounded-sm text-sm ${showColumnPanel ? "bg-accent/10 text-accent border-accent/30" : "bg-bg-tertiary hover:bg-bg-elevated"}`}
                                onClick={() => setShowColumnPanel(v => !v)}
                            >
                                <Columns2 size={14} />
                                Colunas
                                {hiddenStageIds.size > 0 && <span className="ml-0.5 w-4 h-4 rounded-full bg-warning text-[10px] font-bold text-black flex items-center justify-center">{hiddenStageIds.size}</span>}
                            </Button>
                            {showColumnPanel && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowColumnPanel(false)} />
                                    <div className="absolute top-full mt-1.5 right-0 z-50 glass-card rounded-xl border border-border shadow-2xl p-2 min-w-[210px]">
                                        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide px-2 py-1.5">Visibilidade de colunas</p>
                                        {stages.map(stage => {
                                            const isVisible = !hiddenStageIds.has(stage.id);
                                            return (
                                                <button
                                                    key={stage.id}
                                                    onClick={() => toggleStageVisibility(stage.id)}
                                                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-bg-elevated transition-colors text-left"
                                                >
                                                    <span
                                                        className="w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center shrink-0 transition-colors"
                                                        style={{ borderColor: stage.color, backgroundColor: isVisible ? stage.color : "transparent" }}
                                                    >
                                                        {isVisible && <Check size={9} strokeWidth={3} className="text-white" />}
                                                    </span>
                                                    <span className="text-sm text-text-primary truncate">{stage.name}</span>
                                                </button>
                                            );
                                        })}
                                        {hiddenStageIds.size > 0 && (
                                            <button
                                                onClick={() => {
                                                    setHiddenStageIds(new Set());
                                                    try { localStorage.removeItem("crm_hidden_stages"); } catch { /* noop */ }
                                                }}
                                                className="w-full text-center text-xs text-accent hover:text-highlight mt-1 py-1 border-t border-border"
                                            >
                                                Mostrar todas
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <Button variant="outline" className="gap-1.5 border-border text-sm" onClick={() => fetchPipeline(selectedPipelineId)}>
                        <RefreshCw size={14} />
                    </Button>

                    <Button
                        className="gap-1.5 bg-accent text-[#090705] hover:bg-highlight border-none rounded-sm font-bold tracking-wide text-sm"
                        onClick={handleNewOpportunity}
                    >
                        <Plus size={14} strokeWidth={3} /> Nova Oportunidade
                    </Button>
                </div>
            </div>

            {/* ── KPI Bar ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
                <KpiCard
                    icon={<Target size={16} />}
                    label="Oportunidades abertas"
                    value={kpis.openCount.toString()}
                    sub={`de ${kpis.totalCards} total`}
                    color="text-info"
                />
                <KpiCard
                    icon={<DollarSign size={16} />}
                    label="Valor no pipeline"
                    value={`R$ ${kpis.pipelineValue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
                    sub="em aberto"
                    color="text-success"
                />
                <KpiCard
                    icon={<CheckCircle2 size={16} />}
                    label="Ganhos"
                    value={kpis.wonCount.toString()}
                    sub={kpis.wonValue > 0 ? `R$ ${kpis.wonValue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "—"}
                    color="text-success"
                />
                <KpiCard
                    icon={<TrendingUp size={16} />}
                    label="Taxa de conversão"
                    value={`${kpis.convRate}%`}
                    sub={`${kpis.wonCount} ganhos / ${kpis.wonCount + allCards.filter(c => c.status === "PERDIDA").length} decididos`}
                    color={kpis.convRate > 30 ? "text-success" : kpis.convRate > 10 ? "text-warning" : "text-danger"}
                />
            </div>

            {/* ── Filters ── */}
            {showFilters && (
                <div className="glass-card p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2.5 shrink-0">
                    <Input
                        value={filters.search}
                        onChange={(e) => setFilters(old => ({ ...old, search: e.target.value }))}
                        placeholder="Buscar por nome, telefone..."
                    />
                    <Select
                        value={filters.stage}
                        onChange={(e) => setFilters(old => ({ ...old, stage: e.target.value }))}
                        options={[{ value: "", label: "Todas as etapas" }, ...stages.map(s => ({ value: s.id, label: s.name }))]}
                    />
                    <Select
                        value={filters.status}
                        onChange={(e) => setFilters(old => ({ ...old, status: e.target.value }))}
                        options={[
                            { value: "", label: "Todos os status" },
                            { value: "ABERTO", label: "Aberto" },
                            { value: "CONGELADA", label: "Congelada" },
                            { value: "GANHA", label: "Ganha" },
                            { value: "PERDIDA", label: "Perdida" },
                        ]}
                    />
                    <Select
                        value={filters.area}
                        onChange={(e) => setFilters(old => ({ ...old, area: e.target.value }))}
                        options={[{ value: "", label: "Todas as áreas" }, ...areaOptions.map(a => ({ value: a, label: a }))]}
                    />
                    <Select
                        value={filters.origem}
                        onChange={(e) => setFilters(old => ({ ...old, origem: e.target.value }))}
                        options={[{ value: "", label: "Todas as origens" }, ...origemOptions.map(o => ({ value: o, label: o }))]}
                    />
                    <Button variant="outline" className="border-border gap-1" onClick={() => setFilters(DEFAULT_FILTERS)}>
                        <X size={13} /> Limpar
                    </Button>
                </div>
            )}

            {/* ── Count indicator ── */}
            <div className="text-xs text-text-muted shrink-0">
                Exibindo <strong className="text-text-primary">{filteredCards.length}</strong> oportunidade(s){hasActiveFilters ? ` (filtrado de ${allCards.length})` : ""}.
            </div>

            {/* ── Board / List ── */}
            <div className="flex-1 min-h-0">
                {viewMode === "kanban" ? (
                    <KanbanBoard
                        stages={visibleStages}
                        initialCards={filteredCards}
                        onCardMoved={handleCardMoved}
                        onCardClick={handleCardClick}
                    />
                ) : (
                    <PipelineListView cards={filteredCards} stages={stages} onCardClick={handleCardClick} />
                )}
            </div>

            {/* ── Stage Move Modal ── */}
            {pendingMove && (
                <StageMoveModal
                    fromStage={stages.find((s) => s.id === pendingMove.fromStage)?.name ?? pendingMove.fromStage}
                    toStage={stages.find((s) => s.id === pendingMove.newStage)?.name ?? pendingMove.newStage}
                    note={moveNote}
                    onNoteChange={setMoveNote}
                    onConfirm={confirmMove}
                    onCancel={cancelMove}
                />
            )}

            {/* ── Card Detail Sheet ── */}
            <CardDetailSheet
                card={activeCard}
                stages={stages}
                isOpen={sheetOpen}
                onClose={() => setSheetOpen(false)}
                onEdit={handleEditFromSheet}
            />

            {/* ── CRM Card Modal (Edit) ── */}
            {modalOpen && (
                <CRMCardModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    card={activeCard}
                    pipelineId={pipeline.id}
                    clients={clients}
                    stages={stages}
                    lossReasons={pipeline.lossReasons || []}
                    areasDireito={pipeline.crmConfig?.areasDireito}
                    subareasByArea={pipeline.crmConfig?.subareasByArea}
                    onSave={() => {
                        setLoading(true);
                        void fetchPipeline(selectedPipelineId);
                    }}
                />
            )}
        </div>
    );
}

// ─── Stage Move Modal ─────────────────────────────────────────────────────────

function StageMoveModal({
    fromStage,
    toStage,
    note,
    onNoteChange,
    onConfirm,
    onCancel,
}: {
    fromStage: string;
    toStage: string;
    note: string;
    onNoteChange: (v: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
        >
            <div
                className="glass-card w-full max-w-md mx-4 p-6 rounded-xl shadow-2xl border border-border"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-base font-semibold text-text-primary mb-1">Mover oportunidade</h3>
                <p className="text-sm text-text-muted mb-4">
                    <span className="font-medium text-text-secondary">{fromStage || "—"}</span>
                    <span className="mx-2 text-text-muted">→</span>
                    <span className="font-medium text-accent">{toStage}</span>
                </p>
                <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">
                    Nota sobre a movimentação <span className="font-normal normal-case">(opcional)</span>
                </label>
                <textarea
                    className="w-full rounded-md bg-bg-tertiary border border-border text-sm text-text-primary placeholder-text-muted p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-accent transition"
                    rows={3}
                    placeholder="Ex: Cliente confirmou interesse, aguarda envio de proposta..."
                    value={note}
                    onChange={(e) => onNoteChange(e.target.value)}
                    autoFocus
                />
                <div className="flex justify-end gap-2 mt-4">
                    <Button
                        variant="outline"
                        className="border-border text-sm"
                        onClick={onCancel}
                    >
                        Cancelar
                    </Button>
                    <Button
                        className="bg-accent text-[#090705] hover:bg-highlight border-none text-sm font-semibold"
                        onClick={onConfirm}
                    >
                        Confirmar move
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── KPI Card Component ───────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    color?: string;
}) {
    return (
        <div className="glass-card px-4 py-3 flex items-center gap-3">
            <div className={`${color ?? "text-text-muted"} shrink-0`}>{icon}</div>
            <div className="min-w-0">
                <p className="text-[10px] text-text-muted uppercase tracking-wide font-semibold truncate">{label}</p>
                <p className={`text-lg font-bold leading-tight ${color ?? "text-text-primary"}`}>{value}</p>
                {sub && <p className="text-[11px] text-text-muted truncate">{sub}</p>}
            </div>
        </div>
    );
}


