import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

function toNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value) || 0;
    if (typeof value === "object" && "toNumber" in (value as object)) {
        return (value as { toNumber: () => number }).toNumber();
    }
    return Number(value) || 0;
}

function monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

export interface PrevisaoCaixaMes {
    mes: string; // YYYY-MM
    label: string; // "Jan/26"
    entradasPrevistas: number;
    saidasPrevistas: number;
    saldoPrevisto: number;
    saldoAcumulado: number;
    // breakdown
    faturasAVencer: number;
    honorariosPendentes: number;
    despesasAgendadas: number;
    casosPrevistos: number;
    confianca: "alta" | "media" | "baixa"; // based on how many months ahead
}

export interface PrevisaoCaixaData {
    meses: PrevisaoCaixaMes[];
    resumo: {
        totalEntradasPrevistas: number;
        totalSaidasPrevistas: number;
        saldoFinalPrevisto: number;
        horizonte: number;
        alertas: string[];
    };
    geradoEm: string;
}

const MONTH_LABELS = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const horizonte = Math.min(parseInt(searchParams.get("horizonte") ?? "6", 10), 12);

        const hoje = new Date();
        hoje.setDate(1);
        hoje.setHours(0, 0, 0, 0);
        const fimPrevisao = addMonths(hoje, horizonte);

        // 1) Faturas a vencer (receita prevista) — StatusFatura: PENDENTE | PAGA | ATRASADA | CANCELADA
        const faturasAVencer = await db.fatura.findMany({
            where: {
                status: { in: ["PENDENTE", "ATRASADA"] },
                dataVencimento: {
                    gte: hoje,
                    lt: fimPrevisao,
                },
            },
            select: {
                dataVencimento: true,
                valorTotal: true,
                status: true,
            },
        });

        // 2) Lançamentos futuros com vencimento (escritório)
        // StatusLancamentoFinanceiro: PENDENTE | PAGO | PARCIAL | CANCELADO | RECEBIDO
        const lancamentosFuturos = await db.financeiroEscritorioLancamento.findMany({
            where: {
                status: { in: ["PENDENTE", "PARCIAL"] },
                dataVencimento: {
                    gte: hoje,
                    lt: fimPrevisao,
                },
            },
            select: {
                dataVencimento: true,
                valorPrevisto: true,
                tipoLancamento: true,
                classificacao: true,
            },
        });

        // 3) Casos financeiros previstos/pendentes (honorários)
        // StatusCasoFinanceiro: PREVISTO | A_RECEBER | RECEBIDO_PARCIAL | RECEBIDO_INTEGRAL | ENCERRADO
        const casosFinanceiros = await db.casoFinanceiro.findMany({
            where: {
                statusFinanceiro: { in: ["PREVISTO", "A_RECEBER", "RECEBIDO_PARCIAL"] },
                dataRecebimento: {
                    gte: hoje,
                    lt: fimPrevisao,
                },
            },
            select: {
                dataRecebimento: true,
                valorAReceberEscritorio: true,
                statusFinanceiro: true,
            },
        });

        // 4) Honorários ativos com faturas pendentes
        const honorariosAtivos = await db.honorario.findMany({
            where: {
                status: "ATIVO",
                faturas: {
                    some: {
                        status: { in: ["PENDENTE", "ATRASADA"] },
                        dataVencimento: {
                            gte: hoje,
                            lt: fimPrevisao,
                        },
                    },
                },
            },
            select: {
                valorTotal: true,
                faturas: {
                    where: {
                        status: { in: ["PENDENTE", "ATRASADA"] },
                        dataVencimento: { gte: hoje, lt: fimPrevisao },
                    },
                    select: {
                        dataVencimento: true,
                        valorTotal: true,
                    },
                },
            },
        });

        // Build month buckets
        type MesData = {
            faturasAVencer: number;
            honorariosPendentes: number;
            despesasAgendadas: number;
            casosPrevistos: number;
        };
        const buckets = new Map<string, MesData>();
        for (let i = 0; i < horizonte; i++) {
            const key = monthKey(addMonths(hoje, i));
            buckets.set(key, {
                faturasAVencer: 0,
                honorariosPendentes: 0,
                despesasAgendadas: 0,
                casosPrevistos: 0,
            });
        }

        // Fill faturas
        for (const f of faturasAVencer) {
            const key = monthKey(new Date(f.dataVencimento));
            const bucket = buckets.get(key);
            if (bucket) bucket.faturasAVencer += toNumber(f.valorTotal);
        }

        // Fill lançamentos
        for (const l of lancamentosFuturos) {
            if (!l.dataVencimento) continue;
            const key = monthKey(new Date(l.dataVencimento));
            const bucket = buckets.get(key);
            if (!bucket) continue;
            if (l.tipoLancamento === "ENTRADA" || l.classificacao === "RECEITA") {
                bucket.faturasAVencer += toNumber(l.valorPrevisto);
            } else {
                bucket.despesasAgendadas += toNumber(l.valorPrevisto);
            }
        }

        // Fill casos financeiros
        for (const c of casosFinanceiros) {
            if (!c.dataRecebimento) continue;
            const key = monthKey(new Date(c.dataRecebimento));
            const bucket = buckets.get(key);
            if (bucket) bucket.casosPrevistos += toNumber(c.valorAReceberEscritorio);
        }

        // Fill honorários via faturas (avoid double-counting with faturas already above)
        for (const h of honorariosAtivos) {
            for (const f of h.faturas) {
                const key = monthKey(new Date(f.dataVencimento));
                const bucket = buckets.get(key);
                if (bucket) bucket.honorariosPendentes += toNumber(f.valorTotal);
            }
        }

        // Build response months
        let saldoAcumulado = 0;
        const meses: PrevisaoCaixaMes[] = [];

        for (let i = 0; i < horizonte; i++) {
            const date = addMonths(hoje, i);
            const key = monthKey(date);
            const bucket = buckets.get(key) ?? {
                faturasAVencer: 0,
                honorariosPendentes: 0,
                despesasAgendadas: 0,
                casosPrevistos: 0,
            };

            const entradasPrevistas =
                bucket.faturasAVencer + bucket.honorariosPendentes + bucket.casosPrevistos;
            const saidasPrevistas = bucket.despesasAgendadas;
            const saldoPrevisto = entradasPrevistas - saidasPrevistas;
            saldoAcumulado += saldoPrevisto;

            const confianca: "alta" | "media" | "baixa" =
                i === 0 ? "alta" : i <= 2 ? "alta" : i <= 5 ? "media" : "baixa";

            meses.push({
                mes: key,
                label: `${MONTH_LABELS[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`,
                entradasPrevistas,
                saidasPrevistas,
                saldoPrevisto,
                saldoAcumulado,
                faturasAVencer: bucket.faturasAVencer,
                honorariosPendentes: bucket.honorariosPendentes,
                despesasAgendadas: bucket.despesasAgendadas,
                casosPrevistos: bucket.casosPrevistos,
                confianca,
            });
        }

        const totalEntradas = meses.reduce((s, m) => s + m.entradasPrevistas, 0);
        const totalSaidas = meses.reduce((s, m) => s + m.saidasPrevistas, 0);

        const alertas: string[] = [];
        const mesesNegativos = meses.filter((m) => m.saldoPrevisto < 0);
        if (mesesNegativos.length > 0) {
            alertas.push(
                `⚠️ ${mesesNegativos.length} mês(es) com saldo previsto negativo: ${mesesNegativos.map((m) => m.label).join(", ")}`
            );
        }
        if (saldoAcumulado < 0) {
            alertas.push(`🔴 Saldo acumulado final negativo: R$ ${saldoAcumulado.toFixed(2)}`);
        }
        if (totalEntradas === 0) {
            alertas.push(
                "ℹ️ Nenhuma receita prevista cadastrada. Cadastre faturas e honorários para melhorar a previsão."
            );
        }

        const result: PrevisaoCaixaData = {
            meses,
            resumo: {
                totalEntradasPrevistas: totalEntradas,
                totalSaidasPrevistas: totalSaidas,
                saldoFinalPrevisto: saldoAcumulado,
                horizonte,
                alertas,
            },
            geradoEm: new Date().toISOString(),
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error("[GET /api/financeiro/previsao-caixa]", error);
        return NextResponse.json({ error: "Erro interno ao calcular previsão" }, { status: 500 });
    }
}
