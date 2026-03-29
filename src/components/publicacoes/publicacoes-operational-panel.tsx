import { Badge } from "@/components/ui/badge";

type PublicacoesOperationalPanelProps = {
    config: {
        autoCaptureEnabled: boolean;
        autoCaptureHour: number;
        autoCaptureLookbackDays: number;
        secondarySourceEnabled: boolean;
        secondarySourceTryWhenEmpty: boolean;
        hardBlockEnabled: boolean;
        hardBlockMaxCargaScore: number;
    };
    jobState: {
        lastRunAt: string | null;
        lastStatus: "SUCCESS" | "SKIPPED" | "ERROR" | null;
        lastMessage: string | null;
        lastResult: {
            capturadas: number;
            importadas: number;
            distribuidas: number;
            prazosCriados?: number;
        } | null;
    };
    catalogo: {
        tribunais: number;
        ativosDataJud: number;
        ativosDjen: number;
    };
    monitor: {
        validationStatus: string;
        validationHttpStatus: number | null;
        sourceChangeCount: number;
        envApiKeyConfigured: boolean;
        alerts: string[];
    };
    aliases: {
        lastRunAt: string | null;
        lastStatus: "SUCCESS" | "ERROR" | "SKIPPED" | null;
        aliasesExtraidos: number;
        tribunaisAtualizados: number;
    };
    jobsAutomacao: Array<{
        id: string;
        status: string;
        createdAt: string;
        totalTribunais: number | null;
        processadosTribunais: number | null;
        publicacoesCapturadas: number | null;
        advogado?: { user?: { name?: string | null } | null } | null;
    }>;
};

function formatDate(value: string | null) {
    if (!value) return "Nunca executado";
    return new Date(value).toLocaleString("pt-BR");
}

function statusVariant(status: string | null | undefined): "success" | "warning" | "danger" | "muted" | "info" | "default" {
    if (status === "SUCCESS" || status === "VALID") return "success";
    if (status === "SKIPPED" || status === "UNKNOWN") return "warning";
    if (status === "ERROR" || status === "INVALID") return "danger";
    if (status === "RUNNING" || status === "QUEUED") return "info";
    return "muted";
}

function statusLabel(status: string | null | undefined) {
    if (!status) return "Sem execucao";
    return status.replaceAll("_", " ");
}

