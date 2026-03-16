"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    X, CheckCircle2, Eye, XCircle, RotateCcw, Trash2,
    MessageSquare, Users, Edit2, Loader2,
    ExternalLink, AlertTriangle, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-fields";
import {
    TIPO_META, STATUS_META, PRIORIDADE_META,
    getDateChip, formatDataAgendamento,
} from "@/components/agenda/agendamento-meta";
import {
    concluirAgendamento,
    conferirAgendamento,
    rejeitarConferencia,
    cancelarAgendamento,
    reabrirAgendamento,
    deleteAgendamento,
    addComentario,
    deleteComentario,
    marcarVisualizado,
} from "@/actions/agendamento";
import type { TipoAgendamento, StatusAgendamento, PrioridadeAgendamento } from "@/generated/prisma";
import Link from "next/link";

// ---- Tipos ----

export interface AgendamentoDetalhe {
    id: string;
    tipo: TipoAgendamento;
    status: StatusAgendamento;
    prioridade: PrioridadeAgendamento;
    titulo: string;
    descricao?: string | null;
    observacoes?: string | null;
    dataInicio: string;
    dataFim?: string | null;
    dataFatal?: string | null;
    dataCortesia?: string | null;
    diaInteiro: boolean;
    fatal?: boolean | null;
    local?: string | null;
    sala?: string | null;
    origemConfianca?: number | null;
    conferido: boolean;
    conferidoEm?: string | null;
    concluidoEm?: string | null;
    comoConcluido?: string | null;
    motivoRejeicao?: string | null;
    canceladoEm?: string | null;
    motivoCancelamento?: string | null;
    processoId?: string | null;
    clienteId?: string | null;
    processo?: { id: string; numeroCnj: string | null; cliente?: { nome: string } | null } | null;
    cliente?: { id: string; nome: string } | null;
    responsavel?: { user: { name: string | null; avatarUrl?: string | null } } | null;
    criadoPor?: { name: string | null } | null;
    conferidoPor?: { name: string | null } | null;
    concluidoPorUser?: { name: string | null } | null;
    observadores?: { id: string; userId: string; usuario: { name: string | null; avatarUrl?: string | null } }[];
    comentarios?: {
        id: string;
        conteudo: string;
        createdAt: string;
        userId: string;
        usuario: { name: string | null; avatarUrl?: string | null };
    }[];
    historicos?: {
        id: string;
        acao: string;
        descricao: string;
        createdAt: string;
        usuario: { name: string | null };
    }[];
}

interface Props {
    item: AgendamentoDetalhe | null;
    isOpen: boolean;
    onClose: () => void;
    canConferir: boolean;
    sessionUserId: string;
    onEdit?: (id: string) => void;
}

type DrawerTab = "info" | "comentarios" | "historico";

