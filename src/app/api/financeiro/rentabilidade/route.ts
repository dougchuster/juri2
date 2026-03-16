import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// ─── Tipos de resposta ────────────────────────────────────────────────────────

interface RentabilidadeAdvogado {
    advogadoId: string;
    nomeAdvogado: string;
    oab: string;
    totalProcessos: number;
    processosEncerrados: number;
    processosGanhos: number;
    taxaExito: number; // %
    valorTotalCausas: number;
    receitaBruta: number; // honorários recebidos
    receitaPendente: number;
    repassesRecebidos: number;
    repassesPendentes: number;
}

interface RentabilidadeCliente {
    clienteId: string;
    nomeCliente: string;
    totalProcessos: number;
    processosEncerrados: number;
    processosGanhos: number;
    taxaExito: number;
    valorTotalCausas: number;
    receitaBruta: number;
    receitaPendente: number;
    honorariosEmAberto: number;
}

interface RentabilidadeArea {
    areaDireito: string;
    totalProcessos: number;
    processosEncerrados: number;
    processosGanhos: number;
    taxaExito: number;
    valorMedioCausa: number;
    receitaBruta: number;
    receitaPendente: number;
    tempoMedioTramitacaoDias: number | null;
}

interface RentabilidadeResponse {
    periodo: { inicio: string; fim: string };
    porAdvogado: RentabilidadeAdvogado[];
    porCliente: RentabilidadeCliente[];
    porArea: RentabilidadeArea[];
    resumo: {
        totalProcessos: number;
        receitaBrutaTotal: number;
        receitaPendenteTotal: number;
        taxaExitoGeral: number;
        valorTotalCausas: number;
    };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const inicioParam = searchParams.get("inicio");
        const fimParam = searchParams.get("fim");

        // Período padrão: últimos 12 meses
        const fim = fimParam ? new Date(fimParam) : new Date();
        const inicio = inicioParam
            ? new Date(inicioParam)
            : new Date(fim.getFullYear() - 1, fim.getMonth(), fim.getDate());

        fim.setHours(23, 59, 59, 999);
        inicio.setHours(0, 0, 0, 0);

        // ── Busca processos do período ──────────────────────────────────────
        const processos = await db.processo.findMany({
            where: {
                createdAt: { gte: inicio, lte: fim },
                advogado: { ativo: true },
            },
            select: {
                id: true,
                status: true,
                resultado: true,
                valorCausa: true,
                dataDistribuicao: true,
                dataEncerramento: true,
                tipoAcao: { select: { nome: true } },
                advogado: {
                    select: {
                        id: true,
                        oab: true,
                        user: { select: { name: true } },
                    },
                },
                cliente: {
                    select: {
                        id: true,
                        nome: true,
                    },
                },
                casosFinanceiros: {
                    select: {
                        valorHonorarioEscritorio: true,
                        valorRecebidoEscritorio: true,
                        valorAReceberEscritorio: true,
                        statusFinanceiro: true,
                    },
                },
            },
        });

        // ── Por Advogado ────────────────────────────────────────────────────
        const advMap = new Map<string, RentabilidadeAdvogado>();

        for (const proc of processos) {
            const advId = proc.advogado.id;
            if (!advMap.has(advId)) {
                advMap.set(advId, {
                    advogadoId: advId,
                    nomeAdvogado: proc.advogado.user.name,
                    oab: proc.advogado.oab,
                    totalProcessos: 0,
                    processosEncerrados: 0,
                    processosGanhos: 0,
                    taxaExito: 0,
                    valorTotalCausas: 0,
                    receitaBruta: 0,
                    receitaPendente: 0,
                    repassesRecebidos: 0,
                    repassesPendentes: 0,
                });
            }

            const adv = advMap.get(advId)!;
            adv.totalProcessos++;

            const encerrado = ["ENCERRADO", "ARQUIVADO"].includes(proc.status);
            if (encerrado) adv.processosEncerrados++;
            if (proc.resultado === "GANHO" || proc.resultado === "ACORDO") {
                adv.processosGanhos++;
            }

            if (proc.valorCausa) {
                adv.valorTotalCausas += Number(proc.valorCausa);
            }

            for (const caso of proc.casosFinanceiros) {
                adv.receitaBruta += Number(caso.valorRecebidoEscritorio || 0);
                adv.receitaPendente += Number(caso.valorAReceberEscritorio || 0);
            }
        }

        // Buscar repasses por advogado
        const repasses = await db.repasseHonorario.findMany({
            where: {
                advogadoId: { not: null },
                casoFinanceiro: {
                    processo: {
                        createdAt: { gte: inicio, lte: fim },
                    },
                },
            },
            select: {
                advogadoId: true,
                valorPrevisto: true,
                valorPago: true,
                status: true,
            },
        });

        for (const rep of repasses) {
            if (!rep.advogadoId) continue;
            const adv = advMap.get(rep.advogadoId);
            if (!adv) continue;
            adv.repassesRecebidos += Number(rep.valorPago || 0);
            if (rep.status !== "PAGO") {
                adv.repassesPendentes += Number(rep.valorPrevisto || 0) - Number(rep.valorPago || 0);
            }
        }

        const porAdvogado = Array.from(advMap.values()).map((adv) => ({
            ...adv,
            taxaExito:
                adv.processosEncerrados > 0
                    ? Math.round((adv.processosGanhos / adv.processosEncerrados) * 100)
                    : 0,
        }));

        porAdvogado.sort((a, b) => b.receitaBruta - a.receitaBruta);

        // ── Por Cliente ─────────────────────────────────────────────────────
        const clienteMap = new Map<string, RentabilidadeCliente>();

