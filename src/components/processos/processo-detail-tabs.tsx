"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
    ScrollText, Gavel, FileText, DollarSign, Users,
    Plus, Loader2, Trash2, CheckCircle, CalendarClock, Upload, ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
    addMovimentacaoComDocumento, deleteMovimentacao,
    addParte, deleteParte,
    addAudiencia, toggleAudienciaRealizada, deleteAudiencia,
    addPrazo, concluirPrazo, deletePrazo,
    addDocumento, deleteDocumento,
} from "@/actions/processos";
import { importDocumentoAction } from "@/actions/documentos";
import { TimelineFeed } from "@/components/processos/timeline/timeline-feed";
import type { EventoTimeline, TimelineStats } from "@/lib/dal/timeline";

// ==========================
// Types
// ==========================

interface AdvOption {
    id: string;
    user: { name: string | null };
}

interface ProcessoDetail {
    id: string;
    advogadoId: string;
    movimentacoes: Array<{ id: string; data: string; descricao: string; tipo: string | null; fonte: string | null }>;
    prazos: Array<{ id: string; descricao: string; dataFatal: string; dataCortesia: string | null; status: string; fatal: boolean; tipoContagem: string; advogado: { user: { name: string | null } } }>;
    audiencias: Array<{ id: string; tipo: string; data: string; local: string | null; sala: string | null; realizada: boolean; advogado: { user: { name: string | null } } }>;
    documentos: Array<{
        id: string;
        titulo: string;
        categoria: string | null;
        arquivoNome: string | null;
        arquivoUrl: string | null;
        statusFluxo: "RASCUNHO" | "EM_REVISAO" | "APROVADA" | "PUBLICADA";
        versao: number;
        createdAt: string;
    }>;
    honorarios: Array<{ id: string; tipo: string; status: string; valorTotal: unknown; cliente: { nome: string } }>;
    partes: Array<{ id: string; tipoParte: string; nome: string | null; cpfCnpj: string | null; advogado: string | null }>;
}

interface DocumentoMovimentacaoOption {
    id: string;
    titulo: string;
    arquivoNome: string | null;
    processoId: string | null;
    updatedAt: string;
}

const DOCUMENTO_STATUS_LABELS: Record<ProcessoDetail["documentos"][number]["statusFluxo"], string> = {
    RASCUNHO: "Rascunho",
    EM_REVISAO: "Em revisao",
    APROVADA: "Aprovada",
    PUBLICADA: "Publicada",
};
const DOCUMENTO_STATUS_VARIANTS: Record<ProcessoDetail["documentos"][number]["statusFluxo"], "muted" | "warning" | "info" | "success"> = {
    RASCUNHO: "muted",
    EM_REVISAO: "warning",
    APROVADA: "info",
    PUBLICADA: "success",
};

const tabs = [
    { id: "movimentacoes", label: "Movimentações", icon: ScrollText },
    { id: "prazos", label: "Prazos", icon: CalendarClock },
    { id: "audiencias", label: "Audiências", icon: Gavel },
    { id: "documentos", label: "Documentos", icon: FileText },
    { id: "honorarios", label: "Honorários", icon: DollarSign },
    { id: "partes", label: "Partes", icon: Users },
] as const;

type TabId = (typeof tabs)[number]["id"];

const PRAZO_COLORS: Record<string, string> = { PENDENTE: "warning", CONCLUIDO: "success", VENCIDO: "danger" };
const PRAZO_LABELS: Record<string, string> = { PENDENTE: "Pendente", CONCLUIDO: "Concluído", VENCIDO: "Vencido" };
const TIPO_PARTE_LABELS: Record<string, string> = {
    AUTOR: "Autor", REU: "Réu", TERCEIRO: "Terceiro",
    TESTEMUNHA: "Testemunha", PERITO: "Perito", ASSISTENTE_TECNICO: "Assistente Técnico",
};
const TIPO_AUDIENCIA_LABELS: Record<string, string> = {
    CONCILIACAO: "Conciliação", INSTRUCAO: "Instrução", JULGAMENTO: "Julgamento",
    UNA: "Una", OUTRA: "Outra",
};