export function AgendamentoDrawer({ item, isOpen, onClose, canConferir, sessionUserId, onEdit }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [drawerTab, setDrawerTab] = useState<DrawerTab>("info");
    const [comentario, setComentario] = useState("");
    const [showRejeitar, setShowRejeitar] = useState(false);
    const [showCancelar, setShowCancelar] = useState(false);
    const [showConcluir, setShowConcluir] = useState(false);
    const [motivoRejeicao, setMotivoRejeicao] = useState("");
    const [motivoCancelamento, setMotivoCancelamento] = useState("");
    const [comoConcluido, setComoConcluido] = useState("");
    const [actionError, setActionError] = useState("");

    // Marcar como visualizado ao abrir
    useEffect(() => {
        if (isOpen && item && item.status === "PENDENTE") {
            marcarVisualizado(item.id);
        }
    }, [isOpen, item]);

    if (!item) return null;

    const meta = TIPO_META[item.tipo];
    const statusMeta = STATUS_META[item.status];
    const prioMeta = PRIORIDADE_META[item.prioridade];
    const Icon = meta.icon;
    const dataRef = item.dataFatal ? new Date(item.dataFatal) : new Date(item.dataInicio);
    const chip = getDateChip(dataRef);
    const isPrazoFatal = item.tipo === "PRAZO_FATAL" || item.tipo === "PRAZO_IA";
    const isConcluido = item.status === "CONCLUIDO" || item.status === "CONFERIDO";
    const isCancelado = item.status === "CANCELADO";

    function handleAction(fn: () => Promise<{ success: boolean; error?: string }>) {
        setActionError("");
        startTransition(async () => {
            const res = await fn();
            if (!res.success) { setActionError(res.error ?? "Erro"); return; }
            router.refresh();
            onClose();
        });
    }

    async function handleAddComentario() {
        if (!comentario.trim()) return;
        await addComentario(item!.id, comentario);
        setComentario("");
        router.refresh();
    }

    const chipClass: Record<string, string> = {
        danger: "bg-red-500/15 text-red-400 border-red-500/30",
        warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        info: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        default: "bg-bg-tertiary/60 text-text-secondary border-border",
        muted: "bg-bg-tertiary/40 text-text-muted border-border/50",
    };

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div className={cn(
                "fixed right-0 top-0 z-50 h-full w-full max-w-lg bg-bg-secondary border-l border-border shadow-2xl",
                "flex flex-col transition-transform duration-300 ease-in-out",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>
                {/* Header */}
                <div className={cn(
                    "flex items-start justify-between gap-3 p-4 border-b border-border",
                    isPrazoFatal && !isConcluido ? "border-l-4 border-l-red-500" : ""
                )}>
                    <div className="flex items-start gap-3 min-w-0">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0 mt-0.5", meta.bgClass)}>
                            <Icon size={18} className={meta.textClass} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-text-primary line-clamp-2 leading-tight">
                                {item.titulo}
                            </h2>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", meta.badgeClass)}>
                                    {item.origemConfianca && <Sparkles size={9} className="mr-0.5" />}
                                    {meta.label}
                                </span>
                                {item.fatal && (
                                    <span className="inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                                        <AlertTriangle size={9} /> FATAL
                                    </span>
                                )}
                                <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px]", statusMeta.badgeClass)}>
                                    <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dotClass)} />
                                    {statusMeta.label}
                                </span>
                                {item.prioridade !== "NORMAL" && (
                                    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px]", prioMeta.badgeClass)}>
                                        {prioMeta.label}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors shrink-0 mt-1">
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs internas */}
                <div className="flex items-center gap-0 border-b border-border px-4">
                    {(["info", "comentarios", "historico"] as DrawerTab[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setDrawerTab(t)}
                            className={cn(
                                "px-3 py-2.5 text-xs font-medium border-b-2 transition-colors capitalize",
                                drawerTab === t
                                    ? "border-accent text-accent"
                                    : "border-transparent text-text-muted hover:text-text-primary"
                            )}
                        >
                            {t === "info" ? "Detalhes" : t === "comentarios" ? `Comentarios ${item.comentarios?.length ? `(${item.comentarios.length})` : ""}` : "Historico"}
                        </button>
                    ))}
                </div>

                {/* Conteudo scrollavel */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    {/* --- TAB: INFO --- */}
                    {drawerTab === "info" && (
                        <>
                            {/* Datas */}
                            <div className="glass-card p-3 space-y-2">
                                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Datas</p>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-text-muted">Evento</span>
                                        <p className="text-text-primary font-medium">{formatDataAgendamento(new Date(item.dataInicio), item.diaInteiro)}</p>
                                    </div>
                                    {item.dataFatal && (
                                        <div>
                                            <span className="text-text-muted">Fatal</span>
                                            <p className="text-red-400 font-semibold">
                                                {new Date(item.dataFatal).toLocaleDateString("pt-BR")}
                                            </p>
                                        </div>
                                    )}
                                    {item.dataCortesia && (
                                        <div>
                                            <span className="text-text-muted">Cortesia</span>
                                            <p className="text-text-primary">{new Date(item.dataCortesia).toLocaleDateString("pt-BR")}</p>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-text-muted">Vencimento</span>
                                        <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ml-1", chipClass[chip.variant])}>
                                            {chip.label}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Responsavel + Processo */}
                            <div className="glass-card p-3 space-y-2">
                                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Responsavel</p>
                                {item.responsavel?.user.name && (
                                    <div className="flex items-center gap-2">
                                        <span className="h-7 w-7 rounded-full bg-bg-tertiary flex items-center justify-center text-xs font-bold text-text-secondary">
                                            {item.responsavel.user.name[0]}
                                        </span>
                                        <span className="text-sm text-text-primary">{item.responsavel.user.name}</span>
                                    </div>
                                )}
                                {item.criadoPor?.name && (
                                    <p className="text-xs text-text-muted">Criado por: {item.criadoPor.name}</p>
                                )}
                            </div>

                            {/* Processo / Cliente */}
                            {(item.processo || item.cliente) && (
                                <div className="glass-card p-3 space-y-2">
                                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Vinculo</p>
                                    {item.processo && (
                                        <Link
                                            href={`/processos/${item.processo.id}`}
                                            className="flex items-center gap-2 text-sm text-accent hover:underline"
                                        >
                                            <ExternalLink size={13} />
                                            {item.processo.numeroCnj ?? "Ver processo"}
                                            {item.processo.cliente?.nome && (
                                                <span className="text-text-muted text-xs">— {item.processo.cliente.nome}</span>
                                            )}
                                        </Link>
                                    )}
                                    {item.cliente && !item.processo && (
                                        <p className="text-sm text-text-primary">{item.cliente.nome}</p>
                                    )}
                                </div>
                            )}

                            {/* Local */}
                            {item.local && (
                                <div className="glass-card p-3">
                                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Local</p>
                                    <p className="text-sm text-text-primary">{item.local}{item.sala ? ` — Sala ${item.sala}` : ""}</p>
                                </div>
                            )}

                            {/* Descricao */}
                            {item.descricao && (
                                <div className="glass-card p-3">
                                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Descricao</p>
                                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{item.descricao}</p>
                                </div>
                            )}

                            {/* Como concluido */}
                            {item.comoConcluido && (
                                <div className="glass-card p-3 border-green-500/20">
                                    <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider mb-1">Como foi concluido</p>
                                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{item.comoConcluido}</p>
                                    {item.concluidoEm && (
                                        <p className="text-[10px] text-text-muted mt-1">
                                            em {new Date(item.concluidoEm).toLocaleString("pt-BR")}
                                            {item.concluidoPorUser?.name && ` por ${item.concluidoPorUser.name}`}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Conferencia */}
                            {item.conferido && item.conferidoEm && (
                                <div className="glass-card p-3 border-emerald-500/20">
                                    <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">Conferido</p>
                                    <p className="text-[11px] text-text-muted">
                                        {new Date(item.conferidoEm).toLocaleString("pt-BR")}
                                        {item.conferidoPor?.name && ` por ${item.conferidoPor.name}`}
                                    </p>
                                </div>
                            )}

                            {/* Motivo rejeicao */}
                            {item.motivoRejeicao && (
                                <div className="glass-card p-3 border-red-500/20">
                                    <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1">Rejeitado</p>
                                    <p className="text-sm text-text-secondary">{item.motivoRejeicao}</p>
                                </div>
                            )}

                            {/* Motivo cancelamento */}
                            {item.motivoCancelamento && (
                                <div className="glass-card p-3 border-gray-500/20">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Cancelado</p>
                                    <p className="text-sm text-text-secondary">{item.motivoCancelamento}</p>
                                    {item.canceladoEm && (
                                        <p className="text-[10px] text-text-muted mt-1">em {new Date(item.canceladoEm).toLocaleString("pt-BR")}</p>
                                    )}
                                </div>
                            )}

                            {/* Observadores */}
                            {item.observadores && item.observadores.length > 0 && (
                                <div className="glass-card p-3">
                                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                                        <Users size={10} className="inline mr-1" />
                                        Observadores
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {item.observadores.map((obs) => (
                                            <div key={obs.id} className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-tertiary/40 px-2 py-1">
                                                <span className="h-5 w-5 rounded-full bg-bg-primary flex items-center justify-center text-[9px] font-bold text-text-secondary">
                                                    {obs.usuario.name?.[0] ?? "?"}
                                                </span>
                                                <span className="text-xs text-text-secondary">{obs.usuario.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Subform: confirmar conclusao */}
                            {showConcluir && (
                                <div className="glass-card p-3 border-green-500/20 space-y-3">
                                    <p className="text-xs font-semibold text-green-400">Concluir agendamento</p>
                                    <Textarea
                                        id="dr-concluido"
                                        label={isPrazoFatal ? "Como foi cumprido? *" : "Observacoes (opcional)"}
                                        value={comoConcluido}
                                        onChange={(e) => setComoConcluido(e.target.value)}
                                        rows={2}
                                        placeholder="Descreva brevemente..."
                                    />
                                    <div className="flex gap-2">
                                        <Button size="sm" type="button" onClick={() => {
                                            if (isPrazoFatal && !comoConcluido.trim()) { setActionError("Campo obrigatorio"); return; }
                                            handleAction(() => concluirAgendamento(item.id, comoConcluido || undefined));
                                            setShowConcluir(false);
                                        }}>
                                            Confirmar
                                        </Button>
                                        <Button size="sm" variant="ghost" type="button" onClick={() => setShowConcluir(false)}>
                                            Cancelar
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Subform: rejeitar */}
                            {showRejeitar && (
                                <div className="glass-card p-3 border-red-500/20 space-y-3">
                                    <p className="text-xs font-semibold text-red-400">Rejeitar conferencia</p>
                                    <Textarea
                                        id="dr-rejeitar"
                                        label="Motivo da rejeicao *"
                                        value={motivoRejeicao}
                                        onChange={(e) => setMotivoRejeicao(e.target.value)}
                                        rows={2}
                                        placeholder="Explique o motivo..."
                                    />
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="secondary" type="button" onClick={() => {
                                            if (!motivoRejeicao.trim()) { setActionError("Motivo obrigatorio"); return; }
                                            handleAction(() => rejeitarConferencia(item.id, motivoRejeicao));
                                            setShowRejeitar(false);
                                        }}>
                                            Confirmar rejeicao
                                        </Button>
                                        <Button size="sm" variant="ghost" type="button" onClick={() => setShowRejeitar(false)}>
                                            Cancelar
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Subform: cancelar */}
                            {showCancelar && (
                                <div className="glass-card p-3 border-gray-500/20 space-y-3">
                                    <p className="text-xs font-semibold text-text-muted">Cancelar agendamento</p>
                                    <Textarea
                                        id="dr-cancelar"
                                        label="Motivo do cancelamento *"
                                        value={motivoCancelamento}
                                        onChange={(e) => setMotivoCancelamento(e.target.value)}
                                        rows={2}
                                        placeholder="Informe o motivo..."
                                    />
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="secondary" type="button" onClick={() => {
                                            if (!motivoCancelamento.trim()) { setActionError("Motivo obrigatorio"); return; }
                                            handleAction(() => cancelarAgendamento(item.id, motivoCancelamento));
                                            setShowCancelar(false);
                                        }}>
                                            Confirmar cancelamento
                                        </Button>
                                        <Button size="sm" variant="ghost" type="button" onClick={() => setShowCancelar(false)}>
                                            Cancelar
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {actionError && (
                                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                    {actionError}
                                </p>
                            )}
                        </>
                    )}

                    {/* --- TAB: COMENTARIOS --- */}
                    {drawerTab === "comentarios" && (
                        <div className="space-y-3">
                            {(!item.comentarios || item.comentarios.length === 0) && (
                                <p className="text-sm text-text-muted text-center py-8">Nenhum comentario ainda.</p>
                            )}
                            {item.comentarios?.map((c) => (
                                <div key={c.id} className="glass-card p-3 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="h-6 w-6 rounded-full bg-bg-tertiary flex items-center justify-center text-[10px] font-bold text-text-secondary">
                                                {c.usuario.name?.[0] ?? "?"}
                                            </span>
                                            <span className="text-xs font-medium text-text-primary">{c.usuario.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-text-muted">
                                                {new Date(c.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                            {c.userId === sessionUserId && (
                                                <button
                                                    onClick={() => { deleteComentario(c.id); router.refresh(); }}
                                                    className="text-text-muted hover:text-red-400 transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm text-text-secondary whitespace-pre-wrap pl-8">{c.conteudo}</p>
                                </div>
                            ))}

                            {/* Adicionar comentario */}
                            <div className="space-y-2">
                                <Textarea
                                    id="dr-comentario"
                                    label="Novo comentario"
                                    value={comentario}
                                    onChange={(e) => setComentario(e.target.value)}
                                    rows={2}
                                    placeholder="Adicionar comentario..."
                                />
                                <Button size="sm" type="button" onClick={handleAddComentario} disabled={!comentario.trim()}>
                                    <MessageSquare size={13} /> Comentar
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: HISTORICO --- */}
                    {drawerTab === "historico" && (
                        <div className="space-y-2">
                            {(!item.historicos || item.historicos.length === 0) && (
                                <p className="text-sm text-text-muted text-center py-8">Nenhuma alteracao registrada.</p>
                            )}
                            {item.historicos?.map((h) => (
                                <div key={h.id} className="flex gap-3 text-xs">
                                    <div className="flex flex-col items-center">
                                        <div className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                                        <div className="flex-1 w-px bg-border mt-1" />
                                    </div>
                                    <div className="pb-3">
                                        <p className="text-text-secondary">{h.descricao}</p>
                                        <p className="text-[10px] text-text-muted mt-0.5">
                                            {h.usuario.name} · {new Date(h.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer: acoes */}
                <div className="border-t border-border p-4 space-y-2">
                    {isPending && (
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                            <Loader2 size={13} className="animate-spin" /> Processando...
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        {/* Editar */}
                        {!isCancelado && (
                            <Button size="sm" variant="secondary" type="button" onClick={() => onEdit?.(item.id)}>
                                <Edit2 size={13} /> Editar
                            </Button>
                        )}

                        {/* Concluir */}
                        {!isConcluido && !isCancelado && (
                            <Button size="sm" type="button" onClick={() => setShowConcluir(true)} disabled={isPending}>
                                <CheckCircle2 size={13} /> Concluir
                            </Button>
                        )}

                        {/* Conferir */}
                        {item.status === "CONCLUIDO" && !item.conferido && canConferir && (
                            <Button size="sm" type="button"
                                onClick={() => handleAction(() => conferirAgendamento(item.id))}
                                disabled={isPending}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                <Eye size={13} /> Conferir
                            </Button>
                        )}

                        {/* Rejeitar conferencia */}
                        {item.status === "CONCLUIDO" && !item.conferido && canConferir && (
                            <Button size="sm" variant="secondary" type="button"
                                onClick={() => setShowRejeitar(true)} disabled={isPending}
                            >
                                <XCircle size={13} /> Rejeitar
                            </Button>
                        )}

                        {/* Reabrir */}
                        {(item.status === "CONCLUIDO" || item.status === "VENCIDO") && (
                            <Button size="sm" variant="ghost" type="button"
                                onClick={() => handleAction(() => reabrirAgendamento(item.id))}
                                disabled={isPending}
                            >
                                <RotateCcw size={13} /> Reabrir
                            </Button>
                        )}

                        {/* Cancelar */}
                        {!isCancelado && !isConcluido && (
                            <Button size="sm" variant="ghost" type="button"
                                onClick={() => setShowCancelar(true)} disabled={isPending}
                                className="text-text-muted hover:text-orange-400"
                            >
                                <XCircle size={13} /> Cancelar
                            </Button>
                        )}

                        {/* Excluir */}
                        <Button size="sm" variant="ghost" type="button"
                            onClick={() => handleAction(() => deleteAgendamento(item.id))}
                            disabled={isPending}
                            className="ml-auto text-text-muted hover:text-red-400"
                        >
                            <Trash2 size={13} />
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
