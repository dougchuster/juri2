import Link from "next/link";
import { AlertTriangle, BarChart3, CalendarClock, CheckSquare, FolderKanban, Sparkles } from "lucide-react";
import { getSession } from "@/actions/auth";
import {
    executarRegrasGeracaoRotinasDemandas,
    executarRotinasRecorrentesDemandas,
} from "@/actions/demandas";
import { db } from "@/lib/db";
import {
    getDemandasAuditoriaRecente,
    getDemandasIaIndicadores,
    getDemandasOverview,
    getDemandasPlanosIaRecentes,
    getDemandasRotinasRecorrentes,
    getDemandasRotinasTemplates,
} from "@/lib/dal/demandas";
import { AREAS_ATUACAO, getAreaAtuacaoLabel } from "@/lib/services/areas-atuacao";
import { DemandasAiPanel } from "@/components/demandas/demandas-ai-panel";
import { DemandasPlanejamentoPanel } from "@/components/demandas/demandas-planejamento-panel";
import { DemandasRedistribuicaoPanel } from "@/components/demandas/demandas-redistribuicao-panel";
import { DemandasPlanosPanel } from "@/components/demandas/demandas-planos-panel";
import { DemandasRotinasPanel } from "@/components/demandas/demandas-rotinas-panel";
import { Badge } from "@/components/ui/badge";

interface Props {
    searchParams: Promise<Record<string, string | string[]>>;
}

function toStringParam(value: string | string[] | undefined) {
    return typeof value === "string" ? value : "";
}

function buildUrl(current: Record<string, string | string[]>, updates: Record<string, string>) {
    const merged: Record<string, string> = {
        area: toStringParam(current.area),
        advogadoId: toStringParam(current.advogadoId),
        periodoDias: toStringParam(current.periodoDias) || "30",
        ...updates,
    };
    const qs = new URLSearchParams(
        Object.entries(merged).filter(([, value]) => value !== "")
    ).toString();
    return `/demandas${qs ? `?${qs}` : ""}`;
}

