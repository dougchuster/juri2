"use client";

import { useEffect, useRef, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Search, X, Users, Scale, CheckSquare,
    CalendarClock, FileText, Loader2, ArrowRight,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ResultCliente   = { id: string; nome: string; tipoPessoa: string; _tipo: "cliente";   href: string };
type ResultProcesso  = { id: string; numeroCnj: string | null; objeto: string | null; status: string; cliente: { nome: string } | null; _tipo: "processo"; href: string };
type ResultTarefa    = { id: string; titulo: string; status: string; prioridade: string; _tipo: "tarefa";    href: string };
type ResultPrazo     = { id: string; titulo: string; dataLimite: string; status: string; _tipo: "prazo";     href: string };
type ResultDocumento = { id: string; titulo: string; tipo: string | null; _tipo: "documento"; href: string };

interface SearchResults {
    clientes:   ResultCliente[];
    processos:  ResultProcesso[];
    tarefas:    ResultTarefa[];
    prazos:     ResultPrazo[];
    documentos: ResultDocumento[];
}

// ─── Category Config ─────────────────────────────────────────────────────────

const CATEGORIES = [
    { key: "clientes",   label: "Clientes",   Icon: Users         },
    { key: "processos",  label: "Processos",  Icon: Scale         },
    { key: "tarefas",    label: "Tarefas",    Icon: CheckSquare   },
    { key: "prazos",     label: "Prazos",     Icon: CalendarClock },
    { key: "documentos", label: "Documentos", Icon: FileText      },
] as const;

// ─── Result Row ──────────────────────────────────────────────────────────────

function ResultRow({
    label,
    sub,
    href,
    Icon,
    selected,
    onSelect,
}: {
    label: string;
    sub?: string;
    href: string;
    Icon: React.ElementType;
    selected: boolean;
    onSelect: (href: string) => void;
}) {
    const ref = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (selected) ref.current?.scrollIntoView({ block: "nearest" });
    }, [selected]);

    return (
        <button
            ref={ref}
            onClick={() => onSelect(href)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                selected
                    ? "bg-accent/15 text-accent"
                    : "text-text-secondary hover:bg-bg-tertiary/40"
            }`}
        >
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                selected ? "border-accent/30 bg-accent/10" : "border-border bg-bg-secondary"
            }`}>
                <Icon size={13} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{label}</p>
                {sub && <p className="truncate text-[11px] text-text-muted">{sub}</p>}
            </div>
            <ArrowRight size={13} className="shrink-0 opacity-40" />
        </button>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResults | null>(null);
    const [isPending, startTransition] = useTransition();
    const [selectedIdx, setSelectedIdx] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Focus input when opens
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setQuery("");
            setResults(null);
            setSelectedIdx(0);
        }
    }, [open]);

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query || query.length < 2) { setResults(null); return; }

        debounceRef.current = setTimeout(() => {
            startTransition(async () => {
                try {
                    const res = await fetch(`/api/busca?q=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    setResults(data.results);
                    setSelectedIdx(0);
                } catch {
                    setResults(null);
                }
            });
        }, 220);

        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query]);

    // Flatten results for keyboard nav
    const flatItems = useCallback((): Array<{ label: string; sub?: string; href: string; Icon: React.ElementType }> => {
        if (!results) return [];
        const items: ReturnType<typeof flatItems> = [];

        results.clientes.forEach((c) => items.push({
            label: c.nome,
            sub: c.tipoPessoa === "JURIDICA" ? "Pessoa Jurídica" : "Pessoa Física",
            href: c.href,
            Icon: Users,
        }));
        results.processos.forEach((p) => items.push({
            label: p.numeroCnj || p.objeto || "Processo sem número",
            sub: p.cliente?.nome || p.objeto || "",
            href: p.href,
            Icon: Scale,
        }));
        results.tarefas.forEach((t) => items.push({
            label: t.titulo,
            sub: `${t.status} · ${t.prioridade}`,
            href: t.href,
            Icon: CheckSquare,
        }));
        results.prazos.forEach((p) => items.push({
            label: p.titulo,
            sub: `Vence ${new Date(p.dataLimite).toLocaleDateString("pt-BR")}`,
            href: p.href,
            Icon: CalendarClock,
        }));
        results.documentos.forEach((d) => items.push({
            label: d.titulo,
            sub: d.tipo || "Documento",
            href: d.href,
            Icon: FileText,
        }));

        return items;
    }, [results]);

    function navigate(href: string) {
        router.push(href);
        onClose();
    }

    // Keyboard navigation
    useEffect(() => {
        if (!open) return;

        function onKeyDown(e: KeyboardEvent) {
            const items = flatItems();

            if (e.key === "Escape") {
                onClose();
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIdx((i) => Math.min(i + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && items[selectedIdx]) {
                navigate(items[selectedIdx].href);
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, selectedIdx, flatItems, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!open) return null;

    const flat = flatItems();
    const totalResults = results
        ? Object.values(results).reduce((acc, arr) => acc + arr.length, 0)
        : 0;

    let globalIdx = 0;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Panel */}
            <div
                className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-bg-primary shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Input */}
                <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
                    {isPending
                        ? <Loader2 size={16} className="shrink-0 animate-spin text-accent" />
                        : <Search size={16} className="shrink-0 text-text-muted" />
                    }
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar clientes, processos, tarefas, documentos..."
                        className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                        {query && (
                            <button onClick={() => setQuery("")} className="text-text-muted hover:text-text-primary">
                                <X size={14} />
                            </button>
                        )}
                        <kbd className="rounded border border-border bg-bg-secondary px-1.5 py-0.5 text-[10px] text-text-muted">
                            ESC
                        </kbd>
                    </div>
                </div>

                {/* Results */}
                <div className="max-h-[420px] overflow-y-auto p-2">
                    {!query && (
                        <div className="px-3 py-8 text-center">
                            <p className="text-sm text-text-muted">
                                Digite para buscar em clientes, processos, tarefas, prazos e documentos.
                            </p>
                            <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-text-muted">
                                <span><kbd className="rounded border border-border bg-bg-secondary px-1 py-0.5">↑↓</kbd> navegar</span>
                                <span><kbd className="rounded border border-border bg-bg-secondary px-1 py-0.5">↵</kbd> abrir</span>
                                <span><kbd className="rounded border border-border bg-bg-secondary px-1 py-0.5">ESC</kbd> fechar</span>
                            </div>
                        </div>
                    )}

                    {query && query.length < 2 && (
                        <p className="px-3 py-6 text-center text-sm text-text-muted">
                            Continue digitando...
                        </p>
                    )}

                    {results && totalResults === 0 && (
                        <p className="px-3 py-8 text-center text-sm text-text-muted">
                            Nenhum resultado para <strong>&ldquo;{query}&rdquo;</strong>
                        </p>
                    )}

                    {results && totalResults > 0 && CATEGORIES.map(({ key, label, Icon }) => {
                        const items = results[key as keyof SearchResults];
                        if (!items || items.length === 0) return null;

                        return (
                            <div key={key} className="mb-2">
                                <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                                    {label}
                                </p>
                                {items.map((item) => {
                                    const idx = globalIdx++;
                                    const isSelected = idx === selectedIdx;

                                    let label2 = "";
                                    let sub2 = "";

                                    if (item._tipo === "cliente") {
                                        label2 = item.nome;
                                        sub2 = item.tipoPessoa === "JURIDICA" ? "Pessoa Jurídica" : "Pessoa Física";
                                    } else if (item._tipo === "processo") {
                                        label2 = (item as ResultProcesso).numeroCnj || (item as ResultProcesso).objeto || "Sem número";
                                        sub2 = (item as ResultProcesso).cliente?.nome || "";
                                    } else if (item._tipo === "tarefa") {
                                        label2 = (item as ResultTarefa).titulo;
                                        sub2 = (item as ResultTarefa).status;
                                    } else if (item._tipo === "prazo") {
                                        label2 = (item as ResultPrazo).titulo;
                                        sub2 = `Vence ${new Date((item as ResultPrazo).dataLimite).toLocaleDateString("pt-BR")}`;
                                    } else {
                                        label2 = (item as ResultDocumento).titulo;
                                        sub2 = (item as ResultDocumento).tipo || "Documento";
                                    }

                                    return (
                                        <ResultRow
                                            key={item.id}
                                            label={label2}
                                            sub={sub2}
                                            href={item.href}
                                            Icon={Icon}
                                            selected={isSelected}
                                            onSelect={navigate}
                                        />
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {results && totalResults > 0 && (
                    <div className="border-t border-border px-4 py-2 text-[11px] text-text-muted">
                        {totalResults} resultado{totalResults > 1 ? "s" : ""} encontrado{totalResults > 1 ? "s" : ""}
                    </div>
                )}
            </div>
        </div>
    );
}
