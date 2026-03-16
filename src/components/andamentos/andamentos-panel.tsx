"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Search, X, CheckCircle, AlertCircle, Clock,
    ChevronRight, Plus, Loader2, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-fields";
import { Badge } from "@/components/ui/badge";
import { addMovimentacao } from "@/actions/processos";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Processo {
    id: string;
    numeroCnj: string | null;
    status: string;
    objeto: string | null;
    tribunal: string | null;
    dataUltimaMovimentacao: string | null;
    cliente: { id: string; nome: string } | null;
    advogado: { id: string; user: { name: string | null } };
    partes: { nome: string | null }[];
    movimentacoes: { id: string }[];   // últimos 7d
    _count: { movimentacoes: number };
}

interface Advogado {
    id: string;
    user: { name: string | null };
}

interface ProcessoSelector {
    id: string;
    numeroCnj: string | null;
    objeto: string | null;
    cliente: { nome: string } | null;
}

interface Stats {
    total: number;
    comNovos: number;
    semMovimento: number;
    capturaPercent: number;
}

interface Props {
    processos: Processo[];
    advogados: Advogado[];
    processosSelector: ProcessoSelector[];
    stats: Stats;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TIPOS_MOVIMENTACAO = [
    "DESPACHO", "SENTENÇA", "DECISÃO", "CERTIDÃO",
    "JUNTADA", "PUBLICAÇÃO", "CONCLUSÃO", "OUTROS",
];

const STATUS_COLORS: Record<string, string> = {
    EM_ANDAMENTO:      "cat-prazos7d",
    AJUIZADO:          "cat-amber",
    AUDIENCIA_MARCADA: "cat-warning",
    SENTENCA:          "cat-warning",
    RECURSO:           "cat-danger",
    TRANSITO_JULGADO:  "cat-success",
    EXECUCAO:          "cat-neutral",
    CONSULTORIA:       "cat-neutral",
    PROSPECCAO:        "cat-neutral",
};

// ─── Helper ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysSince(d: string | null): number | null {
    if (!d) return null;
    return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Modal: Add Manual Movement ──────────────────────────────────────────────

function ModalAndamentoManual({
    onClose,
    processos,
    preProcessoId,
}: {
    onClose: () => void;
    processos: ProcessoSelector[];
    preProcessoId?: string;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [processoId, setProcessoId] = useState(preProcessoId || "");
    const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
    const [tipo, setTipo] = useState("");
    const [descricao, setDescricao] = useState("");
    const [fonte, setFonte] = useState("MANUAL");
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!processoId || !descricao.trim()) return;
        setError("");
        startTransition(async () => {
            const result = await addMovimentacao(processoId, { data, descricao, tipo, fonte });
            if (result.success) {
                router.refresh();
                onClose();
            } else {
                const err = result.error;
                setError(typeof err === "string" ? err : (err as Record<string, string[]>)._form?.[0] || "Erro ao salvar.");
            }
        });
    }

