import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";

export const dynamic = "force-dynamic";

function toNumber(value: { toNumber(): number } | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return value;
    return value.toNumber();
}

/**
 * GET /api/admin/rentabilidade
 * Análise de rentabilidade em tempo real por advogado, cliente e área do direito.
 *
 * Query params:
 *   - rangeFrom: ISO date (default: 12 meses atrás)
 *   - rangeTo: ISO date (default: hoje)
 *   - topN: number (default: 10, max: 20)
 */
export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        if (!["ADMIN", "SOCIO", "CONTROLADOR", "FINANCEIRO"].includes(String(session.role))) {
            return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const topN = Math.min(20, Math.max(3, Number(searchParams.get("topN") || 10)));
        const rangeTo = searchParams.get("rangeTo") ? new Date(searchParams.get("rangeTo")!) : new Date();
        const rangeFrom = searchParams.get("rangeFrom")
            ? new Date(searchParams.get("rangeFrom")!)
            : new Date(rangeTo.getTime() - 365 * 24 * 60 * 60 * 1000);

        // Busca dados financeiros com relacionamentos
        const [casosFinanceiros, registrosHora] = await Promise.all([
            db.casoFinanceiro.findMany({
                select: {
                    id: true,
                    valorRecebidoEscritorio: true,
                    valorAReceberEscritorio: true,
                    createdAt: true,
                    processo: {
                        select: {
                            tipo: true,
                            advogado: {
                                select: { user: { select: { id: true, name: true } } },
                            },
                        },
                    },
                    cliente: { select: { id: true, nome: true } },
                    participantes: {
                        select: {
                            advogado: {
                                select: { user: { select: { id: true, name: true } } },
                            },
                            percentualParticipacao: true,
                        },
                    },
                },
                where: {
                    createdAt: { gte: rangeFrom, lte: rangeTo },
                },
            }),

            db.tarefaRegistroHora.findMany({
                where: { data: { gte: rangeFrom, lte: rangeTo } },
                select: {
                    horas: true,
                    data: true,
                    tarefaId: true,
                    tarefa: {
                        select: {
                            advogado: {
                                select: { user: { select: { id: true, name: true } } },
                            },
                            processo: {
                                select: {
                                    tipo: true,
                                    cliente: { select: { id: true, nome: true } },
                                },
                            },
                        },
                    },
                },
            }),
        ]);

        // ── Por Advogado ─────────────────────────────────────────────────────

        const byAdvogado = new Map<string, {
            name: string;
            recebido: number;
            aReceber: number;
            horasTrabalhadas: number;
            clientes: Set<string>;
        }>();

        // Receita dos casos financeiros — distribui entre participantes
        for (const caso of casosFinanceiros) {
            const recebido = toNumber(caso.valorRecebidoEscritorio);
            const aReceber = toNumber(caso.valorAReceberEscritorio);

            if (caso.participantes.length > 0) {
                for (const p of caso.participantes) {
                    const name = p.advogado.user.name;
                    const perc = toNumber(p.percentualParticipacao) / 100;
                    const entry = byAdvogado.get(name) ?? { name, recebido: 0, aReceber: 0, horasTrabalhadas: 0, clientes: new Set() };
                    entry.recebido += recebido * perc;
                    entry.aReceber += aReceber * perc;
                    if (caso.cliente?.id) entry.clientes.add(caso.cliente.id);
                    byAdvogado.set(name, entry);
                }
            } else if (caso.processo?.advogado) {
                const name = caso.processo.advogado.user.name;
                const entry = byAdvogado.get(name) ?? { name, recebido: 0, aReceber: 0, horasTrabalhadas: 0, clientes: new Set() };
                entry.recebido += recebido;
                entry.aReceber += aReceber;
                if (caso.cliente?.id) entry.clientes.add(caso.cliente.id);
                byAdvogado.set(name, entry);
            }
        }

        // Horas trabalhadas por advogado
        for (const reg of registrosHora) {
            const name = reg.tarefa?.advogado?.user?.name;
            if (!name) continue;
            const entry = byAdvogado.get(name) ?? { name, recebido: 0, aReceber: 0, horasTrabalhadas: 0, clientes: new Set() };
            entry.horasTrabalhadas += reg.horas;
            if (reg.tarefa?.processo?.cliente?.id) {
                entry.clientes.add(reg.tarefa.processo.cliente.id);
            }
            byAdvogado.set(name, entry);
        }

        const rankingAdvogados = [...byAdvogado.values()]
            .map((adv) => ({
                nome: adv.name,
                recebido: Math.round(adv.recebido * 100) / 100,
                aReceber: Math.round(adv.aReceber * 100) / 100,
                totalReceita: Math.round((adv.recebido + adv.aReceber) * 100) / 100,
                horasTrabalhadas: Math.round(adv.horasTrabalhadas * 10) / 10,
                totalClientes: adv.clientes.size,
                receitaPorHora: adv.horasTrabalhadas > 0
                    ? Math.round((adv.recebido / adv.horasTrabalhadas) * 100) / 100
                    : null,
            }))
            .sort((a, b) => b.recebido - a.recebido)
            .slice(0, topN);

        // ── Por Cliente ──────────────────────────────────────────────────────

        const byCliente = new Map<string, { nome: string; recebido: number; aReceber: number }>();

        for (const caso of casosFinanceiros) {
            const nome = caso.cliente?.nome ?? "Cliente não identificado";
            const entry = byCliente.get(nome) ?? { nome, recebido: 0, aReceber: 0 };
            entry.recebido += toNumber(caso.valorRecebidoEscritorio);
            entry.aReceber += toNumber(caso.valorAReceberEscritorio);
            byCliente.set(nome, entry);
        }

        const rankingClientes = [...byCliente.values()]
            .map((c) => ({
                nome: c.nome,
                recebido: Math.round(c.recebido * 100) / 100,
                aReceber: Math.round(c.aReceber * 100) / 100,
                totalReceita: Math.round((c.recebido + c.aReceber) * 100) / 100,
            }))
            .sort((a, b) => b.recebido - a.recebido)
            .slice(0, topN);

        // ── Por Tipo de Processo ──────────────────────────────────────────────

        const byArea = new Map<string, { area: string; recebido: number; aReceber: number; processos: number }>();

        for (const caso of casosFinanceiros) {
            const area = caso.processo?.tipo ?? "Não informado";
            const entry = byArea.get(area) ?? { area, recebido: 0, aReceber: 0, processos: 0 };
            entry.recebido += toNumber(caso.valorRecebidoEscritorio);
            entry.aReceber += toNumber(caso.valorAReceberEscritorio);
            entry.processos += 1;
            byArea.set(area, entry);
        }

        const rankingAreas = [...byArea.values()]
            .map((a) => ({
                area: a.area,
                recebido: Math.round(a.recebido * 100) / 100,
                aReceber: Math.round(a.aReceber * 100) / 100,
                totalReceita: Math.round((a.recebido + a.aReceber) * 100) / 100,
                processos: a.processos,
                ticketMedio: a.processos > 0 ? Math.round((a.recebido / a.processos) * 100) / 100 : 0,
            }))
            .sort((a, b) => b.recebido - a.recebido)
            .slice(0, topN);

        // ── Resumo Global ────────────────────────────────────────────────────

        const totalRecebido = casosFinanceiros.reduce((sum, c) => sum + toNumber(c.valorRecebidoEscritorio), 0);
        const totalAReceber = casosFinanceiros.reduce((sum, c) => sum + toNumber(c.valorAReceberEscritorio), 0);
        const totalHoras = registrosHora.reduce((sum, r) => sum + r.horas, 0);
        const receitaPorHoraGlobal = totalHoras > 0 ? totalRecebido / totalHoras : null;

        return NextResponse.json({
            periodo: {
                rangeFrom: rangeFrom.toISOString(),
                rangeTo: rangeTo.toISOString(),
            },
            resumo: {
                totalRecebido: Math.round(totalRecebido * 100) / 100,
                totalAReceber: Math.round(totalAReceber * 100) / 100,
                totalReceita: Math.round((totalRecebido + totalAReceber) * 100) / 100,
                totalHorasTrabalhadas: Math.round(totalHoras * 10) / 10,
                receitaPorHora: receitaPorHoraGlobal !== null ? Math.round(receitaPorHoraGlobal * 100) / 100 : null,
                totalCasos: casosFinanceiros.length,
            },
            rankingAdvogados,
            rankingClientes,
            rankingAreas,
        });
    } catch (error) {
        console.error("[API Rentabilidade] Error:", error);
        return NextResponse.json({ error: "Erro ao calcular rentabilidade" }, { status: 500 });
    }
}
