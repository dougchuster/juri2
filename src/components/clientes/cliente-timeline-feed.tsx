"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, ScrollText, ExternalLink, ChevronDown, ChevronUp, AlertTriangle, Lock, Paperclip, Bot } from "lucide-react";
import Link from "next/link";
import type { EventoTimelineCliente, TipoEvento } from "@/lib/dal/timeline";
import { TimelineEventIcon, getEventoColor, getEventoBorderClass } from "@/components/processos/timeline/timeline-event-icon";
import { TimelineGroupHeader, getGrupoLabel } from "@/components/processos/timeline/timeline-group-header";
import { TimelineFilters, type FiltrosAtivos } from "@/components/processos/timeline/timeline-filters";

const TIPO_LABELS: Record<string, string> = {
    ANDAMENTO_JUDICIAL: "Judicial", PUBLICACAO: "Publicação", DESPACHO: "Despacho",
    SENTENCA: "Sentença", DECISAO: "Decisão", JUNTADA: "Juntada", CONCLUSAO: "Conclusão",
    PRAZO_CRIADO: "Prazo", PRAZO_VENCIDO: "Prazo vencido", PRAZO_CONCLUIDO: "Prazo concluído",
    AUDIENCIA_AGENDADA: "Audiência", AUDIENCIA_REALIZADA: "Audiência realizada",
    DOCUMENTO_ANEXADO: "Documento", DOCUMENTO_PUBLICADO: "Doc. publicado",
    REUNIAO_CLIENTE: "Reunião", CONTATO_TELEFONICO: "Contato", EMAIL_ENVIADO: "E-mail",
    ANOTACAO_INTERNA: "Anotação", HONORARIO_PAGO: "Honorário", MANUAL: "Manual",
};

const ACTION_VERBS: Record<string, string> = {
    ANDAMENTO_JUDICIAL: "registrou andamento", PUBLICACAO: "registrou publicação",
    DESPACHO: "registrou despacho", SENTENCA: "proferiu sentença", DECISAO: "proferiu decisão",
    JUNTADA: "juntou documento", CONCLUSAO: "registrou conclusão",
    PRAZO_CRIADO: "criou prazo", PRAZO_VENCIDO: "prazo venceu", PRAZO_CONCLUIDO: "concluiu prazo",
    AUDIENCIA_AGENDADA: "agendou audiência", AUDIENCIA_REALIZADA: "realizou audiência",
    DOCUMENTO_ANEXADO: "anexou documento", DOCUMENTO_PUBLICADO: "publicou documento",
    REUNIAO_CLIENTE: "realizou reunião", CONTATO_TELEFONICO: "fez contato telefônico",
    EMAIL_ENVIADO: "enviou e-mail", ANOTACAO_INTERNA: "adicionou anotação",
    HONORARIO_PAGO: "registrou pagamento", MANUAL: "registrou evento",
};

const DESCRICAO_LIMITE = 200;
const POR_PAGINA = 20;

const GRUPOS_TIPO_MAP: Record<string, string[]> = {
    Judiciais: ["ANDAMENTO_JUDICIAL", "PUBLICACAO", "DESPACHO", "SENTENCA", "DECISAO", "JUNTADA", "CONCLUSAO"],
    Prazos: ["PRAZO_CRIADO", "PRAZO_VENCIDO", "PRAZO_CONCLUIDO"],
    "Audiências": ["AUDIENCIA_AGENDADA", "AUDIENCIA_REALIZADA"],
    Documentos: ["DOCUMENTO_ANEXADO", "DOCUMENTO_PUBLICADO"],
    Internos: ["REUNIAO_CLIENTE", "CONTATO_TELEFONICO", "EMAIL_ENVIADO", "ANOTACAO_INTERNA", "MANUAL"],
};

const AVATAR_COLORS = [
    "bg-violet-500/20 text-violet-700", "bg-teal-500/20 text-teal-700",
    "bg-blue-500/20 text-blue-700",   "bg-rose-500/20 text-rose-700",
    "bg-amber-500/20 text-amber-700", "bg-emerald-500/20 text-emerald-700",
    "bg-cyan-500/20 text-cyan-700",   "bg-indigo-500/20 text-indigo-700",
];