    const processoOpts = processos.map((p) => ({
        value: p.id,
        label: `${p.numeroCnj ? p.numeroCnj + " — " : ""}${p.cliente?.nome || "Sem cliente"}${p.objeto ? " • " + p.objeto.slice(0, 40) : ""}`,
    }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-card w-full max-w-lg p-6 space-y-5 shadow-2xl">
                <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold text-text-primary">Novo Andamento Manual</h3>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {error && (
                    <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Select
                        id="proc-sel"
                        label="Processo *"
                        value={processoId}
                        onChange={(e) => setProcessoId(e.target.value)}
                        options={processoOpts}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            id="mov-data"
                            label="Data *"
                            type="date"
                            value={data}
                            onChange={(e) => setData(e.target.value)}
                            required
                        />
                        <Select
                            id="mov-tipo"
                            label="Tipo"
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value)}
                            options={[
                                { value: "", label: "Selecionar..." },
                                ...TIPOS_MOVIMENTACAO.map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() })),
                            ]}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">
                            Descrição *
                        </label>
                        <textarea
                            rows={4}
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            required
                            placeholder="Descreva o andamento processual..."
                            className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                        />
                    </div>

                    <Select
                        id="mov-fonte"
                        label="Fonte"
                        value={fonte}
                        onChange={(e) => setFonte(e.target.value)}
                        options={[
                            { value: "MANUAL",    label: "Manual" },
                            { value: "DATAJUD",   label: "DataJud" },
                            { value: "PUBLICACAO", label: "Diário Oficial" },
                            { value: "EMAIL",     label: "E-mail" },
                            { value: "SISTEMA",   label: "Sistema" },
                        ]}
                    />

                    <div className="flex justify-end gap-3 pt-1">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isPending || !processoId || !descricao.trim()}>
                            {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                            Salvar Andamento
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export function AndamentosPanel({ processos, advogados, processosSelector, stats }: Props) {
    const [q, setQ] = useState("");
    const [filterAdvogado, setFilterAdvogado] = useState("");
    const [filterNew, setFilterNew] = useState<"" | "true" | "false">("");
    const [showModal, setShowModal] = useState(false);
    const [modalProcessoId, setModalProcessoId] = useState<string | undefined>();

    const filtered = useMemo(() => {
        return processos.filter((p) => {
            if (q) {
                const term = q.toLowerCase();
                const match =
                    p.numeroCnj?.toLowerCase().includes(term) ||
                    p.cliente?.nome.toLowerCase().includes(term) ||
                    p.objeto?.toLowerCase().includes(term) ||
                    p.partes[0]?.nome?.toLowerCase().includes(term);
                if (!match) return false;
            }
            if (filterAdvogado && p.advogado.id !== filterAdvogado) return false;
            if (filterNew === "true"  && p.movimentacoes.length === 0) return false;
            if (filterNew === "false" && p.movimentacoes.length  > 0) return false;
            return true;
        });
    }, [processos, q, filterAdvogado, filterNew]);

    const advogadoOpts = [
        { value: "", label: "Todos responsáveis" },
        ...advogados.map((a) => ({ value: a.id, label: a.user.name || "—" })),
    ];

    function openAddModal(processoId?: string) {
        setModalProcessoId(processoId);
        setShowModal(true);
    }

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card kpi-card p-5 cat-neutral">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Monitorados</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg adv-icon-badge">
                            <Filter size={15} strokeWidth={1.75} className="text-text-primary" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-text-primary font-mono">{stats.total}</p>
                    <p className="text-[10px] text-text-muted mt-1">processos ativos</p>
                </div>

                <div className="glass-card kpi-card p-5 cat-success">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Com Novos</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg adv-icon-badge">
                            <CheckCircle size={15} strokeWidth={1.75} className="text-text-primary" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-text-primary font-mono">{stats.comNovos}</p>
                    <p className="text-[10px] text-text-muted mt-1">últimos 7 dias</p>
                </div>

                <div className="glass-card kpi-card p-5 cat-warning">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Sem Movim.</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg adv-icon-badge">
                            <AlertCircle size={15} strokeWidth={1.75} className="text-text-primary" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-text-primary font-mono">{stats.semMovimento}</p>
                    <p className="text-[10px] text-text-muted mt-1">sem atualização 30d+</p>
                </div>

                <div className="glass-card kpi-card p-5 cat-prazos7d">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Captura</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg adv-icon-badge">
                            <Clock size={15} strokeWidth={1.75} className="text-text-primary" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-text-primary font-mono">{stats.capturaPercent}%</p>
                    <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                            className="h-full rounded-full bg-accent transition-all"
                            style={{ width: `${stats.capturaPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Filters + Action */}
            <div className="glass-card p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Buscar por CNJ, cliente, parte adversa ou objeto..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            className="w-full rounded-xl border border-border bg-bg-secondary pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        {q && (
                            <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    <select
                        value={filterAdvogado}
                        onChange={(e) => setFilterAdvogado(e.target.value)}
                        className="rounded-xl border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                        {advogadoOpts.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>

                    <select
                        value={filterNew}
                        onChange={(e) => setFilterNew(e.target.value as "" | "true" | "false")}
                        className="rounded-xl border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                        <option value="">Todos andamentos</option>
                        <option value="true">Com novos (7d)</option>
                        <option value="false">Sem novos</option>
                    </select>

                    <Button onClick={() => openAddModal()}>
                        <Plus size={14} /> Andamento Manual
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                        {filtered.length} processo{filtered.length !== 1 ? "s" : ""}
                    </span>
                    {(q || filterAdvogado || filterNew) && (
                        <button
                            onClick={() => { setQ(""); setFilterAdvogado(""); setFilterNew(""); }}
                            className="text-xs text-text-muted hover:text-text-primary transition-colors"
                        >
                            Limpar filtros
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-bg-secondary/40">
                                {["CNJ / Processo", "Cliente", "Parte Adversa", "Responsável", "Novos (7d)", "Último Andamento", "Total", ""].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-text-muted">
                                        Nenhum processo encontrado
                                    </td>
                                </tr>
                            ) : filtered.map((p) => {
                                const dias = daysSince(p.dataUltimaMovimentacao);
                                const semNovos = p.movimentacoes.length === 0;
                                const diasStr = dias === null
                                    ? "Nunca"
                                    : dias === 0 ? "Hoje"
                                    : dias === 1 ? "Ontem"
                                    : `${dias}d atrás`;
                                const diasCls = dias === null || dias > 30
                                    ? "text-danger"
                                    : dias > 14 ? "text-warning"
                                    : "text-text-muted";

                                return (
                                    <tr key={p.id} className="hover:bg-bg-tertiary/20 transition-colors group">
                                        {/* CNJ */}
                                        <td className="px-4 py-3">
                                            <div>
                                                <span className="text-xs font-mono text-accent">{p.numeroCnj || "—"}</span>
                                                {p.objeto && (
                                                    <p className="text-[10px] text-text-muted truncate max-w-[160px] mt-0.5">{p.objeto}</p>
                                                )}
                                            </div>
                                        </td>

                                        {/* Cliente */}
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-text-secondary">{p.cliente?.nome || "—"}</span>
                                        </td>

                                        {/* Parte Adversa */}
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-text-muted">{p.partes[0]?.nome || "—"}</span>
                                        </td>

                                        {/* Responsável */}
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-text-secondary">{p.advogado.user.name || "—"}</span>
                                        </td>

                                        {/* Novos (7d) */}
                                        <td className="px-4 py-3">
                                            {semNovos ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-border/60 px-2.5 py-0.5 text-[10px] font-medium text-text-muted">
                                                    Sem novos
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-semibold text-success">
                                                    <span className="size-1.5 rounded-full bg-success" />
                                                    {p.movimentacoes.length} novo{p.movimentacoes.length > 1 ? "s" : ""}
                                                </span>
                                            )}
                                        </td>

                                        {/* Último Andamento */}
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="text-xs text-text-secondary">{formatDate(p.dataUltimaMovimentacao)}</p>
                                                <p className={`text-[10px] mt-0.5 ${diasCls}`}>{diasStr}</p>
                                            </div>
                                        </td>

                                        {/* Total */}
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-mono text-text-muted">{p._count.movimentacoes}</span>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openAddModal(p.id)}
                                                    title="Adicionar andamento"
                                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-bg-secondary text-text-muted hover:border-accent hover:text-accent transition-colors"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                                <a
                                                    href={`/processos/${p.id}`}
                                                    title="Ver processo"
                                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-bg-secondary text-text-muted hover:border-accent hover:text-accent transition-colors"
                                                >
                                                    <ChevronRight size={12} />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <ModalAndamentoManual
                    onClose={() => setShowModal(false)}
                    processos={processosSelector}
                    preProcessoId={modalProcessoId}
                />
            )}
        </div>
    );
}
