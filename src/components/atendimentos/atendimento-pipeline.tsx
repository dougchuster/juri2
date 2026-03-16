"use client";

import { useDeferredValue, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    CalendarDays,
    ChevronRight,
    Clock3,
    Filter,
    Globe,
    History,
    Loader2,
    Mail,
    MessageSquare,
    Phone,
    Plus,
    Scale,
    Search,
    Trash2,
    User,
    UserPlus,
    Users,
    Wallet,
    XCircle,
} from "lucide-react";
import type { StatusOperacionalAtendimento } from "@/generated/prisma";
import { createAtendimento, deleteAtendimento, moveAtendimento } from "@/actions/atendimentos";
import type { AtendimentoKanbanColumnId } from "@/lib/atendimentos-workflow";
import {
    ATENDIMENTO_KANBAN_COLUMNS,
    ATENDIMENTO_STATUS_LABELS,
    DEFAULT_ATENDIMENTO_STATUS_OPERACIONAL,
    getNextOperationalStatus,
} from "@/lib/atendimentos-workflow";
import { cn, daysUntil, formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";

const CANAL_ICONS: Record<string, typeof Phone> = {
    PRESENCIAL: Users,
    TELEFONE: Phone,
    EMAIL: Mail,
    WHATSAPP: MessageSquare,
    SITE: Globe,
    INDICACAO: UserPlus,
};

const CANAL_LABELS: Record<string, string> = {
    PRESENCIAL: "Presencial",
    TELEFONE: "Telefone",
    EMAIL: "E-mail",
    WHATSAPP: "WhatsApp",
    SITE: "Site",
    INDICACAO: "Indicacao",
};

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
    SEM_DOCUMENTOS: "Sem documentos",
    PARCIAL: "Documentacao parcial",
    COMPLETA: "Documentacao completa",
    CONFERIDA: "Documentacao conferida",
};

const MEETING_STATUS_LABELS: Record<string, string> = {
    NAO_AGENDADA: "Nao agendada",
    AGENDADA: "Agendada",
    CONFIRMADA: "Confirmada",
    REMARCADA: "Remarcada",
    CANCELADA: "Cancelada",
    REALIZADA: "Realizada",
    NAO_COMPARECEU: "Nao compareceu",
};

const COLUMN_TONES: Record<string, { dot: string; border: string }> = {
    stone: { dot: "bg-zinc-400", border: "border-l-zinc-400/50" },
    sky: { dot: "bg-sky-400", border: "border-l-sky-400/50" },
    blue: { dot: "bg-blue-400", border: "border-l-blue-400/50" },
    amber: { dot: "bg-amber-400", border: "border-l-amber-400/50" },
    orange: { dot: "bg-orange-400", border: "border-l-orange-400/50" },
    emerald: { dot: "bg-emerald-400", border: "border-l-emerald-400/50" },
    rose: { dot: "bg-rose-400", border: "border-l-rose-400/50" },
    zinc: { dot: "bg-zinc-500", border: "border-l-zinc-500/50" },
};

type DetailTab = "resumo" | "documentos" | "comunicacao" | "financeiro" | "historico";

interface AtendimentoHistoryItem {
    id: string;
    canal: string;
    descricao: string;
    userId: string;
    createdAt: string;
}

interface AtendimentoItem {
    id: string;
    statusOperacional: StatusOperacionalAtendimento;
    prioridade: string;
    canal: string;
    assunto: string;
    resumo: string | null;
    dataRetorno: string | null;
    createdAt: string;
    updatedAt: string;
    areaJuridica: string | null;
    subareaJuridica: string | null;
    origemAtendimento: string | null;
    proximaAcao: string | null;
    proximaAcaoAt: string | null;
    ultimaInteracaoEm: string | null;
    chanceFechamento: number | null;
    valorEstimado: string | number | null;
    motivoPerda: string | null;
    dataReuniao: string | null;
    observacoesReuniao: string | null;
    situacaoDocumental: string;
    statusReuniao: string;
    processoId: string | null;
    cliente: { id: string; nome: string; telefone: string | null; email: string | null };
    advogado: { id: string; user: { name: string | null } };
    historicos: AtendimentoHistoryItem[];
    _count: { historicos: number };
}

interface AdvOption {
    id: string;
    user: { name: string | null };
}

interface ClienteOption {
    id: string;
    nome: string;
    cpf: string | null;
    cnpj: string | null;
}

interface AtendimentoStatsSummary {
    pipelineAbertos: number;
    semInteracaoCritica: number;
    propostasPendentesValor: number;
    alertasPrazo: number;
}

interface AtendimentoPipelineProps {
    pipeline: Record<AtendimentoKanbanColumnId, AtendimentoItem[]>;
    advogados: AdvOption[];
    clientes: ClienteOption[];
    stats: AtendimentoStatsSummary;
}

