"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    DollarSign, FileText, CreditCard,
    Plus, Check, Trash2, Search, Loader2,
    ChevronLeft, ChevronRight, AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import {
    createHonorario, deleteHonorario,
    createFatura, marcarFaturaPaga, deleteFatura,
    createContaPagar, marcarContaPaga, deleteContaPagar,
} from "@/actions/financeiro";
import { formatDate, formatCurrency } from "@/lib/utils";

// ── Types ──
interface HonorarioItem {
    id: string; tipo: string; status: string;
    valorTotal: string; descricao: string | null;
    dataContrato: string; percentualExito: string | null;
    processo: { id: string; numeroCnj: string | null };
    cliente: { id: string; nome: string };
    _count: { faturas: number };
}

interface FaturaItem {
    id: string; numero: string; status: string;
    valorTotal: string; dataEmissao: string;
    dataVencimento: string; dataPagamento: string | null;
    descricao: string | null;
    cliente: { id: string; nome: string };
    honorario: { id: string; tipo: string } | null;
    _count: { parcelas: number };
}

interface ContaItem {
    id: string; descricao: string; tipo: string;
    valor: string; dataVencimento: string;
    dataPagamento: string | null; pago: boolean;
    processo: { id: string; numeroCnj: string | null } | null;
    centroCusto: { id: string; nome: string } | null;
}

interface PaginatedResult<T> { total: number; page: number; totalPages: number;[key: string]: T[] | number; }
interface AdvOption { id: string; user: { name: string | null } }
interface ClienteOption { id: string; nome: string; cpf: string | null; cnpj: string | null }
interface CentroCustoOption { id: string; nome: string }
interface ProcessoOption { id: string; numeroCnj: string | null; cliente: { nome: string } }

interface FinanceiroTabsProps {
    activeTab: string;
    honorarios: PaginatedResult<HonorarioItem> & { honorarios: HonorarioItem[] };
    faturas: PaginatedResult<FaturaItem> & { faturas: FaturaItem[] };
    contas: PaginatedResult<ContaItem> & { contas: ContaItem[] };
    advogados: AdvOption[];
    clientes: ClienteOption[];
    centrosCusto: CentroCustoOption[];
    processos: ProcessoOption[];
    searchParams: Record<string, string>;
}

const TABS = [
    { id: "honorarios", label: "Honorários", icon: DollarSign },
    { id: "faturas", label: "Faturas", icon: FileText },
    { id: "contas", label: "Contas a Pagar", icon: CreditCard },
];

const TIPO_HONORARIO: Record<string, string> = { FIXO: "Fixo", EXITO: "Êxito", POR_HORA: "Por Hora", MISTO: "Misto" };
const STATUS_FATURA_COLORS: Record<string, string> = { PENDENTE: "warning", PAGA: "success", ATRASADA: "danger", CANCELADA: "muted" };
const TIPO_CONTA: Record<string, string> = { CUSTO_PROCESSUAL: "Processual", DESPESA_ESCRITORIO: "Escritório", FORNECEDOR: "Fornecedor", IMPOSTO: "Imposto", OUTRO: "Outro" };

