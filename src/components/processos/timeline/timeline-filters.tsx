"use client";

import { useState, useCallback } from "react";
import { Search, X, Filter, ChevronDown } from "lucide-react";
import type { TipoEvento } from "@/lib/dal/timeline";

const GRUPOS_TIPO = [
    {
        label: "Judiciais",
        tipos: ["ANDAMENTO_JUDICIAL", "PUBLICACAO", "DESPACHO", "SENTENCA", "DECISAO", "JUNTADA", "CONCLUSAO"] as TipoEvento[],
    },
    {
        label: "Prazos",
        tipos: ["PRAZO_CRIADO", "PRAZO_VENCIDO", "PRAZO_CONCLUIDO"] as TipoEvento[],
    },
    {
        label: "Audiências",
        tipos: ["AUDIENCIA_AGENDADA", "AUDIENCIA_REALIZADA"] as TipoEvento[],
    },
    {
        label: "Documentos",
        tipos: ["DOCUMENTO_ANEXADO", "DOCUMENTO_PUBLICADO"] as TipoEvento[],
    },
    {
        label: "Internos",
        tipos: ["REUNIAO_CLIENTE", "CONTATO_TELEFONICO", "EMAIL_ENVIADO", "ANOTACAO_INTERNA", "MANUAL"] as TipoEvento[],
    },
];

export interface FiltrosAtivos {
    busca: string;
    grupos: string[]; // labels dos grupos
    periodo: "todos" | "hoje" | "7d" | "30d" | "90d";
}

interface Props {
    onChange: (filtros: FiltrosAtivos) => void;
}

export function TimelineFilters({ onChange }: Props) {
    const [busca, setBusca] = useState("");
    const [grupos, setGrupos] = useState<string[]>([]);
    const [periodo, setPeriodo] = useState<FiltrosAtivos["periodo"]>("todos");
    const [showFiltros, setShowFiltros] = useState(false);

    const emit = useCallback(
        (b: string, g: string[], p: FiltrosAtivos["periodo"]) => {
            onChange({ busca: b, grupos: g, periodo: p });
        },
        [onChange]
    );

    function handleBusca(v: string) {
        setBusca(v);
        emit(v, grupos, periodo);
    }

    function toggleGrupo(label: string) {
        const next = grupos.includes(label)
            ? grupos.filter((g) => g !== label)
            : [...grupos, label];
        setGrupos(next);
        emit(busca, next, periodo);
    }

    function handlePeriodo(p: FiltrosAtivos["periodo"]) {
        setPeriodo(p);
        emit(busca, grupos, p);
    }

    function limpar() {
        setBusca("");
        setGrupos([]);
        setPeriodo("todos");
        emit("", [], "todos");
    }

    const temFiltro = busca || grupos.length > 0 || periodo !== "todos";

    return (
        <div className="space-y-2">
            {/* Linha 1: busca + toggle filtros */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                        type="text"
                        placeholder="Buscar na timeline..."
                        value={busca}
                        onChange={(e) => handleBusca(e.target.value)}
                        className="w-full rounded-lg border border-border bg-bg-tertiary pl-9 pr-8 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                    {busca && (
                        <button
                            onClick={() => handleBusca("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setShowFiltros(!showFiltros)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        showFiltros || grupos.length > 0 || periodo !== "todos"
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border text-text-muted hover:text-text-primary"
                    }`}
                >
                    <Filter size={14} />
                    Filtros
                    {(grupos.length > 0 || periodo !== "todos") && (
                        <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
                            {grupos.length + (periodo !== "todos" ? 1 : 0)}
                        </span>
                    )}
                    <ChevronDown size={12} className={`transition-transform ${showFiltros ? "rotate-180" : ""}`} />
                </button>
                {temFiltro && (
                    <button
                        onClick={limpar}
                        className="flex items-center gap-1 rounded-lg border border-border px-2 py-2 text-xs text-text-muted hover:text-danger hover:border-danger/30 transition-colors"
                        title="Limpar filtros"
                    >
                        <X size={13} />
                    </button>
                )}
            </div>

            {/* Linha 2: filtros expandidos */}
            {showFiltros && (
                <div className="rounded-xl border border-border bg-bg-tertiary/40 p-3 space-y-3">
                    {/* Período */}
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2 font-medium">Período</p>
                        <div className="flex flex-wrap gap-1.5">
                            {(["todos", "hoje", "7d", "30d", "90d"] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => handlePeriodo(p)}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                        periodo === p
                                            ? "bg-accent text-white"
                                            : "border border-border text-text-muted hover:border-accent/40 hover:text-accent"
                                    }`}
                                >
                                    {p === "todos" ? "Todos" : p === "hoje" ? "Hoje" : p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tipo */}
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2 font-medium">Tipo de evento</p>
                        <div className="flex flex-wrap gap-1.5">
                            {GRUPOS_TIPO.map((g) => (
                                <button
                                    key={g.label}
                                    onClick={() => toggleGrupo(g.label)}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                        grupos.includes(g.label)
                                            ? "bg-accent text-white"
                                            : "border border-border text-text-muted hover:border-accent/40 hover:text-accent"
                                    }`}
                                >
                                    {g.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper to convert FiltrosAtivos to TipoEvento[]
export function filtrosToTipos(filtros: FiltrosAtivos): TipoEvento[] | undefined {
    if (filtros.grupos.length === 0) return undefined;
    return GRUPOS_TIPO.filter((g) => filtros.grupos.includes(g.label)).flatMap((g) => g.tipos);
}

// Helper to convert periodo to Date range
export function filtrosToDates(periodo: FiltrosAtivos["periodo"]): { dataInicio?: Date; dataFim?: Date } {
    const agora = new Date();
    if (periodo === "hoje") {
        const inicio = new Date(agora);
        inicio.setHours(0, 0, 0, 0);
        return { dataInicio: inicio };
    }
    if (periodo === "7d") return { dataInicio: new Date(agora.getTime() - 7 * 86400000) };
    if (periodo === "30d") return { dataInicio: new Date(agora.getTime() - 30 * 86400000) };
    if (periodo === "90d") return { dataInicio: new Date(agora.getTime() - 90 * 86400000) };
    return {};
}
