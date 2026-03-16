"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, RefreshCw, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Input, Select } from "@/components/ui/form-fields";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TIPO_META, STATUS_META, PRIORIDADE_META, ALL_TIPOS, ALL_STATUS } from "@/components/agenda/agendamento-meta";
import type { TipoAgendamento, StatusAgendamento, PrioridadeAgendamento } from "@/generated/prisma";

interface AdvOption {
    id: string;
    user: { name: string | null };
}

interface ProcessoOption {
    id: string;
    numeroCnj: string | null;
    cliente: { nome: string } | null;
}

export interface AgendamentoFiltrosValues {
    search: string;
    status: StatusAgendamento[];
    tipos: TipoAgendamento[];
    responsavelId: string;
    criadoPorId: string;
    prioridade: PrioridadeAgendamento[];
    processoId: string;
    from: string;
    to: string;
    porDataDe: string;
}

interface Props {
    initial: AgendamentoFiltrosValues;
    advogados: AdvOption[];
    processos: ProcessoOption[];
    baseTab: string;
    baseView: string;
}

const DEFAULT_FILTERS: AgendamentoFiltrosValues = {
    search: "",
    status: [],
    tipos: [],
    responsavelId: "",
    criadoPorId: "",
    prioridade: [],
    processoId: "",
    from: "",
    to: "",
    porDataDe: "dataInicio",
};

