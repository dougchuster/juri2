"use client";

import { useEffect, useState, useCallback } from "react";
import {
    TrendingUp, Users, Briefcase, Scale,
    ChevronDown, ChevronUp, Trophy, AlertCircle,
    BarChart3, Clock, DollarSign
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface RentabilidadeAdvogado {
    advogadoId: string;
    nomeAdvogado: string;
    oab: string;
    totalProcessos: number;
    processosEncerrados: number;
    processosGanhos: number;
    taxaExito: number;
    valorTotalCausas: number;
    receitaBruta: number;
    receitaPendente: number;
    repassesRecebidos: number;
    repassesPendentes: number;
}

interface RentabilidadeCliente {
    clienteId: string;
    nomeCliente: string;
    totalProcessos: number;
    processosEncerrados: number;
    processosGanhos: number;
    taxaExito: number;
    valorTotalCausas: number;
    receitaBruta: number;
    receitaPendente: number;
    honorariosEmAberto: number;
}

interface RentabilidadeArea {
    areaDireito: string;
    totalProcessos: number;
    processosEncerrados: number;
    processosGanhos: number;
    taxaExito: number;
    valorMedioCausa: number;
    receitaBruta: number;
    receitaPendente: number;
    tempoMedioTramitacaoDias: number | null;
}

interface Resumo {
    totalProcessos: number;
    receitaBrutaTotal: number;
    receitaPendenteTotal: number;
    taxaExitoGeral: number;
    valorTotalCausas: number;
}

interface RentabilidadeData {
    periodo: { inicio: string; fim: string };
    porAdvogado: RentabilidadeAdvogado[];
    porCliente: RentabilidadeCliente[];
    porArea: RentabilidadeArea[];
    resumo: Resumo;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

function TaxaExitoBadge({ taxa }: { taxa: number }) {
    const color =
        taxa >= 70 ? "text-green-400 bg-green-400/10" :
            taxa >= 50 ? "text-yellow-400 bg-yellow-400/10" :
                "text-red-400 bg-red-400/10";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${color}`}>
            {taxa}%
        </span>
    );
}

// ─── Cards de resumo ───────────────────────────────────────────────────────────

function ResumoCards({ resumo }: { resumo: Resumo }) {
    const cards = [
        {
            label: "Total de Processos",
            value: resumo.totalProcessos.toLocaleString("pt-BR"),
            icon: Briefcase,
            color: "text-blue-400",
            bg: "bg-blue-400/10",
        },
        {
            label: "Receita Bruta Recebida",
            value: formatCurrency(resumo.receitaBrutaTotal),
            icon: DollarSign,
            color: "text-green-400",
            bg: "bg-green-400/10",
        },
        {
            label: "A Receber",
            value: formatCurrency(resumo.receitaPendenteTotal),
            icon: TrendingUp,
            color: "text-yellow-400",
            bg: "bg-yellow-400/10",
        },
        {
            label: "Taxa de Êxito Geral",
            value: `${resumo.taxaExitoGeral}%`,
            icon: Trophy,
            color: "text-purple-400",
            bg: "bg-purple-400/10",
        },
        {
            label: "Valor Total das Causas",
            value: formatCurrency(resumo.valorTotalCausas),
            icon: Scale,
            color: "text-orange-400",
            bg: "bg-orange-400/10",
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {cards.map((card) => (
                <div key={card.label} className="glass-card p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${card.bg}`}>
                            <card.icon size={16} className={card.color} />
                        </div>
                    </div>
                    <p className="text-xs text-text-muted">{card.label}</p>
                    <p className="text-lg font-bold text-text-primary mt-0.5">{card.value}</p>
                </div>
            ))}
        </div>
    );
}

// ─── Tabela por advogado ──────────────────────────────────────────────────────