function getStatusVariant(status: StatusOperacionalAtendimento) {
    if (status === "CONTRATADO") return "success" as const;
    if (status === "NAO_CONTRATADO") return "danger" as const;
    if (status === "ENCERRADO") return "muted" as const;
    if (["AGUARDANDO_CLIENTE", "AGUARDANDO_DOCUMENTOS"].includes(status)) return "warning" as const;
    if (["REUNIAO_AGENDADA", "REUNIAO_CONFIRMADA", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO"].includes(status)) return "default" as const;
    return "info" as const;
}

function getPriorityVariant(priority: string) {
    if (priority === "URGENTE") return "danger" as const;
    if (priority === "ALTA") return "warning" as const;
    if (priority === "NORMAL") return "info" as const;
    return "muted" as const;
}

function getPriorityLabel(priority: string) {
    return priority.charAt(0) + priority.slice(1).toLowerCase();
}

function getDocumentVariant(status: string) {
    if (status === "CONFERIDA" || status === "COMPLETA") return "success" as const;
    if (status === "PARCIAL") return "warning" as const;
    return "muted" as const;
}

function formatRelative(date: string | null) {
    if (!date) return "Sem interacao";
    const diffHours = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60)));
    if (diffHours < 1) return "Ha menos de 1h";
    if (diffHours < 24) return `Ha ${diffHours}h`;
    return `Ha ${Math.floor(diffHours / 24)}d`;
}

function getUpcomingDeadline(item: AtendimentoItem) {
    if (item.dataRetorno && item.proximaAcaoAt) {
        return new Date(item.dataRetorno) < new Date(item.proximaAcaoAt) ? item.dataRetorno : item.proximaAcaoAt;
    }
    return item.proximaAcaoAt ?? item.dataRetorno;
}

function getDeadlineBadge(deadline: string | null) {
    if (!deadline) return null;
    const remainingDays = daysUntil(deadline);
    if (remainingDays < 0) return { label: `Vencido ha ${Math.abs(remainingDays)}d`, variant: "danger" as const };
    if (remainingDays <= 2) return { label: `${remainingDays}d para o prazo`, variant: "danger" as const };
    if (remainingDays <= 5) return { label: `${remainingDays}d para o prazo`, variant: "warning" as const };
    return { label: `${remainingDays}d para o prazo`, variant: "info" as const };
}

function getProposalLabel(status: StatusOperacionalAtendimento) {
    if (status === "CONTRATADO") return "Aceita";
    if (status === "NAO_CONTRATADO") return "Recusada";
    if (status === "EM_NEGOCIACAO") return "Negociacao";
    if (status === "PROPOSTA_ENVIADA") return "Enviada";
    return "Preparacao";
}

function InfoBlock({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[18px] border border-[var(--border-color)] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{label}</p>
            <p className="mt-2 text-sm font-medium text-text-primary">{value}</p>
        </div>
    );
}

