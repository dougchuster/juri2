import Link from "next/link";
import { redirect } from "next/navigation";
import { Scales, CurrencyDollar, CheckSquare, Handshake, WarningCircle, Sparkle, Clock } from "@/components/ui/icons";
import { Plus, ChevronRight, CalendarCheck } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import { DashboardAgendaPanel } from "@/components/agenda/dashboard-agenda-panel";
import { getAdvogados } from "@/lib/dal/processos";
import { getAgendaItems } from "@/lib/dal/agenda";
import { getFinanceiroStats } from "@/lib/dal/financeiro";
import { getAtendimentoStats } from "@/lib/dal/atendimentos";
import { getPublicacaoStats } from "@/lib/dal/publicacoes";
import { getConversations } from "@/lib/dal/comunicacao";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";

function avatarColor(name: string) {
    const palette = [
        "bg-[var(--accent-subtle)] text-[var(--accent)]",
        "bg-[var(--success-subtle)] text-[var(--success)]",
        "bg-[var(--warning-subtle)] text-[var(--warning)]",
        "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
        "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
    ];
    const hash = Array.from(name || "?").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return palette[hash % palette.length];
}

const TIPO_LABEL: Record<string, string> = {
    JUDICIAL: "Judicial",
    CONSULTIVO: "Consultivo",
    ADMINISTRATIVO: "Administrativo",
    SERVICO: "Serviço",
    PROSPECCAO: "Prospecção",
};

const TIPO_COLOR: Record<string, string> = {
    JUDICIAL: "bg-[var(--accent)]",
    CONSULTIVO: "bg-[var(--highlight,#6366f1)]",
    ADMINISTRATIVO: "bg-[var(--warning)]",
    SERVICO: "bg-[var(--success)]",
    PROSPECCAO: "bg-[var(--danger)]",
};

