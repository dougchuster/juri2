"use client";

import {
  ArrowLeft,
  ChevronRight,
  File,
  FileText,
  Folder,
  FolderOpen,
  Image,
  Loader2,
  Search,
  Sheet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ChatDraftAttachment } from "@/lib/chat/client";
import { cn } from "@/lib/utils";

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

function mimeInfo(mime: string | null): { icon: React.ReactNode; label: string; bg: string } {
  if (!mime) return { icon: <File size={16} />, label: "Arquivo", bg: "bg-slate-100 text-slate-500 dark:bg-slate-800" };
  if (mime.startsWith("image/"))
    return { icon: <Image size={16} />, label: "Imagem", bg: "bg-sky-100 text-sky-600 dark:bg-sky-900/40" };
  if (mime.includes("pdf"))
    return { icon: <FileText size={16} />, label: "PDF", bg: "bg-rose-100 text-rose-600 dark:bg-rose-900/40" };
  if (mime.includes("sheet") || mime.includes("excel"))
    return { icon: <Sheet size={16} />, label: "Planilha", bg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40" };
  if (mime.includes("word") || mime.includes("document"))
    return { icon: <FileText size={16} />, label: "Word", bg: "bg-blue-100 text-blue-600 dark:bg-blue-900/40" };
  return { icon: <File size={16} />, label: "Arquivo", bg: "bg-slate-100 text-slate-500 dark:bg-slate-800" };
}

function formatBytes(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="size-10 animate-pulse rounded-[14px] bg-[var(--surface-soft)]" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-[var(--surface-soft)]" />
        <div className="h-2.5 w-1/3 animate-pulse rounded-full bg-[var(--surface-soft)]" />
      </div>
    </div>
  );
}

function FolderRow({ pasta, onClick }: { pasta: DocFolder; onClick: () => void }) {
  const total = pasta._count.documentos + pasta._count.subPastas;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left transition-all hover:bg-[linear-gradient(135deg,rgba(201,166,133,0.08),rgba(255,248,242,0.6))]"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(251,191,36,0.1))] text-amber-600 ring-1 ring-amber-200/60 dark:ring-amber-700/30">
        <Folder size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-text-primary">{pasta.nome}</p>
        <p className="mt-0.5 text-[11px] text-text-muted">
          {total === 0
            ? "Pasta vazia"
            : [
                pasta._count.documentos > 0 && `${pasta._count.documentos} doc${pasta._count.documentos !== 1 ? "s" : ""}`,
                pasta._count.subPastas > 0 && `${pasta._count.subPastas} subpasta${pasta._count.subPastas !== 1 ? "s" : ""}`,
              ]
                .filter(Boolean)
                .join(" · ")}
        </p>
      </div>
      <ChevronRight
        size={15}
        className="shrink-0 text-text-muted/50 transition-transform group-hover:translate-x-0.5 group-hover:text-text-muted"
      />
    </button>
  );
}