// ==========================
// Main Component
// ==========================

export function ProcessoDetailTabs({
    processo,
    advogados,
    documentosDisponiveis,
    timelineEventos,
    timelineStats,
}: {
    processo: ProcessoDetail;
    advogados: AdvOption[];
    documentosDisponiveis: DocumentoMovimentacaoOption[];
    timelineEventos: EventoTimeline[];
    timelineStats: TimelineStats;
}) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabId>("movimentacoes");

    // Modal states
    const [showAddParte, setShowAddParte] = useState(false);
    const [showAddAudiencia, setShowAddAudiencia] = useState(false);
    const [showAddPrazo, setShowAddPrazo] = useState(false);
    const [showAddDoc, setShowAddDoc] = useState(false);

    // Loading / deleting
    const [loading, setLoading] = useState(false);
    const [uploadingDocumento, setUploadingDocumento] = useState(false);
    const [deletingId, setDeletingId] = useState<{ type: string; id: string } | null>(null);
    const [uploadFeedback, setUploadFeedback] = useState<{ tone: "success" | "error" | "warning"; message: string } | null>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null);

    const documentosPublicados = processo.documentos.filter((item) => item.statusFluxo === "PUBLICADA").length;
    const documentosMovimentacaoOptions = documentosDisponiveis.map((documento) => ({
        value: documento.id,
        label: documento.processoId === processo.id
            ? `${documento.titulo} (ja vinculado)`
            : documento.arquivoNome
                ? `${documento.titulo} - ${documento.arquivoNome}`
                : documento.titulo,
    }));

    // ==========================
    // Generic delete handler
    // ==========================
    async function handleDelete() {
        if (!deletingId) return;
        setLoading(true);
        const { type, id } = deletingId;
        if (type === "movimentacao") await deleteMovimentacao(processo.id, id);
        if (type === "parte") await deleteParte(processo.id, id);
        if (type === "audiencia") await deleteAudiencia(processo.id, id);
        if (type === "prazo") await deletePrazo(processo.id, id);
        if (type === "documento") await deleteDocumento(processo.id, id);
        setLoading(false);
        setDeletingId(null);
        router.refresh();
    }

    async function handleProcessDocumentUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadFeedback(null);
        setUploadingDocumento(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("processoId", processo.id);

            const result = await importDocumentoAction(formData);
            if (!result.success) {
                setUploadFeedback({
                    tone: "error",
                    message: typeof result.error === "string" ? result.error : "Nao foi possivel subir o documento.",
                });
                return;
            }

            setUploadFeedback({
                tone: result.warning ? "warning" : "success",
                message: result.warning || `${file.name} vinculado ao processo e enviado para a biblioteca.`,
            });
            setActiveTab("documentos");
            router.refresh();
        } catch (error) {
            setUploadFeedback({
                tone: "error",
                message: error instanceof Error ? error.message : "Falha inesperada no upload.",
            });
        } finally {
            if (uploadInputRef.current) uploadInputRef.current.value = "";
            setUploadingDocumento(false);
        }
    }

    // ==========================
    // Add Parte
    // ==========================
    async function handleAddParte(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const f = new FormData(e.currentTarget);
        await addParte(processo.id, {
            tipoParte: f.get("tipoParte") as "AUTOR" | "REU",
            clienteId: f.get("clienteId") as string,
            nome: f.get("nome") as string,
            cpfCnpj: f.get("cpfCnpj") as string,
            advogado: f.get("advogado") as string,
        });
        setLoading(false);
        setShowAddParte(false);
        router.refresh();
    }

    // ==========================
    // Add Audiencia
    // ==========================
    async function handleAddAudiencia(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const f = new FormData(e.currentTarget);
        await addAudiencia(processo.id, {
            tipo: f.get("tipo") as "CONCILIACAO" | "INSTRUCAO",
            data: f.get("data") as string,
            advogadoId: f.get("advogadoId") as string,
            local: f.get("local") as string,
            sala: f.get("sala") as string,
            observacoes: f.get("observacoes") as string,
        });
        setLoading(false);
        setShowAddAudiencia(false);
        router.refresh();
    }

    // ==========================
    // Toggle Audiencia Realizada
    // ==========================
    async function handleToggleAudiencia(audienciaId: string, realizada: boolean) {
        await toggleAudienciaRealizada(processo.id, audienciaId, !realizada);
        router.refresh();
    }

    // ==========================
    // Add Prazo
    // ==========================
    async function handleAddPrazo(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const f = new FormData(e.currentTarget);
        await addPrazo(processo.id, {
            descricao: f.get("descricao") as string,
            dataFatal: f.get("dataFatal") as string,
            tipoContagem: f.get("tipoContagem") as "DIAS_UTEIS" | "DIAS_CORRIDOS",
            advogadoId: f.get("advogadoId") as string,
            fatal: f.get("fatal") === "true",
            observacoes: f.get("observacoes") as string,
        });
        setLoading(false);
        setShowAddPrazo(false);
        router.refresh();
    }

    // ==========================
    // Concluir Prazo
    // ==========================
    async function handleConcluirPrazo(prazoId: string) {
        await concluirPrazo(processo.id, prazoId);
        router.refresh();
    }

    // ==========================
    // Add Documento
    // ==========================
    async function handleAddDoc(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const f = new FormData(e.currentTarget);
        await addDocumento(processo.id, {
            titulo: f.get("titulo") as string,
            categoria: f.get("categoria") as string,
            arquivoNome: f.get("arquivoNome") as string,
            arquivoUrl: "",
        });
        setLoading(false);
        setShowAddDoc(false);
        router.refresh();
    }

    return (
        <>
            <input
                ref={uploadInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt"
                onChange={handleProcessDocumentUpload}
            />

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
                {tabs.map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === tab.id ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-secondary"}`}
                    >
                        <tab.icon size={16} />{tab.label}
                        {tab.id === "prazos" && processo.prazos.filter(p => p.status === "PENDENTE").length > 0 && (
                            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-warning/20 text-[10px] font-bold text-warning">
                                {processo.prazos.filter(p => p.status === "PENDENTE").length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="rounded-xl border border-border bg-bg-secondary">

                {/* ============================== */}
                {/* MOVIMENTAÇÕES TAB — TIMELINE   */}
                {/* ============================== */}
                {activeTab === "movimentacoes" && (
                    <TimelineFeed
                        processoId={processo.id}
                        processoNumeroCnj={null}
                        eventos={timelineEventos}
                        stats={timelineStats}
                        advogados={advogados}
                        uploadInputRef={uploadInputRef}
                        uploadingDocumento={uploadingDocumento}
                        uploadFeedback={uploadFeedback}
                        onUpload={handleProcessDocumentUpload}
                    />
                )}

                {/* ============================== */}
                {/* PRAZOS TAB                     */}
                {/* ============================== */}
                {activeTab === "prazos" && (
                    <div>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                            <span className="text-xs font-medium text-text-muted uppercase">{processo.prazos.length} prazos</span>
                            <Button size="sm" variant="secondary" onClick={() => setShowAddPrazo(true)}><Plus size={14} /> Novo Prazo</Button>
                        </div>
                        {processo.prazos.length === 0 ? (
                            <div className="p-8 text-center">
                                <CalendarClock size={40} className="mx-auto text-text-muted/30 mb-3" />
                                <p className="text-sm text-text-muted">Nenhum prazo cadastrado.</p>
                                <Button size="sm" className="mt-3" onClick={() => setShowAddPrazo(true)}><Plus size={14} /> Primeiro Prazo</Button>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead><tr className="border-b border-border bg-bg-tertiary/50">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Descrição</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Data Fatal</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Cortesia</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Responsável</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Ações</th>
                                </tr></thead>
                                <tbody>{processo.prazos.map((p) => (
                                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg-tertiary transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-text-primary">{p.descricao}</span>
                                                {p.fatal && <Badge variant="danger">Fatal</Badge>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-text-secondary">{formatDate(p.dataFatal)}</td>
                                        <td className="px-4 py-3 text-sm font-mono text-text-muted">{p.dataCortesia ? formatDate(p.dataCortesia) : "—"}</td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">{p.advogado.user.name || "—"}</td>
                                        <td className="px-4 py-3"><Badge variant={(PRAZO_COLORS[p.status] || "muted") as "warning" | "success" | "danger"}>{PRAZO_LABELS[p.status] || p.status}</Badge></td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                {p.status === "PENDENTE" && (
                                                    <button onClick={() => handleConcluirPrazo(p.id)} title="Concluir prazo"
                                                        className="rounded-lg p-1.5 text-text-muted hover:text-success transition-colors">
                                                        <CheckCircle size={16} />
                                                    </button>
                                                )}
                                                {!p.fatal && (
                                                    <button onClick={() => setDeletingId({ type: "prazo", id: p.id })}
                                                        className="rounded-lg p-1.5 text-text-muted hover:text-danger transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* ============================== */}
                {/* AUDIÊNCIAS TAB                 */}
                {/* ============================== */}
                {activeTab === "audiencias" && (
                    <div>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                            <span className="text-xs font-medium text-text-muted uppercase">{processo.audiencias.length} audiências</span>
                            <Button size="sm" variant="secondary" onClick={() => setShowAddAudiencia(true)}><Plus size={14} /> Nova Audiência</Button>
                        </div>
                        {processo.audiencias.length === 0 ? (
                            <div className="p-8 text-center">
                                <Gavel size={40} className="mx-auto text-text-muted/30 mb-3" />
                                <p className="text-sm text-text-muted">Nenhuma audiência marcada.</p>
                                <Button size="sm" className="mt-3" onClick={() => setShowAddAudiencia(true)}><Plus size={14} /> Primeira Audiência</Button>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead><tr className="border-b border-border bg-bg-tertiary/50">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Tipo</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Data</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Local</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Advogado</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Ações</th>
                                </tr></thead>
                                <tbody>{processo.audiencias.map((a) => (
                                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-bg-tertiary transition-colors">
                                        <td className="px-4 py-3 text-sm text-text-primary">{TIPO_AUDIENCIA_LABELS[a.tipo] || a.tipo}</td>
                                        <td className="px-4 py-3 text-sm font-mono text-text-secondary">{formatDate(a.data)}</td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">{a.local || "—"}{a.sala ? ` • Sala ${a.sala}` : ""}</td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">{a.advogado.user.name || "—"}</td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => handleToggleAudiencia(a.id, a.realizada)}>
                                                <Badge variant={a.realizada ? "success" : "warning"}>{a.realizada ? "Realizada" : "Agendada"}</Badge>
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => setDeletingId({ type: "audiencia", id: a.id })}
                                                    className="rounded-lg p-1.5 text-text-muted hover:text-danger transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* ============================== */}
                {/* DOCUMENTOS TAB                 */}
                {/* ============================== */}
                {activeTab === "documentos" && (
                    <div>
                        <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-medium text-text-muted uppercase">{processo.documentos.length} documentos</span>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => uploadInputRef.current?.click()} disabled={uploadingDocumento}>
                                        {uploadingDocumento ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                        Upload
                                    </Button>
                                    <Button size="sm" variant="outline" type="button" onClick={() => router.push("/documentos")}>
                                        <ArrowUpRight size={14} />
                                        Biblioteca
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={() => setShowAddDoc(true)}><Plus size={14} /> Novo Documento</Button>
                                </div>
                            </div>
                            <p className="text-xs text-text-muted">
                                Suba o arquivo aqui e ele fica vinculado a este processo e tambem disponivel na pagina de documentos.
                            </p>
                            {uploadFeedback && (
                                <div
                                    className={`rounded-2xl border px-4 py-3 text-sm ${uploadFeedback.tone === "success"
                                        ? "border-success/30 bg-success/10 text-success"
                                        : uploadFeedback.tone === "warning"
                                            ? "border-warning/30 bg-warning/10 text-warning"
                                            : "border-danger/30 bg-danger/10 text-danger"
                                        }`}
                                >
                                    {uploadFeedback.message}
                                </div>
                            )}
                        </div>
                        {processo.documentos.length === 0 ? (
                            <div className="p-8 text-center">
                                <FileText size={40} className="mx-auto text-text-muted/30 mb-3" />
                                <p className="text-sm text-text-muted">Nenhum documento vinculado.</p>
                                <div className="mt-3 flex items-center justify-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => uploadInputRef.current?.click()} disabled={uploadingDocumento}>
                                        {uploadingDocumento ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                        Subir primeiro arquivo
                                    </Button>
                                </div>
                                <Button size="sm" className="mt-3" onClick={() => setShowAddDoc(true)}><Plus size={14} /> Primeiro Documento</Button>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {processo.documentos.map((doc) => (
                                    <div key={doc.id} className="px-4 py-3 flex items-center justify-between hover:bg-bg-tertiary transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                                                <FileText size={16} className="text-accent" />
                                            </div>
                                            <div>
                                                <Link href={`/documentos/${doc.id}`} className="text-sm text-text-primary hover:text-accent hover:underline">
                                                    {doc.titulo}
                                                </Link>
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                                                    {doc.categoria && <span>{doc.categoria}</span>}
                                                    {doc.arquivoNome && <span>{doc.arquivoNome}</span>}
                                                    <span>{formatDate(doc.createdAt)}</span>
                                                    <Badge variant={DOCUMENTO_STATUS_VARIANTS[doc.statusFluxo]}>
                                                        {DOCUMENTO_STATUS_LABELS[doc.statusFluxo]}
                                                    </Badge>
                                                    <span>v{doc.versao}</span>
                                                </div>
                                                <p className="text-xs text-text-muted">{doc.categoria}{doc.arquivoNome ? ` • ${doc.arquivoNome}` : ""} • {formatDate(doc.createdAt)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Link
                                                href={`/documentos/${doc.id}`}
                                                className="rounded-lg p-1.5 text-text-muted transition-all hover:text-accent"
                                                title="Abrir documento"
                                            >
                                                <ArrowUpRight size={14} />
                                            </Link>
                                            <button onClick={() => setDeletingId({ type: "documento", id: doc.id })}
                                                className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-text-muted hover:text-danger transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ============================== */}
                {/* HONORÁRIOS TAB                 */}
                {/* ============================== */}
                {activeTab === "honorarios" && (
                    <div>
                        {processo.honorarios.length === 0 ? (
                            <div className="p-8 text-center">
                                <DollarSign size={40} className="mx-auto text-text-muted/30 mb-3" />
                                <p className="text-sm text-text-muted">Nenhum honorário cadastrado.</p>
                                <p className="text-xs text-text-muted mt-1">Honorários serão gerenciados no módulo Financeiro.</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead><tr className="border-b border-border bg-bg-tertiary/50">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Tipo</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Cliente</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Valor</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Status</th>
                                </tr></thead>
                                <tbody>{processo.honorarios.map((h) => (
                                    <tr key={h.id} className="border-b border-border last:border-0 hover:bg-bg-tertiary transition-colors">
                                        <td className="px-4 py-3 text-sm text-text-primary">{h.tipo}</td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">{h.cliente.nome}</td>
                                        <td className="px-4 py-3 text-sm font-mono text-text-primary">{formatCurrency(Number(h.valorTotal))}</td>
                                        <td className="px-4 py-3"><Badge variant={h.status === "ATIVO" ? "success" : "muted"}>{h.status}</Badge></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* ============================== */}
                {/* PARTES TAB                     */}
                {/* ============================== */}
                {activeTab === "partes" && (
                    <div>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                            <span className="text-xs font-medium text-text-muted uppercase">{processo.partes.length} partes</span>
                            <Button size="sm" variant="secondary" onClick={() => setShowAddParte(true)}><Plus size={14} /> Nova Parte</Button>
                        </div>
                        {processo.partes.length === 0 ? (
                            <div className="p-8 text-center">
                                <Users size={40} className="mx-auto text-text-muted/30 mb-3" />
                                <p className="text-sm text-text-muted">Nenhuma parte cadastrada.</p>
                                <Button size="sm" className="mt-3" onClick={() => setShowAddParte(true)}><Plus size={14} /> Primeira Parte</Button>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead><tr className="border-b border-border bg-bg-tertiary/50">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Nome</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">CPF/CNPJ</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Tipo</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Advogado</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Ações</th>
                                </tr></thead>
                                <tbody>{processo.partes.map((p) => (
                                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg-tertiary transition-colors">
                                        <td className="px-4 py-3 text-sm text-text-primary">{p.nome || "—"}</td>
                                        <td className="px-4 py-3 text-sm font-mono text-text-muted">{p.cpfCnpj || "—"}</td>
                                        <td className="px-4 py-3"><Badge variant="default">{TIPO_PARTE_LABELS[p.tipoParte] || p.tipoParte}</Badge></td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">{p.advogado || "—"}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end">
                                                <button onClick={() => setDeletingId({ type: "parte", id: p.id })}
                                                    className="rounded-lg p-1.5 text-text-muted hover:text-danger transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* ============================== */}
            {/* MODAIS                         */}
            {/* ============================== */}

            {/* Add Parte Modal */}
            <Modal isOpen={showAddParte} onClose={() => setShowAddParte(false)} title="Nova Parte do Processo" size="md">
                <form onSubmit={handleAddParte} className="space-y-4">
                    <Select id="parte-tipo" name="tipoParte" label="Tipo de Parte *" required
                        options={[
                            { value: "AUTOR", label: "Autor" },
                            { value: "REU", label: "Réu" },
                            { value: "TERCEIRO", label: "Terceiro Interessado" },
                            { value: "TESTEMUNHA", label: "Testemunha" },
                            { value: "PERITO", label: "Perito" },
                            { value: "ASSISTENTE_TECNICO", label: "Assistente Técnico" },
                        ]}
                    />
                    <Input id="parte-nome" name="nome" label="Nome *" placeholder="Nome da parte" required />
                    <Input id="parte-cpfCnpj" name="cpfCnpj" label="CPF/CNPJ" placeholder="000.000.000-00" />
                    <Input id="parte-advogado" name="advogado" label="Advogado da Parte" placeholder="Nome do advogado (parte adversa)" />
                    <input type="hidden" name="clienteId" value="" />
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowAddParte(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <><Loader2 size={16} className="animate-spin" />Salvando...</> : "Adicionar Parte"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Add Audiência Modal */}
            <Modal isOpen={showAddAudiencia} onClose={() => setShowAddAudiencia(false)} title="Nova Audiência" size="md">
                <form onSubmit={handleAddAudiencia} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Select id="aud-tipo" name="tipo" label="Tipo *" required
                            options={[
                                { value: "CONCILIACAO", label: "Conciliação" },
                                { value: "INSTRUCAO", label: "Instrução" },
                                { value: "JULGAMENTO", label: "Julgamento" },
                                { value: "UNA", label: "Una" },
                                { value: "OUTRA", label: "Outra" },
                            ]}
                        />
                        <Input id="aud-data" name="data" label="Data e Hora *" type="datetime-local" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Select id="aud-advogado" name="advogadoId" label="Advogado *" required placeholder="Selecionar"
                            defaultValue={processo.advogadoId}
                            options={advogados.map(a => ({ value: a.id, label: a.user.name || "—" }))}
                        />
                        <Input id="aud-local" name="local" label="Local" placeholder="Vara / Tribunal" />
                    </div>
                    <Input id="aud-sala" name="sala" label="Sala" placeholder="Número da sala" />
                    <Textarea id="aud-obs" name="observacoes" label="Observações" rows={2} placeholder="Observações adicionais..." />
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowAddAudiencia(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <><Loader2 size={16} className="animate-spin" />Salvando...</> : "Agendar Audiência"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Add Prazo Modal */}
            <Modal isOpen={showAddPrazo} onClose={() => setShowAddPrazo(false)} title="Novo Prazo" size="md">
                <form onSubmit={handleAddPrazo} className="space-y-4">
                    <Textarea id="prazo-desc" name="descricao" label="Descrição *" required rows={2} placeholder="Ex: Contestação, Recurso..." />
                    <div className="grid grid-cols-2 gap-4">
                        <Input id="prazo-data" name="dataFatal" label="Data Fatal *" type="date" required />
                        <Select id="prazo-contagem" name="tipoContagem" label="Tipo de Contagem" defaultValue="DIAS_UTEIS"
                            options={[
                                { value: "DIAS_UTEIS", label: "Dias Úteis" },
                                { value: "DIAS_CORRIDOS", label: "Dias Corridos" },
                            ]}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Select id="prazo-advogado" name="advogadoId" label="Responsável *" required placeholder="Selecionar"
                            defaultValue={processo.advogadoId}
                            options={advogados.map(a => ({ value: a.id, label: a.user.name || "—" }))}
                        />
                        <Select id="prazo-fatal" name="fatal" label="Prazo Fatal?" defaultValue="true"
                            options={[
                                { value: "true", label: "Sim — Fatal" },
                                { value: "false", label: "Não — Ordinário" },
                            ]}
                        />
                    </div>
                    <Textarea id="prazo-obs" name="observacoes" label="Observações" rows={2} />
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowAddPrazo(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <><Loader2 size={16} className="animate-spin" />Salvando...</> : "Criar Prazo"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Add Documento Modal */}
            <Modal isOpen={showAddDoc} onClose={() => setShowAddDoc(false)} title="Novo Documento" size="md">
                <form onSubmit={handleAddDoc} className="space-y-4">
                    <Input id="doc-titulo" name="titulo" label="Título *" required placeholder="Ex: Petição Inicial, Procuração..." />
                    <Select id="doc-categoria" name="categoria" label="Categoria *" required placeholder="Selecionar"
                        options={[
                            { value: "Petição", label: "Petição" },
                            { value: "Contrato", label: "Contrato" },
                            { value: "Procuração", label: "Procuração" },
                            { value: "Laudo", label: "Laudo" },
                            { value: "Decisão", label: "Decisão" },
                            { value: "Sentença", label: "Sentença" },
                            { value: "Recurso", label: "Recurso" },
                            { value: "Outro", label: "Outro" },
                        ]}
                    />
                    <Input id="doc-arquivo" name="arquivoNome" label="Nome do Arquivo" placeholder="documento.pdf" />
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowAddDoc(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <><Loader2 size={16} className="animate-spin" />Salvando...</> : "Adicionar Documento"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={!!deletingId} onClose={() => setDeletingId(null)} title="Confirmar Exclusão" size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-text-secondary">Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</p>
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setDeletingId(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                            {loading ? <><Loader2 size={16} className="animate-spin" />Excluindo...</> : "Excluir"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

