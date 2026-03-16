"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    List, CalendarDays, Columns3, Grid3x3, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AgendaViewLista } from "@/components/agenda/views/agenda-view-lista";
import { AgendaViewKanban } from "@/components/agenda/views/agenda-view-kanban";
import { AgendaViewCalendario, CalendarioLegenda } from "@/components/agenda/views/agenda-view-calendario";
import { AgendaViewGrade } from "@/components/agenda/views/agenda-view-grade";
import { AgendamentoFiltros, type AgendamentoFiltrosValues } from "@/components/agenda/agendamento-filtros";
import { AgendamentoFormModal } from "@/components/agenda/agendamento-form-modal";
import { AgendamentoDrawer, type AgendamentoDetalhe } from "@/components/agenda/agendamento-drawer";
import { fetchAgendamentoDetalhe } from "@/actions/agendamento";
import type { AgendamentoCardData } from "@/components/agenda/agendamento-card";

// ---- Tipos ----
type TabId = "minha" | "escritorio" | "observador" | "conferir";
type ViewId = "lista" | "calendario" | "kanban" | "grade";

interface TabCounts {
    minha: number;
    escritorio: number;
    observador: number;
    conferir: number;
}

interface KanbanData {
    vencidos: AgendamentoCardData[];
    hoje: AgendamentoCardData[];
    estaSemana: AgendamentoCardData[];
    proximaSemana: AgendamentoCardData[];
    futuro: AgendamentoCardData[];
}

interface AdvOption { id: string; user: { name: string | null } }
interface ProcessoOption { id: string; numeroCnj: string | null; cliente: { nome: string } }

interface Props {
    items: AgendamentoCardData[];
    kanbanData: KanbanData;
    tabCounts: TabCounts;
    advogados: AdvOption[];
    processos: ProcessoOption[];
    initialTab: TabId;
    initialView: ViewId;
    initialFilters: AgendamentoFiltrosValues;
    canConferir: boolean;
    canSeeEscritorio: boolean;
    sessionAdvogadoId: string;
    sessionUserId: string;
}

const TABS: { id: TabId; label: string }[] = [
    { id: "minha", label: "Minha agenda" },
    { id: "escritorio", label: "Escritorio" },
    { id: "observador", label: "Observador" },
    { id: "conferir", label: "A conferir" },
];

const VIEWS: { id: ViewId; icon: typeof List; label: string }[] = [
    { id: "lista", icon: List, label: "Lista" },
    { id: "calendario", icon: CalendarDays, label: "Calendario" },
    { id: "kanban", icon: Columns3, label: "Kanban" },
    { id: "grade", icon: Grid3x3, label: "Grade" },
];

