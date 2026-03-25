"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult, DragStart } from "@hello-pangea/dnd";
import { Plus, MoreHorizontal, Phone, FileText, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Stage {
    id: string;
    name: string;
    color: string;
}

export interface Card {
    id: string;
    title: string;
    stage: string;
    value: number;
    probability: number;
    status?: string;
    areaDireito?: string;
    origem?: string;
    lastContactAt?: string | null;
    updatedAt?: string | null;
    urgency?: string | null;
    cliente: {
        nome: string;
        avatarUrl?: string;
        telefone?: string | null;
        celular?: string | null;
        whatsapp?: string | null;
    };
    processLinks?: Array<{
        processo?: { numeroCnj?: string | null } | null;
        numeroCnj?: string | null;
    }>;
}

interface Props {
    stages: Stage[];
    initialCards: Card[];
    onCardMoved: (cardId: string, newStage: string) => void;
    onCardClick: (card: Card) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AREA_COLORS: Record<string, string> = {
    PENAL: "#ef4444",
    CIVEL: "#3b82f6",
    TRABALHISTA: "#f59e0b",
    PREVIDENCIARIO: "#10b981",
    TRIBUTARIO: "#8b5cf6",
    EMPRESARIAL_SOCIETARIO: "#0ea5e9",
    ADMINISTRATIVO: "#6366f1",
    FAMILIA_SUCESSOES: "#ec4899",
    CONSUMIDOR: "#f97316",
    IMOBILIARIO: "#84cc16",
    ELEITORAL: "#facc15",
    AMBIENTAL: "#22c55e",
    PROPRIEDADE_INTELECTUAL: "#a855f7",
    ARBITRAGEM_MEDIACAO: "#14b8a6",
    OUTROS: "#94a3b8",
    "Direito Digital": "#6366f1",
    "Direito do Consumidor": "#f97316",
    "Direito Imobiliário": "#84cc16",
    "Direito Bancário": "#3b82f6",
    "Direito de Família": "#ec4899",
    "Direito Civil": "#0ea5e9",
    "Direito Contratual": "#8b5cf6",
    "Direito Processual Civil": "#14b8a6",
};

function getAreaColor(area?: string | null): string {
    if (!area) return "#94a3b8";
    return AREA_COLORS[area] ?? "#94a3b8";
}

function friendlyArea(raw?: string | null): string {
    if (!raw) return "";
    const map: Record<string, string> = {
        PENAL: "Penal",
        CIVEL: "Cível",
        TRABALHISTA: "Trabalhista",
        PREVIDENCIARIO: "Previdenciário",
        TRIBUTARIO: "Tributário",
        EMPRESARIAL_SOCIETARIO: "Empresarial",
        ADMINISTRATIVO: "Administrativo",
        FAMILIA_SUCESSOES: "Família",
        CONSUMIDOR: "Consumidor",
        IMOBILIARIO: "Imobiliário",
        ELEITORAL: "Eleitoral",
        AMBIENTAL: "Ambiental",
        PROPRIEDADE_INTELECTUAL: "Prop. Intelectual",
        ARBITRAGEM_MEDIACAO: "Arbitragem",
        OUTROS: "Outros",
    };
    return map[raw] ?? raw;
}

function relativeTime(dateStr?: string | null): string {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return "agora";
    if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
    if (diff < 172800) return "ontem";
    if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`;
    if (diff < 2592000) return `há ${Math.floor(diff / 604800)} sem`;
    return `há ${Math.floor(diff / 2592000)} meses`;
}

function formatPhone(card: Card): string | null {
    const phone = card.cliente.whatsapp ?? card.cliente.celular ?? card.cliente.telefone;
    if (!phone) return null;
    // Show last 8 digits nicely
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 8) {
        return phone.replace(/(\d{2})(\d{1})(\d{4})(\d{4})$/, "($1) $2 $3-$4")
            || phone;
    }
    return phone;
}

function getProcessNumber(card: Card): string | null {
    if (!card.processLinks?.length) return null;
    const link = card.processLinks[0];
    const cnj = link.processo?.numeroCnj ?? link.numeroCnj;
    if (!cnj) return null;
    // Truncate to first 10 chars for display
    return cnj.length > 14 ? cnj.substring(0, 14) + "…" : cnj;
}

export function KanbanBoard({ stages, initialCards, onCardMoved, onCardClick }: Props) {
    const [columns, setColumns] = useState<Record<string, Card[]>>({});
    const [activeDragColId, setActiveDragColId] = useState<string | null>(null);

    useEffect(() => {
        const grouped: Record<string, Card[]> = {};
        stages.forEach(s => grouped[s.id] = []);
        initialCards.forEach(card => {
            if (grouped[card.stage]) {
                grouped[card.stage].push(card);
            } else {
                if (stages.length > 0) grouped[stages[0].id].push(card);
            }
        });
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setColumns(grouped);
    }, [initialCards, stages]);

    const handleDragStart = (start: DragStart) => {
        setActiveDragColId(start.source.droppableId);
    };

    const handleDragEnd = (result: DropResult) => {
        setActiveDragColId(null);
        if (!result.destination) return;
        const { source, destination } = result;

        if (source.droppableId !== destination.droppableId) {
            const sourceColumn = [...columns[source.droppableId]];
            const destColumn = [...columns[destination.droppableId]];
            const [removed] = sourceColumn.splice(source.index, 1);
            removed.stage = destination.droppableId;
            destColumn.splice(destination.index, 0, removed);
            setColumns({ ...columns, [source.droppableId]: sourceColumn, [destination.droppableId]: destColumn });
            onCardMoved(removed.id, destination.droppableId);
        } else {
            const column = [...columns[source.droppableId]];
            const [removed] = column.splice(source.index, 1);
            column.splice(destination.index, 0, removed);
            setColumns({ ...columns, [source.droppableId]: column });
        }
    };

    const calculateTotal = (cards: Card[]) =>
        cards.reduce((acc, c) => acc + (c.value || 0), 0);

    if (stages.length === 0) return null;

    return (
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex min-h-[520px] h-[calc(100dvh-300px)] items-start gap-3 overflow-x-auto pb-6 pt-1 md:min-h-[580px]">
                {stages.map(stage => {
                    const colCards = columns[stage.id] || [];
                    const totalValue = calculateTotal(colCards);
                    const areaColor = stage.color;

                    return (
                        <div
                            key={stage.id}
                            className={cn(
                                "glass-card flex h-full min-w-[272px] max-w-[272px] flex-shrink-0 flex-col sm:min-w-[300px] sm:max-w-[300px]",
                                activeDragColId === stage.id ? "z-50 ring-2 ring-accent/50" : "z-10"
                            )}
                            style={{ borderRadius: "var(--radius-md)" }}
                        >
                            {/* ── Column Header ── */}
                            <div
                                className="px-3 pt-3 pb-2.5 border-b border-border/40"
                                style={{ borderTop: `3px solid ${areaColor}`, borderTopLeftRadius: "var(--radius-md)", borderTopRightRadius: "var(--radius-md)" }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-semibold text-text-primary text-xs uppercase tracking-wide truncate">{stage.name}</span>
                                        <span
                                            className="shrink-0 text-[10px] font-bold px-1.5 py-px rounded-full"
                                            style={{ background: `${areaColor}22`, color: areaColor }}
                                        >
                                            {colCards.length}
                                        </span>
                                    </div>
                                    <button className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary">
                                        <MoreHorizontal size={15} />
                                    </button>
                                </div>
                                {totalValue > 0 && (
                                    <div className="mt-1 text-[11px] font-semibold text-success/80">
                                        R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </div>
                                )}
                            </div>

                            {/* ── Draggable Area ── */}
                            <Droppable droppableId={stage.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={cn(
                                            "p-2 flex-1 overflow-y-auto space-y-2 transition-colors",
                                            snapshot.isDraggingOver && "bg-accent/5"
                                        )}
                                    >
                                        {colCards.map((card, index) => (
                                            <Draggable key={card.id} draggableId={card.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <KanbanCard
                                                        card={card}
                                                        provided={provided}
                                                        snapshot={snapshot}
                                                        onClick={() => onCardClick(card)}
                                                    />
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    );
                })}

                {/* Add new stage button */}
                <div
                    className="group flex h-16 min-w-[272px] max-w-[272px] cursor-pointer flex-col items-center justify-center border-2 border-dashed border-border bg-bg-secondary/20 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary sm:min-w-[300px] sm:max-w-[300px] shrink-0"
                    style={{ borderRadius: "var(--radius-md)" }}
                >
                    <span className="flex items-center text-sm font-medium gap-2">
                        <Plus size={15} className="group-hover:scale-110 group-hover:text-accent transition-transform" />
                        Novo Estágio
                    </span>
                </div>
            </div>
        </DragDropContext>
    );
}

// ─── KanbanCard Component ─────────────────────────────────────────────────────

interface KanbanCardProps {
    card: Card;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provided: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    snapshot: any;
    onClick: () => void;
}

function KanbanCard({ card, provided, snapshot, onClick }: KanbanCardProps) {
    const areaLabel = friendlyArea(card.areaDireito);
    const areaColor = getAreaColor(card.areaDireito);
    const phone = formatPhone(card);
    const processNum = getProcessNumber(card);
    const lastContact = relativeTime(card.lastContactAt ?? card.updatedAt);
    const initials = card.cliente.nome.substring(0, 2).toUpperCase();

    return (
        <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{
                borderRadius: "var(--radius-sm)",
                ...provided.draggableProps.style,
                zIndex: snapshot.isDragging ? 9999 : "auto",
            }}
            onClick={onClick}
            className={cn(
                "group cursor-pointer overflow-hidden border bg-bg-primary/95 shadow-[0_2px_0_0_rgba(0,0,0,0.08)] backdrop-blur-md transition-all",
                snapshot.isDragging
                    ? "border-accent shadow-[0_12px_24px_-4px_rgba(0,0,0,0.5)] rotate-[0.5deg]"
                    : "border-border hover:border-accent/50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] active:cursor-grabbing"
            )}
        >
            {/* Area color stripe */}
            {card.areaDireito && (
                <div className="h-[3px] w-full" style={{ background: areaColor }} />
            )}

            <div className="p-3">
                {/* Title + client */}
                <div className="flex items-start gap-2 mb-2">
                    <div
                        className="mt-0.5 w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 text-white"
                        style={{ background: areaColor }}
                    >
                        {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-text-primary text-[13px] leading-tight line-clamp-2">{card.title}</h4>
                        <p className="text-text-muted text-[11px] mt-0.5 truncate">{card.cliente.nome}</p>
                    </div>
                </div>

                {/* Value */}
                {(card.value ?? 0) > 0 && (
                    <div className="text-success font-bold text-sm mb-2">
                        R$ {(card.value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                )}

                {/* Tags row: area + process */}
                <div className="flex flex-wrap gap-1 mb-2">
                    {areaLabel && (
                        <span
                            className="inline-flex items-center text-[10px] font-semibold px-1.5 py-px rounded-full"
                            style={{ background: `${areaColor}22`, color: areaColor, border: `1px solid ${areaColor}44` }}
                        >
                            {areaLabel}
                        </span>
                    )}
                    {processNum && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-text-muted bg-bg-tertiary border border-border px-1.5 py-px rounded-full">
                            <FileText size={9} />
                            {processNum}
                        </span>
                    )}
                </div>

                {/* Phone + last contact */}
                <div className="flex items-center justify-between text-[11px] text-text-muted border-t border-border/40 pt-2 mt-2 gap-2">
                    <div className="flex items-center gap-1 min-w-0 truncate">
                        {phone ? (
                            <>
                                <Phone size={10} className="shrink-0" />
                                <span className="truncate">{phone}</span>
                            </>
                        ) : (
                            <span className="text-text-muted/50 italic text-[10px]">sem telefone</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {lastContact && (
                            <span className="flex items-center gap-0.5 text-[10px] text-text-muted/70 shrink-0">
                                <Clock size={9} />
                                {lastContact}
                            </span>
                        )}
                        {(card.probability ?? 0) > 0 && (
                            <Badge
                                variant={(card.probability ?? 0) > 70 ? "success" : (card.probability ?? 0) > 30 ? "warning" : "muted"}
                                className="text-[10px] px-1.5 py-0 shrink-0"
                            >
                                {card.probability}%
                            </Badge>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
