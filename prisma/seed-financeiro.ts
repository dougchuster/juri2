import bcrypt from "bcryptjs";
import { Prisma, PrismaClient, Role, TipoPessoa, StatusCliente, LeadTemperatura, StatusPagamentoFolha } from "../src/generated/prisma";

type CentroMap = Record<string, string | null>;

async function upsertUserAccount(
    prisma: PrismaClient,
    input: {
        name: string;
        email: string;
        role: Role;
        password?: string;
        advogado?: {
            oab: string;
            seccional: string;
            especialidades?: string;
            comissaoPercent?: number;
        };
    }
) {
    const passwordHash = await bcrypt.hash(input.password ?? "123456", 10);
    const user = await prisma.user.upsert({
        where: { email: input.email },
        update: {
            name: input.name,
            role: input.role,
            passwordHash,
            isActive: true,
        },
        create: {
            name: input.name,
            email: input.email,
            role: input.role,
            passwordHash,
            isActive: true,
        },
    });

    if (input.advogado) {
        await prisma.advogado.upsert({
            where: { userId: user.id },
            update: {
                oab: input.advogado.oab,
                seccional: input.advogado.seccional,
                especialidades: input.advogado.especialidades ?? null,
                comissaoPercent: input.advogado.comissaoPercent ?? 0,
                ativo: true,
            },
            create: {
                userId: user.id,
                oab: input.advogado.oab,
                seccional: input.advogado.seccional,
                especialidades: input.advogado.especialidades ?? null,
                comissaoPercent: input.advogado.comissaoPercent ?? 0,
                ativo: true,
            },
        });
    }

    return user;
}

function toCentroMap(items: { id: string; nome: string }[]): CentroMap {
    return items.reduce<CentroMap>((acc, item) => {
        acc[item.nome] = item.id;
        return acc;
    }, {});
}

