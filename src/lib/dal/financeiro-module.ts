import "server-only";

import type { Role } from "@/generated/prisma";
import { db } from "@/lib/db";
import { getFinanceiroConfig } from "@/lib/services/financeiro-config";
import { getReguaCobrancaDashboardData } from "@/lib/services/regua-cobranca";

export interface FinanceiroModuleScope {
    userId?: string | null;
    role?: Role | null;
    advogadoId?: string | null;
}

export interface FinanceiroModuleFilters {
    from?: string;
    to?: string;
    search?: string;
    advogadoId?: string;
    clienteId?: string;
    processoId?: string;
    status?: string;
    categoria?: string;
    centroCustoId?: string;
}

function decimalToNumber(value: unknown) {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value) || 0;
    if (typeof value === "object" && value && "toNumber" in value && typeof value.toNumber === "function") {
        return value.toNumber();
    }
    return Number(value) || 0;
}

function toDateValue(value?: string) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function includesText(value: string | null | undefined, search: string) {
    if (!search) return true;
    return (value ?? "").toLowerCase().includes(search.toLowerCase());
}

function monthKey(date: Date | string | null | undefined) {
    if (!date) return "sem-data";
    const parsed = typeof date === "string" ? new Date(date) : date;
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}

function canManageFinanceiro(role?: Role | null) {
    return role === "ADMIN" || role === "SOCIO" || role === "FINANCEIRO" || role === "CONTROLADOR";
}

function canViewOfficeData(role?: Role | null) {
    return role !== "ADVOGADO";
}

