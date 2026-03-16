import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import {
    getAgendamentos,
    getAgendamentosForKanban,
    getAgendamentoTabCounts,
    getAgendamentoStats,
    type AgendamentoVisibilityScope,
} from "@/lib/dal/agendamento";
import { getAdvogados } from "@/lib/dal/processos";
import { syncAgendaLegadaSnapshot } from "@/lib/services/agendamento-legacy-sync";
import { AgendaDashboard } from "@/components/agenda/agenda-dashboard";
import { CalendarDays, AlertTriangle, Sparkles, CheckCheck } from "lucide-react";
import type { TipoAgendamento, StatusAgendamento, PrioridadeAgendamento } from "@/generated/prisma";
import type { AgendamentoFiltrosValues } from "@/components/agenda/agendamento-filtros";
import type { AgendamentoCardData } from "@/components/agenda/agendamento-card";

interface Props {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function asString(v: string | string[] | undefined) {
    if (Array.isArray(v)) return v[0] || "";
    return typeof v === "string" ? v : "";
}

function parseCSV<T extends string>(v: string | string[] | undefined, allowed: T[]): T[] {
    const raw = Array.isArray(v) ? v.join(",") : typeof v === "string" ? v : "";
    return raw
        .split(",")
        .map((x) => x.trim())
        .filter((x): x is T => allowed.includes(x as T));
}

const ALL_TIPOS: TipoAgendamento[] = [
    "PRAZO_FATAL", "PRAZO_INTERMEDIARIO", "AUDIENCIA", "COMPROMISSO",
    "TAREFA", "REUNIAO", "RETORNO", "VERIFICACAO", "DILIGENCIA", "PRAZO_IA",
];
const ALL_STATUS: StatusAgendamento[] = ["PENDENTE", "VISUALIZADO", "CONCLUIDO", "CONFERIDO", "CANCELADO", "VENCIDO"];
const ALL_PRIO: PrioridadeAgendamento[] = ["URGENTE", "ALTA", "NORMAL", "BAIXA"];

export default async function AgendaPage({ searchParams }: Props) {
    const params = await searchParams;
    const user = await getSession();
    if (!user) return null;

    const scope: AgendamentoVisibilityScope = {
        role: user.role,
        userId: user.id,
        advogadoId: user.advogado?.id ?? null,
    };

    const canConferir = ["ADMIN", "SOCIO", "CONTROLADOR"].includes(user.role);
    const canSeeEscritorio = !["ADVOGADO"].includes(user.role);
    const fallbackTab = user.advogado?.id ? "minha" : canSeeEscritorio ? "escritorio" : "observador";

    // Params da URL
    const requestedTab = asString(params.tab) as "minha" | "escritorio" | "observador" | "conferir" | "";
    const tab = (() => {
        if (!requestedTab) return fallbackTab;
        if (requestedTab === "minha" && !user.advogado?.id) return fallbackTab;
        if ((requestedTab === "escritorio" || requestedTab === "conferir") && !canSeeEscritorio) {
            return fallbackTab;
        }
        return requestedTab;
    })();
    const view = (asString(params.view) || "lista") as "lista" | "calendario" | "kanban" | "grade";
    const search = asString(params.q);
    const responsavelId = asString(params.responsavelId);
    const criadoPorId = asString(params.criadoPorId);
    const processoId = asString(params.processoId);
    const from = asString(params.from);
    const to = asString(params.to);
    const porDataDe = (asString(params.porDataDe) || "dataInicio") as "dataInicio" | "dataFatal" | "createdAt" | "updatedAt";
    const statusFilter = parseCSV<StatusAgendamento>(params.status, ALL_STATUS);
    const tiposFilter = parseCSV<TipoAgendamento>(params.tipos, ALL_TIPOS);
    const prioridadeFilter = parseCSV<PrioridadeAgendamento>(params.prioridade, ALL_PRIO);

    // Datas para filtro
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const defaultFrom = new Date(today);
    defaultFrom.setDate(defaultFrom.getDate() - 30);
    const defaultTo = new Date(today);
    defaultTo.setDate(defaultTo.getDate() + 90);

    const fromDate = from ? new Date(from) : defaultFrom;
    const toDate = to ? new Date(to) : defaultTo;

    const filters = {
        tab,
        search,
        status: statusFilter.length ? statusFilter : undefined,
        tipos: tiposFilter.length ? tiposFilter : undefined,
        responsavelId: responsavelId || undefined,
        criadoPorId: criadoPorId || undefined,
        processoId: processoId || undefined,
        prioridade: prioridadeFilter.length ? prioridadeFilter : undefined,
        from: fromDate,
        to: toDate,
        porDataDe,
        pageSize: 200,
    };

    await syncAgendaLegadaSnapshot({
        advogadoId: user.role === "ADVOGADO" ? user.advogado?.id ?? null : null,
    }).catch((error) => {
        console.warn("[agenda] Falha ao sincronizar snapshot legado:", error);
    });

    // Carregar dados em paralelo
    const [
        { agendamentos },
        kanbanData,
        tabCounts,
        stats,
        advogados,
        processos,
    ] = await Promise.all([
        getAgendamentos(filters, scope),
        getAgendamentosForKanban(scope),
        getAgendamentoTabCounts(scope),
        getAgendamentoStats(scope),
        getAdvogados().then((items) =>
            user.role === "ADVOGADO" && user.advogado?.id
                ? items.filter((a) => a.id === user.advogado!.id)
                : items
        ),
        db.processo.findMany({
            where: {
                status: { notIn: ["ENCERRADO", "ARQUIVADO"] },
                ...(user.role === "ADVOGADO" && user.advogado?.id ? { advogadoId: user.advogado.id } : {}),
            },
            select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } },
            orderBy: { updatedAt: "desc" },
            take: 200,
        }),
    ]);

    // KPIs
    const kpis = [
        {
            label: "Total na janela",
            value: agendamentos.length,
            helper: `${stats.hojeFatal} prazo(s) fatal(is) hoje`,
            icon: CalendarDays,
            tone: "cat-neutral",
        },
        {
            label: "Vencidos",
            value: stats.vencidos,
            helper: `${stats.semanaFatal} prazos fatais na semana`,
            icon: AlertTriangle,
            tone: stats.vencidos > 0 ? "cat-critico" : "cat-neutral",
        },
        {
            label: "A conferir",
            value: stats.aConferir,
            helper: "aguardando revisao",
            icon: CheckCheck,
            tone: stats.aConferir > 0 ? "cat-warning" : "cat-neutral",
        },
        {
            label: "Prazos por IA",
            value: agendamentos.filter((a) => a.tipo === "PRAZO_IA").length,
            helper: "originados de publicacoes",
            icon: Sparkles,
            tone: "cat-success",
        },
    ];

    // Serializar para client components
    const serializedItems: AgendamentoCardData[] = agendamentos.map((a) => ({
        id: a.id,
        tipo: a.tipo,
        status: a.status,
        prioridade: a.prioridade,
        titulo: a.titulo,
        descricao: a.descricao,
        dataInicio: a.dataInicio.toISOString(),
        dataFim: a.dataFim?.toISOString() ?? null,
        dataFatal: a.dataFatal?.toISOString() ?? null,
        diaInteiro: a.diaInteiro,
        fatal: a.fatal,
        origemConfianca: a.origemConfianca,
        conferido: a.conferido,
        concluidoEm: a.concluidoEm?.toISOString() ?? null,
        processoId: a.processoId,
        processo: a.processo
            ? {
                numeroCnj: a.processo.numeroCnj,
                cliente: a.processo.cliente ? { nome: a.processo.cliente.nome } : null,
            }
            : null,
        cliente: a.cliente ? { nome: a.cliente.nome } : null,
        responsavel: a.responsavel
            ? { user: { name: a.responsavel.user.name, avatarUrl: a.responsavel.user.avatarUrl } }
            : null,
        _count: a._count,
    }));

    function serializeKanbanItems(items: typeof kanbanData.vencidos): AgendamentoCardData[] {
        return items.map((a) => ({
            id: a.id,
            tipo: a.tipo,
            status: a.status,
            prioridade: a.prioridade,
            titulo: a.titulo,
            descricao: a.descricao,
            dataInicio: a.dataInicio.toISOString(),
            dataFim: a.dataFim?.toISOString() ?? null,
            dataFatal: a.dataFatal?.toISOString() ?? null,
            diaInteiro: a.diaInteiro,
            fatal: a.fatal,
            origemConfianca: a.origemConfianca,
            conferido: a.conferido,
            concluidoEm: a.concluidoEm?.toISOString() ?? null,
            processoId: a.processoId,
            processo: a.processo
                ? { numeroCnj: a.processo.numeroCnj, cliente: a.processo.cliente ? { nome: a.processo.cliente.nome } : null }
                : null,
            cliente: a.cliente ? { nome: a.cliente.nome } : null,
            responsavel: a.responsavel
                ? { user: { name: a.responsavel.user.name, avatarUrl: a.responsavel.user.avatarUrl } }
                : null,
            _count: a._count,
        }));
    }

    const initialFilters: AgendamentoFiltrosValues = {
        search,
        status: statusFilter,
        tipos: tiposFilter,
        responsavelId,
        criadoPorId,
        prioridade: prioridadeFilter,
        processoId,
        from,
        to,
        porDataDe,
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">Agenda</h1>
                <p className="text-sm text-text-muted mt-1">
                    Gestao unificada de prazos, audiencias, compromissos, tarefas e mais
                </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className={`glass-card kpi-card p-5 ${kpi.tone}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                {kpi.label}
                            </span>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg adv-icon-badge">
                                <kpi.icon size={15} strokeWidth={1.75} className="text-text-primary" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-text-primary font-mono">{kpi.value}</p>
                        <p className="text-[11px] text-text-muted mt-1">{kpi.helper}</p>
                    </div>
                ))}
            </div>

            {/* Dashboard principal */}
            <AgendaDashboard
                items={serializedItems}
                kanbanData={{
                    vencidos: serializeKanbanItems(kanbanData.vencidos),
                    hoje: serializeKanbanItems(kanbanData.hoje),
                    estaSemana: serializeKanbanItems(kanbanData.estaSemana),
                    proximaSemana: serializeKanbanItems(kanbanData.proximaSemana),
                    futuro: serializeKanbanItems(kanbanData.futuro),
                }}
                tabCounts={JSON.parse(JSON.stringify(tabCounts))}
                advogados={JSON.parse(JSON.stringify(advogados))}
                processos={JSON.parse(JSON.stringify(processos))}
                initialTab={tab}
                initialView={view}
                initialFilters={initialFilters}
                canConferir={canConferir}
                canSeeEscritorio={canSeeEscritorio}
                sessionAdvogadoId={user.advogado?.id ?? ""}
                sessionUserId={user.id}
            />
        </div>
    );
}
