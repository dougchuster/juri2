"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Search, Plus, Trash2, FileText, Layout,
    ChevronLeft, ChevronRight, Loader2, Folder, Tag, Upload, Download, Eye
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import {
    createModeloDocumento, deleteModeloDocumento, deleteDocumento,
    createPasta, deletePasta, createCategoria, deleteCategoria,
    importDocumentoAction
} from "@/actions/documentos";
import { formatDate } from "@/lib/utils";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface DocumentoItem {
    id: string; titulo: string;
    conteudo?: string | null;
    arquivoUrl?: string | null;
    statusFluxo: "RASCUNHO" | "EM_REVISAO" | "APROVADA" | "PUBLICADA";
    categoria?: { id: string; nome: string; cor?: string | null } | null;
    pasta?: { id: string; nome: string } | null;
    arquivoNome: string | null; versao: number;
    updatedAt: string;
    _count?: { versoes: number; comentariosRevisao: number };
    processo?: { id: string; numeroCnj: string | null; cliente: { nome: string } } | null;
}

interface ModeloItem {
    id: string; nome: string;
    categoria?: { id: string; nome: string } | null;
    ativo: boolean; _count?: { variaveis: number };
}

interface PastaItem {
    id: string; nome: string; descricao: string | null;
}

interface CategoriaItem {
    id: string; nome: string; descricao: string | null; cor: string | null;
}

interface DocumentosManagerProps {
    documentos: DocumentoItem[];
    modelos: ModeloItem[];
    pastas: PastaItem[];
    categorias: CategoriaItem[];
    total: number; page: number; totalPages: number;
    searchParams: Record<string, string>;
}

