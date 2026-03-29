"use client";

import { useState } from "react";
import {
    ChevronDown, ChevronUp, Trash2, ExternalLink,
    Lock, AlertTriangle, Paperclip, Bot, BookOpen,
} from "lucide-react";
import type { EventoTimeline, TipoEvento } from "@/lib/dal/timeline";
import { TimelineEventIcon, getEventoBorderClass, getEventoColor } from "./timeline-event-icon";

// ─── Labels ──────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<TipoEvento, string> = {
    ANDAMENTO_JUDICIAL:  "Judicial",
    PUBLICACAO:          "Publicação",
    DESPACHO:            "Despacho",
    SENTENCA:            "Sentença",
    DECISAO:             "Decisão",
    JUNTADA:             "Juntada",
    CONCLUSAO:           "Conclusão",
    PRAZO_CRIADO:        "Prazo",
    PRAZO_VENCIDO:       "Prazo vencido",
    PRAZO_CONCLUIDO:     "Prazo concluído",
    AUDIENCIA_AGENDADA:  "Audiência",
    AUDIENCIA_REALIZADA: "Audiência realizada",
    DOCUMENTO_ANEXADO:   "Documento",
    DOCUMENTO_PUBLICADO: "Doc. publicado",
    REUNIAO_CLIENTE:     "Reunião",
    CONTATO_TELEFONICO:  "Contato",
    EMAIL_ENVIADO:       "E-mail",
    ANOTACAO_INTERNA:    "Anotação",
    HONORARIO_PAGO:      "Honorário",
    MANUAL:              "Manual",
};

