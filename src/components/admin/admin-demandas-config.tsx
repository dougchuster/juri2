"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, PlayCircle, Pencil, Trash2, Settings2, Sparkles } from "lucide-react";
import {
    aplicarAcaoLoteRegrasDemandas,
    deletePlanejamentoAgendadoEscopoDemandas,
    deleteRegraRotinaDemandas,
    deleteTemplateRotinaDemandas,
    executarPlanejamentoAgendadoDemandas,
    executarRegrasGeracaoRotinasDemandas,
    salvarPlanejamentoAgendadoEscopoDemandas,
    salvarRegraRotinaDemandas,
    salvarTemplateRotinaDemandas,
    updatePlanejamentoAgendadoConfigDemandas,
} from "@/actions/demandas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { useRouter } from "next/navigation";
import type {
    DemandaPlanejamentoAgendadoConfig,
    DemandaPlanejamentoAgendadoEscopo,
    DemandaRotinaRegra,
    DemandaRotinaTemplate,
} from "@/lib/types/demandas";

interface DemandaEfetividadeRegraPeriodoItem {
    regraId: string;
    regraNome: string;
    templateId: string;
    templateNome: string | null;
    execucoes: number;
    simulacoes: number;
    criadas: number;
    atualizadas: number;
    ignoradas: number;
    taxaCriacao: number;
    taxaIgnorada: number;
}

interface TimeOption {
    id: string;
    nome: string;
}

interface AdminDemandasConfigProps {
    templates: DemandaRotinaTemplate[];
    regras: DemandaRotinaRegra[];
    planejamentoAgendadoConfig: DemandaPlanejamentoAgendadoConfig;
    times: TimeOption[];
    areaOptions: { value: string; label: string }[];
    canManage: boolean;
    efetividadeByPeriodo: {
        "7d": DemandaEfetividadeRegraPeriodoItem[];
        "30d": DemandaEfetividadeRegraPeriodoItem[];
        "90d": DemandaEfetividadeRegraPeriodoItem[];
    };
}

const papelOptions = [
    { value: "AUTO", label: "Auto (todos)" },
    { value: "ADVOGADO", label: "Advogado" },
    { value: "ASSISTENTE", label: "Assistente" },
    { value: "CONTROLADOR", label: "Controlador" },
    { value: "FINANCEIRO", label: "Financeiro" },
    { value: "SECRETARIA", label: "Secretaria" },
    { value: "SOCIO", label: "Socio" },
    { value: "ADMIN", label: "Admin" },
];

