import { z } from "zod";

const moneyField = z
    .union([z.string(), z.number()])
    .transform((value) => String(value ?? "").replace(",", ".").trim())
    .refine((value) => value === "" || !Number.isNaN(Number(value)), "Valor monetario invalido");

const optionalString = z.string().trim().optional().or(z.literal(""));

export const escritorioLancamentoSchema = z.object({
    tipoLancamento: z.enum(["ENTRADA", "SAIDA"]),
    classificacao: z.enum(["RECEITA", "DESPESA"]),
    categoriaPrincipal: z.string().trim().min(2, "Categoria principal obrigatoria"),
    subcategoria: z.string().trim().min(2, "Subcategoria obrigatoria"),
    descricao: z.string().trim().min(2, "Descricao obrigatoria"),
    centroCustoId: optionalString,
    processoId: optionalString,
    clienteId: optionalString,
    valorPrevisto: moneyField.refine((value) => Number(value) > 0, "Valor previsto obrigatorio"),
    valorReal: moneyField.optional(),
    dataCompetencia: z.string().min(1, "Data de competencia obrigatoria"),
    dataVencimento: optionalString,
    dataPagamento: optionalString,
    status: z.enum(["PENDENTE", "PAGO", "PARCIAL", "CANCELADO", "RECEBIDO"]).default("PENDENTE"),
    formaPagamento: z.enum(["PIX", "BOLETO", "TRANSFERENCIA", "DINHEIRO", "CARTAO", "DEBITO_AUTOMATICO"]).optional().or(z.literal("")),
    recorrente: z.coerce.boolean().default(false),
    periodicidade: z.enum(["MENSAL", "QUINZENAL", "ANUAL", "UNICA"]).default("UNICA"),
    repeticoes: z.coerce.number().int().min(1).max(24).default(1),
    fornecedorBeneficiario: optionalString,
    reembolsavel: z.coerce.boolean().default(false),
    observacoes: optionalString,
});

export const casoParticipanteSchema = z.object({
    advogadoId: z.string().min(1, "Advogado obrigatorio"),
    papelNoCaso: z.enum(["CAPTACAO", "ESTRATEGIA", "AUDIENCIA", "EXECUCAO", "RESPONSAVEL_PRINCIPAL", "APOIO"]),
    percentualParticipacao: moneyField.refine((value) => Number(value) >= 0, "Percentual invalido"),
});

export const casoFinanceiroSchema = z.object({
    clienteId: z.string().min(1, "Cliente obrigatorio"),
    processoId: z.string().min(1, "Processo obrigatorio"),
    contratoId: optionalString,
    tipoEvento: z.enum(["HONORARIO_CONTRATUAL", "HONORARIO_EXITO", "SUCUMBENCIA", "ACORDO", "LEVANTAMENTO", "REEMBOLSO", "CUSTA", "DESPESA"]),
    descricaoEvento: z.string().trim().min(2, "Descricao obrigatoria"),
    valorBrutoCaso: moneyField.optional(),
    baseCalculoHonorario: moneyField.optional(),
    percentualHonorarioEscritorio: moneyField.optional(),
    valorHonorarioEscritorio: moneyField.optional(),
    valorRecebidoEscritorio: moneyField.optional(),
    modoRateio: z.enum(["MANUAL", "IGUALITARIO", "PERCENTUAL", "RETENCAO_ADMINISTRATIVA", "PAPEL_NO_CASO"]).default("PERCENTUAL"),
    retencaoAdministrativaPercent: moneyField.optional(),
    retencaoAdministrativaValor: moneyField.optional(),
    impostosCaso: moneyField.optional(),
    dataResultado: optionalString,
    dataRecebimento: optionalString,
    statusFinanceiro: z.enum(["PREVISTO", "A_RECEBER", "RECEBIDO_PARCIAL", "RECEBIDO_INTEGRAL", "ENCERRADO"]).default("PREVISTO"),
    observacoes: optionalString,
    participantes: z.array(casoParticipanteSchema).min(1, "Informe ao menos um participante"),
});

export const repasseHonorarioSchema = z
    .object({
        casoFinanceiroId: z.string().min(1, "Caso obrigatorio"),
        advogadoId: optionalString,
        funcionarioId: optionalString,
        tipoRepasse: z.enum(["ADVOGADO", "SOCIO", "FUNCIONARIO", "COMERCIAL"]),
        valorPrevisto: moneyField.refine((value) => Number(value) >= 0, "Valor previsto invalido"),
        dataPrevista: optionalString,
        observacoes: optionalString,
    })
    .refine((value) => Boolean(value.advogadoId || value.funcionarioId), "Informe advogado ou funcionario");