export function DocumentosManager({ documentos, modelos, pastas, categorias, total, page, totalPages, searchParams }: DocumentosManagerProps) {
    const router = useRouter();
    const [tab, setTab] = useState<"documentos" | "modelos" | "pastas" | "categorias">("documentos");
    const [actionLoading, setActionLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadFeedback, setUploadFeedback] = useState<{ tone: "success" | "error" | "warning"; message: string } | null>(null);

    const [showCreateModelo, setShowCreateModelo] = useState(false);
    const [showCreatePasta, setShowCreatePasta] = useState(false);
    const [showCreateCategoria, setShowCreateCategoria] = useState(false);
    const [modeloConteudo, setModeloConteudo] = useState("");
    const [previewDoc, setPreviewDoc] = useState<DocumentoItem | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const selectedPasta = searchParams.pastaId ? pastas.find((p) => p.id === searchParams.pastaId) : null;

    function buildUrl(params: Record<string, string | undefined>) {
        const merged = { ...searchParams, ...params };
        const qs = new URLSearchParams(
            Object.entries(merged)
                .filter(([, v]) => v !== undefined && v !== "") as [string, string][]
        ).toString();
        return `/documentos${qs ? `?${qs}` : ""}`;
    }

    async function handleCreateModelo(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setActionLoading(true);
        try {
            const f = new FormData(e.currentTarget);
            await createModeloDocumento({
                nome: f.get("nome") as string,
                categoriaId: f.get("categoriaId") as string || undefined,
                conteudo: modeloConteudo,
            });
            setShowCreateModelo(false);
            setModeloConteudo("");
            router.refresh();
        } finally {
            setActionLoading(false);
        }
    }

    async function handleCreatePasta(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setActionLoading(true);
        try {
            const f = new FormData(e.currentTarget);
            await createPasta({
                nome: f.get("nome") as string,
                descricao: f.get("descricao") as string,
            });
            setShowCreatePasta(false);
            router.refresh();
        } finally {
            setActionLoading(false);
        }
    }

    async function handleCreateCategoria(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setActionLoading(true);
        try {
            const f = new FormData(e.currentTarget);
            await createCategoria({
                nome: f.get("nome") as string,
                descricao: f.get("descricao") as string,
                cor: f.get("cor") as string,
            });
            setShowCreateCategoria(false);
            router.refresh();
        } finally {
            setActionLoading(false);
        }
    }

    async function handleDeleteModelo(id: string) {
        if (!confirm("Deseja excluir este modelo?")) return;
        await deleteModeloDocumento(id);
        router.refresh();
    }
    async function handleDeleteDocumento(id: string) {
        if (!confirm("Deseja excluir este documento?")) return;
        const result = await deleteDocumento(id);
        if (!result.success) {
            setUploadFeedback({ tone: "error", message: result.error || "Nao foi possivel excluir o documento." });
            return;
        }
        router.refresh();
    }
    async function handleDeletePasta(id: string) {
        if (!confirm("Deseja excluir esta pasta?")) return;
        await deletePasta(id);
        router.refresh();
    }
    async function handleDeleteCategoria(id: string) {
        if (!confirm("Deseja excluir esta categoria?")) return;
        await deleteCategoria(id);
        router.refresh();
    }

    function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const searchValue = (formData.get("search") as string | null)?.trim();
        router.push(buildUrl({ search: searchValue || undefined, page: undefined }));
    }

    async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadFeedback(null);
        if (file.size > 25 * 1024 * 1024) {
            setUploadFeedback({ tone: "error", message: "Arquivo excede o limite de 25MB." });
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            if (searchParams.pastaId) formData.append("pastaId", searchParams.pastaId);

            const result = await importDocumentoAction(formData);
            if (!result.success) {
                setUploadFeedback({ tone: "error", message: result.error || "Falha ao importar arquivo." });
                return;
            }

            if (result.warning) {
                setUploadFeedback({ tone: "warning", message: result.warning });
            } else {
                setUploadFeedback({ tone: "success", message: `${file.name} importado com sucesso.` });
            }

            router.refresh();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Falha inesperada no upload.";
            setUploadFeedback({ tone: "error", message: message || "Falha inesperada no upload." });
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
            setUploading(false);
        }
    }

    function handleExport(doc: DocumentoItem) {
        if (!doc.conteudo && !doc.arquivoUrl) {
            alert("Este documento não possui conteúdo ou arquivo vinculado para download.");
            return;
        }

        if (doc.arquivoUrl) {
            window.open(doc.arquivoUrl, "_blank");
            return;
        }

        const element = document.createElement("a");
        const file = new Blob([doc.conteudo || ""], { type: "text/plain;charset=utf-8" });
        element.href = URL.createObjectURL(file);
        element.download = `${doc.titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    function handleView(doc: DocumentoItem) {
        if (doc.arquivoUrl) {
            window.open(doc.arquivoUrl, "_blank", "noopener,noreferrer");
            return;
        }

        if (doc.conteudo) {
            setPreviewDoc(doc);
            return;
        }

        setUploadFeedback({ tone: "warning", message: "Este documento nao possui conteudo para visualizacao." });
    }

    return (
        <>
            {/* Tab Navigation */}
            <div className="flex items-center gap-1 border-b border-border mb-6">
                <button onClick={() => setTab("documentos")} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "documentos" ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-primary"}`}>
                    <FileText size={16} />Documentos
                </button>
                <button onClick={() => setTab("modelos")} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "modelos" ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-primary"}`}>
                    <Layout size={16} />Modelos
                </button>
                <button onClick={() => setTab("pastas")} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "pastas" ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-primary"}`}>
                    <Folder size={16} />Pastas
                </button>
                <button onClick={() => setTab("categorias")} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "categorias" ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-primary"}`}>
                    <Tag size={16} />Categorias
                </button>
            </div>

            {/* TAB: Documentos */}
            {tab === "documentos" && (
                <div>
                    <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
                        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 rounded-lg bg-bg-tertiary px-3 py-2 w-full max-w-sm">
                            <Search size={16} className="text-text-muted" />
                            <input name="search" type="text" defaultValue={searchParams.search || ""} placeholder="Buscar documentos..." className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none" />
                            <button type="submit" className="sr-only">Buscar</button>
                        </form>

                        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                            {searchParams.pastaId && (
                                <Button variant="secondary" size="sm" onClick={() => router.push("/documentos")}>
                                    Limpar Filtro de Pasta
                                </Button>
                            )}
                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleImport}
                                accept=".pdf,.docx,.txt"
                            />
                            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                {uploading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Upload size={16} className="mr-2" />}
                                Importar
                            </Button>
                        </div>
                    </div>

                    <div className="mb-4 rounded-lg border border-border bg-bg-tertiary/40 px-4 py-3">
                        <p className="text-xs text-text-muted">
                            Upload de documentos: formatos PDF, DOCX e TXT, ate 25MB por arquivo.
                            {selectedPasta ? ` Pasta ativa: ${selectedPasta.nome}.` : " Nenhuma pasta selecionada."}
                        </p>
                    </div>

                    {uploadFeedback && (
                        <div
                            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${uploadFeedback.tone === "success"
                                ? "border-success/30 bg-success/10 text-success"
                                : uploadFeedback.tone === "warning"
                                    ? "border-warning/30 bg-warning/10 text-warning"
                                    : "border-danger/30 bg-danger/10 text-danger"
                                }`}
                        >
                            {uploadFeedback.message}
                        </div>
                    )}

                    <div className="glass-card overflow-x-auto">
                        <table className="w-full min-w-[700px]">
                            <thead>
                                <tr className="border-b border-border bg-bg-tertiary/50">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Título / Arquivo</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Vínculo</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Local / Categoria</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Atualizado</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documentos.length === 0 ? (
                                    <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-text-muted">Nenhum documento encontrado.</td></tr>
                                ) : documentos.map((doc) => (
                                    <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-bg-tertiary transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="text-sm text-text-primary font-medium">{doc.titulo}</p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                {doc.arquivoNome && <span className="text-xs text-text-muted">{doc.arquivoNome}</span>}
                                                <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-text-muted">
                                                    {doc.statusFluxo === "PUBLICADA"
                                                        ? "Publicada"
                                                        : doc.statusFluxo === "APROVADA"
                                                            ? "Aprovada"
                                                            : doc.statusFluxo === "EM_REVISAO"
                                                                ? "Em revisao"
                                                                : "Rascunho"}
                                                </span>
                                                <span className="text-[10px] text-text-muted">
                                                    {doc._count?.versoes || 0} versao(oes)
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {doc.processo ? (
                                                <>
                                                    <Link href={`/processos/${doc.processo.id}`} className="text-sm font-mono text-accent hover:underline block">
                                                        {doc.processo.numeroCnj || "Processo sem nº"}
                                                    </Link>
                                                    <span className="text-xs text-text-muted">{doc.processo.cliente?.nome}</span>
                                                </>
                                            ) : <span className="text-xs text-text-muted border border-border px-2 py-0.5 rounded-full">Sem Vínculo</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1 items-start">
                                                {doc.pasta && <div onClick={() => router.push(buildUrl({ pastaId: doc.pasta?.id }))} className="cursor-pointer hover:opacity-80 inline-flex"><Badge variant="default" className="text-[10px] font-normal"><Folder size={10} className="mr-1 inline-block" />{doc.pasta.nome}</Badge></div>}
                                                {doc.categoria && <span style={{ borderColor: doc.categoria.cor || "#ccc", color: doc.categoria.cor || "inherit" }} className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold">{doc.categoria.nome}</span>}
                                                {!doc.pasta && !doc.categoria && <span className="text-xs text-text-muted">Geral</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text-muted">{formatDate(doc.updatedAt)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => handleView(doc)} className="rounded-lg p-1.5 text-text-muted hover:text-accent transition-colors" title="Visualizar">
                                                    <Eye size={16} />
                                                </button>
                                                <button onClick={() => handleExport(doc)} className="rounded-lg p-1.5 text-text-muted hover:text-accent transition-colors" title="Baixar">
                                                    <Download size={16} />
                                                </button>
                                                <Link href={`/documentos/${doc.id}`} className="rounded-lg p-1.5 text-text-muted hover:text-accent transition-colors" title="Gerenciar versoes">
                                                    <FileText size={16} />
                                                </Link>
                                                <button onClick={() => handleDeleteDocumento(doc.id)} className="rounded-lg p-1.5 text-text-muted hover:text-danger transition-colors" title="Excluir">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-bg-tertiary/50">
                                <span className="text-xs text-text-muted">{total} documentos — Página {page} de {totalPages}</span>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => router.push(buildUrl({ page: String(page - 1) }))}><ChevronLeft size={16} /></Button>
                                    <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => router.push(buildUrl({ page: String(page + 1) }))}><ChevronRight size={16} /></Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB: Modelos */}
            {tab === "modelos" && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-text-muted">Crie e edite modelos para automatizar a redação dos documentos.</p>
                        <Button size="sm" onClick={() => setShowCreateModelo(true)}><Plus size={16} className="mr-2" /> Novo Modelo</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {modelos.length === 0 ? (
                            <div className="col-span-full rounded-xl border border-border p-12 text-center text-sm text-text-muted bg-bg-secondary">
                                Nenhum modelo criado ainda.
                            </div>
                        ) : modelos.map((modelo) => (
                            <div key={modelo.id} className="glass-card p-4 transition-all hover:border-border-hover group">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <p className="text-sm font-medium text-text-primary leading-tight">{modelo.nome}</p>
                                        <div className="mt-1.5 flex gap-2">
                                            {modelo.categoria && <Badge variant="default" className="text-[10px] py-0">{modelo.categoria.nome}</Badge>}
                                            {!modelo.ativo && <Badge variant="muted" className="text-[10px] text-danger border-danger/20 py-0">Inativo</Badge>}
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteModelo(modelo.id)} className="rounded p-1 text-text-muted opacity-0 group-hover:opacity-100 hover:text-danger hover:bg-danger/10 transition-all">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between text-xs text-text-muted mt-4 border-t border-border pt-3">
                                    <span>{modelo._count?.variaveis || 0} variáveis formatadas</span>
                                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2">Editar</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB: Pastas */}
            {tab === "pastas" && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-text-muted">Organize seus arquivos de maneira hierárquica.</p>
                        <Button size="sm" onClick={() => setShowCreatePasta(true)}><Plus size={16} className="mr-2" /> Nova Pasta</Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {pastas.length === 0 ? (
                            <div className="col-span-full rounded-xl border border-dashed border-border p-12 text-center text-sm text-text-muted">
                                Nenhuma pasta principal criada.
                            </div>
                        ) : pastas.map(p => (
                            <div key={p.id} className="glass-card p-4 flex items-center justify-between group hover:border-accent/40 cursor-pointer transition-colors" onClick={() => { setTab("documentos"); router.push(buildUrl({ pastaId: p.id })); }}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-accent/10 text-accent rounded-lg group-hover:scale-110 transition-transform"><Folder fill="currentColor" size={20} /></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text-primary truncate">{p.nome}</p>
                                        {p.descricao && <p className="text-[10px] text-text-muted truncate mt-0.5">{p.descricao}</p>}
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleDeletePasta(p.id); }} className="p-1.5 rounded opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger hover:bg-danger/10 transition-all ml-2">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB: Categorias */}
            {tab === "categorias" && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-text-muted">Descreva e colorize os selos de categorias para documentos.</p>
                        <Button size="sm" onClick={() => setShowCreateCategoria(true)}><Plus size={16} className="mr-2" /> Nova Categoria</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {categorias.length === 0 ? (
                            <div className="col-span-full rounded-xl border border-dashed border-border p-12 text-center text-sm text-text-muted">
                                Nenhuma categoria cadastrada.
                            </div>
                        ) : categorias.map(c => (
                            <div key={c.id} className="glass-card p-4 flex items-start justify-between group hover:border-border-hover transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.cor || "#E9AE60" }}></div>
                                        <h3 className="text-sm font-medium text-text-primary">{c.nome}</h3>
                                    </div>
                                    <p className="text-xs text-text-muted leading-relaxed min-h-[40px]">{c.descricao || "Sem descrição."}</p>
                                </div>
                                <button onClick={() => handleDeleteCategoria(c.id)} className="p-1.5 rounded opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger hover:bg-danger/10 transition-all ml-2 shrink-0">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODALS */}

            {/* Create Modelo */}
            <Modal isOpen={showCreateModelo} onClose={() => setShowCreateModelo(false)} title="Novo Modelo de Documento" size="xl">
                <form onSubmit={handleCreateModelo} className="flex flex-col h-[calc(100vh-140px)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 shrink-0">
                        <Input id="mod-nome" name="nome" label="Nome do Modelo *" required placeholder="Ex: Petição Inicial" />
                        <Select
                            id="mod-categoria" name="categoriaId" label="Categoria"
                            options={categorias.map(c => ({ value: c.id, label: c.nome }))}
                        />
                    </div>
                    <div className="flex-1 flex flex-col min-h-0 border border-border rounded-lg overflow-hidden">
                        <div className="bg-bg-tertiary px-3 py-2 border-b border-border text-xs font-semibold uppercase text-text-muted tracking-wide shrink-0">
                            Conteúdo do Modelo * (use {'{{variavel}}'} para campos dinâmicos)
                        </div>
                        <div className="flex-1 overflow-hidden min-h-[400px]">
                            <RichTextEditor value={modeloConteudo} onChange={setModeloConteudo} placeholder="Escreva a estrutura do modelo aqui..." />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 shrink-0 mt-2">
                        <Button variant="secondary" type="button" onClick={() => setShowCreateModelo(false)}>Cancelar</Button>
                        <Button type="submit" disabled={actionLoading}>{actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Salvar Modelo"}</Button>
                    </div>
                </form>
            </Modal>

            {/* Create Pasta */}
            <Modal isOpen={showCreatePasta} onClose={() => setShowCreatePasta(false)} title="Nova Pasta" size="md">
                <form onSubmit={handleCreatePasta} className="space-y-4">
                    <Input id="pasta-nome" name="nome" label="Nome da Pasta *" required placeholder="Ex: Contratos de Serviço" />
                    <Textarea id="pasta-desc" name="descricao" label="Descrição" rows={3} placeholder="Opcional..." />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" type="button" onClick={() => setShowCreatePasta(false)}>Cancelar</Button>
                        <Button type="submit" disabled={actionLoading}>{actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Criar Pasta"}</Button>
                    </div>
                </form>
            </Modal>

            {/* Create Categoria */}
            <Modal isOpen={showCreateCategoria} onClose={() => setShowCreateCategoria(false)} title="Nova Categoria" size="md">
                <form onSubmit={handleCreateCategoria} className="space-y-4">
                    <Input id="cat-nome" name="nome" label="Nome da Categoria *" required placeholder="Ex: URGENTE" />
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Cor do Selo</label>
                        <div className="flex items-center gap-2">
                            <Input id="cat-cor" name="cor" type="color" defaultValue="#E9AE60" className="h-10 w-16 p-1 cursor-pointer" />
                            <span className="text-xs text-text-muted">Selecione uma cor para fácil identificação visual.</span>
                        </div>
                    </div>
                    <Textarea id="cat-desc" name="descricao" label="Descrição" rows={2} placeholder="Opcional..." />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" type="button" onClick={() => setShowCreateCategoria(false)}>Cancelar</Button>
                        <Button type="submit" disabled={actionLoading}>{actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Criar Categoria"}</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
                title={previewDoc?.titulo || "Visualizar Documento"}
                size="xl"
            >
                <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-bg-tertiary/40 p-4">
                    <pre className="whitespace-pre-wrap break-words text-sm text-text-primary font-sans">
                        {previewDoc?.conteudo || "Sem conteudo para visualizacao."}
                    </pre>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="secondary" type="button" onClick={() => setPreviewDoc(null)}>Fechar</Button>
                    {previewDoc?.arquivoUrl && (
                        <Button type="button" onClick={() => window.open(previewDoc.arquivoUrl as string, "_blank", "noopener,noreferrer")}>
                            Abrir arquivo
                        </Button>
                    )}
                </div>
            </Modal>
        </>
    );
}


