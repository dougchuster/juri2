"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { KanbanBoard, Stage, Card } from "@/components/crm/kanban-board";
import { CRMCardModal } from "@/components/crm/crm-card-modal";
import { PipelineListView } from "@/components/crm/pipeline-list-view";
import { Plus, Filter, LayoutGrid, List, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-fields";

type PipelineSummary = {
    id: string;
    name: string;
    areaDireito: string | null;
    isDefault: boolean;
};

type PipelineApiResponse = {
    id: string;
    name: string;
    stages: Stage[] | string;
    cards: Card[];
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

const DEFAULT_FILTERS: PipelineFilters = {
    search: "",
    stage: "",
    status: "",
    area: "",
    origem: "",
};

export default function PipelinePage() {
    const [pipeline, setPipeline] = useState<PipelineApiResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
    const [showFilters, setShowFilters] = useState(false);
    const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
    const [filters, setFilters] = useState<PipelineFilters>(DEFAULT_FILTERS);

    const [clients, setClients] = useState<CRMClienteLite[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeCard, setActiveCard] = useState<Card | null>(null);

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

    useEffect(() => {
        void fetchPipeline();
    }, [fetchPipeline]);

    const handleCardMoved = async (cardId: string, newStage: string) => {
        try {
            await fetch(`/api/crm/pipeline/cards/${cardId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stage: newStage }),
            });
        } catch (error) {
            console.error("Failed to move card", error);
        }
    };

    const handleCardClick = (card: Card) => {
        setActiveCard(card);
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

    const filteredCards = useMemo(() => {
        if (!pipeline) return [];
        const search = filters.search.trim().toLowerCase();
        return pipeline.cards.filter((card) => {
            if (search) {
                const haystack = `${card.title || ""} ${card.cliente?.nome || ""}`.toLowerCase();
                if (!haystack.includes(search)) return false;
            }
            if (filters.stage && card.stage !== filters.stage) return false;
            if (filters.status && card.status !== filters.status) return false;
            if (filters.area && card.areaDireito !== filters.area) return false;
            if (filters.origem && card.origem !== filters.origem) return false;
            return true;
        });
    }, [pipeline, filters]);

    const areaOptions = useMemo(() => {
        const values = new Set<string>();
        for (const card of pipeline?.cards || []) {
            if (card.areaDireito) values.add(card.areaDireito);
        }
        return Array.from(values).sort();
    }, [pipeline]);

    const origemOptions = useMemo(() => {
        const values = new Set<string>();
        for (const card of pipeline?.cards || []) {
            if (card.origem) values.add(card.origem);
        }
        return Array.from(values).sort();
    }, [pipeline]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            </div>
        );
    }

    if (!pipeline) {
        return <div className="p-6">Erro ao carregar Pipeline.</div>;
    }

    return (
        <div className="p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col space-y-6 animate-fade-in relative z-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl font-bold text-text-primary">{pipeline.name}</h1>
                    <p className="text-sm text-text-muted mt-1">Kanban e lista de oportunidades por funil, area e origem.</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Select
                        value={selectedPipelineId}
                        onChange={(e) => fetchPipeline(e.target.value)}
                        options={(pipeline.pipelines || []).map((item) => ({
                            value: item.id,
                            label: item.areaDireito ? `${item.name} (${item.areaDireito})` : item.name,
                        }))}
                        className="min-w-[250px]"
                    />

                    <div className="bg-bg-tertiary p-1 rounded-lg border border-border flex">
                        <button
                            onClick={() => setViewMode("kanban")}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === "kanban" ? "bg-bg-primary shadow-sm text-accent" : "text-text-muted hover:text-text-primary"}`}
                            title="Kanban"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-bg-primary shadow-sm text-accent" : "text-text-muted hover:text-text-primary"}`}
                            title="Lista"
                        >
                            <List size={18} />
                        </button>
                    </div>

                    <Button
                        className="gap-2 bg-bg-tertiary border border-border text-text-primary hover:bg-bg-elevated rounded-sm"
                        onClick={() => setShowFilters((current) => !current)}
                    >
                        <Filter size={16} /> Filtros
                    </Button>

                    <Button variant="outline" className="gap-2 border-border" onClick={() => fetchPipeline(selectedPipelineId)}>
                        <RefreshCw size={16} /> Atualizar
                    </Button>

                    <Button
                        className="gap-2 bg-accent text-[#090705] hover:bg-highlight border-none rounded-sm font-bold tracking-wide"
                        onClick={handleNewOpportunity}
                    >
                        <Plus size={16} strokeWidth={3} /> Nova Oportunidade
                    </Button>
                </div>
            </div>

            {showFilters && (
                <div className="glass-card p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
                    <Input
                        value={filters.search}
                        onChange={(e) => setFilters((old) => ({ ...old, search: e.target.value }))}
                        placeholder="Buscar por titulo/cliente"
                    />

                    <Select
                        value={filters.stage}
                        onChange={(e) => setFilters((old) => ({ ...old, stage: e.target.value }))}
                        options={[
                            { value: "", label: "Todas as etapas" },
                            ...stages.map((stage) => ({ value: stage.id, label: stage.name })),
                        ]}
                    />

                    <Select
                        value={filters.status}
                        onChange={(e) => setFilters((old) => ({ ...old, status: e.target.value }))}
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
                        onChange={(e) => setFilters((old) => ({ ...old, area: e.target.value }))}
                        options={[
                            { value: "", label: "Todas as areas" },
                            ...areaOptions.map((area) => ({ value: area, label: area })),
                        ]}
                    />

                    <Select
                        value={filters.origem}
                        onChange={(e) => setFilters((old) => ({ ...old, origem: e.target.value }))}
                        options={[
                            { value: "", label: "Todas as origens" },
                            ...origemOptions.map((origem) => ({ value: origem, label: origem })),
                        ]}
                    />

                    <Button variant="outline" className="border-border" onClick={() => setFilters(DEFAULT_FILTERS)}>
                        Limpar filtros
                    </Button>
                </div>
            )}

            <div className="text-xs text-text-muted">
                Exibindo {filteredCards.length} oportunidade(s) de {pipeline.cards.length}.
            </div>

            {viewMode === "kanban" ? (
                <KanbanBoard
                    stages={stages}
                    initialCards={filteredCards}
                    onCardMoved={handleCardMoved}
                    onCardClick={handleCardClick}
                />
            ) : (
                <PipelineListView cards={filteredCards} stages={stages} onCardClick={handleCardClick} />
            )}

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
