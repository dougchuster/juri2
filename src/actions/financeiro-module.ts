"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/actions/auth";
import {
    Prisma,
    type FormaPagamentoFinanceira,
    type Role,
    type StatusCasoFinanceiro,
    type StatusLancamentoFinanceiro,
    type StatusRateioHonorario,
} from "@/generated/prisma";
import { db } from "@/lib/db";
import { registrarLogAuditoria } from "@/lib/services/audit-log";
import { getEscritorioId } from "@/lib/tenant";
import { getFinanceiroConfig, saveFinanceiroConfig } from "@/lib/services/financeiro-config";
import {
    atualizarLancamentoStatusSchema,
    type AtualizarLancamentoStatusInput,
    casoFinanceiroSchema,
    type CasoFinanceiroInput,
    despesaProcessoSchema,
    type DespesaProcessoInput,
    escritorioLancamentoSchema,
    type EscritorioLancamentoInput,
    financeiroConfigSchema,
    type FinanceiroConfigInput,
    funcionarioFinanceiroSchema,
    type FuncionarioFinanceiroInput,
    funcionarioLancamentoSchema,
    type FuncionarioLancamentoInput,
    pagamentoRepasseSchema,
    type PagamentoRepasseInput,
    repasseHonorarioSchema,
    type RepasseHonorarioInput,
} from "@/lib/validators/financeiro-module";

type ActionResult =
    | { success: true; id?: string; ids?: string[] }
    | { success: false; error: string | Record<string, string[] | undefined> };

const MANAGE_ROLES: Role[] = ["ADMIN", "SOCIO", "FINANCEIRO", "CONTROLADOR"];
const FINANCEIRO_PATHS = [
    "/financeiro",
    "/financeiro/escritorio",
    "/financeiro/casos",
    "/financeiro/funcionarios",
    "/financeiro/contas-pagar",
    "/financeiro/contas-receber",
    "/financeiro/repasses",
    "/financeiro/fluxo-caixa",
    "/financeiro/relatorios",
    "/financeiro/configuracoes",
];

function decimal(value: string | number | null | undefined) {
    const parsed = Number(String(value ?? "0").replace(",", "."));
    return new Prisma.Decimal(Number.isFinite(parsed) ? parsed.toFixed(2) : "0");
}

function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined) {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value) || 0;
    return value.toNumber();
}

function optionalString(value?: string | null) {
    return value && value.trim() ? value.trim() : null;
}

