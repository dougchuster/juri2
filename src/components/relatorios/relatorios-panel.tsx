"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Users, Scale, CheckSquare, CalendarClock, Newspaper,
    Download, Search, Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-fields";
import { formatDate } from "@/lib/utils";

type Tab = "clientes" | "processos" | "tarefas" | "prazos" | "publicacoes";

// ─── Types ───
interface ClienteRow {
    id: string; nome: string; tipoPessoa: string; status: string; email: string | null;
    telefone: string | null; crmRelationship: string; createdAt: string;
    processos: { id: string }[];
}
interface ProcessoRow {
    id: string; numeroCnj: string | null; tipo: string; status: string; resultado: string;
    valorCausa: unknown; dataDistribuicao: string | null; createdAt: string;
    cliente: { nome: string } | null;
    advogado: { oab: string; user: { name: string | null } };
    tipoAcao: { nome: string } | null;
    faseProcessual: { nome: string } | null;
}
interface TarefaRow {
    id: string; titulo: string; status: string; prioridade: string; pontos: number;
    dataLimite: string | null; concluidaEm: string | null; categoriaEntrega: string | null;
    createdAt: string;
    advogado: { user: { name: string | null } };
    processo: { numeroCnj: string | null; cliente: { nome: string } | null } | null;
}
interface PrazoRow {
    id: string; descricao: string; dataFatal: string | null; status: string; origem: string;
    createdAt: string;
    advogado: { user: { name: string | null } };
    processo: { numeroCnj: string | null; cliente: { nome: string } | null } | null;
}
interface PublicacaoRow {
    id: string; tribunal: string | null; dataPublicacao: string | null; status: string;
    importadaEm: string;
    processo: { numeroCnj: string | null; cliente: { nome: string } | null } | null;
}

interface Props {
    clientes: ClienteRow[];
    processos: ProcessoRow[];
    tarefas: TarefaRow[];
    prazos: PrazoRow[];
    publicacoes: PublicacaoRow[];
    stats: { clientes: number; processos: number; tarefas: number; prazos: number; publicacoes: number };
    advogados: { id: string; user: { name: string | null } }[];
    searchParams: Record<string, string>;
}

const STATUS_COLORS: Record<string, string> = {
    PROSPECTO: "muted", ATIVO: "success", INATIVO: "muted",
    EM_ANDAMENTO: "default", ENCERRADO: "muted", ARQUIVADO: "muted",
    SENTENCA: "warning", RECURSO: "danger",
    A_FAZER: "muted", REVISAO: "warning", CONCLUIDA: "success", CANCELADA: "muted",
    PENDENTE: "warning", CONCLUIDO: "success", VENCIDO: "danger",
    NAO_TRATADA: "warning", TRATADA: "success", DESCARTADA: "muted",
};

