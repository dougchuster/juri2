"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Eye, ChevronRight, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    TIPO_META,
    STATUS_META,
    PRIORIDADE_META,
    getDateChip,
    formatDataAgendamento,
} from "@/components/agenda/agendamento-meta";
import type { TipoAgendamento, StatusAgendamento, PrioridadeAgendamento } from "@/generated/prisma";
import {
    concluirAgendamento,
    conferirAgendamento,
    marcarVisualizado,
} from "@/actions/agendamento";
import { useRouter } from "next/navigation";
import { AgendamentoConcluirModal } from "@/components/agenda/agendamento-concluir-modal";

export interface AgendamentoCardData {
    id: string;
    tipo: TipoAgendamento;
    status: StatusAgendamento;
    prioridade: PrioridadeAgendamento;
    titulo: string;
    descricao?: string | null;
    dataInicio: string; // ISO
    dataFim?: string | null;
    dataFatal?: string | null;
    diaInteiro: boolean;
    fatal?: boolean | null;
    origemConfianca?: number | null;
    conferido: boolean;
    concluidoEm?: string | null;
    processoId?: string | null;
    processo?: { numeroCnj: string | null; cliente?: { nome: string } | null } | null;
    cliente?: { nome: string } | null;
    responsavel?: {
        user: { name: string | null; avatarUrl?: string | null };
    } | null;
    _count?: { comentarios: number };
    // Para controle de permissao
    canConferir?: boolean;
}

interface Props {
    item: AgendamentoCardData;
    compact?: boolean;
    onEdit?: (id: string) => void;
    className?: string;
}

export function AgendamentoCard({ item, compact, onEdit, className }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showConcluir, setShowConcluir] = useState(false);

    const meta = TIPO_META[item.tipo];
    const statusMeta = STATUS_META[item.status];
    const prioMeta = PRIORIDADE_META[item.prioridade];
    const Icon = meta.icon;

    const dataRef = item.dataFatal ? new Date(item.dataFatal) : new Date(item.dataInicio);
    const chip = getDateChip(dataRef);
    const dataFormatada = formatDataAgendamento(dataRef, item.diaInteiro);

    const isPrazoFatal = item.tipo === "PRAZO_FATAL" || item.tipo === "PRAZO_IA";
    const isConcluido = item.status === "CONCLUIDO" || item.status === "CONFERIDO";

    async function handleConcluir() {
        if (isPrazoFatal) {
            setShowConcluir(true);
            return;
        }
        setLoading(true);
        await concluirAgendamento(item.id);
        setLoading(false);
        router.refresh();
    }

    async function handleConferir() {
        setLoading(true);
        await conferirAgendamento(item.id);
        setLoading(false);
        router.refresh();
    }

    async function handleVisualizar() {
        if (item.status === "PENDENTE") {
            await marcarVisualizado(item.id);
            router.refresh();
        }
        onEdit?.(item.id);
    }

    const chipVariantClass: Record<string, string> = {
        danger: "bg-red-500/15 text-red-400 border-red-500/30",
        warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        info: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        default: "bg-bg-tertiary/60 text-text-secondary border-border",
        muted: "bg-bg-tertiary/40 text-text-muted border-border/50",
    };

    return (
        <>
            <article
                className={cn(
                    "group flex items-start gap-3 glass-card p-3.5 transition-all hover:border-border-hover",
                    isConcluido && "opacity-70",
                    item.status === "VENCIDO" && "border-red-500/30",
                    isPrazoFatal && item.status !== "CONCLUIDO" && item.status !== "CONFERIDO" && "border-l-2 border-l-red-500",
                    className
                )}
            >
                {/* Icone tipo */}
                <div className={cn(
                    "mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
                    meta.bgClass
                )}>
                    <Icon size={16} className={meta.textClass} />
                </div>

                {/* Conteudo */}
                <div className="flex-1 min-w-0 space-y-1">
                    {/* Linha 1: titulo + badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn(
                            "text-sm font-medium text-text-primary truncate max-w-xs",
                            isConcluido && "line-through text-text-muted"
                        )}>
                            {item.titulo}
                        </span>

                        {/* Badge tipo */}
                        <span className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                            meta.badgeClass
                        )}>
                            {item.origemConfianca && (
                                <Sparkles size={9} />
                            )}
                            {meta.label}
                            {item.origemConfianca && ` ${Math.round(item.origemConfianca * 100)}%`}
                        </span>

                        {/* Badge fatal */}
                        {item.fatal && (
                            <span className="inline-flex items-center rounded-md border border-red-500/40 bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                                FATAL
                            </span>
                        )}

                        {/* Badge prioridade (apenas urgente/alta) */}
                        {(item.prioridade === "URGENTE" || item.prioridade === "ALTA") && (
                            <span className={cn(
                                "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                                prioMeta.badgeClass
                            )}>
                                {prioMeta.label}
                            </span>
                        )}

                        {/* Badge status */}
                        <span className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px]",
                            statusMeta.badgeClass
                        )}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dotClass)} />
                            {statusMeta.label}
                        </span>
                    </div>

                    {/* Linha 2: descricao (se nao compact) */}
                    {!compact && item.descricao && (
                        <p className="text-xs text-text-muted line-clamp-1">{item.descricao}</p>
                    )}

                    {/* Linha 3: meta info */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                        {/* Responsavel */}
                        {item.responsavel?.user.name && (
                            <span className="flex items-center gap-1">
                                <span className="h-4 w-4 rounded-full bg-bg-tertiary flex items-center justify-center text-[9px] font-bold text-text-secondary">
                                    {item.responsavel.user.name[0]}
                                </span>
                                {item.responsavel.user.name}
                            </span>
                        )}

                        {/* Separador */}
                        {item.responsavel?.user.name && <span>•</span>}

                        {/* Data */}
                        <span>{dataFormatada}</span>

                        {/* Chip urgencia */}
                        <span className={cn(
                            "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                            chipVariantClass[chip.variant]
                        )}>
                            {chip.label}
                        </span>

                        {/* Link processo */}
                        {item.processoId && item.processo?.numeroCnj && (
                            <>
                                <span>•</span>
                                <Link
                                    href={`/processos/${item.processoId}`}
                                    className="text-accent hover:underline truncate max-w-[120px]"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {item.processo.numeroCnj}
                                </Link>
                            </>
                        )}

                        {/* Cliente */}
                        {(item.processo?.cliente?.nome || item.cliente?.nome) && (
                            <>
                                <span>•</span>
                                <span className="truncate max-w-[100px]">
                                    {item.processo?.cliente?.nome ?? item.cliente?.nome}
                                </span>
                            </>
                        )}

                        {/* Comentarios */}
                        {item._count && item._count.comentarios > 0 && (
                            <>
                                <span>•</span>
                                <span className="flex items-center gap-0.5">
                                    <MessageSquare size={10} />
                                    {item._count.comentarios}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Acoes */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Concluir */}
                    {!isConcluido && item.status !== "CANCELADO" && (
                        <button
                            type="button"
                            disabled={loading}
                            onClick={handleConcluir}
                            title="Concluir"
                            className="rounded-lg p-1.5 text-text-muted hover:bg-green-500/10 hover:text-green-400 transition-colors"
                        >
                            <Check size={15} />
                        </button>
                    )}

                    {/* Conferir */}
                    {item.status === "CONCLUIDO" && !item.conferido && item.canConferir && (
                        <button
                            type="button"
                            disabled={loading}
                            onClick={handleConferir}
                            title="Conferir"
                            className="rounded-lg p-1.5 text-text-muted hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
                        >
                            <Eye size={15} />
                        </button>
                    )}

                    {/* Ver / Editar */}
                    <button
                        type="button"
                        onClick={handleVisualizar}
                        title="Ver detalhes"
                        className="rounded-lg p-1.5 text-text-muted hover:bg-accent/10 hover:text-accent transition-colors"
                    >
                        <ChevronRight size={15} />
                    </button>
                </div>
            </article>

            {/* Modal de conclusao para prazos fatais */}
            <AgendamentoConcluirModal
                isOpen={showConcluir}
                onClose={() => setShowConcluir(false)}
                agendamentoId={item.id}
                tipo={item.tipo}
            />
        </>
    );
}

