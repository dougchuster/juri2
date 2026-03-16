"use client";

import Link from "next/link";
import { Dispatch, SetStateAction } from "react";
import { AlertTriangle, CheckCircle2, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    AdvogadoCargaItem,
    AtribuicaoRecenteItem,
    AuditoriaPeriodo,
    HistoricoModoFiltro,
    HistoricoPeriodoFiltro,
    HistoricoTipoFiltro,
    OperacoesAuditoriaAnalytics,
    formatModoDistribuicao,
    playbookFases,
    referenciaModulos,
    recursosJuridicos,
} from "@/components/admin/admin-operacoes-juridicas-shared";

interface OperacoesSidebarProps {
    advogados: AdvogadoCargaItem[];
    historicoFiltrado: AtribuicaoRecenteItem[];
    atribuicoesRecentes: AtribuicaoRecenteItem[];
    historicoPaginado: AtribuicaoRecenteItem[];
    histTipoFiltro: HistoricoTipoFiltro;
    setHistTipoFiltro: Dispatch<SetStateAction<HistoricoTipoFiltro>>;
    histModoFiltro: HistoricoModoFiltro;
    setHistModoFiltro: Dispatch<SetStateAction<HistoricoModoFiltro>>;
    histPeriodoFiltro: HistoricoPeriodoFiltro;
    setHistPeriodoFiltro: Dispatch<SetStateAction<HistoricoPeriodoFiltro>>;
    histBusca: string;
    setHistBusca: Dispatch<SetStateAction<string>>;
    histPagina: number;
    setHistPagina: Dispatch<SetStateAction<number>>;
    historicoTotalPaginas: number;
    onResetFiltros: () => void;
    onCopiarLink: () => void;
    onExportCsv: () => void;
    onExportXlsx: () => void;
    onExportResumoCsv: () => void;
}