export function AtendimentoPipeline({ pipeline, advogados, clientes, stats }: AtendimentoPipelineProps) {
    const router = useRouter();
    const [showCreate, setShowCreate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detailTab, setDetailTab] = useState<DetailTab>("resumo");
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [search, setSearch] = useState("");
    const [areaFilter, setAreaFilter] = useState("");
    const [responsavelFilter, setResponsavelFilter] = useState("");
    const [prioridadeFilter, setPrioridadeFilter] = useState("");
    const [canalFilter, setCanalFilter] = useState("");
    const [periodFilter, setPeriodFilter] = useState("");
    const [documentFilter, setDocumentFilter] = useState("");
    const deferredSearch = useDeferredValue(search);

    const items = Object.values(pipeline).flat();
    const selectedAtendimento = selectedId ? items.find((item) => item.id === selectedId) ?? null : null;
    const areaOptions = Array.from(new Set(items.map((item) => item.areaJuridica).filter(Boolean) as string[])).sort();

    const filteredPipeline = Object.fromEntries(
        ATENDIMENTO_KANBAN_COLUMNS.map((column) => [
            column.id,
            (pipeline[column.id] || []).filter((item) => {
                const normalizedSearch = deferredSearch.trim().toLowerCase();
                const searchMatch = !normalizedSearch
                    || item.cliente.nome.toLowerCase().includes(normalizedSearch)
                    || item.assunto.toLowerCase().includes(normalizedSearch)
                    || (item.resumo || "").toLowerCase().includes(normalizedSearch);

                const areaMatch = !areaFilter || item.areaJuridica === areaFilter;
                const responsavelMatch = !responsavelFilter || item.advogado.id === responsavelFilter;
                const prioridadeMatch = !prioridadeFilter || item.prioridade === prioridadeFilter;
                const canalMatch = !canalFilter || item.canal === canalFilter;
                const documentMatch = !documentFilter || item.situacaoDocumental === documentFilter;
                const periodMatch = !periodFilter
                    || new Date(item.createdAt).getTime() >= Date.now() - Number.parseInt(periodFilter, 10) * 24 * 60 * 60 * 1000;

                return searchMatch && areaMatch && responsavelMatch && prioridadeMatch && canalMatch && documentMatch && periodMatch;
            }),
        ]),
    ) as Record<AtendimentoKanbanColumnId, AtendimentoItem[]>;

    const filteredCount = Object.values(filteredPipeline).reduce((total, column) => total + column.length, 0);

    async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(event.currentTarget);
        await createAtendimento({
            clienteId: formData.get("clienteId") as string,
            advogadoId: formData.get("advogadoId") as string,
            statusOperacional: (formData.get("statusOperacional") as StatusOperacionalAtendimento) || DEFAULT_ATENDIMENTO_STATUS_OPERACIONAL,
            prioridade: (formData.get("prioridade") as "BAIXA" | "NORMAL" | "ALTA" | "URGENTE") || "NORMAL",
            canal: formData.get("canal") as "PRESENCIAL" | "TELEFONE" | "EMAIL" | "WHATSAPP" | "SITE" | "INDICACAO",
            assunto: formData.get("assunto") as string,
            resumo: formData.get("resumo") as string,
            areaJuridica: formData.get("areaJuridica") as string,
            origemAtendimento: formData.get("origemAtendimento") as string,
            situacaoDocumental: (formData.get("situacaoDocumental") as "SEM_DOCUMENTOS" | "PARCIAL" | "COMPLETA" | "CONFERIDA") || "SEM_DOCUMENTOS",
            statusReuniao: (formData.get("statusReuniao") as "NAO_AGENDADA" | "AGENDADA" | "CONFIRMADA" | "REMARCADA" | "CANCELADA" | "REALIZADA" | "NAO_COMPARECEU") || "NAO_AGENDADA",
            valorEstimado: formData.get("valorEstimado") as string,
            proximaAcao: formData.get("proximaAcao") as string,
            dataRetorno: formData.get("dataRetorno") as string,
            proximaAcaoAt: formData.get("proximaAcaoAt") as string,
            dataReuniao: formData.get("dataReuniao") as string,
            motivoPerda: formData.get("motivoPerda") as string,
            observacoesReuniao: formData.get("observacoesReuniao") as string,
        });

        setLoading(false);
        setShowCreate(false);
        router.refresh();
    }

    async function handleDelete() {
        if (!deletingId) return;
        await deleteAtendimento(deletingId);
        setDeletingId(null);
        if (selectedId === deletingId) setSelectedId(null);
        router.refresh();
    }

    return (
        <>
            <section className="glass-card rounded-[30px] p-5 md:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Operacao do pipeline</p>
                        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text-primary">Atendimentos por etapa juridica</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                            Filtre por area, responsavel, prioridade e documentacao para atacar gargalos da triagem ate a contratacao.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="muted">{filteredCount} cards visiveis</Badge>
                        <Badge variant="warning">{stats.alertasPrazo} prazos criticos</Badge>
                        <Badge variant="default">{formatCurrency(stats.propostasPendentesValor)} em propostas</Badge>
                        <Button size="sm" onClick={() => setShowCreate(true)}>
                            <Plus size={16} />
                            Novo atendimento
                        </Button>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_repeat(5,minmax(0,1fr))]">
                    <div className="relative">
                        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                        <Input
                            id="atend-search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="pl-11"
                            placeholder="Buscar cliente, assunto ou resumo"
                        />
                    </div>
                    <Select
                        id="atend-filter-area"
                        value={areaFilter}
                        onChange={(event) => setAreaFilter(event.target.value)}
                        options={areaOptions.map((option) => ({ value: option, label: option }))}
                        placeholder="Area do direito"
                    />
                    <Select
                        id="atend-filter-adv"
                        value={responsavelFilter}
                        onChange={(event) => setResponsavelFilter(event.target.value)}
                        options={advogados.map((advogado) => ({
                            value: advogado.id,
                            label: advogado.user.name || "Sem nome",
                        }))}
                        placeholder="Responsavel"
                    />
                    <Select
                        id="atend-filter-prioridade"
                        value={prioridadeFilter}
                        onChange={(event) => setPrioridadeFilter(event.target.value)}
                        options={[
                            { value: "URGENTE", label: "Urgente" },
                            { value: "ALTA", label: "Alta" },
                            { value: "NORMAL", label: "Normal" },
                            { value: "BAIXA", label: "Baixa" },
                        ]}
                        placeholder="Prioridade"
                    />
                    <Select
                        id="atend-filter-periodo"
                        value={periodFilter}
                        onChange={(event) => setPeriodFilter(event.target.value)}
                        options={[
                            { value: "7", label: "Ultimos 7 dias" },
                            { value: "30", label: "Ultimos 30 dias" },
                            { value: "90", label: "Ultimos 90 dias" },
                        ]}
                        placeholder="Periodo"
                    />
                    <div className="flex gap-2">
                        <Select
                            id="atend-filter-canal"
                            value={canalFilter}
                            onChange={(event) => setCanalFilter(event.target.value)}
                            options={[
                                { value: "PRESENCIAL", label: "Presencial" },
                                { value: "TELEFONE", label: "Telefone" },
                                { value: "EMAIL", label: "E-mail" },
                                { value: "WHATSAPP", label: "WhatsApp" },
                                { value: "SITE", label: "Site" },
                                { value: "INDICACAO", label: "Indicacao" },
                            ]}
                            placeholder="Canal"
                            className="flex-1"
                        />
                        <Button variant="secondary" type="button" onClick={() => setShowAdvancedFilters((value) => !value)}>
                            <Filter size={16} />
                        </Button>
                    </div>
                </div>

                {showAdvancedFilters ? (
                    <div className="mt-3 grid grid-cols-1 gap-3 rounded-[24px] border border-[var(--border-color)] bg-[var(--surface-soft)]/70 p-4 md:grid-cols-4">
                        <Select
                            id="atend-filter-docs"
                            label="Documentacao"
                            value={documentFilter}
                            onChange={(event) => setDocumentFilter(event.target.value)}
                            options={[
                                { value: "SEM_DOCUMENTOS", label: "Sem documentos" },
                                { value: "PARCIAL", label: "Parcial" },
                                { value: "COMPLETA", label: "Completa" },
                                { value: "CONFERIDA", label: "Conferida" },
                            ]}
                            placeholder="Status documental"
                        />
                        <div className="rounded-[20px] border border-[var(--border-color)] bg-[var(--glass-input-bg)] px-4 py-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Sem interacao critica</p>
                            <p className="mt-2 text-lg font-semibold text-text-primary">{stats.semInteracaoCritica}</p>
                            <p className="text-xs text-text-muted">Casos ha mais de 5 dias sem toque.</p>
                        </div>
                        <div className="rounded-[20px] border border-[var(--border-color)] bg-[var(--glass-input-bg)] px-4 py-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Pipeline aberto</p>
                            <p className="mt-2 text-lg font-semibold text-text-primary">{stats.pipelineAbertos}</p>
                            <p className="text-xs text-text-muted">Atendimentos em curso no modulo juridico.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setAreaFilter("");
                                setResponsavelFilter("");
                                setPrioridadeFilter("");
                                setCanalFilter("");
                                setPeriodFilter("");
                                setDocumentFilter("");
                            }}
                            className="rounded-[20px] border border-dashed border-[var(--border-color)] px-4 py-3 text-left transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        >
                            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Limpar filtros</p>
                            <p className="mt-2 text-sm font-semibold text-text-primary">Voltar a visao completa</p>
                            <p className="text-xs text-text-muted">Restaura o pipeline sem recarregar a pagina.</p>
                        </button>
                    </div>
                ) : null}
            </section>

            <section className="rounded-[32px] border border-[rgba(120,84,52,0.14)] bg-[linear-gradient(180deg,rgba(255,253,250,0.92),rgba(245,239,232,0.82))] p-3 shadow-[0_20px_48px_rgba(73,49,29,0.08)]">
                <div className="overflow-x-auto pb-2">
                    <div className="grid auto-cols-[minmax(320px,320px)] grid-flow-col gap-5">
                    {ATENDIMENTO_KANBAN_COLUMNS.map((column) => {
                        const tone = COLUMN_TONES[column.tone] || COLUMN_TONES.stone;
                        const itemsInColumn = filteredPipeline[column.id] || [];

                        return (
                            <section
                                key={column.id}
                                className="flex min-h-[760px] flex-col overflow-hidden rounded-[28px] border border-[rgba(120,84,52,0.16)] bg-[rgba(255,252,249,0.96)] shadow-[0_18px_42px_rgba(62,42,28,0.07)]"
                            >
                                <header className={cn("sticky top-0 z-10 border-b border-l-4 border-[rgba(120,84,52,0.12)] bg-[rgba(255,250,245,0.98)] px-5 py-4 backdrop-blur-sm", tone.border)}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("h-2.5 w-2.5 rounded-full", tone.dot)} />
                                            <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-text-secondary">{column.label}</p>
                                        </div>
                                        <Badge variant="muted">{itemsInColumn.length}</Badge>
                                    </div>
                                    <p className="mt-2 pr-2 text-[13px] leading-5 text-text-secondary">{column.description}</p>
                                </header>

                                <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                                    {itemsInColumn.length === 0 ? (
                                        <div className="flex h-40 flex-col items-center justify-center rounded-[22px] border border-dashed border-[rgba(120,84,52,0.16)] bg-[rgba(255,255,255,0.72)] px-5 text-center">
                                            <Scale size={18} className="text-text-muted" />
                                            <p className="mt-3 text-sm font-semibold text-text-secondary">Nenhum atendimento nesta etapa.</p>
                                            <p className="mt-1 text-xs leading-5 text-text-muted">Use os filtros acima ou registre um novo caso.</p>
                                        </div>
                                    ) : (
                                        itemsInColumn.map((item) => {
                                            const CanalIcon = CANAL_ICONS[item.canal] || Users;
                                            const nextStatus = getNextOperationalStatus(item.statusOperacional);
                                            const canMarkAsLost = !["CONTRATADO", "NAO_CONTRATADO", "ENCERRADO"].includes(item.statusOperacional);
                                            const deadline = getDeadlineBadge(getUpcomingDeadline(item));

                                            return (
                                                <article
                                                    key={item.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => {
                                                        setSelectedId(item.id);
                                                        setDetailTab("resumo");
                                                    }}
                                                    onKeyDown={(event) => {
                                                        if (event.key === "Enter" || event.key === " ") {
                                                            event.preventDefault();
                                                            setSelectedId(item.id);
                                                            setDetailTab("resumo");
                                                        }
                                                    }}
                                                    className="rounded-[24px] border border-[rgba(120,84,52,0.14)] bg-[rgba(255,255,255,0.94)] px-4 py-4 shadow-[0_14px_34px_rgba(67,45,29,0.06)] transition hover:-translate-y-1 hover:border-[var(--accent)]/45 hover:shadow-[0_22px_44px_rgba(67,45,29,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex min-w-0 gap-3">
                                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[rgba(120,84,52,0.14)] bg-[rgba(248,241,233,0.95)] text-[15px] font-bold text-text-primary">
                                                                {getInitials(item.cliente.nome)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-[15px] font-semibold text-text-primary">{item.cliente.nome}</p>
                                                                <div className="mt-1.5 flex flex-wrap gap-2">
                                                                    <Badge variant="muted">{item.areaJuridica || "Area nao classificada"}</Badge>
                                                                    <Badge variant={getStatusVariant(item.statusOperacional)}>{ATENDIMENTO_STATUS_LABELS[item.statusOperacional]}</Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <p className="mt-4 line-clamp-2 text-[14px] font-medium leading-6 text-text-primary">{item.assunto}</p>
                                                    {item.resumo ? <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-text-secondary">{item.resumo}</p> : null}

                                                    <div className="mt-4 grid gap-2 rounded-[18px] bg-[rgba(247,241,235,0.78)] px-3 py-3 text-[12px] text-text-secondary">
                                                        <div className="flex items-center gap-2 font-medium">
                                                            <CanalIcon size={13} />
                                                            <span>{CANAL_LABELS[item.canal] || item.canal}</span>
                                                            {item.origemAtendimento ? <span>| {item.origemAtendimento}</span> : null}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <User size={13} />
                                                            <span className="truncate">{item.advogado.user.name || "Sem responsavel"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <CalendarDays size={13} />
                                                            <span>Entrada em {formatDate(item.createdAt)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        <Badge variant={getPriorityVariant(item.prioridade)}>{getPriorityLabel(item.prioridade)}</Badge>
                                                        <Badge variant={getDocumentVariant(item.situacaoDocumental)}>
                                                            {DOCUMENT_STATUS_LABELS[item.situacaoDocumental] || item.situacaoDocumental}
                                                        </Badge>
                                                        {deadline ? (
                                                            <Badge variant={deadline.variant}>
                                                                <Clock3 size={12} />
                                                                {deadline.label}
                                                            </Badge>
                                                        ) : null}
                                                        {item.valorEstimado ? (
                                                            <Badge variant="default">
                                                                <Wallet size={12} />
                                                                {formatCurrency(item.valorEstimado)}
                                                            </Badge>
                                                        ) : null}
                                                    </div>

                                                    <div className="mt-4 rounded-[18px] border border-[rgba(120,84,52,0.12)] bg-[rgba(255,248,242,0.92)] px-3 py-3">
                                                        <div className="flex items-center justify-between gap-3 text-[12px]">
                                                            <span className="text-text-muted">Ultima interacao</span>
                                                            <span className="font-medium text-text-primary">{formatRelative(item.ultimaInteracaoEm ?? item.updatedAt)}</span>
                                                        </div>
                                                        <div className="mt-2 flex items-center justify-between gap-3 text-[12px]">
                                                            <span className="text-text-muted">Historico</span>
                                                            <span className="font-medium text-text-primary">{item._count.historicos} registros</span>
                                                        </div>
                                                        {item.proximaAcao ? (
                                                            <div className="mt-2 flex items-start gap-2 text-[12px] text-text-muted">
                                                                <ArrowRight size={13} className="mt-0.5 shrink-0" />
                                                                <span className="line-clamp-2">{item.proximaAcao}</span>
                                                            </div>
                                                        ) : null}
                                                    </div>

                                                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[rgba(120,84,52,0.1)] pt-4">
                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setSelectedId(item.id);
                                                                setDetailTab("resumo");
                                                            }}
                                                            className="inline-flex items-center gap-1 rounded-full border border-[rgba(120,84,52,0.14)] px-3.5 py-2 text-[11px] font-semibold text-text-secondary transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                                                        >
                                                            Ver detalhes
                                                        </button>

                                                        <div className="flex items-center gap-2">
                                                            {nextStatus ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        void moveAtendimento(item.id, nextStatus).then(() => router.refresh());
                                                                    }}
                                                                    className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-3.5 py-2 text-[11px] font-semibold text-white shadow-[0_10px_18px_rgba(164,112,63,0.22)] transition hover:bg-[var(--accent-hover)]"
                                                                >
                                                                    <ChevronRight size={12} />
                                                                    Avancar
                                                                </button>
                                                            ) : null}
                                                            {canMarkAsLost ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        void moveAtendimento(item.id, "NAO_CONTRATADO").then(() => router.refresh());
                                                                    }}
                                                                    className="inline-flex items-center gap-1 rounded-full border border-[rgba(153,35,4,0.16)] px-3.5 py-2 text-[11px] font-semibold text-[var(--danger)] transition hover:bg-[var(--danger-subtle)]"
                                                                >
                                                                    <XCircle size={12} />
                                                                    Perder
                                                                </button>
                                                            ) : null}
                                                            <button
                                                                type="button"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    setDeletingId(item.id);
                                                                }}
                                                                className="rounded-full border border-transparent p-2 text-text-muted transition hover:border-[rgba(120,84,52,0.12)] hover:bg-[rgba(247,241,235,0.9)] hover:text-[var(--danger)]"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })
                                    )}
                                </div>
                            </section>
                        );
                    })}
                    </div>
                </div>
            </section>

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Novo atendimento juridico" size="xl">
                <form onSubmit={handleCreate} className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Select
                            id="atend-clienteId"
                            name="clienteId"
                            label="Cliente"
                            required
                            placeholder="Selecionar"
                            options={clientes.map((cliente) => ({
                                value: cliente.id,
                                label: `${cliente.nome}${cliente.cpf ? ` (${cliente.cpf})` : cliente.cnpj ? ` (${cliente.cnpj})` : ""}`,
                            }))}
                        />
                        <Select
                            id="atend-advogadoId"
                            name="advogadoId"
                            label="Responsavel"
                            required
                            placeholder="Selecionar"
                            options={advogados.map((advogado) => ({
                                value: advogado.id,
                                label: advogado.user.name || "Sem nome",
                            }))}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <Select
                            id="atend-statusOperacional"
                            name="statusOperacional"
                            label="Etapa inicial"
                            defaultValue={DEFAULT_ATENDIMENTO_STATUS_OPERACIONAL}
                            options={ATENDIMENTO_KANBAN_COLUMNS.flatMap((column) =>
                                column.statuses.map((status) => ({ value: status, label: ATENDIMENTO_STATUS_LABELS[status] })),
                            ).filter((option, index, array) => array.findIndex((item) => item.value === option.value) === index)}
                        />
                        <Select
                            id="atend-prioridade"
                            name="prioridade"
                            label="Prioridade"
                            defaultValue="NORMAL"
                            options={[
                                { value: "BAIXA", label: "Baixa" },
                                { value: "NORMAL", label: "Normal" },
                                { value: "ALTA", label: "Alta" },
                                { value: "URGENTE", label: "Urgente" },
                            ]}
                        />
                        <Select
                            id="atend-canal"
                            name="canal"
                            label="Canal"
                            defaultValue="WHATSAPP"
                            options={[
                                { value: "PRESENCIAL", label: "Presencial" },
                                { value: "TELEFONE", label: "Telefone" },
                                { value: "EMAIL", label: "E-mail" },
                                { value: "WHATSAPP", label: "WhatsApp" },
                                { value: "SITE", label: "Site" },
                                { value: "INDICACAO", label: "Indicacao" },
                            ]}
                        />
                        <Input id="atend-areaJuridica" name="areaJuridica" label="Area do direito" placeholder="Ex: Trabalhista" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <Input id="atend-origemAtendimento" name="origemAtendimento" label="Origem" placeholder="WhatsApp, site, indicacao" />
                        <Select
                            id="atend-situacaoDocumental"
                            name="situacaoDocumental"
                            label="Documentacao"
                            defaultValue="SEM_DOCUMENTOS"
                            options={[
                                { value: "SEM_DOCUMENTOS", label: "Sem documentos" },
                                { value: "PARCIAL", label: "Parcial" },
                                { value: "COMPLETA", label: "Completa" },
                                { value: "CONFERIDA", label: "Conferida" },
                            ]}
                        />
                        <Select
                            id="atend-statusReuniao"
                            name="statusReuniao"
                            label="Status da reuniao"
                            defaultValue="NAO_AGENDADA"
                            options={[
                                { value: "NAO_AGENDADA", label: "Nao agendada" },
                                { value: "AGENDADA", label: "Agendada" },
                                { value: "CONFIRMADA", label: "Confirmada" },
                                { value: "REMARCADA", label: "Remarcada" },
                                { value: "CANCELADA", label: "Cancelada" },
                                { value: "REALIZADA", label: "Realizada" },
                                { value: "NAO_COMPARECEU", label: "Nao compareceu" },
                            ]}
                        />
                        <Input id="atend-valorEstimado" name="valorEstimado" label="Valor estimado" placeholder="0,00" inputMode="decimal" />
                    </div>

                    <Input
                        id="atend-assunto"
                        name="assunto"
                        label="Assunto"
                        required
                        placeholder="Ex: Rescisao indireta, inventario, defesa em execucao"
                    />
                    <Textarea
                        id="atend-resumo"
                        name="resumo"
                        label="Resumo juridico"
                        rows={3}
                        placeholder="Sintese do caso, urgencia, documentos esperados e objetivo do cliente."
                    />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <Input id="atend-dataRetorno" name="dataRetorno" label="Prazo de retorno" type="datetime-local" />
                        <Input id="atend-proximaAcaoAt" name="proximaAcaoAt" label="Data da proxima acao" type="datetime-local" />
                        <Input id="atend-dataReuniao" name="dataReuniao" label="Data da reuniao" type="datetime-local" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input id="atend-proximaAcao" name="proximaAcao" label="Proxima acao" placeholder="Cobrar documentos, enviar contrato..." />
                        <Input id="atend-motivoPerda" name="motivoPerda" label="Motivo de perda" placeholder="Opcional" />
                    </div>

                    <Textarea
                        id="atend-observacoesReuniao"
                        name="observacoesReuniao"
                        label="Observacoes adicionais"
                        rows={3}
                        placeholder="Notas de reuniao, honorarios ou pontos sensiveis do atendimento."
                    />

                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                "Registrar atendimento"
                            )}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={Boolean(selectedAtendimento)}
                onClose={() => setSelectedId(null)}
                title={selectedAtendimento ? `Atendimento de ${selectedAtendimento.cliente.nome}` : "Detalhes do atendimento"}
                size="xl"
            >
                {selectedAtendimento ? (
                    <div className="space-y-5">
                        <div className="flex flex-col gap-4 rounded-[26px] border border-[var(--border-color)] bg-[var(--surface-soft)]/60 p-5 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="muted">{selectedAtendimento.areaJuridica || "Area juridica nao definida"}</Badge>
                                    <Badge variant={getStatusVariant(selectedAtendimento.statusOperacional)}>{ATENDIMENTO_STATUS_LABELS[selectedAtendimento.statusOperacional]}</Badge>
                                    <Badge variant={getPriorityVariant(selectedAtendimento.prioridade)}>{selectedAtendimento.prioridade.toLowerCase()}</Badge>
                                </div>
                                <h3 className="text-xl font-semibold text-text-primary">{selectedAtendimento.assunto}</h3>
                                <p className="max-w-3xl text-sm leading-6 text-text-secondary">
                                    {selectedAtendimento.resumo || "Sem resumo juridico registrado para este atendimento."}
                                </p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <InfoBlock label="Ultima interacao" value={formatRelative(selectedAtendimento.ultimaInteracaoEm ?? selectedAtendimento.updatedAt)} />
                                <InfoBlock label="Valor estimado" value={selectedAtendimento.valorEstimado ? formatCurrency(selectedAtendimento.valorEstimado) : "Nao informado"} />
                                <InfoBlock label="Chance de fechamento" value={selectedAtendimento.chanceFechamento ? `${selectedAtendimento.chanceFechamento}%` : "Nao definida"} />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 border-b border-[var(--border-color)] pb-3">
                            {([
                                { id: "resumo", label: "Resumo" },
                                { id: "documentos", label: "Documentos" },
                                { id: "comunicacao", label: "Comunicacao" },
                                { id: "financeiro", label: "Financeiro" },
                                { id: "historico", label: "Historico" },
                            ] as { id: DetailTab; label: string }[]).map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setDetailTab(tab.id)}
                                    className={cn(
                                        "rounded-full border px-3 py-2 text-sm font-medium transition",
                                        detailTab === tab.id ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--border-color)] text-text-muted hover:text-text-primary",
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {detailTab === "resumo" ? (
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <InfoBlock label="Cliente" value={selectedAtendimento.cliente.nome} />
                                <InfoBlock label="Responsavel" value={selectedAtendimento.advogado.user.name || "Sem responsavel"} />
                                <InfoBlock label="Telefone" value={selectedAtendimento.cliente.telefone || "Nao informado"} />
                                <InfoBlock label="E-mail" value={selectedAtendimento.cliente.email || "Nao informado"} />
                                <InfoBlock label="Origem" value={selectedAtendimento.origemAtendimento || CANAL_LABELS[selectedAtendimento.canal] || selectedAtendimento.canal} />
                                <InfoBlock label="Entrada" value={formatDate(selectedAtendimento.createdAt)} />
                                <InfoBlock label="Proxima acao" value={selectedAtendimento.proximaAcao || "Nao definida"} />
                                <InfoBlock label="Prazo de retorno" value={selectedAtendimento.dataRetorno ? formatDate(selectedAtendimento.dataRetorno) : "Nao definido"} />
                            </div>
                        ) : null}

                        {detailTab === "documentos" ? (
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <InfoBlock label="Status documental" value={DOCUMENT_STATUS_LABELS[selectedAtendimento.situacaoDocumental] || selectedAtendimento.situacaoDocumental} />
                                <InfoBlock label="Subarea" value={selectedAtendimento.subareaJuridica || "Nao definida"} />
                                <div className="rounded-[24px] border border-[var(--border-color)] p-5 lg:col-span-2">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Checklist sugerido</p>
                                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                                        {[
                                            "Documento pessoal do cliente",
                                            "Comprovantes e anexos do caso",
                                            "Linha do tempo dos fatos",
                                            "Autorizacoes e procuracao",
                                        ].map((label) => (
                                            <div key={label} className="rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm text-text-secondary">
                                                {label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {detailTab === "comunicacao" ? (
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <InfoBlock label="Canal preferencial" value={CANAL_LABELS[selectedAtendimento.canal] || selectedAtendimento.canal} />
                                <InfoBlock label="Status da reuniao" value={MEETING_STATUS_LABELS[selectedAtendimento.statusReuniao] || selectedAtendimento.statusReuniao} />
                                <div className="rounded-[24px] border border-[var(--border-color)] p-5 lg:col-span-2">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Historico recente</p>
                                    <div className="mt-4 space-y-3">
                                        {selectedAtendimento.historicos.length === 0 ? (
                                            <p className="text-sm text-text-muted">Nenhum registro de comunicacao disponivel.</p>
                                        ) : (
                                            selectedAtendimento.historicos.map((history) => (
                                                <div key={history.id} className="rounded-[18px] border border-[var(--border-color)] px-4 py-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <Badge variant="muted">{CANAL_LABELS[history.canal] || history.canal}</Badge>
                                                        <span className="text-xs text-text-muted">{formatDate(history.createdAt)}</span>
                                                    </div>
                                                    <p className="mt-2 text-sm leading-6 text-text-secondary">{history.descricao}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {detailTab === "financeiro" ? (
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <InfoBlock label="Proposta" value={getProposalLabel(selectedAtendimento.statusOperacional)} />
                                <InfoBlock label="Valor estimado" value={selectedAtendimento.valorEstimado ? formatCurrency(selectedAtendimento.valorEstimado) : "Nao informado"} />
                                <InfoBlock label="Chance de fechamento" value={selectedAtendimento.chanceFechamento ? `${selectedAtendimento.chanceFechamento}%` : "Nao definida"} />
                                <InfoBlock label="Processo" value={selectedAtendimento.processoId ? "Vinculado ao modulo de processos" : "Ainda nao vinculado"} />
                                <div className="rounded-[24px] border border-[var(--border-color)] p-5 lg:col-span-2">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Observacoes e perdas</p>
                                    <div className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
                                        <p><span className="font-medium text-text-primary">Motivo de perda:</span> {selectedAtendimento.motivoPerda || "Nao registrado"}</p>
                                        <p><span className="font-medium text-text-primary">Observacoes de reuniao:</span> {selectedAtendimento.observacoesReuniao || "Nao registradas"}</p>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {detailTab === "historico" ? (
                            <div className="rounded-[24px] border border-[var(--border-color)] p-5">
                                <div className="flex items-center gap-2">
                                    <History size={16} className="text-text-muted" />
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Log do atendimento</p>
                                </div>
                                <div className="mt-4 space-y-3">
                                    {selectedAtendimento.historicos.length === 0 ? (
                                        <p className="text-sm text-text-muted">Nenhum log vinculado ate o momento.</p>
                                    ) : (
                                        selectedAtendimento.historicos.map((history) => (
                                            <div key={history.id} className="rounded-[18px] border border-[var(--border-color)] px-4 py-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="muted">{CANAL_LABELS[history.canal] || history.canal}</Badge>
                                                        <span className="text-xs text-text-muted">Autor {history.userId}</span>
                                                    </div>
                                                    <span className="text-xs text-text-muted">{formatDate(history.createdAt)}</span>
                                                </div>
                                                <p className="mt-2 text-sm leading-6 text-text-secondary">{history.descricao}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </Modal>

            <Modal isOpen={Boolean(deletingId)} onClose={() => setDeletingId(null)} title="Excluir atendimento" size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-text-secondary">
                        Isso remove o atendimento e o historico vinculado. Use apenas quando o registro nao fizer mais sentido.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setDeletingId(null)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Excluir
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