export const pagamentoRepasseSchema = z.object({
    repasseId: z.string().min(1, "Repasse obrigatorio"),
    valorPago: moneyField.refine((value) => Number(value) >= 0, "Valor pago invalido"),
    dataPagamento: z.string().min(1, "Data de pagamento obrigatoria"),
    formaPagamento: z.enum(["PIX", "BOLETO", "TRANSFERENCIA", "DINHEIRO", "CARTAO", "DEBITO_AUTOMATICO"]).optional().or(z.literal("")),
    observacoes: optionalString,
});

export const despesaProcessoSchema = z.object({
    processoId: z.string().min(1, "Processo obrigatorio"),
    clienteId: optionalString,
    casoFinanceiroId: optionalString,
    tipoDespesa: z.enum(["CUSTA", "DESLOCAMENTO", "COPIAS", "PERICIA", "CORRESPONDENTE", "DESPESA_ADMINISTRATIVA_RATEADA", "OUTROS"]),
    descricao: z.string().trim().min(2, "Descricao obrigatoria"),
    valor: moneyField.refine((value) => Number(value) > 0, "Valor obrigatorio"),
    pagoPor: z.enum(["ESCRITORIO", "CLIENTE", "ADVOGADO"]),
    reembolsavel: z.coerce.boolean().default(false),
    dataLancamento: z.string().min(1, "Data de lancamento obrigatoria"),
    dataPagamento: optionalString,
    status: z.enum(["PENDENTE", "PAGO", "REEMBOLSADO", "CANCELADO"]).default("PENDENTE"),
});

export const funcionarioFinanceiroSchema = z.object({
    userId: z.string().min(1, "Funcionario obrigatorio"),
    tipoVinculo: z.enum(["CLT", "ESTAGIO", "PJ", "AUTONOMO"]),
    salarioBase: moneyField,
    beneficios: moneyField.optional(),
    encargos: moneyField.optional(),
    bonus: moneyField.optional(),
    comissao: moneyField.optional(),
    ajudaCusto: moneyField.optional(),
    centroCustoId: optionalString,
    dataInicio: z.string().min(1, "Data de inicio obrigatoria"),
    dataFim: optionalString,
    status: z.enum(["ATIVO", "INATIVO"]).default("ATIVO"),
});

export const funcionarioLancamentoSchema = z.object({
    funcionarioFinanceiroId: z.string().min(1, "Funcionario financeiro obrigatorio"),
    competencia: z.string().min(1, "Competencia obrigatoria"),
    salario: moneyField,
    valeTransporte: moneyField.optional(),
    valeRefeicao: moneyField.optional(),
    bonus: moneyField.optional(),
    comissao: moneyField.optional(),
    encargos: moneyField.optional(),
    desconto: moneyField.optional(),
    statusPagamento: z.enum(["PENDENTE", "PAGO", "PARCIAL", "CANCELADO"]).default("PENDENTE"),
    dataPagamento: optionalString,
    observacoes: optionalString,
});

export const atualizarLancamentoStatusSchema = z.object({
    id: z.string().min(1, "Lancamento obrigatorio"),
    status: z.enum(["PENDENTE", "PAGO", "PARCIAL", "CANCELADO", "RECEBIDO"]),
    valorReal: moneyField.optional(),
    dataPagamento: optionalString,
});

export const financeiroConfigSchema = z.object({
    percentualPadraoHonorario: moneyField,
    regraPadraoRateio: z.enum(["MANUAL", "IGUALITARIO", "PERCENTUAL", "RETENCAO_ADMINISTRATIVA", "PAPEL_NO_CASO"]),
    retencaoAdministrativaPadrao: moneyField,
    categoriasPrincipais: z.array(z.string().trim().min(1)).min(1),
    centrosCusto: z.array(z.string().trim().min(1)).min(1),
    tiposVinculoFuncionarios: z.array(z.string().trim().min(1)).min(1),
    formasPagamento: z.array(z.string().trim().min(1)).min(1),
    statusFinanceiros: z.array(z.string().trim().min(1)).min(1),
    recorrenciasAutomaticas: z.coerce.boolean(),
    permissaoExclusao: z.array(z.string().trim().min(1)).min(1),
    aprovacaoRepasses: z.coerce.boolean(),
    modoRateioDisponiveis: z.array(z.string().trim().min(1)).min(1),
});

export type EscritorioLancamentoInput = z.infer<typeof escritorioLancamentoSchema>;
export type CasoFinanceiroInput = z.infer<typeof casoFinanceiroSchema>;
export type RepasseHonorarioInput = z.infer<typeof repasseHonorarioSchema>;
export type PagamentoRepasseInput = z.infer<typeof pagamentoRepasseSchema>;
export type DespesaProcessoInput = z.infer<typeof despesaProcessoSchema>;
export type FuncionarioFinanceiroInput = z.infer<typeof funcionarioFinanceiroSchema>;
export type FuncionarioLancamentoInput = z.infer<typeof funcionarioLancamentoSchema>;
export type AtualizarLancamentoStatusInput = z.infer<typeof atualizarLancamentoStatusSchema>;
export type FinanceiroConfigInput = z.infer<typeof financeiroConfigSchema>;