function DocumentRow({ doc, onSelect }: { doc: DocItem; onSelect: () => void }) {
  const hasFile = !!doc.arquivoUrl;
  const { icon, bg } = mimeInfo(doc.mimeType);
  const size = formatBytes(doc.arquivoTamanho);

  if (!hasFile) return null; // Apenas documentos com arquivo são exibidos

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left transition-all hover:bg-[linear-gradient(135deg,rgba(201,166,133,0.08),rgba(255,248,242,0.6))]"
    >
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-[14px] ring-1 ring-black/5 dark:ring-white/8", bg)}>
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-text-primary">{doc.titulo}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-text-muted">
          {doc.arquivoNome && (
            <span className="truncate max-w-[140px] opacity-70">{doc.arquivoNome}</span>
          )}
          {size && <span>{size}</span>}
          <span>{formatDate(doc.updatedAt)}</span>
          {doc.categoria && (
            <span
              className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: `${doc.categoria.cor}1A`,
                color: doc.categoria.cor,
              }}
            >
              {doc.categoria.nome}
            </span>
          )}
          {doc.processo && (
            <span className="truncate max-w-[120px] font-mono opacity-70">
              {doc.processo.numeroCnj.slice(0, 20)}…
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="rounded-full bg-[linear-gradient(135deg,var(--accent),var(--highlight))] px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_4px_12px_color-mix(in_srgb,var(--accent)_28%,transparent)]">
          Usar
        </span>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ChatDocumentPicker({ open, onClose, onSelectDocument }: Props) {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [folderStack, setFolderStack] = useState<{ id: string | null; nome: string }[]>([
    { id: null, nome: "Documentos" },
  ]);
  const [data, setData] = useState<BrowseResponse | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const currentFolderId = folderStack[folderStack.length - 1]?.id ?? null;

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearchDebounced(search), 320);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFolderId) params.set("pastaId", currentFolderId);
      if (searchDebounced) params.set("search", searchDebounced);
      const res = await fetch(`/api/chat/documents?${params.toString()}`);
      if (!res.ok) throw new Error();
      setData(await res.json() as BrowseResponse);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, searchDebounced]);

  useEffect(() => { if (open) void fetchDocuments(); }, [open, fetchDocuments]);

  useEffect(() => {
    if (!open) {
      setSearch(""); setSearchDebounced("");
      setFolderStack([{ id: null, nome: "Documentos" }]);
      setData(null);
    } else {
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [open]);

  function navigateIntoFolder(folder: DocFolder) {
    setSearch(""); setSearchDebounced("");
    setFolderStack((prev) => [...prev, { id: folder.id, nome: folder.nome }]);
  }

  function navigateBack() {
    setSearch(""); setSearchDebounced("");
    setFolderStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  function navigateToBreadcrumb(index: number) {
    setSearch(""); setSearchDebounced("");
    setFolderStack((prev) => prev.slice(0, index + 1));
  }

  function handleSelect(doc: DocItem) {
    if (!doc.arquivoUrl) return;
    onSelectDocument({
      kind: "FILE",
      storageKey: doc.arquivoUrl,
      fileUrl: doc.arquivoUrl,
      originalName: doc.arquivoNome || doc.titulo,
      mimeType: doc.mimeType || "application/octet-stream",
      sizeBytes: doc.arquivoTamanho || 0,
    });
    onClose();
  }

  if (!open) return null;

  const pastas = data?.pastas ?? [];
  const documentos = (data?.documentos ?? []).filter((d) => !!d.arquivoUrl);
  const isEmpty = !loading && pastas.length === 0 && documentos.length === 0;
  const isSearch = !!searchDebounced;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: "rgba(0,0,0,0.42)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex w-full max-w-xl sm:max-w-2xl flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,243,237,0.97))] shadow-[0_32px_80px_rgba(0,0,0,0.22)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(30,25,20,0.98),rgba(25,20,16,0.97))]"
        style={{ maxHeight: "88vh" }}
      >
        {/* ── Header ── */}
        <div className="relative flex shrink-0 items-center gap-3 px-5 pt-5 pb-4">
          {folderStack.length > 1 && !isSearch && (
            <button
              onClick={navigateBack}
              className="flex size-8 items-center justify-center rounded-full border border-[var(--card-border)] bg-white/80 text-text-muted transition-colors hover:bg-[var(--surface-soft)] hover:text-text-primary dark:bg-white/6"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_18%,white),rgba(255,255,255,0.9))] text-[var(--accent)] shadow-[0_4px_12px_color-mix(in_srgb,var(--accent)_14%,transparent)]">
              <FolderOpen size={18} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-text-primary leading-tight">
                Documentos do Sistema
              </h3>
              {!loading && data && (
                <p className="text-[11px] text-text-muted">
                  {documentos.length} arquivo{documentos.length !== 1 ? "s" : ""} disponível{documentos.length !== 1 ? "s" : ""}
                  {pastas.length > 0 && ` · ${pastas.length} pasta${pastas.length !== 1 ? "s" : ""}`}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full border border-[var(--card-border)] bg-white/80 text-text-muted transition-colors hover:bg-[var(--surface-soft)] hover:text-text-primary dark:bg-white/6"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Breadcrumb ── */}
        {!isSearch && folderStack.length > 1 && (
          <div className="shrink-0 flex items-center gap-0.5 px-5 pb-3 overflow-x-auto">
            {folderStack.map((crumb, i) => (
              <span key={crumb.id ?? "root"} className="flex items-center gap-0.5 shrink-0">
                {i > 0 && <ChevronRight size={12} className="text-text-muted/40 shrink-0" />}
                <button
                  onClick={() => navigateToBreadcrumb(i)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                    i === folderStack.length - 1
                      ? "bg-[color:color-mix(in_srgb,var(--accent)_12%,white)] text-[var(--accent-hover)] dark:text-[var(--accent)]"
                      : "text-text-muted hover:bg-[var(--surface-soft)] hover:text-text-primary"
                  )}
                >
                  {crumb.nome}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* ── Search ── */}
        <div className="shrink-0 px-4 pb-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar por nome, processo, CNJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-[18px] border border-[var(--card-border)] bg-white/80 py-2.5 pl-10 pr-4 text-[13.5px] text-text-primary placeholder:text-text-muted/60 focus:border-[color:color-mix(in_srgb,var(--accent)_40%,white)] focus:outline-none focus:ring-0 dark:bg-white/6"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted hover:text-text-primary"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="shrink-0 h-px bg-[linear-gradient(90deg,transparent,rgba(201,166,133,0.25),transparent)] mx-4" />

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="flex size-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_10%,white),rgba(255,255,255,0.9))] text-[var(--accent)]/50">
                {isSearch ? <Search size={24} /> : <Folder size={24} />}
              </div>
              <p className="mt-4 text-[14px] font-semibold text-text-primary">
                {isSearch ? "Nenhum resultado" : "Pasta vazia"}
              </p>
              <p className="mt-1 text-[12px] text-text-muted max-w-[24ch]">
                {isSearch
                  ? `Não há documentos para "${searchDebounced}"`
                  : "Nenhum documento com arquivo nesta pasta"}
              </p>
            </div>
          ) : (
            <div>
              {/* Folders section */}
              {pastas.length > 0 && !isSearch && (
                <div className="mb-3">
                  <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Pastas
                  </p>
                  <div className="space-y-0.5">
                    {pastas.map((pasta) => (
                      <FolderRow key={pasta.id} pasta={pasta} onClick={() => navigateIntoFolder(pasta)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Documents section */}
              {documentos.length > 0 && (
                <div>
                  {pastas.length > 0 && !isSearch && (
                    <p className="mb-1.5 mt-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                      Arquivos
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {documentos.map((doc) => (
                      <DocumentRow key={doc.id} doc={doc} onSelect={() => handleSelect(doc)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 h-px bg-[linear-gradient(90deg,transparent,rgba(201,166,133,0.25),transparent)] mx-4" />
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5">
          <p className="text-[11px] text-text-muted">
            {isSearch && !loading && `${documentos.length} resultado${documentos.length !== 1 ? "s" : ""}`}
            {!isSearch && data && data.totalPages > 1 && `Pág. ${data.page}/${data.totalPages}`}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--card-border)] bg-white/80 px-4 py-2 text-[12px] font-medium text-text-secondary transition-colors hover:bg-[var(--surface-soft)] hover:text-text-primary dark:bg-white/6"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
