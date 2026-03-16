"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult, DragStart } from "@hello-pangea/dnd";
import { Plus, MoreHorizontal, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
    cliente: { nome: string; avatarUrl?: string };
}

interface Props {
    stages: Stage[];
    initialCards: Card[];
    onCardMoved: (cardId: string, newStage: string) => void;
    onCardClick: (card: Card) => void;
}

export function KanbanBoard({ stages, initialCards, onCardMoved, onCardClick }: Props) {
    const [columns, setColumns] = useState<Record<string, Card[]>>({});
    const [activeDragColId, setActiveDragColId] = useState<string | null>(null);

    useEffect(() => {
        // Agrupar os cards nas colunas baseadas no stage principal
        const grouped: Record<string, Card[]> = {};
        stages.forEach(s => grouped[s.id] = []);

        initialCards.forEach(card => {
            if (grouped[card.stage]) {
                grouped[card.stage].push(card);
            } else {
                // Se a coluna não existir, joga pro primeiro estágio como fallback
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
            // Movendo entre colunas
            const sourceColumn = [...columns[source.droppableId]];
            const destColumn = [...columns[destination.droppableId]];
            const [removed] = sourceColumn.splice(source.index, 1);

            // Update data optimistically
            removed.stage = destination.droppableId;
            destColumn.splice(destination.index, 0, removed);

            setColumns({
                ...columns,
                [source.droppableId]: sourceColumn,
                [destination.droppableId]: destColumn
            });

            // Call API
            onCardMoved(removed.id, destination.droppableId);
        } else {
            // Reordenando na mesma coluna
            const column = [...columns[source.droppableId]];
            const [removed] = column.splice(source.index, 1);
            column.splice(destination.index, 0, removed);

            setColumns({
                ...columns,
                [source.droppableId]: column
            });
        }
    };

    const calculateTotal = (cards: Card[]) => {
        return cards.reduce((acc, c) => acc + (c.value || 0), 0);
    };

    if (stages.length === 0) return null;

    return (
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex min-h-[520px] h-[calc(100dvh-220px)] items-start gap-4 overflow-x-auto pb-6 pt-2 md:min-h-[620px]">
                {stages.map(stage => {
                    const colCards = columns[stage.id] || [];
                    const totalValue = calculateTotal(colCards);

                    return (
                        <div
                            key={stage.id}
                            className={`glass-card flex h-full min-w-[280px] max-w-[280px] flex-shrink-0 flex-col sm:min-w-[320px] sm:max-w-[320px] ${activeDragColId === stage.id ? 'z-50 ring-2 ring-accent/50' : 'z-10'}`}
                            style={{ borderRadius: 'var(--radius-md)' }}
                        >
                            {/* Column Header */}
                            <div
                                className="p-4 border-b border-border/50 font-bold flex justify-between items-center"
                                style={{ borderTop: `4px solid ${stage.color}`, borderTopLeftRadius: 'var(--radius-md)', borderTopRightRadius: 'var(--radius-md)' }}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-text-primary text-sm uppercase translate-y-px">{stage.name}</span>
                                    <span className="bg-bg-tertiary text-text-muted text-xs px-2 py-0.5 rounded-full">{colCards.length}</span>
                                </div>
                                <button className="inline-flex min-h-11 min-w-11 items-center justify-center text-text-muted transition-colors hover:text-text-primary">
                                    <MoreHorizontal size={18} />
                                </button>
                            </div>

                            {/* Total Summary */}
                            <div className="px-4 py-2 bg-bg-tertiary/50 text-xs text-text-secondary border-b border-border flex justify-between items-center">
                                <span>R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>

                            {/* Draggable Area */}
                            <Droppable droppableId={stage.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`p-3 flex-1 overflow-y-auto space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-accent/5' : ''}`}
                                    >
                                        {colCards.map((card, index) => (
                                            <Draggable key={card.id} draggableId={card.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={{
                                                            borderRadius: 'var(--radius-sm)',
                                                            ...provided.draggableProps.style,
                                                            zIndex: snapshot.isDragging ? 9999 : 'auto'
                                                        }}
                                                        onClick={() => onCardClick(card)}
                                                        className={`group cursor-grab overflow-hidden border bg-bg-primary/95 p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.1)] backdrop-blur-md transition-colors transition-shadow active:cursor-grabbing hover:border-accent ${snapshot.isDragging ? 'border-accent shadow-[0_12px_24px_-4px_rgba(0,0,0,0.6)]' : 'border-border'}`}
                                                    >
                                                        <div className="flex items-start justify-between mb-2">
                                                            <h4 className="font-semibold text-text-primary text-sm leading-tight text-balance">{card.title}</h4>
                                                            <div className="text-text-muted/30 group-hover:text-text-muted transition-colors opacity-0 group-hover:opacity-100">
                                                                <GripVertical size={16} />
                                                            </div>
                                                        </div>

                                                        {card.value > 0 && (
                                                            <div className="font-bold text-success text-sm mb-3">
                                                                R$ {card.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-between text-xs mt-auto pt-3 border-t border-border/50">
                                                            <div className="flex items-center gap-2 text-text-secondary truncate">
                                                                <div className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-[10px] shrink-0">
                                                                    {card.cliente.nome.charAt(0)}
                                                                </div>
                                                                <span className="truncate">{card.cliente.nome.split(' ')[0]}</span>
                                                            </div>

                                                            {card.probability > 0 && (
                                                                <Badge variant={card.probability > 70 ? "success" : card.probability > 30 ? "warning" : "muted"} className="text-[10px] px-1.5 py-0">
                                                                    {card.probability}%
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
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

                <div className="group flex h-16 min-w-[280px] max-w-[280px] cursor-pointer flex-col items-center justify-center border-2 border-dashed border-border bg-bg-secondary/20 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary sm:min-w-[320px] sm:max-w-[320px]" style={{ borderRadius: 'var(--radius-md)' }}>
                    <span className="flex items-center text-sm font-medium gap-2"><Plus size={16} className="group-hover:scale-110 group-hover:text-accent transition-transform" /> Novo Estágio</span>
                </div>
            </div>
        </DragDropContext>
    );
}