export function OperacoesSidebar({
    advogados,
    historicoFiltrado,
    atribuicoesRecentes,
    historicoPaginado,
    histTipoFiltro,
    setHistTipoFiltro,
    histModoFiltro,
    setHistModoFiltro,
    histPeriodoFiltro,
    setHistPeriodoFiltro,
    histBusca,
    setHistBusca,
    histPagina,
    setHistPagina,
    historicoTotalPaginas,
    onResetFiltros,
    onCopiarLink,
    onExportCsv,
    onExportXlsx,
    onExportResumoCsv,
}: OperacoesSidebarProps) {
    return (
        <div className="space-y-4">
            <div className="glass-card p-4">
                <h3 className="mb-3 text-sm font-semibold text-text-primary">Carga por advogado</h3>
                <div className="space-y-2.5">
                    {advogados.map((advogado) => (
                        <div key={advogado.id} className="rounded-lg border border-border bg-bg-tertiary/30 p-2.5">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <p className="text-xs font-medium text-text-primary">{advogado.nome}</p>
                                    <p className="text-[11px] font-mono text-text-muted">
                                        {advogado.oab}/{advogado.seccional}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {advogado.prazosVencidos > 0 && (
                                        <Badge variant="danger" dot>{advogado.prazosVencidos} venc.</Badge>
                                    )}
                                    {advogado.tarefasAbertas > 0 && (
                                        <Badge variant="warning" dot>{advogado.tarefasAbertas} tarefas</Badge>
                                    )}
                                </div>
                            </div>
                            <p className="mt-1 text-[11px] text-text-muted">
                                {advogado.processosAtivos} processos ativos
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="glass-card p-4">
                <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-warning" />
                    <h3 className="text-sm font-semibold text-text-primary">Recursos juridicos prioritarios</h3>
                </div>
                <div className="space-y-2">
                    {recursosJuridicos.map((item) => (
                        <div key={item} className="flex items-start gap-2 rounded-lg bg-bg-tertiary/30 px-2.5 py-2">
                            <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-accent" />
                            <span className="text-xs text-text-secondary">{item}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="glass-card p-4">
                <h3 className="mb-2 text-sm font-semibold text-text-primary">Playbook juridico em fases</h3>
                <div className="space-y-2">
                    {playbookFases.map((fase) => (
                        <div key={fase} className="flex items-start gap-2 rounded-lg bg-bg-tertiary/30 px-2.5 py-2">
                            <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-success" />
                            <span className="text-xs text-text-secondary">{fase}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="glass-card p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">Historico de redistribuicoes</h3>
                    <Badge variant="muted">
                        {historicoFiltrado.length}/{atribuicoesRecentes.length}
                    </Badge>
                </div>
                <div className="mb-3 grid grid-cols-1 gap-2">
                    <div className="grid grid-cols-3 gap-2">
                        <select
                            value={histTipoFiltro}
                            onChange={(e) => setHistTipoFiltro(e.target.value as HistoricoTipoFiltro)}
                            className="h-8 rounded-lg border border-border bg-bg-tertiary px-2 text-[11px] text-text-primary outline-none"
                        >
                            <option value="TODOS">Tipo: todos</option>
                            <option value="AUTO">Tipo: automatico</option>
                            <option value="MANUAL">Tipo: manual</option>
                        </select>
                        <select
                            value={histModoFiltro}
                            onChange={(e) => setHistModoFiltro(e.target.value as HistoricoModoFiltro)}
                            className="h-8 rounded-lg border border-border bg-bg-tertiary px-2 text-[11px] text-text-primary outline-none"
                        >
                            <option value="TODOS">Modo: todos</option>
                            <option value="GLOBAL">Modo: global</option>
                            <option value="EQUIPE">Modo: equipe</option>
                            <option value="EQUIPE_FALLBACK_GLOBAL">Modo: equipe fallback global</option>
                            <option value="MANUAL">Modo: manual</option>
                        </select>
                        <select
                            value={histPeriodoFiltro}
                            onChange={(e) => setHistPeriodoFiltro(e.target.value as HistoricoPeriodoFiltro)}
                            className="h-8 rounded-lg border border-border bg-bg-tertiary px-2 text-[11px] text-text-primary outline-none"
                        >
                            <option value="TODOS">Periodo: todos</option>
                            <option value="24H">Periodo: ultimas 24h</option>
                            <option value="7D">Periodo: ultimos 7 dias</option>
                            <option value="30D">Periodo: ultimos 30 dias</option>
                        </select>
                    </div>
                    <input
                        value={histBusca}
                        onChange={(e) => setHistBusca(e.target.value)}
                        placeholder="Buscar por CNJ, advogado ou motivo"
                        className="h-8 rounded-lg border border-border bg-bg-tertiary px-2 text-[11px] text-text-primary outline-none placeholder:text-text-muted"
                    />
                    <div className="flex items-center justify-end gap-2">
                        <Button size="xs" variant="outline" onClick={onResetFiltros}>
                            Limpar filtros
                        </Button>
                        <Button size="xs" variant="outline" onClick={onCopiarLink}>
                            Copiar link
                        </Button>
                        <Button size="xs" variant="outline" onClick={onExportCsv}>
                            Exportar CSV
                        </Button>
                        <Button size="xs" variant="outline" onClick={onExportXlsx}>
                            Exportar XLSX
                        </Button>
                        <Button size="xs" variant="outline" onClick={onExportResumoCsv}>
                            Resumo CSV
                        </Button>
                    </div>
                </div>
                <div className="max-h-[220px] space-y-2 overflow-auto">
                    {historicoFiltrado.length === 0 ? (
                        <p className="text-xs text-text-muted">Nenhum registro com o filtro aplicado.</p>
                    ) : (
                        historicoPaginado.map((item) => (
                            <div key={item.id} className="rounded-lg border border-border bg-bg-tertiary/30 px-2.5 py-2">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-mono text-text-secondary">
                                        {item.processo.numeroCnj || item.processoId}
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <Badge variant={item.automatico ? "info" : "default"}>
                                            {item.automatico ? "AUTO" : "MANUAL"}
                                        </Badge>
                                        <Badge variant="muted">{formatModoDistribuicao(item.modoDistribuicao)}</Badge>
                                    </div>
                                </div>
                                <p className="text-[11px] text-text-primary">
                                    {(item.fromAdvogado?.user.name || "Sem responsavel")} {"->"} {item.toAdvogado.user.name}
                                </p>
                                {item.motivo && <p className="text-[10px] text-text-secondary">{item.motivo}</p>}
                                <p className="text-[10px] text-text-muted">
                                    {new Date(item.createdAt).toLocaleString("pt-BR")}
                                </p>
                            </div>
                        ))
                    )}
                </div>
                {historicoFiltrado.length > 0 && (
                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
                        <p className="text-[11px] text-text-muted">
                            Pagina {histPagina} de {historicoTotalPaginas}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                size="xs"
                                variant="outline"
                                onClick={() => setHistPagina((prev) => Math.max(1, prev - 1))}
                                disabled={histPagina === 1}
                            >
                                Anterior
                            </Button>
                            <Button
                                size="xs"
                                variant="outline"
                                onClick={() => setHistPagina((prev) => Math.min(historicoTotalPaginas, prev + 1))}
                                disabled={histPagina >= historicoTotalPaginas}
                            >
                                Proxima
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface OperacoesAuditoriaPanelProps {
    advogados: AdvogadoCargaItem[];
    auditoriaPeriodo: AuditoriaPeriodo;
    setAuditoriaPeriodo: Dispatch<SetStateAction<AuditoriaPeriodo>>;
    auditoriaAdvogadoId: string;
    setAuditoriaAdvogadoId: Dispatch<SetStateAction<string>>;
    auditoriaAutoRefresh: boolean;
    setAuditoriaAutoRefresh: Dispatch<SetStateAction<boolean>>;
    auditoriaFiltrada: AtribuicaoRecenteItem[];
    auditoriaAnalitica: OperacoesAuditoriaAnalytics;
    onAtualizar: () => void;
}

export function OperacoesAuditoriaPanel({
    advogados,
    auditoriaPeriodo,
    setAuditoriaPeriodo,
    auditoriaAdvogadoId,
    setAuditoriaAdvogadoId,
    auditoriaAutoRefresh,
    setAuditoriaAutoRefresh,
    auditoriaFiltrada,
    auditoriaAnalitica,
    onAtualizar,
}: OperacoesAuditoriaPanelProps) {
    return (
        <div className="glass-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                    <h3 className="text-sm font-semibold text-text-primary">Auditoria de redistribuicao</h3>
                    <p className="text-[11px] text-text-muted">
                        Visao por periodo e advogado com top origem/destino e tendencia diaria.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="xs" variant="outline" onClick={onAtualizar}>
                        Atualizar agora
                    </Button>
                    <label className="flex items-center gap-1.5 text-[11px] text-text-muted">
                        <input
                            type="checkbox"
                            checked={auditoriaAutoRefresh}
                            onChange={(e) => setAuditoriaAutoRefresh(e.target.checked)}
                            className="h-3.5 w-3.5"
                        />
                        Auto 30s
                    </label>
                </div>
            </div>

            <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                <select
                    value={auditoriaPeriodo}
                    onChange={(e) => setAuditoriaPeriodo(e.target.value as AuditoriaPeriodo)}
                    className="h-8 rounded-lg border border-border bg-bg-tertiary px-2 text-xs text-text-primary outline-none"
                >
                    <option value="7D">Periodo: 7 dias</option>
                    <option value="30D">Periodo: 30 dias</option>
                    <option value="90D">Periodo: 90 dias</option>
                </select>
                <select
                    value={auditoriaAdvogadoId}
                    onChange={(e) => setAuditoriaAdvogadoId(e.target.value)}
                    className="h-8 rounded-lg border border-border bg-bg-tertiary px-2 text-xs text-text-primary outline-none"
                >
                    <option value="TODOS">Advogado: todos</option>
                    {advogados.map((advogado) => (
                        <option key={advogado.id} value={advogado.id}>
                            {advogado.nome}
                        </option>
                    ))}
                </select>
                <div className="flex items-center justify-end">
                    <Badge variant="muted">{auditoriaFiltrada.length} registro(s) no filtro</Badge>
                </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
                <div className="rounded-lg border border-border bg-bg-tertiary/30 px-3 py-2">
                    <p className="text-[10px] uppercase text-text-muted">Total</p>
                    <p className="text-base font-semibold text-text-primary">{auditoriaAnalitica.total}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-tertiary/30 px-3 py-2">
                    <p className="text-[10px] uppercase text-text-muted">Automaticas</p>
                    <p className="text-base font-semibold text-info">{auditoriaAnalitica.automaticas}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-tertiary/30 px-3 py-2">
                    <p className="text-[10px] uppercase text-text-muted">Manuais</p>
                    <p className="text-base font-semibold text-text-primary">{auditoriaAnalitica.manuais}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-tertiary/30 px-3 py-2">
                    <p className="text-[10px] uppercase text-text-muted">Fallback global</p>
                    <p className="text-base font-semibold text-warning">{auditoriaAnalitica.fallbackGlobal}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-tertiary/30 px-3 py-2">
                    <p className="text-[10px] uppercase text-text-muted">Mesma equipe</p>
                    <p className="text-base font-semibold text-success">{auditoriaAnalitica.mesmaEquipe}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="rounded-lg border border-border bg-bg-tertiary/20 p-3">
                    <p className="mb-2 text-xs font-semibold text-text-primary">Top destinos</p>
                    <div className="space-y-1.5">
                        {auditoriaAnalitica.topDestinos.length === 0 ? (
                            <p className="text-[11px] text-text-muted">Sem dados no periodo.</p>
                        ) : (
                            auditoriaAnalitica.topDestinos.map(([nome, count]) => (
                                <div key={`destino-${nome}`} className="flex items-center justify-between text-[11px]">
                                    <span className="text-text-secondary">{nome}</span>
                                    <Badge variant="muted">{count}</Badge>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="rounded-lg border border-border bg-bg-tertiary/20 p-3">
                    <p className="mb-2 text-xs font-semibold text-text-primary">Top origens</p>
                    <div className="space-y-1.5">
                        {auditoriaAnalitica.topOrigens.length === 0 ? (
                            <p className="text-[11px] text-text-muted">Sem dados no periodo.</p>
                        ) : (
                            auditoriaAnalitica.topOrigens.map(([nome, count]) => (
                                <div key={`origem-${nome}`} className="flex items-center justify-between text-[11px]">
                                    <span className="text-text-secondary">{nome}</span>
                                    <Badge variant="muted">{count}</Badge>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="rounded-lg border border-border bg-bg-tertiary/20 p-3">
                    <p className="mb-2 text-xs font-semibold text-text-primary">Serie diaria</p>
                    <div className="space-y-1.5">
                        {auditoriaAnalitica.serieDiaria.map((item) => (
                            <div key={`serie-${item.label}`} className="grid grid-cols-[40px_1fr_28px] items-center gap-2 text-[10px]">
                                <span className="text-text-muted">{item.label}</span>
                                <div className="h-2 overflow-hidden rounded bg-bg-tertiary/60">
                                    <div
                                        className="h-2 rounded bg-accent"
                                        style={{
                                            width: `${Math.max(6, Math.round((item.count / auditoriaAnalitica.serieMax) * 100))}%`,
                                        }}
                                    />
                                </div>
                                <span className="text-right text-text-secondary">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function OperacoesBenchmarkPanel() {
    return (
        <div className="glass-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-text-primary">Benchmark de modulos (referencia para nosso sistema)</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {referenciaModulos.map((item) => (
                    <div key={item.modulo} className="rounded-xl border border-border bg-bg-tertiary/30 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-semibold text-text-primary">{item.modulo}</p>
                            <Badge variant="success">Disponivel</Badge>
                        </div>
                        <p className="text-xs text-text-muted">Referencia: {item.referencia}</p>
                        <p className="mt-1 text-xs text-text-secondary">Nosso: {item.nosso}</p>
                        <Link href={item.href} className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline">
                            Abrir modulo <PlusCircle size={11} />
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