export function FinanceiroTabs({
    activeTab, honorarios, faturas, contas,
    advogados, clientes, centrosCusto, processos, searchParams,
}: FinanceiroTabsProps) {
    const router = useRouter();
    const [tab, setTab] = useState(activeTab);
    const [showCreateHonorario, setShowCreateHonorario] = useState(false);
    const [showCreateFatura, setShowCreateFatura] = useState(false);
    const [showCreateConta, setShowCreateConta] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<{ type: string; id: string } | null>(null);

    function switchTab(newTab: string) {
        setTab(newTab);
        router.push(`/financeiro?tab=${newTab}`);
    }

    async function handleDeleteConfirm() {
        if (!deletingId) return;
        if (deletingId.type === "honorario") await deleteHonorario(deletingId.id);
        else if (deletingId.type === "fatura") await deleteFatura(deletingId.id);
        else if (deletingId.type === "conta") await deleteContaPagar(deletingId.id);
        setDeletingId(null);
        router.refresh();
    }

    async function handleCreateHonorario(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const f = new FormData(e.currentTarget);
        await createHonorario({
            processoId: f.get("processoId") as string,
            clienteId: f.get("clienteId") as string,
            tipo: f.get("tipo") as "FIXO",
            status: "ATIVO",
            valorTotal: f.get("valorTotal") as string,
            percentualExito: f.get("percentualExito") as string,
            valorHora: f.get("valorHora") as string,
            descricao: f.get("descricao") as string,
            dataContrato: f.get("dataContrato") as string,
        });
        setLoading(false);
        setShowCreateHonorario(false);
        router.refresh();
    }

    async function handleCreateFatura(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const f = new FormData(e.currentTarget);
        await createFatura({
            clienteId: f.get("clienteId") as string,
            honorarioId: f.get("honorarioId") as string,
            valorTotal: f.get("valorTotal") as string,
            dataEmissao: f.get("dataEmissao") as string,
            dataVencimento: f.get("dataVencimento") as string,
            descricao: f.get("descricao") as string,
            recorrente: f.get("recorrente") === "true",
            centroCustoId: f.get("centroCustoId") as string,
            parcelas: parseInt(f.get("parcelas") as string) || 1,
        });
        setLoading(false);
        setShowCreateFatura(false);
        router.refresh();
    }

    async function handleCreateConta(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const f = new FormData(e.currentTarget);
        await createContaPagar({
            descricao: f.get("descricao") as string,
            tipo: f.get("tipo") as "DESPESA_ESCRITORIO",
            valor: f.get("valor") as string,
            dataVencimento: f.get("dataVencimento") as string,
            processoId: f.get("processoId") as string,
            centroCustoId: f.get("centroCustoId") as string,
            contaBancariaId: "",
        });
        setLoading(false);
        setShowCreateConta(false);
        router.refresh();
    }

    const now = new Date();

    return (
        <>
            {/* Tab Navigation */}
            <div className="flex items-center gap-1 border-b border-border">
                {TABS.map((t) => (
                    <button key={t.id} onClick={() => switchTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${tab === t.id ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-primary"}`}>
                        <t.icon size={16} />{t.label}
                    </button>
                ))}
            </div>

            {/* ── TAB: Honorários ── */}
            {tab === "honorarios" && (
                <div>
                    <div className="flex justify-end mb-4">
                        <Button size="sm" onClick={() => setShowCreateHonorario(true)}><Plus size={16} /> Novo Honorário</Button>
                    </div>
                    <div className="glass-card overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-bg-tertiary/50">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Cliente</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Processo</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Tipo</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Valor</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {honorarios.honorarios.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-text-muted">Nenhum honorário encontrado.</td></tr>
                                ) : honorarios.honorarios.map((h) => (
                                    <tr key={h.id} className="border-b border-border last:border-0 hover:bg-bg-tertiary transition-colors">
                                        <td className="px-4 py-3 text-sm text-text-primary">{h.cliente.nome}</td>
                                        <td className="px-4 py-3">
                                            <Link href={`/processos/${h.processo.id}`} className="text-sm font-mono text-accent hover:underline">
                                                {h.processo.numeroCnj || "Sem nº"}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">{TIPO_HONORARIO[h.tipo] || h.tipo}</td>
                                        <td className="px-4 py-3 text-sm text-right font-mono text-text-primary">{formatCurrency(h.valorTotal)}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={h.status === "ATIVO" ? "success" : h.status === "SUSPENSO" ? "warning" : "muted"}>
                                                {h.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => setDeletingId({ type: "honorario", id: h.id })}
                                                className="rounded-lg p-1.5 text-text-muted hover:text-danger transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── TAB: Faturas ── */}
            {tab === "faturas" && (
                <div>
                    <div className="flex justify-end mb-4">
                        <Button size="sm" onClick={() => setShowCreateFatura(true)}><Plus size={16} /> Nova Fatura</Button>
                    </div>
                    <div className="glass-card overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-bg-tertiary/50">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Número</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Cliente</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Valor</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Vencimento</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {faturas.faturas.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-text-muted">Nenhuma fatura encontrada.</td></tr>
                                ) : faturas.faturas.map((f) => {
                                    const venc = new Date(f.dataVencimento);
                                    const isOverdue = f.status === "PENDENTE" && venc < now;
                                    return (
                                        <tr key={f.id} className={`border-b border-border last:border-0 hover:bg-bg-tertiary transition-colors ${isOverdue ? "bg-danger/5" : ""}`}>
                                            <td className="px-4 py-3 text-sm font-mono text-text-primary">{f.numero}</td>
                                            <td className="px-4 py-3 text-sm text-text-primary">{f.cliente.nome}</td>
                                            <td className="px-4 py-3 text-sm text-right font-mono text-text-primary">{formatCurrency(f.valorTotal)}</td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-text-primary">{formatDate(f.dataVencimento)}</div>
                                                {isOverdue && <span className="text-xs text-danger flex items-center gap-1"><AlertTriangle size={10} />Atrasada</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={(STATUS_FATURA_COLORS[isOverdue ? "ATRASADA" : f.status] || "muted") as "success" | "warning" | "danger" | "muted"}>
                                                    {isOverdue ? "Atrasada" : f.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    {f.status === "PENDENTE" && (
                                                        <button onClick={async () => { await marcarFaturaPaga(f.id); router.refresh(); }}
                                                            title="Marcar como paga"
                                                            className="rounded-lg p-1.5 text-text-muted hover:text-success transition-colors">
                                                            <Check size={16} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => setDeletingId({ type: "fatura", id: f.id })}
                                                        className="rounded-lg p-1.5 text-text-muted hover:text-danger transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── TAB: Contas a Pagar ── */}
            {tab === "contas" && (
                <div>
                    <div className="flex justify-end mb-4">
                        <Button size="sm" onClick={() => setShowCreateConta(true)}><Plus size={16} /> Nova Conta</Button>
                    </div>
                    <div className="glass-card overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-bg-tertiary/50">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Descrição</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Tipo</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Valor</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Vencimento</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contas.contas.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-text-muted">Nenhuma conta encontrada.</td></tr>
                                ) : contas.contas.map((c) => {
                                    const venc = new Date(c.dataVencimento);
                                    const isOverdue = !c.pago && venc < now;
                                    return (
                                        <tr key={c.id} className={`border-b border-border last:border-0 hover:bg-bg-tertiary transition-colors ${isOverdue ? "bg-danger/5" : ""}`}>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-text-primary">{c.descricao}</span>
                                                {c.processo && <p className="text-xs text-accent font-mono">{c.processo.numeroCnj}</p>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-text-secondary">{TIPO_CONTA[c.tipo] || c.tipo}</td>
                                            <td className="px-4 py-3 text-sm text-right font-mono text-text-primary">{formatCurrency(c.valor)}</td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-text-primary">{formatDate(c.dataVencimento)}</div>
                                                {isOverdue && <span className="text-xs text-danger">Vencida</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={c.pago ? "success" : isOverdue ? "danger" : "warning"}>
                                                    {c.pago ? "Pago" : isOverdue ? "Vencida" : "Pendente"}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    {!c.pago && (
                                                        <button onClick={async () => { await marcarContaPaga(c.id); router.refresh(); }}
                                                            title="Marcar como paga"
                                                            className="rounded-lg p-1.5 text-text-muted hover:text-success transition-colors">
                                                            <Check size={16} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => setDeletingId({ type: "conta", id: c.id })}
                                                        className="rounded-lg p-1.5 text-text-muted hover:text-danger transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── MODALS ── */}

            {/* Create Honorário */}
            <Modal isOpen={showCreateHonorario} onClose={() => setShowCreateHonorario(false)} title="Novo Honorário" size="lg">
                <form onSubmit={handleCreateHonorario} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Select id="hon-clienteId" name="clienteId" label="Cliente *" required placeholder="Selecionar"
                            options={clientes.map(c => ({ value: c.id, label: c.nome }))} />
                        <Select id="hon-processoId" name="processoId" label="Processo *" required placeholder="Selecionar"
                            options={processos.map(p => ({ value: p.id, label: `${p.numeroCnj || "Sem nº"} — ${p.cliente?.nome || "Sem cliente"}` }))} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Select id="hon-tipo" name="tipo" label="Tipo *"
                            options={[
                                { value: "FIXO", label: "Fixo" }, { value: "EXITO", label: "Êxito" },
                                { value: "POR_HORA", label: "Por Hora" }, { value: "MISTO", label: "Misto" },
                            ]} />
                        <Input id="hon-valorTotal" name="valorTotal" label="Valor Total *" type="number" step="0.01" min={0} required />
                        <Input id="hon-dataContrato" name="dataContrato" label="Data Contrato *" type="date" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input id="hon-percentualExito" name="percentualExito" label="% Êxito" type="number" step="0.01" />
                        <Input id="hon-valorHora" name="valorHora" label="Valor/Hora" type="number" step="0.01" />
                    </div>
                    <Textarea id="hon-descricao" name="descricao" label="Descrição" rows={2} />
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowCreateHonorario(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>{loading ? <Loader2 size={16} className="animate-spin" /> : "Criar Honorário"}</Button>
                    </div>
                </form>
            </Modal>

            {/* Create Fatura */}
            <Modal isOpen={showCreateFatura} onClose={() => setShowCreateFatura(false)} title="Nova Fatura" size="lg">
                <form onSubmit={handleCreateFatura} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Select id="fat-clienteId" name="clienteId" label="Cliente *" required placeholder="Selecionar"
                            options={clientes.map(c => ({ value: c.id, label: c.nome }))} />
                        <Select id="fat-honorarioId" name="honorarioId" label="Honorário (opcional)" placeholder="Nenhum"
                            options={honorarios.honorarios.map(h => ({ value: h.id, label: `${h.cliente.nome} — ${TIPO_HONORARIO[h.tipo]}` }))} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Input id="fat-valorTotal" name="valorTotal" label="Valor Total *" type="number" step="0.01" min={0} required />
                        <Input id="fat-dataEmissao" name="dataEmissao" label="Emissão *" type="date" required />
                        <Input id="fat-dataVencimento" name="dataVencimento" label="Vencimento *" type="date" required />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Input id="fat-parcelas" name="parcelas" label="Parcelas" type="number" min={1} max={48} defaultValue="1" />
                        <Select id="fat-recorrente" name="recorrente" label="Recorrente?"
                            options={[{ value: "false", label: "Não" }, { value: "true", label: "Sim" }]} />
                        <Select id="fat-centroCustoId" name="centroCustoId" label="Centro de Custo" placeholder="Nenhum"
                            options={centrosCusto.map(c => ({ value: c.id, label: c.nome }))} />
                    </div>
                    <Textarea id="fat-descricao" name="descricao" label="Descrição" rows={2} />
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowCreateFatura(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>{loading ? <Loader2 size={16} className="animate-spin" /> : "Criar Fatura"}</Button>
                    </div>
                </form>
            </Modal>

            {/* Create Conta a Pagar */}
            <Modal isOpen={showCreateConta} onClose={() => setShowCreateConta(false)} title="Nova Conta a Pagar" size="lg">
                <form onSubmit={handleCreateConta} className="space-y-4">
                    <Input id="cta-descricao" name="descricao" label="Descrição *" required placeholder="Descreva a despesa..." />
                    <div className="grid grid-cols-3 gap-4">
                        <Select id="cta-tipo" name="tipo" label="Tipo"
                            options={[
                                { value: "CUSTO_PROCESSUAL", label: "Processual" }, { value: "DESPESA_ESCRITORIO", label: "Escritório" },
                                { value: "FORNECEDOR", label: "Fornecedor" }, { value: "IMPOSTO", label: "Imposto" },
                                { value: "OUTRO", label: "Outro" },
                            ]} />
                        <Input id="cta-valor" name="valor" label="Valor *" type="number" step="0.01" min={0} required />
                        <Input id="cta-dataVencimento" name="dataVencimento" label="Vencimento *" type="date" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Select id="cta-processoId" name="processoId" label="Processo (opcional)" placeholder="Nenhum"
                            options={processos.map(p => ({ value: p.id, label: `${p.numeroCnj || "Sem nº"} — ${p.cliente?.nome || "Sem cliente"}` }))} />
                        <Select id="cta-centroCustoId" name="centroCustoId" label="Centro de Custo" placeholder="Nenhum"
                            options={centrosCusto.map(c => ({ value: c.id, label: c.nome }))} />
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowCreateConta(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>{loading ? <Loader2 size={16} className="animate-spin" /> : "Criar Conta"}</Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal isOpen={!!deletingId} onClose={() => setDeletingId(null)} title="Confirmar Exclusão" size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-text-secondary">Tem certeza que deseja excluir este registro?</p>
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setDeletingId(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm}>Excluir</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
