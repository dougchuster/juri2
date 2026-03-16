"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle, XCircle, Upload, Loader2, AlertCircle,
    ChevronDown, ChevronUp, Trash2, RotateCcw, TrendingUp,
    TrendingDown, Link2, Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { importarExtrato, conciliarItem, desconciliarItem, excluirExtrato } from "@/actions/conciliacao";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExtratoItemView {
    id: string;
    data: string;
    descricao: string;
    valor: string | number;
    tipo: string;
    conciliado: boolean;
    lancamentos: {
        id: string;
        descricao: string;
        valorReal: string | number | null;
        valorPrevisto: string | number;
        dataPagamento: string | null;
        status: string;
    }[];
}

interface ExtratoView {
    id: string;
    banco: string;
    agencia: string | null;
    conta: string | null;
    dataInicio: string;
    dataFim: string;
    saldoInicial: string | number;
    saldoFinal: string | number;
    itens: ExtratoItemView[];
}

interface Lancamento {
    id: string;
    descricao: string;
    tipoLancamento: string;
    valorReal: string | number | null;
    valorPrevisto: string | number;
    dataPagamento: string | null;
    dataCompetencia: string;
    fornecedorBeneficiario: string | null;
    conciliado: boolean;
}

interface Stats {
    totalLancamentos: number;
    conciliados: number;
    pendentes: number;
    extratos: number;
    taxaConciliacao: number;
}

interface Props {
    extratos: (ExtratoView & { _count: { itens: number }; itens: { id: string }[] })[];
    lancamentosNaoConciliados: Lancamento[];
    stats: Stats;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function currency(v: string | number | null): string {
    const n = parseFloat(String(v ?? 0));
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(d: string | null): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string) {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    const itens: Array<{ data: string; descricao: string; valor: number }> = [];

    for (const line of lines) {
        const cols = line.split(/[;,]/).map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length < 3) continue;
        const rawDate = cols[0];
        const descricao = cols[1];
        const rawValor = cols[2].replace(".", "").replace(",", ".");
        const valor = parseFloat(rawValor);

        // Try to parse common Brazilian date formats: DD/MM/YYYY or YYYY-MM-DD
        let iso = rawDate;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
            const [d, m, y] = rawDate.split("/");
            iso = `${y}-${m}-${d}`;
        }

        if (iso && descricao && !isNaN(valor)) {
            itens.push({ data: iso, descricao, valor });
        }
    }
    return itens;
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

