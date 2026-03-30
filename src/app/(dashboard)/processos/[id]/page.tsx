import { notFound } from "next/navigation";
import Link from "next/link";
import { getProcessoById, getAdvogados, getTiposAcao, getFasesProcessuais, getClientesForSelect, getDocumentosParaMovimentacao } from "@/lib/dal/processos";
import { getTimelineProcesso, getTimelineStats } from "@/lib/dal/timeline";
import { getSession } from "@/actions/auth";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ProcessoDetailTabs } from "@/components/processos/processo-detail-tabs";
import { ProcessoDetailHeader } from "@/components/processos/processo-detail-header";
import { ProcessoEditModal } from "@/components/processos/processo-edit-modal";
import { hydrateMovimentacaoTranslations } from "@/lib/services/andamento-tradutor";
import {
    Scale, Clock, FileText, Gavel,
    Users, MapPin, DollarSign, AlertTriangle,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
    PROSPECCAO: "Prospecção", CONSULTORIA: "Consultoria", AJUIZADO: "Ajuizado",
    EM_ANDAMENTO: "Em Andamento", AUDIENCIA_MARCADA: "Audiência Marcada",
    SENTENCA: "Sentença", RECURSO: "Recurso", TRANSITO_JULGADO: "Trânsito em Julgado",
    EXECUCAO: "Execução", ENCERRADO: "Encerrado", ARQUIVADO: "Arquivado",
};

const STATUS_COLORS: Record<string, string> = {
    PROSPECCAO: "info", CONSULTORIA: "info", AJUIZADO: "default",
    EM_ANDAMENTO: "success", AUDIENCIA_MARCADA: "warning", SENTENCA: "warning",
    RECURSO: "danger", TRANSITO_JULGADO: "success", EXECUCAO: "default",
    ENCERRADO: "muted", ARQUIVADO: "muted",
};

const RESULTADO_COLORS: Record<string, string> = {
    PENDENTE: "muted", GANHO: "success", PERDIDO: "danger", ACORDO: "info", DESISTENCIA: "warning",
};

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<Record<string, string | string[]>>;
}

