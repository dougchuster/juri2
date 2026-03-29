"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Clock, FileText, Scale } from "lucide-react";

import { moverProcessoKanban } from "@/actions/processos";
import { Badge } from "@/components/ui/badge";
import { getActionErrorMessage } from "@/lib/action-errors";

const STATUS_ORDER = [
    "PROSPECCAO",
    "CONSULTORIA",
    "AJUIZADO",
    "EM_ANDAMENTO",
    "AUDIENCIA_MARCADA",
    "SENTENCA",
    "RECURSO",
    "TRANSITO_JULGADO",
    "EXECUCAO",
    "ENCERRADO",
    "ARQUIVADO",
] as const;

const STATUS_LABELS: Record<(typeof STATUS_ORDER)[number], string> = {
    PROSPECCAO: "Prospeccao",
    CONSULTORIA: "Consultoria",
    AJUIZADO: "Ajuizado",
    EM_ANDAMENTO: "Em andamento",
    AUDIENCIA_MARCADA: "Audiencia",
    SENTENCA: "Sentenca",
    RECURSO: "Recurso",
    TRANSITO_JULGADO: "Transito",
    EXECUCAO: "Execucao",
    ENCERRADO: "Encerrado",
    ARQUIVADO: "Arquivado",
};

const STATUS_VARIANTS: Record<(typeof STATUS_ORDER)[number], "info" | "warning" | "default" | "success" | "danger" | "muted"> = {
    PROSPECCAO: "info",
    CONSULTORIA: "info",
    AJUIZADO: "default",
    EM_ANDAMENTO: "success",
    AUDIENCIA_MARCADA: "warning",
    SENTENCA: "warning",
    RECURSO: "danger",
    TRANSITO_JULGADO: "success",
    EXECUCAO: "default",
    ENCERRADO: "muted",
    ARQUIVADO: "muted",
};

type ProcessoKanbanItem = {
    id: string;
    numeroCnj: string | null;
    tipo: string;
    status: string;
    objeto: string | null;
    cliente: { id: string; nome: string } | null;
    advogado: { id: string; user: { name: string | null } };
    faseProcessual: { id: string; nome: string; cor: string | null } | null;
    _count: { prazos: number; tarefas: number; movimentacoes: number };
    updatedAt: string;
};

interface ProcessosKanbanBoardProps {
    processos: ProcessoKanbanItem[];
}

function groupProcessos(processos: ProcessoKanbanItem[]) {
    const columns = Object.fromEntries(STATUS_ORDER.map((status) => [status, [] as ProcessoKanbanItem[]])) as Record<
        (typeof STATUS_ORDER)[number],
        ProcessoKanbanItem[]
    >;

    processos.forEach((processo) => {
        const status = STATUS_ORDER.includes(processo.status as (typeof STATUS_ORDER)[number])
            ? (processo.status as (typeof STATUS_ORDER)[number])
            : "EM_ANDAMENTO";
        columns[status].push(processo);
    });

    return columns;
}

