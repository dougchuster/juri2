"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Bot,
    Globe2,
    Loader2,
    PlayCircle,
    Radar,
    RefreshCw,
    Save,
    Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form-fields";
import {
    consultarAutomacaoNacionalStatus,
    executarAssistentePublicacoesIA,
    getAutomacaoNacionalOverview,
    iniciarAutomacaoNacional,
    iniciarAutomacaoNacionalEquipe,
    runPublicacoesCaptureJobNow,
    atualizarAliasesDataJudAgora,
    verificarMonitorDataJudAgora,
    updatePublicacoesAutomacaoConfig,
} from "@/actions/publicacoes";

interface Props {
    initialConfig: any;
    initialJobState: any;
    initialAutomacaoCatalogo: any;
    initialAutomacaoJobs: any[];
    initialDataJudMonitor: any;
    initialDataJudAliases: any;
    advogadosAtivos: Array<{ id: string; oab: string; seccional: string; user: { name: string } }>;
    clientesAtivos: Array<{ id: string; nome: string }>;
}

function statusBadgeClass(status: string | null) {
    if (status === "SUCCESS") return "border-success/30 bg-success/10 text-success";
    if (status === "ERROR") return "border-danger/30 bg-danger/10 text-danger";
    if (status === "SKIPPED") return "border-warning/30 bg-warning/10 text-warning";
    if (status === "RUNNING") return "border-accent/30 bg-accent/10 text-accent";
    return "border-border bg-bg-tertiary/40 text-text-muted";
}

