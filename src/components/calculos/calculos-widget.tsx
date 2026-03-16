"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Calculator, TrendingUp, Briefcase, HeartPulse,
    Save, Trash2, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-fields";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { saveCalculo, deleteCalculo } from "@/actions/calculos";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type TipoCalculo = "MONETARIO" | "PREVIDENCIARIO" | "TRABALHISTA";

interface ProcessoOption { id: string; numeroCnj: string | null; cliente: { nome: string } | null }

interface CalculoItem {
    id: string;
    tipo: string;
    nome: string;
    parametros: Record<string, unknown>;
    resultado: Record<string, unknown> | null;
    createdAt: string;
    processo: ProcessoOption | null;
    criadoPor: { name: string | null };
}

interface Props {
    calculos: CalculoItem[];
    processos: ProcessoOption[];
    total: number;
    page: number;
    totalPages: number;
}

// ─────────────────────────────────────────────
// Calculators
// ─────────────────────────────────────────────

const INDICES = ["IPCA", "IGPM", "INPC", "SELIC", "TR", "IPCA-E", "CDI"];

function calcularMonetario(params: {
    valorPrincipal: number;
    indice: string;
    taxaJuros: number;
    taxaMulta: number;
    taxaHonorarios: number;
    meses: number;
}): Record<string, unknown> {
    // Simplified calculation — real implementation would use official index tables
    const { valorPrincipal, taxaJuros, taxaMulta, taxaHonorarios, meses } = params;
    const jurosSimples = valorPrincipal * (taxaJuros / 100) * meses;
    const multa = valorPrincipal * (taxaMulta / 100);
    const subtotal = valorPrincipal + jurosSimples + multa;
    const honorarios = subtotal * (taxaHonorarios / 100);
    const total = subtotal + honorarios;
    return {
        valorPrincipal,
        juros: jurosSimples,
        multa,
        subtotal,
        honorarios,
        total,
        meses,
        indice: params.indice,
    };
}

function calcularTrabalhista(params: {
    salario: number;
    mesesTrabalhados: number;
    horasExtras: number;
    comJustaCausa: boolean;
}): Record<string, unknown> {
    const { salario, mesesTrabalhados, horasExtras, comJustaCausa } = params;
    const avisoPrevio = comJustaCausa ? 0 : salario;
    const ferias = (salario / 12) * mesesTrabalhados * (10 / 12);
    const feriasAdicional = ferias / 3;
    const decimoTerceiro = (salario / 12) * mesesTrabalhados;
    const fgts = salario * 0.08 * mesesTrabalhados;
    const multaFgts = comJustaCausa ? 0 : fgts * 0.4;
    const horasExtrasTotal = horasExtras * (salario / 220) * 1.5;
    const total = avisoPrevio + ferias + feriasAdicional + decimoTerceiro + fgts + multaFgts + horasExtrasTotal;

    return {
        salario,
        mesesTrabalhados,
        avisoPrevio,
        ferias,
        adicionalFerias: feriasAdicional,
        decimoTerceiro,
        fgts,
        multaFgts: comJustaCausa ? 0 : multaFgts,
        horasExtras: horasExtrasTotal,
        total,
        comJustaCausa,
    };
}

