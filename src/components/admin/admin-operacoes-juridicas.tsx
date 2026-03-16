"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRightLeft, Handshake, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-fields";
import {
    atribuirProcessoParaAdvogado,
    distribuirProcessosAutomaticamente,
    runOperacoesJobAgora,
    updateOperacoesConfig,
} from "@/actions/admin";
import {
    AdminOperacoesJuridicasProps as Props,
    AuditoriaPeriodo,
    HISTORICO_MODO_VALUES,
    HISTORICO_PAGE_SIZE,
    HISTORICO_PERIODO_VALUES,
    HISTORICO_TIPO_VALUES,
    HistoricoModoFiltro,
    HistoricoPeriodoFiltro,
    HistoricoTipoFiltro,
    auditoriaPeriodoDias,
    formatModoDistribuicao,
    formatProcessoStatus,
    getActionError,
    normalizeHistoricoParam,
    quickActions,
} from "@/components/admin/admin-operacoes-juridicas-shared";
import {
    OperacoesAuditoriaPanel,
    OperacoesBenchmarkPanel,
    OperacoesSidebar,
} from "@/components/admin/admin-operacoes-juridicas-report-sections";

export function AdminOperacoesJuridicas({
    metrics,
    advogados,
    processos,
    slaConversas,
    slaAtendimentos,
    atribuicoesRecentes,
    config,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const filtrosHydratedRef = useRef(false);
    const filtroResetArmedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [savingProcessoId, setSavingProcessoId] = useState<string | null>(null);
    const [autoDistributing, setAutoDistributing] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);
    const [runningJob, setRunningJob] = useState(false);
    const [configForm, setConfigForm] = useState<Props["config"]>(config);
    const [destinoPorProcesso, setDestinoPorProcesso] = useState<Record<string, string>>({});
    const [histTipoFiltro, setHistTipoFiltro] = useState<HistoricoTipoFiltro>("TODOS");
    const [histModoFiltro, setHistModoFiltro] = useState<HistoricoModoFiltro>("TODOS");
    const [histPeriodoFiltro, setHistPeriodoFiltro] = useState<HistoricoPeriodoFiltro>("TODOS");
    const [histBusca, setHistBusca] = useState("");
    const [histPagina, setHistPagina] = useState(1);
    const [auditoriaPeriodo, setAuditoriaPeriodo] = useState<AuditoriaPeriodo>("30D");
    const [auditoriaAdvogadoId, setAuditoriaAdvogadoId] = useState("TODOS");
    const [auditoriaAutoRefresh, setAuditoriaAutoRefresh] = useState(false);

    useEffect(() => {
        if (filtrosHydratedRef.current) return;
        setHistTipoFiltro(normalizeHistoricoParam(searchParams.get("hist_tipo"), HISTORICO_TIPO_VALUES, "TODOS"));
        setHistModoFiltro(normalizeHistoricoParam(searchParams.get("hist_modo"), HISTORICO_MODO_VALUES, "TODOS"));
        setHistPeriodoFiltro(
            normalizeHistoricoParam(searchParams.get("hist_periodo"), HISTORICO_PERIODO_VALUES, "TODOS")
        );
        setHistBusca(searchParams.get("hist_q") || "");
        const pageParamRaw = Number(searchParams.get("hist_page") || "1");
        const pageParam = Number.isFinite(pageParamRaw) && pageParamRaw >= 1 ? Math.floor(pageParamRaw) : 1;
        setHistPagina(pageParam);
        filtrosHydratedRef.current = true;
    }, [searchParams]);

    const historicoFiltrado = useMemo(() => {
        const now = Date.now();
        return atribuicoesRecentes.filter((item) => {
            if (histTipoFiltro === "AUTO" && !item.automatico) return false;
            if (histTipoFiltro === "MANUAL" && item.automatico) return false;

            if (histPeriodoFiltro !== "TODOS") {
                const itemTs = new Date(item.createdAt).getTime();
                const limiteMs =
                    histPeriodoFiltro === "24H"
                        ? 24 * 60 * 60 * 1000
                        : histPeriodoFiltro === "7D"
                            ? 7 * 24 * 60 * 60 * 1000
                            : 30 * 24 * 60 * 60 * 1000;
                if (now - itemTs > limiteMs) return false;
            }

            const modoItem = (item.modoDistribuicao || (item.automatico ? "GLOBAL" : "MANUAL")).toUpperCase();
            if (histModoFiltro !== "TODOS" && modoItem !== histModoFiltro) return false;

            const busca = histBusca.trim().toLowerCase();
            if (!busca) return true;
            const haystack = [
                item.processo.numeroCnj || item.processoId,
                item.fromAdvogado?.user.name || "",
                item.toAdvogado.user.name,
                item.motivo || "",
                modoItem,
            ]
                .join(" ")
                .toLowerCase();

            return haystack.includes(busca);
        });
    }, [atribuicoesRecentes, histBusca, histModoFiltro, histPeriodoFiltro, histTipoFiltro]);

    const historicoTotalPaginas = Math.max(1, Math.ceil(historicoFiltrado.length / HISTORICO_PAGE_SIZE));
    const historicoPaginado = useMemo(() => {
        const inicio = (histPagina - 1) * HISTORICO_PAGE_SIZE;
        return historicoFiltrado.slice(inicio, inicio + HISTORICO_PAGE_SIZE);
    }, [histPagina, historicoFiltrado]);

    useEffect(() => {
        if (!filtrosHydratedRef.current) return;
        if (!filtroResetArmedRef.current) {
            filtroResetArmedRef.current = true;
            return;
        }
        setHistPagina(1);
    }, [histTipoFiltro, histModoFiltro, histPeriodoFiltro, histBusca]);

    useEffect(() => {
        if (histPagina > historicoTotalPaginas) {
            setHistPagina(historicoTotalPaginas);
        }
    }, [histPagina, historicoTotalPaginas]);

    useEffect(() => {
        if (!auditoriaAutoRefresh) return;
        const timer = setInterval(() => {
            router.refresh();
        }, 30_000);
        return () => clearInterval(timer);
    }, [auditoriaAutoRefresh, router]);

    const auditoriaFiltrada = useMemo(() => {
        const janelaDias = auditoriaPeriodoDias(auditoriaPeriodo);
        const limite = Date.now() - janelaDias * 24 * 60 * 60 * 1000;
        return atribuicoesRecentes.filter((item) => {
            if (new Date(item.createdAt).getTime() < limite) return false;
            if (auditoriaAdvogadoId === "TODOS") return true;
            return (
                item.toAdvogado.id === auditoriaAdvogadoId ||
                (item.fromAdvogado?.id || "") === auditoriaAdvogadoId
            );
        });
    }, [atribuicoesRecentes, auditoriaAdvogadoId, auditoriaPeriodo]);

    const auditoriaAnalitica = useMemo(() => {
        const total = auditoriaFiltrada.length;
        const automaticas = auditoriaFiltrada.filter((item) => item.automatico).length;
        const manuais = total - automaticas;
        const fallbackGlobal = auditoriaFiltrada.filter((item) =>
            (item.modoDistribuicao || "").toUpperCase().includes("FALLBACK")
        ).length;
        const mesmaEquipe = auditoriaFiltrada.filter((item) => item.mesmaEquipe).length;

        const destinoMap = new Map<string, number>();
        const origemMap = new Map<string, number>();
        for (const item of auditoriaFiltrada) {
            const destino = item.toAdvogado.user.name;
            destinoMap.set(destino, (destinoMap.get(destino) || 0) + 1);
            const origem = item.fromAdvogado?.user.name || "Sem responsavel";
            origemMap.set(origem, (origemMap.get(origem) || 0) + 1);
        }

        const topDestinos = Array.from(destinoMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);
        const topOrigens = Array.from(origemMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

        const dias = auditoriaPeriodoDias(auditoriaPeriodo);
        const serieMap = new Map<string, { label: string; count: number }>();
        for (let i = dias - 1; i >= 0; i -= 1) {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - i);
            const key = date.toISOString().slice(0, 10);
            serieMap.set(key, {
                label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
                count: 0,
            });
        }
        for (const item of auditoriaFiltrada) {
            const key = new Date(item.createdAt).toISOString().slice(0, 10);
            const entry = serieMap.get(key);
            if (entry) entry.count += 1;
        }
        const serieDiaria = Array.from(serieMap.values());
        const serieMax = Math.max(1, ...serieDiaria.map((item) => item.count));

        return {
            total,
            automaticas,
            manuais,
            fallbackGlobal,
            mesmaEquipe,
            topDestinos,
            topOrigens,
            serieDiaria,
            serieMax,
        };
    }, [auditoriaFiltrada, auditoriaPeriodo]);

    function getHistoricoExportRows() {
        return historicoFiltrado.map((item) => {
            const modoItem = item.modoDistribuicao || (item.automatico ? "GLOBAL" : "MANUAL");
            return {
                data_hora: new Date(item.createdAt).toLocaleString("pt-BR"),
                cnj_ou_id: item.processo.numeroCnj || item.processoId,
                tipo: item.automatico ? "AUTO" : "MANUAL",
                modo: formatModoDistribuicao(modoItem),
                de_advogado: item.fromAdvogado?.user.name || "Sem responsavel",
                para_advogado: item.toAdvogado.user.name,
                mesma_equipe: item.mesmaEquipe ? "SIM" : "NAO",
                motivo: item.motivo || "",
            };
        });
    }

    function getHistoricoShareParams() {
        const params = new URLSearchParams(searchParams.toString());
        if (histTipoFiltro === "TODOS") params.delete("hist_tipo");
        else params.set("hist_tipo", histTipoFiltro);

        if (histModoFiltro === "TODOS") params.delete("hist_modo");
        else params.set("hist_modo", histModoFiltro);

        if (histPeriodoFiltro === "TODOS") params.delete("hist_periodo");
        else params.set("hist_periodo", histPeriodoFiltro);

        if (histBusca.trim()) params.set("hist_q", histBusca.trim());
        else params.delete("hist_q");

        if (histPagina > 1) params.set("hist_page", String(histPagina));
        else params.delete("hist_page");

        return params;
    }

    function handleResetHistoricoFiltros() {
        setHistTipoFiltro("TODOS");
        setHistModoFiltro("TODOS");
        setHistPeriodoFiltro("TODOS");
        setHistBusca("");
        setHistPagina(1);
    }

    function csvSafe(value: string) {
        const sanitized = value.replaceAll('"', '""').replaceAll("\n", " ").replaceAll("\r", " ");
        return `"${sanitized}"`;
    }

    function handleExportHistoricoCsv() {
        const rows = getHistoricoExportRows();
        if (rows.length === 0) {
            setError("Nao ha registros filtrados para exportar.");
            return;
        }
        setError(null);
        const header = Object.keys(rows[0]);
        const lines = rows.map((row) => header.map((key) => csvSafe(String(row[key as keyof typeof row]))).join(";"));
        const csv = `${header.join(";")}\n${lines.join("\n")}`;
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const fileTs = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
        link.href = url;
        link.download = `historico-redistribuicoes-${fileTs}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setSuccess(`CSV exportado com ${rows.length} registro(s).`);
    }

    function getHistoricoResumoRows() {
        const total = historicoFiltrado.length;
        const auto = historicoFiltrado.filter((item) => item.automatico).length;
        const manual = total - auto;
        const mesmaEquipe = historicoFiltrado.filter((item) => item.mesmaEquipe).length;
        const equipeDiferente = total - mesmaEquipe;
        const modoCounter = new Map<string, number>();
        for (const item of historicoFiltrado) {
            const modo = (item.modoDistribuicao || (item.automatico ? "GLOBAL" : "MANUAL")).toUpperCase();
            modoCounter.set(modo, (modoCounter.get(modo) || 0) + 1);
        }

        const rows: Array<{ categoria: string; item: string; quantidade: number }> = [
            { categoria: "GERAL", item: "Registros filtrados", quantidade: total },
            { categoria: "GERAL", item: "Automaticas", quantidade: auto },
            { categoria: "GERAL", item: "Manuais", quantidade: manual },
            { categoria: "EQUIPE", item: "Mesma equipe", quantidade: mesmaEquipe },
            { categoria: "EQUIPE", item: "Equipe diferente", quantidade: equipeDiferente },
        ];

        for (const [modo, quantidade] of Array.from(modoCounter.entries()).sort((a, b) => b[1] - a[1])) {
            rows.push({
                categoria: "MODO",
                item: formatModoDistribuicao(modo),
                quantidade,
            });
        }

        return rows;
    }

    function handleExportResumoGerencialCsv() {
        const rows = getHistoricoResumoRows();
        if (rows.length === 0 || rows[0].quantidade === 0) {
            setError("Nao ha registros filtrados para gerar resumo.");
            return;
        }
        setError(null);
        const header = Object.keys(rows[0]);
        const lines = rows.map((row) => header.map((key) => csvSafe(String(row[key as keyof typeof row]))).join(";"));
        const csv = `${header.join(";")}\n${lines.join("\n")}`;
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const fileTs = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
        link.href = url;
        link.download = `resumo-gerencial-redistribuicoes-${fileTs}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setSuccess(`Resumo gerencial exportado com ${rows.length} linha(s).`);
    }

    function handleAtualizarAuditoria() {
        router.refresh();
        setSuccess("Auditoria atualizada.");
    }

    async function handleExportHistoricoXlsx() {
        const rows = getHistoricoExportRows();
        if (rows.length === 0) {
            setError("Nao ha registros filtrados para exportar.");
            return;
        }
        setError(null);
        try {
            const XLSX = await import("xlsx");
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Historico");
            const xlsxArray = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
            const blob = new Blob([xlsxArray], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const fileTs = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
            link.href = url;
            link.download = `historico-redistribuicoes-${fileTs}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setSuccess(`XLSX exportado com ${rows.length} registro(s).`);
        } catch (err) {
            console.error("Erro ao exportar XLSX:", err);
            setError("Erro ao exportar XLSX.");
        }
    }

    async function handleCopiarLinkHistorico() {
        const params = getHistoricoShareParams();
        const basePath = typeof window !== "undefined" ? `${window.location.origin}${pathname}` : pathname;
        const linkCompartilhavel = params.toString() ? `${basePath}?${params.toString()}` : basePath;

        try {
            await navigator.clipboard.writeText(linkCompartilhavel);
            setError(null);
            setSuccess("Link com filtros copiado.");
        } catch {
            const textarea = document.createElement("textarea");
            textarea.value = linkCompartilhavel;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            setError(null);
            setSuccess("Link com filtros copiado.");
        }
    }

    async function handleAtribuir(processoId: string, currentAdvogadoId: string) {
        const advogadoId = destinoPorProcesso[processoId] || currentAdvogadoId;
        if (advogadoId === currentAdvogadoId) return;

        setSavingProcessoId(processoId);
        setError(null);
        setSuccess(null);
        const result = await atribuirProcessoParaAdvogado({ processoId, advogadoId });
        const actionError = getActionError(result, "Erro ao atribuir processo.");
        if (actionError) {
            setError(actionError);
            setSavingProcessoId(null);
            return;
        }

        setSavingProcessoId(null);
        setSuccess("Processo redistribuido com sucesso.");
        router.refresh();
    }

    async function handleAutoDistribuir() {
        setAutoDistributing(true);
        setError(null);
        setSuccess(null);
        const result = await distribuirProcessosAutomaticamente({
            processoIds: processos.map((processo) => processo.id),
            apenasQuandoSobrecarregado: configForm.autoDistributionOnlyOverloaded,
            modoDistribuicao: configForm.autoDistributionMode,
            fallbackGlobal: configForm.autoDistributionFallbackGlobal,
        });
        const actionError = getActionError(result, "Erro ao executar distribuição automática.");
        if (actionError) {
            setError(actionError);
            setAutoDistributing(false);
            return;
        }

        const payload = result as { movidos?: number; analisados?: number };
        setSuccess(
            `Distribuição automática concluída: ${payload.movidos || 0} processo(s) movido(s) de ${payload.analisados || 0} analisado(s).`
        );
        setAutoDistributing(false);
        router.refresh();
    }

    async function handleSalvarConfig() {
        setSavingConfig(true);
        setError(null);
        setSuccess(null);
        const result = await updateOperacoesConfig(configForm);
        const actionError = getActionError(result, "Erro ao salvar configurações operacionais.");
        if (actionError) {
            setError(actionError);
            setSavingConfig(false);
            return;
        }
        setSavingConfig(false);
        setSuccess("Configurações operacionais atualizadas.");
        router.refresh();
    }

    async function handleRodarJobAgora() {
        setRunningJob(true);
        setError(null);
        setSuccess(null);
        const result = await runOperacoesJobAgora(true);
        const actionError = getActionError(result, "Erro ao executar job operacional.");
        if (actionError) {
            setError(actionError);
            setRunningJob(false);
            return;
        }
        const payload = result as { distributionResult?: { movidos?: number }; sla?: { conversasPendentes?: number; atendimentosPendentes?: number } };
        setSuccess(
            `Job operacional executado. Redistribuidos: ${payload.distributionResult?.movidos || 0}. ` +
            `SLA pendente: ${payload.sla?.conversasPendentes || 0} conversas, ${payload.sla?.atendimentosPendentes || 0} atendimentos.`
        );
        setRunningJob(false);
        router.refresh();
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                    {error}
                </div>
            )}
            {success && (
                <div className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
                    {success}
                </div>
            )}

            <div className="glass-card p-4">
                <div className="mb-3 flex items-center gap-2">
                    <Sparkles size={15} className="text-accent" />
                    <h2 className="text-sm font-semibold text-text-primary">Cadastro rapido operacional</h2>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {quickActions.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="rounded-xl border border-border bg-bg-tertiary/40 px-3 py-3 transition-colors hover:bg-bg-tertiary"
                        >
                            <div className="flex items-center gap-2">
                                <item.icon size={14} className="text-accent" />
                                <span className="text-sm font-medium text-text-primary">{item.label}</span>
                            </div>
                            <p className="mt-1 text-xs text-text-muted">{item.hint}</p>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="glass-card p-4">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-text-primary">Configurações de SLA e distribuição</h2>
                    <div className="flex items-center gap-2">
                        <Button size="xs" variant="outline" onClick={handleRodarJobAgora} disabled={runningJob}>
                            {runningJob ? <Loader2 size={12} className="animate-spin" /> : "Executar job agora"}
                        </Button>
                        <Button size="xs" variant="outline" onClick={handleSalvarConfig} disabled={savingConfig}>
                            {savingConfig ? <Loader2 size={12} className="animate-spin" /> : "Salvar configurações"}
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-8">
                    <Input
                        id="cfg-sla-wa"
                        label="SLA WhatsApp (min)"
                        type="number"
                        min={5}
                        max={720}
                        value={String(configForm.slaWhatsappMinutes)}
                        onChange={(e) =>
                            setConfigForm((prev) => ({ ...prev, slaWhatsappMinutes: Number(e.target.value || 0) }))
                        }
                    />
                    <Input
                        id="cfg-sla-email"
                        label="SLA E-mail (min)"
                        type="number"
                        min={10}
                        max={1440}
                        value={String(configForm.slaEmailMinutes)}
                        onChange={(e) =>
                            setConfigForm((prev) => ({ ...prev, slaEmailMinutes: Number(e.target.value || 0) }))
                        }
                    />
                    <Input
                        id="cfg-sla-atend"
                        label="SLA Atendimento (h)"
                        type="number"
                        min={1}
                        max={240}
                        value={String(configForm.slaAtendimentoNoReturnHours)}
                        onChange={(e) =>
                            setConfigForm((prev) => ({
                                ...prev,
                                slaAtendimentoNoReturnHours: Number(e.target.value || 0),
                            }))
                        }
                    />
                    <Input
                        id="cfg-dist-hour"
                        label="Hora auto dist. (0-23)"
                        type="number"
                        min={0}
                        max={23}
                        value={String(configForm.autoDistributionHour)}
                        onChange={(e) =>
                            setConfigForm((prev) => ({ ...prev, autoDistributionHour: Number(e.target.value || 0) }))
                        }
                    />
                    <label className="rounded-xl border border-border bg-bg-tertiary/40 px-3 py-2.5 text-xs text-text-secondary">
                        <span className="mb-1 block font-medium text-text-primary">Modo de distribuição</span>
                        <select
                            value={configForm.autoDistributionMode}
                            onChange={(e) =>
                                setConfigForm((prev) => ({
                                    ...prev,
                                    autoDistributionMode: e.target.value as "GLOBAL" | "EQUIPE",
                                }))
                            }
                            className="h-8 w-full rounded-lg border border-border bg-bg-tertiary px-2 text-xs text-text-primary outline-none"
                        >
                            <option value="GLOBAL">Global</option>
                            <option value="EQUIPE">Por equipe</option>
                        </select>
                    </label>
                    <label className="rounded-xl border border-border bg-bg-tertiary/40 px-3 py-2.5 text-xs text-text-secondary">
                        <span className="mb-1 block font-medium text-text-primary">Auto distribuição</span>
                        <input
                            type="checkbox"
                            checked={configForm.autoDistributionEnabled}
                            onChange={(e) =>
                                setConfigForm((prev) => ({ ...prev, autoDistributionEnabled: e.target.checked }))
                            }
                            className="mr-2 align-middle"
                        />
                        Ativada
                    </label>
                    <label className="rounded-xl border border-border bg-bg-tertiary/40 px-3 py-2.5 text-xs text-text-secondary">
                        <span className="mb-1 block font-medium text-text-primary">Somente sobrecarga</span>
                        <input
                            type="checkbox"
                            checked={configForm.autoDistributionOnlyOverloaded}
                            onChange={(e) =>
                                setConfigForm((prev) => ({
                                    ...prev,
                                    autoDistributionOnlyOverloaded: e.target.checked,
                                }))
                            }
                            className="mr-2 align-middle"
                        />
                        Exigir carga alta
                    </label>
                    <label className="rounded-xl border border-border bg-bg-tertiary/40 px-3 py-2.5 text-xs text-text-secondary">
                        <span className="mb-1 block font-medium text-text-primary">Fallback global</span>
                        <input
                            type="checkbox"
                            checked={configForm.autoDistributionFallbackGlobal}
                            onChange={(e) =>
                                setConfigForm((prev) => ({
                                    ...prev,
                                    autoDistributionFallbackGlobal: e.target.checked,
                                }))
                            }
                            className="mr-2 align-middle"
                        />
                        Em modo equipe, usar global se necessario
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="glass-card p-4">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Clientes ativos</p>
                    <p className="mt-2 text-2xl font-mono font-bold text-text-primary">{metrics.clientesAtivos}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Processos ativos</p>
                    <p className="mt-2 text-2xl font-mono font-bold text-text-primary">{metrics.processosAtivos}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Prazos pendentes</p>
                    <p className="mt-2 text-2xl font-mono font-bold text-warning">{metrics.prazosPendentes}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Prazos vencidos</p>
                    <p className="mt-2 text-2xl font-mono font-bold text-danger">{metrics.prazosVencidos}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Atendimentos em aberto</p>
                    <p className="mt-2 text-2xl font-mono font-bold text-text-primary">{metrics.atendimentosAbertos}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Conversas abertas</p>
                    <p className="mt-2 text-2xl font-mono font-bold text-text-primary">{metrics.conversasAbertas}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Faturas atrasadas</p>
                    <p className="mt-2 text-2xl font-mono font-bold text-danger">{metrics.faturasAtrasadas}</p>
                </div>
                <div className="glass-card p-4">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Contas pendentes</p>
                    <p className="mt-2 text-2xl font-mono font-bold text-warning">{metrics.contasPendentes}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="glass-card overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border bg-bg-tertiary/30 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <MessageCircle size={15} className="text-warning" />
                            <h3 className="text-sm font-semibold text-text-primary">SLA de conversas</h3>
                        </div>
                        <Badge variant={metrics.slaConversasPendentes > 0 ? "danger" : "success"} dot>
                            {metrics.slaConversasPendentes} pendente(s)
                        </Badge>
                    </div>
                    <div className="max-h-[240px] overflow-auto p-3 space-y-2">
                        {slaConversas.length === 0 ? (
                            <p className="text-xs text-text-muted">Nenhuma conversa fora de SLA.</p>
                        ) : (
                            slaConversas.map((item) => (
                                <div key={item.conversationId} className="rounded-lg border border-border bg-bg-tertiary/30 p-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-medium text-text-primary">{item.clienteNome}</p>
                                        <Badge variant="danger">{item.ageMinutes} min</Badge>
                                    </div>
                                    <p className="text-[11px] text-text-muted">
                                        {item.canal} | limite {item.thresholdMinutes} min | {item.atendente}
                                    </p>
                                    {item.preview && (
                                        <p className="mt-1 truncate text-[11px] text-text-secondary">{item.preview}</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    <div className="border-t border-border px-4 py-2">
                        <Link href="/comunicacao" className="text-xs text-accent hover:underline">
                            Abrir central de comunicacao
                        </Link>
                    </div>
                </div>

                <div className="glass-card overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border bg-bg-tertiary/30 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <Handshake size={15} className="text-warning" />
                            <h3 className="text-sm font-semibold text-text-primary">SLA de atendimentos</h3>
                        </div>
                        <Badge variant={metrics.slaAtendimentosPendentes > 0 ? "danger" : "success"} dot>
                            {metrics.slaAtendimentosPendentes} pendente(s)
                        </Badge>
                    </div>
                    <div className="max-h-[240px] overflow-auto p-3 space-y-2">
                        {slaAtendimentos.length === 0 ? (
                            <p className="text-xs text-text-muted">Nenhum atendimento fora de SLA.</p>
                        ) : (
                            slaAtendimentos.map((item) => (
                                <div key={item.atendimentoId} className="rounded-lg border border-border bg-bg-tertiary/30 p-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-medium text-text-primary">{item.clienteNome}</p>
                                        <Badge variant="danger">{item.motivo}</Badge>
                                    </div>
                                    <p className="text-[11px] text-text-muted">{item.assunto}</p>
                                    <p className="text-[11px] text-text-secondary">Resp.: {item.advogadoNome}</p>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="border-t border-border px-4 py-2">
                        <Link href="/atendimentos" className="text-xs text-accent hover:underline">
                            Abrir funil de atendimentos
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-[1.4fr_1fr] gap-4">
                <div className="glass-card overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border bg-bg-tertiary/30 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <ArrowRightLeft size={15} className="text-accent" />
                            <h3 className="text-sm font-semibold text-text-primary">Distribuição de processos</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="muted">{processos.length} em monitoramento</Badge>
                            <Button size="xs" variant="outline" onClick={handleAutoDistribuir} disabled={autoDistributing}>
                                {autoDistributing ? <Loader2 size={12} className="animate-spin" /> : "Auto distribuir"}
                            </Button>
                        </div>
                    </div>
                    <div className="max-h-[560px] overflow-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-bg-tertiary/20">
                                    <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Processo</th>
                                    <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Cliente</th>
                                    <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Atual</th>
                                    <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Redistribuir</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processos.map((processo) => (
                                    <tr key={processo.id} className="border-b border-border/70 last:border-0">
                                        <td className="px-4 py-3">
                                            <p className="text-xs font-mono text-text-secondary">
                                                {processo.numeroCnj || "Sem CNJ"}
                                            </p>
                                            <p className="max-w-[320px] truncate text-xs text-text-muted">
                                                {processo.objeto || "Sem descricao"}
                                            </p>
                                            <p className="mt-1 text-[10px] uppercase text-text-muted">
                                                {formatProcessoStatus(processo.status)}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-text-primary">{processo.cliente?.nome || "Sem cliente"}</td>
                                        <td className="px-4 py-3 text-xs text-text-primary">{processo.advogado?.user?.name || "Sem advogado"}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={
                                                        destinoPorProcesso[processo.id] ||
                                                        processo.sugestaoAdvogadoId ||
                                                        processo.advogadoId
                                                    }
                                                    onChange={(e) =>
                                                        setDestinoPorProcesso((prev) => ({
                                                            ...prev,
                                                            [processo.id]: e.target.value,
                                                        }))
                                                    }
                                                    className="h-8 rounded-lg border border-border bg-bg-tertiary px-2 text-xs text-text-primary outline-none"
                                                >
                                                    {advogados.map((advogado) => (
                                                        <option key={advogado.id} value={advogado.id}>
                                                            {advogado.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                                {processo.sugestaoAdvogadoNome &&
                                                    processo.sugestaoAdvogadoId !== processo.advogadoId && (
                                                        <Badge
                                                            variant={processo.sugestaoMatchEspecialidade ? "success" : "info"}
                                                        >
                                                            Sug.: {processo.sugestaoAdvogadoNome}
                                                        </Badge>
                                                    )}
                                                {processo.sugestaoAdvogadoNome &&
                                                    processo.sugestaoAdvogadoId !== processo.advogadoId && (
                                                        <Badge variant="muted">
                                                            {processo.sugestaoOrigem === "FALLBACK_GLOBAL"
                                                                ? "fallback global"
                                                                : (processo.sugestaoOrigem || "global").toLowerCase()}
                                                        </Badge>
                                                    )}
                                                <Button
                                                    size="xs"
                                                    variant="outline"
                                                    onClick={() => handleAtribuir(processo.id, processo.advogadoId)}
                                                    disabled={savingProcessoId === processo.id}
                                                >
                                                    Salvar
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <OperacoesSidebar
                    advogados={advogados}
                    historicoFiltrado={historicoFiltrado}
                    atribuicoesRecentes={atribuicoesRecentes}
                    historicoPaginado={historicoPaginado}
                    histTipoFiltro={histTipoFiltro}
                    setHistTipoFiltro={setHistTipoFiltro}
                    histModoFiltro={histModoFiltro}
                    setHistModoFiltro={setHistModoFiltro}
                    histPeriodoFiltro={histPeriodoFiltro}
                    setHistPeriodoFiltro={setHistPeriodoFiltro}
                    histBusca={histBusca}
                    setHistBusca={setHistBusca}
                    histPagina={histPagina}
                    setHistPagina={setHistPagina}
                    historicoTotalPaginas={historicoTotalPaginas}
                    onResetFiltros={handleResetHistoricoFiltros}
                    onCopiarLink={handleCopiarLinkHistorico}
                    onExportCsv={handleExportHistoricoCsv}
                    onExportXlsx={handleExportHistoricoXlsx}
                    onExportResumoCsv={handleExportResumoGerencialCsv}
                />
            </div>

            <OperacoesAuditoriaPanel
                advogados={advogados}
                auditoriaPeriodo={auditoriaPeriodo}
                setAuditoriaPeriodo={setAuditoriaPeriodo}
                auditoriaAdvogadoId={auditoriaAdvogadoId}
                setAuditoriaAdvogadoId={setAuditoriaAdvogadoId}
                auditoriaAutoRefresh={auditoriaAutoRefresh}
                setAuditoriaAutoRefresh={setAuditoriaAutoRefresh}
                auditoriaFiltrada={auditoriaFiltrada}
                auditoriaAnalitica={auditoriaAnalitica}
                onAtualizar={handleAtualizarAuditoria}
            />

            <OperacoesBenchmarkPanel />
        </div>
    );
}