function ModalImportar({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const fileRef = useRef<HTMLInputElement>(null);
    const [banco, setBanco] = useState("");
    const [agencia, setAgencia] = useState("");
    const [conta, setConta] = useState("");
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [saldoInicial, setSaldoInicial] = useState("0");
    const [preview, setPreview] = useState<ReturnType<typeof parseCSV>>([]);
    const [error, setError] = useState("");

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const itens = parseCSV(text);
            setPreview(itens);
            if (itens.length === 0) setError("Nenhuma linha válida encontrada. Formato esperado: data;descricao;valor");
            else setError("");
        };
        reader.readAsText(file, "utf-8");
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!banco || !dataInicio || !dataFim || preview.length === 0) return;
        setError("");
        startTransition(async () => {
            const result = await importarExtrato({
                banco, agencia, conta, dataInicio, dataFim,
                saldoInicial: parseFloat(saldoInicial.replace(",", ".")),
                itens: preview,
            });
            if (result.success) { router.refresh(); onClose(); }
            else setError(result.error || "Erro ao importar.");
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="glass-card w-full max-w-lg p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-display text-lg font-bold text-text-primary">Importar Extrato Bancário</h3>

                <div className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-2.5 text-xs text-accent">
                    Formato CSV: <code>data;descricao;valor</code> — data em DD/MM/AAAA, valor negativo para débito.
                </div>

                {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-3">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">Banco *</label>
                            <input value={banco} onChange={(e) => setBanco(e.target.value)} required placeholder="Ex: Itaú, Bradesco"
                                className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">Agência</label>
                            <input value={agencia} onChange={(e) => setAgencia(e.target.value)} placeholder="0001"
                                className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">Conta</label>
                            <input value={conta} onChange={(e) => setConta(e.target.value)} placeholder="12345-6"
                                className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">Saldo inicial</label>
                            <input value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} placeholder="0,00"
                                className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">Data início *</label>
                            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} required
                                className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">Data fim *</label>
                            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} required
                                className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
                        </div>
                    </div>

                    {/* File upload */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">Arquivo CSV *</label>
                        <button type="button" onClick={() => fileRef.current?.click()}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-bg-secondary py-4 text-sm text-text-muted hover:border-accent hover:text-accent transition-colors">
                            <Upload size={16} />
                            {preview.length > 0 ? `${preview.length} transações carregadas` : "Clique para selecionar o arquivo"}
                        </button>
                        <input ref={fileRef} type="file" accept=".csv,.txt,.ofx" className="hidden" onChange={handleFile} />
                    </div>

                    {preview.length > 0 && (
                        <div className="rounded-xl border border-border bg-bg-secondary p-3 max-h-32 overflow-y-auto">
                            {preview.slice(0, 5).map((item, i) => (
                                <div key={i} className="flex justify-between text-xs py-0.5">
                                    <span className="text-text-muted">{item.data}</span>
                                    <span className="text-text-secondary flex-1 mx-2 truncate">{item.descricao}</span>
                                    <span className={item.valor >= 0 ? "text-success font-mono" : "text-danger font-mono"}>
                                        {currency(item.valor)}
                                    </span>
                                </div>
                            ))}
                            {preview.length > 5 && <p className="text-[10px] text-text-muted text-center mt-1">+{preview.length - 5} mais...</p>}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-1">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={isPending || preview.length === 0 || !banco}>
                            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            Importar {preview.length > 0 ? `(${preview.length})` : ""}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export function ConciliacaoPanel({ extratos, lancamentosNaoConciliados, stats }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showImport, setShowImport] = useState(false);
    const [expandedExtrato, setExpandedExtrato] = useState<string | null>(null);
    const [matchingItem, setMatchingItem] = useState<string | null>(null); // extratoItemId being matched

    async function handleConciliar(extratoItemId: string, lancamentoId: string) {
        startTransition(async () => {
            await conciliarItem(extratoItemId, lancamentoId);
            router.refresh();
            setMatchingItem(null);
        });
    }

    async function handleDesconciliar(lancamentoId: string) {
        startTransition(async () => {
            await desconciliarItem(lancamentoId);
            router.refresh();
        });
    }

    async function handleExcluirExtrato(extratoId: string) {
        if (!confirm("Excluir este extrato? Os lançamentos vinculados serão desconciliados.")) return;
        startTransition(async () => {
            await excluirExtrato(extratoId);
            router.refresh();
        });
    }

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Lançamentos", value: stats.totalLancamentos, sub: "pagos/recebidos", cls: "cat-neutral" },
                    { label: "Conciliados",  value: stats.conciliados,     sub: "vinculados",      cls: "cat-success" },
                    { label: "Pendentes",    value: stats.pendentes,        sub: "a conciliar",     cls: "cat-warning" },
                    { label: "Taxa",         value: `${stats.taxaConciliacao}%`, sub: "conciliação", cls: "cat-prazos7d" },
                ].map((kpi) => (
                    <div key={kpi.label} className={`glass-card kpi-card p-5 ${kpi.cls}`}>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{kpi.label}</span>
                        <p className="text-2xl font-bold text-text-primary font-mono mt-2">{kpi.value}</p>
                        <p className="text-[10px] text-text-muted mt-1">{kpi.sub}</p>
                    </div>
                ))}
            </div>

            {/* Header + import button */}
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary">Extratos Importados</h2>
                <Button onClick={() => setShowImport(true)}>
                    <Upload size={14} /> Importar Extrato
                </Button>
            </div>

            {/* Extratos list */}
            {extratos.length === 0 ? (
                <div className="glass-card p-12 text-center space-y-3">
                    <AlertCircle size={32} className="mx-auto text-text-muted opacity-40" />
                    <p className="text-sm text-text-muted">Nenhum extrato importado.</p>
                    <p className="text-xs text-text-muted">Importe um arquivo CSV para iniciar a conciliação bancária.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {extratos.map((ext) => {
                        const naoConciliadosCount = ext.itens.length; // pre-filtered
                        const isExpanded = expandedExtrato === ext.id;

                        return (
                            <div key={ext.id} className="glass-card overflow-hidden">
                                {/* Extrato header */}
                                <div className="flex items-center justify-between px-5 py-4">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <p className="text-sm font-semibold text-text-primary">{ext.banco}</p>
                                            <p className="text-xs text-text-muted mt-0.5">
                                                {ext.agencia && `Ag. ${ext.agencia} · `}
                                                {ext.conta && `C/C ${ext.conta} · `}
                                                {fmtDate(ext.dataInicio)} a {fmtDate(ext.dataFim)}
                                            </p>
                                        </div>
                                        <div className="hidden md:flex gap-3 text-xs">
                                            <span className="text-text-muted">{ext._count.itens} transações</span>
                                            {naoConciliadosCount > 0 && (
                                                <span className="text-warning font-medium">{naoConciliadosCount} pendentes</span>
                                            )}
                                            {naoConciliadosCount === 0 && (
                                                <span className="text-success font-medium flex items-center gap-1">
                                                    <CheckCircle size={11} /> Totalmente conciliado
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-text-muted hidden md:block">
                                            Saldo: <span className="font-mono text-text-primary">{currency(ext.saldoFinal)}</span>
                                        </span>
                                        <button onClick={() => handleExcluirExtrato(ext.id)} disabled={isPending}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted hover:border-danger hover:text-danger transition-colors">
                                            <Trash2 size={13} />
                                        </button>
                                        <button onClick={() => setExpandedExtrato(isExpanded ? null : ext.id)}
                                            className="flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-xs text-text-muted hover:border-accent hover:text-accent transition-colors">
                                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                            {isExpanded ? "Recolher" : "Ver itens"}
                                        </button>
                                    </div>
                                </div>

                                {/* Extrato items */}
                                {isExpanded && (
                                    <div className="border-t border-border overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-bg-secondary/40 border-b border-border">
                                                    {["Data", "Descrição", "Valor", "Status", "Ações"].map((h) => (
                                                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {(ext as unknown as { itens: ExtratoItemView[] }).itens?.map((item) => (
                                                    <tr key={item.id} className="hover:bg-bg-tertiary/20 transition-colors">
                                                        <td className="px-4 py-3 text-xs font-mono text-text-muted">{fmtDate(item.data)}</td>
                                                        <td className="px-4 py-3 text-xs text-text-secondary max-w-[220px] truncate">{item.descricao}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`flex items-center gap-1 text-xs font-mono ${item.tipo === "CREDITO" ? "text-success" : "text-danger"}`}>
                                                                {item.tipo === "CREDITO" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                                                {currency(item.valor)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {item.conciliado ? (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-semibold text-success">
                                                                    <CheckCircle size={9} /> Conciliado
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-[10px] font-semibold text-warning">
                                                                    <AlertCircle size={9} /> Pendente
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {!item.conciliado && (
                                                                <button
                                                                    onClick={() => setMatchingItem(matchingItem === item.id ? null : item.id)}
                                                                    className="flex items-center gap-1 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] text-accent hover:bg-accent/20 transition-colors"
                                                                >
                                                                    <Link2 size={11} /> Vincular
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Lançamentos não conciliados */}
            <div>
                <h2 className="text-sm font-semibold text-text-primary mb-3">
                    Lançamentos Não Conciliados
                    {lancamentosNaoConciliados.length > 0 && (
                        <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] text-warning font-medium">
                            {lancamentosNaoConciliados.length}
                        </span>
                    )}
                </h2>

                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-bg-secondary/40">
                                    {["Data", "Descrição", "Valor", "Tipo", "Fornecedor/Beneficiário", ""].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {lancamentosNaoConciliados.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">
                                            <CheckCircle size={20} className="mx-auto mb-2 text-success" />
                                            Todos os lançamentos estão conciliados!
                                        </td>
                                    </tr>
                                ) : lancamentosNaoConciliados.map((lanc) => (
                                    <tr key={lanc.id} className="hover:bg-bg-tertiary/20 transition-colors group">
                                        <td className="px-4 py-3 text-xs font-mono text-text-muted">{fmtDate(lanc.dataPagamento || lanc.dataCompetencia)}</td>
                                        <td className="px-4 py-3 text-xs text-text-secondary max-w-[180px] truncate">{lanc.descricao}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-mono ${lanc.tipoLancamento === "ENTRADA" ? "text-success" : "text-danger"}`}>
                                                {currency(lanc.valorReal ?? lanc.valorPrevisto)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-medium ${lanc.tipoLancamento === "ENTRADA" ? "text-success" : "text-danger"}`}>
                                                {lanc.tipoLancamento === "ENTRADA" ? "Receita" : "Despesa"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-text-muted truncate max-w-[160px]">{lanc.fornecedorBeneficiario || "—"}</td>
                                        <td className="px-4 py-3">
                                            {lanc.conciliado && (
                                                <button onClick={() => handleDesconciliar(lanc.id)} disabled={isPending}
                                                    className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] text-text-muted hover:border-warning hover:text-warning transition-colors opacity-0 group-hover:opacity-100">
                                                    <Unlink size={11} /> Desvincular
                                                </button>
                                            )}
                                            {matchingItem && !lanc.conciliado && (
                                                <button onClick={() => handleConciliar(matchingItem, lanc.id)} disabled={isPending}
                                                    className="flex items-center gap-1 rounded-lg border border-success/40 bg-success/10 px-2.5 py-1 text-[11px] text-success hover:bg-success/20 transition-colors animate-pulse">
                                                    <Link2 size={11} /> Vincular aqui
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {matchingItem && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-accent/30 bg-bg-primary px-5 py-3 shadow-2xl">
                    <Link2 size={15} className="text-accent" />
                    <span className="text-sm text-text-primary">Selecione um lançamento para vincular ao item do extrato</span>
                    <button onClick={() => setMatchingItem(null)} className="text-text-muted hover:text-text-primary">
                        <XCircle size={16} />
                    </button>
                </div>
            )}

            {showImport && <ModalImportar onClose={() => setShowImport(false)} />}
        </div>
    );
}