// ─────────────────────────────────────────────
// Result display
// ─────────────────────────────────────────────
function ResultCard({ resultado, tipo }: { resultado: Record<string, unknown>; tipo: string }) {
    const currency = (v: unknown): string =>
        typeof v === "number"
            ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            : "—";

    if (tipo === "MONETARIO") {
        return (
            <div className="rounded-xl border border-border bg-bg-tertiary/30 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-text-muted">Valor Principal</span><span className="font-mono">{currency(resultado.valorPrincipal)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Juros ({String(resultado.indice ?? "")})</span><span className="font-mono">{currency(resultado.juros)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Multa</span><span className="font-mono">{currency(resultado.multa)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Honorários</span><span className="font-mono">{currency(resultado.honorarios)}</span></div>
                <div className="flex justify-between border-t border-border pt-2 font-bold text-success"><span>Total Atualizado</span><span className="font-mono">{currency(resultado.total)}</span></div>
            </div>
        );
    }
    if (tipo === "TRABALHISTA") {
        return (
            <div className="rounded-xl border border-border bg-bg-tertiary/30 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-text-muted">Aviso Prévio</span><span className="font-mono">{currency(resultado.avisoPrevio)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Férias Proporc.</span><span className="font-mono">{currency(resultado.ferias)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">1/3 Férias</span><span className="font-mono">{currency(resultado.adicionalFerias)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">13º Salário</span><span className="font-mono">{currency(resultado.decimoTerceiro)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">FGTS</span><span className="font-mono">{currency(resultado.fgts)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Multa FGTS 40%</span><span className="font-mono">{currency(resultado.multaFgts)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Horas Extras</span><span className="font-mono">{currency(resultado.horasExtras)}</span></div>
                <div className="flex justify-between border-t border-border pt-2 font-bold text-success"><span>Total Rescisório</span><span className="font-mono">{currency(resultado.total)}</span></div>
            </div>
        );
    }
    return null;
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export function CalculosWidget({ calculos, processos, total }: Props) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TipoCalculo>("MONETARIO");
    const [resultado, setResultado] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Monetário form state
    const [monParams, setMonParams] = useState({
        valorPrincipal: 0, indice: "IPCA", taxaJuros: 1, taxaMulta: 2,
        taxaHonorarios: 10, meses: 12,
    });

    // Trabalhista form state
    const [trabParams, setTrabParams] = useState({
        salario: 0, mesesTrabalhados: 12, horasExtras: 0, comJustaCausa: false,
    });

    // Form fields
    const [nome, setNome] = useState("");
    const [processoId, setProcessoId] = useState("");

    function getProcessoLabel(p: ProcessoOption | null) {
        if (!p) return "—";
        return p.numeroCnj || p.cliente?.nome || "Processo";
    }

    function handleCalcular() {
        if (activeTab === "MONETARIO") {
            setResultado(calcularMonetario(monParams));
        } else if (activeTab === "TRABALHISTA") {
            setResultado(calcularTrabalhista(trabParams));
        } else {
            setResultado({ aviso: "Cálculo previdenciário — em desenvolvimento" });
        }
    }

    async function handleSalvar() {
        if (!resultado || !nome) return;
        setLoading(true);
        await saveCalculo({
            tipo: activeTab,
            nome,
            parametros: activeTab === "MONETARIO" ? monParams : trabParams,
            resultado,
            processoId: processoId || undefined,
        });
        setLoading(false);
        setResultado(null);
        setNome("");
        router.refresh();
    }

    async function handleDelete() {
        if (!deletingId) return;
        await deleteCalculo(deletingId);
        setDeletingId(null);
        router.refresh();
    }

    const TIPO_ICON: Record<string, React.ElementType> = {
        MONETARIO: TrendingUp, TRABALHISTA: Briefcase, PREVIDENCIARIO: HeartPulse,
    };

    return (
        <div className="space-y-6">
            {/* Tab selector */}
            <div className="flex gap-2 rounded-xl border border-border bg-bg-secondary p-1 w-fit">
                {(["MONETARIO", "TRABALHISTA", "PREVIDENCIARIO"] as TipoCalculo[]).map((tab) => {
                    const Icon = TIPO_ICON[tab];
                    const labels: Record<string, string> = { MONETARIO: "Atualização Monetária", TRABALHISTA: "Trabalhista", PREVIDENCIARIO: "Previdenciário" };
                    return (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); setResultado(null); }}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeTab === tab ? "bg-accent text-white shadow" : "text-text-muted hover:text-text-primary"}`}
                        >
                            <Icon size={14} />{labels[tab]}
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Calculator form */}
                <div className="glass-card p-6 space-y-4">
                    <h3 className="font-semibold text-text-primary flex items-center gap-2">
                        <Calculator size={16} className="text-accent" />
                        {activeTab === "MONETARIO" ? "Atualização Monetária" : activeTab === "TRABALHISTA" ? "Verbas Rescisórias" : "Benefício Previdenciário"}
                    </h3>

                    {activeTab === "MONETARIO" && (
                        <div className="space-y-3">
                            <Input id="mon-valor" label="Valor Principal (R$) *" type="number" step="0.01" min={0}
                                value={monParams.valorPrincipal || ""}
                                onChange={(e) => setMonParams(p => ({ ...p, valorPrincipal: parseFloat(e.target.value) || 0 }))} />
                            <div className="grid grid-cols-2 gap-3">
                                <Select id="mon-indice" label="Índice" defaultValue="IPCA"
                                    options={INDICES.map(i => ({ value: i, label: i }))}
                                    onChange={(e) => setMonParams(p => ({ ...p, indice: e.target.value }))} />
                                <Input id="mon-meses" label="Nº de Meses" type="number" min={1}
                                    value={monParams.meses || ""}
                                    onChange={(e) => setMonParams(p => ({ ...p, meses: parseInt(e.target.value) || 0 }))} />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <Input id="mon-juros" label="Juros % a.m." type="number" step="0.01"
                                    value={monParams.taxaJuros || ""}
                                    onChange={(e) => setMonParams(p => ({ ...p, taxaJuros: parseFloat(e.target.value) || 0 }))} />
                                <Input id="mon-multa" label="Multa %" type="number" step="0.01"
                                    value={monParams.taxaMulta || ""}
                                    onChange={(e) => setMonParams(p => ({ ...p, taxaMulta: parseFloat(e.target.value) || 0 }))} />
                                <Input id="mon-hon" label="Honorários %" type="number" step="0.01"
                                    value={monParams.taxaHonorarios || ""}
                                    onChange={(e) => setMonParams(p => ({ ...p, taxaHonorarios: parseFloat(e.target.value) || 0 }))} />
                            </div>
                        </div>
                    )}

                    {activeTab === "TRABALHISTA" && (
                        <div className="space-y-3">
                            <Input id="trab-salario" label="Salário Mensal (R$) *" type="number" step="0.01"
                                value={trabParams.salario || ""}
                                onChange={(e) => setTrabParams(p => ({ ...p, salario: parseFloat(e.target.value) || 0 }))} />
                            <div className="grid grid-cols-2 gap-3">
                                <Input id="trab-meses" label="Meses Trabalhados" type="number"
                                    value={trabParams.mesesTrabalhados || ""}
                                    onChange={(e) => setTrabParams(p => ({ ...p, mesesTrabalhados: parseInt(e.target.value) || 0 }))} />
                                <Input id="trab-horas" label="Horas Extras" type="number"
                                    value={trabParams.horasExtras || ""}
                                    onChange={(e) => setTrabParams(p => ({ ...p, horasExtras: parseInt(e.target.value) || 0 }))} />
                            </div>
                            <div className="flex items-center gap-2">
                                <input id="trab-justacausa" type="checkbox"
                                    checked={trabParams.comJustaCausa}
                                    onChange={(e) => setTrabParams(p => ({ ...p, comJustaCausa: e.target.checked }))}
                                    className="rounded" />
                                <label htmlFor="trab-justacausa" className="text-sm text-text-secondary">Dispensa por justa causa</label>
                            </div>
                        </div>
                    )}

                    {activeTab === "PREVIDENCIARIO" && (
                        <div className="space-y-3">
                            <p className="text-sm text-text-muted bg-bg-tertiary/50 rounded-lg p-4">
                                O cálculo previdenciário completo (DER, NIT, períodos, conversão de tempo especial) está disponível via <strong>Agentes Jurídicos</strong> com assistência de IA especializada.
                            </p>
                            <Button onClick={() => router.push("/agentes-juridicos")} variant="secondary" className="w-full">
                                Abrir Agente Previdenciário
                            </Button>
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
                            <div className="space-y-2">
                                <Input id="calc-nome" label="Nome do cálculo para salvar *"
                                    placeholder="Ex: Rescisão João Silva — Jan/2026"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)} />
                                <Select id="calc-processo" label="Vincular processo (opcional)"
                                    placeholder="Nenhum"
                                    options={processos.map(p => ({ value: p.id, label: getProcessoLabel(p) }))}
                                    onChange={(e) => setProcessoId(e.target.value)} />
                                <Button onClick={handleSalvar} variant="secondary" className="w-full" disabled={!nome || loading}>
                                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    Salvar Cálculo
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Saved calculations list */}
                <div className="glass-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-text-primary">Cálculos Salvos</h3>
                        <span className="text-xs text-text-muted">{total} total</span>
                    </div>

                    <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "480px" }}>
                        {calculos.length === 0 ? (
                            <p className="text-sm text-text-muted text-center py-8">Nenhum cálculo salvo ainda</p>
                        ) : calculos.map((c) => {
                            const Icon = TIPO_ICON[c.tipo] || Calculator;
                            const tipoLabel: Record<string, string> = { MONETARIO: "Monetário", TRABALHISTA: "Trabalhista", PREVIDENCIARIO: "Previdenciário" };
                            const isExpanded = expandedId === c.id;
                            const resultado = c.resultado as Record<string, unknown> | null;

                            return (
                                <div key={c.id} className="rounded-lg border border-border bg-bg-secondary">
                                    <div className="flex items-center gap-3 p-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 flex-shrink-0">
                                            <Icon size={14} className="text-accent" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-text-primary truncate">{c.nome}</p>
                                            <p className="text-[10px] text-text-muted">{tipoLabel[c.tipo]} · {formatDate(c.createdAt)}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => setExpandedId(isExpanded ? null : c.id)}
                                                className="p-1 rounded text-text-muted hover:text-accent transition-colors">
                                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                            <button onClick={() => setDeletingId(c.id)}
                                                className="p-1 rounded text-text-muted hover:text-danger transition-colors">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    {isExpanded && resultado && (
                                        <div className="border-t border-border px-3 pb-3 pt-2">
                                            <ResultCard resultado={resultado} tipo={c.tipo} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Delete confirm */}
            <Modal isOpen={!!deletingId} onClose={() => setDeletingId(null)} title="Excluir Cálculo" size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-text-secondary">Excluir este cálculo salvo?</p>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setDeletingId(null)}>Cancelar</Button>
                        <Button variant="destructive" className="w-full sm:w-auto" onClick={handleDelete}>Excluir</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
