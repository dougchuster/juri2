"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type { PrevisaoCaixaData, PrevisaoCaixaMes } from "@/app/api/financeiro/previsao-caixa/route";

function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
    }).format(value);
}

function ConfiancaBadge({ confianca }: { confianca: PrevisaoCaixaMes["confianca"] }) {
    const map = {
        alta: { label: "Alta", className: "bg-green-100 text-green-700" },
        media: { label: "Média", className: "bg-yellow-100 text-yellow-700" },
        baixa: { label: "Baixa", className: "bg-red-100 text-red-700" },
    };
    const { label, className } = map[confianca];
    return (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${className}`}>
            {label}
        </span>
    );
}

function SummaryCard({
    label,
    value,
    icon,
    colorClass,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    colorClass: string;
}) {
    return (
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorClass}`}>{icon}</div>
            <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-lg font-bold ${value < 0 ? "text-red-600" : "text-gray-900"}`}>
                    {formatCurrency(value)}
                </p>
            </div>
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
}) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border rounded-xl shadow-lg p-3 text-xs">
            <p className="font-semibold text-gray-700 mb-2">{label}</p>
            {payload.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between gap-4">
                    <span style={{ color: entry.color }}>{entry.name}</span>
                    <span className="font-medium">{formatCurrency(entry.value)}</span>
                </div>
            ))}
        </div>
    );
};

export function PrevisaoFluxoCaixa() {
    const [data, setData] = useState<PrevisaoCaixaData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [horizonte, setHorizonte] = useState(6);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/financeiro/previsao-caixa?horizonte=${horizonte}`);
            if (!res.ok) throw new Error("Erro ao carregar previsão de caixa");
            const json: PrevisaoCaixaData = await res.json();
            setData(json);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro desconhecido");
        } finally {
            setLoading(false);
        }
    }, [horizonte]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-gray-900">
                        Previsão de Fluxo de Caixa
                    </h3>
                    <p className="text-sm text-gray-500">
                        Projeção baseada em faturas pendentes, honorários e despesas agendadas
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        className="text-sm border rounded-md px-2 py-1.5 bg-white"
                        value={horizonte}
                        onChange={(e) => setHorizonte(Number(e.target.value))}
                    >
                        <option value={3}>3 meses</option>
                        <option value={6}>6 meses</option>
                        <option value={12}>12 meses</option>
                    </select>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        Atualizar
                    </button>
                </div>
            </div>

            {error ? (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            ) : loading && !data ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : data ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <SummaryCard
                            label="Entradas Previstas"
                            value={data.resumo.totalEntradasPrevistas}
                            icon={<TrendingUp className="w-4 h-4 text-green-600" />}
                            colorClass="bg-green-50"
                        />
                        <SummaryCard
                            label="Saídas Previstas"
                            value={data.resumo.totalSaidasPrevistas}
                            icon={<TrendingDown className="w-4 h-4 text-red-600" />}
                            colorClass="bg-red-50"
                        />
                        <SummaryCard
                            label={`Saldo Final (${horizonte}m)`}
                            value={data.resumo.saldoFinalPrevisto}
                            icon={
                                data.resumo.saldoFinalPrevisto >= 0 ? (
                                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                ) : (
                                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                                )
                            }
                            colorClass={
                                data.resumo.saldoFinalPrevisto >= 0 ? "bg-blue-50" : "bg-orange-50"
                            }
                        />
                    </div>

                    {/* Alertas */}
                    {data.resumo.alertas.length > 0 && (
                        <div className="flex flex-col gap-2">
                            {data.resumo.alertas.map((alerta, i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800"
                                >
                                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    {alerta}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Gráfico */}
                    <div className="bg-white rounded-xl border p-4">
                        <ResponsiveContainer width="100%" height={320}>
                            <ComposedChart data={data.meses} margin={{ top: 4, right: 16, bottom: 0, left: 16 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 12, fill: "#64748b" }}
                                />
                                <YAxis
                                    tickFormatter={(v) =>
                                        v >= 1000
                                            ? `${(v / 1000).toFixed(0)}k`
                                            : String(v)
                                    }
                                    tick={{ fontSize: 11, fill: "#64748b" }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar
                                    dataKey="entradasPrevistas"
                                    name="Entradas Previstas"
                                    fill="#4ade80"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={60}
                                />
                                <Bar
                                    dataKey="saidasPrevistas"
                                    name="Saídas Previstas"
                                    fill="#f87171"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={60}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="saldoAcumulado"
                                    name="Saldo Acumulado"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: "#6366f1" }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Tabela detalhada */}
                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600 text-xs">
                                <tr>
                                    <th className="text-left px-4 py-3">Mês</th>
                                    <th className="text-right px-4 py-3">Faturas a Vencer</th>
                                    <th className="text-right px-4 py-3">Honorários</th>
                                    <th className="text-right px-4 py-3">Casos Previstos</th>
                                    <th className="text-right px-4 py-3">Despesas</th>
                                    <th className="text-right px-4 py-3">Saldo Previsto</th>
                                    <th className="text-center px-4 py-3">Confiança</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.meses.map((mes) => (
                                    <tr key={mes.mes} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {mes.label}
                                        </td>
                                        <td className="px-4 py-3 text-right text-green-700">
                                            {mes.faturasAVencer > 0
                                                ? formatCurrency(mes.faturasAVencer)
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-right text-green-700">
                                            {mes.honorariosPendentes > 0
                                                ? formatCurrency(mes.honorariosPendentes)
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-right text-blue-700">
                                            {mes.casosPrevistos > 0
                                                ? formatCurrency(mes.casosPrevistos)
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-right text-red-600">
                                            {mes.saidasPrevistas > 0
                                                ? formatCurrency(mes.saidasPrevistas)
                                                : "—"}
                                        </td>
                                        <td
                                            className={`px-4 py-3 text-right font-semibold ${
                                                mes.saldoPrevisto >= 0
                                                    ? "text-green-700"
                                                    : "text-red-600"
                                            }`}
                                        >
                                            {formatCurrency(mes.saldoPrevisto)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <ConfiancaBadge confianca={mes.confianca} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="text-xs text-gray-400 text-right">
                        Gerado em{" "}
                        {new Date(data.geradoEm).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                        })}
                        {" · "}
                        Confiança diminui quanto mais distante do mês atual
                    </p>
                </>
            ) : null}
        </div>
    );
}