function avatarColor(nome: string): string {
    let hash = 0;
    for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(nome: string): string {
    const parts = nome.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function EventCard({ ev, isLast }: { ev: EventoTimelineCliente; isLast: boolean }) {
    const [expandido, setExpandido] = useState(false);

    const dataFormatada = new Date(ev.data).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "short", year: "numeric",
    });
    const descLonga = ev.descricao.length > DESCRICAO_LIMITE;
    const descExibida = descLonga && !expandido ? ev.descricao.slice(0, DESCRICAO_LIMITE) + "…" : ev.descricao;

    const borderClass   = getEventoBorderClass(ev.tipo as TipoEvento);
    const tipoLabel     = TIPO_LABELS[ev.tipo] ?? ev.tipo;
    const actionVerb    = ACTION_VERBS[ev.tipo] ?? "registrou evento";
    const isAutomated   = ev.fonte === "DATAJUD" || ev.fonte === "DIARIO_OFICIAL";
    const fonteLabel    = ev.fonte === "DATAJUD" ? "CNJ · DataJud" : ev.fonte === "DIARIO_OFICIAL" ? "Diário Oficial" : null;

    return (
        <div className={`
            group relative flex gap-0
            border-l-[3px] ${borderClass}
            hover:bg-bg-tertiary/40 transition-colors
            ${!isLast ? "border-b border-b-border/30" : ""}
        `}>
            {/* Icon */}
            <div className="flex flex-col items-center px-3 pt-3.5 pb-3">
                <TimelineEventIcon tipo={ev.tipo as TipoEvento} variant="md" />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 py-3 pr-4">
                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className="text-[11px] font-medium text-text-muted tabular-nums shrink-0">{dataFormatada}</span>
                    {ev.hora && <span className="text-[11px] text-text-muted/60 shrink-0">{ev.hora}</span>}
                    <span className="text-text-muted/30 text-xs">·</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${getEventoColor(ev.tipo as TipoEvento)}`}>
                        {tipoLabel}
                    </span>
                    {fonteLabel && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-bg-tertiary/60 px-2 py-0.5 text-[10px] font-medium text-text-muted">
                            <Bot size={9} strokeWidth={2} />{fonteLabel}
                        </span>
                    )}
                    {ev.urgente && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/25 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                            <AlertTriangle size={9} /> Urgente
                        </span>
                    )}
                    {ev.privado && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                            <Lock size={9} /> Interno
                        </span>
                    )}
                </div>

                {/* Title */}
                <p className="text-sm font-semibold text-text-primary leading-snug">{ev.titulo}</p>

                {/* Description */}
                {ev.descricao && ev.descricao !== ev.titulo && (
                    <div className="mt-1">
                        <p className="text-sm text-text-secondary leading-relaxed">{descExibida}</p>
                        {descLonga && (
                            <button onClick={() => setExpandido(!expandido)} className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline">
                                {expandido ? <><ChevronUp size={11} /> Mostrar menos</> : <><ChevronDown size={11} /> Ver mais…</>}
                            </button>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {/* Processo badge */}
                    <Link
                        href={`/processos/${ev.processoId}`}
                        className="inline-flex items-center gap-1 rounded-full bg-accent/8 border border-accent/20 px-2.5 py-1 text-[10px] font-medium text-accent hover:bg-accent/15 transition-colors"
                    >
                        {ev.processoLabel}
                        <ExternalLink size={9} />
                    </Link>

                    {/* Performer chip */}
                    {ev.responsavel ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-bg-secondary/80 px-2.5 py-1">
                            <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${avatarColor(ev.responsavel.nome)}`}>
                                {getInitials(ev.responsavel.nome)}
                            </span>
                            <span className="text-xs font-medium text-text-primary">
                                {ev.responsavel.oab ? "Adv. " : ""}{ev.responsavel.nome}
                            </span>
                            <span className="text-[11px] text-text-muted">· {actionVerb}</span>
                        </div>
                    ) : isAutomated ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-bg-secondary/60 px-2.5 py-1">
                            <Bot size={12} className="text-text-muted" strokeWidth={1.8} />
                            <span className="text-[11px] text-text-muted">
                                {ev.fonte === "DATAJUD" ? "Sincronizado via DataJud" : "Publicação automática"}
                            </span>
                        </div>
                    ) : null}

                    {/* Document link */}
                    {ev.documentoUrl && (
                        <a href={ev.documentoUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-bg-secondary/80 px-2.5 py-1 text-xs text-accent hover:underline">
                            <Paperclip size={11} strokeWidth={2} />
                            {ev.documentoNome ?? "Ver documento"}
                            <ExternalLink size={10} />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

interface Props {
    eventos: EventoTimelineCliente[];
    totalProcessos: number;
}

export function ClienteTimelineFeed({ eventos, totalProcessos }: Props) {
    const [filtros, setFiltros] = useState<FiltrosAtivos>({ busca: "", grupos: [], periodo: "todos" });
    const [pagina, setPagina] = useState(1);

    const eventosFiltrados = useMemo(() => {
        let lista = [...eventos];

        if (filtros.busca.trim()) {
            const q = filtros.busca.toLowerCase();
            lista = lista.filter(
                (e) => e.titulo.toLowerCase().includes(q) || e.descricao.toLowerCase().includes(q) || (e as EventoTimelineCliente).processoLabel.toLowerCase().includes(q)
            );
        }

        if (filtros.grupos.length > 0) {
            const tipos = filtros.grupos.flatMap((g) => GRUPOS_TIPO_MAP[g] ?? []);
            lista = lista.filter((e) => tipos.includes(e.tipo));
        }

        if (filtros.periodo !== "todos") {
            const agora = Date.now();
            const ms: Record<string, number> = { "7d": 7 * 86400000, "30d": 30 * 86400000, "90d": 90 * 86400000 };
            if (filtros.periodo === "hoje") {
                const inicioDia = new Date(); inicioDia.setHours(0, 0, 0, 0);
                lista = lista.filter((e) => new Date(e.data).getTime() >= inicioDia.getTime());
            } else {
                lista = lista.filter((e) => new Date(e.data).getTime() >= agora - (ms[filtros.periodo] ?? 0));
            }
        }

        return lista;
    }, [eventos, filtros]);

    const total = eventosFiltrados.length;
    const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    const offset = (pagina - 1) * POR_PAGINA;
    const paginados = eventosFiltrados.slice(offset, offset + POR_PAGINA);

    // Agrupar
    const grupos = useMemo(() => {
        const result: { label: string; eventos: EventoTimelineCliente[] }[] = [];
        let grupoAtual: string | null = null;
        for (const ev of paginados) {
            const label = getGrupoLabel(new Date(ev.data));
            if (label !== grupoAtual) { grupoAtual = label; result.push({ label, eventos: [] }); }
            result[result.length - 1].eventos.push(ev);
        }
        return result;
    }, [paginados]);

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase text-text-muted">
                        {total} eventos em {totalProcessos} processo{totalProcessos !== 1 ? "s" : ""}
                    </span>
                </div>
                <TimelineFilters onChange={(f) => { setFiltros(f); setPagina(1); }} />
            </div>

            {/* Lista */}
            {paginados.length === 0 ? (
                <div className="py-16 text-center">
                    <ScrollText size={40} className="mx-auto mb-3 text-text-muted/30" />
                    <p className="text-sm text-text-muted">
                        {total === 0 ? "Nenhum evento registrado nos processos deste cliente." : "Nenhum evento encontrado com os filtros aplicados."}
                    </p>
                </div>
            ) : (
                <div>
                    {grupos.map((grupo, gi) => (
                        <div key={`${grupo.label}-${gi}`}>
                            <TimelineGroupHeader label={grupo.label} />
                            {grupo.eventos.map((ev, i) => (
                                <EventCard
                                    key={ev.id}
                                    ev={ev}
                                    isLast={i === grupo.eventos.length - 1 && grupos[grupos.length - 1].label === grupo.label}
                                />
                            ))}
                        </div>
                    ))}

                    {/* Paginação */}
                    {totalPaginas > 1 && (
                        <div className="flex items-center justify-between border-t border-border px-4 py-3">
                            <span className="text-xs text-text-muted">
                                Exibindo {offset + 1}–{Math.min(offset + POR_PAGINA, total)} de {total}
                            </span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1}
                                    className="rounded-lg border border-border p-1.5 text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors">
                                    <ChevronLeft size={14} />
                                </button>
                                {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                                    let p = i + 1;
                                    if (totalPaginas > 5 && pagina > 3) p = pagina - 2 + i;
                                    if (p > totalPaginas) return null;
                                    return (
                                        <button key={p} onClick={() => setPagina(p)}
                                            className={`min-w-[2rem] rounded-lg border px-2 py-1 text-xs font-medium transition-colors ${pagina === p ? "border-accent bg-accent text-white" : "border-border text-text-muted hover:text-text-primary"}`}>
                                            {p}
                                        </button>
                                    );
                                })}
                                <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                                    className="rounded-lg border border-border p-1.5 text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors">
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