export async function seedFinanceiroDemo(prisma: PrismaClient, escritorio: { id: string }) {
    const escritorioId = escritorio.id;

    await Promise.all([
        upsertUserAccount(prisma, {
            name: "Ana Martins",
            email: "ana.martins@escritoriodemo.com.br",
            role: Role.SOCIO,
            advogado: { oab: "12345", seccional: "DF", especialidades: "Trabalhista e Civil", comissaoPercent: 60 },
        }),
        upsertUserAccount(prisma, {
            name: "Bruno Rocha",
            email: "bruno.rocha@escritoriodemo.com.br",
            role: Role.ADVOGADO,
            advogado: { oab: "23456", seccional: "DF", especialidades: "Audiencias e Execucao", comissaoPercent: 40 },
        }),
        upsertUserAccount(prisma, {
            name: "Carlos Souza",
            email: "carlos.souza@escritoriodemo.com.br",
            role: Role.ADVOGADO,
            advogado: { oab: "34567", seccional: "DF", especialidades: "Consultivo Empresarial", comissaoPercent: 100 },
        }),
        upsertUserAccount(prisma, {
            name: "Carla Financeiro",
            email: "financeiro@escritoriodemo.com.br",
            role: Role.FINANCEIRO,
        }),
        upsertUserAccount(prisma, {
            name: "Diego Administrativo",
            email: "administrativo@escritoriodemo.com.br",
            role: Role.ASSISTENTE,
        }),
    ]);

    const [adminUser, anaUser, brunoUser, carlosUser, carlaUser, diegoUser] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { email: "dougcruvinel@gmail.com" } }),
        prisma.user.findUniqueOrThrow({ where: { email: "ana.martins@escritoriodemo.com.br" } }),
        prisma.user.findUniqueOrThrow({ where: { email: "bruno.rocha@escritoriodemo.com.br" } }),
        prisma.user.findUniqueOrThrow({ where: { email: "carlos.souza@escritoriodemo.com.br" } }),
        prisma.user.findUniqueOrThrow({ where: { email: "financeiro@escritoriodemo.com.br" } }),
        prisma.user.findUniqueOrThrow({ where: { email: "administrativo@escritoriodemo.com.br" } }),
    ]);

    const [anaAdvogado, brunoAdvogado, carlosAdvogado] = await Promise.all([
        prisma.advogado.findUniqueOrThrow({ where: { userId: anaUser.id } }),
        prisma.advogado.findUniqueOrThrow({ where: { userId: brunoUser.id } }),
        prisma.advogado.findUniqueOrThrow({ where: { userId: carlosUser.id } }),
    ]);

    const [fulano, empresaBeta, clienteGama] = await Promise.all([
        prisma.cliente.upsert({
            where: { cpf: "11111111111" },
            update: { nome: "Fulano de Tal", email: "fulano@cliente.demo", cidade: "Brasilia", estado: "DF", status: StatusCliente.ATIVO },
            create: {
                nome: "Fulano de Tal",
                email: "fulano@cliente.demo",
                cpf: "11111111111",
                telefone: "(61) 3333-1111",
                celular: "(61) 99999-1111",
                whatsapp: "(61) 99999-1111",
                cidade: "Brasilia",
                estado: "DF",
                tipoPessoa: TipoPessoa.FISICA,
                status: StatusCliente.ATIVO,
                temperatura: LeadTemperatura.QUENTE,
            },
        }),
        prisma.cliente.upsert({
            where: { cnpj: "11222333000181" },
            update: { nome: "Empresa Beta Ltda.", razaoSocial: "Empresa Beta Ltda.", cidade: "Brasilia", estado: "DF", status: StatusCliente.ATIVO },
            create: {
                nome: "Empresa Beta Ltda.",
                razaoSocial: "Empresa Beta Ltda.",
                nomeFantasia: "Empresa Beta",
                cnpj: "11222333000181",
                email: "financeiro@empresabeta.demo",
                telefone: "(61) 3333-2222",
                cidade: "Brasilia",
                estado: "DF",
                tipoPessoa: TipoPessoa.JURIDICA,
                status: StatusCliente.ATIVO,
            },
        }),
        prisma.cliente.upsert({
            where: { cpf: "22222222222" },
            update: { nome: "Maria Gama", cidade: "Goiania", estado: "GO", status: StatusCliente.ATIVO },
            create: {
                nome: "Maria Gama",
                cpf: "22222222222",
                email: "maria.gama@cliente.demo",
                telefone: "(62) 3333-0000",
                celular: "(62) 99999-0000",
                whatsapp: "(62) 99999-0000",
                cidade: "Goiania",
                estado: "GO",
                tipoPessoa: TipoPessoa.FISICA,
                status: StatusCliente.ATIVO,
                temperatura: LeadTemperatura.MORNO,
            },
        }),
    ]);

    const [tipoAcaoTrabalhista, tipoAcaoCivel, faseExecucao, faseSentenca, centros] = await Promise.all([
        prisma.tipoAcao.findFirst({ where: { nome: { contains: "Trabalh" } }, select: { id: true } }),
        prisma.tipoAcao.findFirst({ where: { nome: { contains: "C" } }, select: { id: true } }),
        prisma.faseProcessual.findFirst({ where: { nome: { contains: "Exec" } }, select: { id: true } }),
        prisma.faseProcessual.findFirst({ where: { nome: { contains: "Sent" } }, select: { id: true } }),
        prisma.centroCusto.findMany({ where: { escritorioId }, select: { id: true, nome: true } }),
    ]);
    const centroMap = toCentroMap(centros);

    const [processoFulano, processoBeta, processoGama] = await Promise.all([
        prisma.processo.upsert({
            where: { numeroCnj: "0001234-56.2026.8.07.0001" },
            update: {
                clienteId: fulano.id,
                advogadoId: anaAdvogado.id,
                resultado: "GANHO",
                status: "EXECUCAO",
                valorCausa: 20000,
                objeto: "Acao trabalhista com procedencia e levantamento de valores",
                faseProcessualId: faseExecucao?.id ?? null,
                tipoAcaoId: tipoAcaoTrabalhista?.id ?? null,
            },
            create: {
                numeroCnj: "0001234-56.2026.8.07.0001",
                tipo: "JUDICIAL",
                status: "EXECUCAO",
                resultado: "GANHO",
                advogadoId: anaAdvogado.id,
                clienteId: fulano.id,
                valorCausa: 20000,
                objeto: "Acao trabalhista com procedencia e levantamento de valores",
                tribunal: "TJDFT",
                comarca: "Brasilia",
                vara: "1 Vara do Trabalho",
                faseProcessualId: faseExecucao?.id ?? null,
                tipoAcaoId: tipoAcaoTrabalhista?.id ?? null,
                dataDistribuicao: new Date("2026-01-03"),
            },
        }),
        prisma.processo.upsert({
            where: { numeroCnj: "0008888-20.2026.8.07.0001" },
            update: {
                clienteId: empresaBeta.id,
                advogadoId: carlosAdvogado.id,
                resultado: "ACORDO",
                status: "SENTENCA",
                valorCausa: 5000,
                objeto: "Honorario contratual fixo para consultoria empresarial",
                faseProcessualId: faseSentenca?.id ?? null,
                tipoAcaoId: tipoAcaoCivel?.id ?? null,
            },
            create: {
                numeroCnj: "0008888-20.2026.8.07.0001",
                tipo: "SERVICO",
                status: "SENTENCA",
                resultado: "ACORDO",
                advogadoId: carlosAdvogado.id,
                clienteId: empresaBeta.id,
                valorCausa: 5000,
                objeto: "Honorario contratual fixo para consultoria empresarial",
                tribunal: "TJDFT",
                comarca: "Brasilia",
                vara: "5 Vara Civel",
                faseProcessualId: faseSentenca?.id ?? null,
                tipoAcaoId: tipoAcaoCivel?.id ?? null,
                dataDistribuicao: new Date("2026-01-12"),
            },
        }),
        prisma.processo.upsert({
            where: { numeroCnj: "0009999-10.2026.8.09.0001" },
            update: {
                clienteId: clienteGama.id,
                advogadoId: brunoAdvogado.id,
                resultado: "PENDENTE",
                status: "EM_ANDAMENTO",
                valorCausa: 12000,
                objeto: "Acao civel com recebimento parcelado pendente",
            },
            create: {
                numeroCnj: "0009999-10.2026.8.09.0001",
                tipo: "JUDICIAL",
                status: "EM_ANDAMENTO",
                resultado: "PENDENTE",
                advogadoId: brunoAdvogado.id,
                clienteId: clienteGama.id,
                valorCausa: 12000,
                objeto: "Acao civel com recebimento parcelado pendente",
                tribunal: "TJGO",
                comarca: "Goiania",
                vara: "3 Vara Civel",
                tipoAcaoId: tipoAcaoCivel?.id ?? null,
                dataDistribuicao: new Date("2026-02-01"),
            },
        }),
    ]);

    await prisma.appSetting.upsert({
        where: { key: "FINANCEIRO_CONFIG" },
        update: {
            value: {
                percentualPadraoHonorario: 30,
                regraPadraoRateio: "PERCENTUAL",
                retencaoAdministrativaPadrao: 20,
                formasPagamento: ["PIX", "BOLETO", "TRANSFERENCIA", "DINHEIRO", "CARTAO", "DEBITO_AUTOMATICO"],
            } as Prisma.InputJsonValue,
        },
        create: {
            key: "FINANCEIRO_CONFIG",
            value: {
                percentualPadraoHonorario: 30,
                regraPadraoRateio: "PERCENTUAL",
                retencaoAdministrativaPadrao: 20,
                formasPagamento: ["PIX", "BOLETO", "TRANSFERENCIA", "DINHEIRO", "CARTAO", "DEBITO_AUTOMATICO"],
            } as Prisma.InputJsonValue,
        },
    });

    const contaOperacional =
        (await prisma.contaBancaria.findFirst({ where: { escritorioId, nome: "Conta Operacional" } })) ??
        (await prisma.contaBancaria.create({
            data: {
                escritorioId,
                nome: "Conta Operacional",
                banco: "Banco Demo",
                agencia: "0001",
                conta: "12345-6",
                tipo: "CORRENTE",
                saldoInicial: 15000,
                ativo: true,
            },
        }));

    await prisma.fatura.deleteMany({ where: { numero: { in: ["FAT-2026-0001", "FAT-2026-0002", "FAT-2026-0003", "FAT-2026-0004"] } } });
    await prisma.honorario.deleteMany({ where: { processoId: { in: [processoFulano.id, processoBeta.id, processoGama.id] } } });
    await prisma.contaPagar.deleteMany({ where: { descricao: { in: ["Custa distribuicao inicial Fulano", "Software Juridico Fevereiro", "Campanha de marketing fevereiro"] } } });

    const honorarioFulano = await prisma.honorario.create({ data: { processoId: processoFulano.id, clienteId: fulano.id, tipo: "EXITO", status: "ATIVO", valorTotal: 6000, percentualExito: 30, descricao: "Honorario contratual de exito", dataContrato: new Date("2026-01-05") } });
    const honorarioBeta = await prisma.honorario.create({ data: { processoId: processoBeta.id, clienteId: empresaBeta.id, tipo: "FIXO", status: "ATIVO", valorTotal: 5000, descricao: "Honorario fixo empresarial", dataContrato: new Date("2026-01-12") } });
    const honorarioGama = await prisma.honorario.create({ data: { processoId: processoGama.id, clienteId: clienteGama.id, tipo: "MISTO", status: "ATIVO", valorTotal: 3600, percentualExito: 15, descricao: "Honorario misto", dataContrato: new Date("2026-02-01") } });

    for (const fatura of [
        { numero: "FAT-2026-0001", honorarioId: honorarioFulano.id, clienteId: fulano.id, status: "PAGA", valorTotal: 6000, dataEmissao: new Date("2026-01-20"), dataVencimento: new Date("2026-01-20"), dataPagamento: new Date("2026-01-20"), descricao: "Recebimento integral Fulano", recorrente: false, centroCustoId: centroMap["Custas processuais"] },
        { numero: "FAT-2026-0002", honorarioId: honorarioBeta.id, clienteId: empresaBeta.id, status: "PAGA", valorTotal: 2500, dataEmissao: new Date("2026-01-18"), dataVencimento: new Date("2026-01-18"), dataPagamento: new Date("2026-01-18"), descricao: "Entrada inicial Empresa Beta", recorrente: false, centroCustoId: centroMap["Operacional Juridico"] },
        { numero: "FAT-2026-0003", honorarioId: honorarioBeta.id, clienteId: empresaBeta.id, status: "PENDENTE", valorTotal: 2500, dataEmissao: new Date("2026-02-18"), dataVencimento: new Date("2026-02-28"), descricao: "Saldo Empresa Beta", recorrente: false, centroCustoId: centroMap["Operacional Juridico"] },
        { numero: "FAT-2026-0004", honorarioId: honorarioGama.id, clienteId: clienteGama.id, status: "PENDENTE", valorTotal: 1800, dataEmissao: new Date("2026-02-10"), dataVencimento: new Date("2026-03-10"), descricao: "Parcela Maria Gama", recorrente: false, centroCustoId: centroMap["Custas processuais"] },
    ] as const) {
        await prisma.fatura.create({ data: fatura });
    }

    for (const contaPagar of [
        { descricao: "Custa distribuicao inicial Fulano", tipo: "CUSTO_PROCESSUAL", valor: 450, dataVencimento: new Date("2026-01-03"), dataPagamento: new Date("2026-01-03"), pago: true, processoId: processoFulano.id, centroCustoId: centroMap["Custas processuais"], contaBancariaId: contaOperacional.id },
        { descricao: "Software Juridico Fevereiro", tipo: "DESPESA_ESCRITORIO", valor: 399, dataVencimento: new Date("2026-02-10"), dataPagamento: new Date("2026-02-10"), pago: true, centroCustoId: centroMap["Tecnologia"], contaBancariaId: contaOperacional.id },
        { descricao: "Campanha de marketing fevereiro", tipo: "FORNECEDOR", valor: 650, dataVencimento: new Date("2026-02-12"), pago: false, centroCustoId: centroMap["Marketing"], contaBancariaId: contaOperacional.id },
    ] as const) {
        await prisma.contaPagar.create({ data: contaPagar });
    }

    const lancamentosExistentes = await prisma.financeiroEscritorioLancamento.findMany({
        where: {
            escritorioId,
            descricao: {
                in: [
                    "Conta de Luz Janeiro/2026",
                    "Internet Janeiro/2026",
                    "Limpeza Janeiro/2026",
                    "Cafe Janeiro/2026",
                    "Compras de mercado Janeiro/2026",
                    "Publicidade Janeiro/2026",
                    "Salario administrativo Janeiro/2026",
                    "Software Juridico Janeiro/2026",
                    "Reembolso de cliente Fulano",
                    "Honorarios contratuais recebidos Janeiro",
                    "Honorarios recebidos Fevereiro",
                    "Reembolsos recebidos Fevereiro",
                    "Despesa operacional Fevereiro",
                    "Salarios e encargos Fevereiro",
                    "Marketing Fevereiro",
                    "Tecnologia Fevereiro",
                ],
            },
        },
        select: { id: true },
    });
    for (const lancamento of lancamentosExistentes) {
        await prisma.financeiroEscritorioLancamento.delete({ where: { id: lancamento.id } });
    }

    const casosExistentes = await prisma.casoFinanceiro.findMany({
        where: { processoId: { in: [processoFulano.id, processoBeta.id, processoGama.id] } },
        select: { id: true },
    });
    const casoIds = casosExistentes.map((caso) => caso.id);

    if (casoIds.length > 0) {
        const participantesExistentes = await prisma.casoParticipante.findMany({
            where: { casoFinanceiroId: { in: casoIds } },
            select: { id: true },
        });
        for (const participante of participantesExistentes) {
            await prisma.casoParticipante.delete({ where: { id: participante.id } });
        }

        const repassesExistentes = await prisma.repasseHonorario.findMany({
            where: { casoFinanceiroId: { in: casoIds } },
            select: { id: true },
        });
        for (const repasse of repassesExistentes) {
            await prisma.repasseHonorario.delete({ where: { id: repasse.id } });
        }
    }

    const despesasExistentes = await prisma.despesaProcesso.findMany({
        where: { processoId: { in: [processoFulano.id, processoBeta.id, processoGama.id] } },
        select: { id: true },
    });
    for (const despesa of despesasExistentes) {
        await prisma.despesaProcesso.delete({ where: { id: despesa.id } });
    }

    for (const caso of casosExistentes) {
        await prisma.casoFinanceiro.delete({ where: { id: caso.id } });
    }

    const lancamentosEscritorio = [
        ["SAIDA", "DESPESA", "Gasto Operacional", "Conta de Luz", "Conta de Luz Janeiro/2026", centroMap["Estrutura fisica"], 450, 450, "2026-01-05", "DEBITO_AUTOMATICO", "Neoenergia"],
        ["SAIDA", "DESPESA", "Gasto Operacional", "Internet", "Internet Janeiro/2026", centroMap["Tecnologia"], 189.9, 189.9, "2026-01-05", "PIX", "Vivo Fibra"],
        ["SAIDA", "DESPESA", "Gasto Operacional", "Limpeza", "Limpeza Janeiro/2026", centroMap["Administrativo"], 320, 320, "2026-01-07", "PIX", "Servico de Limpeza"],
        ["SAIDA", "DESPESA", "Gasto Operacional", "Cafe", "Cafe Janeiro/2026", centroMap["Administrativo"], 145, 145, "2026-01-08", "DINHEIRO", "Mercado Central"],
        ["SAIDA", "DESPESA", "Gasto Operacional", "Compras de Mercado", "Compras de mercado Janeiro/2026", centroMap["Administrativo"], 410, 410, "2026-01-09", "PIX", "Atacadao"],
        ["SAIDA", "DESPESA", "Gasto Operacional", "Publicidade", "Publicidade Janeiro/2026", centroMap["Marketing"], 1500, 1500, "2026-01-10", "TRANSFERENCIA", "Agencia de Midia"],
        ["SAIDA", "DESPESA", "Gasto Operacional", "Salario Funcionario", "Salario administrativo Janeiro/2026", centroMap["RH"], 2300, 2300, "2026-01-10", "TRANSFERENCIA", "Diego Administrativo"],
        ["SAIDA", "DESPESA", "Gasto Operacional", "Software Juridico", "Software Juridico Janeiro/2026", centroMap["Tecnologia"], 399, 399, "2026-01-10", "CARTAO", "Software Juridico SaaS"],
        ["ENTRADA", "RECEITA", "Receita", "Reembolso de Cliente", "Reembolso de cliente Fulano", centroMap["Custas processuais"], 600, 600, "2026-01-15", "PIX", "Fulano de Tal"],
        ["ENTRADA", "RECEITA", "Receita", "Honorarios Contratuais", "Honorarios contratuais recebidos Janeiro", centroMap["Operacional Juridico"], 8000, 8000, "2026-01-20", "TRANSFERENCIA", "Fulano de Tal"],
        ["ENTRADA", "RECEITA", "Receita", "Honorarios Recebidos", "Honorarios recebidos Fevereiro", centroMap["Operacional Juridico"], 12000, 12000, "2026-02-20", "TRANSFERENCIA", "Clientes diversos"],
        ["ENTRADA", "RECEITA", "Receita", "Reembolsos Recebidos", "Reembolsos recebidos Fevereiro", centroMap["Custas processuais"], 1300, 1300, "2026-02-22", "PIX", "Clientes diversos"],
        ["SAIDA", "DESPESA", "Gasto Operacional", "Despesas Operacionais", "Despesa operacional Fevereiro", centroMap["Administrativo"], 5400, 5400, "2026-02-10", "TRANSFERENCIA", "Operacao do escritorio"],
        ["SAIDA", "DESPESA", "Gasto Operacional", "Salarios e Encargos", "Salarios e encargos Fevereiro", centroMap["RH"], 3200, 3200, "2026-02-10", "TRANSFERENCIA", "Folha de pagamento"],
        ["SAIDA", "DESPESA", "Gasto Operacional", "Marketing", "Marketing Fevereiro", centroMap["Marketing"], 650, 650, "2026-02-12", "TRANSFERENCIA", "Gestor de trafego"],
        ["SAIDA", "DESPESA", "Gasto Operacional", "Tecnologia", "Tecnologia Fevereiro", centroMap["Tecnologia"], 490, 490, "2026-02-15", "CARTAO", "Stack de tecnologia"],
    ] as const;

    for (const [tipoLancamento, classificacao, categoriaPrincipal, subcategoria, descricao, centroCustoId, valorPrevisto, valorReal, dataCompetencia, formaPagamento, fornecedorBeneficiario] of lancamentosEscritorio) {
        await prisma.financeiroEscritorioLancamento.create({
            data: {
                escritorioId,
                tipoLancamento,
                classificacao,
                categoriaPrincipal,
                subcategoria,
                descricao,
                centroCustoId,
                valorPrevisto,
                valorReal,
                dataCompetencia: new Date(dataCompetencia),
                dataVencimento: new Date(dataCompetencia),
                dataPagamento: new Date(dataCompetencia),
                status: tipoLancamento === "ENTRADA" ? "RECEBIDO" : "PAGO",
                formaPagamento,
                recorrente: ["Conta de Luz", "Internet", "Limpeza", "Salario Funcionario", "Software Juridico", "Salarios e Encargos"].includes(subcategoria),
                periodicidade: ["Conta de Luz", "Internet", "Limpeza", "Salario Funcionario", "Software Juridico", "Salarios e Encargos"].includes(subcategoria) ? "MENSAL" : "UNICA",
                fornecedorBeneficiario,
                clienteId: descricao === "Reembolso de cliente Fulano" || descricao === "Honorarios contratuais recebidos Janeiro" ? fulano.id : null,
                processoId: descricao === "Reembolso de cliente Fulano" || descricao === "Honorarios contratuais recebidos Janeiro" ? processoFulano.id : null,
                reembolsavel: descricao === "Reembolso de cliente Fulano",
                criadoPorId: adminUser.id,
            },
        });
    }

    const [casoFulano, casoBeta, casoGama] = await Promise.all([
        prisma.casoFinanceiro.create({ data: { escritorioId, clienteId: fulano.id, processoId: processoFulano.id, contratoId: "CTR-2026-001", tipoEvento: "HONORARIO_EXITO", descricaoEvento: "Causa ganha com recebimento de R$ 20.000,00", valorBrutoCaso: 20000, baseCalculoHonorario: 20000, percentualHonorarioEscritorio: 30, valorHonorarioEscritorio: 6000, valorRecebidoEscritorio: 6000, valorAReceberEscritorio: 0, modoRateio: "PERCENTUAL", retencaoAdministrativaPercent: 0, retencaoAdministrativaValor: 0, impostosCaso: 0, dataResultado: new Date("2026-01-20"), dataRecebimento: new Date("2026-01-20"), statusFinanceiro: "RECEBIDO_INTEGRAL", observacoes: "Caso de referencia do documento funcional.", criadoPorId: carlaUser.id } }),
        prisma.casoFinanceiro.create({ data: { escritorioId, clienteId: empresaBeta.id, processoId: processoBeta.id, contratoId: "CTR-2026-002", tipoEvento: "HONORARIO_CONTRATUAL", descricaoEvento: "Contrato fixo empresarial de R$ 5.000,00", valorBrutoCaso: 5000, baseCalculoHonorario: 5000, percentualHonorarioEscritorio: 100, valorHonorarioEscritorio: 5000, valorRecebidoEscritorio: 2500, valorAReceberEscritorio: 2500, modoRateio: "MANUAL", retencaoAdministrativaPercent: 0, retencaoAdministrativaValor: 0, impostosCaso: 0, dataResultado: new Date("2026-01-18"), dataRecebimento: new Date("2026-01-18"), statusFinanceiro: "RECEBIDO_PARCIAL", observacoes: "Contrato fixo com saldo pendente.", criadoPorId: carlaUser.id } }),
        prisma.casoFinanceiro.create({ data: { escritorioId, clienteId: clienteGama.id, processoId: processoGama.id, contratoId: "CTR-2026-003", tipoEvento: "ACORDO", descricaoEvento: "Recebimento parcelado em andamento", valorBrutoCaso: 12000, baseCalculoHonorario: 12000, percentualHonorarioEscritorio: 30, valorHonorarioEscritorio: 3600, valorRecebidoEscritorio: 1800, valorAReceberEscritorio: 1800, modoRateio: "RETENCAO_ADMINISTRATIVA", retencaoAdministrativaPercent: 20, retencaoAdministrativaValor: 720, impostosCaso: 180, dataResultado: new Date("2026-02-10"), dataRecebimento: new Date("2026-02-10"), statusFinanceiro: "RECEBIDO_PARCIAL", observacoes: "Caso adicional para demonstrativos.", criadoPorId: carlaUser.id } }),
    ]);

    for (const participante of [
        { casoFinanceiroId: casoFulano.id, advogadoId: anaAdvogado.id, papelNoCaso: "RESPONSAVEL_PRINCIPAL", percentualParticipacao: 60, valorPrevistoRateio: 3600, valorPagoRateio: 3600, valorPendenteRateio: 0, dataPagamento: new Date("2026-01-22"), statusRateio: "PAGO" },
        { casoFinanceiroId: casoFulano.id, advogadoId: brunoAdvogado.id, papelNoCaso: "AUDIENCIA", percentualParticipacao: 40, valorPrevistoRateio: 2400, valorPagoRateio: 1200, valorPendenteRateio: 1200, statusRateio: "PARCIAL" },
        { casoFinanceiroId: casoBeta.id, advogadoId: carlosAdvogado.id, papelNoCaso: "RESPONSAVEL_PRINCIPAL", percentualParticipacao: 100, valorPrevistoRateio: 5000, valorPagoRateio: 2500, valorPendenteRateio: 2500, statusRateio: "PARCIAL" },
        { casoFinanceiroId: casoGama.id, advogadoId: brunoAdvogado.id, papelNoCaso: "RESPONSAVEL_PRINCIPAL", percentualParticipacao: 100, valorPrevistoRateio: 2880, valorPagoRateio: 800, valorPendenteRateio: 2080, statusRateio: "PARCIAL" },
    ] as const) {
        await prisma.casoParticipante.create({ data: participante });
    }

    for (const repasse of [
        { casoFinanceiroId: casoFulano.id, advogadoId: anaAdvogado.id, tipoRepasse: "ADVOGADO", valorPrevisto: 3600, valorPago: 3600, dataPrevista: new Date("2026-01-22"), dataPagamento: new Date("2026-01-22"), status: "PAGO", formaPagamento: "PIX", aprovadoPorId: adminUser.id, aprovadoEm: new Date("2026-01-22") },
        { casoFinanceiroId: casoFulano.id, advogadoId: brunoAdvogado.id, tipoRepasse: "ADVOGADO", valorPrevisto: 2400, valorPago: 1200, dataPrevista: new Date("2026-01-22"), dataPagamento: new Date("2026-01-25"), status: "PARCIAL", formaPagamento: "PIX", aprovadoPorId: adminUser.id, aprovadoEm: new Date("2026-01-22") },
        { casoFinanceiroId: casoBeta.id, advogadoId: carlosAdvogado.id, tipoRepasse: "ADVOGADO", valorPrevisto: 5000, valorPago: 2500, dataPrevista: new Date("2026-02-05"), dataPagamento: new Date("2026-02-05"), status: "PARCIAL", formaPagamento: "TRANSFERENCIA", aprovadoPorId: adminUser.id, aprovadoEm: new Date("2026-02-05") },
        { casoFinanceiroId: casoGama.id, advogadoId: brunoAdvogado.id, tipoRepasse: "ADVOGADO", valorPrevisto: 2880, valorPago: 800, dataPrevista: new Date("2026-02-18"), dataPagamento: new Date("2026-02-18"), status: "PARCIAL", formaPagamento: "PIX", aprovadoPorId: adminUser.id, aprovadoEm: new Date("2026-02-18") },
    ] as const) {
        await prisma.repasseHonorario.create({ data: repasse });
    }

    for (const despesa of [
        { processoId: processoFulano.id, clienteId: fulano.id, casoFinanceiroId: casoFulano.id, tipoDespesa: "CUSTA", descricao: "Distribuicao inicial", valor: 450, pagoPor: "ESCRITORIO", reembolsavel: true, dataLancamento: new Date("2026-01-03"), dataPagamento: new Date("2026-01-03"), status: "REEMBOLSADO" },
        { processoId: processoFulano.id, clienteId: fulano.id, casoFinanceiroId: casoFulano.id, tipoDespesa: "DESLOCAMENTO", descricao: "Audiencia", valor: 120, pagoPor: "ESCRITORIO", reembolsavel: false, dataLancamento: new Date("2026-01-18"), dataPagamento: new Date("2026-01-18"), status: "PAGO" },
        { processoId: processoFulano.id, clienteId: fulano.id, casoFinanceiroId: casoFulano.id, tipoDespesa: "COPIAS", descricao: "Impressoes e autenticacoes", valor: 80, pagoPor: "ESCRITORIO", reembolsavel: true, dataLancamento: new Date("2026-01-19"), dataPagamento: new Date("2026-01-19"), status: "REEMBOLSADO" },
        { processoId: processoGama.id, clienteId: clienteGama.id, casoFinanceiroId: casoGama.id, tipoDespesa: "CORRESPONDENTE", descricao: "Diligencia externa", valor: 220, pagoPor: "ESCRITORIO", reembolsavel: false, dataLancamento: new Date("2026-02-12"), dataPagamento: new Date("2026-02-12"), status: "PAGO" },
    ] as const) {
        await prisma.despesaProcesso.create({ data: despesa });
    }

    const funcionarioFinanceiroCarla = await prisma.funcionarioFinanceiro.upsert({
        where: { userId: carlaUser.id },
        update: { escritorioId, tipoVinculo: "CLT", salarioBase: 2300, beneficios: 350, encargos: 550, bonus: 0, comissao: 0, ajudaCusto: 0, valorTotalMensal: 3200, centroCustoId: centroMap["RH"], dataInicio: new Date("2025-11-01"), status: "ATIVO" },
        create: { escritorioId, userId: carlaUser.id, tipoVinculo: "CLT", salarioBase: 2300, beneficios: 350, encargos: 550, bonus: 0, comissao: 0, ajudaCusto: 0, valorTotalMensal: 3200, centroCustoId: centroMap["RH"], dataInicio: new Date("2025-11-01"), status: "ATIVO" },
    });
    const funcionarioFinanceiroDiego = await prisma.funcionarioFinanceiro.upsert({
        where: { userId: diegoUser.id },
        update: { escritorioId, tipoVinculo: "CLT", salarioBase: 1800, beneficios: 220, encargos: 280, bonus: 0, comissao: 0, ajudaCusto: 0, valorTotalMensal: 2300, centroCustoId: centroMap["Administrativo"], dataInicio: new Date("2025-12-01"), status: "ATIVO" },
        create: { escritorioId, userId: diegoUser.id, tipoVinculo: "CLT", salarioBase: 1800, beneficios: 220, encargos: 280, bonus: 0, comissao: 0, ajudaCusto: 0, valorTotalMensal: 2300, centroCustoId: centroMap["Administrativo"], dataInicio: new Date("2025-12-01"), status: "ATIVO" },
    });

    for (const lancamento of [
        { funcionarioFinanceiroId: funcionarioFinanceiroCarla.id, competencia: new Date("2026-01-01"), salario: 2300, valeTransporte: 120, valeRefeicao: 230, bonus: 0, comissao: 0, encargos: 550, desconto: 0, valorTotal: 3200, statusPagamento: StatusPagamentoFolha.PAGO, dataPagamento: new Date("2026-01-10"), observacoes: "Competencia janeiro 2026" },
        { funcionarioFinanceiroId: funcionarioFinanceiroCarla.id, competencia: new Date("2026-02-01"), salario: 2300, valeTransporte: 120, valeRefeicao: 230, bonus: 0, comissao: 0, encargos: 550, desconto: 0, valorTotal: 3200, statusPagamento: StatusPagamentoFolha.PAGO, dataPagamento: new Date("2026-02-10"), observacoes: "Competencia fevereiro 2026" },
        { funcionarioFinanceiroId: funcionarioFinanceiroDiego.id, competencia: new Date("2026-01-01"), salario: 1800, valeTransporte: 100, valeRefeicao: 120, bonus: 0, comissao: 0, encargos: 280, desconto: 0, valorTotal: 2300, statusPagamento: StatusPagamentoFolha.PAGO, dataPagamento: new Date("2026-01-10"), observacoes: "Competencia janeiro 2026" },
        { funcionarioFinanceiroId: funcionarioFinanceiroDiego.id, competencia: new Date("2026-02-01"), salario: 1800, valeTransporte: 100, valeRefeicao: 120, bonus: 0, comissao: 0, encargos: 280, desconto: 0, valorTotal: 2300, statusPagamento: StatusPagamentoFolha.PAGO, dataPagamento: new Date("2026-02-10"), observacoes: "Competencia fevereiro 2026" },
    ]) {
        const { funcionarioFinanceiroId, ...payload } = lancamento;
        await prisma.funcionarioLancamento.upsert({
            where: { funcionarioFinanceiroId_competencia: { funcionarioFinanceiroId, competencia: payload.competencia } },
            update: payload,
            create: { funcionarioFinanceiroId, ...payload },
        });
    }
}