export function ProcessosKanbanBoard({ processos }: ProcessosKanbanBoardProps) {
    const router = useRouter();
    const [feedback, setFeedback] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const [columns, setColumns] = useState(() => groupProcessos(processos));

    useEffect(() => {
        setColumns(groupProcessos(processos));
    }, [processos]);

    const total = useMemo(
        () => STATUS_ORDER.reduce((sum, status) => sum + columns[status].length, 0),
        [columns]
    );

    function handleDragEnd(result: DropResult) {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const sourceStatus = source.droppableId as (typeof STATUS_ORDER)[number];
        const destinationStatus = destination.droppableId as (typeof STATUS_ORDER)[number];
        const sourceItems = [...columns[sourceStatus]];
        const destinationItems = sourceStatus === destinationStatus ? sourceItems : [...columns[destinationStatus]];
        const [moved] = sourceItems.splice(source.index, 1);
        if (!moved) return;

        const updatedCard = { ...moved, status: destinationStatus };
        destinationItems.splice(destination.index, 0, updatedCard);

        const previous = columns;
        setColumns((current) => ({
            ...current,
            [sourceStatus]: sourceItems,
            [destinationStatus]: destinationItems,
        }));
        setFeedback(null);

        startTransition(async () => {
            const res = await moverProcessoKanban({ processoId: draggableId, status: destinationStatus });
            if (!res.success) {
                setColumns(previous);
                setFeedback(getActionErrorMessage((res as { error?: unknown }).error, "Nao foi possivel atualizar o status do processo."));
                return;
            }
            router.refresh();
        });
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-border bg-bg-tertiary/30 px-4 py-3">
                <div>
                    <p className="text-sm font-semibold text-text-primary">Kanban de processos</p>
                    <p className="text-xs text-text-muted">
                        Arraste os cards entre colunas para atualizar o andamento real da carteira.
                    </p>
                </div>
                <div className="text-xs text-text-secondary">
                    {pending ? "Salvando movimentacao..." : `${total} processos distribuidos por etapa`}
                </div>
            </div>

            {feedback ? (
                <div className="rounded-[18px] border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {feedback}
                </div>
            ) : null}

            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex min-h-[540px] gap-4 overflow-x-auto pb-4">
                    {STATUS_ORDER.map((status) => {
                        const items = columns[status];

                        return (
                            <div key={status} className="glass-card flex min-h-full min-w-[280px] max-w-[280px] flex-col overflow-hidden">
                                <div className="border-b border-border bg-bg-secondary/40 px-4 py-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                                                {STATUS_LABELS[status]}
                                            </p>
                                            <p className="mt-1 text-xs text-text-secondary">{items.length} processos</p>
                                        </div>
                                        <Badge variant={STATUS_VARIANTS[status]}>{items.length}</Badge>
                                    </div>
                                </div>
                                <Droppable droppableId={status}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`flex flex-1 flex-col gap-3 p-3 ${snapshot.isDraggingOver ? "bg-accent/5" : ""}`}
                                        >
                                            {items.map((processo, index) => (
                                                <Draggable key={processo.id} draggableId={processo.id} index={index}>
                                                    {(dragProvided, dragSnapshot) => (
                                                        <div
                                                            ref={dragProvided.innerRef}
                                                            {...dragProvided.draggableProps}
                                                            {...dragProvided.dragHandleProps}
                                                            className={`rounded-[18px] border border-border bg-bg-primary p-4 shadow-sm transition ${
                                                                dragSnapshot.isDragging ? "rotate-[0.4deg] border-accent shadow-xl" : "hover:border-accent/40"
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <Link
                                                                        href={`/processos/${processo.id}`}
                                                                        className="text-sm font-mono text-accent hover:underline"
                                                                    >
                                                                        {processo.numeroCnj || "Sem numero"}
                                                                    </Link>
                                                                    <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
                                                                        {processo.objeto || processo.faseProcessual?.nome || processo.tipo}
                                                                    </p>
                                                                </div>
                                                                <Badge variant={STATUS_VARIANTS[status]} size="sm">
                                                                    {STATUS_LABELS[status]}
                                                                </Badge>
                                                            </div>

                                                            <div className="mt-4 space-y-2 text-xs text-text-muted">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span>Cliente</span>
                                                                    <span className="truncate text-right text-text-primary">
                                                                        {processo.cliente?.nome || "Sem cliente"}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span>Responsavel</span>
                                                                    <span className="truncate text-right text-text-primary">
                                                                        {processo.advogado.user.name || "-"}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="mt-4 flex items-center gap-3 text-xs text-text-muted">
                                                                <span className="flex items-center gap-1" title="Prazos">
                                                                    <Clock size={12} />
                                                                    {processo._count.prazos}
                                                                </span>
                                                                <span className="flex items-center gap-1" title="Tarefas">
                                                                    <Scale size={12} />
                                                                    {processo._count.tarefas}
                                                                </span>
                                                                <span className="flex items-center gap-1" title="Movimentacoes">
                                                                    <FileText size={12} />
                                                                    {processo._count.movimentacoes}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                            {items.length === 0 ? (
                                                <div className="rounded-[18px] border border-dashed border-border px-4 py-8 text-center text-xs text-text-muted">
                                                    Nenhum processo nesta etapa.
                                                </div>
                                            ) : null}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        );
                    })}
                </div>
            </DragDropContext>
        </div>
    );
}