function csvDownload(filename: string, rows: string[][]) {
    const content = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

export function RelatoriosPanel({ clientes, processos, tarefas, prazos, publicacoes, stats, advogados, searchParams }: Props) {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>((searchParams.tab as Tab) || "clientes");
    const [search, setSearch] = useState(searchParams.search || "");

    function applySearch() {
        const sp = new URLSearchParams({ ...searchParams, search, tab });
        router.push(`?${sp.toString()}`);
    }

    function filterRows<T extends { nome?: string; titulo?: string; descricao?: string; numeroCnj?: string | null; tribunal?: string | null }>(rows: T[]): T[] {
        if (!search) return rows;
        const q = search.toLowerCase();
        return rows.filter((r) =>
            Object.values(r).some((v) => typeof v === "string" && v.toLowerCase().includes(q))
        );
    }

    const tabs: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
        { id: "clientes",    label: "Clientes",    icon: Users,         count: stats.clientes },
        { id: "processos",   label: "Processos",   icon: Scale,         count: stats.processos },
        { id: "tarefas",     label: "Tarefas",     icon: CheckSquare,   count: stats.tarefas },
        { id: "prazos",      label: "Prazos",      icon: CalendarClock, count: stats.prazos },
        { id: "publicacoes", label: "Publicações", icon: Newspaper,     count: stats.publicacoes },
    ];

    function handleExport() {
        if (tab === "clientes") {
            const data = [
                ["Nome", "Tipo", "Status", "E-mail", "Telefone", "Processos Ativos", "Cadastrado em"],
                ...filterRows(clientes).map((r) => [r.nome, r.tipoPessoa, r.status, r.email ?? "", r.telefone ?? "", String(r.processos.length), formatDate(r.createdAt)]),
            ];
            csvDownload("clientes.csv", data);
        } else if (tab === "processos") {
            const data = [
                ["Nº CNJ", "Cliente", "Tipo", "Status", "Área", "Fase", "Advogado", "Valor Causa", "Distribuição"],
                ...filterRows(processos).map((r) => [r.numeroCnj ?? "", r.cliente?.nome ?? "", r.tipo, r.status, r.tipoAcao?.nome ?? "", r.faseProcessual?.nome ?? "", r.advogado.user.name ?? "", String(r.valorCausa ?? ""), r.dataDistribuicao ? formatDate(r.dataDistribuicao) : ""]),
            ];
            csvDownload("processos.csv", data);
        } else if (tab === "tarefas") {
            const data = [
                ["Título", "Status", "Prioridade", "Responsável", "Processo", "Prazo", "Pontos", "Criada em"],
                ...filterRows(tarefas).map((r) => [r.titulo, r.status, r.prioridade, r.advogado.user.name ?? "", r.processo?.numeroCnj ?? "", r.dataLimite ? formatDate(r.dataLimite) : "", String(r.pontos), formatDate(r.createdAt)]),
            ];
            csvDownload("tarefas.csv", data);
        } else if (tab === "prazos") {
            const data = [
                ["Descrição", "Data Fatal", "Status", "Origem", "Responsável", "Processo"],
                ...filterRows(prazos).map((r) => [r.descricao, r.dataFatal ? formatDate(r.dataFatal) : "", r.status, r.origem, r.advogado.user.name ?? "", r.processo?.numeroCnj ?? ""]),
            ];
            csvDownload("prazos.csv", data);
        } else if (tab === "publicacoes") {
            const data = [
                ["Tribunal", "Data Publicação", "Status", "Importada Em", "Processo"],
                ...filterRows(publicacoes).map((r) => [r.tribunal ?? "", r.dataPublicacao ? formatDate(r.dataPublicacao) : "", r.status, formatDate(r.importadaEm), r.processo?.numeroCnj ?? ""]),
            ];
            csvDownload("publicacoes.csv", data);
        }
    }

    const filteredClientes = filterRows(clientes);
    const filteredProcessos = filterRows(processos);
    const filteredTarefas = filterRows(tarefas);
    const filteredPrazos = filterRows(prazos);
    const filteredPublicacoes = filterRows(publicacoes);

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    {tabs.map((t) => {
                        const Icon = t.icon;
                        return (
                            <button key={t.id} onClick={() => { setTab(t.id); router.push(`?tab=${t.id}`); }}
                                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${tab === t.id ? "border-accent bg-accent/10 text-accent" : "border-border text-text-muted hover:text-text-primary hover:border-accent/40"}`}>
                                <Icon size={12} />{t.label}
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === t.id ? "bg-accent/20 text-accent" : "bg-bg-tertiary text-text-muted"}`}>{t.count}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-secondary px-3 py-1.5">
                        <Search size={12} className="text-text-muted" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && applySearch()}
                            placeholder="Filtrar..."
                            className="w-40 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted" />
                    </div>
                    <Button variant="secondary" size="sm" onClick={handleExport}>
                        <Download size={12} /> Exportar CSV
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    {/* CLIENTES */}
                    {tab === "clientes" && (
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-border">
                                {["Nome", "Tipo", "Status", "E-mail", "Telefone", "Processos Ativos", "Cadastrado"].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-border">
                                {filteredClientes.length === 0 ? (
                                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-text-muted">Nenhum cliente encontrado</td></tr>
                                ) : filteredClientes.map((r) => (
                                    <tr key={r.id} className="hover:bg-bg-tertiary/20 transition-colors">
                                        <td className="px-4 py-3 font-medium text-text-primary text-xs">{r.nome}</td>
                                        <td className="px-4 py-3 text-xs text-text-muted">{r.tipoPessoa === "FISICA" ? "Pessoa Física" : "Pessoa Jurídica"}</td>
                                        <td className="px-4 py-3"><Badge variant={(STATUS_COLORS[r.status] || "default") as never}>{r.status}</Badge></td>
                                        <td className="px-4 py-3 text-xs text-text-muted">{r.email || "—"}</td>
                                        <td className="px-4 py-3 text-xs text-text-muted">{r.telefone || "—"}</td>
                                        <td className="px-4 py-3 text-xs font-mono text-center">{r.processos.length}</td>
                                        <td className="px-4 py-3 text-xs font-mono text-text-muted">{formatDate(r.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* PROCESSOS */}
                    {tab === "processos" && (
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-border">
                                {["Nº CNJ", "Cliente", "Tipo", "Status", "Advogado", "Fase", "Valor Causa", "Distribuição"].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-border">
                                {filteredProcessos.length === 0 ? (
                                    <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-text-muted">Nenhum processo encontrado</td></tr>
                                ) : filteredProcessos.map((r) => (
                                    <tr key={r.id} className="hover:bg-bg-tertiary/20 transition-colors">
                                        <td className="px-4 py-3 text-xs font-mono text-accent">{r.numeroCnj || "—"}</td>
                                        <td className="px-4 py-3 text-xs font-medium">{r.cliente?.nome || "—"}</td>
                                        <td className="px-4 py-3 text-xs text-text-muted">{r.tipo}</td>
                                        <td className="px-4 py-3"><Badge variant={(STATUS_COLORS[r.status] || "default") as never}>{r.status}</Badge></td>
                                        <td className="px-4 py-3 text-xs">{r.advogado.user.name || "—"}</td>
                                        <td className="px-4 py-3 text-xs text-text-muted">{r.faseProcessual?.nome || "—"}</td>
                                        <td className="px-4 py-3 text-xs font-mono">
                                            {r.valorCausa ? `R$ ${Number(r.valorCausa).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}` : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono text-text-muted">{r.dataDistribuicao ? formatDate(r.dataDistribuicao) : "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* TAREFAS */}
                    {tab === "tarefas" && (
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-border">
                                {["Título", "Status", "Prioridade", "Responsável", "Processo", "Data Limite", "Entrega", "Pts"].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-border">
                                {filteredTarefas.length === 0 ? (
                                    <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-text-muted">Nenhuma tarefa encontrada</td></tr>
                                ) : filteredTarefas.map((r) => (
                                    <tr key={r.id} className="hover:bg-bg-tertiary/20 transition-colors">
                                        <td className="px-4 py-3 text-xs font-medium max-w-[200px] truncate">{r.titulo}</td>
                                        <td className="px-4 py-3"><Badge variant={(STATUS_COLORS[r.status] || "default") as never}>{r.status}</Badge></td>
                                        <td className="px-4 py-3 text-xs text-text-muted">{r.prioridade}</td>
                                        <td className="px-4 py-3 text-xs">{r.advogado.user.name || "—"}</td>
                                        <td className="px-4 py-3 text-xs font-mono text-accent">{r.processo?.numeroCnj || r.processo?.cliente?.nome || "—"}</td>
                                        <td className="px-4 py-3 text-xs font-mono">{r.dataLimite ? formatDate(r.dataLimite) : "—"}</td>
                                        <td className="px-4 py-3">
                                            {r.categoriaEntrega ? (
                                                <Badge variant={r.categoriaEntrega === "FORA_PRAZO" ? "danger" : "success"}>
                                                    {r.categoriaEntrega === "FORA_PRAZO" ? "Atrasada" : r.categoriaEntrega === "D_0" ? "No dia" : "Adiantada"}
                                                </Badge>
                                            ) : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono font-bold text-yellow-400">{r.pontos}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* PRAZOS */}
                    {tab === "prazos" && (
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-border">
                                {["Descrição", "Data Fatal", "Status", "Origem", "Responsável", "Processo"].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-border">
                                {filteredPrazos.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">Nenhum prazo encontrado</td></tr>
                                ) : filteredPrazos.map((r) => (
                                    <tr key={r.id} className="hover:bg-bg-tertiary/20 transition-colors">
                                        <td className="px-4 py-3 text-xs font-medium max-w-[220px] truncate">{r.descricao}</td>
                                        <td className="px-4 py-3 text-xs font-mono">{r.dataFatal ? formatDate(r.dataFatal) : "—"}</td>
                                        <td className="px-4 py-3"><Badge variant={(STATUS_COLORS[r.status] || "default") as never}>{r.status}</Badge></td>
                                        <td className="px-4 py-3 text-xs text-text-muted">{r.origem}</td>
                                        <td className="px-4 py-3 text-xs">{r.advogado.user.name || "—"}</td>
                                        <td className="px-4 py-3 text-xs font-mono text-accent">{r.processo?.numeroCnj || r.processo?.cliente?.nome || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* PUBLICACOES */}
                    {tab === "publicacoes" && (
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-border">
                                {["Tribunal", "Data Publicação", "Status", "Importada Em", "Processo"].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-border">
                                {filteredPublicacoes.length === 0 ? (
                                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">Nenhuma publicação encontrada</td></tr>
                                ) : filteredPublicacoes.map((r) => (
                                    <tr key={r.id} className="hover:bg-bg-tertiary/20 transition-colors">
                                        <td className="px-4 py-3 text-xs font-mono">{r.tribunal || "—"}</td>
                                        <td className="px-4 py-3 text-xs font-mono">{r.dataPublicacao ? formatDate(r.dataPublicacao) : "—"}</td>
                                        <td className="px-4 py-3"><Badge variant={(STATUS_COLORS[r.status] || "default") as never}>{r.status}</Badge></td>
                                        <td className="px-4 py-3 text-xs text-text-muted truncate max-w-[200px]">{formatDate(r.importadaEm)}</td>
                                        <td className="px-4 py-3 text-xs font-mono text-accent">{r.processo?.numeroCnj || r.processo?.cliente?.nome || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
