"use client";

import {
  ArrowLeft,
  File,
  FileText,
  Folder,
  Image,
  Loader2,
  Search,
  Sheet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ChatDraftAttachment } from "@/lib/chat/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type DocFolder = {
  id: string;
  nome: string;
  parentId: string | null;
  _count: { documentos: number; subPastas: number };
};

type DocItem = {
  id: string;
  titulo: string;
  arquivoUrl: string | null;
  arquivoNome: string | null;
  arquivoTamanho: number | null;
  mimeType: string | null;
  updatedAt: string;
  categoria: { id: string; nome: string; cor: string } | null;
  pasta: { id: string; nome: string } | null;
  processo: { id: string; numeroCnj: string; cliente: { nome: string } | null } | null;
};

type BrowseResponse = {
  pastas: DocFolder[];
  documentos: DocItem[];
  total: number;
  page: number;
  totalPages: number;
  currentFolder: { id: string; nome: string; parentId: string | null } | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectDocument: (attachment: ChatDraftAttachment) => void;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function mimeIcon(mime: string | null) {
  if (!mime) return <File size={18} className="text-text-muted" />;
  if (mime.startsWith("image/")) return <Image size={18} className="text-blue-500" />;
  if (mime.includes("pdf")) return <FileText size={18} className="text-rose-500" />;
  if (mime.includes("sheet") || mime.includes("excel"))
    return <Sheet size={18} className="text-emerald-500" />;
  if (mime.includes("word") || mime.includes("document"))
    return <FileText size={18} className="text-blue-600" />;
  return <File size={18} className="text-text-muted" />;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ChatDocumentPicker({ open, onClose, onSelectDocument }: Props) {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [folderStack, setFolderStack] = useState<
    { id: string | null; nome: string }[]
  >([{ id: null, nome: "Documentos" }]);
  const [data, setData] = useState<BrowseResponse | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentFolderId = folderStack[folderStack.length - 1]?.id ?? null;

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearchDebounced(search), 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  // Fetch data
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFolderId) params.set("pastaId", currentFolderId);
      if (searchDebounced) params.set("search", searchDebounced);
      const res = await fetch(`/api/chat/documents?${params.toString()}`);
      if (!res.ok) throw new Error("Falha ao carregar documentos");
      const json: BrowseResponse = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, searchDebounced]);

  useEffect(() => {
    if (open) fetchDocuments();
  }, [open, fetchDocuments]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSearch("");
      setSearchDebounced("");
      setFolderStack([{ id: null, nome: "Documentos" }]);
      setData(null);
    }
  }, [open]);

  function navigateIntoFolder(folder: DocFolder) {
    setSearch("");
    setSearchDebounced("");
    setFolderStack((prev) => [...prev, { id: folder.id, nome: folder.nome }]);
  }

  function navigateBack() {
    setSearch("");
    setSearchDebounced("");
    setFolderStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  function navigateToBreadcrumb(index: number) {
    setSearch("");
    setSearchDebounced("");
    setFolderStack((prev) => prev.slice(0, index + 1));
  }

  function handleSelectDocument(doc: DocItem) {
    if (!doc.arquivoUrl) return;

    const attachment: ChatDraftAttachment = {
      kind: "FILE",
      storageKey: doc.arquivoUrl,
      fileUrl: doc.arquivoUrl,
      originalName: doc.arquivoNome || doc.titulo,
      mimeType: doc.mimeType || "application/octet-stream",
      sizeBytes: doc.arquivoTamanho || 0,
    };

    onSelectDocument(attachment);
    onClose();
  }

  if (!open) return null;

  const pastas = data?.pastas ?? [];
  const documentos = data?.documentos ?? [];
  const isEmpty = pastas.length === 0 && documentos.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] border border-[var(--card-border)] bg-[var(--bg-base)] shadow-[0_24px_80px_color-mix(in_srgb,var(--shadow-color)_20%,transparent)]">
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-5 py-3.5">
          <div className="flex items-center gap-3">
            {folderStack.length > 1 && !searchDebounced && (
              <button
                onClick={navigateBack}
                className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-[var(--surface-soft)] hover:text-text-primary"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h3 className="text-[15px] font-semibold text-text-primary">
              Documentos do Sistema
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-text-muted transition-colors hover:bg-[var(--surface-soft)] hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Breadcrumb ── */}
        {!searchDebounced && folderStack.length > 1 && (
          <div className="flex items-center gap-1 border-b border-[var(--card-border)] px-5 py-2 text-xs text-text-muted">
            {folderStack.map((crumb, i) => (
              <span key={crumb.id ?? "root"} className="flex items-center gap-1">
                {i > 0 && <span className="text-text-muted/50">/</span>}
                <button
                  onClick={() => navigateToBreadcrumb(i)}
                  className={`rounded px-1 py-0.5 transition-colors hover:bg-[var(--surface-soft)] hover:text-text-primary ${
                    i === folderStack.length - 1
                      ? "font-medium text-text-primary"
                      : ""
                  }`}
                >
                  {crumb.nome}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* ── Search ── */}
        <div className="border-b border-[var(--card-border)] px-5 py-2.5">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              placeholder="Buscar documentos por nome, CNJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--bg-elevated)] py-2 pl-9 pr-3 text-[13px] text-text-primary placeholder:text-text-muted focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
            </div>
          ) : isEmpty ? (
            <div className="py-16 text-center">
              <FileText size={40} className="mx-auto mb-3 text-text-muted/40" />
              <p className="text-sm text-text-muted">
                {searchDebounced
                  ? "Nenhum documento encontrado"
                  : "Esta pasta está vazia"}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {/* Folders */}
              {pastas.map((pasta) => (
                <button
                  key={pasta.id}
                  onClick={() => navigateIntoFolder(pasta)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-soft)]"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Folder size={18} className="text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-text-primary">
                      {pasta.nome}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {pasta._count.documentos} doc{pasta._count.documentos !== 1 ? "s" : ""}
                      {pasta._count.subPastas > 0 &&
                        ` · ${pasta._count.subPastas} subpasta${pasta._count.subPastas !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                </button>
              ))}

              {/* Documents */}
              {documentos.map((doc) => {
                const hasFile = !!doc.arquivoUrl;
                return (
                  <button
                    key={doc.id}
                    onClick={() => hasFile && handleSelectDocument(doc)}
                    disabled={!hasFile}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      hasFile
                        ? "hover:bg-[var(--surface-soft)] cursor-pointer"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--bg-elevated)]">
                      {mimeIcon(doc.mimeType)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-text-primary">
                        {doc.titulo}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text-muted">
                        {doc.arquivoNome && (
                          <span className="truncate max-w-[180px]">{doc.arquivoNome}</span>
                        )}
                        {doc.arquivoTamanho && (
                          <span>{formatBytes(doc.arquivoTamanho)}</span>
                        )}
                        <span>{formatDate(doc.updatedAt)}</span>
                        {doc.categoria && (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: `${doc.categoria.cor}20`,
                              color: doc.categoria.cor,
                            }}
                          >
                            {doc.categoria.nome}
                          </span>
                        )}
                        {doc.processo && (
                          <span className="truncate max-w-[160px]">
                            {doc.processo.numeroCnj}
                          </span>
                        )}
                      </div>
                      {!hasFile && (
                        <p className="text-[10px] text-rose-500">
                          Sem arquivo anexado
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-[var(--card-border)] px-5 py-3">
          <p className="text-[11px] text-text-muted">
            {data ? `${data.total} documento${data.total !== 1 ? "s" : ""}` : ""}
            {data && data.totalPages > 1 && ` · Página ${data.page}/${data.totalPages}`}
          </p>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
