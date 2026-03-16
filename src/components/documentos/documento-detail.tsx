"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
    addDocumentoReviewCommentAction,
    approveDocumentoVersionAction,
    createDocumentoVersionAction,
    publishDocumentoVersionAction,
    resolveDocumentoReviewCommentAction,
    restoreDocumentoVersionAction,
    submitDocumentoForReviewAction,
} from "@/actions/documentos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { formatDate } from "@/lib/utils";
import {
    ArrowLeft,
    CheckCircle2,
    Clock3,
    FileText,
    GitBranch,
    Lock,
    MessageSquare,
    RotateCcw,
    Send,
    UploadCloud,
} from "lucide-react";

interface DocumentoComentarioItem {
    id: string;
    conteudo: string;
    autorNome: string | null;
    resolvido: boolean;
    resolvidoEm: string | null;
    createdAt: string;
}

interface DocumentoVersaoItem {
    id: string;
    numero: number;
    statusFluxo: "RASCUNHO" | "EM_REVISAO" | "APROVADA" | "PUBLICADA";
    origem: string;
    titulo: string;
    conteudo: string | null;
    arquivoNome: string | null;
    resumoAlteracoes: string | null;
    criadoPorNome: string | null;
    publicadaEm: string | null;
    createdAt: string;
    comentariosRevisao: DocumentoComentarioItem[];
}

interface DocumentoDetailProps {
    documento: {
        id: string;
        titulo: string;
        conteudo: string | null;
        arquivoUrl: string | null;
        arquivoNome: string | null;
        arquivoTamanho: number | null;
        mimeType: string | null;
        versao: number;
        statusFluxo: "RASCUNHO" | "EM_REVISAO" | "APROVADA" | "PUBLICADA";
        bloqueadoEm: string | null;
        bloqueadoMotivo: string | null;
        updatedAt: string;
        categoriaId: string | null;
        pastaId: string | null;
        versaoAtualId: string | null;
        versaoPublicadaId: string | null;
        processo?: { id: string; numeroCnj: string | null; cliente: { nome: string } } | null;
        categoria?: { id: string; nome: string; cor?: string | null } | null;
        pasta?: { id: string; nome: string } | null;
        versoes: DocumentoVersaoItem[];
        _count: { versoes: number; comentariosRevisao: number };
    };
    categorias: Array<{ id: string; nome: string }>;
    pastas: Array<{ id: string; nome: string }>;
}

function statusTone(status: DocumentoDetailProps["documento"]["statusFluxo"]) {
    switch (status) {
        case "PUBLICADA":
            return "border-success/25 bg-success/10 text-success";
        case "APROVADA":
            return "border-info/25 bg-info/10 text-info";
        case "EM_REVISAO":
            return "border-warning/25 bg-warning/10 text-warning";
        default:
            return "border-border bg-bg-tertiary text-text-muted";
    }
}

function statusLabel(status: DocumentoDetailProps["documento"]["statusFluxo"]) {
    switch (status) {
        case "PUBLICADA":
            return "Publicada";
        case "APROVADA":
            return "Aprovada";
        case "EM_REVISAO":
            return "Em revisao";
        default:
            return "Rascunho";
    }
}