export default async function DashboardPage() {
    const session = await getSession();
    if (session && !session.onboardingCompleted && session.role === "ADMIN" && !session.escritorioId) redirect("/onboarding");
    const visibilityScope = session ? { role: session.role, advogadoId: session.advogado?.id || null } : undefined;
    const scopedAdvogadoId = visibilityScope?.role === "ADVOGADO" ? visibilityScope.advogadoId : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const [processosAtivos, finStats, atendimentoStats, iaStats, agendaSemana, advogados, processosPorTipo] = await Promise.all([
        db.processo.count({ where: { status: { notIn: ["ENCERRADO", "ARQUIVADO"] }, ...(session?.escritorioId ? { escritorioId: session.escritorioId } : {}), ...(scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {}) } }),
        getFinanceiroStats(visibilityScope),
        getAtendimentoStats(scopedAdvogadoId || undefined),
        getPublicacaoStats(),
        getAgendaItems({
            advogadoId: scopedAdvogadoId || undefined,
            from: today,
            to: nextWeek,
            includeConcluidos: false,
            tipos: ["prazo", "audiencia", "compromisso", "tarefa"],
            limitPerType: 15,
        }, visibilityScope),
        getAdvogados().then((items) => (scopedAdvogadoId ? items.filter((item) => item.id === scopedAdvogadoId) : items)),
        db.processo.groupBy({
            by: ["tipo"],
            _count: { id: true },
            where: { status: { notIn: ["ENCERRADO", "ARQUIVADO"] }, ...(session?.escritorioId ? { escritorioId: session.escritorioId } : {}), ...(scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {}) },
        }),
    ]);

    const { conversations } = await getConversations({ pageSize: 5 });
    const displayName = session?.name?.split(" ")[0] || "Usuário";
    const now = new Date();

    const pendingDeadlines = agendaSemana.filter(item => item.tipo === "prazo" && item.status === "PENDENTE").slice(0, 6);
    const upcomingAudiencias = agendaSemana.filter(item => item.tipo === "audiencia").slice(0, 5);
    const myTasks = agendaSemana.filter(item => item.tipo === "tarefa" && item.status === "PENDENTE" && item.responsavel?.includes(displayName)).slice(0, 4);
    const delegatedTasks = agendaSemana.filter(item => item.tipo === "tarefa" && item.status === "PENDENTE" && !item.responsavel?.includes(displayName)).slice(0, 4);
    const calendarItems = [...agendaSemana]
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
        .slice(0, 10);

    // Portfolio: real counts by tipo + publicações
    const totalProcessos = processosPorTipo.reduce((sum, g) => sum + g._count.id, 0) || 1;
    const portfolioBreakdown = [
        ...processosPorTipo.map(g => ({
            label: TIPO_LABEL[g.tipo] || g.tipo,
            value: g._count.id,
            tone: TIPO_COLOR[g.tipo] || "bg-[var(--accent)]",
            pct: Math.round((g._count.id / totalProcessos) * 100),
        })),
        { label: "Publicações", value: iaStats.total, tone: "bg-[var(--danger)]", pct: Math.min(100, iaStats.total) },
    ].sort((a, b) => b.value - a.value);

    const executiveMetrics = [
        { label: "Processos ativos", value: processosAtivos.toString(), detail: "Carteira monitorada em tempo real", trend: "+14.8%", positive: true, icon: Scales },
        { label: "Atendimentos em andamento", value: atendimentoStats.leads.toString(), detail: "Demandas aguardando próximo toque", trend: "+6.4%", positive: true, icon: Handshake },
        { label: "Receita a receber", value: `R$ ${finStats.totalReceber.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, detail: "Pipeline financeiro projetado", trend: "-2.1%", positive: false, icon: CurrencyDollar },
        { label: "Contas a pagar", value: `R$ ${finStats.totalPagar.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, detail: "Obrigações financeiras pendentes", trend: "+2.4%", positive: false, icon: WarningCircle },
    ];

    return (
        <div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-[minmax(0,1.34fr)_320px] xl:grid-cols-[minmax(0,1.38fr)_340px]">
            <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
                {/* ── Metrics row ── */}
                <section className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:grid-rows-2">
                    <div className="dashboard-command-card dashboard-metric-card flex flex-col justify-between overflow-hidden rounded-[24px] p-5 sm:p-6 xl:col-span-1 xl:row-span-2">
                        <div>
                            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[rgba(255,220,190,0.8)]">Command center</p>
                            <h1 className="font-display text-[22px] font-medium leading-tight tracking-[-0.03em] text-white sm:text-[24px] lg:text-[26px]">Olá, {displayName}</h1>
                            <p className="mt-2 text-[13px] leading-[1.65] text-[rgba(255,220,190,0.76)]">Uma visão executiva do escritório com foco em fluxo crítico, timing e saúde operacional.</p>

                            <div className="mt-6 flex flex-col gap-[2px] overflow-hidden rounded-[18px]">
                                <div className="dashboard-command-strip flex items-center gap-3 px-5 py-4">
                                    <span className="text-[13px] font-medium text-[rgba(255,220,190,0.95)]">Publicações tratadas hoje</span>
                                    <span className="ml-auto font-display text-[18px] font-medium text-white">{iaStats.tratadasHoje}</span>
                                </div>
                                <div className="dashboard-command-strip flex items-center gap-3 px-5 py-4">
                                    <span className="text-[13px] font-medium text-[rgba(255,220,190,0.95)]">Pendências críticas</span>
                                    <span className="ml-auto font-display text-[18px] font-medium text-white">{pendingDeadlines.length}</span>
                                </div>
                                <div className="dashboard-command-strip flex items-center gap-3 px-5 py-4">
                                    <span className="text-[13px] font-medium text-[rgba(255,220,190,0.95)]">Tarefas concluídas</span>
                                    <span className="ml-auto font-display text-[18px] font-medium text-white">{agendaSemana.filter(item => item.status === "CONCLUIDO").length}</span>
                                </div>
                                <div className="dashboard-command-strip flex items-center gap-3 px-5 py-4">
                                    <span className="text-[13px] font-medium text-[rgba(255,220,190,0.95)]">Agendas de hoje</span>
                                    <span className="ml-auto font-display text-[18px] font-medium text-white">{calendarItems.filter(item => {
                                        const d = new Date(item.data);
                                        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                    }).length}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {executiveMetrics.map(metric => {
                        const Icon = metric.icon;
                        return (
                            <div key={metric.label} className="glass-card dashboard-metric-card flex flex-col p-5 sm:p-6 xl:col-span-1 xl:row-span-1">
                                <div className="flex items-start justify-between gap-3">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">{metric.label}</p>
                                    <div className="surface-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--accent)]"><Icon size={18} weight="duotone" /></div>
                                </div>
                                <p className="mt-5 font-display text-[34px] font-medium leading-none tracking-[-0.04em] text-[var(--text-primary)] sm:text-[38px] lg:text-[40px]">{metric.value}</p>
                                <p className="mt-2 text-[13px] leading-5 text-[var(--text-secondary)]">{metric.detail}</p>
                                <div className="mt-auto flex items-center justify-between border-t border-[var(--border-color)] pt-4">
                                    <p className="text-[12px] text-[var(--text-muted)]">Variação do período</p>
                                    <span className={metric.positive ? "text-[14px] font-bold text-[var(--success)]" : "text-[14px] font-bold text-[var(--danger)]"}>{metric.trend}</span>
                                </div>
                            </div>
                        );
                    })}
                </section>

                {/* ── Prazos críticos ── */}
                <section className="glass-card p-5 sm:p-6">
                    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="dashboard-section-kicker mb-2">Fluxo crítico da semana</p>
                            <h2 className="font-display text-[20px] font-medium tracking-[-0.03em] text-[var(--text-primary)] sm:text-[22px]">Prazos pendentes</h2>
                        </div>
                        <Link href="/prazos" className="surface-soft inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
                            Ver todos os prazos <ChevronRight size={16} />
                        </Link>
                    </div>

                    {/* Mobile */}
                    <div className="space-y-3 md:hidden">
                        {pendingDeadlines.length > 0 ? pendingDeadlines.map(item => {
                            const dateObj = new Date(item.data);
                            const diffDays = Math.ceil((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            const owner = item.responsavel.split(" ")[0] || "User";
                            const urgency = diffDays < 0 ? "danger" : diffDays <= 3 ? "warning" : "success";
                            const urgencyLabel = diffDays < 0 ? "Vencido" : diffDays <= 3 ? "Urgente" : "Normal";
                            return (
                                <Link href="/prazos" key={item.id} className="surface-soft block rounded-[22px] px-4 py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[14px] font-semibold text-[var(--text-primary)]">{item.titulo}</p>
                                            <p className="mt-1 text-[12px] text-[var(--text-muted)]">{item.processoCnj || "Sem CNJ vinculado"}</p>
                                        </div>
                                        <Badge variant={urgency} size="md">{urgencyLabel}</Badge>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
                                        <span>{dateObj.toLocaleDateString("pt-BR")}</span>
                                        <div className="flex items-center gap-2">
                                            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${avatarColor(owner)}`}>{getInitials(owner)}</div>
                                            <span>{owner}</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        }) : <div className="rounded-[22px] border border-dashed border-[var(--border-color)] px-5 py-12 text-center text-sm text-[var(--text-muted)]">Nenhum prazo crítico pendente nesta janela.</div>}
                    </div>

                    {/* Desktop */}
                    <div className="table-shell hidden overflow-x-auto md:block">
                        <div className="min-w-[640px]">
                            <div className="grid grid-cols-[minmax(0,2fr)_130px_100px_110px] gap-4 border-b border-[var(--border-color)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                <span>Demanda</span><span>Data limite</span><span>Urgência</span><span>Responsável</span>
                            </div>
                            <div className="divide-y divide-[var(--border-color)]">
                                {pendingDeadlines.length > 0 ? pendingDeadlines.map(item => {
                                    const dateObj = new Date(item.data);
                                    const diffDays = Math.ceil((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                    const owner = item.responsavel.split(" ")[0] || "User";
                                    const urgency = diffDays < 0 ? "danger" : diffDays <= 3 ? "warning" : "success";
                                    const urgencyLabel = diffDays < 0 ? "Vencido" : diffDays <= 3 ? "Urgente" : "Normal";
                                    return (
                                        <Link href="/prazos" key={item.id} className="table-row-premium grid grid-cols-[minmax(0,2fr)_130px_100px_110px] items-center gap-4 px-5 py-4">
                                            <div className="min-w-0">
                                                <p className="truncate text-[14px] font-semibold text-[var(--text-primary)]">{item.titulo}</p>
                                                <p className="mt-0.5 truncate text-[12px] text-[var(--text-muted)]">{item.processoCnj || "Sem CNJ vinculado"}</p>
                                            </div>
                                            <div className="text-[13px] text-[var(--text-secondary)] whitespace-nowrap">{dateObj.toLocaleDateString("pt-BR")}</div>
                                            <div><Badge variant={urgency} size="md">{urgencyLabel}</Badge></div>
                                            <div className="flex items-center gap-2">
                                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarColor(owner)}`}>{getInitials(owner)}</div>
                                                <span className="truncate text-[13px] font-medium text-[var(--text-secondary)]">{owner}</span>
                                            </div>
                                        </Link>
                                    );
                                }) : <div className="px-5 py-12 text-center text-sm text-[var(--text-muted)]">Nenhum prazo crítico pendente nesta janela.</div>}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Conversas + Portfolio / Audiências ── */}
                <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    {/* Conversas */}
                    <div className="glass-card widget-card p-5 sm:p-6">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <p className="dashboard-section-kicker mb-2">Comunicação</p>
                                <h2 className="font-display text-[20px] font-medium tracking-[-0.03em] text-[var(--text-primary)] sm:text-[21px]">Conversas recentes</h2>
                            </div>
                            <Link href="/comunicacao" className="text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]">Abrir inbox</Link>
                        </div>
                        <div className="space-y-2">
                            {conversations.length > 0 ? conversations.map(conv => {
                                const cliName = conv.cliente?.nome || "Cliente";
                                const lastMessage = conv.messages?.[0];
                                const timeLabel = lastMessage
                                    ? (() => {
                                        const d = new Date(lastMessage.createdAt);
                                        const isToday = d.toDateString() === now.toDateString();
                                        return isToday
                                            ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                                            : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
                                    })()
                                    : "";
                                return (
                                    <Link key={conv.id} href="/comunicacao" className="surface-soft flex items-center gap-3 rounded-[18px] px-4 py-3.5 transition-colors hover:bg-[var(--bg-tertiary)]">
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColor(cliName)}`}>
                                            {getInitials(cliName)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="truncate text-[14px] font-semibold text-[var(--text-primary)]">{cliName}</p>
                                                <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{timeLabel}</span>
                                            </div>
                                            <p className="mt-0.5 truncate text-[12px] text-[var(--text-secondary)]">
                                                {lastMessage?.content || "Sem mensagens recentes."}
                                            </p>
                                        </div>
                                        {conv.unreadCount > 0 && (
                                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-bold text-white">
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </Link>
                                );
                            }) : <div className="surface-soft rounded-[22px] border-dashed px-5 py-10 text-center text-sm text-[var(--text-muted)]">Nenhuma comunicação recente disponível.</div>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        {/* Mix da carteira */}
                        <div className="glass-card widget-card p-5 sm:p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <p className="dashboard-section-kicker mb-2">Portfólio</p>
                                    <h2 className="font-display text-[20px] font-medium tracking-[-0.03em] text-[var(--text-primary)] sm:text-[21px]">Mix da carteira</h2>
                                </div>
                                <Sparkle size={18} className="text-[var(--accent)]" />
                            </div>
                            <div className="space-y-3">
                                {portfolioBreakdown.map(item => (
                                    <div key={item.label}>
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`h-2 w-2 rounded-full ${item.tone}`} />
                                                <span className="text-[13px] font-medium text-[var(--text-secondary)]">{item.label}</span>
                                            </div>
                                            <span className="font-display text-[18px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{item.value}</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-[var(--border-color)]">
                                            <div className={`h-1.5 rounded-full transition-all ${item.tone}`} style={{ width: `${Math.min(item.pct, 100)}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Próximas audiências */}
                        <div className="glass-card widget-card p-5 sm:p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <p className="dashboard-section-kicker mb-2">Agenda</p>
                                    <h2 className="font-display text-[20px] font-medium tracking-[-0.03em] text-[var(--text-primary)] sm:text-[21px]">Próximas audiências</h2>
                                </div>
                                <Link href="/agenda" className="text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]">Ver agenda</Link>
                            </div>
                            {upcomingAudiencias.length > 0 ? (
                                <div className="space-y-2">
                                    {upcomingAudiencias.map(item => {
                                        const d = new Date(item.data);
                                        const isToday = d.toDateString() === now.toDateString();
                                        return (
                                            <div key={item.id} className="surface-soft flex items-center gap-3 rounded-[18px] px-4 py-3">
                                                <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-[10px] bg-[var(--accent-subtle)] text-[var(--accent)]">
                                                    <span className="text-[10px] font-bold leading-none">{d.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase().replace(".", "")}</span>
                                                    <span className="font-display text-[16px] font-semibold leading-tight">{d.getDate()}</span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{item.titulo}</p>
                                                    <p className="text-[11px] text-[var(--text-muted)]">{isToday ? "Hoje" : d.toLocaleDateString("pt-BR")} · {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 py-6 text-center">
                                    <CalendarCheck size={28} className="text-[var(--text-muted)]" />
                                    <p className="text-sm text-[var(--text-muted)]">Nenhuma audiência nesta semana.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {/* ── Right sidebar ── */}
            <div className="flex flex-col gap-5">
                <DashboardAgendaPanel
                    items={JSON.parse(JSON.stringify(calendarItems))}
                    advogados={JSON.parse(JSON.stringify(advogados))}
                    defaultAdvogadoId={scopedAdvogadoId || undefined}
                />

                <section className="glass-card widget-card p-5 sm:p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <p className="dashboard-section-kicker mb-2">Execução pessoal</p>
                            <h2 className="font-display text-[20px] font-medium tracking-[-0.03em] text-[var(--text-primary)] sm:text-[21px]">Minhas tarefas</h2>
                        </div>
                        <CheckSquare className="text-[var(--accent)]" size={18} weight="duotone" />
                    </div>
                    <div className="space-y-2">
                        {myTasks.length > 0 ? myTasks.map(task => {
                            const dateObj = new Date(task.data);
                            const diffDays = Math.ceil((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            const isLate = diffDays < 0;
                            return (
                                <div key={task.id} className="surface-soft rounded-[18px] px-4 py-3.5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-semibold text-[var(--text-primary)]">{task.titulo}</p>
                                            <p className={`mt-0.5 text-[12px] ${isLate ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}>
                                                {isLate ? `Atrasada ${Math.abs(diffDays)}d` : dateObj.toLocaleDateString("pt-BR")} · {dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        </div>
                                        <Clock size={14} className={isLate ? "text-[var(--danger)]" : "text-[var(--text-muted)]"} />
                                    </div>
                                </div>
                            );
                        }) : <p className="text-sm text-[var(--text-muted)]">Nenhuma tarefa pendente para você nesta semana.</p>}
                    </div>
                </section>

                <section className="glass-card widget-card p-5 sm:p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <p className="dashboard-section-kicker mb-2">Delegação</p>
                            <h2 className="font-display text-[20px] font-medium tracking-[-0.03em] text-[var(--text-primary)] sm:text-[21px]">Tarefas distribuídas</h2>
                        </div>
                        <Link href="/tarefas" className="surface-soft flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
                            <Plus size={16} />
                        </Link>
                    </div>
                    <div className="space-y-2">
                        {delegatedTasks.length > 0 ? delegatedTasks.map(task => (
                            <div key={task.id} className="surface-soft rounded-[18px] px-4 py-3.5">
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarColor(task.responsavel.split(" ")[0] || "U")}`}>
                                        {getInitials(task.responsavel.split(" ")[0] || "U")}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{task.titulo}</p>
                                        <p className="text-[12px] text-[var(--text-muted)]">{task.responsavel.split(" ")[0]}</p>
                                    </div>
                                </div>
                            </div>
                        )) : <p className="text-sm text-[var(--text-muted)]">Nenhuma tarefa delegada para outros advogados neste momento.</p>}
                    </div>
                </section>
            </div>
        </div>
    );
}
