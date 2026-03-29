"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    CalendarClock,
    CheckSquare,
    Newspaper,
    Scale,
    Search,
    Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ExportButton } from "@/components/ui/export-button";
import { formatDate } from "@/lib/utils";

type Tab = "clientes" | "processos" | "tarefas" | "prazos" | "publicacoes";

interface ClienteRow {
    id: string;
    nome: string;
    tipoPessoa: string;
    status: string;
    email: string | null;
    telefone: string | null;
    crmRelationship: string;
    createdAt: string;
    processos: { id: string }[];
}

interface ProcessoRow {
    id: string;
    numeroCnj: string | null;
    tipo: string;
    status: string;
    resultado: string;
    valorCausa: unknown;
    dataDistribuicao: string | null;
    createdAt: string;
    cliente: { nome: string } | null;
    advogado: { oab: string; user: { name: string | null } };
    tipoAcao: { nome: string } | null;
    faseProcessual: { nome: string } | null;
}

interface TarefaRow {
    id: string;
    titulo: string;
    status: string;
    prioridade: string;
    pontos: number;
    dataLimite: string | null;
    concluidaEm: string | null;
    categoriaEntrega: string | null;
    createdAt: string;
    advogado: { user: { name: string | null } };
    processo: { numeroCnj: string | null; cliente: { nome: string } | null } | null;
}

interface PrazoRow {
    id: string;
    descricao: string;
    dataFatal: string | null;
    status: string;
    origem: string;
    createdAt: string;
    advogado: { user: { name: string | null } };
    processo: { numeroCnj: string | null; cliente: { nome: string } | null } | null;
}

interface PublicacaoRow {
    id: string;
    tribunal: string | null;
    dataPublicacao: string | null;
    status: string;
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
    PROSPECTO: "muted",
    ATIVO: "success",
    INATIVO: "muted",
    EM_ANDAMENTO: "default",
    ENCERRADO: "muted",
    ARQUIVADO: "muted",
    SENTENCA: "warning",
    RECURSO: "danger",
    A_FAZER: "muted",
    REVISAO: "warning",
    CONCLUIDA: "success",
    CANCELADA: "muted",
    PENDENTE: "warning",
    CONCLUIDO: "success",
    VENCIDO: "danger",
    NAO_TRATADA: "warning",
    TRATADA: "success",
    DESCARTADA: "muted",
};