export function PublicacoesOperationalPanel({
    config,
    jobState,
    catalogo,
    monitor,
    aliases,
    jobsAutomacao,
}: PublicacoesOperationalPanelProps) {
    const ultimoJob = jobsAutomacao[0] ?? null;

    return (
        <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
            <div className="glass-card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Operacao de captura</p>
                        <h2 className="mt-2 font-display text-xl font-semibold text-text-primary">Saude da esteira de publicacoes</h2>
                    </div>
                    <Badge variant={statusVariant(jobState.lastStatus)}>{statusLabel(jobState.lastStatus)}</Badge>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[18px] border border-border bg-bg-secondary/40 p-4">
                        <p className="text-xs text-text-muted">Captura automatica</p>
                        <p className="mt-2 text-sm font-semibold text-text-primary">
                            {config.autoCaptureEnabled ? `Ativa as ${String(config.autoCaptureHour).padStart(2, "0")}h` : "Desativada"}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                            Janela de {config.autoCaptureLookbackDays} dia(s) com fallback secundario {config.secondarySourceEnabled ? "ligado" : "desligado"}.
                        </p>
                    </div>
                    <div className="rounded-[18px] border border-border bg-bg-secondary/40 p-4">
                        <p className="text-xs text-text-muted">Ultima rodada</p>
                        <p className="mt-2 text-sm font-semibold text-text-primary">{formatDate(jobState.lastRunAt)}</p>
                        <p className="mt-1 text-xs text-text-secondary">
                            {jobState.lastResult
                                ? `${jobState.lastResult.importadas} importadas, ${jobState.lastResult.distribuidas} distribuidas`
                                : "Sem consolidado de captura ainda."}
                        </p>
                    </div>
                    <div className="rounded-[18px] border border-border bg-bg-secondary/40 p-4">
                        <p className="text-xs text-text-muted">Hard block</p>
                        <p className="mt-2 text-sm font-semibold text-text-primary">
                            {config.hardBlockEnabled ? "Distribuicao protegida" : "Distribuicao livre"}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                            Limite de carga score em {config.hardBlockMaxCargaScore}.
                        </p>
                    </div>
                </div>

                <div className="mt-5 rounded-[18px] border border-border bg-bg-secondary/30 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant(monitor.validationStatus)}>{statusLabel(monitor.validationStatus)}</Badge>
                        <span className="text-xs text-text-secondary">
                            DataJud {monitor.envApiKeyConfigured ? "com chave configurada" : "sem chave configurada"}
                        </span>
                        {monitor.validationHttpStatus ? (
                            <span className="text-xs text-text-muted">HTTP {monitor.validationHttpStatus}</span>
                        ) : null}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div>
                            <p className="text-xs text-text-muted">Mudancas de fonte</p>
                            <p className="mt-1 text-sm font-semibold text-text-primary">{monitor.sourceChangeCount}</p>
                        </div>
                        <div>
                            <p className="text-xs text-text-muted">Aliases extraidos</p>
                            <p className="mt-1 text-sm font-semibold text-text-primary">{aliases.aliasesExtraidos}</p>
                        </div>
                        <div>
                            <p className="text-xs text-text-muted">Tribunais atualizados</p>
                            <p className="mt-1 text-sm font-semibold text-text-primary">{aliases.tribunaisAtualizados}</p>
                        </div>
                    </div>
                    {monitor.alerts.length > 0 ? (
                        <div className="mt-3 rounded-[14px] border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                            {monitor.alerts.slice(0, 2).join(" | ")}
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="glass-card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Cobertura nacional</p>
                        <h2 className="mt-2 font-display text-xl font-semibold text-text-primary">Tribunais e fila operacional</h2>
                    </div>
                    <Badge variant={statusVariant(ultimoJob?.status)}>{statusLabel(ultimoJob?.status)}</Badge>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[18px] border border-border bg-bg-secondary/40 p-4">
                        <p className="text-xs text-text-muted">Catalogo</p>
                        <p className="mt-2 text-lg font-semibold text-text-primary">{catalogo.tribunais}</p>
                        <p className="mt-1 text-xs text-text-secondary">tribunais mapeados</p>
                    </div>
                    <div className="rounded-[18px] border border-border bg-bg-secondary/40 p-4">
                        <p className="text-xs text-text-muted">Fontes DataJud</p>
                        <p className="mt-2 text-lg font-semibold text-text-primary">{catalogo.ativosDataJud}</p>
                        <p className="mt-1 text-xs text-text-secondary">fontes ativas</p>
                    </div>
                    <div className="rounded-[18px] border border-border bg-bg-secondary/40 p-4">
                        <p className="text-xs text-text-muted">Fontes DJEN</p>
                        <p className="mt-2 text-lg font-semibold text-text-primary">{catalogo.ativosDjen}</p>
                        <p className="mt-1 text-xs text-text-secondary">fontes ativas</p>
                    </div>
                </div>

                <div className="mt-5 space-y-3">
                    {jobsAutomacao.slice(0, 4).map((job) => (
                        <div key={job.id} className="rounded-[18px] border border-border bg-bg-secondary/30 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-text-primary">
                                        {job.advogado?.user?.name || "Automacao nacional"}
                                    </p>
                                    <p className="text-xs text-text-muted">{formatDate(job.createdAt)}</p>
                                </div>
                                <Badge variant={statusVariant(job.status)}>{statusLabel(job.status)}</Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-4 text-xs text-text-secondary">
                                <span>
                                    Tribunais: {job.processadosTribunais ?? 0}/{job.totalTribunais ?? 0}
                                </span>
                                <span>Capturadas: {job.publicacoesCapturadas ?? 0}</span>
                            </div>
                        </div>
                    ))}
                    {jobsAutomacao.length === 0 ? (
                        <div className="rounded-[18px] border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
                            Nenhuma automacao nacional foi executada ainda.
                        </div>
                    ) : null}
                </div>

                <div className="mt-4 text-xs text-text-muted">
                    Fonte secundaria {config.secondarySourceEnabled ? "habilitada" : "desabilitada"}
                    {config.secondarySourceEnabled
                        ? config.secondarySourceTryWhenEmpty
                            ? " com tentativa automatica quando a fonte principal vier vazia."
                            : " apenas para acionamento manual."
                        : "."}
                </div>
            </div>
        </section>
    );
}
