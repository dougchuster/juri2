"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Briefcase,
    Calculator,
    CalendarClock,
    ChevronDown,
    ChevronUp,
    HeartPulse,
    Loader2,
    Save,
    Trash2,
    TrendingUp,
} from "lucide-react";
import { createPrazo } from "@/actions/agenda";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/ui/export-button";
import { Input, Select } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/utils";
import { deleteCalculo, saveCalculo } from "@/actions/calculos";
import type { UnidadeFederativa } from "@/lib/data/feriados-estaduais";
import {
    INDICES_MONETARIOS,
    calcularAtualizacaoMonetariaBase,
    calcularPrazoProcessualBase,
    calcularVerbasRescisoriasBase,
    createAviso,
    createCalculoResultado,
    normalizeCalculoResultado,
    type CalculoPrazoProcessualResumo,
    type CalculoResultado,
    type CalculoTipo,
    type PrazoTipoContagem,
} from "@/lib/services/calculos";

type TipoCalculo = Extract<
    CalculoTipo,
    "MONETARIO" | "PREVIDENCIARIO" | "TRABALHISTA" | "PRAZO_PROCESSUAL"
>;

interface ProcessoOption {
    id: string;
    numeroCnj: string | null;
    advogadoId: string;
    clienteId: string | null;
    cliente: { nome: string } | null;
}

interface FeriadoExtraOption {
    id: string;
    label: string;
    date: string;
}

interface CalculoItem {
    id: string;
    tipo: string;
    nome: string;
    parametros: Record<string, unknown>;
    resultado: Record<string, unknown> | CalculoResultado | null;
    createdAt: string;
    processo: ProcessoOption | null;
    criadoPor: { name: string | null };
}

interface Props {
    calculos: CalculoItem[];
    processos: ProcessoOption[];
    extraHolidays: FeriadoExtraOption[];
    total: number;
    page: number;
    totalPages: number;
}

const LEGAL_AI_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LEGAL_AI === "true";
const TODAY_ISO = new Date().toISOString().slice(0, 10);

const UF_OPTIONS: Array<{ value: UnidadeFederativa; label: string }> = [
    { value: "AC", label: "Acre" },
    { value: "AL", label: "Alagoas" },
    { value: "AP", label: "Amapa" },
    { value: "AM", label: "Amazonas" },
    { value: "BA", label: "Bahia" },
    { value: "CE", label: "Ceara" },
    { value: "DF", label: "Distrito Federal" },
    { value: "ES", label: "Espirito Santo" },
    { value: "GO", label: "Goias" },
    { value: "MA", label: "Maranhao" },
    { value: "MT", label: "Mato Grosso" },
    { value: "MS", label: "Mato Grosso do Sul" },
    { value: "MG", label: "Minas Gerais" },
    { value: "PA", label: "Para" },
    { value: "PB", label: "Paraiba" },
    { value: "PR", label: "Parana" },
    { value: "PE", label: "Pernambuco" },
    { value: "PI", label: "Piaui" },
    { value: "RJ", label: "Rio de Janeiro" },
    { value: "RN", label: "Rio Grande do Norte" },
    { value: "RS", label: "Rio Grande do Sul" },
    { value: "RO", label: "Rondonia" },
    { value: "RR", label: "Roraima" },
    { value: "SC", label: "Santa Catarina" },
    { value: "SP", label: "Sao Paulo" },
    { value: "SE", label: "Sergipe" },
    { value: "TO", label: "Tocantins" },
];

function toKnownTipo(value: string): CalculoTipo {
    if (
        value === "MONETARIO"
        || value === "TRABALHISTA"
        || value === "PREVIDENCIARIO"
        || value === "PRAZO_PROCESSUAL"
    ) {
        return value;
    }

    return "MONETARIO";
}

