"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Gavel,
    Calendar,
    Check,
    Loader2,
    CheckSquare,
    PhoneCall,
    Sparkles,
    RefreshCw,
    Filter,
    Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { concluirCompromisso, createAudiencia, createCompromisso, marcarRealizada } from "@/actions/agenda";
import { AGENDA_TYPE_META, type AgendaTipo } from "@/components/agenda/agenda-meta";
import { cn } from "@/lib/utils";

interface AgendaItem {
    id: string;
    tipo: AgendaTipo;
    data: string;
    titulo: string;
    subtitulo: string;
    responsavel: string;
    processoId?: string;
    processoCnj?: string | null;
    processoCliente?: string | null;
    fatal?: boolean;
    status?: string;
    prioridade?: string;
    origemPrazo?: "MANUAL" | "PUBLICACAO_IA";
    origemConfianca?: number | null;
}

interface AdvOption {
    id: string;
    user: { name: string | null };
}

interface ProcessoOption {
    id: string;
    numeroCnj: string | null;
    cliente: { nome: string };
}

interface InitialFilters {
    q: string;
    advogadoId: string;
    janela: string;
    tipos: AgendaTipo[];
    concluidos: boolean;
}

interface AgendaListProps {
    items: AgendaItem[];
    advogados: AdvOption[];
    processos: ProcessoOption[];
    initialFilters: InitialFilters;
    sessionAdvogadoId: string;
}