export function AgendamentoFiltros({ initial, advogados, processos, baseTab, baseView }: Props) {
    const router = useRouter();
    const [expanded, setExpanded] = useState(false);
    const [values, setValues] = useState<AgendamentoFiltrosValues>(initial);

    function toggleArrayFilter<T>(arr: T[], val: T): T[] {
        return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
    }

    function applyFilters() {
        const params = new URLSearchParams();
        params.set("tab", baseTab);
        params.set("view", baseView);
        if (values.search.trim()) params.set("q", values.search.trim());
        if (values.status.length) params.set("status", values.status.join(","));
        if (values.tipos.length) params.set("tipos", values.tipos.join(","));
        if (values.responsavelId) params.set("responsavelId", values.responsavelId);
        if (values.criadoPorId) params.set("criadoPorId", values.criadoPorId);
        if (values.prioridade.length) params.set("prioridade", values.prioridade.join(","));
        if (values.processoId) params.set("processoId", values.processoId);
        if (values.from) params.set("from", values.from);
        if (values.to) params.set("to", values.to);
        if (values.porDataDe !== "dataInicio") params.set("porDataDe", values.porDataDe);
        router.push(`/agenda?${params.toString()}`);
    }

    function resetFilters() {
        setValues(DEFAULT_FILTERS);
        router.push(`/agenda?tab=${baseTab}&view=${baseView}`);
    }

    const hasActiveFilters = values.search || values.status.length || values.tipos.length ||
        values.responsavelId || values.prioridade.length || values.processoId || values.from || values.to;

    return (
        <div className="glass-card p-4 space-y-3">
            {/* Linha 1: busca + botao expand */}
            <div className="flex items-center gap-3">
                <div className="flex-1">
                    <Input
                        id="agenda-search"
                        value={values.search}
                        onChange={(e) => setValues((v) => ({ ...v, search: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                        placeholder="Buscar por titulo, processo, cliente..."
                        className="h-9"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all",
                        hasActiveFilters
                            ? "border-accent/40 bg-accent/10 text-accent"
                            : "border-border bg-bg-tertiary/40 text-text-muted hover:border-border-hover"
                    )}
                >
                    <Filter size={12} />
                    Filtros
                    {hasActiveFilters && (
                        <span className="h-4 w-4 rounded-full bg-accent text-[9px] text-bg-primary font-bold flex items-center justify-center">
                            {[values.status.length > 0, values.tipos.length > 0, !!values.responsavelId,
                              values.prioridade.length > 0, !!values.processoId, !!(values.from || values.to)]
                                .filter(Boolean).length}
                        </span>
                    )}
                    {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                <Button size="sm" onClick={applyFilters}>
                    <Search size={13} /> Aplicar
                </Button>
                {hasActiveFilters && (
                    <Button size="sm" variant="ghost" onClick={resetFilters}>
                        <RefreshCw size={13} /> Limpar
                    </Button>
                )}
            </div>

            {/* Linha 2: chips de tipo (sempre visivel) */}
            <div className="flex flex-wrap gap-1.5">
                {ALL_TIPOS.map((tipo) => {
                    const m = TIPO_META[tipo];
                    const Icon = m.icon;
                    const active = values.tipos.includes(tipo);
                    return (
                        <button
                            key={tipo}
                            type="button"
                            onClick={() => setValues((v) => ({ ...v, tipos: toggleArrayFilter(v.tipos, tipo) }))}
                            className={cn(
                                "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition-all",
                                active
                                    ? `${m.borderClass} ${m.bgClass} ${m.textClass}`
                                    : "border-border bg-bg-tertiary/30 text-text-muted hover:border-border-hover"
                            )}
                        >
                            <Icon size={10} />
                            {m.label}
                        </button>
                    );
                })}
            </div>

            {/* Filtros expandidos */}
            {expanded && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-border/50">
                    {/* Status */}
                    <div className="md:col-span-12">
                        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Status</p>
                        <div className="flex flex-wrap gap-1.5">
                            {ALL_STATUS.map((st) => {
                                const m = STATUS_META[st];
                                const active = values.status.includes(st);
                                return (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => setValues((v) => ({ ...v, status: toggleArrayFilter(v.status, st) }))}
                                        className={cn(
                                            "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition-all",
                                            active ? m.badgeClass : "border-border bg-bg-tertiary/30 text-text-muted hover:border-border-hover"
                                        )}
                                    >
                                        <span className={cn("h-1.5 w-1.5 rounded-full", active ? m.dotClass : "bg-text-muted/40")} />
                                        {m.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Prioridade */}
                    <div className="md:col-span-12">
                        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Prioridade</p>
                        <div className="flex gap-1.5">
                            {(["URGENTE", "ALTA", "NORMAL", "BAIXA"] as PrioridadeAgendamento[]).map((p) => {
                                const m = PRIORIDADE_META[p];
                                const active = values.prioridade.includes(p);
                                return (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setValues((v) => ({ ...v, prioridade: toggleArrayFilter(v.prioridade, p) }))}
                                        className={cn(
                                            "inline-flex items-center rounded-lg border px-2 py-1 text-[11px] transition-all",
                                            active ? m.badgeClass : "border-border bg-bg-tertiary/30 text-text-muted hover:border-border-hover"
                                        )}
                                    >
                                        {m.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Responsavel */}
                    <div className="md:col-span-4">
                        <Select
                            id="filt-responsavel"
                            label="Responsavel"
                            value={values.responsavelId}
                            onChange={(e) => setValues((v) => ({ ...v, responsavelId: e.target.value }))}
                            options={advogados.map((a) => ({ value: a.id, label: a.user.name || "-" }))}
                            placeholder="Todos"
                        />
                    </div>

                    {/* Processo */}
                    <div className="md:col-span-4">
                        <Select
                            id="filt-processo"
                            label="Processo"
                            value={values.processoId}
                            onChange={(e) => setValues((v) => ({ ...v, processoId: e.target.value }))}
                            options={processos.slice(0, 100).map((p) => ({
                                value: p.id,
                                label: `${p.numeroCnj || "Sem numero"} - ${p.cliente?.nome || "Sem cliente"}`,
                            }))}
                            placeholder="Todos"
                        />
                    </div>

                    {/* Por data de */}
                    <div className="md:col-span-4">
                        <Select
                            id="filt-pordata"
                            label="Por data de"
                            value={values.porDataDe}
                            onChange={(e) => setValues((v) => ({ ...v, porDataDe: e.target.value }))}
                            options={[
                                { value: "dataInicio", label: "Data do evento" },
                                { value: "dataFatal", label: "Data fatal" },
                                { value: "createdAt", label: "Data de criacao" },
                                { value: "updatedAt", label: "Ultima alteracao" },
                            ]}
                        />
                    </div>

                    {/* De - Ate */}
                    <div className="md:col-span-4">
                        <Input
                            id="filt-from"
                            label="De"
                            type="date"
                            value={values.from}
                            onChange={(e) => setValues((v) => ({ ...v, from: e.target.value }))}
                        />
                    </div>
                    <div className="md:col-span-4">
                        <Input
                            id="filt-to"
                            label="Ate"
                            type="date"
                            value={values.to}
                            onChange={(e) => setValues((v) => ({ ...v, to: e.target.value }))}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