function optionalDate(value?: string | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

function addPeriod(date: Date, periodicidade: "MENSAL" | "QUINZENAL" | "ANUAL" | "UNICA", index: number) {
    const next = new Date(date);
    if (periodicidade === "QUINZENAL") next.setDate(next.getDate() + index * 15);
    if (periodicidade === "MENSAL") next.setMonth(next.getMonth() + index);
    if (periodicidade === "ANUAL") next.setFullYear(next.getFullYear() + index);
    return next;
}

function revalidateFinanceiroPaths() {
    FINANCEIRO_PATHS.forEach((path) => revalidatePath(path));
}

async function getFinanceiroActor() {
    const session = await getSession();
    if (!session) return null;
    return session;
}

function canManageRole(role?: Role | null) {
    return role ? MANAGE_ROLES.includes(role) : false;
}

async function ensureEscritorioId() {
    return getEscritorioId();
}

async function ensureProcessAccess(user: Awaited<ReturnType<typeof getSession>>, processoId: string) {
    if (!user) return false;
    if (canManageRole(user.role)) return true;
    if (user.role !== "ADVOGADO" || !user.advogado?.id) return false;
    const processo = await db.processo.findFirst({
        where: { id: processoId, advogadoId: user.advogado.id, ...(user.escritorioId ? { escritorioId: user.escritorioId } : {}) },
        select: { id: true },
    });
    return Boolean(processo);
}

async function ensureDeletePermission(role?: Role | null) {
    const config = await getFinanceiroConfig();
    return Boolean(role && config.permissaoExclusao.includes(role));
}

function participantStatus(previsto: number, pago: number): StatusRateioHonorario {
    if (pago <= 0) return "PENDENTE";
    if (pago >= previsto) return "PAGO";
    return "PARCIAL";
}

function caseStatus(honorario: number, recebido: number, repassesPendentes: number): StatusCasoFinanceiro {
    if (recebido <= 0 && honorario <= 0) return "PREVISTO";
    if (recebido <= 0) return "A_RECEBER";
    if (recebido < honorario) return "RECEBIDO_PARCIAL";
    if (repassesPendentes <= 0) return "ENCERRADO";
    return "RECEBIDO_INTEGRAL";
}

async function recalculateCaseFinance(tx: Prisma.TransactionClient, casoFinanceiroId: string) {
    const caso = await tx.casoFinanceiro.findUnique({
        where: { id: casoFinanceiroId },
        include: {
            participantes: true,
            repasses: true,
            despesas: true,
        },
    });

    if (!caso) return;

    const honorario = decimalToNumber(caso.valorHonorarioEscritorio);
    const recebido = decimalToNumber(caso.valorRecebidoEscritorio);
    let totalPrevistoRepasses = 0;
    let totalPagoRepasses = 0;

    for (const participante of caso.participantes) {
        const repasses = caso.repasses.filter((repasse) => repasse.advogadoId === participante.advogadoId);
        const previsto = repasses.reduce((sum, repasse) => sum + decimalToNumber(repasse.valorPrevisto), 0);
        const pago = repasses.reduce((sum, repasse) => sum + decimalToNumber(repasse.valorPago), 0);
        totalPrevistoRepasses += previsto;
        totalPagoRepasses += pago;

        await tx.casoParticipante.update({
            where: { id: participante.id },
            data: {
                valorPrevistoRateio: decimal(previsto),
                valorPagoRateio: decimal(pago),
                valorPendenteRateio: decimal(Math.max(previsto - pago, 0)),
                statusRateio: participantStatus(previsto, pago),
                dataPagamento: pago > 0 ? new Date() : null,
            },
        });
    }

    const valorAReceber = Math.max(honorario - recebido, 0);
    const repassesPendentes = Math.max(totalPrevistoRepasses - totalPagoRepasses, 0);

    await tx.casoFinanceiro.update({
        where: { id: casoFinanceiroId },
        data: {
            valorAReceberEscritorio: decimal(valorAReceber),
            statusFinanceiro: caseStatus(honorario, recebido, repassesPendentes),
        },
    });
}

export async function createFinanceiroEscritorioLancamento(input: EscritorioLancamentoInput): Promise<ActionResult> {
    const parsed = escritorioLancamentoSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    const session = await getFinanceiroActor();
    if (!session || !canManageRole(session.role)) {
        return { success: false, error: "Sem permissao para lancamentos do escritorio." };
    }

    try {
        const escritorioId = await ensureEscritorioId();
        const data = parsed.data;
        const baseCompetencia = new Date(data.dataCompetencia);
        const total = data.recorrente ? Math.max(data.repeticoes, 1) : 1;
        const createdIds = await db.$transaction(async (tx) => {
            const ids: string[] = [];
            for (let index = 0; index < total; index += 1) {
                const competencia = addPeriod(baseCompetencia, data.periodicidade, index);
                const vencimento = optionalDate(data.dataVencimento);
                const pagamento = optionalDate(data.dataPagamento);
                const created = await tx.financeiroEscritorioLancamento.create({
                    data: {
                        escritorioId,
                        tipoLancamento: data.tipoLancamento,
                        classificacao: data.classificacao,
                        categoriaPrincipal: data.categoriaPrincipal,
                        subcategoria: data.subcategoria,
                        descricao: data.descricao,
                        centroCustoId: optionalString(data.centroCustoId),
                        processoId: optionalString(data.processoId),
                        clienteId: optionalString(data.clienteId),
                        valorPrevisto: decimal(data.valorPrevisto),
                        valorReal: optionalString(data.valorReal) ? decimal(data.valorReal) : null,
                        dataCompetencia: competencia,
                        dataVencimento: vencimento ? addPeriod(vencimento, data.periodicidade, index) : null,
                        dataPagamento: pagamento ? addPeriod(pagamento, data.periodicidade, index) : null,
                        status: data.status,
                        formaPagamento: (optionalString(data.formaPagamento) as FormaPagamentoFinanceira | null) ?? null,
                        recorrente: data.recorrente,
                        periodicidade: data.periodicidade,
                        fornecedorBeneficiario: optionalString(data.fornecedorBeneficiario),
                        reembolsavel: data.reembolsavel,
                        observacoes: optionalString(data.observacoes),
                        criadoPorId: session.id,
                    },
                });
                ids.push(created.id);
            }
            return ids;
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "CRIAR",
            entidade: "FinanceiroEscritorioLancamento",
            entidadeId: createdIds[0] ?? "lote",
            dadosDepois: { ids: createdIds, recorrente: data.recorrente, repeticoes: total },
        });

        revalidateFinanceiroPaths();
        return { success: true, ids: createdIds };
    } catch (error) {
        console.error("[financeiro] createFinanceiroEscritorioLancamento", error);
        return { success: false, error: "Nao foi possivel salvar o lancamento do escritorio." };
    }
}

export async function updateFinanceiroEscritorioStatus(input: AtualizarLancamentoStatusInput): Promise<ActionResult> {
    const parsed = atualizarLancamentoStatusSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    const session = await getFinanceiroActor();
    if (!session || !canManageRole(session.role)) {
        return { success: false, error: "Sem permissao para atualizar este lancamento." };
    }

    try {
        const before = await db.financeiroEscritorioLancamento.findUnique({ where: { id: parsed.data.id } });
        if (!before) return { success: false, error: "Lancamento nao encontrado." };

        await db.financeiroEscritorioLancamento.update({
            where: { id: parsed.data.id },
            data: {
                status: parsed.data.status as StatusLancamentoFinanceiro,
                valorReal: optionalString(parsed.data.valorReal) ? decimal(parsed.data.valorReal) : before.valorReal,
                dataPagamento: optionalDate(parsed.data.dataPagamento) ?? before.dataPagamento,
            },
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "ATUALIZAR_STATUS",
            entidade: "FinanceiroEscritorioLancamento",
            entidadeId: parsed.data.id,
            dadosAntes: before,
            dadosDepois: parsed.data,
        });

        revalidateFinanceiroPaths();
        return { success: true, id: parsed.data.id };
    } catch (error) {
        console.error("[financeiro] updateFinanceiroEscritorioStatus", error);
        return { success: false, error: "Nao foi possivel atualizar o lancamento." };
    }
}

export async function createCasoFinanceiro(input: CasoFinanceiroInput): Promise<ActionResult> {
    const parsed = casoFinanceiroSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    const session = await getFinanceiroActor();
    if (!session) return { success: false, error: "Sessao expirada." };

    const hasAccess = await ensureProcessAccess(session, parsed.data.processoId);
    if (!hasAccess) return { success: false, error: "Sem permissao para usar este processo no financeiro." };

    try {
        const data = parsed.data;
        const escritorioId = await ensureEscritorioId();
        const config = await getFinanceiroConfig();
        const percentualHonorario = optionalString(data.percentualHonorarioEscritorio)
            ? Number(data.percentualHonorarioEscritorio)
            : config.percentualPadraoHonorario;
        const baseCalculo = optionalString(data.baseCalculoHonorario)
            ? Number(data.baseCalculoHonorario)
            : optionalString(data.valorBrutoCaso)
              ? Number(data.valorBrutoCaso)
              : 0;
        const valorHonorario = optionalString(data.valorHonorarioEscritorio)
            ? Number(data.valorHonorarioEscritorio)
            : Number((baseCalculo * percentualHonorario) / 100);
        const retencaoPercent = optionalString(data.retencaoAdministrativaPercent)
            ? Number(data.retencaoAdministrativaPercent)
            : config.retencaoAdministrativaPadrao;
        const retencaoValor = optionalString(data.retencaoAdministrativaValor)
            ? Number(data.retencaoAdministrativaValor)
            : Number((valorHonorario * retencaoPercent) / 100);
        const baseRateio = Math.max(valorHonorario - retencaoValor, 0);
        const percentualTotal = data.participantes.reduce((sum, item) => sum + Number(item.percentualParticipacao), 0);

        if (Math.abs(percentualTotal - 100) > 0.01) {
            return { success: false, error: "A soma dos percentuais dos participantes deve ser 100%." };
        }

        const received = optionalString(data.valorRecebidoEscritorio) ? Number(data.valorRecebidoEscritorio) : 0;
        const created = await db.$transaction(async (tx) => {
            const caso = await tx.casoFinanceiro.create({
                data: {
                    escritorioId,
                    clienteId: data.clienteId,
                    processoId: data.processoId,
                    contratoId: optionalString(data.contratoId),
                    tipoEvento: data.tipoEvento,
                    descricaoEvento: data.descricaoEvento,
                    valorBrutoCaso: optionalString(data.valorBrutoCaso) ? decimal(data.valorBrutoCaso) : null,
                    baseCalculoHonorario: baseCalculo ? decimal(baseCalculo) : null,
                    percentualHonorarioEscritorio: decimal(percentualHonorario),
                    valorHonorarioEscritorio: decimal(valorHonorario),
                    valorRecebidoEscritorio: decimal(received),
                    valorAReceberEscritorio: decimal(Math.max(valorHonorario - received, 0)),
                    modoRateio: data.modoRateio,
                    retencaoAdministrativaPercent: decimal(retencaoPercent),
                    retencaoAdministrativaValor: decimal(retencaoValor),
                    impostosCaso: optionalString(data.impostosCaso) ? decimal(data.impostosCaso) : decimal(0),
                    dataResultado: optionalDate(data.dataResultado),
                    dataRecebimento: optionalDate(data.dataRecebimento),
                    statusFinanceiro: data.statusFinanceiro,
                    observacoes: optionalString(data.observacoes),
                    criadoPorId: session.id,
                },
            });

            for (const participante of data.participantes) {
                const percentual = Number(participante.percentualParticipacao);
                const valorPrevisto = Number((baseRateio * percentual) / 100);

                await tx.casoParticipante.create({
                    data: {
                        casoFinanceiroId: caso.id,
                        advogadoId: participante.advogadoId,
                        papelNoCaso: participante.papelNoCaso,
                        percentualParticipacao: decimal(percentual),
                        valorPrevistoRateio: decimal(valorPrevisto),
                        valorPagoRateio: decimal(0),
                        valorPendenteRateio: decimal(valorPrevisto),
                        statusRateio: "PENDENTE",
                    },
                });

                await tx.repasseHonorario.create({
                    data: {
                        casoFinanceiroId: caso.id,
                        advogadoId: participante.advogadoId,
                        tipoRepasse: "ADVOGADO",
                        valorPrevisto: decimal(valorPrevisto),
                        valorPago: decimal(0),
                        dataPrevista: optionalDate(data.dataRecebimento) ?? optionalDate(data.dataResultado),
                        status: "PENDENTE",
                    },
                });
            }

            if (retencaoValor > 0) {
                await tx.repasseHonorario.create({
                    data: {
                        casoFinanceiroId: caso.id,
                        tipoRepasse: "SOCIO",
                        valorPrevisto: decimal(retencaoValor),
                        valorPago: decimal(0),
                        dataPrevista: optionalDate(data.dataRecebimento) ?? optionalDate(data.dataResultado),
                        status: "PENDENTE",
                        observacoes: "Retencao administrativa do escritorio",
                    },
                });
            }

            await recalculateCaseFinance(tx, caso.id);
            return caso;
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "CRIAR",
            entidade: "CasoFinanceiro",
            entidadeId: created.id,
            dadosDepois: {
                ...data,
                valorHonorario,
                baseRateio,
                retencaoValor,
            },
        });

        revalidateFinanceiroPaths();
        return { success: true, id: created.id };
    } catch (error) {
        console.error("[financeiro] createCasoFinanceiro", error);
        return { success: false, error: "Nao foi possivel salvar o caso financeiro." };
    }
}

export async function createRepasseHonorario(input: RepasseHonorarioInput): Promise<ActionResult> {
    const parsed = repasseHonorarioSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    const session = await getFinanceiroActor();
    if (!session || !canManageRole(session.role)) {
        return { success: false, error: "Sem permissao para criar repasses." };
    }

    try {
        const result = await db.$transaction(async (tx) => {
            const caso = await tx.casoFinanceiro.findUnique({
                where: { id: parsed.data.casoFinanceiroId },
                include: { repasses: true },
            });
            if (!caso) throw new Error("Caso financeiro nao encontrado.");

            const honorarioLiquido = decimalToNumber(caso.valorHonorarioEscritorio) - decimalToNumber(caso.retencaoAdministrativaValor);
            const previstoAtual = caso.repasses.reduce((sum, item) => sum + decimalToNumber(item.valorPrevisto), 0);
            const novoPrevisto = Number(parsed.data.valorPrevisto);
            if (previstoAtual + novoPrevisto > honorarioLiquido + 0.01) {
                throw new Error("Nenhum repasse pode ultrapassar o honorario liquido disponivel.");
            }

            const repasse = await tx.repasseHonorario.create({
                data: {
                    casoFinanceiroId: parsed.data.casoFinanceiroId,
                    advogadoId: optionalString(parsed.data.advogadoId),
                    funcionarioId: optionalString(parsed.data.funcionarioId),
                    tipoRepasse: parsed.data.tipoRepasse,
                    valorPrevisto: decimal(parsed.data.valorPrevisto),
                    valorPago: decimal(0),
                    dataPrevista: optionalDate(parsed.data.dataPrevista),
                    status: "PENDENTE",
                    observacoes: optionalString(parsed.data.observacoes),
                },
            });

            await recalculateCaseFinance(tx, parsed.data.casoFinanceiroId);
            return repasse;
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "CRIAR",
            entidade: "RepasseHonorario",
            entidadeId: result.id,
            dadosDepois: parsed.data,
        });

        revalidateFinanceiroPaths();
        return { success: true, id: result.id };
    } catch (error) {
        console.error("[financeiro] createRepasseHonorario", error);
        return { success: false, error: error instanceof Error ? error.message : "Nao foi possivel criar o repasse." };
    }
}

export async function registrarPagamentoRepasse(input: PagamentoRepasseInput): Promise<ActionResult> {
    const parsed = pagamentoRepasseSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    const session = await getFinanceiroActor();
    if (!session || !canManageRole(session.role)) {
        return { success: false, error: "Sem permissao para pagar repasses." };
    }

    try {
        const result = await db.$transaction(async (tx) => {
            const repasse = await tx.repasseHonorario.findUnique({ where: { id: parsed.data.repasseId } });
            if (!repasse) throw new Error("Repasse nao encontrado.");

            const valorPago = Number(parsed.data.valorPago);
            const previsto = decimalToNumber(repasse.valorPrevisto);
            if (valorPago > previsto + 0.01) {
                throw new Error("O valor pago nao pode ultrapassar o valor previsto do repasse.");
            }

            const nextStatus = participantStatus(previsto, valorPago);
            const updated = await tx.repasseHonorario.update({
                where: { id: parsed.data.repasseId },
                data: {
                    valorPago: decimal(valorPago),
                    dataPagamento: optionalDate(parsed.data.dataPagamento),
                    formaPagamento: (optionalString(parsed.data.formaPagamento) as FormaPagamentoFinanceira | null) ?? null,
                    status: nextStatus,
                    observacoes: optionalString(parsed.data.observacoes) ?? repasse.observacoes,
                    aprovadoPorId: session.id,
                    aprovadoEm: new Date(),
                },
            });

            await recalculateCaseFinance(tx, repasse.casoFinanceiroId);
            return updated;
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "PAGAR_REPASSE",
            entidade: "RepasseHonorario",
            entidadeId: result.id,
            dadosDepois: parsed.data,
        });

        revalidateFinanceiroPaths();
        return { success: true, id: result.id };
    } catch (error) {
        console.error("[financeiro] registrarPagamentoRepasse", error);
        return { success: false, error: error instanceof Error ? error.message : "Nao foi possivel registrar o pagamento do repasse." };
    }
}

export async function createDespesaProcesso(input: DespesaProcessoInput): Promise<ActionResult> {
    const parsed = despesaProcessoSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    const session = await getFinanceiroActor();
    if (!session) return { success: false, error: "Sessao expirada." };

    const hasAccess = await ensureProcessAccess(session, parsed.data.processoId);
    if (!hasAccess) return { success: false, error: "Sem permissao para registrar despesa neste processo." };

    try {
        const created = await db.$transaction(async (tx) => {
            const despesa = await tx.despesaProcesso.create({
                data: {
                    processoId: parsed.data.processoId,
                    clienteId: optionalString(parsed.data.clienteId),
                    casoFinanceiroId: optionalString(parsed.data.casoFinanceiroId),
                    tipoDespesa: parsed.data.tipoDespesa,
                    descricao: parsed.data.descricao,
                    valor: decimal(parsed.data.valor),
                    pagoPor: parsed.data.pagoPor,
                    reembolsavel: parsed.data.reembolsavel,
                    dataLancamento: new Date(parsed.data.dataLancamento),
                    dataPagamento: optionalDate(parsed.data.dataPagamento),
                    status: parsed.data.status,
                },
            });

            if (despesa.casoFinanceiroId) {
                await recalculateCaseFinance(tx, despesa.casoFinanceiroId);
            }

            return despesa;
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "CRIAR",
            entidade: "DespesaProcesso",
            entidadeId: created.id,
            dadosDepois: parsed.data,
        });

        revalidateFinanceiroPaths();
        return { success: true, id: created.id };
    } catch (error) {
        console.error("[financeiro] createDespesaProcesso", error);
        return { success: false, error: "Nao foi possivel registrar a despesa do processo." };
    }
}

export async function saveFuncionarioFinanceiroAction(input: FuncionarioFinanceiroInput): Promise<ActionResult> {
    const parsed = funcionarioFinanceiroSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    const session = await getFinanceiroActor();
    if (!session || !canManageRole(session.role)) {
        return { success: false, error: "Sem permissao para controlar funcionarios." };
    }

    try {
        const escritorioId = await ensureEscritorioId();
        const data = parsed.data;
        const totalMensal =
            Number(data.salarioBase || 0) +
            Number(data.beneficios || 0) +
            Number(data.encargos || 0) +
            Number(data.bonus || 0) +
            Number(data.comissao || 0) +
            Number(data.ajudaCusto || 0);

        const record = await db.funcionarioFinanceiro.upsert({
            where: { userId: data.userId },
            update: {
                tipoVinculo: data.tipoVinculo,
                salarioBase: decimal(data.salarioBase),
                beneficios: decimal(data.beneficios || 0),
                encargos: decimal(data.encargos || 0),
                bonus: decimal(data.bonus || 0),
                comissao: decimal(data.comissao || 0),
                ajudaCusto: decimal(data.ajudaCusto || 0),
                valorTotalMensal: decimal(totalMensal),
                centroCustoId: optionalString(data.centroCustoId),
                dataInicio: new Date(data.dataInicio),
                dataFim: optionalDate(data.dataFim),
                status: data.status,
            },
            create: {
                escritorioId,
                userId: data.userId,
                tipoVinculo: data.tipoVinculo,
                salarioBase: decimal(data.salarioBase),
                beneficios: decimal(data.beneficios || 0),
                encargos: decimal(data.encargos || 0),
                bonus: decimal(data.bonus || 0),
                comissao: decimal(data.comissao || 0),
                ajudaCusto: decimal(data.ajudaCusto || 0),
                valorTotalMensal: decimal(totalMensal),
                centroCustoId: optionalString(data.centroCustoId),
                dataInicio: new Date(data.dataInicio),
                dataFim: optionalDate(data.dataFim),
                status: data.status,
            },
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "UPSERT",
            entidade: "FuncionarioFinanceiro",
            entidadeId: record.id,
            dadosDepois: parsed.data,
        });

        revalidateFinanceiroPaths();
        return { success: true, id: record.id };
    } catch (error) {
        console.error("[financeiro] saveFuncionarioFinanceiroAction", error);
        return { success: false, error: "Nao foi possivel salvar o cadastro financeiro do funcionario." };
    }
}

export async function saveFuncionarioLancamentoAction(input: FuncionarioLancamentoInput): Promise<ActionResult> {
    const parsed = funcionarioLancamentoSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    const session = await getFinanceiroActor();
    if (!session || !canManageRole(session.role)) {
        return { success: false, error: "Sem permissao para lancamentos de funcionarios." };
    }

    try {
        const data = parsed.data;
        const valorTotal =
            Number(data.salario || 0) +
            Number(data.valeTransporte || 0) +
            Number(data.valeRefeicao || 0) +
            Number(data.bonus || 0) +
            Number(data.comissao || 0) +
            Number(data.encargos || 0) -
            Number(data.desconto || 0);

        const lancamento = await db.funcionarioLancamento.upsert({
            where: {
                funcionarioFinanceiroId_competencia: {
                    funcionarioFinanceiroId: data.funcionarioFinanceiroId,
                    competencia: new Date(data.competencia),
                },
            },
            update: {
                salario: decimal(data.salario),
                valeTransporte: decimal(data.valeTransporte || 0),
                valeRefeicao: decimal(data.valeRefeicao || 0),
                bonus: decimal(data.bonus || 0),
                comissao: decimal(data.comissao || 0),
                encargos: decimal(data.encargos || 0),
                desconto: decimal(data.desconto || 0),
                valorTotal: decimal(valorTotal),
                statusPagamento: data.statusPagamento,
                dataPagamento: optionalDate(data.dataPagamento),
                observacoes: optionalString(data.observacoes),
            },
            create: {
                funcionarioFinanceiroId: data.funcionarioFinanceiroId,
                competencia: new Date(data.competencia),
                salario: decimal(data.salario),
                valeTransporte: decimal(data.valeTransporte || 0),
                valeRefeicao: decimal(data.valeRefeicao || 0),
                bonus: decimal(data.bonus || 0),
                comissao: decimal(data.comissao || 0),
                encargos: decimal(data.encargos || 0),
                desconto: decimal(data.desconto || 0),
                valorTotal: decimal(valorTotal),
                statusPagamento: data.statusPagamento,
                dataPagamento: optionalDate(data.dataPagamento),
                observacoes: optionalString(data.observacoes),
            },
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "UPSERT",
            entidade: "FuncionarioLancamento",
            entidadeId: lancamento.id,
            dadosDepois: parsed.data,
        });

        revalidateFinanceiroPaths();
        return { success: true, id: lancamento.id };
    } catch (error) {
        console.error("[financeiro] saveFuncionarioLancamentoAction", error);
        return { success: false, error: "Nao foi possivel salvar o lancamento mensal do funcionario." };
    }
}

export async function saveFinanceiroConfigAction(input: FinanceiroConfigInput): Promise<ActionResult> {
    const parsed = financeiroConfigSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    const session = await getFinanceiroActor();
    if (!session || !canManageRole(session.role)) {
        return { success: false, error: "Sem permissao para alterar configuracoes financeiras." };
    }

    try {
        const next = await saveFinanceiroConfig({
            percentualPadraoHonorario: Number(parsed.data.percentualPadraoHonorario),
            regraPadraoRateio: parsed.data.regraPadraoRateio,
            retencaoAdministrativaPadrao: Number(parsed.data.retencaoAdministrativaPadrao),
            categoriasPrincipais: parsed.data.categoriasPrincipais,
            centrosCusto: parsed.data.centrosCusto,
            tiposVinculoFuncionarios: parsed.data.tiposVinculoFuncionarios,
            formasPagamento: parsed.data.formasPagamento,
            statusFinanceiros: parsed.data.statusFinanceiros,
            recorrenciasAutomaticas: parsed.data.recorrenciasAutomaticas,
            permissaoExclusao: parsed.data.permissaoExclusao,
            aprovacaoRepasses: parsed.data.aprovacaoRepasses,
            modoRateioDisponiveis: parsed.data.modoRateioDisponiveis,
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "ATUALIZAR",
            entidade: "FinanceiroConfig",
            entidadeId: "FINANCEIRO_CONFIG",
            dadosDepois: next,
        });

        revalidateFinanceiroPaths();
        return { success: true, id: "FINANCEIRO_CONFIG" };
    } catch (error) {
        console.error("[financeiro] saveFinanceiroConfigAction", error);
        return { success: false, error: "Nao foi possivel salvar as configuracoes financeiras." };
    }
}

export async function deleteFinanceiroRegistro(
    entity: "lancamento" | "caso" | "repasse" | "despesa" | "funcionario" | "funcionario-lancamento",
    id: string
): Promise<ActionResult> {
    const session = await getFinanceiroActor();
    if (!session || !(await ensureDeletePermission(session.role))) {
        return { success: false, error: "Exclusao restrita aos perfis autorizados." };
    }

    try {
        await db.$transaction(async (tx) => {
            if (entity === "lancamento") {
                await tx.financeiroEscritorioLancamento.delete({ where: { id } });
            }
            if (entity === "caso") {
                await tx.casoFinanceiro.delete({ where: { id } });
            }
            if (entity === "repasse") {
                const repasse = await tx.repasseHonorario.delete({ where: { id } });
                await recalculateCaseFinance(tx, repasse.casoFinanceiroId);
            }
            if (entity === "despesa") {
                const despesa = await tx.despesaProcesso.delete({ where: { id } });
                if (despesa.casoFinanceiroId) {
                    await recalculateCaseFinance(tx, despesa.casoFinanceiroId);
                }
            }
            if (entity === "funcionario") {
                await tx.funcionarioFinanceiro.delete({ where: { id } });
            }
            if (entity === "funcionario-lancamento") {
                await tx.funcionarioLancamento.delete({ where: { id } });
            }
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "EXCLUIR",
            entidade: entity,
            entidadeId: id,
        });

        revalidateFinanceiroPaths();
        return { success: true, id };
    } catch (error) {
        console.error("[financeiro] deleteFinanceiroRegistro", error);
        return { success: false, error: "Nao foi possivel excluir o registro financeiro." };
    }
}