/** Verb shown in the performer chip: "Adv. Luany · realizou reunião" */
const ACTION_VERBS: Record<TipoEvento, string> = {
    ANDAMENTO_JUDICIAL:  "registrou andamento",
    PUBLICACAO:          "registrou publicação",
    DESPACHO:            "registrou despacho",
    SENTENCA:            "proferiu sentença",
    DECISAO:             "proferiu decisão",
    JUNTADA:             "juntou documento",
    CONCLUSAO:           "registrou conclusão",
    PRAZO_CRIADO:        "criou prazo",
    PRAZO_VENCIDO:       "prazo venceu",
    PRAZO_CONCLUIDO:     "concluiu prazo",
    AUDIENCIA_AGENDADA:  "agendou audiência",
    AUDIENCIA_REALIZADA: "realizou audiência",
    DOCUMENTO_ANEXADO:   "anexou documento",
    DOCUMENTO_PUBLICADO: "publicou documento",
    REUNIAO_CLIENTE:     "realizou reunião",
    CONTATO_TELEFONICO:  "fez contato telefônico",
    EMAIL_ENVIADO:       "enviou e-mail",
    ANOTACAO_INTERNA:    "adicionou anotação",
    HONORARIO_PAGO:      "registrou pagamento",
    MANUAL:              "registrou evento",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(nome: string): string {
    const parts = nome.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Generate a deterministic soft color for a user avatar based on their name */
const AVATAR_COLORS = [
    "bg-violet-500/20 text-violet-700",
    "bg-teal-500/20 text-teal-700",
    "bg-blue-500/20 text-blue-700",
    "bg-rose-500/20 text-rose-700",
    "bg-amber-500/20 text-amber-700",
    "bg-emerald-500/20 text-emerald-700",
    "bg-cyan-500/20 text-cyan-700",
    "bg-indigo-500/20 text-indigo-700",
];

function avatarColor(nome: string): string {
    let hash = 0;
    for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Component ───────────────────────────────────────────────────────────────

const DESCRICAO_LIMITE = 220;

interface Props {
    evento: EventoTimeline;
    isLast: boolean;
    onDelete?: (id: string, tabela: string) => void;
}

export function TimelineEventCard({ evento, isLast, onDelete }: Props) {
    const [expandido, setExpandido] = useState(false);
    const [mostrarOriginal, setMostrarOriginal] = useState(false);

    const dataFormatada = new Date(evento.data).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

    const descricaoPrincipal =
        evento.traducao && !mostrarOriginal
            ? evento.traducao.resumoSimplificado
            : evento.descricao;
    const descricaoLonga = descricaoPrincipal.length > DESCRICAO_LIMITE;
    const descricaoExibidaOriginal =
        descricaoLonga && !expandido
            ? evento.descricao.slice(0, DESCRICAO_LIMITE) + "…"
            : evento.descricao;

    const descricaoExibida = evento.traducao
        ? descricaoLonga && !expandido
            ? descricaoPrincipal.slice(0, DESCRICAO_LIMITE) + "..."
            : descricaoPrincipal
        : descricaoExibidaOriginal;

    const borderClass = getEventoBorderClass(evento.tipo);
    const tipoLabel   = TIPO_LABELS[evento.tipo] ?? evento.tipo;
    const actionVerb  = ACTION_VERBS[evento.tipo] ?? "registrou evento";
    const tomClass =
        evento.traducao?.tom === "positivo"
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
            : evento.traducao?.tom === "negativo"
                ? "border-red-500/20 bg-red-500/10 text-red-700"
                : "border-slate-500/20 bg-slate-500/10 text-slate-600";

    const isAutomated = evento.fonte === "DATAJUD" || evento.fonte === "DIARIO_OFICIAL";
    const fonteLabel  = evento.fonte === "DATAJUD" ? "CNJ · DataJud"
                      : evento.fonte === "DIARIO_OFICIAL" ? "Diário Oficial"
                      : null;

    return (
        <div
            className={`
                group relative flex gap-0
                border-l-[3px] ${borderClass}
                hover:bg-bg-tertiary/40 transition-colors
                ${!isLast ? "border-b border-b-border/30" : ""}
            `}
        >
            {/* Icon column */}
            <div className="flex flex-col items-center px-3 pt-3.5 pb-3">
                <TimelineEventIcon tipo={evento.tipo} variant="md" />
            </div>

            {/* Content column */}
            <div className="min-w-0 flex-1 py-3 pr-10">

                {/* ── Row 1: meta badges ── */}
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">

                    {/* Date + time */}
                    <span className="text-[11px] font-medium text-text-muted tabular-nums shrink-0">
                        {dataFormatada}
                    </span>
                    {evento.hora && (
                        <span className="text-[11px] text-text-muted/60 shrink-0">
                            {evento.hora}
                        </span>
                    )}

                    <span className="text-text-muted/30 text-xs">·</span>

                    {/* Type label */}
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${
                        getEventoColor(evento.tipo)
                    }`}>
                        {tipoLabel}
                    </span>

                    {/* Source badge */}
                    {fonteLabel && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-bg-tertiary/60 px-2 py-0.5 text-[10px] font-medium text-text-muted">
                            <Bot size={9} strokeWidth={2} />
                            {fonteLabel}
                        </span>
                    )}

                    {/* Urgente */}
                    {evento.urgente && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/25 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                            <AlertTriangle size={9} /> Urgente
                        </span>
                    )}

                    {/* Privado */}
                    {evento.privado && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                            <Lock size={9} /> Interno
                        </span>
                    )}
                </div>

                {/* ── Row 2: title ── */}
                <p className="text-sm font-semibold text-text-primary leading-snug">
                    {evento.titulo}
                </p>

                {/* ── Row 3: description ── */}
                {evento.descricao && evento.descricao !== evento.titulo && (
                    <div className="mt-1">
                        {evento.traducao && (
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                                    <BookOpen size={10} />
                                    {mostrarOriginal ? "Texto original" : "Leitura simplificada"}
                                </span>
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tomClass}`}>
                                    {evento.traducao.tom}
                                </span>
                                <button
                                    onClick={() => {
                                        setMostrarOriginal((value) => !value);
                                        setExpandido(false);
                                    }}
                                    className="text-[11px] font-medium text-accent hover:underline"
                                >
                                    {mostrarOriginal ? "Ver resumo" : "Ver original"}
                                </button>
                            </div>
                        )}
                        <p className="text-sm text-text-secondary leading-relaxed">
                            {descricaoExibida}
                        </p>
                        {descricaoLonga && (
                            <button
                                onClick={() => setExpandido(!expandido)}
                                className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                            >
                                {expandido
                                    ? <><ChevronUp size={11} /> Mostrar menos</>
                                    : <><ChevronDown size={11} /> Ver mais…</>
                                }
                            </button>
                        )}
                    </div>
                )}

                {/* ── Row 4: performer + document ── */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">

                    {/* Performer chip */}
                    {evento.responsavel ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-bg-secondary/80 px-2.5 py-1">
                            {/* Avatar */}
                            <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${avatarColor(evento.responsavel.nome)}`}>
                                {getInitials(evento.responsavel.nome)}
                            </span>
                            {/* Name + role */}
                            <span className="text-xs font-medium text-text-primary">
                                {evento.responsavel.oab ? "Adv. " : ""}
                                {evento.responsavel.nome}
                            </span>
                            {/* Action verb */}
                            <span className="text-[11px] text-text-muted">
                                · {actionVerb}
                            </span>
                        </div>
                    ) : isAutomated ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-bg-secondary/60 px-2.5 py-1">
                            <Bot size={12} className="text-text-muted" strokeWidth={1.8} />
                            <span className="text-[11px] text-text-muted">
                                {evento.fonte === "DATAJUD" ? "Sincronizado via DataJud" : "Publicação automática"}
                            </span>
                        </div>
                    ) : null}

                    {/* Document link */}
                    {evento.documentoUrl && (
                        <a
                            href={evento.documentoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-bg-secondary/80 px-2.5 py-1 text-xs text-accent hover:underline transition-colors"
                        >
                            <Paperclip size={11} strokeWidth={2} />
                            {evento.documentoNome ?? "Ver documento"}
                            <ExternalLink size={10} />
                        </a>
                    )}
                </div>
            </div>

            {/* Delete button (hover) */}
            {onDelete && evento.entidadeTabela === "movimentacao" && (
                <button
                    onClick={() => onDelete(evento.entidadeId, evento.entidadeTabela)}
                    title="Excluir"
                    className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger transition-all"
                >
                    <Trash2 size={13} />
                </button>
            )}
        </div>
    );
}

// re-export helper so existing imports still work
export { getEventoColor } from "./timeline-event-icon";