export function AgendaDashboard({
    items,
    kanbanData,
    tabCounts,
    advogados,
    processos,
    initialTab,
    initialView,
    initialFilters,
    canConferir,
    canSeeEscritorio,
    sessionAdvogadoId,
    sessionUserId,
}: Props) {
    const router = useRouter();
    const [tab, setTab] = useState<TabId>(initialTab);
    const [view, setView] = useState<ViewId>(initialView);
    const [showCreate, setShowCreate] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerItem, setDrawerItem] = useState<AgendamentoDetalhe | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleTabChange(newTab: TabId) {
        setTab(newTab);
        const params = new URLSearchParams(window.location.search);
        params.set("tab", newTab);
        params.set("view", view);
        router.push(`/agenda?${params.toString()}`);
    }

    function handleViewChange(newView: ViewId) {
        setView(newView);
        const params = new URLSearchParams(window.location.search);
        params.set("view", newView);
        params.set("tab", tab);
        router.push(`/agenda?${params.toString()}`);
    }

    function handleEdit(id: string) {
        startTransition(async () => {
            const detalhe = await fetchAgendamentoDetalhe(id);
            if (detalhe) {
                setDrawerItem(detalhe as AgendamentoDetalhe);
                setDrawerOpen(true);
            }
        });
    }

    const visibleTabs = TABS.filter((t) => {
        if (!canSeeEscritorio && (t.id === "escritorio" || t.id === "conferir")) return false;
        return true;
    });

    return (
        <div className="space-y-4">
            {/* Filtros */}
            <AgendamentoFiltros
                initial={initialFilters}
                advogados={advogados}
                processos={processos}
                baseTab={tab}
                baseView={view}
            />

            {/* Abas + Seletor de View + Botao Novo */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                {/* Abas */}
                <nav className="flex items-center gap-1 bg-bg-tertiary/50 rounded-xl p-1 border border-border">
                    {visibleTabs.map((t) => {
                        const count = tabCounts[t.id];
                        const isActive = tab === t.id;
                        const isPulsing = t.id === "conferir" && count > 0;
                        return (
                            <button
                                key={t.id}
                                onClick={() => handleTabChange(t.id)}
                                className={cn(
                                    "relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                                    isActive
                                        ? "bg-bg-primary text-text-primary shadow-sm"
                                        : "text-text-muted hover:text-text-primary"
                                )}
                            >
                                {t.label}
                                {count > 0 && (
                                    <span className={cn(
                                        "inline-flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full text-[9px] font-bold",
                                        isActive ? "bg-accent/20 text-accent" : "bg-bg-tertiary text-text-muted",
                                        isPulsing && "bg-red-500/20 text-red-400"
                                    )}>
                                        {count}
                                    </span>
                                )}
                                {isPulsing && (
                                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-2">
                    {/* Indicador de carregamento do drawer */}
                    {isPending && (
                        <span className="text-[10px] text-text-muted animate-pulse">Carregando...</span>
                    )}

                    {/* Seletor de view */}
                    <div className="flex items-center gap-0.5 bg-bg-tertiary/50 rounded-lg p-0.5 border border-border">
                        {VIEWS.map((v) => {
                            const Icon = v.icon;
                            return (
                                <button
                                    key={v.id}
                                    onClick={() => handleViewChange(v.id)}
                                    title={v.label}
                                    className={cn(
                                        "flex h-7 w-7 items-center justify-center rounded transition-all",
                                        view === v.id
                                            ? "bg-bg-primary text-text-primary shadow-sm"
                                            : "text-text-muted hover:text-text-primary"
                                    )}
                                >
                                    <Icon size={13} />
                                </button>
                            );
                        })}
                    </div>

                    <Badge variant="muted">{items.length} itens</Badge>

                    <Button size="sm" onClick={() => setShowCreate(true)}>
                        <Plus size={14} /> Novo
                    </Button>
                </div>
            </div>

            {/* Legenda do calendario */}
            {view === "calendario" && <CalendarioLegenda />}

            {/* View ativa */}
            <div className="animate-fade-in">
                {view === "lista" && (
                    <AgendaViewLista items={items} canConferir={canConferir} onEdit={handleEdit} />
                )}
                {view === "calendario" && (
                    <AgendaViewCalendario items={items} onEdit={handleEdit} />
                )}
                {view === "kanban" && (
                    <AgendaViewKanban
                        vencidos={kanbanData.vencidos}
                        hoje={kanbanData.hoje}
                        estaSemana={kanbanData.estaSemana}
                        proximaSemana={kanbanData.proximaSemana}
                        futuro={kanbanData.futuro}
                        onEdit={handleEdit}
                    />
                )}
                {view === "grade" && (
                    <AgendaViewGrade items={items} onEdit={handleEdit} />
                )}
            </div>

            {/* Modal de criacao */}
            <AgendamentoFormModal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                advogados={advogados}
                processos={processos}
                sessionAdvogadoId={sessionAdvogadoId}
            />

            {/* Drawer de detalhes */}
            <AgendamentoDrawer
                item={drawerItem}
                isOpen={drawerOpen}
                onClose={() => { setDrawerOpen(false); setDrawerItem(null); }}
                canConferir={canConferir}
                sessionUserId={sessionUserId}
                onEdit={(id) => {
                    setDrawerOpen(false);
                    // Reabrir com dados atualizados (apos router.refresh do drawer)
                    setTimeout(() => handleEdit(id), 300);
                }}
            />
        </div>
    );
}