function normalizeDateOnly(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function dayDiff(date: Date) {
    const today = normalizeDateOnly(new Date());
    const target = normalizeDateOnly(date);
    return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatHour(date: Date) {
    const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
    return hasTime
        ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date)
        : "Dia inteiro";
}

function dateChip(date: Date) {
    const diff = dayDiff(date);
    if (diff < 0) return { label: `Atrasado ${Math.abs(diff)}d`, variant: "danger" as const };
    if (diff === 0) return { label: "Hoje", variant: "warning" as const };
    if (diff === 1) return { label: "Amanha", variant: "info" as const };
    if (diff <= 7) return { label: `D-${diff}`, variant: "default" as const };
    return { label: `Em ${diff}d`, variant: "muted" as const };
}

export function AgendaList({
    items,
    advogados,
    processos,
    initialFilters,
    sessionAdvogadoId,
}: AgendaListProps) {
    const router = useRouter();

    const [showAddAudiencia, setShowAddAudiencia] = useState(false);
    const [showAddCompromisso, setShowAddCompromisso] = useState(false);
    const [loading, setLoading] = useState(false);

    const [q, setQ] = useState(initialFilters.q);
    const [janela, setJanela] = useState(initialFilters.janela || "30");
    const [advogadoId, setAdvogadoId] = useState(initialFilters.advogadoId || "");
    const [includeConcluidos, setIncludeConcluidos] = useState(initialFilters.concluidos);
    const [selectedTipos, setSelectedTipos] = useState<AgendaTipo[]>(initialFilters.tipos);

    const [onlyOverdue, setOnlyOverdue] = useState(false);

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const date = new Date(item.data);
            if (onlyOverdue && dayDiff(date) >= 0) return false;
            if (!selectedTipos.includes(item.tipo)) return false;
            return true;
        });
    }, [items, onlyOverdue, selectedTipos]);

    const grouped = useMemo(() => {
        return filteredItems.reduce<Record<string, AgendaItem[]>>((acc, item) => {
            const dateKey = new Date(item.data).toISOString().split("T")[0];
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(item);
            return acc;
        }, {});
    }, [filteredItems]);

    const statsByType = useMemo(() => {
        return filteredItems.reduce<Record<AgendaTipo, number>>((acc, item) => {
            acc[item.tipo] += 1;
            return acc;
        }, { prazo: 0, audiencia: 0, compromisso: 0, tarefa: 0, retorno: 0 });
    }, [filteredItems]);

    function toggleTipo(tipo: AgendaTipo) {
        setSelectedTipos((prev) => {
            if (prev.includes(tipo)) {
                const next = prev.filter((item) => item !== tipo);
                return next.length ? next : ["prazo", "audiencia", "compromisso", "tarefa", "retorno"];
            }
            return [...prev, tipo];
        });
    }

    function applyFilters() {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (advogadoId) params.set("advogadoId", advogadoId);
        if (janela) params.set("janela", janela);
        if (includeConcluidos) params.set("concluidos", "1");
        if (selectedTipos.length) params.set("tipos", selectedTipos.join(","));
        router.push(`/agenda?${params.toString()}`);
    }

    function resetFilters() {
        setQ("");
        setJanela("30");
        setAdvogadoId("");
        setIncludeConcluidos(false);
        setSelectedTipos(["prazo", "audiencia", "compromisso", "tarefa", "retorno"]);
        setOnlyOverdue(false);
        router.push("/agenda");
    }

    async function handleConcluirCompromisso(id: string) {
        await concluirCompromisso(id);
        router.refresh();
    }

    async function handleMarcarAudienciaRealizada(id: string) {
        await marcarRealizada(id);
        router.refresh();
    }

    async function handleCreateAudiencia(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const f = new FormData(e.currentTarget);
        await createAudiencia({
            processoId: f.get("processoId") as string,
            advogadoId: f.get("advogadoId") as string,
            tipo: f.get("tipo") as "CONCILIACAO" | "INSTRUCAO" | "JULGAMENTO" | "UNA" | "OUTRA",
            data: f.get("data") as string,
            local: f.get("local") as string,
            sala: f.get("sala") as string,
            observacoes: f.get("observacoes") as string,
        });
        setLoading(false);
        setShowAddAudiencia(false);
        router.refresh();
    }

    async function handleCreateCompromisso(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const f = new FormData(e.currentTarget);
        await createCompromisso({
            advogadoId: f.get("advogadoId") as string,
            tipo: f.get("tipo") as "REUNIAO" | "CONSULTA" | "VISITA" | "DILIGENCIA" | "OUTRO",
            titulo: f.get("titulo") as string,
            descricao: f.get("descricao") as string,
            dataInicio: f.get("dataInicio") as string,
            dataFim: f.get("dataFim") as string,
            local: f.get("local") as string,
        });
        setLoading(false);
        setShowAddCompromisso(false);
        router.refresh();
    }

    return (
        <>
            <div className="glass-card p-4 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                        <Filter size={13} />
                        Filtros
                    </div>

                    {(["prazo", "audiencia", "compromisso", "tarefa", "retorno"] as AgendaTipo[]).map((tipo) => {
                        const Icon = AGENDA_TYPE_META[tipo].icon;
                        const active = selectedTipos.includes(tipo);
                        return (
                            <button
                                key={tipo}
                                type="button"
                                onClick={() => toggleTipo(tipo)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all",
                                    active
                                        ? "border-accent/40 bg-accent/15 text-accent"
                                        : "border-border bg-bg-tertiary/40 text-text-muted hover:border-border-hover"
                                )}
                            >
                                <Icon size={12} /> {AGENDA_TYPE_META[tipo].label} ({statsByType[tipo]})
                            </button>
                        );
                    })}

                    <button
                        type="button"
                        onClick={() => setOnlyOverdue((prev) => !prev)}
                        className={cn(
                            "ml-auto inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all",
                            onlyOverdue
                                ? "border-danger/50 bg-danger/15 text-danger"
                                : "border-border bg-bg-tertiary/40 text-text-muted hover:border-border-hover"
                        )}
                    >
                        <AlertTriangleMini />
                        Apenas atrasados
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4">
                        <Input
                            id="agenda-q"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Buscar por cliente, processo, titulo..."
                            className="h-10"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <Select
                            id="agenda-adv"
                            value={advogadoId}
                            onChange={(e) => setAdvogadoId(e.target.value)}
                            options={advogados.map((a) => ({ value: a.id, label: a.user.name || "-" }))}
                            placeholder="Todos os responsaveis"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <Select
                            id="agenda-janela"
                            value={janela}
                            onChange={(e) => setJanela(e.target.value)}
                            options={[
                                { value: "7", label: "7 dias" },
                                { value: "15", label: "15 dias" },
                                { value: "30", label: "30 dias" },
                                { value: "60", label: "60 dias" },
                                { value: "90", label: "90 dias" },
                            ]}
                        />
                    </div>
                    <div className="md:col-span-3 flex items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-2 text-xs text-text-muted">
                            <input
                                type="checkbox"
                                checked={includeConcluidos}
                                onChange={(e) => setIncludeConcluidos(e.target.checked)}
                            />
                            incluir concluidos
                        </label>
                        <div className="flex items-center gap-2 ml-auto">
                            <Button type="button" size="sm" variant="ghost" onClick={resetFilters}>
                                <RefreshCw size={14} /> Limpar
                            </Button>
                            <Button type="button" size="sm" onClick={applyFilters}>
                                <Search size={14} /> Aplicar
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-5 mb-4">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Badge variant="muted">{filteredItems.length} eventos</Badge>
                    {sessionAdvogadoId && !advogadoId && (
                        <Badge variant="info">Dica: selecione seu nome para foco individual</Badge>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setShowAddAudiencia(true)}>
                        <Gavel size={14} /> Audiência
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setShowAddCompromisso(true)}>
                        <Calendar size={14} /> Compromisso
                    </Button>
                </div>
            </div>

            {filteredItems.length === 0 ? (
                <div className="rounded-xl border border-border p-12 text-center text-sm text-text-muted bg-bg-secondary">
                    Nenhum evento encontrado para os filtros atuais.
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([dateKey, dayItems]) => {
                        const dateObj = new Date(`${dateKey}T12:00:00`);
                        const diff = dayDiff(dateObj);

                        return (
                            <section key={dateKey}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={cn(
                                        "text-sm font-semibold capitalize",
                                        diff === 0 ? "text-warning" : diff < 0 ? "text-danger" : "text-text-secondary"
                                    )}>
                                        {diff === 0
                                            ? "Hoje"
                                            : dateObj.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                                    </div>
                                    <div className="flex-1 h-px bg-border" />
                                    {diff < 0 ? <Badge variant="danger">Atrasado</Badge> : <Badge variant="muted">{dayItems.length} itens</Badge>}
                                </div>

                                <div className="space-y-2">
                                    {dayItems.map((item) => {
                                        const meta = AGENDA_TYPE_META[item.tipo];
                                        const Icon = meta.icon;
                                        const eventDate = new Date(item.data);
                                        const chip = dateChip(eventDate);

                                        return (
                                            <article
                                                key={`${item.tipo}-${item.id}`}
                                                className="flex items-start gap-4 glass-card p-4 transition-all hover:border-border-hover"
                                            >
                                                <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${meta.bgClass}`}>
                                                    <Icon size={18} className={meta.textClass} />
                                                </div>

                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-sm font-medium text-text-primary truncate">{item.titulo}</span>
                                                        <Badge variant="muted">{meta.label}</Badge>
                                                        {item.fatal && <Badge variant="danger">Fatal</Badge>}
                                                        {item.origemPrazo === "PUBLICACAO_IA" && (
                                                            <Badge variant="warning">
                                                                <Sparkles size={11} /> IA {item.origemConfianca ? `${Math.round(item.origemConfianca * 100)}%` : ""}
                                                            </Badge>
                                                        )}
                                                        {item.prioridade && <Badge variant="default">{item.prioridade}</Badge>}
                                                        {item.status && <Badge variant="info">{item.status}</Badge>}
                                                    </div>

                                                    <p className="text-xs text-text-muted">{item.subtitulo}</p>

                                                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                                                        <span>{item.responsavel}</span>
                                                        <span>•</span>
                                                        <span>{formatHour(eventDate)}</span>
                                                        <Badge variant={chip.variant}>{chip.label}</Badge>
                                                        {item.processoId && (
                                                            <Link href={`/processos/${item.processoId}`} className="text-accent hover:underline">
                                                                {item.processoCnj || "Abrir processo"}
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {item.tipo === "audiencia" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleMarcarAudienciaRealizada(item.id)}
                                                            title="Marcar audiência realizada"
                                                            className="rounded-lg p-1.5 text-text-muted hover:bg-success/10 hover:text-success transition-colors"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                    )}
                                                    {item.tipo === "compromisso" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleConcluirCompromisso(item.id)}
                                                            title="Marcar compromisso concluído"
                                                            className="rounded-lg p-1.5 text-text-muted hover:bg-success/10 hover:text-success transition-colors"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                    )}
                                                    {item.tipo === "tarefa" && (
                                                        <Link href="/tarefas" className="rounded-lg p-1.5 text-text-muted hover:bg-accent/10 hover:text-accent transition-colors" title="Ir para tarefas">
                                                            <CheckSquare size={16} />
                                                        </Link>
                                                    )}
                                                    {item.tipo === "retorno" && (
                                                        <Link href="/atendimentos" className="rounded-lg p-1.5 text-text-muted hover:bg-fuchsia-500/10 hover:text-fuchsia-300 transition-colors" title="Ir para atendimentos">
                                                            <PhoneCall size={16} />
                                                        </Link>
                                                    )}
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}

            <Modal isOpen={showAddAudiencia} onClose={() => setShowAddAudiencia(false)} title="Nova Audiência" size="lg">
                <form onSubmit={handleCreateAudiencia} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            id="aud-processoId"
                            name="processoId"
                            label="Processo *"
                            placeholder="Selecionar"
                            options={processos.map((p) => ({ value: p.id, label: `${p.numeroCnj || "Sem número"} - ${p.cliente?.nome ?? "Sem cliente"}` }))}
                            required
                        />
                        <Select
                            id="aud-advogadoId"
                            name="advogadoId"
                            label="Advogado *"
                            placeholder="Selecionar"
                            options={advogados.map((a) => ({ value: a.id, label: a.user.name || "-" }))}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <Select
                            id="aud-tipo"
                            name="tipo"
                            label="Tipo *"
                            options={[
                                { value: "CONCILIACAO", label: "Conciliação" },
                                { value: "INSTRUCAO", label: "Instrução" },
                                { value: "JULGAMENTO", label: "Julgamento" },
                                { value: "UNA", label: "Una" },
                                { value: "OUTRA", label: "Outra" },
                            ]}
                            required
                        />
                        <Input id="aud-data" name="data" label="Data/Hora *" type="datetime-local" required />
                        <Input id="aud-local" name="local" label="Local" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input id="aud-sala" name="sala" label="Sala" />
                        <Textarea id="aud-obs" name="observacoes" label="Observações" rows={2} />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowAddAudiencia(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : "Criar Audiência"}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showAddCompromisso} onClose={() => setShowAddCompromisso(false)} title="Novo Compromisso" size="lg">
                <form onSubmit={handleCreateCompromisso} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            id="comp-advogadoId"
                            name="advogadoId"
                            label="Advogado *"
                            placeholder="Selecionar"
                            options={advogados.map((a) => ({ value: a.id, label: a.user.name || "-" }))}
                            required
                        />
                        <Select
                            id="comp-tipo"
                            name="tipo"
                            label="Tipo *"
                            options={[
                                { value: "REUNIAO", label: "Reuniao" },
                                { value: "CONSULTA", label: "Consulta" },
                                { value: "VISITA", label: "Visita" },
                                { value: "DILIGENCIA", label: "Diligencia" },
                                { value: "OUTRO", label: "Outro" },
                            ]}
                            required
                        />
                    </div>

                    <Input id="comp-titulo" name="titulo" label="Titulo *" required />

                    <div className="grid grid-cols-2 gap-4">
                        <Input id="comp-dataInicio" name="dataInicio" label="Inicio *" type="datetime-local" required />
                        <Input id="comp-dataFim" name="dataFim" label="Fim" type="datetime-local" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input id="comp-local" name="local" label="Local" />
                        <Textarea id="comp-descricao" name="descricao" label="Descrição" rows={2} />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowAddCompromisso(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : "Criar Compromisso"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

function AlertTriangleMini() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 9V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