function formatDateOnly(date: Date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

export function AdminPublicacoesConfig({
    initialConfig,
    initialJobState,
    initialAutomacaoCatalogo,
    initialAutomacaoJobs,
    initialDataJudMonitor,
    initialDataJudAliases,
    advogadosAtivos,
    clientesAtivos,
}: Props) {
    const [config, setConfig] = useState<any>(initialConfig);
    const [jobState, setJobState] = useState<any>(initialJobState);
    const [catalogo, setCatalogo] = useState<any>(initialAutomacaoCatalogo);
    const [jobs, setJobs] = useState<any[]>(initialAutomacaoJobs);
    const [monitor, setMonitor] = useState<any>(initialDataJudMonitor);
    const [aliases, setAliases] = useState<any>(initialDataJudAliases);
    const [lookbackDays, setLookbackDays] = useState<number>(1);
    const [advogadoId, setAdvogadoId] = useState<string>("");
    const [feedback, setFeedback] = useState<string | null>(null);
    const [assistenteError, setAssistenteError] = useState<string | null>(null);
    const [assistenteResult, setAssistenteResult] = useState<any | null>(null);
    const [assistenteForm, setAssistenteForm] = useState(() => ({
        oabNumero: "",
        oabUf: "DF",
        dataInicio: formatDateOnly(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
        dataFim: formatDateOnly(new Date()),
        tribunaisCsv: "",
        limitePorConsulta: Number(initialConfig?.limitePorConsulta || 40),
        pergunta: "Analise as publicacoes e indique prioridades de distribuicao pela carga da equipe.",
    }));

    const [isSaving, startSaving] = useTransition();
    const [isRunning, startRunning] = useTransition();
    const [isNational, startNational] = useTransition();
    const [isRefresh, startRefresh] = useTransition();
    const [isAssistant, startAssistant] = useTransition();
    const [isMonitor, startMonitor] = useTransition();
    const [isAliases, startAliases] = useTransition();

    const recentJobs = useMemo(() => jobs.slice(0, 6), [jobs]);

    function setNumberField(field: string, value: string) {
        const parsed = Number(value);
        setConfig((prev: any) => ({ ...prev, [field]: Number.isFinite(parsed) ? parsed : 0 }));
    }

    function setBooleanField(field: string, value: boolean) {
        setConfig((prev: any) => ({ ...prev, [field]: value }));
    }

    function handleSave() {
        setFeedback(null);
        startSaving(async () => {
            const result = await updatePublicacoesAutomacaoConfig(config);
            setFeedback(result.success ? "Configuracoes salvas com sucesso." : "Erro ao salvar configuracoes.");
        });
    }

    function handleCaptureNow() {
        setFeedback(null);
        startRunning(async () => {
            const result = await runPublicacoesCaptureJobNow();
            if (!result.success) {
                setFeedback(result.error || "Erro ao executar captura.");
                return;
            }
            const payload = result.result;
            if (payload) {
                setJobState((prev: any) => ({
                    ...prev,
                    lastRunAt: payload.timestamp,
                    lastStatus: payload.skipped ? "SKIPPED" : "SUCCESS",
                    lastMessage: payload.reason || "Execucao concluida.",
                    lastResult: payload.result ? { ...payload.result, errosConsulta: payload.result.errosConsulta.length } : prev.lastResult,
                }));
            }
            setFeedback("Captura executada.");
        });
    }

    function refreshOverview() {
        startRefresh(async () => {
            const result = await getAutomacaoNacionalOverview();
            if (!result.success) {
                setFeedback("Erro ao atualizar painel.");
                return;
            }
            setCatalogo(result.catalogo);
            setJobs(result.jobs as any[]);
            if (result.monitor) setMonitor(result.monitor);
            if (result.aliases) setAliases(result.aliases);
            setFeedback("Painel atualizado.");
        });
    }

    function runNational(single: boolean) {
        setFeedback(null);
        startNational(async () => {
            const result = single
                ? await iniciarAutomacaoNacional({ advogadoId: advogadoId || undefined, lookbackDays, runNow: true, forceCatalogSync: false })
                : await iniciarAutomacaoNacionalEquipe({ lookbackDays, runNow: true, forceCatalogSync: false, maxAdvogados: 200 });
            if (!result.success) {
                setFeedback("Erro ao iniciar automacao nacional.");
                return;
            }
            setFeedback(single ? "Automacao nacional iniciada." : "Automacao da equipe iniciada.");
            refreshOverview();
        });
    }

    function checkMonitor() {
        startMonitor(async () => {
            const result = await verificarMonitorDataJudAgora();
            if (result.success && (result.result as any)?.state) setMonitor((result.result as any).state);
            setFeedback(result.success ? "Monitor DataJud atualizado." : "Erro ao verificar monitor DataJud.");
        });
    }

    function updateAliases() {
        startAliases(async () => {
            const result = await atualizarAliasesDataJudAgora();
            if (result.success && (result.result as any)?.state) setAliases((result.result as any).state);
            setFeedback(result.success ? "Aliases DataJud atualizados." : "Erro ao atualizar aliases DataJud.");
        });
    }

    function refreshJob(jobId: string) {
        startRefresh(async () => {
            const result = await consultarAutomacaoNacionalStatus({ jobId });
            if (!result.success) return;
            const updated = (result.status as any)?.job;
            if (!updated) return;
            setJobs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        });
    }

    function runAssistant() {
        setAssistenteError(null);
        setAssistenteResult(null);
        startAssistant(async () => {
            const result = await executarAssistentePublicacoesIA(assistenteForm as any);
            if (!result.success) {
                setAssistenteError("Erro ao executar assistente IA.");
                return;
            }
            setAssistenteResult(result.result);
        });
    }

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold text-text-primary">Automacao de Publicacoes</h1>
                    <p className="text-sm text-text-muted mt-1">Visao operacional simples. Avancado fica em bloco opcional.</p>
                </div>
                <Link href="/admin">
                    <Button variant="outline" size="sm"><ArrowLeft size={14} />Voltar</Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="glass-card p-4"><p className="text-[10px] uppercase tracking-wide text-text-muted">Tribunais</p><p className="font-mono text-2xl font-bold text-text-primary">{catalogo.tribunais}</p></div>
                <div className="glass-card p-4"><p className="text-[10px] uppercase tracking-wide text-text-muted">DataJud ativo</p><p className="font-mono text-2xl font-bold text-text-primary">{catalogo.ativosDataJud}</p></div>
                <div className="glass-card p-4"><p className="text-[10px] uppercase tracking-wide text-text-muted">DJEN ativo</p><p className="font-mono text-2xl font-bold text-text-primary">{catalogo.ativosDjen}</p></div>
                <div className="glass-card p-4">
                    <p className="text-[10px] uppercase tracking-wide text-text-muted">Ultima captura</p>
                    <p className="text-sm text-text-primary mt-1">{jobState.lastRunAt ? new Date(jobState.lastRunAt).toLocaleString("pt-BR") : "Nunca"}</p>
                    <span className={`mt-2 inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(jobState.lastStatus)}`}>{jobState.lastStatus || "N/A"}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="glass-card p-5 space-y-4">
                    <div className="flex items-center gap-2"><Globe2 size={16} className="text-accent" /><h2 className="text-sm font-semibold text-text-primary">Operacao nacional</h2></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-text-muted">Advogado responsavel</label>
                            <select value={advogadoId} onChange={(e) => setAdvogadoId(e.target.value)} className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary">
                                <option value="">Primeiro advogado ativo (automatico)</option>
                                {advogadosAtivos.map((adv) => <option key={adv.id} value={adv.id}>{adv.user.name} - {adv.oab}/{adv.seccional}</option>)}
                            </select>
                        </div>
                        <Input id="lookback" type="number" min={0} max={30} label="Dias retroativos" value={lookbackDays} onChange={(e) => setLookbackDays(Number(e.target.value) || 0)} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={refreshOverview} disabled={isRefresh || isNational}>{isRefresh ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}Atualizar painel</Button>
                        <Button variant="gradient" onClick={() => runNational(true)} disabled={isNational || isRefresh}>{isNational ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}Rodar agora</Button>
                        <Button variant="secondary" onClick={() => runNational(false)} disabled={isNational || isRefresh}>{isNational ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}Rodar equipe</Button>
                    </div>
                    <div className="rounded-lg border border-border bg-bg-tertiary/20 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(monitor.lastStatus)}`}>Monitor: {monitor.lastStatus || "N/A"}</span>
                            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(monitor.validationStatus)}`}>Chave: {monitor.validationStatus || "N/A"}</span>
                            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(aliases.lastStatus)}`}>Aliases: {aliases.lastStatus || "N/A"}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Button variant="ghost" size="sm" onClick={checkMonitor} disabled={isMonitor}>{isMonitor ? <Loader2 size={14} className="animate-spin" /> : <Radar size={14} />}Verificar DataJud</Button>
                            <Button variant="ghost" size="sm" onClick={updateAliases} disabled={isAliases}>{isAliases ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}Atualizar aliases</Button>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-5 space-y-4">
                    <div className="flex items-center gap-2"><Radar size={16} className="text-accent" /><h2 className="text-sm font-semibold text-text-primary">Captura diaria</h2></div>
                    <label className="flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={config.autoCaptureEnabled} onChange={(e) => setBooleanField("autoCaptureEnabled", e.target.checked)} />Ativar captura diaria automatica</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input id="hour" type="number" min={0} max={23} label="Hora da captura" value={config.autoCaptureHour} onChange={(e) => setNumberField("autoCaptureHour", e.target.value)} />
                        <Input id="lookback-daily" type="number" min={0} max={30} label="Dias retroativos" value={config.autoCaptureLookbackDays} onChange={(e) => setNumberField("autoCaptureLookbackDays", e.target.value)} />
                        <Input id="limit" type="number" min={1} max={200} label="Limite por consulta" value={config.limitePorConsulta} onChange={(e) => setNumberField("limitePorConsulta", e.target.value)} />
                        <Input id="pages" type="number" min={1} max={50} label="Max paginas por consulta" value={config.maxPaginasPorConsulta} onChange={(e) => setNumberField("maxPaginasPorConsulta", e.target.value)} />
                    </div>
                    <Textarea id="tribunais" label="Tribunais (CSV opcional)" rows={2} value={config.tribunaisCsv} onChange={(e) => setConfig((prev: any) => ({ ...prev, tribunaisCsv: e.target.value }))} placeholder="TJDFT,TRF1,STJ" />
                    <label className="flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={config.autoCreateProcessEnabled} onChange={(e) => setBooleanField("autoCreateProcessEnabled", e.target.checked)} />Auto-criar processo por CNJ</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-text-muted">Cliente padrao (fallback)</label>
                            <select value={config.autoCreateProcessClientePadraoId} onChange={(e) => setConfig((prev: any) => ({ ...prev, autoCreateProcessClientePadraoId: e.target.value }))} className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary">
                                <option value="">Criar/usar caixa de entrada automaticamente</option>
                                {clientesAtivos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                        </div>
                        <Input id="max-process" type="number" min={0} max={1000} label="Max processos por execucao" value={config.autoCreateProcessMaxPerRun} onChange={(e) => setNumberField("autoCreateProcessMaxPerRun", e.target.value)} />
                    </div>
                </div>
            </div>

            <details className="glass-card p-5">
                <summary className="cursor-pointer select-none text-sm font-semibold text-text-primary flex items-center gap-2"><Settings2 size={14} className="text-text-muted" />Configuracoes avancadas (opcional)</summary>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input id="timeout" type="number" min={3000} max={120000} label="Timeout (ms)" value={config.timeoutMs} onChange={(e) => setNumberField("timeoutMs", e.target.value)} />
                    <Input id="interval" type="number" min={0} max={5000} label="Intervalo entre requests (ms)" value={config.requestIntervalMs} onChange={(e) => setNumberField("requestIntervalMs", e.target.value)} />
                    <Input id="hard-max" type="number" min={0} max={999} label="Max score de carga" value={config.hardBlockMaxCargaScore} onChange={(e) => setNumberField("hardBlockMaxCargaScore", e.target.value)} />
                </div>
            </details>

            <details className="glass-card p-5">
                <summary className="cursor-pointer select-none text-sm font-semibold text-text-primary flex items-center gap-2"><Bot size={14} className="text-accent" />Assistente IA por OAB (opcional)</summary>
                <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <Input id="oab-num" label="Numero OAB" value={assistenteForm.oabNumero} onChange={(e) => setAssistenteForm((p) => ({ ...p, oabNumero: e.target.value }))} placeholder="62898" />
                        <Input id="oab-uf" label="UF" maxLength={2} value={assistenteForm.oabUf} onChange={(e) => setAssistenteForm((p) => ({ ...p, oabUf: e.target.value.toUpperCase() }))} placeholder="DF" />
                        <Input id="data-i" type="date" label="Data inicio" value={assistenteForm.dataInicio} onChange={(e) => setAssistenteForm((p) => ({ ...p, dataInicio: e.target.value }))} />
                        <Input id="data-f" type="date" label="Data fim" value={assistenteForm.dataFim} onChange={(e) => setAssistenteForm((p) => ({ ...p, dataFim: e.target.value }))} />
                    </div>
                    <Textarea id="pergunta-ia" rows={3} label="Pergunta para IA" value={assistenteForm.pergunta} onChange={(e) => setAssistenteForm((p) => ({ ...p, pergunta: e.target.value }))} />
                    <div className="flex justify-end"><Button variant="secondary" onClick={runAssistant} disabled={isAssistant}>{isAssistant ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}Rodar assistente IA</Button></div>
                    {assistenteError && <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{assistenteError}</div>}
                    {assistenteResult && <div className="rounded-lg border border-border bg-bg-tertiary/20 px-3 py-2 text-sm text-text-secondary whitespace-pre-wrap">{assistenteResult.ai?.resposta || "Sem resposta de IA."}</div>}
                </div>
            </details>

            <div className="glass-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-text-primary">Ultimos jobs nacionais</h2>
                    <p className="text-xs text-text-muted">Mostrando {recentJobs.length} de {jobs.length}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-tertiary/20">
                    <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_auto] border-b border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                        <span>Job / responsavel</span><span>Status</span><span>Tribunais</span><span>Importadas / prazos</span><span>Acoes</span>
                    </div>
                    {recentJobs.length === 0 ? <div className="px-3 py-4 text-sm text-text-muted">Nenhum job executado.</div> : recentJobs.map((job) => (
                        <div key={job.id} className="grid grid-cols-[1.6fr_1fr_1fr_1fr_auto] items-center gap-2 border-b border-border/50 px-3 py-2 text-xs text-text-secondary last:border-b-0">
                            <div><p className="font-mono text-[11px] text-text-primary">{String(job.id).slice(0, 12)}...</p><p className="text-[11px] text-text-muted">{job.advogado?.user?.name || "Sem responsavel"}</p><p className="text-[11px] text-text-muted">{new Date(job.createdAt).toLocaleString("pt-BR")}</p></div>
                            <div><span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(job.status)}`}>{job.status}</span></div>
                            <div className="text-[11px]">{job.sucessoTribunais}/{job.totalTribunais} ok<br /><span className="text-danger">{job.falhaTribunais} falha</span></div>
                            <div className="text-[11px]">{job.publicacoesImportadas} importadas<br />{job.prazosCriados} prazos</div>
                            <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => refreshJob(job.id)} disabled={isRefresh}><RefreshCw size={14} /></Button></div>
                        </div>
                    ))}
                </div>
            </div>

            {feedback && <div className="rounded-lg border border-border bg-bg-tertiary/40 px-3 py-2 text-sm text-text-secondary">{feedback}</div>}

            <div className="flex flex-wrap items-center justify-end gap-3">
                <Button variant="secondary" onClick={handleCaptureNow} disabled={isRunning || isSaving}>
                    {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Radar size={14} />}
                    Executar captura agora
                </Button>
                <Button variant="gradient" onClick={handleSave} disabled={isSaving || isRunning}>
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Salvar configuracoes
                </Button>
            </div>
        </div>
    );
}