        for (const proc of processos) {
            if (!proc.cliente) continue;
            const cliId = proc.cliente.id;

            if (!clienteMap.has(cliId)) {
                clienteMap.set(cliId, {
                    clienteId: cliId,
                    nomeCliente: proc.cliente.nome,
                    totalProcessos: 0,
                    processosEncerrados: 0,
                    processosGanhos: 0,
                    taxaExito: 0,
                    valorTotalCausas: 0,
                    receitaBruta: 0,
                    receitaPendente: 0,
                    honorariosEmAberto: 0,
                });
            }

            const cli = clienteMap.get(cliId)!;
            cli.totalProcessos++;

            if (["ENCERRADO", "ARQUIVADO"].includes(proc.status)) cli.processosEncerrados++;
            if (proc.resultado === "GANHO" || proc.resultado === "ACORDO") {
                cli.processosGanhos++;
            }
            if (proc.valorCausa) cli.valorTotalCausas += Number(proc.valorCausa);

            for (const caso of proc.casosFinanceiros) {
                cli.receitaBruta += Number(caso.valorRecebidoEscritorio || 0);
                cli.receitaPendente += Number(caso.valorAReceberEscritorio || 0);
                if (caso.statusFinanceiro !== "RECEBIDO_INTEGRAL" && caso.statusFinanceiro !== "ENCERRADO") {
                    cli.honorariosEmAberto += Number(caso.valorAReceberEscritorio || 0);
                }
            }
        }

        const porCliente = Array.from(clienteMap.values())
            .map((cli) => ({
                ...cli,
                taxaExito:
                    cli.processosEncerrados > 0
                        ? Math.round((cli.processosGanhos / cli.processosEncerrados) * 100)
                        : 0,
            }))
            .sort((a, b) => b.receitaBruta - a.receitaBruta)
            .slice(0, 50); // top 50 clientes

        // ── Por Área do Direito ─────────────────────────────────────────────
        const areaMap = new Map<string, {
            processos: typeof processos;
        }>();

        for (const proc of processos) {
            const area = proc.tipoAcao?.nome || "Sem classificação";
            if (!areaMap.has(area)) {
                areaMap.set(area, { processos: [] });
            }
            areaMap.get(area)!.processos.push(proc);
        }

        const porArea: RentabilidadeArea[] = Array.from(areaMap.entries()).map(
            ([area, data]) => {
                const procs = data.processos;
                const encerrados = procs.filter((p) =>
                    ["ENCERRADO", "ARQUIVADO"].includes(p.status)
                );
                const ganhos = procs.filter(
                    (p) =>
                        p.resultado === "GANHO" ||
                        p.resultado === "ACORDO"
                );

                const valorCausas = procs
                    .filter((p) => p.valorCausa)
                    .map((p) => Number(p.valorCausa));
                const valorMedioCausa =
                    valorCausas.length > 0
                        ? valorCausas.reduce((a, b) => a + b, 0) / valorCausas.length
                        : 0;

                let receitaBruta = 0;
                let receitaPendente = 0;
                for (const proc of procs) {
                    for (const caso of proc.casosFinanceiros) {
                        receitaBruta += Number(caso.valorRecebidoEscritorio || 0);
                        receitaPendente += Number(caso.valorAReceberEscritorio || 0);
                    }
                }

                // Tempo médio de tramitação (processos encerrados com datas)
                const tempos = encerrados
                    .filter((p) => p.dataDistribuicao && p.dataEncerramento)
                    .map((p) => {
                        const diff =
                            new Date(p.dataEncerramento!).getTime() -
                            new Date(p.dataDistribuicao!).getTime();
                        return Math.round(diff / (1000 * 60 * 60 * 24));
                    });
                const tempoMedio =
                    tempos.length > 0
                        ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length)
                        : null;

                return {
                    areaDireito: area,
                    totalProcessos: procs.length,
                    processosEncerrados: encerrados.length,
                    processosGanhos: ganhos.length,
                    taxaExito:
                        encerrados.length > 0
                            ? Math.round((ganhos.length / encerrados.length) * 100)
                            : 0,
                    valorMedioCausa,
                    receitaBruta,
                    receitaPendente,
                    tempoMedioTramitacaoDias: tempoMedio,
                };
            }
        );

        porArea.sort((a, b) => b.receitaBruta - a.receitaBruta);

        // ── Resumo geral ────────────────────────────────────────────────────
        const totalEncerrados = processos.filter((p) =>
            ["ENCERRADO", "ARQUIVADO"].includes(p.status)
        ).length;
        const totalGanhos = processos.filter(
            (p) =>
                p.resultado === "GANHO" ||
                p.resultado === "ACORDO"
        ).length;

        let receitaBrutaTotal = 0;
        let receitaPendenteTotal = 0;
        let valorTotalCausas = 0;

        for (const proc of processos) {
            if (proc.valorCausa) valorTotalCausas += Number(proc.valorCausa);
            for (const caso of proc.casosFinanceiros) {
                receitaBrutaTotal += Number(caso.valorRecebidoEscritorio || 0);
                receitaPendenteTotal += Number(caso.valorAReceberEscritorio || 0);
            }
        }

        const response: RentabilidadeResponse = {
            periodo: {
                inicio: inicio.toISOString().slice(0, 10),
                fim: fim.toISOString().slice(0, 10),
            },
            porAdvogado,
            porCliente,
            porArea,
            resumo: {
                totalProcessos: processos.length,
                receitaBrutaTotal,
                receitaPendenteTotal,
                taxaExitoGeral:
                    totalEncerrados > 0
                        ? Math.round((totalGanhos / totalEncerrados) * 100)
                        : 0,
                valorTotalCausas,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("[Rentabilidade] Erro:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