export default async function ProcessoDetailPage({ params, searchParams }: Props) {
    const { id } = await params;
    const query = await searchParams;
    const session = await getSession();
    const visibilityScope = session
        ? { role: session.role, advogadoId: session.advogado?.id || null }
        : undefined;
    const [processo, advogados, tiposAcao, fases, clientes, documentosParaMovimentacao] = await Promise.all([
        getProcessoById(id, visibilityScope),
        getAdvogados(),
        getTiposAcao(),
        getFasesProcessuais(),
        getClientesForSelect(),
        getDocumentosParaMovimentacao(id),
    ]);
    if (!processo) notFound();

    const [timelineResult, timelineStats] = await Promise.all([
        getTimelineProcesso(id, { porPagina: 999 }),
        getTimelineStats(id),
    ]);
    const timelineEventosTraduzidos = await hydrateMovimentacaoTranslations(timelineResult.eventos, {
        aiLimit: 12,
        persistLimit: 12,
    });

    const tabParam = typeof query.tab === "string" ? query.tab : "";
    const initialTab =
        tabParam === "prazos" ||
        tabParam === "audiencias" ||
        tabParam === "documentos" ||
        tabParam === "honorarios" ||
        tabParam === "partes" ||
        tabParam === "movimentacoes"
            ? tabParam
            : "movimentacoes";
    const novoEventoParam = typeof query.novoEvento === "string" ? query.novoEvento : "";
    const initialTimelineEventType =
        novoEventoParam === "REUNIAO" ||
        novoEventoParam === "CONTATO_TELEFONICO" ||
        novoEventoParam === "EMAIL" ||
        novoEventoParam === "ANOTACAO" ||
        novoEventoParam === "JUDICIAL" ||
        novoEventoParam === "MANUAL"
            ? novoEventoParam
            : "ANOTACAO";
    const autoOpenTimelineComposer = Boolean(novoEventoParam);
    const autoOpenAudiencia = typeof query.novaAudiencia === "string" && query.novaAudiencia === "1";
    const autoOpenPrazo = typeof query.novoPrazo === "string" && query.novoPrazo === "1";

    const prazosPendentes = processo.prazos.filter((p) => p.status === "PENDENTE").length;
    const proximaAudiencia = processo.audiencias.find((a) => !a.realizada);
    const tarefasPendentes = processo.tarefas.filter((t) => !["CONCLUIDA", "CANCELADA"].includes(t.status)).length;
    const audienciasPendentes = processo.audiencias.filter((a) => !a.realizada).length;
    const movimentacoesRecentes = processo.movimentacoes.slice(0, 5);
    const valorHonorariosTotal = processo.honorarios.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);

    // Serialize data for client components
    const serializedProcesso = JSON.parse(JSON.stringify(processo));
    const serializedAdvogados = JSON.parse(JSON.stringify(advogados));
    const serializedTiposAcao = JSON.parse(JSON.stringify(tiposAcao));
    const serializedFases = JSON.parse(JSON.stringify(fases));
    const serializedClientes = JSON.parse(JSON.stringify(clientes));
    const serializedDocumentosParaMovimentacao = JSON.parse(JSON.stringify(documentosParaMovimentacao));
    const serializedTimelineEventos = JSON.parse(JSON.stringify(timelineEventosTraduzidos));
    const serializedTimelineStats = JSON.parse(JSON.stringify(timelineStats));

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Header with Edit */}
            <ProcessoDetailHeader
                processo={serializedProcesso}
                tiposAcao={serializedTiposAcao}
                fases={serializedFases}
                advogados={serializedAdvogados}
                clientes={serializedClientes}
                statusLabel={STATUS_LABELS[processo.status] || processo.status}
                statusColor={(STATUS_COLORS[processo.status] || "muted") as "success" | "warning" | "danger" | "info" | "default" | "muted"}
                resultadoColor={(RESULTADO_COLORS[processo.resultado] || "muted") as "success" | "danger" | "info" | "warning" | "muted"}
            />

            {/* Info Cards */}
            <div className="grid grid-cols-3 gap-4">
                {/* Partes */}
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Partes</h3>
                        <ProcessoEditModal
                            processo={serializedProcesso}
                            tiposAcao={serializedTiposAcao}
                            fases={serializedFases}
                            advogados={serializedAdvogados}
                            clientes={serializedClientes}
                            buttonLabel="Editar vinculo"
                            buttonVariant="outline"
                            buttonSize="xs"
                            modalTitle="Editar processo"
                        />
                    </div>
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <Users size={14} className="text-text-muted shrink-0" />
                            <span>
                                Cliente:{" "}
                                {processo.cliente ? (
                                    <Link href={`/clientes/${processo.clienteId}`} className="text-accent hover:underline">
                                        {processo.cliente.nome}
                                    </Link>
                                ) : (
                                    <span className="text-text-muted">Sem cliente vinculado</span>
                                )}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <Scale size={14} className="text-text-muted shrink-0" />
                            <span>Advogado: {processo.advogado.user.name}</span>
                        </div>
                        {processo.faseProcessual && (
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: processo.faseProcessual.cor || "#6B7280" }} />
                                <span>Fase: {processo.faseProcessual.nome}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Jurisdição */}
                <div className="glass-card p-5">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Jurisdição</h3>
                    <div className="space-y-2.5">
                        {processo.tribunal && (
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <Gavel size={14} className="text-text-muted shrink-0" />
                                <span>{processo.tribunal}{processo.vara ? ` • ${processo.vara}` : ""}</span>
                            </div>
                        )}
                        {processo.comarca && (
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <MapPin size={14} className="text-text-muted shrink-0" />
                                <span>{processo.comarca}{processo.foro ? ` — ${processo.foro}` : ""}</span>
                            </div>
                        )}
                        {processo.dataDistribuicao && (
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <Clock size={14} className="text-text-muted shrink-0" />
                                <span>Distribuição: {formatDate(processo.dataDistribuicao)}</span>
                            </div>
                        )}
                        {!processo.tribunal && !processo.comarca && !processo.dataDistribuicao && (
                            <p className="text-xs text-text-muted">Sem informações de jurisdição</p>
                        )}
                    </div>
                </div>

                {/* Valores */}
                <div className="glass-card p-5">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Valores</h3>
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <DollarSign size={14} className="text-text-muted shrink-0" />
                            <span>Causa: {processo.valorCausa ? formatCurrency(Number(processo.valorCausa)) : "—"}</span>
                        </div>
                        {processo.valorContingencia && (
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <AlertTriangle size={14} className="text-warning shrink-0" />
                                <span>Contingência: {formatCurrency(Number(processo.valorContingencia))}
                                    {processo.riscoContingencia && ` (${processo.riscoContingencia})`}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="glass-card p-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10"><FileText size={18} className="text-accent" /></div>
                    <div><p className="text-xl font-bold text-text-primary">{processo.movimentacoes.length}</p><p className="text-xs text-text-muted">Movimentações</p></div>
                </div>
                <div className="glass-card p-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10"><Clock size={18} className="text-warning" /></div>
                    <div><p className="text-xl font-bold text-text-primary">{prazosPendentes}</p><p className="text-xs text-text-muted">Prazos Pendentes</p></div>
                </div>
                <div className="glass-card p-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10"><Gavel size={18} className="text-info" /></div>
                    <div><p className="text-xl font-bold text-text-primary">{processo.audiencias.length}</p><p className="text-xs text-text-muted">Audiências</p></div>
                </div>
                <div className="glass-card p-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10"><DollarSign size={18} className="text-success" /></div>
                    <div><p className="text-xl font-bold text-text-primary">{processo.honorarios.length}</p><p className="text-xs text-text-muted">Honorários</p></div>
                </div>
            </div>

            {/* Operational View */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="glass-card p-5">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Proximas atividades</h3>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-text-secondary">
                            <span>Prazos pendentes</span>
                            <span className="font-mono text-warning">{prazosPendentes}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-text-secondary">
                            <span>Tarefas em aberto</span>
                            <span className="font-mono text-info">{tarefasPendentes}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-text-secondary">
                            <span>Audiencias agendadas</span>
                            <span className="font-mono text-text-primary">{audienciasPendentes}</span>
                        </div>
                        <div className="mt-3 rounded-lg border border-border bg-bg-tertiary/30 px-3 py-2 text-xs text-text-muted">
                            {proximaAudiencia
                                ? `Proxima audiencia em ${formatDate(proximaAudiencia.data)}`
                                : "Sem audiencia futura cadastrada."}
                        </div>
                    </div>
                </div>

                <div className="glass-card p-5">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Resumo financeiro</h3>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-text-secondary">
                            <span>Honorarios cadastrados</span>
                            <span className="font-mono text-text-primary">{processo.honorarios.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-text-secondary">
                            <span>Valor total previsto</span>
                            <span className="font-mono text-success">{formatCurrency(valorHonorariosTotal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-text-secondary">
                            <span>Documentos vinculados</span>
                            <span className="font-mono text-text-primary">{processo.documentos.length}</span>
                        </div>
                        <p className="mt-3 text-xs text-text-muted">
                            Use as abas de Honorarios e Documentos para detalhar faturamento, contratos e comprovantes.
                        </p>
                    </div>
                </div>

                <div className="glass-card p-5">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Ultimas movimentacoes</h3>
                    {movimentacoesRecentes.length === 0 ? (
                        <p className="text-xs text-text-muted">Nenhuma movimentacao registrada para este processo.</p>
                    ) : (
                        <div className="space-y-2">
                            {movimentacoesRecentes.map((mov) => (
                                <div key={mov.id} className="rounded-lg border border-border bg-bg-tertiary/20 px-3 py-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-mono text-text-muted">{formatDate(mov.data)}</span>
                                        {mov.tipo && (
                                            <Badge variant="muted">{mov.tipo}</Badge>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-text-secondary line-clamp-2">{mov.descricao}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <ProcessoDetailTabs
                processo={serializedProcesso}
                advogados={serializedAdvogados}
                documentosDisponiveis={serializedDocumentosParaMovimentacao}
                timelineEventos={serializedTimelineEventos}
                timelineStats={serializedTimelineStats}
                initialTab={initialTab}
                autoOpenTimelineComposer={autoOpenTimelineComposer}
                initialTimelineEventType={initialTimelineEventType}
                autoOpenAudiencia={autoOpenAudiencia}
                autoOpenPrazo={autoOpenPrazo}
            />
        </div>
    );
}
