"use client";

import { useState, useMemo, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Plus, Upload, RefreshCw, Loader2, ScrollText, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { deleteMovimentacao } from "@/actions/processos";
import { importDocumentoAction } from "@/actions/documentos";
import type { EventoTimeline, TimelineStats } from "@/lib/dal/timeline";
import type { TipoEvento } from "@/lib/dal/timeline";
import { TimelineStatsBar } from "./timeline-stats-bar";
import { TimelineFilters, filtrosToTipos, filtrosToDates, type FiltrosAtivos } from "./timeline-filters";
import { TimelineEventCard } from "./timeline-event-card";
import { TimelineGroupHeader, getGrupoLabel } from "./timeline-group-header";
import { TimelineAddEvent } from "./timeline-add-event";

const POR_PAGINA = 20;

const GRUPOS_TIPO_MAP: Record<string, TipoEvento[]> = {
    Judiciais: ["ANDAMENTO_JUDICIAL", "PUBLICACAO", "DESPACHO", "SENTENCA", "DECISAO", "JUNTADA", "CONCLUSAO"],
    Prazos: ["PRAZO_CRIADO", "PRAZO_VENCIDO", "PRAZO_CONCLUIDO"],
    "Audiências": ["AUDIENCIA_AGENDADA", "AUDIENCIA_REALIZADA"],
    Documentos: ["DOCUMENTO_ANEXADO", "DOCUMENTO_PUBLICADO"],
    Internos: ["REUNIAO_CLIENTE", "CONTATO_TELEFONICO", "EMAIL_ENVIADO", "ANOTACAO_INTERNA", "MANUAL"],
};

interface Advogado {
    id: string;
    user: { name: string | null };
}

interface Props {
    processoId: string;
    processoNumeroCnj: string | null;
    eventos: EventoTimeline[];
    stats: TimelineStats;
    advogados: Advogado[];
    uploadInputRef: React.RefObject<HTMLInputElement | null>;
    uploadingDocumento?: boolean;
    uploadFeedback?: { tone: "success" | "error" | "warning"; message: string } | null;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function TimelineFeed({
    processoId,
    processoNumeroCnj,
    eventos,
    stats,
    advogados,
    uploadInputRef,
    uploadingDocumento,
    uploadFeedback,
    onUpload,
}: Props) {
    const router = useRouter();
    const [, startTransition] = useTransition();

    // Modals
    const [showAddEvent, setShowAddEvent] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<{ id: string; tabela: string } | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // DataJud sync
    const [syncingDataJud, setSyncingDataJud] = useState(false);
    const [syncResult, setSyncResult] = useState<{ message: string; ok: boolean } | null>(null);

    // Filtros
    const [filtros, setFiltros] = useState<FiltrosAtivos>({ busca: "", grupos: [], periodo: "todos" });

    // Paginação
    const [pagina, setPagina] = useState(1);

    // Filtrar eventos no cliente
    const eventosFiltrados = useMemo(() => {
        let lista = [...eventos];

        // Filtro por busca
        if (filtros.busca.trim()) {
            const q = filtros.busca.toLowerCase();
            lista = lista.filter(
                (e) =>
                    e.titulo.toLowerCase().includes(q) ||
                    e.descricao.toLowerCase().includes(q) ||
                    e.responsavel?.nome.toLowerCase().includes(q)
            );
        }

        // Filtro por tipo/grupo
        if (filtros.grupos.length > 0) {
            const tipos = filtros.grupos.flatMap((g) => GRUPOS_TIPO_MAP[g] ?? []);
            lista = lista.filter((e) => tipos.includes(e.tipo));
        }

        // Filtro por período
        if (filtros.periodo !== "todos") {
            const agora = Date.now();
            const ms: Record<string, number> = { hoje: 86400000, "7d": 7 * 86400000, "30d": 30 * 86400000, "90d": 90 * 86400000 };
            const limite = agora - (ms[filtros.periodo] ?? 0);
            if (filtros.periodo === "hoje") {
                const inicioDia = new Date();
                inicioDia.setHours(0, 0, 0, 0);
                lista = lista.filter((e) => new Date(e.data).getTime() >= inicioDia.getTime());
            } else {
                lista = lista.filter((e) => new Date(e.data).getTime() >= limite);
            }
        }

        return lista;
    }, [eventos, filtros]);

    // Paginação
    const total = eventosFiltrados.length;
    const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    const offset = (pagina - 1) * POR_PAGINA;
    const eventosPagina = eventosFiltrados.slice(offset, offset + POR_PAGINA);

    // Agrupar por período
    const eventosPorGrupo = useMemo(() => {
        const grupos: { label: string; eventos: EventoTimeline[] }[] = [];
        let grupoAtual: string | null = null;

        for (const ev of eventosPagina) {
            const label = getGrupoLabel(new Date(ev.data));
            if (label !== grupoAtual) {
                grupoAtual = label;
                grupos.push({ label, eventos: [] });
            }
            grupos[grupos.length - 1].eventos.push(ev);
        }

        return grupos;
    }, [eventosPagina]);

    async function handleSyncDataJud() {
        setSyncingDataJud(true);
        setSyncResult(null);
        try {
            const res = await fetch(`/api/datajud/sync/${processoId}`, { method: "POST" });
            const data = await res.json();
            setSyncResult({ message: data.message || (res.ok ? "Sincronizado!" : "Falha."), ok: res.ok });
            if (res.ok && data.movimentosCriados > 0) router.refresh();
        } catch {
            setSyncResult({ message: "Erro de conexão com DataJud.", ok: false });
        } finally {
            setSyncingDataJud(false);
        }
    }

    async function handleDelete(id: string, tabela: string) {
        setConfirmDeleteId({ id, tabela });
    }

    async function confirmDelete() {
        if (!confirmDeleteId) return;
        setDeletingId(confirmDeleteId.id);
        await deleteMovimentacao(processoId, confirmDeleteId.id);
        setDeletingId(null);
        setConfirmDeleteId(null);
        router.refresh();
    }

    function handleFiltros(f: FiltrosAtivos) {
        setFiltros(f);
        setPagina(1);
    }

    const totalEventos = eventos.length;

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase text-text-muted">
                        {totalEventos} {totalEventos === 1 ? "evento" : "eventos"} na timeline
                    </span>
                </div>

                {/* Ações */}
                <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setShowAddEvent(true)}>
                        <Plus size={14} /> Adicionar evento
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => uploadInputRef.current?.click()}
                        disabled={uploadingDocumento}
                    >
                        {uploadingDocumento ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        Subir documento
                    </Button>
                    {processoNumeroCnj && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSyncDataJud}
                            disabled={syncingDataJud}
                        >
                            {syncingDataJud ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            Sincronizar DataJud
                        </Button>
                    )}
                </div>

                {/* Sync result */}
                {syncResult && (
                    <div className={`rounded-lg px-3 py-2 text-xs ${syncResult.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                        {syncResult.message}
                    </div>
                )}

                {/* Upload feedback */}
                {uploadFeedback && (
                    <div className={`rounded-lg px-3 py-2 text-xs ${
                        uploadFeedback.tone === "success" ? "bg-success/10 text-success" :
                        uploadFeedback.tone === "warning" ? "bg-warning/10 text-warning" :
                        "bg-danger/10 text-danger"
                    }`}>
                        {uploadFeedback.message}
                    </div>
                )}

                {/* Stats */}
                <TimelineStatsBar stats={stats} />

                {/* Filtros */}
                <TimelineFilters onChange={handleFiltros} />
            </div>

            {/* Timeline */}
            {eventosFiltrados.length === 0 ? (
                <div className="py-16 text-center">
                    <ScrollText size={40} className="mx-auto mb-3 text-text-muted/30" />
                    <p className="text-sm text-text-muted">
                        {totalEventos === 0
                            ? "Nenhum evento registrado neste processo."
                            : "Nenhum evento encontrado com os filtros aplicados."}
                    </p>
                    {totalEventos === 0 && (
                        <Button size="sm" className="mt-4" onClick={() => setShowAddEvent(true)}>
                            <Plus size={14} /> Primeiro evento
                        </Button>
                    )}
                </div>
            ) : (
                <div>
                    {eventosPorGrupo.map((grupo, gi) => (
                        <div key={`${grupo.label}-${gi}`}>
                            <TimelineGroupHeader label={grupo.label} />
                            {grupo.eventos.map((ev, i) => (
                                <TimelineEventCard
                                    key={ev.id}
                                    evento={ev}
                                    isLast={
                                        i === grupo.eventos.length - 1 &&
                                        eventosPorGrupo[eventosPorGrupo.length - 1].label === grupo.label
                                    }
                                    onDelete={handleDelete}
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
                                <button
                                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                                    disabled={pagina === 1}
                                    className="rounded-lg border border-border p-1.5 text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                                    let p = i + 1;
                                    if (totalPaginas > 5 && pagina > 3) p = pagina - 2 + i;
                                    if (p > totalPaginas) return null;
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setPagina(p)}
                                            className={`min-w-[2rem] rounded-lg border px-2 py-1 text-xs font-medium transition-colors ${
                                                pagina === p
                                                    ? "border-accent bg-accent text-white"
                                                    : "border-border text-text-muted hover:text-text-primary"
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                                    disabled={pagina === totalPaginas}
                                    className="rounded-lg border border-border p-1.5 text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal: Add Event */}
            {showAddEvent && (
                <TimelineAddEvent
                    processoId={processoId}
                    advogados={advogados}
                    onClose={() => setShowAddEvent(false)}
                />
            )}

            {/* Modal: Confirm Delete */}
            {confirmDeleteId && (
                <Modal isOpen={true} title="Excluir evento" onClose={() => setConfirmDeleteId(null)}>
                    <p className="text-sm text-text-secondary mb-4">
                        Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={!!deletingId}>
                            {deletingId ? <Loader2 size={14} className="animate-spin" /> : null}
                            Excluir
                        </Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