// Versao compacta para Kanban
export function AgendamentoKanbanCard({ item, onEdit }: { item: AgendamentoCardData; onEdit?: (id: string) => void }) {
    const meta = TIPO_META[item.tipo];
    const Icon = meta.icon;
    const dataRef = item.dataFatal ? new Date(item.dataFatal) : new Date(item.dataInicio);
    const chip = getDateChip(dataRef);

    const chipVariantClass: Record<string, string> = {
        danger: "bg-red-500/15 text-red-400",
        warning: "bg-amber-500/15 text-amber-400",
        info: "bg-blue-500/15 text-blue-400",
        default: "bg-bg-tertiary/60 text-text-secondary",
        muted: "bg-bg-tertiary/40 text-text-muted",
    };

    return (
        <div
            className={cn(
                "glass-card p-3 cursor-pointer transition-all hover:border-border-hover",
                item.tipo === "PRAZO_FATAL" || item.tipo === "PRAZO_IA" ? "border-l-2 border-l-red-500" : "",
            )}
            onClick={() => onEdit?.(item.id)}
        >
            {/* Header */}
            <div className="flex items-start gap-2 mb-2">
                <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg shrink-0", meta.bgClass)}>
                    <Icon size={13} className={meta.textClass} />
                </div>
                <p className="text-xs font-medium text-text-primary line-clamp-2 flex-1">{item.titulo}</p>
            </div>

            {/* Process/client */}
            {(item.processo?.numeroCnj || item.cliente?.nome) && (
                <p className="text-[10px] text-text-muted truncate mb-1.5">
                    {item.processo?.numeroCnj ?? item.cliente?.nome}
                    {item.processo?.cliente?.nome && ` - ${item.processo.cliente.nome}`}
                </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between gap-1">
                <span className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded",
                    chipVariantClass[chip.variant]
                )}>
                    {chip.label}
                </span>

                {item.responsavel?.user.name && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-bg-tertiary text-[9px] font-bold text-text-secondary shrink-0">
                        {item.responsavel.user.name[0]}
                    </span>
                )}
            </div>
        </div>
    );
}