function formatFileSize(bytes: number | null) {
    if (!bytes || bytes <= 0) return "Sem tamanho";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentoDetail({ documento, categorias, pastas }: DocumentoDetailProps) {
    const router = useRouter();
    const currentVersion =
        documento.versoes.find((versao) => versao.id === documento.versaoAtualId) || documento.versoes[0] || null;
    const [titulo, setTitulo] = useState(documento.titulo);
    const [categoriaId, setCategoriaId] = useState(documento.categoriaId || "");
    const [pastaId, setPastaId] = useState(documento.pastaId || "");
    const [conteudo, setConteudo] = useState(documento.conteudo || "");
    const [resumoAlteracoes, setResumoAlteracoes] = useState("");
    const [comentario, setComentario] = useState("");
    const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
    const [pendingAction, setPendingAction] = useState<string | null>(null);

    const editLocked = Boolean(documento.bloqueadoEm);

    async function runAction(actionKey: string, task: () => Promise<{ success: boolean; error?: unknown }>) {
        setPendingAction(actionKey);
        setFeedback(null);
        try {
            const result = await task();
            if (!result.success) {
                const message =
                    typeof result.error === "string"
                        ? result.error
                        : Array.isArray(result.error)
                            ? result.error[0]
                            : "Operacao nao concluida.";
                setFeedback({ tone: "error", message });
                return;
            }

            setFeedback({ tone: "success", message: "Operacao concluida com sucesso." });
            router.refresh();
        } finally {
            setPendingAction(null);
        }
    }

    async function handleSaveVersion() {
        await runAction("save-version", () =>
            createDocumentoVersionAction(documento.id, {
                titulo,
                categoriaId,
                pastaId,
                conteudo,
                resumoAlteracoes,
            })
        );
        setResumoAlteracoes("");
    }

    async function handleAddComment() {
        if (!currentVersion) return;
        await runAction("add-comment", () =>
            addDocumentoReviewCommentAction(documento.id, currentVersion.id, {
                conteudo: comentario,
            })
        );
        setComentario("");
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-3xl border border-border bg-bg-secondary/70 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-2">
                        <Link
                            href="/documentos"
                            className="inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-text-primary"
                        >
                            <ArrowLeft size={16} />
                            Voltar para documentos
                        </Link>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-semibold text-text-primary">{documento.titulo}</h1>
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(documento.statusFluxo)}`}>
                                {statusLabel(documento.statusFluxo)}
                            </span>
                            <Badge variant="muted">Versao atual {documento.versao}</Badge>
                            {documento.versaoPublicadaId && <Badge variant="default">Publicacao ativa definida</Badge>}
                        </div>
                        <p className="max-w-3xl text-sm text-text-muted">
                            Historico completo, comentarios de revisao, publicacao e restauracao sem sobrescrever o documento atual.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {documento.arquivoUrl && (
                            <Button type="button" variant="secondary" onClick={() => window.open(documento.arquivoUrl as string, "_blank", "noopener,noreferrer")}>
                                <UploadCloud size={16} className="mr-2" />
                                Abrir arquivo
                            </Button>
                        )}
                        {documento.statusFluxo === "RASCUNHO" && (
                            <Button
                                type="button"
                                onClick={() => runAction("submit-review", () => submitDocumentoForReviewAction(documento.id))}
                                disabled={pendingAction !== null}
                            >
                                <Send size={16} className="mr-2" />
                                Enviar para revisao
                            </Button>
                        )}
                        {documento.statusFluxo === "EM_REVISAO" && (
                            <Button
                                type="button"
                                onClick={() => runAction("approve-version", () => approveDocumentoVersionAction(documento.id))}
                                disabled={pendingAction !== null}
                            >
                                <CheckCircle2 size={16} className="mr-2" />
                                Aprovar versao
                            </Button>
                        )}
                        {documento.statusFluxo === "APROVADA" && (
                            <Button
                                type="button"
                                onClick={() => runAction("publish-version", () => publishDocumentoVersionAction(documento.id))}
                                disabled={pendingAction !== null}
                            >
                                <UploadCloud size={16} className="mr-2" />
                                Publicar versao
                            </Button>
                        )}
                        {editLocked && currentVersion && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() =>
                                    runAction("working-copy", () =>
                                        restoreDocumentoVersionAction(documento.id, {
                                            versaoId: currentVersion.id,
                                            motivo: "Criacao de nova versao de trabalho a partir da publicada.",
                                        })
                                    )
                                }
                                disabled={pendingAction !== null}
                            >
                                <RotateCcw size={16} className="mr-2" />
                                Criar nova versao de trabalho
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-border bg-bg-tertiary/50 p-4">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Arquivo atual</p>
                        <p className="mt-2 text-sm font-medium text-text-primary">{documento.arquivoNome || "Sem arquivo anexado"}</p>
                        <p className="mt-1 text-xs text-text-muted">{formatFileSize(documento.arquivoTamanho)}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-tertiary/50 p-4">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Historico</p>
                        <p className="mt-2 text-sm font-medium text-text-primary">{documento._count.versoes} versao(oes)</p>
                        <p className="mt-1 text-xs text-text-muted">Atualizado em {formatDate(documento.updatedAt)}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-tertiary/50 p-4">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Revisao</p>
                        <p className="mt-2 text-sm font-medium text-text-primary">{documento._count.comentariosRevisao} comentario(s)</p>
                        <p className="mt-1 text-xs text-text-muted">{currentVersion ? `Versao foco: ${currentVersion.numero}` : "Sem versao atual"}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-tertiary/50 p-4">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Vinculo</p>
                        {documento.processo ? (
                            <>
                                <Link href={`/processos/${documento.processo.id}`} className="mt-2 block text-sm font-medium text-accent hover:underline">
                                    {documento.processo.numeroCnj || "Processo sem numero"}
                                </Link>
                                <p className="mt-1 text-xs text-text-muted">{documento.processo.cliente.nome}</p>
                            </>
                        ) : (
                            <p className="mt-2 text-sm text-text-muted">Documento solto da biblioteca.</p>
                        )}
                    </div>
                </div>

                {editLocked && (
                    <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                        <div className="flex items-start gap-2">
                            <Lock size={16} className="mt-0.5 shrink-0" />
                            <div>
                                <p className="font-medium">Documento bloqueado por publicacao</p>
                                <p>{documento.bloqueadoMotivo || "A versao publicada esta protegida contra edicao direta."}</p>
                            </div>
                        </div>
                    </div>
                )}

                {feedback && (
                    <div
                        className={`rounded-2xl border px-4 py-3 text-sm ${feedback.tone === "success"
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-danger/30 bg-danger/10 text-danger"
                            }`}
                    >
                        {feedback.message}
                    </div>
                )}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.95fr)]">
                <section className="space-y-6">
                    <div className="rounded-3xl border border-border bg-bg-secondary/70 p-6">
                        <div className="mb-5 flex items-center gap-2">
                            <FileText size={18} className="text-text-primary" />
                            <h2 className="text-lg font-semibold text-text-primary">Nova versao</h2>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Input
                                id="documento-titulo"
                                label="Titulo"
                                value={titulo}
                                onChange={(event) => setTitulo(event.target.value)}
                                disabled={editLocked || pendingAction !== null}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    id="documento-categoria"
                                    label="Categoria"
                                    value={categoriaId}
                                    onChange={(event) => setCategoriaId(event.target.value)}
                                    options={categorias.map((categoria) => ({ value: categoria.id, label: categoria.nome }))}
                                    placeholder="Sem categoria"
                                    disabled={editLocked || pendingAction !== null}
                                />
                                <Select
                                    id="documento-pasta"
                                    label="Pasta"
                                    value={pastaId}
                                    onChange={(event) => setPastaId(event.target.value)}
                                    options={pastas.map((pasta) => ({ value: pasta.id, label: pasta.nome }))}
                                    placeholder="Geral"
                                    disabled={editLocked || pendingAction !== null}
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <Textarea
                                id="documento-conteudo"
                                label="Conteudo"
                                rows={16}
                                value={conteudo}
                                onChange={(event) => setConteudo(event.target.value)}
                                disabled={editLocked || pendingAction !== null}
                            />
                        </div>

                        <div className="mt-4">
                            <Textarea
                                id="documento-resumo"
                                label="Resumo das alteracoes"
                                rows={4}
                                value={resumoAlteracoes}
                                onChange={(event) => setResumoAlteracoes(event.target.value)}
                                disabled={editLocked || pendingAction !== null}
                                placeholder="Opcional. Se vazio, o sistema gera um resumo automatico da diferenca."
                            />
                        </div>

                        <div className="mt-5 flex justify-end">
                            <Button type="button" onClick={handleSaveVersion} disabled={editLocked || pendingAction !== null}>
                                <GitBranch size={16} className="mr-2" />
                                Salvar nova versao
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-border bg-bg-secondary/70 p-6">
                        <div className="mb-5 flex items-center gap-2">
                            <MessageSquare size={18} className="text-text-primary" />
                            <h2 className="text-lg font-semibold text-text-primary">Comentarios de revisao</h2>
                        </div>

                        <div className="space-y-4">
                            {currentVersion?.comentariosRevisao.length ? (
                                currentVersion.comentariosRevisao.map((item) => (
                                    <div key={item.id} className="rounded-2xl border border-border bg-bg-tertiary/40 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-medium text-text-primary">
                                                    {item.autorNome || "Equipe interna"}
                                                </p>
                                                <p className="text-xs text-text-muted">{formatDate(item.createdAt)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {item.resolvido ? (
                                                    <Badge variant="default">Resolvido</Badge>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() =>
                                                            runAction("resolve-comment", () =>
                                                                resolveDocumentoReviewCommentAction(documento.id, item.id)
                                                            )
                                                        }
                                                        disabled={pendingAction !== null}
                                                    >
                                                        Marcar resolvido
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="mt-3 whitespace-pre-wrap text-sm text-text-primary">{item.conteudo}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-text-muted">
                                    Nenhum comentario registrado para a versao atual.
                                </div>
                            )}
                        </div>

                        <div className="mt-5 rounded-2xl border border-border bg-bg-tertiary/40 p-4">
                            <p className="text-sm font-medium text-text-primary">
                                Novo comentario para a versao {currentVersion?.numero || documento.versao}
                            </p>
                            <div className="mt-3">
                                <Textarea
                                    id="comentario-revisao"
                                    rows={4}
                                    value={comentario}
                                    onChange={(event) => setComentario(event.target.value)}
                                    placeholder="Ex.: ajustar fundamentacao, revisar pedido principal, anexar prova complementar."
                                    disabled={pendingAction !== null}
                                />
                            </div>
                            <div className="mt-4 flex justify-end">
                                <Button type="button" variant="secondary" onClick={handleAddComment} disabled={pendingAction !== null || !currentVersion}>
                                    <MessageSquare size={16} className="mr-2" />
                                    Registrar comentario
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                <aside className="space-y-4">
                    <div className="rounded-3xl border border-border bg-bg-secondary/70 p-6">
                        <div className="mb-5 flex items-center gap-2">
                            <Clock3 size={18} className="text-text-primary" />
                            <h2 className="text-lg font-semibold text-text-primary">Timeline de versoes</h2>
                        </div>

                        <div className="space-y-4">
                            {documento.versoes.map((versao) => {
                                const isCurrent = versao.id === documento.versaoAtualId;
                                const isPublished = versao.id === documento.versaoPublicadaId;

                                return (
                                    <div key={versao.id} className="rounded-2xl border border-border bg-bg-tertiary/40 p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-sm font-semibold text-text-primary">Versao {versao.numero}</p>
                                                    {isCurrent && <Badge variant="default">Atual</Badge>}
                                                    {isPublished && <Badge variant="muted">Publicada</Badge>}
                                                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone(versao.statusFluxo)}`}>
                                                        {statusLabel(versao.statusFluxo)}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs text-text-muted">
                                                    {formatDate(versao.createdAt)}
                                                    {versao.criadoPorNome ? ` • ${versao.criadoPorNome}` : ""}
                                                </p>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() =>
                                                    runAction(`restore-${versao.id}`, () =>
                                                        restoreDocumentoVersionAction(documento.id, {
                                                            versaoId: versao.id,
                                                            motivo: `Restauracao manual da versao ${versao.numero}.`,
                                                        })
                                                    )
                                                }
                                                disabled={pendingAction !== null}
                                            >
                                                <RotateCcw size={14} className="mr-1.5" />
                                                Restaurar
                                            </Button>
                                        </div>

                                        <p className="mt-3 text-sm font-medium text-text-primary">{versao.titulo}</p>
                                        <p className="mt-2 whitespace-pre-wrap text-sm text-text-muted">
                                            {versao.resumoAlteracoes || "Sem resumo registrado."}
                                        </p>
                                        {versao.arquivoNome && (
                                            <p className="mt-2 text-xs text-text-muted">
                                                Arquivo: {versao.arquivoNome}
                                            </p>
                                        )}
                                        {versao.publicadaEm && (
                                            <p className="mt-2 text-xs text-success">
                                                Publicada em {formatDate(versao.publicadaEm)}
                                            </p>
                                        )}
                                        {versao.comentariosRevisao.length > 0 && (
                                            <p className="mt-2 text-xs text-text-muted">
                                                {versao.comentariosRevisao.length} comentario(s) vinculados a esta versao.
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