export default async function DemandasPage({ searchParams }: Props) {
    const params = await searchParams;
    const areaParam = toStringParam(params.area);
    const advogadoIdParam = toStringParam(params.advogadoId);
    const periodoDiasRaw = Number.parseInt(toStringParam(params.periodoDias) || "30", 10);
    const periodoDias = Number.isFinite(periodoDiasRaw) ? periodoDiasRaw : 30;

    const area = areaParam && AREAS_ATUACAO.includes(areaParam as never) ? areaParam : "TODAS";
    const session = await getSession();
    const advogadoSessaoId = session?.advogado?.id || "";

    const hojeInicio = new Date();
    hojeInicio.setHours(0, 0, 0, 0);
    const hojeFim = new Date(hojeInicio);
    hojeFim.setHours(23, 59, 59, 999);
    const limite3Dias = new Date(hojeFim);
    limite3Dias.setDate(limite3Dias.getDate() + 3);

    if (session) {
        await executarRegrasGeracaoRotinasDemandas({ modo: "AUTO", simular: false });
        await executarRotinasRecorrentesDemandas({ modo: "AUTO" });
    }

    const [overview, iaIndicadores, advogados, auditoriaRecente, planosIa, rotinas, templates, tarefasMeuDia, prazosMeuDia] = await Promise.all([
        getDemandasOverview({
            area: area as "TODAS",
            advogadoId: advogadoIdParam || undefined,
            periodoDias,
        }),
        getDemandasIaIndicadores(periodoDias),
        db.advogado.findMany({
            where: { ativo: true, user: { isActive: true } },
            select: { id: true, user: { select: { name: true, role: true } } },
            orderBy: { user: { name: "asc" } },
            take: 400,
        }),
        getDemandasAuditoriaRecente(20),
        getDemandasPlanosIaRecentes(12),
        getDemandasRotinasRecorrentes(),
        getDemandasRotinasTemplates(),
        advogadoSessaoId
            ? db.tarefa.findMany({
                  where: {
                      advogadoId: advogadoSessaoId,
                      status: { in: ["A_FAZER", "EM_ANDAMENTO", "REVISAO"] },
                      OR: [
                          { dataLimite: { lte: hojeFim } },
                          { dataLimite: null },
                      ],
                  },
                  select: {
                      id: true,
                      titulo: true,
                      prioridade: true,
                      dataLimite: true,
                      processo: { select: { numeroCnj: true } },
                  },
                  orderBy: [{ dataLimite: "asc" }, { createdAt: "desc" }],
                  take: 8,
              })
            : Promise.resolve([]),
        advogadoSessaoId
            ? db.prazo.findMany({
                  where: {
                      advogadoId: advogadoSessaoId,
                      status: "PENDENTE",
                      dataFatal: { lte: limite3Dias },
                  },
                  select: {
                      id: true,
                      descricao: true,
                      dataFatal: true,
                      processo: { select: { numeroCnj: true } },
                  },
                  orderBy: { dataFatal: "asc" },
                  take: 8,
              })
            : Promise.resolve([]),
    ]);

    const canApplyLote = Boolean(
        session &&
            ["ADMIN", "SOCIO", "CONTROLADOR", "ADVOGADO"].includes(session.role)
    );

    const kpis = [
        { label: "Tarefas abertas", value: overview.kpis.tarefasAbertas, icon: CheckSquare, tone: "cat-amber" },
        { label: "Tarefas atrasadas", value: overview.kpis.tarefasAtrasadas, icon: AlertTriangle, tone: "cat-critico" },
        { label: "Prazos criticos (7d)", value: overview.kpis.prazosCriticos7d, icon: CalendarClock, tone: "cat-critico" },
        { label: "Processos ativos", value: overview.kpis.processosAtivos, icon: FolderKanban, tone: "cat-processos" },
    ];

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div>
                <h1 className="font-display text-2xl font-bold text-text-primary">Gestão de Demandas</h1>
                <p className="text-sm text-text-muted mt-1">
                    Controle unificado de carga, gargalos e priorização por área jurídica
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                        href="/admin/demandas"
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-border-hover hover:text-text-primary"
                    >
                        Configurações de Demandas
                    </Link>
                    <Link
                        href="/admin/equipe-juridica"
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-border-hover hover:text-text-primary"
                    >
                        Perfis da Equipe Jurídica
                    </Link>
                    <Link
                        href="/admin"
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-border-hover hover:text-text-primary"
                    >
                        Usuários e Permissões
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className={`glass-card kpi-card p-5 ${kpi.tone}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{kpi.label}</span>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg adv-icon-badge">
                                <kpi.icon size={15} strokeWidth={1.75} className="text-text-primary" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-text-primary font-mono">{kpi.value}</p>
                    </div>
                ))}
            </div>

            <section className="glass-card p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-info" />
                        <h2 className="text-sm font-semibold text-text-primary">Efetividade da IA ({iaIndicadores.periodoDias}d)</h2>
                    </div>
                    <span className="text-xs text-text-muted">
                        {iaIndicadores.ultimoPlanoEm
                            ? `Ultimo plano: ${new Date(iaIndicadores.ultimoPlanoEm).toLocaleString("pt-BR")}`
                            : "Sem planos no periodo"}
                    </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div className="rounded-md border border-border bg-bg-tertiary/20 px-3 py-2">
                        <p className="text-[10px] uppercase text-text-muted">Planos IA</p>
                        <p className="text-sm font-mono text-text-primary">{iaIndicadores.totalPlanos}</p>
                    </div>
                    <div className="rounded-md border border-border bg-bg-tertiary/20 px-3 py-2">
                        <p className="text-[10px] uppercase text-text-muted">Aplicacao</p>
                        <p className="text-sm font-mono text-success">{iaIndicadores.taxaAplicacao}%</p>
                    </div>
                    <div className="rounded-md border border-border bg-bg-tertiary/20 px-3 py-2">
                        <p className="text-[10px] uppercase text-text-muted">Pendentes</p>
                        <p className="text-sm font-mono text-warning">{iaIndicadores.pendentes}</p>
                    </div>
                    <div className="rounded-md border border-border bg-bg-tertiary/20 px-3 py-2">
                        <p className="text-[10px] uppercase text-text-muted">Descartes</p>
                        <p className="text-sm font-mono text-danger">{iaIndicadores.taxaDescarte}%</p>
                    </div>
                    <div className="rounded-md border border-border bg-bg-tertiary/20 px-3 py-2">
                        <p className="text-[10px] uppercase text-text-muted">Horas economizadas*</p>
                        <p className="text-sm font-mono text-info">{iaIndicadores.economiaHorasEstimada}h</p>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                    <Badge variant="muted">Analise: {iaIndicadores.planosAnalise}</Badge>
                    <Badge variant="muted">Redistribuicao: {iaIndicadores.planosRedistribuicao}</Badge>
                    <Badge variant="success">Aplicados: {iaIndicadores.aplicados}</Badge>
                    <Badge variant="warning">Pendentes: {iaIndicadores.pendentes}</Badge>
                    <Badge variant="danger">Descartados: {iaIndicadores.descartados}</Badge>
                    <span>*Estimativa operacional</span>
                </div>
            </section>

            <section className="glass-card p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <BarChart3 size={16} className="text-accent" />
                        <h2 className="text-sm font-semibold text-text-primary">Filtros operacionais</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 mr-2">
                            <span className="text-xs text-text-muted">Periodo:</span>
                            {[7, 30, 60, 90].map((dias) => (
                                <Link
                                    key={dias}
                                    href={buildUrl(params, { periodoDias: String(dias), page: "1" })}
                                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                        periodoDias === dias
                                            ? "border-accent bg-accent/15 text-accent"
                                            : "border-border text-text-muted hover:border-border-hover hover:text-text-primary"
                                    }`}
                                >
                                    {dias}d
                                </Link>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <Link
                                href={buildUrl(params, { area: "TODAS", page: "1" })}
                                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                    area === "TODAS"
                                        ? "border-accent bg-accent/15 text-accent"
                                        : "border-border text-text-muted hover:border-border-hover hover:text-text-primary"
                                }`}
                            >
                                Todas as areas
                            </Link>
                            {AREAS_ATUACAO.map((item) => (
                                <Link
                                    key={item}
                                    href={buildUrl(params, { area: item, page: "1" })}
                                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                        area === item
                                            ? "border-accent bg-accent/15 text-accent"
                                            : "border-border text-text-muted hover:border-border-hover hover:text-text-primary"
                                    }`}
                                >
                                    {getAreaAtuacaoLabel(item)}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-text-muted">Responsavel:</span>
                    <Link
                        href={buildUrl(params, { advogadoId: "", page: "1" })}
                        className={`rounded-full border px-2.5 py-1 text-xs ${
                            !advogadoIdParam
                                ? "border-accent bg-accent/15 text-accent"
                                : "border-border text-text-muted hover:text-text-primary"
                        }`}
                    >
                        Todos
                    </Link>
                    {advogados.map((adv) => (
                        <Link
                            key={adv.id}
                            href={buildUrl(params, { advogadoId: adv.id, page: "1" })}
                            className={`rounded-full border px-2.5 py-1 text-xs ${
                                advogadoIdParam === adv.id
                                    ? "border-accent bg-accent/15 text-accent"
                                    : "border-border text-text-muted hover:text-text-primary"
                            }`}
                        >
                            {adv.user.name || "Advogado"}
                        </Link>
                    ))}
                </div>
            </section>

            <section className="glass-card p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h2 className="text-sm font-semibold text-text-primary">Meu dia</h2>
                        <p className="text-xs text-text-muted">
                            Visao rapida para execucao diaria do responsavel logado.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <Link href="/tarefas" className="rounded-lg border border-border px-2.5 py-1 text-text-secondary hover:text-text-primary">
                            Abrir tarefas
                        </Link>
                        <Link href="/prazos" className="rounded-lg border border-border px-2.5 py-1 text-text-secondary hover:text-text-primary">
                            Abrir prazos
                        </Link>
                    </div>
                </div>

                {!advogadoSessaoId ? (
                    <div className="mt-3 rounded-lg border border-border bg-bg-tertiary/20 p-3 text-xs text-text-muted">
                        Seu usuário não está vinculado a um perfil de advogado. Vincule em Administração &gt; Equipe Jurídica.
                    </div>
                ) : (
                    <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
                        <div className="rounded-lg border border-border bg-bg-tertiary/20 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-text-primary">Tarefas para agir hoje</p>
                                <Badge variant={tarefasMeuDia.length > 0 ? "warning" : "success"}>
                                    {tarefasMeuDia.length}
                                </Badge>
                            </div>
                            {tarefasMeuDia.length === 0 ? (
                                <p className="text-xs text-text-muted">Nenhuma tarefa urgente para hoje.</p>
                            ) : (
                                <div className="space-y-2">
                                    {tarefasMeuDia.map((tarefa) => (
                                        <div key={tarefa.id} className="rounded-md border border-border bg-bg-primary/40 px-2.5 py-2">
                                            <p className="text-xs text-text-primary">{tarefa.titulo}</p>
                                            <p className="text-[11px] text-text-muted mt-0.5">
                                                {tarefa.dataLimite
                                                    ? `Limite: ${new Date(tarefa.dataLimite).toLocaleDateString("pt-BR")}`
                                                    : "Sem data limite"}
                                                {tarefa.processo?.numeroCnj ? ` - Proc. ${tarefa.processo.numeroCnj}` : ""}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg border border-border bg-bg-tertiary/20 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-text-primary">Prazos criticos (D+3)</p>
                                <Badge variant={prazosMeuDia.length > 0 ? "danger" : "success"}>
                                    {prazosMeuDia.length}
                                </Badge>
                            </div>
                            {prazosMeuDia.length === 0 ? (
                                <p className="text-xs text-text-muted">Nenhum prazo critico nos proximos 3 dias.</p>
                            ) : (
                                <div className="space-y-2">
                                    {prazosMeuDia.map((prazo) => (
                                        <div key={prazo.id} className="rounded-md border border-border bg-bg-primary/40 px-2.5 py-2">
                                            <p className="text-xs text-text-primary">{prazo.descricao}</p>
                                            <p className="text-[11px] text-text-muted mt-0.5">
                                                Fatal: {new Date(prazo.dataFatal).toLocaleDateString("pt-BR")}
                                                {prazo.processo?.numeroCnj ? ` - Proc. ${prazo.processo.numeroCnj}` : ""}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <section className="glass-card overflow-hidden xl:col-span-2">
                    <div className="px-4 py-3 border-b border-border bg-bg-tertiary/40">
                        <h2 className="text-sm font-semibold text-text-primary">Carga por responsavel</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px]">
                            <thead>
                                <tr className="border-b border-border bg-bg-tertiary/20">
                                    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Responsavel</th>
                                    <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Tarefas</th>
                                    <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Atrasadas</th>
                                    <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Prazos</th>
                                    <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Criticos</th>
                                    <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Atendimentos</th>
                                    <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overview.cargaPorResponsavel.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-10 text-center text-sm text-text-muted">
                                            Nenhum dado de carga encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    overview.cargaPorResponsavel.map((item) => (
                                        <tr key={item.advogadoId} className="border-b border-border last:border-0 hover:bg-bg-tertiary/20">
                                            <td className="px-3 py-2.5 text-sm text-text-primary">{item.nome}</td>
                                            <td className="px-3 py-2.5 text-center text-sm text-text-secondary">{item.tarefasPendentes}</td>
                                            <td className="px-3 py-2.5 text-center text-sm">
                                                <span className={item.tarefasAtrasadas > 0 ? "text-danger font-medium" : "text-text-secondary"}>
                                                    {item.tarefasAtrasadas}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-center text-sm text-text-secondary">{item.prazosPendentes}</td>
                                            <td className="px-3 py-2.5 text-center text-sm">
                                                <span className={item.prazosCriticos > 0 ? "text-warning font-medium" : "text-text-secondary"}>
                                                    {item.prazosCriticos}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-center text-sm text-text-secondary">{item.atendimentosAbertos}</td>
                                            <td className="px-3 py-2.5 text-center text-sm font-mono">
                                                <span className={item.scoreCarga >= 20 ? "text-danger" : item.scoreCarga >= 12 ? "text-warning" : "text-success"}>
                                                    {item.scoreCarga}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="glass-card p-4">
                    <h2 className="text-sm font-semibold text-text-primary mb-3">Gargalos</h2>
                    {overview.gargalos.length === 0 ? (
                        <p className="text-xs text-text-muted">Sem gargalos criticos no recorte atual.</p>
                    ) : (
                        <div className="space-y-2">
                            {overview.gargalos.map((gargalo, index) => (
                                <div key={`${gargalo.tipo}-${index}`} className="rounded-lg border border-border bg-bg-tertiary/20 p-3">
                                    <p className="text-xs font-semibold text-text-primary">{gargalo.titulo}</p>
                                    <p className="text-xs text-text-muted mt-1">{gargalo.detalhe}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <section className="glass-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-bg-tertiary/40">
                    <h2 className="text-sm font-semibold text-text-primary">Resumo por area de atuacao</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                        <thead>
                            <tr className="border-b border-border bg-bg-tertiary/20">
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Area</th>
                                <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Processos</th>
                                <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Tarefas</th>
                                <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Prazos</th>
                                <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Atendimentos</th>
                                <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Atrasos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {overview.resumoPorArea.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-3 py-10 text-center text-sm text-text-muted">
                                        Nenhuma demanda encontrada para os filtros selecionados.
                                    </td>
                                </tr>
                            ) : (
                                overview.resumoPorArea.map((item) => (
                                    <tr key={item.area} className="border-b border-border last:border-0 hover:bg-bg-tertiary/20">
                                        <td className="px-3 py-2.5 text-sm text-text-primary">{item.label}</td>
                                        <td className="px-3 py-2.5 text-center text-sm text-text-secondary">{item.processosAtivos}</td>
                                        <td className="px-3 py-2.5 text-center text-sm text-text-secondary">{item.tarefasPendentes}</td>
                                        <td className="px-3 py-2.5 text-center text-sm text-text-secondary">{item.prazosPendentes}</td>
                                        <td className="px-3 py-2.5 text-center text-sm text-text-secondary">{item.atendimentosAbertos}</td>
                                        <td className="px-3 py-2.5 text-center text-sm">
                                            <span className={item.atrasos > 0 ? "text-danger font-medium" : "text-success"}>
                                                {item.atrasos}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <DemandasAiPanel
                area={area}
                advogadoId={advogadoIdParam || ""}
                periodoDias={periodoDias}
                sugestoesOperacionais={overview.sugestoesOperacionais}
            />

            <DemandasPlanejamentoPanel
                area={area}
                advogadoId={advogadoIdParam || ""}
                periodoDias={periodoDias}
            />

            <DemandasRedistribuicaoPanel
                area={area}
                advogadoId={advogadoIdParam || ""}
                periodoDias={periodoDias}
                canApplyLote={canApplyLote}
            />

            <DemandasPlanosPanel
                planos={planosIa}
                canManage={canApplyLote}
                userId={session?.id || ""}
            />

            <DemandasRotinasPanel
                rotinas={rotinas}
                templates={templates}
                advogados={advogados.map((item) => ({
                    id: item.id,
                    nome: item.user.name || "Advogado",
                    role: item.user.role,
                }))}
                areaOptions={[
                    { value: "TODAS", label: "Todas as areas" },
                    ...AREAS_ATUACAO.map((item) => ({
                        value: item,
                        label: getAreaAtuacaoLabel(item),
                    })),
                ]}
            />

            <section className="glass-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-bg-tertiary/40">
                    <h2 className="text-sm font-semibold text-text-primary">
                        Historico de analises e redistribuicoes
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                        <thead>
                            <tr className="border-b border-border bg-bg-tertiary/20">
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Data</th>
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Acao</th>
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Usuario</th>
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Resumo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditoriaRecente.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-3 py-10 text-center text-sm text-text-muted">
                                        Nenhum registro de demandas encontrado.
                                    </td>
                                </tr>
                            ) : (
                                auditoriaRecente.map((item) => {
                                    const dadosDepois =
                                        item.dadosDepois && typeof item.dadosDepois === "object" && !Array.isArray(item.dadosDepois)
                                            ? (item.dadosDepois as Record<string, unknown>)
                                            : null;
                                    let resumo = "Atualizacao operacional.";
                                    if (item.acao === "DEMANDAS_REDISTRIBUICAO_APLICADA") {
                                        resumo = `${Number(dadosDepois?.aplicadas || 0)} aplicada(s), ${Number(
                                            dadosDepois?.ignoradas || 0
                                        )} ignorada(s)`;
                                    } else if (item.acao === "DEMANDAS_IA_ANALISE") {
                                        resumo = `IA ativa: ${Boolean(dadosDepois?.iaAtiva) ? "sim" : "nao"} - gargalos: ${Number(
                                            dadosDepois?.gargalos || 0
                                        )}`;
                                    } else if (item.acao === "DEMANDAS_IA_PLANEJAMENTO_DIARIO") {
                                        resumo = `Planejamento diario gerado (${Boolean(dadosDepois?.iaAtiva) ? "IA" : "fallback local"}).`;
                                    } else if (item.acao === "DEMANDAS_IA_PLANEJAMENTO_SIMULADO") {
                                        resumo = `Simulacao do plano: ${Number(dadosDepois?.criadas || 0)} criacao(oes) previstas e ${Number(
                                            dadosDepois?.atualizadas || 0
                                        )} atualizacao(oes) previstas.`;
                                    } else if (item.acao === "DEMANDAS_IA_PLANEJAMENTO_APLICADO") {
                                        resumo = `Plano aplicado: ${Number(dadosDepois?.criadas || 0)} criado(s), ${Number(
                                            dadosDepois?.atualizadas || 0
                                        )} atualizado(s).`;
                                    } else if (item.acao === "DEMANDAS_IA_OTIMIZACAO_ROTINA") {
                                        resumo = `Template de rotina otimizado (${Boolean(dadosDepois?.iaAtiva) ? "IA" : "fallback local"}).`;
                                    } else if (item.acao === "DEMANDAS_PLANEJAMENTO_AGENDADO_CONFIG_ATUALIZADA") {
                                        resumo = `Configuracao de agendamento ${Boolean(dadosDepois?.enabled) ? "ativada" : "desativada"}.`;
                                    } else if (item.acao === "DEMANDAS_PLANEJAMENTO_AGENDADO_ESCOPO_CRIADO") {
                                        resumo = "Novo escopo de planejamento agendado criado.";
                                    } else if (item.acao === "DEMANDAS_PLANEJAMENTO_AGENDADO_ESCOPO_ATUALIZADO") {
                                        resumo = "Escopo de planejamento agendado atualizado.";
                                    } else if (item.acao === "DEMANDAS_PLANEJAMENTO_AGENDADO_ESCOPO_EXCLUIDO") {
                                        resumo = "Escopo de planejamento agendado excluido.";
                                    } else if (item.acao === "DEMANDAS_PLANEJAMENTO_AGENDADO_EXECUTADO") {
                                        resumo = `Agendamento executado em lote: ${Number(dadosDepois?.executados || 0)} escopo(s).`;
                                    } else if (item.acao === "DEMANDAS_PLANEJAMENTO_AGENDADO_SIMULADO") {
                                        resumo = `Simulacao de agendamento executada: ${Number(dadosDepois?.executados || 0)} escopo(s).`;
                                    } else if (item.acao === "DEMANDAS_IA_PLANO_STATUS") {
                                        resumo = `Plano IA alterado para ${String(dadosDepois?.statusNovo || "PENDENTE")}.`;
                                    } else if (item.acao === "DEMANDAS_ROTINAS_PROCESSADAS") {
                                        resumo = `Rotinas geradas: ${Number(dadosDepois?.geradas || 0)} - ignoradas: ${Number(
                                            dadosDepois?.ignoradas || 0
                                        )}.`;
                                    } else if (item.acao === "DEMANDAS_ROTINA_CRIADA") {
                                        resumo = "Rotina recorrente criada.";
                                    } else if (item.acao === "DEMANDAS_ROTINA_ATUALIZADA") {
                                        resumo = "Rotina recorrente atualizada.";
                                    } else if (item.acao === "DEMANDAS_ROTINA_EXCLUIDA") {
                                        resumo = "Rotina recorrente excluida.";
                                    } else if (item.acao === "DEMANDAS_ROTINA_ATIVO") {
                                        resumo = `Rotina ${Boolean(dadosDepois?.ativoNovo) ? "ativada" : "pausada"}.`;
                                    } else if (item.acao === "DEMANDAS_ROTINAS_LOTE") {
                                        resumo = `Acao em lote executada. Rotinas afetadas: ${Number(dadosDepois?.afetadas || 0)}.`;
                                    } else if (item.acao === "DEMANDAS_TEMPLATE_ROTINA_CRIADO") {
                                        resumo = "Template de rotina criado.";
                                    } else if (item.acao === "DEMANDAS_TEMPLATE_ROTINA_ATUALIZADO") {
                                        resumo = "Template de rotina atualizado.";
                                    } else if (item.acao === "DEMANDAS_TEMPLATE_ROTINA_EXCLUIDO") {
                                        resumo = "Template de rotina excluido.";
                                    } else if (item.acao === "DEMANDAS_REGRA_ROTINA_CRIADA") {
                                        resumo = "Regra automatica de geracao criada.";
                                    } else if (item.acao === "DEMANDAS_REGRA_ROTINA_ATUALIZADA") {
                                        resumo = "Regra automatica de geracao atualizada.";
                                    } else if (item.acao === "DEMANDAS_REGRA_ROTINA_EXCLUIDA") {
                                        resumo = "Regra automatica de geracao excluida.";
                                    } else if (item.acao === "DEMANDAS_REGRAS_GERACAO_EXECUTADAS") {
                                        resumo = `Execucao de regras: ${Number(dadosDepois?.criadas || 0)} criadas, ${Number(
                                            dadosDepois?.atualizadas || 0
                                        )} atualizadas.`;
                                    } else if (item.acao === "DEMANDAS_REGRAS_GERACAO_SIMULADAS") {
                                        resumo = `Simulacao de regras: ${Number(dadosDepois?.criadas || 0)} criadas previstas, ${Number(
                                            dadosDepois?.atualizadas || 0
                                        )} atualizacoes previstas.`;
                                    } else if (item.acao === "DEMANDAS_REGRAS_LOTE") {
                                        resumo = `Lote de regras executado. Regras afetadas: ${Number(
                                            dadosDepois?.afetadas || 0
                                        )}.`;
                                    }

                                    return (
                                        <tr key={item.id} className="border-b border-border last:border-0 hover:bg-bg-tertiary/20">
                                            <td className="px-3 py-2.5 text-xs text-text-muted">
                                                {new Date(item.createdAt).toLocaleString("pt-BR")}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-text-secondary">{item.acao}</td>
                                            <td className="px-3 py-2.5 text-xs text-text-secondary">
                                                {item.user.name || item.user.email}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-text-muted">{resumo}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="text-xs text-text-muted">
                Este painel e de apoio operacional. Validacoes juridicas finais permanecem sob responsabilidade humana.
            </div>
        </div>
    );
}