export function RelatoriosPanel({
    clientes,
    processos,
    tarefas,
    prazos,
    publicacoes,
    stats,
    advogados: _advogados,
    searchParams,
}: Props) {
    void _advogados;
    const router = useRouter();
    const [tab, setTab] = useState<Tab>((searchParams.tab as Tab) || "clientes");
    const [search, setSearch] = useState(searchParams.search || "");

    function applySearch() {
        const sp = new URLSearchParams({ ...searchParams, search, tab });
        router.push(`?${sp.toString()}`);
    }

    function filterRows<T extends object>(rows: T[]): T[] {
        if (!search) return rows;
        const q = search.toLowerCase();

        return rows.filter((row) =>
            Object.values(row as Record<string, unknown>).some(
                (value) => typeof value === "string" && value.toLowerCase().includes(q)
            )
        );
    }

    const tabs: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
        { id: "clientes", label: "Clientes", icon: Users, count: stats.clientes },
        { id: "processos", label: "Processos", icon: Scale, count: stats.processos },
        { id: "tarefas", label: "Tarefas", icon: CheckSquare, count: stats.tarefas },
        { id: "prazos", label: "Prazos", icon: CalendarClock, count: stats.prazos },
        { id: "publicacoes", label: "Publicacoes", icon: Newspaper, count: stats.publicacoes },
    ];

    const filteredClientes = filterRows(clientes);
    const filteredProcessos = filterRows(processos);
    const filteredTarefas = filterRows(tarefas);
    const filteredPrazos = filterRows(prazos);
    const filteredPublicacoes = filterRows(publicacoes);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    {tabs.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setTab(item.id);
                                    router.push(`?tab=${item.id}`);
                                }}
                                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                                    tab === item.id
                                        ? "border-accent bg-accent/10 text-accent"
                                        : "border-border text-text-muted hover:border-accent/40 hover:text-text-primary"
                                }`}
                            >
                                <Icon size={12} />
                                {item.label}
                                <span
                                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                        tab === item.id
                                            ? "bg-accent/20 text-accent"
                                            : "bg-bg-tertiary text-text-muted"
                                    }`}
                                >
                                    {item.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex gap-2">
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-secondary px-3 py-1.5">
                        <Search size={12} className="text-text-muted" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            onKeyDown={(event) => event.key === "Enter" && applySearch()}
                            placeholder="Filtrar..."
                            className="w-40 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted"
                        />
                    </div>
                    <ExportButton
                        basePath="/api/relatorios/export"
                        query={{
                            tab,
                            search,
                            de: searchParams.de,
                            ate: searchParams.ate,
                            advogadoId: searchParams.advogadoId,
                        }}
                    />
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    {tab === "clientes" ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    {["Nome", "Tipo", "Status", "E-mail", "Telefone", "Processos Ativos", "Cadastrado"].map((header) => (
                                        <th
                                            key={header}
                                            className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted"
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredClientes.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-text-muted">
                                            Nenhum cliente encontrado
                                        </td>
                                    </tr>
                                ) : (
                                    filteredClientes.map((row) => (
                                        <tr key={row.id} className="transition-colors hover:bg-bg-tertiary/20">
                                            <td className="px-4 py-3 text-xs font-medium text-text-primary">{row.nome}</td>
                                            <td className="px-4 py-3 text-xs text-text-muted">
                                                {row.tipoPessoa === "FISICA" ? "Pessoa Fisica" : "Pessoa Juridica"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={(STATUS_COLORS[row.status] || "default") as never}>{row.status}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-text-muted">{row.email || "-"}</td>
                                            <td className="px-4 py-3 text-xs text-text-muted">{row.telefone || "-"}</td>
                                            <td className="px-4 py-3 text-center font-mono text-xs">{row.processos.length}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-text-muted">{formatDate(row.createdAt)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : null}

                    {tab === "processos" ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    {["Numero CNJ", "Cliente", "Tipo", "Status", "Advogado", "Fase", "Valor Causa", "Distribuicao"].map((header) => (
                                        <th
                                            key={header}
                                            className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted"
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredProcessos.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-text-muted">
                                            Nenhum processo encontrado
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProcessos.map((row) => (
                                        <tr key={row.id} className="transition-colors hover:bg-bg-tertiary/20">
                                            <td className="px-4 py-3 font-mono text-xs text-accent">{row.numeroCnj || "-"}</td>
                                            <td className="px-4 py-3 text-xs font-medium">{row.cliente?.nome || "-"}</td>
                                            <td className="px-4 py-3 text-xs text-text-muted">{row.tipo}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={(STATUS_COLORS[row.status] || "default") as never}>{row.status}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs">{row.advogado.user.name || "-"}</td>
                                            <td className="px-4 py-3 text-xs text-text-muted">{row.faseProcessual?.nome || "-"}</td>
                                            <td className="px-4 py-3 font-mono text-xs">
                                                {row.valorCausa
                                                    ? `R$ ${Number(row.valorCausa).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`
                                                    : "-"}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-text-muted">
                                                {row.dataDistribuicao ? formatDate(row.dataDistribuicao) : "-"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : null}

                    {tab === "tarefas" ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    {["Titulo", "Status", "Prioridade", "Responsavel", "Processo", "Data Limite", "Entrega", "Pts"].map((header) => (
                                        <th
                                            key={header}
                                            className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted"
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredTarefas.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-text-muted">
                                            Nenhuma tarefa encontrada
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTarefas.map((row) => (
                                        <tr key={row.id} className="transition-colors hover:bg-bg-tertiary/20">
                                            <td className="max-w-[200px] truncate px-4 py-3 text-xs font-medium">{row.titulo}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={(STATUS_COLORS[row.status] || "default") as never}>{row.status}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-text-muted">{row.prioridade}</td>
                                            <td className="px-4 py-3 text-xs">{row.advogado.user.name || "-"}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-accent">
                                                {row.processo?.numeroCnj || row.processo?.cliente?.nome || "-"}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs">
                                                {row.dataLimite ? formatDate(row.dataLimite) : "-"}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.categoriaEntrega ? (
                                                    <Badge variant={row.categoriaEntrega === "FORA_PRAZO" ? "danger" : "success"}>
                                                        {row.categoriaEntrega === "FORA_PRAZO"
                                                            ? "Atrasada"
                                                            : row.categoriaEntrega === "D_0"
                                                                ? "No dia"
                                                                : "Adiantada"}
                                                    </Badge>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs font-bold text-yellow-400">{row.pontos}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : null}

                    {tab === "prazos" ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    {["Descricao", "Data Fatal", "Status", "Origem", "Responsavel", "Processo"].map((header) => (
                                        <th
                                            key={header}
                                            className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted"
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredPrazos.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">
                                            Nenhum prazo encontrado
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPrazos.map((row) => (
                                        <tr key={row.id} className="transition-colors hover:bg-bg-tertiary/20">
                                            <td className="max-w-[220px] truncate px-4 py-3 text-xs font-medium">{row.descricao}</td>
                                            <td className="px-4 py-3 font-mono text-xs">{row.dataFatal ? formatDate(row.dataFatal) : "-"}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={(STATUS_COLORS[row.status] || "default") as never}>{row.status}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-text-muted">{row.origem}</td>
                                            <td className="px-4 py-3 text-xs">{row.advogado.user.name || "-"}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-accent">
                                                {row.processo?.numeroCnj || row.processo?.cliente?.nome || "-"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : null}

                    {tab === "publicacoes" ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    {["Tribunal", "Data Publicacao", "Status", "Importada Em", "Processo"].map((header) => (
                                        <th
                                            key={header}
                                            className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted"
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredPublicacoes.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">
                                            Nenhuma publicacao encontrada
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPublicacoes.map((row) => (
                                        <tr key={row.id} className="transition-colors hover:bg-bg-tertiary/20">
                                            <td className="px-4 py-3 font-mono text-xs">{row.tribunal || "-"}</td>
                                            <td className="px-4 py-3 font-mono text-xs">
                                                {row.dataPublicacao ? formatDate(row.dataPublicacao) : "-"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={(STATUS_COLORS[row.status] || "default") as never}>{row.status}</Badge>
                                            </td>
                                            <td className="max-w-[200px] truncate px-4 py-3 text-xs text-text-muted">{formatDate(row.importadaEm)}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-accent">
                                                {row.processo?.numeroCnj || row.processo?.cliente?.nome || "-"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