function formatIsoDateBr(value: unknown) {
    if (typeof value !== "string") return "-";
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return value;
    return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatCurrency(value: unknown): string {
    return typeof value === "number"
        ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "-";
}

function getAgendaErrorMessage(error: unknown) {
    if (typeof error === "string") return error;
    if (!error || typeof error !== "object") return "Nao foi possivel criar o prazo na agenda.";

    const candidate = error as { _form?: string[] };
    return candidate._form?.[0] || "Nao foi possivel criar o prazo na agenda.";
}

function ResultCard({ resultado, tipo }: { resultado: CalculoResultado; tipo: string }) {
    const summary = resultado.summary as Record<string, unknown>;

    if (tipo === "MONETARIO") {
        return (
            <div className="rounded-xl border border-border bg-bg-tertiary/30 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-text-muted">Valor Principal</span><span className="font-mono">{formatCurrency(summary.valorPrincipal)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Juros ({String(summary.indice ?? "")})</span><span className="font-mono">{formatCurrency(summary.juros)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Multa</span><span className="font-mono">{formatCurrency(summary.multa)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Honorarios</span><span className="font-mono">{formatCurrency(summary.honorarios)}</span></div>
                <div className="flex justify-between border-t border-border pt-2 font-bold text-success"><span>Total Atualizado</span><span className="font-mono">{formatCurrency(summary.total)}</span></div>
            </div>
        );
    }

    if (tipo === "TRABALHISTA") {
        return (
            <div className="rounded-xl border border-border bg-bg-tertiary/30 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-text-muted">Aviso Previo</span><span className="font-mono">{formatCurrency(summary.avisoPrevio)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Ferias Proporc.</span><span className="font-mono">{formatCurrency(summary.ferias)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">1/3 Ferias</span><span className="font-mono">{formatCurrency(summary.adicionalFerias)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">13o Salario</span><span className="font-mono">{formatCurrency(summary.decimoTerceiro)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">FGTS</span><span className="font-mono">{formatCurrency(summary.fgts)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Multa FGTS 40%</span><span className="font-mono">{formatCurrency(summary.multaFgts)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Horas Extras</span><span className="font-mono">{formatCurrency(summary.horasExtras)}</span></div>
                <div className="flex justify-between border-t border-border pt-2 font-bold text-success"><span>Total Rescisorio</span><span className="font-mono">{formatCurrency(summary.total)}</span></div>
            </div>
        );
    }

    if (tipo === "PRAZO_PROCESSUAL") {
        const prazoSummary = resultado.summary as CalculoPrazoProcessualResumo;
        const statusTone =
            prazoSummary.statusAlerta === "VENCIDO"
                ? "text-danger"
                : prazoSummary.statusAlerta === "URGENTE" || prazoSummary.statusAlerta === "ATENCAO"
                    ? "text-warning"
                    : "text-success";

        return (
            <div className="rounded-xl border border-border bg-bg-tertiary/30 p-4 space-y-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/60 bg-bg-secondary/60 p-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Data de Referencia</p>
                        <p className="mt-1 font-semibold text-text-primary">{formatIsoDateBr(prazoSummary.dataReferencia)}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-bg-secondary/60 p-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Inicio da Contagem</p>
                        <p className="mt-1 font-semibold text-text-primary">{formatIsoDateBr(prazoSummary.dataInicioContagem)}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-bg-secondary/60 p-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Prazo Final</p>
                        <p className="mt-1 font-semibold text-text-primary">{formatIsoDateBr(prazoSummary.dataFinal)}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-bg-secondary/60 p-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Data de Alerta</p>
                        <p className="mt-1 font-semibold text-text-primary">{formatIsoDateBr(prazoSummary.dataAlerta)}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-bg-secondary/60 p-3">
                    <span className="text-text-muted">Dias restantes:</span>
                    <strong className={statusTone}>{prazoSummary.diasRestantes}</strong>
                    <span className="text-text-muted">| Regra:</span>
                    <strong className="text-text-primary">
                        {prazoSummary.tipoContagem === "DIAS_UTEIS" ? "Dias uteis" : "Dias corridos"}
                    </strong>
                    <span className="text-text-muted">| Status:</span>
                    <strong className={statusTone}>{prazoSummary.statusAlerta}</strong>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-text-muted">
                    <span>UF: {prazoSummary.unidadeFederativa || "Nacional"}</span>
                    <span>Recesso: {prazoSummary.considerarRecessoForense ? "Ativo" : "Desligado"}</span>
                    <span>Prazo informado: {prazoSummary.prazoDias} dia(s)</span>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border bg-bg-tertiary/30 p-4 space-y-2 text-sm">
            {resultado.avisos.length > 0 ? (
                resultado.avisos.map((aviso) => (
                    <p key={aviso.id} className="text-text-muted">{aviso.message}</p>
                ))
            ) : (
                <p className="text-text-muted">Resultado salvo sem visualizacao detalhada para este tipo de calculo.</p>
            )}
        </div>
    );
}

export function CalculosWidget({ calculos, processos, extraHolidays, total }: Props) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TipoCalculo>("MONETARIO");
    const [resultado, setResultado] = useState<CalculoResultado | null>(null);
    const [loading, setLoading] = useState(false);
    const [agendaLoading, setAgendaLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [agendaFeedback, setAgendaFeedback] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    const [monParams, setMonParams] = useState({
        valorPrincipal: 0,
        indice: "IPCA",
        taxaJuros: 1,
        taxaMulta: 2,
        taxaHonorarios: 10,
        meses: 12,
    });

    const [trabParams, setTrabParams] = useState({
        salario: 0,
        mesesTrabalhados: 12,
        horasExtras: 0,
        comJustaCausa: false,
    });

    const [prazoParams, setPrazoParams] = useState({
        dataReferencia: TODAY_ISO,
        prazoDias: 5,
        tipoContagem: "DIAS_UTEIS" as PrazoTipoContagem,
        unidadeFederativa: "" as UnidadeFederativa | "",
        considerarRecessoForense: true,
    });

    const [nome, setNome] = useState("");
    const [processoId, setProcessoId] = useState("");

    function getProcessoLabel(processo: ProcessoOption | null) {
        if (!processo) return "-";
        return processo.numeroCnj || processo.cliente?.nome || "Processo";
    }

    function getCurrentParams() {
        if (activeTab === "MONETARIO") return monParams;
        if (activeTab === "TRABALHISTA") return trabParams;
        if (activeTab === "PRAZO_PROCESSUAL") return prazoParams;
        return {};
    }

    function handleCalcular() {
        setAgendaFeedback(null);

        if (activeTab === "MONETARIO") {
            setResultado(calcularAtualizacaoMonetariaBase(monParams));
            return;
        }

        if (activeTab === "TRABALHISTA") {
            setResultado(calcularVerbasRescisoriasBase(trabParams));
            return;
        }

        if (activeTab === "PRAZO_PROCESSUAL") {
            setResultado(
                calcularPrazoProcessualBase({
                    dataReferencia: prazoParams.dataReferencia,
                    prazoDias: prazoParams.prazoDias,
                    tipoContagem: prazoParams.tipoContagem,
                    unidadeFederativa: prazoParams.unidadeFederativa || undefined,
                    considerarRecessoForense: prazoParams.considerarRecessoForense,
                    extraHolidays,
                })
            );
            return;
        }

        setResultado(
            createCalculoResultado(
                "PREVIDENCIARIO",
                {},
                [],
                [createAviso("previdenciario-placeholder", "info", "Calculo previdenciario estruturado na Fase 1 e implementacao funcional reservada para etapa posterior.")],
                { status: "placeholder" }
            )
        );
    }

    async function handleSalvar() {
        if (!resultado || !nome) return;

        setLoading(true);
        await saveCalculo({
            tipo: activeTab,
            nome,
            parametros: getCurrentParams(),
            resultado,
            processoId: processoId || undefined,
        });
        setLoading(false);
        setResultado(null);
        setNome("");
        setAgendaFeedback(null);
        router.refresh();
    }

    async function handleCriarPrazoNaAgenda() {
        if (!resultado || activeTab !== "PRAZO_PROCESSUAL") return;

        const processo = processos.find((item) => item.id === processoId);
        if (!processo) {
            setAgendaFeedback({
                type: "error",
                message: "Selecione um processo para transformar o calculo em prazo real.",
            });
            return;
        }

        const prazoResumo = normalizeCalculoResultado("PRAZO_PROCESSUAL", resultado).summary as CalculoPrazoProcessualResumo;

        setAgendaLoading(true);
        const response = await createPrazo({
            processoId: processo.id,
            advogadoId: processo.advogadoId,
            descricao: nome.trim() || `Prazo processual - ${prazoResumo.prazoDias} dias`,
            dataFatal: prazoResumo.dataFinal,
            dataCortesia: prazoResumo.dataAlerta,
            tipoContagem: prazoResumo.tipoContagem,
            fatal: true,
            observacoes: [
                "Gerado a partir da Calculadora de Prazos MVP.",
                `Data de referencia: ${formatIsoDateBr(prazoResumo.dataReferencia)}.`,
                `Inicio da contagem: ${formatIsoDateBr(prazoResumo.dataInicioContagem)}.`,
                `UF considerada: ${prazoResumo.unidadeFederativa || "Nacional"}.`,
                `Recesso forense: ${prazoResumo.considerarRecessoForense ? "ativo" : "desligado"}.`,
            ].join(" "),
        });
        setAgendaLoading(false);

        if (!response.success) {
            setAgendaFeedback({
                type: "error",
                message: getAgendaErrorMessage(response.error),
            });
            return;
        }

        setAgendaFeedback({
            type: "success",
            message: "Prazo criado com sucesso e sincronizado para a agenda real.",
        });
        router.refresh();
    }

    async function handleDelete() {
        if (!deletingId) return;
        await deleteCalculo(deletingId);
        setDeletingId(null);
        router.refresh();
    }

    const TIPO_ICON: Record<string, React.ElementType> = {
        MONETARIO: TrendingUp,
        TRABALHISTA: Briefcase,
        PREVIDENCIARIO: HeartPulse,
        PRAZO_PROCESSUAL: CalendarClock,
    };

    const labels: Record<TipoCalculo, string> = {
        MONETARIO: "Atualizacao Monetaria",
        TRABALHISTA: "Trabalhista",
        PREVIDENCIARIO: "Previdenciario",
        PRAZO_PROCESSUAL: "Prazos",
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-bg-secondary p-1 w-fit">
                    {(["MONETARIO", "TRABALHISTA", "PREVIDENCIARIO", "PRAZO_PROCESSUAL"] as TipoCalculo[]).map((tab) => {
                        const Icon = TIPO_ICON[tab];

                        return (
                            <button
                                key={tab}
                                onClick={() => {
                                    setActiveTab(tab);
                                    setResultado(null);
                                    setAgendaFeedback(null);
                                }}
                                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === tab ? "bg-accent text-white shadow" : "text-text-muted hover:text-text-primary"}`}
                            >
                                <Icon size={14} />
                                {labels[tab]}
                            </button>
                        );
                    })}
                </div>
                <ExportButton basePath="/api/calculos/export" label="Exportar Historico" />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="glass-card p-6 space-y-4">
                    <h3 className="font-semibold text-text-primary flex items-center gap-2">
                        <Calculator size={16} className="text-accent" />
                        {activeTab === "MONETARIO"
                            ? "Atualizacao Monetaria"
                            : activeTab === "TRABALHISTA"
                                ? "Verbas Rescisorias"
                                : activeTab === "PRAZO_PROCESSUAL"
                                    ? "Calculadora de Prazos"
                                    : "Beneficio Previdenciario"}
                    </h3>

                    {activeTab === "MONETARIO" && (
                        <div className="space-y-3">
                            <Input
                                id="mon-valor"
                                label="Valor Principal (R$) *"
                                type="number"
                                step="0.01"
                                min={0}
                                value={monParams.valorPrincipal || ""}
                                onChange={(event) => setMonParams((previous) => ({
                                    ...previous,
                                    valorPrincipal: parseFloat(event.target.value) || 0,
                                }))}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <Select
                                    id="mon-indice"
                                    label="Indice"
                                    defaultValue="IPCA"
                                    options={INDICES_MONETARIOS.map((item) => ({ value: item, label: item }))}
                                    onChange={(event) => setMonParams((previous) => ({ ...previous, indice: event.target.value }))}
                                />
                                <Input
                                    id="mon-meses"
                                    label="No de Meses"
                                    type="number"
                                    min={1}
                                    value={monParams.meses || ""}
                                    onChange={(event) => setMonParams((previous) => ({
                                        ...previous,
                                        meses: parseInt(event.target.value, 10) || 0,
                                    }))}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <Input
                                    id="mon-juros"
                                    label="Juros % a.m."
                                    type="number"
                                    step="0.01"
                                    value={monParams.taxaJuros || ""}
                                    onChange={(event) => setMonParams((previous) => ({
                                        ...previous,
                                        taxaJuros: parseFloat(event.target.value) || 0,
                                    }))}
                                />
                                <Input
                                    id="mon-multa"
                                    label="Multa %"
                                    type="number"
                                    step="0.01"
                                    value={monParams.taxaMulta || ""}
                                    onChange={(event) => setMonParams((previous) => ({
                                        ...previous,
                                        taxaMulta: parseFloat(event.target.value) || 0,
                                    }))}
                                />
                                <Input
                                    id="mon-hon"
                                    label="Honorarios %"
                                    type="number"
                                    step="0.01"
                                    value={monParams.taxaHonorarios || ""}
                                    onChange={(event) => setMonParams((previous) => ({
                                        ...previous,
                                        taxaHonorarios: parseFloat(event.target.value) || 0,
                                    }))}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === "TRABALHISTA" && (
                        <div className="space-y-3">
                            <Input
                                id="trab-salario"
                                label="Salario Mensal (R$) *"
                                type="number"
                                step="0.01"
                                value={trabParams.salario || ""}
                                onChange={(event) => setTrabParams((previous) => ({
                                    ...previous,
                                    salario: parseFloat(event.target.value) || 0,
                                }))}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    id="trab-meses"
                                    label="Meses Trabalhados"
                                    type="number"
                                    value={trabParams.mesesTrabalhados || ""}
                                    onChange={(event) => setTrabParams((previous) => ({
                                        ...previous,
                                        mesesTrabalhados: parseInt(event.target.value, 10) || 0,
                                    }))}
                                />
                                <Input
                                    id="trab-horas"
                                    label="Horas Extras"
                                    type="number"
                                    value={trabParams.horasExtras || ""}
                                    onChange={(event) => setTrabParams((previous) => ({
                                        ...previous,
                                        horasExtras: parseInt(event.target.value, 10) || 0,
                                    }))}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    id="trab-justacausa"
                                    type="checkbox"
                                    checked={trabParams.comJustaCausa}
                                    onChange={(event) => setTrabParams((previous) => ({
                                        ...previous,
                                        comJustaCausa: event.target.checked,
                                    }))}
                                    className="rounded"
                                />
                                <label htmlFor="trab-justacausa" className="text-sm text-text-secondary">
                                    Dispensa por justa causa
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === "PRAZO_PROCESSUAL" && (
                        <div className="space-y-3">
                            <Input
                                id="prazo-data-referencia"
                                label="Data de Referencia *"
                                type="date"
                                value={prazoParams.dataReferencia}
                                onChange={(event) => setPrazoParams((previous) => ({
                                    ...previous,
                                    dataReferencia: event.target.value,
                                }))}
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Input
                                    id="prazo-dias"
                                    label="Prazo em Dias *"
                                    type="number"
                                    min={1}
                                    value={prazoParams.prazoDias || ""}
                                    onChange={(event) => setPrazoParams((previous) => ({
                                        ...previous,
                                        prazoDias: parseInt(event.target.value, 10) || 0,
                                    }))}
                                />
                                <Select
                                    id="prazo-tipo-contagem"
                                    label="Tipo de Contagem"
                                    value={prazoParams.tipoContagem}
                                    options={[
                                        { value: "DIAS_UTEIS", label: "Dias uteis" },
                                        { value: "DIAS_CORRIDOS", label: "Dias corridos" },
                                    ]}
                                    onChange={(event) => setPrazoParams((previous) => ({
                                        ...previous,
                                        tipoContagem: event.target.value as PrazoTipoContagem,
                                    }))}
                                />
                            </div>
                            <Select
                                id="prazo-uf"
                                label="UF para Feriados Estaduais"
                                placeholder="Somente feriados nacionais"
                                value={prazoParams.unidadeFederativa}
                                options={UF_OPTIONS}
                                onChange={(event) => setPrazoParams((previous) => ({
                                    ...previous,
                                    unidadeFederativa: event.target.value as UnidadeFederativa | "",
                                }))}
                            />
                            <div className="rounded-lg border border-border/60 bg-bg-tertiary/40 p-3">
                                <label className="flex items-center gap-2 text-sm text-text-secondary">
                                    <input
                                        id="prazo-recesso"
                                        type="checkbox"
                                        checked={prazoParams.considerarRecessoForense}
                                        onChange={(event) => setPrazoParams((previous) => ({
                                            ...previous,
                                            considerarRecessoForense: event.target.checked,
                                        }))}
                                        className="rounded"
                                    />
                                    Considerar recesso forense basico (20/12 a 20/01)
                                </label>
                                <p className="mt-2 text-xs text-text-muted">
                                    O MVP considera fins de semana, feriados nacionais, feriados estaduais selecionados e feriados extras do escritorio.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === "PREVIDENCIARIO" && (
                        <div className="space-y-3">
                            <p className="text-sm text-text-muted bg-bg-tertiary/50 rounded-lg p-4">
                                {LEGAL_AI_ENABLED
                                    ? "O calculo previdenciario completo permanece na trilha especializada de IA, enquanto o nucleo compartilhado de calculos e preparado nesta fase."
                                    : "O modulo de IA juridica foi desligado nesta instalacao para reduzir consumo do servidor."}
                            </p>
                            {LEGAL_AI_ENABLED ? (
                                <Button onClick={() => router.push("/agentes-juridicos")} variant="secondary" className="w-full">
                                    Abrir Agente Previdenciario
                                </Button>
                            ) : null}
                        </div>
                    )}

                    {activeTab !== "PREVIDENCIARIO" && (
                        <Button onClick={handleCalcular} className="w-full">
                            <Calculator size={14} /> Calcular
                        </Button>
                    )}

                    {resultado && activeTab !== "PREVIDENCIARIO" && (
                        <div className="space-y-3">
                            <ResultCard resultado={resultado} tipo={activeTab} />

                            {resultado.avisos.length > 0 && (
                                <div className="space-y-2 rounded-xl border border-border/60 bg-bg-tertiary/25 p-4">
                                    {resultado.avisos.map((aviso) => (
                                        <p key={aviso.id} className="text-sm text-text-muted">
                                            {aviso.message}
                                        </p>
                                    ))}
                                </div>
                            )}

                            {agendaFeedback && (
                                <div
                                    className={`rounded-lg border px-4 py-3 text-sm ${
                                        agendaFeedback.type === "success"
                                            ? "border-success/30 bg-success/10 text-success"
                                            : "border-danger/30 bg-danger/10 text-danger"
                                    }`}
                                >
                                    {agendaFeedback.message}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Input
                                    id="calc-nome"
                                    label="Nome do calculo para salvar *"
                                    placeholder="Ex: Prazo contestacao - Apelacao Civel"
                                    value={nome}
                                    onChange={(event) => setNome(event.target.value)}
                                />
                                <Select
                                    id="calc-processo"
                                    label={activeTab === "PRAZO_PROCESSUAL" ? "Processo para agenda *" : "Vincular processo (opcional)"}
                                    placeholder="Nenhum"
                                    value={processoId}
                                    options={processos.map((processo) => ({ value: processo.id, label: getProcessoLabel(processo) }))}
                                    onChange={(event) => setProcessoId(event.target.value)}
                                />
                                {activeTab === "PRAZO_PROCESSUAL" && (
                                    <p className="text-xs text-text-muted">
                                        Ao criar o prazo, o sistema cadastra um `Prazo` real e sincroniza esse item com a agenda central.
                                    </p>
                                )}
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <Button onClick={handleSalvar} variant="secondary" className="w-full" disabled={!nome || loading}>
                                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        Salvar Calculo
                                    </Button>

                                    {activeTab === "PRAZO_PROCESSUAL" && (
                                        <Button
                                            onClick={handleCriarPrazoNaAgenda}
                                            className="w-full"
                                            disabled={!processoId || agendaLoading}
                                        >
                                            {agendaLoading ? <Loader2 size={14} className="animate-spin" /> : <CalendarClock size={14} />}
                                            Criar Prazo na Agenda
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="glass-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-text-primary">Calculos Salvos</h3>
                        <span className="text-xs text-text-muted">{total} total</span>
                    </div>

                    <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "480px" }}>
                        {calculos.length === 0 ? (
                            <p className="text-sm text-text-muted text-center py-8">Nenhum calculo salvo ainda</p>
                        ) : calculos.map((calculo) => {
                            const Icon = TIPO_ICON[calculo.tipo] || Calculator;
                            const tipoLabel: Record<string, string> = {
                                MONETARIO: "Monetario",
                                TRABALHISTA: "Trabalhista",
                                PREVIDENCIARIO: "Previdenciario",
                                PRAZO_PROCESSUAL: "Prazos",
                            };
                            const isExpanded = expandedId === calculo.id;
                            const resultadoNormalizado = calculo.resultado
                                ? normalizeCalculoResultado(toKnownTipo(calculo.tipo), calculo.resultado)
                                : null;

                            return (
                                <div key={calculo.id} className="rounded-lg border border-border bg-bg-secondary">
                                    <div className="flex items-center gap-3 p-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 flex-shrink-0">
                                            <Icon size={14} className="text-accent" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-text-primary truncate">{calculo.nome}</p>
                                            <p className="text-[10px] text-text-muted">{tipoLabel[calculo.tipo] || calculo.tipo} · {formatDate(calculo.createdAt)}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : calculo.id)}
                                                className="p-1 rounded text-text-muted hover:text-accent transition-colors"
                                            >
                                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                            <button
                                                onClick={() => setDeletingId(calculo.id)}
                                                className="p-1 rounded text-text-muted hover:text-danger transition-colors"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded && resultadoNormalizado && (
                                        <div className="border-t border-border px-3 pb-3 pt-2">
                                            <ResultCard resultado={resultadoNormalizado} tipo={calculo.tipo} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <Modal isOpen={!!deletingId} onClose={() => setDeletingId(null)} title="Excluir Calculo" size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-text-secondary">Excluir este calculo salvo?</p>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setDeletingId(null)}>Cancelar</Button>
                        <Button variant="destructive" className="w-full sm:w-auto" onClick={handleDelete}>Excluir</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