export function AdminDemandasConfig({
    templates,
    regras,
    planejamentoAgendadoConfig,
    times,
    areaOptions,
    canManage,
    efetividadeByPeriodo,
}: AdminDemandasConfigProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [runSummary, setRunSummary] = useState<{
        simulado: boolean;
        regrasAvaliadas: number;
        rotinasCriadas: number;
        rotinasAtualizadas: number;
        ignoradas: number;
        porRegra: Array<{
            regraId: string;
            regraNome: string;
            templateId: string;
            templateNome: string | null;
            elegiveis: number;
            criadas: number;
            atualizadas: number;
            ignoradas: number;
            observacoes: string[];
        }>;
    } | null>(null);
    const [selectedRegraIds, setSelectedRegraIds] = useState<string[]>([]);
    const [efetividadePeriodo, setEfetividadePeriodo] = useState<"7d" | "30d" | "90d">("30d");

    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [templateForm, setTemplateForm] = useState({
        nome: "",
        descricao: "",
        area: "TODAS",
        papelResponsavel: "AUTO",
        periodicidade: "SEMANAL",
        diaSemana: "1",
        diaMes: "1",
        prioridade: "NORMAL",
        slaDias: "1",
        checklistText: "",
    });

    const [editingRegraId, setEditingRegraId] = useState<string | null>(null);
    const [regraForm, setRegraForm] = useState({
        nome: "",
        templateId: "",
        ativo: true,
        papelResponsavel: "AUTO",
        timeId: "",
        areaOverride: "TODAS",
        periodicidadeOverride: "AUTO",
        prioridadeOverride: "AUTO",
        slaDiasOverride: "",
    });
    const [planejamentoEnabled, setPlanejamentoEnabled] = useState(
        planejamentoAgendadoConfig.enabled
    );
    const [editingEscopoId, setEditingEscopoId] = useState<string | null>(null);
    const [escopoForm, setEscopoForm] = useState({
        nome: "",
        ativo: true,
        area: "TODAS",
        timeId: "",
        hora: "7",
        minuto: "5",
        periodoDias: "30",
        incluirRedistribuicao: true,
        maxResponsaveis: "6",
    });

    const timeOptions = useMemo(
        () => times.map((item) => ({ value: item.id, label: item.nome })),
        [times]
    );
    const templateOptions = useMemo(
        () => templates.map((item) => ({ value: item.id, label: item.nome })),
        [templates]
    );
    const metricasRegras = useMemo(() => {
        return regras.reduce(
            (acc, regra) => {
                acc.totalRegras += 1;
                if (regra.ativo) acc.regrasAtivas += 1;
                acc.totalExecucoes += regra.totalExecucoes || 0;
                acc.totalSimulacoes += regra.totalSimulacoes || 0;
                acc.totalCriadas += regra.totalCriadas || 0;
                acc.totalAtualizadas += regra.totalAtualizadas || 0;
                acc.totalIgnoradas += regra.totalIgnoradas || 0;
                return acc;
            },
            {
                totalRegras: 0,
                regrasAtivas: 0,
                totalExecucoes: 0,
                totalSimulacoes: 0,
                totalCriadas: 0,
                totalAtualizadas: 0,
                totalIgnoradas: 0,
            }
        );
    }, [regras]);
    const allRegrasSelected = useMemo(
        () => regras.length > 0 && selectedRegraIds.length === regras.length,
        [regras.length, selectedRegraIds.length]
    );
    const efetividadeAtual = useMemo(
        () => efetividadeByPeriodo[efetividadePeriodo] || [],
        [efetividadeByPeriodo, efetividadePeriodo]
    );
    const escoposPlanejamento = useMemo(
        () =>
            [...(planejamentoAgendadoConfig.escopos || [])].sort((a, b) => {
                if (a.hora !== b.hora) return a.hora - b.hora;
                if (a.minuto !== b.minuto) return a.minuto - b.minuto;
                return a.nome.localeCompare(b.nome);
            }),
        [planejamentoAgendadoConfig.escopos]
    );
    const metricasPlanejamento = useMemo(() => {
        return escoposPlanejamento.reduce(
            (acc, escopo) => {
                acc.total += 1;
                if (escopo.ativo) acc.ativos += 1;
                if (escopo.ultimaFalhaEm) acc.comFalha += 1;
                acc.execucoes += escopo.totalExecucoes || 0;
                acc.falhas += escopo.totalFalhas || 0;
                return acc;
            },
            { total: 0, ativos: 0, comFalha: 0, execucoes: 0, falhas: 0 }
        );
    }, [escoposPlanejamento]);

    function resetTemplateForm() {
        setEditingTemplateId(null);
        setTemplateForm({
            nome: "",
            descricao: "",
            area: "TODAS",
            papelResponsavel: "AUTO",
            periodicidade: "SEMANAL",
            diaSemana: "1",
            diaMes: "1",
            prioridade: "NORMAL",
            slaDias: "1",
            checklistText: "",
        });
    }

    function resetRegraForm() {
        setEditingRegraId(null);
        setRegraForm({
            nome: "",
            templateId: "",
            ativo: true,
            papelResponsavel: "AUTO",
            timeId: "",
            areaOverride: "TODAS",
            periodicidadeOverride: "AUTO",
            prioridadeOverride: "AUTO",
            slaDiasOverride: "",
        });
    }

    function resetEscopoForm() {
        setEditingEscopoId(null);
        setEscopoForm({
            nome: "",
            ativo: true,
            area: "TODAS",
            timeId: "",
            hora: "7",
            minuto: "5",
            periodoDias: "30",
            incluirRedistribuicao: true,
            maxResponsaveis: "6",
        });
    }

    function parseChecklist(text: string) {
        return text
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean);
    }

    function handleSalvarConfigPlanejamento(enabled: boolean) {
        setError(null);
        setFeedback(null);
        startTransition(async () => {
            const result = await updatePlanejamentoAgendadoConfigDemandas({ enabled });
            if (!result.success) {
                setError(result.error || "Falha ao salvar configuracao de planejamento.");
                return;
            }
            setPlanejamentoEnabled(enabled);
            setFeedback(
                `Agendamento de planejamento ${enabled ? "ativado" : "desativado"} com sucesso.`
            );
            router.refresh();
        });
    }

    function handleSalvarEscopoPlanejamento() {
        setError(null);
        setFeedback(null);
        startTransition(async () => {
            const result = await salvarPlanejamentoAgendadoEscopoDemandas({
                id: editingEscopoId || undefined,
                nome: escopoForm.nome,
                ativo: escopoForm.ativo,
                area: escopoForm.area,
                timeId: escopoForm.timeId,
                hora: Number(escopoForm.hora),
                minuto: Number(escopoForm.minuto),
                periodoDias: Number(escopoForm.periodoDias),
                incluirRedistribuicao: escopoForm.incluirRedistribuicao,
                maxResponsaveis: Number(escopoForm.maxResponsaveis),
            });
            if (!result.success) {
                setError(result.error || "Falha ao salvar escopo.");
                return;
            }
            setFeedback(editingEscopoId ? "Escopo atualizado." : "Escopo criado.");
            resetEscopoForm();
            router.refresh();
        });
    }

    function handleEditarEscopoPlanejamento(escopo: DemandaPlanejamentoAgendadoEscopo) {
        setEditingEscopoId(escopo.id);
        setEscopoForm({
            nome: escopo.nome,
            ativo: escopo.ativo,
            area: escopo.area,
            timeId: escopo.timeId || "",
            hora: String(escopo.hora),
            minuto: String(escopo.minuto),
            periodoDias: String(escopo.periodoDias),
            incluirRedistribuicao: escopo.incluirRedistribuicao,
            maxResponsaveis: String(escopo.maxResponsaveis),
        });
    }

    function handleExcluirEscopoPlanejamento(id: string) {
        setError(null);
        setFeedback(null);
        startTransition(async () => {
            const result = await deletePlanejamentoAgendadoEscopoDemandas(id);
            if (!result.success) {
                setError(result.error || "Falha ao excluir escopo.");
                return;
            }
            if (editingEscopoId === id) resetEscopoForm();
            setFeedback("Escopo excluido.");
            router.refresh();
        });
    }

    function handleExecutarPlanejamentoAgendado(simular: boolean) {
        setError(null);
        setFeedback(null);
        startTransition(async () => {
            const result = await executarPlanejamentoAgendadoDemandas({
                modo: "MANUAL",
                force: true,
                simular,
            });
            if (!result.success) {
                setError(result.error || "Falha ao executar planejamento agendado.");
                return;
            }
            setFeedback(
                `${simular ? "Simulacao" : "Execucao"} concluida: ${
                    result.result?.executados || 0
                } escopo(s) executado(s), ${result.result?.avaliados || 0} avaliado(s).`
            );
            router.refresh();
        });
    }

    function handleSaveTemplate() {
        setError(null);
        setFeedback(null);
        startTransition(async () => {
            const result = await salvarTemplateRotinaDemandas({
                id: editingTemplateId || undefined,
                nome: templateForm.nome,
                descricao: templateForm.descricao,
                area: templateForm.area,
                papelResponsavel: templateForm.papelResponsavel,
                periodicidade: templateForm.periodicidade as "DIARIA" | "SEMANAL" | "MENSAL",
                diaSemana: Number(templateForm.diaSemana),
                diaMes: Number(templateForm.diaMes),
                prioridade: templateForm.prioridade as "URGENTE" | "ALTA" | "NORMAL" | "BAIXA",
                slaDias: Number(templateForm.slaDias),
                checklist: parseChecklist(templateForm.checklistText),
            });
            if (!result.success) {
                setError(result.error || "Falha ao salvar template.");
                return;
            }
            setFeedback(editingTemplateId ? "Template atualizado." : "Template criado.");
            resetTemplateForm();
            router.refresh();
        });
    }

    function handleEditTemplate(template: DemandaRotinaTemplate) {
        setEditingTemplateId(template.id);
        setTemplateForm({
            nome: template.nome,
            descricao: template.descricao || "",
            area: template.area,
            papelResponsavel: template.papelResponsavel,
            periodicidade: template.periodicidade,
            diaSemana: String(template.diaSemana ?? 1),
            diaMes: String(template.diaMes ?? 1),
            prioridade: template.prioridade,
            slaDias: String(template.slaDias),
            checklistText: template.checklist.join("\n"),
        });
    }

    function handleDeleteTemplate(id: string) {
        setError(null);
        setFeedback(null);
        startTransition(async () => {
            const result = await deleteTemplateRotinaDemandas(id);
            if (!result.success) {
                setError(result.error || "Falha ao excluir template.");
                return;
            }
            if (editingTemplateId === id) resetTemplateForm();
            setFeedback("Template excluido.");
            router.refresh();
        });
    }

    function handleSaveRegra() {
        setError(null);
        setFeedback(null);
        startTransition(async () => {
            const result = await salvarRegraRotinaDemandas({
                id: editingRegraId || undefined,
                nome: regraForm.nome,
                templateId: regraForm.templateId,
                ativo: regraForm.ativo,
                papelResponsavel: regraForm.papelResponsavel,
                timeId: regraForm.timeId,
                areaOverride: regraForm.areaOverride,
                periodicidadeOverride: regraForm.periodicidadeOverride,
                prioridadeOverride: regraForm.prioridadeOverride,
                slaDiasOverride:
                    regraForm.slaDiasOverride.trim() === ""
                        ? undefined
                        : Number(regraForm.slaDiasOverride),
            });
            if (!result.success) {
                setError(result.error || "Falha ao salvar regra.");
                return;
            }
            setFeedback(editingRegraId ? "Regra atualizada." : "Regra criada.");
            resetRegraForm();
            router.refresh();
        });
    }

    function handleEditRegra(regra: DemandaRotinaRegra) {
        setEditingRegraId(regra.id);
        setRegraForm({
            nome: regra.nome,
            templateId: regra.templateId,
            ativo: regra.ativo,
            papelResponsavel: regra.papelResponsavel,
            timeId: regra.timeId || "",
            areaOverride: regra.areaOverride,
            periodicidadeOverride: regra.periodicidadeOverride,
            prioridadeOverride: regra.prioridadeOverride,
            slaDiasOverride:
                regra.slaDiasOverride === null || regra.slaDiasOverride === undefined
                    ? ""
                    : String(regra.slaDiasOverride),
        });
    }

    function handleDeleteRegra(id: string) {
        setError(null);
        setFeedback(null);
        startTransition(async () => {
            const result = await deleteRegraRotinaDemandas(id);
            if (!result.success) {
                setError(result.error || "Falha ao excluir regra.");
                return;
            }
            if (editingRegraId === id) resetRegraForm();
            setFeedback("Regra excluida.");
            router.refresh();
        });
    }

    function toggleAllRegras() {
        if (allRegrasSelected) {
            setSelectedRegraIds([]);
            return;
        }
        setSelectedRegraIds(regras.map((item) => item.id));
    }

    function toggleRegra(id: string) {
        setSelectedRegraIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    }

    function handleLoteRegras(acao: "ATIVAR" | "PAUSAR") {
        setError(null);
        setFeedback(null);
        if (selectedRegraIds.length === 0) {
            setError("Selecione ao menos uma regra para aplicar acao em lote.");
            return;
        }

        startTransition(async () => {
            const result = await aplicarAcaoLoteRegrasDemandas({
                ids: selectedRegraIds,
                acao,
            });
            if (!result.success) {
                setError(result.error || "Falha ao executar lote de regras.");
                return;
            }
            setFeedback(
                `Lote de regras concluido. Regras afetadas: ${Number(result.afetadas || 0)}.`
            );
            setSelectedRegraIds([]);
            router.refresh();
        });
    }

    function handleRunRulesNow(simular: boolean) {
        setError(null);
        setFeedback(null);
        startTransition(async () => {
            const result = await executarRegrasGeracaoRotinasDemandas({ modo: "MANUAL", simular });
            if (!result.success) {
                setError(result.error || "Falha ao executar regras.");
                return;
            }
            setRunSummary({
                simulado: Boolean(result.result?.simulado),
                regrasAvaliadas: Number(result.result?.regrasAvaliadas || 0),
                rotinasCriadas: Number(result.result?.rotinasCriadas || 0),
                rotinasAtualizadas: Number(result.result?.rotinasAtualizadas || 0),
                ignoradas: Number(result.result?.ignoradas || 0),
                porRegra: Array.isArray(result.result?.porRegra)
                    ? (result.result?.porRegra as Array<{
                          regraId: string;
                          regraNome: string;
                          templateId: string;
                          templateNome: string | null;
                          elegiveis: number;
                          criadas: number;
                          atualizadas: number;
                          ignoradas: number;
                          observacoes: string[];
                      }>)
                    : [],
            });
            setFeedback(
                `${simular ? "Simulacao" : "Execucao"} de regras: ${
                    result.result?.regrasAvaliadas || 0
                } avaliadas; ${result.result?.rotinasCriadas || 0} criadas; ${
                    result.result?.rotinasAtualizadas || 0
                } atualizadas; ${result.result?.ignoradas || 0} ignoradas.`
            );
            router.refresh();
        });
    }

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="font-display text-2xl font-bold text-text-primary">Admin de Demandas</h1>
                    <p className="text-sm text-text-muted mt-1">
                        Biblioteca de templates e regras automaticas de geracao de rotinas por equipe/area.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRunRulesNow(true)}
                        disabled={isPending || !canManage}
                    >
                        {isPending ? (
                            <>
                                <Loader2 size={14} className="animate-spin" /> Simulando...
                            </>
                        ) : (
                            <>
                                <Sparkles size={14} /> Simular regras
                            </>
                        )}
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRunRulesNow(false)}
                        disabled={isPending || !canManage}
                    >
                        {isPending ? (
                            <>
                                <Loader2 size={14} className="animate-spin" /> Executando...
                            </>
                        ) : (
                            <>
                                <PlayCircle size={14} /> Rodar regras agora
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                    {error}
                </div>
            )}
            {feedback && (
                <div className="rounded-lg border border-border bg-bg-tertiary/30 px-3 py-2 text-xs text-text-secondary">
                    {feedback}
                </div>
            )}
            {!canManage && (
                <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                    Permissao insuficiente para alterar templates/regras ou executar simulacao manual.
                    Perfis permitidos: ADMIN, SOCIO e CONTROLADOR.
                </div>
            )}

            <section className="glass-card p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h2 className="text-sm font-semibold text-text-primary">
                            Agendamento do planejamento diario IA
                        </h2>
                        <p className="text-xs text-text-muted mt-1">
                            Escopos por area/equipe com execucao automatica em horario definido.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleExecutarPlanejamentoAgendado(true)}
                            disabled={isPending || !canManage}
                        >
                            <Sparkles size={12} /> Simular agora
                        </Button>
                        <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => handleExecutarPlanejamentoAgendado(false)}
                            disabled={isPending || !canManage}
                        >
                            <PlayCircle size={12} /> Rodar agora
                        </Button>
                    </div>
                </div>

                <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                    <input
                        type="checkbox"
                        checked={planejamentoEnabled}
                        onChange={(e) => {
                            const enabled = e.target.checked;
                            setPlanejamentoEnabled(enabled);
                            handleSalvarConfigPlanejamento(enabled);
                        }}
                        disabled={isPending || !canManage}
                    />
                    Ativar execucao automatica do planejamento por horario
                </label>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div className="rounded-lg border border-border bg-bg-tertiary/20 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-text-muted">Escopos</p>
                        <p className="font-mono text-lg text-text-primary">{metricasPlanejamento.total}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-bg-tertiary/20 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-text-muted">Ativos</p>
                        <p className="font-mono text-lg text-success">{metricasPlanejamento.ativos}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-bg-tertiary/20 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-text-muted">Com falha</p>
                        <p className="font-mono text-lg text-danger">{metricasPlanejamento.comFalha}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-bg-tertiary/20 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-text-muted">Execucoes</p>
                        <p className="font-mono text-lg text-info">{metricasPlanejamento.execucoes}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-bg-tertiary/20 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-text-muted">Falhas</p>
                        <p className="font-mono text-lg text-warning">{metricasPlanejamento.falhas}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
                    <Input
                        id="escopo-nome"
                        label="Nome do escopo"
                        value={escopoForm.nome}
                        onChange={(e) => setEscopoForm((prev) => ({ ...prev, nome: e.target.value }))}
                    />
                    <Select
                        id="escopo-area"
                        label="Area"
                        options={areaOptions}
                        value={escopoForm.area}
                        onChange={(e) => setEscopoForm((prev) => ({ ...prev, area: e.target.value }))}
                    />
                    <Select
                        id="escopo-time"
                        label="Equipe (opcional)"
                        options={timeOptions}
                        placeholder="Todas"
                        value={escopoForm.timeId}
                        onChange={(e) => setEscopoForm((prev) => ({ ...prev, timeId: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <Input
                            id="escopo-hora"
                            label="Hora"
                            type="number"
                            min={0}
                            max={23}
                            value={escopoForm.hora}
                            onChange={(e) =>
                                setEscopoForm((prev) => ({ ...prev, hora: e.target.value }))
                            }
                        />
                        <Input
                            id="escopo-minuto"
                            label="Minuto"
                            type="number"
                            min={0}
                            max={59}
                            value={escopoForm.minuto}
                            onChange={(e) =>
                                setEscopoForm((prev) => ({ ...prev, minuto: e.target.value }))
                            }
                        />
                    </div>
                    <Input
                        id="escopo-periodo"
                        label="Periodo de analise (dias)"
                        type="number"
                        min={7}
                        max={120}
                        value={escopoForm.periodoDias}
                        onChange={(e) =>
                            setEscopoForm((prev) => ({ ...prev, periodoDias: e.target.value }))
                        }
                    />
                    <Input
                        id="escopo-max-responsaveis"
                        label="Maximo de responsaveis"
                        type="number"
                        min={1}
                        max={12}
                        value={escopoForm.maxResponsaveis}
                        onChange={(e) =>
                            setEscopoForm((prev) => ({ ...prev, maxResponsaveis: e.target.value }))
                        }
                    />
                    <label className="inline-flex items-center gap-2 text-xs text-text-secondary mt-6">
                        <input
                            type="checkbox"
                            checked={escopoForm.incluirRedistribuicao}
                            onChange={(e) =>
                                setEscopoForm((prev) => ({
                                    ...prev,
                                    incluirRedistribuicao: e.target.checked,
                                }))
                            }
                        />
                        Incluir redistribuicao no planejamento
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs text-text-secondary mt-6">
                        <input
                            type="checkbox"
                            checked={escopoForm.ativo}
                            onChange={(e) =>
                                setEscopoForm((prev) => ({ ...prev, ativo: e.target.checked }))
                            }
                        />
                        Escopo ativo
                    </label>
                </div>

                <div className="flex justify-end gap-2">
                    {editingEscopoId && (
                        <Button
                            size="xs"
                            variant="ghost"
                            onClick={resetEscopoForm}
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                    )}
                    <Button
                        size="xs"
                        onClick={handleSalvarEscopoPlanejamento}
                        disabled={isPending || !canManage || escopoForm.nome.trim().length < 3}
                    >
                        {editingEscopoId ? "Atualizar escopo" : "Salvar escopo"}
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px]">
                        <thead>
                            <tr className="border-b border-border bg-bg-tertiary/20">
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Escopo</th>
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Area/Equipe</th>
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Horario</th>
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Config</th>
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Saude</th>
                                <th className="px-3 py-2 text-right text-[11px] uppercase tracking-wider text-text-muted">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {escoposPlanejamento.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-text-muted">
                                        Nenhum escopo de planejamento agendado.
                                    </td>
                                </tr>
                            ) : (
                                escoposPlanejamento.map((escopo) => {
                                    const team = times.find((item) => item.id === escopo.timeId);
                                    return (
                                        <tr key={escopo.id} className="border-b border-border last:border-0">
                                            <td className="px-3 py-2.5 text-sm text-text-primary">{escopo.nome}</td>
                                            <td className="px-3 py-2.5 text-xs text-text-secondary">
                                                {escopo.area}
                                                {team ? ` - ${team.nome}` : ""}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-text-secondary">
                                                {String(escopo.hora).padStart(2, "0")}:{String(escopo.minuto).padStart(2, "0")}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-text-secondary">
                                                {escopo.periodoDias}d - max {escopo.maxResponsaveis}
                                                <div>
                                                    <Badge variant={escopo.ativo ? "success" : "muted"}>
                                                        {escopo.ativo ? "Ativo" : "Pausado"}
                                                    </Badge>
                                                    {escopo.incluirRedistribuicao && (
                                                        <Badge variant="info" className="ml-1">
                                                            Redistribuicao
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-text-muted">
                                                <div>
                                                    Ult. exec:{" "}
                                                    {escopo.ultimaExecucaoEm
                                                        ? new Date(escopo.ultimaExecucaoEm).toLocaleString("pt-BR")
                                                        : "-"}
                                                </div>
                                                <div>
                                                    Ult. sim:{" "}
                                                    {escopo.ultimaSimulacaoEm
                                                        ? new Date(escopo.ultimaSimulacaoEm).toLocaleString("pt-BR")
                                                        : "-"}
                                                </div>
                                                <div>
                                                    Exec/Falhas: {escopo.totalExecucoes || 0} / {escopo.totalFalhas || 0}
                                                </div>
                                                {escopo.ultimaFalhaEm && (
                                                    <div className="mt-1 rounded border border-danger/40 bg-danger/10 px-1.5 py-1 text-danger">
                                                        Falha: {new Date(escopo.ultimaFalhaEm).toLocaleString("pt-BR")}
                                                        {escopo.ultimaFalhaMensagem ? ` - ${escopo.ultimaFalhaMensagem}` : ""}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <Button
                                                    size="xs"
                                                    variant="ghost"
                                                    onClick={() => handleEditarEscopoPlanejamento(escopo)}
                                                    disabled={isPending || !canManage}
                                                >
                                                    <Pencil size={12} /> Editar
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    variant="ghost"
                                                    onClick={() => handleExcluirEscopoPlanejamento(escopo.id)}
                                                    disabled={isPending || !canManage}
                                                    className="ml-1 text-danger hover:text-danger"
                                                >
                                                    <Trash2 size={12} /> Excluir
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                <div className="rounded-lg border border-border bg-bg-tertiary/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Regras</p>
                    <p className="font-mono text-lg text-text-primary">{metricasRegras.totalRegras}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-tertiary/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Ativas</p>
                    <p className="font-mono text-lg text-success">{metricasRegras.regrasAtivas}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-tertiary/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Execucoes</p>
                    <p className="font-mono text-lg text-text-primary">{metricasRegras.totalExecucoes}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-tertiary/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Simulacoes</p>
                    <p className="font-mono text-lg text-info">{metricasRegras.totalSimulacoes}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-tertiary/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Criadas</p>
                    <p className="font-mono text-lg text-success">{metricasRegras.totalCriadas}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-tertiary/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Atualizadas</p>
                    <p className="font-mono text-lg text-accent">{metricasRegras.totalAtualizadas}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-tertiary/20 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">Ignoradas</p>
                    <p className="font-mono text-lg text-warning">{metricasRegras.totalIgnoradas}</p>
                </div>
            </section>

            <section className="glass-card p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-text-primary">
                        Efetividade por regra (janela)
                    </h2>
                    <div className="flex items-center gap-1.5">
                        {(["7d", "30d", "90d"] as const).map((periodo) => (
                            <button
                                key={periodo}
                                type="button"
                                onClick={() => setEfetividadePeriodo(periodo)}
                                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                    efetividadePeriodo === periodo
                                        ? "border-accent bg-accent/15 text-accent"
                                        : "border-border text-text-muted hover:border-border-hover hover:text-text-primary"
                                }`}
                            >
                                {periodo}
                            </button>
                        ))}
                    </div>
                </div>
                {efetividadeAtual.length === 0 ? (
                    <p className="text-xs text-text-muted">
                        Sem dados de execucao/simulacao na janela selecionada.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {efetividadeAtual.slice(0, 8).map((item) => {
                            const volume = item.criadas + item.atualizadas + item.ignoradas;
                            const widthCriada = Math.max(4, Math.round(item.taxaCriacao));
                            const widthIgnorada = Math.max(2, Math.round(item.taxaIgnorada));
                            return (
                                <div key={item.regraId} className="rounded-lg border border-border bg-bg-tertiary/20 p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-xs font-medium text-text-primary">{item.regraNome}</p>
                                        <span className="text-[11px] text-text-muted">
                                            Exec: {item.execucoes} | Sim: {item.simulacoes} | Vol: {volume}
                                        </span>
                                    </div>
                                    <div className="mt-2 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-center">
                                        <div className="h-2 rounded-full bg-bg-primary overflow-hidden">
                                            <div className="h-full bg-success" style={{ width: `${widthCriada}%` }} />
                                        </div>
                                        <span className="text-[11px] text-success">
                                            Taxa criacao: {item.taxaCriacao}%
                                        </span>
                                    </div>
                                    <div className="mt-1 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-center">
                                        <div className="h-2 rounded-full bg-bg-primary overflow-hidden">
                                            <div className="h-full bg-warning" style={{ width: `${widthIgnorada}%` }} />
                                        </div>
                                        <span className="text-[11px] text-warning">
                                            Taxa ignorada: {item.taxaIgnorada}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            <section className="glass-card p-4 space-y-3">
                <h2 className="text-sm font-semibold text-text-primary">Matriz de permissoes do modulo</h2>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                        <thead>
                            <tr className="border-b border-border bg-bg-tertiary/20">
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Acao</th>
                                <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Admin</th>
                                <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Socio</th>
                                <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Controlador</th>
                                <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Advogado</th>
                                <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Demais papeis</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                ["Rodar regras (manual)", "sim", "sim", "sim", "nao", "nao"],
                                ["Simular regras", "sim", "sim", "sim", "nao", "nao"],
                                ["CRUD templates", "sim", "sim", "sim", "nao", "nao"],
                                ["CRUD regras", "sim", "sim", "sim", "nao", "nao"],
                                ["Lote ativar/pausar regras", "sim", "sim", "sim", "nao", "nao"],
                            ].map((row) => (
                                <tr key={row[0]} className="border-b border-border last:border-0">
                                    <td className="px-3 py-2.5 text-xs text-text-primary">{row[0]}</td>
                                    <td className="px-3 py-2.5 text-center text-xs">{row[1] === "sim" ? "✓" : "-"}</td>
                                    <td className="px-3 py-2.5 text-center text-xs">{row[2] === "sim" ? "✓" : "-"}</td>
                                    <td className="px-3 py-2.5 text-center text-xs">{row[3] === "sim" ? "✓" : "-"}</td>
                                    <td className="px-3 py-2.5 text-center text-xs">{row[4] === "sim" ? "✓" : "-"}</td>
                                    <td className="px-3 py-2.5 text-center text-xs">{row[5] === "sim" ? "✓" : "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="text-[11px] text-text-muted">
                    Observacao: aplicacao em lote de redistribuicao operacional continua permitida para
                    perfis com governanca de execucao no painel de demandas.
                </p>
            </section>

            {runSummary && (
                <section className="glass-card p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-text-primary">
                            Resultado {runSummary.simulado ? "da simulacao" : "da execucao"}
                        </h2>
                        <Badge variant={runSummary.simulado ? "info" : "success"}>
                            {runSummary.simulado ? "Simulado" : "Aplicado"}
                        </Badge>
                    </div>
                    <p className="text-xs text-text-muted">
                        Regras avaliadas: {runSummary.regrasAvaliadas}. Criadas: {runSummary.rotinasCriadas}.
                        Atualizadas: {runSummary.rotinasAtualizadas}. Ignoradas: {runSummary.ignoradas}.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr className="border-b border-border bg-bg-tertiary/20">
                                    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Regra</th>
                                    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Template</th>
                                    <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Elegiveis</th>
                                    <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Criadas</th>
                                    <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Atualizadas</th>
                                    <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-text-muted">Ignoradas</th>
                                    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Observacoes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {runSummary.porRegra.map((item) => (
                                    <tr key={item.regraId} className="border-b border-border last:border-0">
                                        <td className="px-3 py-2.5 text-xs text-text-primary">{item.regraNome}</td>
                                        <td className="px-3 py-2.5 text-xs text-text-secondary">
                                            {item.templateNome || "Template removido"}
                                        </td>
                                        <td className="px-3 py-2.5 text-center text-xs text-text-secondary">{item.elegiveis}</td>
                                        <td className="px-3 py-2.5 text-center text-xs text-success">{item.criadas}</td>
                                        <td className="px-3 py-2.5 text-center text-xs text-accent">{item.atualizadas}</td>
                                        <td className="px-3 py-2.5 text-center text-xs text-warning">{item.ignoradas}</td>
                                        <td className="px-3 py-2.5 text-xs text-text-muted">
                                            {item.observacoes.length > 0 ? item.observacoes.join(" | ") : "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            <section className="glass-card p-4 space-y-3">
                <h2 className="text-sm font-semibold text-text-primary">Templates de rotinas</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <Input
                        id="tpl-nome"
                        label="Nome do template"
                        value={templateForm.nome}
                        onChange={(e) => setTemplateForm((prev) => ({ ...prev, nome: e.target.value }))}
                    />
                    <Select
                        id="tpl-area"
                        label="Area"
                        options={areaOptions}
                        value={templateForm.area}
                        onChange={(e) => setTemplateForm((prev) => ({ ...prev, area: e.target.value }))}
                    />
                    <Select
                        id="tpl-papel"
                        label="Papel responsavel"
                        options={papelOptions}
                        value={templateForm.papelResponsavel}
                        onChange={(e) =>
                            setTemplateForm((prev) => ({ ...prev, papelResponsavel: e.target.value }))
                        }
                    />
                    <Select
                        id="tpl-periodicidade"
                        label="Periodicidade"
                        options={[
                            { value: "DIARIA", label: "Diaria" },
                            { value: "SEMANAL", label: "Semanal" },
                            { value: "MENSAL", label: "Mensal" },
                        ]}
                        value={templateForm.periodicidade}
                        onChange={(e) =>
                            setTemplateForm((prev) => ({ ...prev, periodicidade: e.target.value }))
                        }
                    />
                    <Input
                        id="tpl-dia-semana"
                        type="number"
                        min={0}
                        max={6}
                        label="Dia semana (0-6)"
                        value={templateForm.diaSemana}
                        onChange={(e) => setTemplateForm((prev) => ({ ...prev, diaSemana: e.target.value }))}
                    />
                    <Input
                        id="tpl-dia-mes"
                        type="number"
                        min={1}
                        max={28}
                        label="Dia mes (1-28)"
                        value={templateForm.diaMes}
                        onChange={(e) => setTemplateForm((prev) => ({ ...prev, diaMes: e.target.value }))}
                    />
                    <Select
                        id="tpl-prioridade"
                        label="Prioridade"
                        options={[
                            { value: "URGENTE", label: "Urgente" },
                            { value: "ALTA", label: "Alta" },
                            { value: "NORMAL", label: "Normal" },
                            { value: "BAIXA", label: "Baixa" },
                        ]}
                        value={templateForm.prioridade}
                        onChange={(e) => setTemplateForm((prev) => ({ ...prev, prioridade: e.target.value }))}
                    />
                    <Input
                        id="tpl-sla"
                        type="number"
                        min={0}
                        max={90}
                        label="SLA (dias)"
                        value={templateForm.slaDias}
                        onChange={(e) => setTemplateForm((prev) => ({ ...prev, slaDias: e.target.value }))}
                    />
                    <Textarea
                        id="tpl-descricao"
                        label="Descrição"
                        rows={3}
                        value={templateForm.descricao}
                        onChange={(e) => setTemplateForm((prev) => ({ ...prev, descricao: e.target.value }))}
                    />
                    <Textarea
                        id="tpl-checklist"
                        label="Checklist (uma linha por item)"
                        rows={3}
                        value={templateForm.checklistText}
                        onChange={(e) =>
                            setTemplateForm((prev) => ({ ...prev, checklistText: e.target.value }))
                        }
                    />
                </div>
                <div className="flex justify-end gap-2">
                    {editingTemplateId && (
                    <Button size="sm" variant="ghost" onClick={resetTemplateForm} disabled={isPending}>
                        Cancelar
                    </Button>
                )}
                <Button
                    size="sm"
                    onClick={handleSaveTemplate}
                    disabled={isPending || !canManage || templateForm.nome.trim().length < 3}
                >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                    {editingTemplateId ? "Atualizar template" : "Salvar template"}
                </Button>
            </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                        <thead>
                            <tr className="border-b border-border bg-bg-tertiary/20">
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Nome</th>
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Area</th>
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Periodicidade</th>
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Prioridade</th>
                                <th className="px-3 py-2 text-right text-[11px] uppercase tracking-wider text-text-muted">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {templates.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-3 py-8 text-center text-sm text-text-muted">
                                        Nenhum template configurado.
                                    </td>
                                </tr>
                            ) : (
                                templates.map((template) => (
                                    <tr key={template.id} className="border-b border-border last:border-0">
                                        <td className="px-3 py-2.5 text-sm text-text-primary">{template.nome}</td>
                                        <td className="px-3 py-2.5 text-xs text-text-secondary">{template.area}</td>
                                        <td className="px-3 py-2.5 text-xs text-text-secondary">
                                            {template.periodicidade}
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-text-secondary">
                                            {template.prioridade}
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <Button
                                                size="xs"
                                                variant="ghost"
                                                onClick={() => handleEditTemplate(template)}
                                                disabled={isPending || !canManage}
                                            >
                                                <Pencil size={12} /> Editar
                                            </Button>
                                            <Button
                                                size="xs"
                                                variant="ghost"
                                                onClick={() => handleDeleteTemplate(template.id)}
                                                disabled={isPending || !canManage}
                                                className="ml-1 text-danger hover:text-danger"
                                            >
                                                <Trash2 size={12} /> Excluir
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="glass-card p-4 space-y-3">
                <h2 className="text-sm font-semibold text-text-primary">Regras automaticas de geracao</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <Input
                        id="regra-nome"
                        label="Nome da regra"
                        value={regraForm.nome}
                        onChange={(e) => setRegraForm((prev) => ({ ...prev, nome: e.target.value }))}
                    />
                    <Select
                        id="regra-template"
                        label="Template base"
                        options={templateOptions}
                        value={regraForm.templateId}
                        onChange={(e) => setRegraForm((prev) => ({ ...prev, templateId: e.target.value }))}
                    />
                    <Select
                        id="regra-papel"
                        label="Perfil alvo"
                        options={papelOptions}
                        value={regraForm.papelResponsavel}
                        onChange={(e) =>
                            setRegraForm((prev) => ({ ...prev, papelResponsavel: e.target.value }))
                        }
                    />
                    <Select
                        id="regra-time"
                        label="Equipe (opcional)"
                        options={timeOptions}
                        placeholder="Todas as equipes"
                        value={regraForm.timeId}
                        onChange={(e) => setRegraForm((prev) => ({ ...prev, timeId: e.target.value }))}
                    />
                    <Select
                        id="regra-area"
                        label="Area override"
                        options={areaOptions}
                        value={regraForm.areaOverride}
                        onChange={(e) => setRegraForm((prev) => ({ ...prev, areaOverride: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <Select
                            id="regra-periodicidade"
                            label="Periodicidade"
                            options={[
                                { value: "AUTO", label: "Auto (template)" },
                                { value: "DIARIA", label: "Diaria" },
                                { value: "SEMANAL", label: "Semanal" },
                                { value: "MENSAL", label: "Mensal" },
                            ]}
                            value={regraForm.periodicidadeOverride}
                            onChange={(e) =>
                                setRegraForm((prev) => ({
                                    ...prev,
                                    periodicidadeOverride: e.target.value,
                                }))
                            }
                        />
                        <Select
                            id="regra-prioridade"
                            label="Prioridade"
                            options={[
                                { value: "AUTO", label: "Auto (template)" },
                                { value: "URGENTE", label: "Urgente" },
                                { value: "ALTA", label: "Alta" },
                                { value: "NORMAL", label: "Normal" },
                                { value: "BAIXA", label: "Baixa" },
                            ]}
                            value={regraForm.prioridadeOverride}
                            onChange={(e) =>
                                setRegraForm((prev) => ({
                                    ...prev,
                                    prioridadeOverride: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <Input
                        id="regra-sla"
                        type="number"
                        min={0}
                        max={90}
                        label="SLA override (dias)"
                        value={regraForm.slaDiasOverride}
                        onChange={(e) =>
                            setRegraForm((prev) => ({ ...prev, slaDiasOverride: e.target.value }))
                        }
                    />
                    <label className="flex items-center gap-2 text-xs text-text-secondary">
                        <input
                            type="checkbox"
                            checked={regraForm.ativo}
                            onChange={(e) => setRegraForm((prev) => ({ ...prev, ativo: e.target.checked }))}
                        />
                        Regra ativa
                    </label>
                </div>

                <div className="flex justify-end gap-2">
                    {editingRegraId && (
                    <Button size="sm" variant="ghost" onClick={resetRegraForm} disabled={isPending}>
                        Cancelar
                    </Button>
                )}
                <Button
                    size="sm"
                    onClick={handleSaveRegra}
                    disabled={
                        isPending ||
                        !canManage ||
                        regraForm.nome.trim().length < 3 ||
                        !regraForm.templateId
                    }
                >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <Settings2 size={14} />}
                    {editingRegraId ? "Atualizar regra" : "Salvar regra"}
                </Button>
            </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-bg-tertiary/20 px-3 py-2">
                    <span className="text-xs text-text-muted">
                        Selecionadas: {selectedRegraIds.length}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleLoteRegras("ATIVAR")}
                            disabled={isPending || !canManage || selectedRegraIds.length === 0}
                        >
                            Ativar lote
                        </Button>
                        <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleLoteRegras("PAUSAR")}
                            disabled={isPending || !canManage || selectedRegraIds.length === 0}
                        >
                            Pausar lote
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px]">
                        <thead>
                            <tr className="border-b border-border bg-bg-tertiary/20">
                                <th className="px-3 py-2 text-left">
                                    <input
                                        type="checkbox"
                                        checked={allRegrasSelected}
                                        onChange={toggleAllRegras}
                                        disabled={isPending || regras.length === 0}
                                    />
                                </th>
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Regra</th>
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Template</th>
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Escopo</th>
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Override</th>
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Status</th>
                                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted">Metricas</th>
                                <th className="px-3 py-2 text-right text-[11px] uppercase tracking-wider text-text-muted">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {regras.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-3 py-8 text-center text-sm text-text-muted">
                                        Nenhuma regra configurada.
                                    </td>
                                </tr>
                            ) : (
                                regras.map((regra) => {
                                    const template = templates.find((item) => item.id === regra.templateId);
                                    const team = times.find((item) => item.id === regra.timeId);
                                    return (
                                        <tr key={regra.id} className="border-b border-border last:border-0">
                                            <td className="px-3 py-2.5">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRegraIds.includes(regra.id)}
                                                    onChange={() => toggleRegra(regra.id)}
                                                    disabled={isPending}
                                                />
                                            </td>
                                            <td className="px-3 py-2.5 text-sm text-text-primary">{regra.nome}</td>
                                            <td className="px-3 py-2.5 text-xs text-text-secondary">
                                                {template?.nome || "Template removido"}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-text-secondary">
                                                Perfil: {regra.papelResponsavel}
                                                {team ? ` - Equipe: ${team.nome}` : ""}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-text-secondary">
                                                Area: {regra.areaOverride} - Per: {regra.periodicidadeOverride} - Pri:{" "}
                                                {regra.prioridadeOverride}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs">
                                                <Badge variant={regra.ativo ? "success" : "muted"}>
                                                    {regra.ativo ? "Ativa" : "Pausada"}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2.5 text-[11px] text-text-muted">
                                                <div>
                                                    Exec: {regra.totalExecucoes || 0} | Sim:{" "}
                                                    {regra.totalSimulacoes || 0}
                                                </div>
                                                <div>
                                                    C: {regra.totalCriadas || 0} | A:{" "}
                                                    {regra.totalAtualizadas || 0} | I:{" "}
                                                    {regra.totalIgnoradas || 0}
                                                </div>
                                                <div>
                                                    Ult. exec:{" "}
                                                    {regra.ultimaAplicacaoEm
                                                        ? new Date(regra.ultimaAplicacaoEm).toLocaleString(
                                                              "pt-BR"
                                                          )
                                                        : "-"}
                                                </div>
                                                <div>
                                                    Ult. sim:{" "}
                                                    {regra.ultimaSimulacaoEm
                                                        ? new Date(regra.ultimaSimulacaoEm).toLocaleString(
                                                              "pt-BR"
                                                          )
                                                        : "-"}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <Button
                                                    size="xs"
                                                    variant="ghost"
                                                    onClick={() => handleEditRegra(regra)}
                                                    disabled={isPending || !canManage}
                                                >
                                                    <Pencil size={12} /> Editar
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteRegra(regra.id)}
                                                    disabled={isPending || !canManage}
                                                    className="ml-1 text-danger hover:text-danger"
                                                >
                                                    <Trash2 size={12} /> Excluir
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
