"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { formatCurrency } from "@/lib/utils";

interface ChartPoint {
    name?: string;
    month?: string;
    value?: number;
    entradas?: number;
    saidas?: number;
    saldoAcumulado?: number;
}

interface FinanceiroChartsProps {
    monthlyFlow: ChartPoint[];
    expensesByCategory: ChartPoint[];
    revenuesByClient: ChartPoint[];
    costsByCenter: ChartPoint[];
}

function tooltipCurrency(value?: number) {
    return formatCurrency(value ?? 0);
}

const COLORS = ["#B5640F", "#D97706", "#10B981", "#3B82F6", "#F59E0B", "#7C3AED", "#EF4444"];

export function FinanceiroCharts({
    monthlyFlow,
    expensesByCategory,
    revenuesByClient,
    costsByCenter,
}: FinanceiroChartsProps) {
    return (
        <div className="grid gap-5 xl:grid-cols-2">
            <div className="glass-card p-5">
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-text-primary">Fluxo mensal</h3>
                    <p className="text-xs text-text-muted">Entradas, saídas e evolução do saldo por competência.</p>
                </div>
                <div className="h-56 md:h-72 xl:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyFlow}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(181,100,15,0.12)" />
                            <XAxis dataKey="month" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} minTickGap={20} />
                            <YAxis tickFormatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR")}`} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} width={72} />
                            <Tooltip formatter={(value?: number) => tooltipCurrency(value)} />
                            <Legend />
                            <Line type="monotone" dataKey="entradas" stroke="#10B981" strokeWidth={3} dot={false} />
                            <Line type="monotone" dataKey="saidas" stroke="#EF4444" strokeWidth={3} dot={false} />
                            <Line type="monotone" dataKey="saldoAcumulado" stroke="#B5640F" strokeWidth={3} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="glass-card p-5">
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-text-primary">Despesas por categoria</h3>
                    <p className="text-xs text-text-muted">Principais subcategorias operacionais do período.</p>
                </div>
                <div className="h-64 md:h-72 xl:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={expensesByCategory.slice(0, 8)} layout="vertical" margin={{ left: 12 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(181,100,15,0.12)" />
                            <XAxis type="number" tickFormatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR")}`} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                            <YAxis dataKey="name" type="category" width={96} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                            <Tooltip formatter={(value?: number) => tooltipCurrency(value)} />
                            <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                                {expensesByCategory.slice(0, 8).map((entry, index) => (
                                    <Cell key={entry.name ?? index} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="glass-card p-5">
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-text-primary">Receita por cliente</h3>
                    <p className="text-xs text-text-muted">Clientes mais rentáveis com base no valor recebido.</p>
                </div>
                <div className="h-56 md:h-72 xl:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenuesByClient.slice(0, 6)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(181,100,15,0.12)" />
                            <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} minTickGap={18} />
                            <YAxis tickFormatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR")}`} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} width={72} />
                            <Tooltip formatter={(value?: number) => tooltipCurrency(value)} />
                            <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#B5640F" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="glass-card p-5">
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-text-primary">Custos por centro de custo</h3>
                    <p className="text-xs text-text-muted">Distribuição dos gastos operacionais por centro.</p>
                </div>
                <div className="h-56 md:h-72 xl:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={costsByCenter.slice(0, 8)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(181,100,15,0.12)" />
                            <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} minTickGap={18} />
                            <YAxis tickFormatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR")}`} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} width={72} />
                            <Tooltip formatter={(value?: number) => tooltipCurrency(value)} />
                            <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#D97706" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