function TabelaAdvogados({ data }: { data: RentabilidadeAdvogado[] }) {
    const [expanded, setExpanded] = useState(true);
    const [sortField, setSortField] = useState<keyof RentabilidadeAdvogado>("receitaBruta");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    function toggleSort(field: keyof RentabilidadeAdvogado) {
        if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortField(field); setSortDir("desc"); }
    }

    const sorted = [...data].sort((a, b) => {
        const va = a[sortField] as number;
        const vb = b[sortField] as number;
        return sortDir === "asc" ? va - vb : vb - va;
    });

    function SortIcon({ field }: { field: keyof RentabilidadeAdvogado }) {
        if (sortField !== field) return null;
        return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
    }

    return (
        <div className="glass-card overflow-hidden">
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-between p-5 hover:bg-bg-tertiary/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-400/10 rounded-lg">
                        <Users size={16} className="text-blue-400" />
                    </div>
                    <div className="text-left">
                        <h2 className="font-semibold text-text-primary">Rentabilidade por Advogado</h2>
                        <p className="text-xs text-text-muted">{data.length} advogado(s)</p>
                    </div>
                </div>
                {expanded ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
            </button>

            {expanded && (
                <div className="overflow-x-auto border-t border-border">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-bg-tertiary/50">
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Advogado</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase cursor-pointer hover:text-text-primary" onClick={() => toggleSort("totalProcessos")}>
                                    <span className="flex items-center justify-center gap-1">Processos <SortIcon field="totalProcessos" /></span>
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase cursor-pointer hover:text-text-primary" onClick={() => toggleSort("taxaExito")}>
                                    <span className="flex items-center justify-center gap-1">Taxa Êxito <SortIcon field="taxaExito" /></span>
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase cursor-pointer hover:text-text-primary" onClick={() => toggleSort("receitaBruta")}>
                                    <span className="flex items-center justify-end gap-1">Receita Recebida <SortIcon field="receitaBruta" /></span>
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase cursor-pointer hover:text-text-primary" onClick={() => toggleSort("receitaPendente")}>
                                    <span className="flex items-center justify-end gap-1">A Receber <SortIcon field="receitaPendente" /></span>
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase cursor-pointer hover:text-text-primary" onClick={() => toggleSort("repassesRecebidos")}>
                                    <span className="flex items-center justify-end gap-1">Repasses Recebidos <SortIcon field="repassesRecebidos" /></span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-text-muted">
                                        Nenhum dado encontrado para o período.
                                    </td>
                                </tr>
                            ) : sorted.map((adv, i) => (
                                <tr key={adv.advogadoId} className={`border-t border-border hover:bg-bg-tertiary/30 transition-colors ${i === 0 ? "bg-yellow-400/5" : ""}`}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {i === 0 && <Trophy size={14} className="text-yellow-400 shrink-0" />}
                                            <div>
                                                <p className="text-sm font-medium text-text-primary">{adv.nomeAdvogado}</p>
                                                <p className="text-xs text-text-muted">{adv.oab}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="text-sm text-text-primary">{adv.totalProcessos}</span>
                                        <p className="text-xs text-text-muted">{adv.processosEncerrados} encerrados</p>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <TaxaExitoBadge taxa={adv.taxaExito} />
                                        <p className="text-xs text-text-muted mt-0.5">{adv.processosGanhos} ganhos</p>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-sm font-mono font-medium text-green-400">{formatCurrency(adv.receitaBruta)}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-sm font-mono text-yellow-400">{formatCurrency(adv.receitaPendente)}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-sm font-mono text-text-secondary">{formatCurrency(adv.repassesRecebidos)}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Tabela por área ──────────────────────────────────────────────────────────

function TabelaAreas({ data }: { data: RentabilidadeArea[] }) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div className="glass-card overflow-hidden">
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-between p-5 hover:bg-bg-tertiary/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-400/10 rounded-lg">
                        <BarChart3 size={16} className="text-purple-400" />
                    </div>
                    <div className="text-left">
                        <h2 className="font-semibold text-text-primary">Rentabilidade por Área do Direito</h2>
                        <p className="text-xs text-text-muted">{data.length} área(s)</p>
                    </div>
                </div>
                {expanded ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
            </button>

            {expanded && (
                <div className="overflow-x-auto border-t border-border">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-bg-tertiary/50">
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Área</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase">Processos</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase">Taxa Êxito</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Valor Médio Causa</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Receita Recebida</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">A Receber</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase">Tempo Médio</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-text-muted">
                                        Nenhum dado encontrado.
                                    </td>
                                </tr>
                            ) : data.map((area) => (
                                <tr key={area.areaDireito} className="border-t border-border hover:bg-bg-tertiary/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-medium text-text-primary">{area.areaDireito}</p>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="text-sm text-text-primary">{area.totalProcessos}</span>
                                        <p className="text-xs text-text-muted">{area.processosEncerrados} enc.</p>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <TaxaExitoBadge taxa={area.taxaExito} />
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-mono text-text-secondary">
                                        {area.valorMedioCausa > 0 ? formatCurrency(area.valorMedioCausa) : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-mono text-green-400">
                                        {formatCurrency(area.receitaBruta)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-mono text-yellow-400">
                                        {formatCurrency(area.receitaPendente)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {area.tempoMedioTramitacaoDias !== null ? (
                                            <span className="flex items-center justify-center gap-1 text-xs text-text-muted">
                                                <Clock size={12} />
                                                {area.tempoMedioTramitacaoDias}d
                                            </span>
                                        ) : <span className="text-text-muted">—</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Tabela por cliente ───────────────────────────────────────────────────────

function TabelaClientes({ data }: { data: RentabilidadeCliente[] }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="glass-card overflow-hidden">
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-between p-5 hover:bg-bg-tertiary/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-400/10 rounded-lg">
                        <Briefcase size={16} className="text-orange-400" />
                    </div>
                    <div className="text-left">
                        <h2 className="font-semibold text-text-primary">Rentabilidade por Cliente</h2>
                        <p className="text-xs text-text-muted">Top {data.length} clientes por receita</p>
                    </div>
                </div>
                {expanded ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
            </button>

            {expanded && (
                <div className="overflow-x-auto border-t border-border">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-bg-tertiary/50">
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Cliente</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase">Processos</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-text-muted uppercase">Taxa Êxito</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Valor Causas</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Receita Recebida</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Em Aberto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-text-muted">
                                        Nenhum cliente encontrado no período.
                                    </td>
                                </tr>
                            ) : data.map((cli) => (
                                <tr key={cli.clienteId} className="border-t border-border hover:bg-bg-tertiary/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-medium text-text-primary">{cli.nomeCliente}</p>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="text-sm text-text-primary">{cli.totalProcessos}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <TaxaExitoBadge taxa={cli.taxaExito} />
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-mono text-text-secondary">
                                        {cli.valorTotalCausas > 0 ? formatCurrency(cli.valorTotalCausas) : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-mono text-green-400">
                                        {formatCurrency(cli.receitaBruta)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`text-sm font-mono ${cli.honorariosEmAberto > 0 ? "text-yellow-400" : "text-text-muted"}`}>
                                            {formatCurrency(cli.honorariosEmAberto)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Seletor de período ───────────────────────────────────────────────────────

function PeriodoSelector({
    inicio, fim,
    onChange,
}: {
    inicio: string;
    fim: string;
    onChange: (inicio: string, fim: string) => void;
}) {
    const presets = [
        { label: "Este mês", action: () => { const now = new Date(); onChange(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), now.toISOString().slice(0, 10)); } },
        { label: "3 meses", action: () => { const now = new Date(); const inicio3 = new Date(now); inicio3.setMonth(inicio3.getMonth() - 3); onChange(inicio3.toISOString().slice(0, 10), now.toISOString().slice(0, 10)); } },
        { label: "6 meses", action: () => { const now = new Date(); const inicio6 = new Date(now); inicio6.setMonth(inicio6.getMonth() - 6); onChange(inicio6.toISOString().slice(0, 10), now.toISOString().slice(0, 10)); } },
        { label: "12 meses", action: () => { const now = new Date(); const inicio12 = new Date(now); inicio12.setFullYear(inicio12.getFullYear() - 1); onChange(inicio12.toISOString().slice(0, 10), now.toISOString().slice(0, 10)); } },
        { label: "Este ano", action: () => { const now = new Date(); onChange(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10), now.toISOString().slice(0, 10)); } },
    ];

    return (
        <div className="glass-card p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
                <label className="text-xs text-text-muted">De:</label>
                <input
                    type="date"
                    value={inicio}
                    onChange={(e) => onChange(e.target.value, fim)}
                    className="bg-bg-tertiary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                />
            </div>
            <div className="flex items-center gap-2">
                <label className="text-xs text-text-muted">Até:</label>
                <input
                    type="date"
                    value={fim}
                    onChange={(e) => onChange(inicio, e.target.value)}
                    className="bg-bg-tertiary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                />
            </div>
            <div className="flex gap-2">
                {presets.map((p) => (
                    <button
                        key={p.label}
                        onClick={p.action}
                        className="px-3 py-1.5 text-xs rounded-lg bg-bg-tertiary border border-border text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
                    >
                        {p.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
    inicio?: string;
    fim?: string;
}

export function RentabilidadeContent({ inicio: inicioInit, fim: fimInit }: Props) {
    const now = new Date();
    const um_ano_atras = new Date(now);
    um_ano_atras.setFullYear(um_ano_atras.getFullYear() - 1);

    const [inicio, setInicio] = useState(
        inicioInit ?? um_ano_atras.toISOString().slice(0, 10)
    );
    const [fim, setFim] = useState(fimInit ?? now.toISOString().slice(0, 10));
    const [data, setData] = useState<RentabilidadeData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (inicio: string, fim: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `/api/financeiro/rentabilidade?inicio=${inicio}&fim=${fim}`,
                { cache: "no-store" }
            );
            if (!res.ok) throw new Error("Erro ao buscar dados");
            const json = await res.json() as RentabilidadeData;
            setData(json);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro desconhecido");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchData(inicio, fim);
    }, [fetchData, inicio, fim]);

    function handlePeriodoChange(novoInicio: string, novoFim: string) {
        setInicio(novoInicio);
        setFim(novoFim);
    }

    return (
        <div className="space-y-4">
            <PeriodoSelector inicio={inicio} fim={fim} onChange={handlePeriodoChange} />

            {loading && (
                <div className="glass-card p-12 flex flex-col items-center justify-center gap-3">
                    <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
                    <p className="text-sm text-text-muted">Calculando rentabilidade...</p>
                </div>
            )}

            {error && !loading && (
                <div className="glass-card p-6 flex items-center gap-3 border border-red-500/20">
                    <AlertCircle size={20} className="text-red-400 shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {data && !loading && (
                <>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                        <TrendingUp size={12} />
                        Período: {new Date(data.periodo.inicio).toLocaleDateString("pt-BR")} até{" "}
                        {new Date(data.periodo.fim).toLocaleDateString("pt-BR")}
                    </div>
                    <ResumoCards resumo={data.resumo} />
                    <TabelaAdvogados data={data.porAdvogado} />
                    <TabelaAreas data={data.porArea} />
                    <TabelaClientes data={data.porCliente} />
                </>
            )}
        </div>
    );
}