export async function getFinanceiroModuleData(
    filters: FinanceiroModuleFilters = {},
    scope?: FinanceiroModuleScope,
    options?: { includeReguaCobranca?: boolean }
) {
    const search = (filters.search ?? "").trim();
    const from = toDateValue(filters.from);
    const to = toDateValue(filters.to);
    const scopedAdvogadoId = scope?.role === "ADVOGADO" ? scope.advogadoId ?? null : null;
    const officeWhere = canViewOfficeData(scope?.role)
        ? {}
        : { processo: { is: { advogadoId: scopedAdvogadoId ?? undefined } } };
    const caseWhere = scopedAdvogadoId ? { processo: { advogadoId: scopedAdvogadoId } } : {};
    const legacyFaturaWhere = scopedAdvogadoId
        ? { honorario: { is: { processo: { advogadoId: scopedAdvogadoId } } } }
        : {};
    const legacyContaWhere = scopedAdvogadoId ? { processo: { is: { advogadoId: scopedAdvogadoId } } } : {};

    const [
        officeLaunches,
        caseEvents,
        employeeFinance,
        legacyFaturas,
        legacyContas,
        config,
        centrosCusto,
        clientes,
        processos,
        advogados,
        funcionarios,
        reguaCobranca,
    ] = await Promise.all([
        db.financeiroEscritorioLancamento.findMany({
            where: officeWhere,
            include: {
                centroCusto: { select: { id: true, nome: true } },
                cliente: { select: { id: true, nome: true } },
                processo: { select: { id: true, numeroCnj: true, advogadoId: true } },
            },
            orderBy: { dataCompetencia: "desc" },
        }),
        db.casoFinanceiro.findMany({
            where: caseWhere,
            include: {
                cliente: { select: { id: true, nome: true } },
                processo: { select: { id: true, numeroCnj: true, advogadoId: true } },
                participantes: {
                    include: {
                        advogado: { include: { user: { select: { id: true, name: true } } } },
                    },
                },
                repasses: {
                    include: {
                        advogado: { include: { user: { select: { id: true, name: true } } } },
                        funcionario: { select: { id: true, name: true } },
                    },
                },
                despesas: true,
            },
            orderBy: { dataResultado: "desc" },
        }),
        canViewOfficeData(scope?.role)
            ? db.funcionarioFinanceiro.findMany({
                  include: {
                      user: { select: { id: true, name: true, role: true, isActive: true } },
                      centroCusto: { select: { id: true, nome: true } },
                      lancamentos: { orderBy: { competencia: "desc" } },
                  },
                  orderBy: { user: { name: "asc" } },
              })
            : Promise.resolve([]),
        db.fatura.findMany({
            where: legacyFaturaWhere,
            include: {
                cliente: { select: { id: true, nome: true } },
                honorario: { include: { processo: { select: { id: true, numeroCnj: true, advogadoId: true } } } },
                notaFiscalServico: {
                    select: {
                        id: true,
                        numero: true,
                        status: true,
                        emitidaEm: true,
                    },
                },
            },
            orderBy: { dataVencimento: "asc" },
        }),
        db.contaPagar.findMany({
            where: legacyContaWhere,
            include: {
                centroCusto: { select: { id: true, nome: true } },
                processo: { select: { id: true, numeroCnj: true, advogadoId: true } },
            },
            orderBy: { dataVencimento: "asc" },
        }),
        getFinanceiroConfig(),
        db.centroCusto.findMany({ where: { ativo: true }, select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
        db.cliente.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
        db.processo.findMany({
            where: scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {},
            select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } },
            orderBy: { updatedAt: "desc" },
        }),
        db.advogado.findMany({
            where: { ativo: true },
            include: { user: { select: { id: true, name: true } } },
            orderBy: { user: { name: "asc" } },
        }),
        canManageFinanceiro(scope?.role)
            ? db.user.findMany({
                  where: { role: { in: ["FINANCEIRO", "ASSISTENTE", "SECRETARIA", "CONTROLADOR"] }, isActive: true },
                  select: { id: true, name: true, role: true },
                  orderBy: { name: "asc" },
              })
            : Promise.resolve([]),
        options?.includeReguaCobranca ? getReguaCobrancaDashboardData() : Promise.resolve(null),
    ]);

    const officeRows = officeLaunches
        .map((item) => ({
            id: item.id,
            tipo: item.tipoLancamento,
            classificacao: item.classificacao,
            categoria: item.categoriaPrincipal,
            subcategoria: item.subcategoria,
            descricao: item.descricao,
            centroCusto: item.centroCusto?.nome ?? "Sem centro",
            centroCustoId: item.centroCustoId,
            clienteId: item.clienteId,
            clienteNome: item.cliente?.nome ?? null,
            processoId: item.processoId,
            processoNumero: item.processo?.numeroCnj ?? null,
            dataCompetencia: item.dataCompetencia,
            dataPagamento: item.dataPagamento,
            status: item.status,
            recorrente: item.recorrente,
            valorPrevisto: decimalToNumber(item.valorPrevisto),
            valorReal: decimalToNumber(item.valorReal),
        }))
        .filter((item) => {
            if (from && item.dataCompetencia < from) return false;
            if (to && item.dataCompetencia > to) return false;
            if (filters.clienteId && item.clienteId !== filters.clienteId) return false;
            if (filters.processoId && item.processoId !== filters.processoId) return false;
            if (filters.status && item.status !== filters.status) return false;
            if (filters.categoria && item.subcategoria !== filters.categoria && item.categoria !== filters.categoria) return false;
            if (filters.centroCustoId && item.centroCustoId !== filters.centroCustoId) return false;
            return (
                includesText(item.descricao, search) ||
                includesText(item.categoria, search) ||
                includesText(item.subcategoria, search) ||
                includesText(item.clienteNome, search) ||
                includesText(item.processoNumero, search)
            );
        });

    const caseRows = caseEvents
        .map((item) => {
            const recebido = decimalToNumber(item.valorRecebidoEscritorio);
            const repassado = item.repasses.reduce((sum, repasse) => sum + decimalToNumber(repasse.valorPago), 0);
            const previstoRepasses = item.repasses.reduce((sum, repasse) => sum + decimalToNumber(repasse.valorPrevisto), 0);
            const despesas = item.despesas.reduce((sum, despesa) => sum + decimalToNumber(despesa.valor), 0);
            const impostos = decimalToNumber(item.impostosCaso);
            const honorarioEscritorio = decimalToNumber(item.valorHonorarioEscritorio);
            const saldoEscritorio = honorarioEscritorio - repassado - item.despesas.filter((d) => !d.reembolsavel).reduce((sum, d) => sum + decimalToNumber(d.valor), 0);
            return {
                id: item.id,
                clienteId: item.clienteId,
                clienteNome: item.cliente.nome,
                processoId: item.processoId,
                processoNumero: item.processo.numeroCnj ?? "Sem numero",
                tipoEvento: item.tipoEvento,
                descricaoEvento: item.descricaoEvento,
                valorBrutoCaso: decimalToNumber(item.valorBrutoCaso),
                percentualHonorarioEscritorio: decimalToNumber(item.percentualHonorarioEscritorio),
                valorHonorarioEscritorio: honorarioEscritorio,
                valorRecebidoEscritorio: recebido,
                valorAReceberEscritorio: decimalToNumber(item.valorAReceberEscritorio),
                valorPrevistoRepasses: previstoRepasses,
                repassado,
                saldoEscritorio,
                despesas,
                resultadoLiquido: recebido - repassado - despesas - impostos,
                statusFinanceiro: item.statusFinanceiro,
                dataResultado: item.dataResultado,
                dataRecebimento: item.dataRecebimento,
                participantes: item.participantes.map((participante) => ({
                    id: participante.id,
                    advogadoId: participante.advogadoId,
                    nome: participante.advogado.user.name,
                    percentual: decimalToNumber(participante.percentualParticipacao),
                    previsto: decimalToNumber(participante.valorPrevistoRateio),
                    pago: decimalToNumber(participante.valorPagoRateio),
                    pendente: decimalToNumber(participante.valorPendenteRateio),
                    status: participante.statusRateio,
                })),
                repasses: item.repasses.map((repasse) => ({
                    id: repasse.id,
                    advogadoId: repasse.advogadoId,
                    funcionarioId: repasse.funcionarioId,
                    destinatario: repasse.advogado?.user.name ?? repasse.funcionario?.name ?? repasse.tipoRepasse,
                    tipo: repasse.tipoRepasse,
                    previsto: decimalToNumber(repasse.valorPrevisto),
                    pago: decimalToNumber(repasse.valorPago),
                    status: repasse.status,
                    dataPagamento: repasse.dataPagamento,
                })),
                despesasDetalhadas: item.despesas.map((despesa) => ({
                    id: despesa.id,
                    tipo: despesa.tipoDespesa,
                    descricao: despesa.descricao,
                    valor: decimalToNumber(despesa.valor),
                    status: despesa.status,
                    reembolsavel: despesa.reembolsavel,
                    pagoPor: despesa.pagoPor,
                    dataLancamento: despesa.dataLancamento,
                })),
            };
        })
        .filter((item) => {
            if (from && item.dataResultado && item.dataResultado < from) return false;
            if (to && item.dataResultado && item.dataResultado > to) return false;
            if (filters.advogadoId && !item.participantes.some((p) => p.advogadoId === filters.advogadoId || p.nome === filters.advogadoId)) return false;
            if (filters.clienteId && item.clienteId !== filters.clienteId) return false;
            if (filters.processoId && item.processoId !== filters.processoId) return false;
            if (filters.status && item.statusFinanceiro !== filters.status) return false;
            return includesText(item.clienteNome, search) || includesText(item.processoNumero, search) || includesText(item.descricaoEvento, search);
        });

    const repasses = caseRows.flatMap((item) => item.repasses.map((repasse) => ({ ...repasse, casoId: item.id, clienteNome: item.clienteNome, processoNumero: item.processoNumero })));

    const contasPagar = [
        ...officeRows.filter((item) => item.tipo === "SAIDA").map((item) => ({
            id: item.id,
            origem: "lancamento_escritorio",
            descricao: item.descricao,
            categoria: item.subcategoria,
            valor: item.valorReal || item.valorPrevisto,
            dataVencimento: item.dataCompetencia,
            status: item.status,
            centroCusto: item.centroCusto,
            processoNumero: item.processoNumero,
        })),
        ...legacyContas.map((item) => ({
            id: item.id,
            origem: "conta_pagar_legacy",
            descricao: item.descricao,
            categoria: item.tipo,
            valor: decimalToNumber(item.valor),
            dataVencimento: item.dataVencimento,
            status: item.pago ? "PAGO" : "PENDENTE",
            centroCusto: item.centroCusto?.nome ?? "Sem centro",
            processoNumero: item.processo?.numeroCnj ?? null,
        })),
    ];

    const contasReceber = [
        ...caseRows.map((item) => ({
            id: item.id,
            origem: "caso_financeiro",
            clienteNome: item.clienteNome,
            processoNumero: item.processoNumero,
            descricao: item.descricaoEvento,
            valor: item.valorAReceberEscritorio,
            status: item.statusFinanceiro,
            data: item.dataResultado,
        })),
        ...legacyFaturas.map((item) => ({
            id: item.id,
            origem: "fatura_legacy",
            faturaId: item.id,
            clienteNome: item.cliente.nome,
            processoNumero: item.honorario?.processo?.numeroCnj ?? null,
            descricao: item.descricao ?? item.numero,
            valor: decimalToNumber(item.valorTotal),
            status: item.status,
            data: item.dataVencimento,
            notaFiscalServico: item.notaFiscalServico
                ? {
                      id: item.notaFiscalServico.id,
                      numero: item.notaFiscalServico.numero,
                      status: item.notaFiscalServico.status,
                      emitidaEm: item.notaFiscalServico.emitidaEm,
                  }
                : null,
            podeEmitirNotaFiscal: item.status === "PAGA",
        })),
    ];

    const totalEntradas = officeRows.filter((item) => item.tipo === "ENTRADA").reduce((sum, item) => sum + (item.valorReal || item.valorPrevisto), 0);
    const totalSaidas = officeRows.filter((item) => item.tipo === "SAIDA").reduce((sum, item) => sum + (item.valorReal || item.valorPrevisto), 0);
    const honorariosPendentesRepasse = repasses.reduce((sum, repasse) => sum + Math.max(repasse.previsto - repasse.pago, 0), 0);
    const reembolsosPendentes = caseEvents.reduce(
        (sum, item) =>
            sum +
            item.despesas
                .filter((despesa) => despesa.reembolsavel && despesa.status !== "REEMBOLSADO")
                .reduce((inner, despesa) => inner + decimalToNumber(despesa.valor), 0),
        0
    );

    const monthlyFlow = officeRows.reduce<Record<string, { month: string; entradas: number; saidas: number }>>((acc, row) => {
        const key = monthKey(row.dataCompetencia);
        acc[key] ??= { month: key, entradas: 0, saidas: 0 };
        if (row.tipo === "ENTRADA") acc[key].entradas += row.valorReal || row.valorPrevisto;
        if (row.tipo === "SAIDA") acc[key].saidas += row.valorReal || row.valorPrevisto;
        return acc;
    }, {});

    const expensesByCategory = officeRows
        .filter((item) => item.tipo === "SAIDA")
        .reduce<Record<string, number>>((acc, row) => {
            acc[row.subcategoria] = (acc[row.subcategoria] ?? 0) + (row.valorReal || row.valorPrevisto);
            return acc;
        }, {});

    const revenuesByClient = caseRows.reduce<Record<string, number>>((acc, row) => {
        acc[row.clienteNome] = (acc[row.clienteNome] ?? 0) + row.valorRecebidoEscritorio;
        return acc;
    }, {});

    const revenuesByLawyer = caseRows.reduce<Record<string, number>>((acc, row) => {
        row.participantes.forEach((participante) => {
            acc[participante.nome] = (acc[participante.nome] ?? 0) + participante.previsto;
        });
        return acc;
    }, {});

    const costsByCenter = officeRows
        .filter((item) => item.tipo === "SAIDA")
        .reduce<Record<string, number>>((acc, row) => {
            acc[row.centroCusto] = (acc[row.centroCusto] ?? 0) + (row.valorReal || row.valorPrevisto);
            return acc;
        }, {});

    return {
        permissions: {
            canManage: canManageFinanceiro(scope?.role),
            canViewOffice: canViewOfficeData(scope?.role),
            canApproveRepasse: canManageFinanceiro(scope?.role),
        },
        filters,
        config,
        dashboard: {
            cards: [
                { label: "Receita do periodo", value: totalEntradas },
                { label: "Despesa do periodo", value: totalSaidas },
                { label: "Lucro liquido", value: totalEntradas - totalSaidas },
                { label: "Total a receber", value: contasReceber.reduce((sum, item) => sum + (item.status === "PAGA" || item.status === "RECEBIDO_INTEGRAL" ? 0 : item.valor), 0) },
                { label: "Total a pagar", value: contasPagar.reduce((sum, item) => sum + (item.status === "PAGO" ? 0 : item.valor), 0) },
                { label: "Honorarios pendentes de repasse", value: honorariosPendentesRepasse },
                { label: "Despesas operacionais", value: totalSaidas },
                { label: "Receitas por honorarios", value: caseRows.reduce((sum, item) => sum + item.valorRecebidoEscritorio, 0) },
                { label: "Reembolsos pendentes", value: reembolsosPendentes },
                {
                    label: "Taxa de recebimento",
                    value:
                        contasReceber.reduce((sum, item) => sum + item.valor, 0) > 0
                            ? (caseRows.reduce((sum, item) => sum + item.valorRecebidoEscritorio, 0) /
                                  Math.max(
                                      caseRows.reduce((sum, item) => sum + item.valorHonorarioEscritorio, 0),
                                      1
                                  )) *
                              100
                            : 0,
                },
            ],
            monthlyFlow: Object.values(monthlyFlow).sort((a, b) => a.month.localeCompare(b.month)),
            expensesByCategory: Object.entries(expensesByCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            revenuesByClient: Object.entries(revenuesByClient).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            revenuesByLawyer: Object.entries(revenuesByLawyer).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            profitableCases: [...caseRows].sort((a, b) => b.resultadoLiquido - a.resultadoLiquido).slice(0, 5),
            costsByCenter: Object.entries(costsByCenter).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        },
        escritorio: officeRows,
        casos: caseRows,
        funcionarios: employeeFinance.map((item) => ({
            id: item.id,
            userId: item.userId,
            nome: item.user.name,
            role: item.user.role,
            tipoVinculo: item.tipoVinculo,
            centroCusto: item.centroCusto?.nome ?? "Sem centro",
            valorTotalMensal: decimalToNumber(item.valorTotalMensal),
            status: item.status,
            ultimaCompetencia: item.lancamentos[0]?.competencia ?? null,
            lancamentos: item.lancamentos.map((lancamento) => ({
                id: lancamento.id,
                competencia: lancamento.competencia,
                valorTotal: decimalToNumber(lancamento.valorTotal),
                statusPagamento: lancamento.statusPagamento,
                dataPagamento: lancamento.dataPagamento,
            })),
        })),
        contasPagar,
        contasReceber,
        repasses,
        fluxoCaixa: Object.values(monthlyFlow).sort((a, b) => a.month.localeCompare(b.month)).map((item, index, array) => {
            const saldoAcumulado = array.slice(0, index + 1).reduce((sum, row) => sum + row.entradas - row.saidas, 0);
            return { ...item, saldoAcumulado };
        }),
        relatorios: {
            rentabilidadeClientes: [...caseRows]
                .reduce<Record<string, { cliente: string; receita: number; despesas: number; lucro: number; casos: number }>>((acc, row) => {
                    acc[row.clienteNome] ??= { cliente: row.clienteNome, receita: 0, despesas: 0, lucro: 0, casos: 0 };
                    acc[row.clienteNome].receita += row.valorRecebidoEscritorio;
                    acc[row.clienteNome].despesas += row.despesas;
                    acc[row.clienteNome].lucro += row.resultadoLiquido;
                    acc[row.clienteNome].casos += 1;
                    return acc;
                }, {}),
            produtividadeAdvogados: Object.entries(revenuesByLawyer).map(([nome, previsto]) => ({
                nome,
                previsto,
                pago: repasses.filter((item) => item.destinatario === nome).reduce((sum, item) => sum + item.pago, 0),
                pendente: repasses.filter((item) => item.destinatario === nome).reduce((sum, item) => sum + Math.max(item.previsto - item.pago, 0), 0),
            })),
            dreEscritorio: {
                receitaBruta: totalEntradas,
                receitaHonorarios: caseRows.reduce((sum, item) => sum + item.valorRecebidoEscritorio, 0),
                receitaReembolsos: officeRows
                    .filter((item) => item.tipo === "ENTRADA" && item.categoria === "Receita" && item.subcategoria.toLowerCase().includes("reembolso"))
                    .reduce((sum, item) => sum + (item.valorReal || item.valorPrevisto), 0),
                despesasOperacionais: totalSaidas,
                despesasProcesso: caseRows.reduce((sum, item) => sum + item.despesas, 0),
                salariosEncargos: employeeFinance.reduce((sum, item) => sum + decimalToNumber(item.valorTotalMensal), 0),
                marketing: costsByCenter.Marketing ?? 0,
                tecnologia: costsByCenter.Tecnologia ?? 0,
                totalRepassadoAdvogados: repasses.reduce((sum, item) => sum + item.pago, 0),
                saldoLiquidoEscritorio: totalEntradas - totalSaidas - repasses.reduce((sum, item) => sum + item.pago, 0),
                contasPagar: contasPagar.reduce((sum, item) => sum + item.valor, 0),
                contasReceber: contasReceber.reduce((sum, item) => sum + item.valor, 0),
            },
        },
        selects: {
            centrosCusto,
            clientes,
            processos,
            advogados: advogados.map((item) => ({ id: item.id, nome: item.user.name })),
            funcionarios: funcionarios.map((item) => ({ id: item.id, nome: item.name, role: item.role })),
        },
        reguaCobranca,
    };
}

export type FinanceiroModuleData = Awaited<ReturnType<typeof getFinanceiroModuleData>>;
