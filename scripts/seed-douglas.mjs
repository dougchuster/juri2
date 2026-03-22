import { PrismaClient } from '../src/generated/prisma/index.js';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: 'postgresql://juridico:juridico123@localhost:5432/sistema_juridico' });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  // 1. Find escritório and advogados
  const escritorio = await db.escritorio.findFirst({ select: { id: true, nome: true } });
  const advogados = await db.advogado.findMany({
    where: { ativo: true },
    include: { user: { select: { name: true } } },
    take: 4,
  });

  if (!escritorio || advogados.length === 0) {
    console.error('Nenhum escritório ou advogado encontrado.');
    process.exit(1);
  }

  // Distribute roles: use up to 3 advogados for variety
  const advogado  = advogados[0];                          // principal (ex: Adv Paula Matos)
  const advogado2 = advogados[1] ?? advogados[0];         // secundário (ex: Secretaria Carla)
  const advogado3 = advogados[2] ?? advogados[0];         // terceiro   (ex: Adv Ingrid)

  console.log(`Escritório: ${escritorio.nome} (${escritorio.id})`);
  advogados.forEach(a => console.log(`  Advogado disponível: ${a.user.name} (${a.id})`));

  // 2. Criar cliente Douglas Chuster
  let cliente = await db.cliente.findFirst({
    where: { nome: { contains: 'Douglas', mode: 'insensitive' } },
  });

  if (!cliente) {
    cliente = await db.cliente.create({
      data: {
        escritorioId: escritorio.id,
        nome: 'Douglas Chuster',
        email: 'douglas.chuster@email.com',
        telefone: '(31) 99999-0001',
        cpfCnpj: '123.456.789-00',
        status: 'ATIVO',
        observacoes: 'Cliente fictício criado para demonstração da timeline unificada.',
      },
    });
    console.log(`Cliente criado: ${cliente.nome} (${cliente.id})`);
  } else {
    console.log(`Cliente já existe: ${cliente.nome} (${cliente.id})`);
  }

  // 3. Criar processo fictício (ou reutilizar existente)
  let processo = await db.processo.findFirst({
    where: { clienteId: cliente.id, numeroCnj: '5001234-12.2024.8.13.0079' },
  });
  if (processo) {
    console.log(`Processo já existe (${processo.id}), limpando dados anteriores...`);
    await db.movimentacao.deleteMany({ where: { processoId: processo.id } });
    await db.prazo.deleteMany({ where: { processoId: processo.id } });
    await db.audiencia.deleteMany({ where: { processoId: processo.id } });
    await db.documento.deleteMany({ where: { processoId: processo.id } });
    await db.honorario.deleteMany({ where: { processoId: processo.id } });
    console.log('Dados anteriores removidos.');
  } else {
  processo = await db.processo.create({
    data: {
      clienteId: cliente.id,
      advogadoId: advogado.id,
      numeroCnj: '5001234-12.2024.8.13.0079',
      objeto: 'Ação de Indenização por Danos Morais — decorrente de relação contratual entre as partes, com pedido de rescisão contratual e devolução de valores pagos indevidamente.',
      status: 'EM_ANDAMENTO',
      tribunal: 'TJMG',
      vara: '3ª Vara Cível',
      comarca: 'Belo Horizonte',
      foro: 'Foro Central',
      valorCausa: 85000.00,
      dataDistribuicao: new Date('2024-03-15'),
      dataUltimaMovimentacao: new Date(),
    },
  });
  console.log(`Processo criado: ${processo.id}`);
  }

  const now = new Date();
  const d = (daysAgo) => new Date(now.getTime() - daysAgo * 86400000);

  // 4. Movimentações manuais (registros internos)
  await db.movimentacao.createMany({
    data: [
      // adv principal: protocola peças, réplica, reuniões estratégicas
      {
        processoId: processo.id,
        data: d(120),
        descricao: 'Petição inicial protocolada com todos os documentos comprobatórios. Pedido de tutela antecipada incluído.',
        tipo: 'JUNTADA',
        subTipo: 'JUDICIAL',
        fonte: 'MANUAL',
        responsavelId: advogado.id,
        privado: false,
      },
      // adv2: agenda reunião inicial com cliente
      {
        processoId: processo.id,
        data: d(110),
        descricao: 'Reunião inicial com cliente Douglas Chuster para alinhar estratégia de defesa e coletar documentos complementares. Cliente demonstrou interesse em acordo extrajudicial caso surja oportunidade.',
        tipo: 'REUNIÃO',
        subTipo: 'REUNIAO',
        fonte: 'MANUAL',
        hora: '14:30',
        responsavelId: advogado2.id,
        privado: false,
      },
      // automático - sem responsável
      {
        processoId: processo.id,
        data: d(100),
        descricao: 'Publicação no Diário da Justiça Eletrônico — TJMG — 3ª Vara Cível de Belo Horizonte. Despacho determinando emenda à inicial para esclarecimentos sobre o valor da causa.',
        tipo: 'PUBLICAÇÃO',
        subTipo: 'JUDICIAL',
        fonte: 'PUBLICACAO',
        privado: false,
      },
      // adv principal: emenda à inicial
      {
        processoId: processo.id,
        data: d(95),
        descricao: 'Emenda à petição inicial protocolada com a devida correção do valor da causa e documentos adicionais solicitados pelo juízo.',
        tipo: 'JUNTADA',
        subTipo: 'JUDICIAL',
        fonte: 'MANUAL',
        responsavelId: advogado.id,
        privado: false,
      },
      // adv2: contato telefônico com cliente
      {
        processoId: processo.id,
        data: d(85),
        descricao: 'Contato telefônico com cliente para informar sobre o despacho de emenda e prazo de resposta da parte contrária. Cliente ciente e satisfeito com o andamento.',
        tipo: 'CONTATO',
        subTipo: 'CONTATO_TELEFONICO',
        fonte: 'MANUAL',
        hora: '10:15',
        responsavelId: advogado2.id,
        privado: false,
      },
      // automático - publicação DJE
      {
        processoId: processo.id,
        data: d(75),
        descricao: 'Publicação no DJE — Despacho citando a parte ré para apresentação de contestação no prazo de 15 dias corridos.',
        tipo: 'PUBLICAÇÃO',
        subTipo: 'JUDICIAL',
        fonte: 'PUBLICACAO',
        privado: false,
      },
      // datajud - sem responsável
      {
        processoId: processo.id,
        data: d(65),
        descricao: 'Contestação da parte ré juntada aos autos. Argumentação baseada em excludente de responsabilidade e negativa dos fatos narrados na inicial.',
        tipo: 'JUNTADA',
        subTipo: 'JUDICIAL',
        fonte: 'DATAJUD',
        privado: false,
      },
      // adv3: protocola réplica
      {
        processoId: processo.id,
        data: d(55),
        descricao: 'Réplica à contestação protocolada. Refutação ponto a ponto dos argumentos da parte ré com documentos complementares.',
        tipo: 'JUNTADA',
        subTipo: 'JUDICIAL',
        fonte: 'MANUAL',
        responsavelId: advogado3.id,
        privado: false,
      },
      // adv principal: reunião de alinhamento estratégico
      {
        processoId: processo.id,
        data: d(45),
        descricao: 'Reunião de alinhamento com Douglas — discussão sobre possibilidade de acordo. Cliente autoriza negociação de até 60% do valor pedido. Estratégia: tentar conciliação na audiência.',
        tipo: 'REUNIÃO',
        subTipo: 'REUNIAO',
        fonte: 'MANUAL',
        hora: '16:00',
        responsavelId: advogado.id,
        privado: false,
      },
      // datajud - decisão automática
      {
        processoId: processo.id,
        data: d(30),
        descricao: 'Decisão interlocutória — Juiz designa audiência de conciliação para 22/04/2026. Partes intimadas.',
        tipo: 'DECISÃO',
        subTipo: 'JUDICIAL',
        fonte: 'DATAJUD',
        privado: false,
      },
      // adv2: anotação interna sobre proposta da ré
      {
        processoId: processo.id,
        data: d(20),
        descricao: 'ANOTAÇÃO INTERNA: Parte ré fez sondagem informal sobre acordo extrajudicial. Valor proposto: R$ 35.000,00. Aguardar audiência para negociar.',
        tipo: 'ANOTAÇÃO',
        subTipo: 'ANOTACAO',
        fonte: 'MANUAL',
        hora: '09:45',
        responsavelId: advogado2.id,
        privado: true,
      },
      // adv3: envia e-mail ao cliente
      {
        processoId: processo.id,
        data: d(10),
        descricao: 'E-mail enviado ao cliente Douglas com resumo completo do processo, documentos anexos e orientações para a audiência de conciliação marcada para 22/04/2026.',
        tipo: 'EMAIL',
        subTipo: 'EMAIL',
        fonte: 'MANUAL',
        hora: '11:30',
        responsavelId: advogado3.id,
        privado: false,
      },
      // datajud - conclusão automática
      {
        processoId: processo.id,
        data: d(3),
        descricao: 'Andamento DataJud: Conclusão dos autos ao juiz para análise de questões prévias antes da audiência.',
        tipo: 'CONCLUSÃO',
        subTipo: 'JUDICIAL',
        fonte: 'DATAJUD',
        privado: false,
      },
    ],
  });
  console.log('Movimentações criadas.');

  // 5. Prazos
  const prazo1 = await db.prazo.create({
    data: {
      processoId: processo.id,
      advogadoId: advogado.id,
      descricao: 'Prazo para apresentação de documentos complementares solicitados pelo juízo',
      dataFatal: d(-7), // já vencido
      dataCortesia: d(-10),
      tipoContagem: 'DIAS_CORRIDOS',
      fatal: false,
      status: 'CONCLUIDO',
      origem: 'MANUAL',
      concluidoEm: d(-9),
    },
  });

  const prazo2 = await db.prazo.create({
    data: {
      processoId: processo.id,
      advogadoId: advogado.id,
      descricao: 'Preparação de memoriais para audiência de conciliação',
      dataFatal: new Date(now.getTime() + 3 * 86400000), // em 3 dias — URGENTE
      dataCortesia: new Date(now.getTime() + 1 * 86400000),
      tipoContagem: 'DIAS_CORRIDOS',
      fatal: true,
      status: 'PENDENTE',
      origem: 'MANUAL',
      observacoes: 'Preparar resumo dos fatos, documentos principais e proposta de acordo.',
    },
  });

  const prazo3 = await db.prazo.create({
    data: {
      processoId: processo.id,
      advogadoId: advogado.id,
      descricao: 'Recurso de apelação (caso sentença desfavorável)',
      dataFatal: new Date(now.getTime() + 45 * 86400000),
      dataCortesia: new Date(now.getTime() + 40 * 86400000),
      tipoContagem: 'DIAS_UTEIS',
      fatal: true,
      status: 'PENDENTE',
      origem: 'MANUAL',
    },
  });
  console.log('Prazos criados.');

  // 6. Audiência
  const audiencia = await db.audiencia.create({
    data: {
      processoId: processo.id,
      advogadoId: advogado.id,
      tipo: 'CONCILIACAO',
      data: new Date(now.getTime() + 3 * 86400000), // em 3 dias
      local: '3ª Vara Cível — Fórum Central de BH',
      sala: 'Sala 12 — Térreo',
      observacoes: 'Levar toda a documentação original. Chegar com 30 minutos de antecedência.',
      realizada: false,
    },
  });
  console.log('Audiência criada.');

  // 7. Pastas automáticas: Clientes > Douglas Chuster
  let pastaRaiz = await db.pastaDocumento.findFirst({
    where: { escritorioId: escritorio.id, isRootClientes: true, parentId: null },
  });
  if (!pastaRaiz) {
    pastaRaiz = await db.pastaDocumento.create({
      data: {
        nome: 'Clientes',
        descricao: 'Pasta raiz automática dos documentos de clientes',
        escritorioId: escritorio.id,
        isRootClientes: true,
      },
    });
  }

  let pastaCliente = await db.pastaDocumento.findFirst({
    where: { clienteId: cliente.id, parentId: pastaRaiz.id },
  });
  if (!pastaCliente) {
    pastaCliente = await db.pastaDocumento.create({
      data: {
        nome: cliente.nome,
        escritorioId: escritorio.id,
        parentId: pastaRaiz.id,
        clienteId: cliente.id,
      },
    });
  }
  console.log(`Pastas criadas: Clientes > ${cliente.nome}`);

  // Sub-pasta para documentos processuais
  let pastaProcesso = await db.pastaDocumento.findFirst({
    where: { parentId: pastaCliente.id, nome: 'Processo' },
  });
  if (!pastaProcesso) {
    pastaProcesso = await db.pastaDocumento.create({
      data: {
        nome: 'Processo',
        descricao: 'Documentos vinculados ao processo judicial',
        escritorioId: escritorio.id,
        parentId: pastaCliente.id,
        clienteId: cliente.id,
      },
    });
  }

  // 8. Documentos (com pastaId apontando para a pasta do processo)
  await db.documento.createMany({
    data: [
      {
        processoId: processo.id,
        escritorioId: escritorio.id,
        pastaId: pastaProcesso.id,
        titulo: 'Petição Inicial — Ação de Indenização',
        arquivoNome: 'peticao-inicial-douglas-chuster.pdf',
        statusFluxo: 'PUBLICADA',
        versao: 1,
        mimeType: 'application/pdf',
      },
      {
        processoId: processo.id,
        escritorioId: escritorio.id,
        pastaId: pastaProcesso.id,
        titulo: 'Documentos Comprobatórios — Contrato e Notas Fiscais',
        arquivoNome: 'documentos-comprobatorios.pdf',
        statusFluxo: 'PUBLICADA',
        versao: 1,
        mimeType: 'application/pdf',
      },
      {
        processoId: processo.id,
        escritorioId: escritorio.id,
        pastaId: pastaProcesso.id,
        titulo: 'Réplica à Contestação',
        arquivoNome: 'replica-contestacao.pdf',
        statusFluxo: 'PUBLICADA',
        versao: 1,
        mimeType: 'application/pdf',
      },
      {
        processoId: processo.id,
        escritorioId: escritorio.id,
        pastaId: pastaProcesso.id,
        titulo: 'Memoriais para Audiência de Conciliação',
        arquivoNome: 'memoriais-audiencia.docx',
        statusFluxo: 'RASCUNHO',
        versao: 1,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    ],
  });
  console.log('Documentos criados e vinculados à pasta.');

  // 8. Faturas
  const faturaBase = Date.now();
  await db.fatura.createMany({
    data: [
      {
        numero: `FAT-DEMO-001-${faturaBase}`,
        clienteId: cliente.id,
        descricao: 'Honorários advocatícios — Entrada (30%)',
        valorTotal: 3600.00,
        status: 'PAGA',
        dataEmissao: d(125),
        dataVencimento: d(120),
        dataPagamento: d(118),
      },
      {
        numero: `FAT-DEMO-002-${faturaBase}`,
        clienteId: cliente.id,
        descricao: 'Honorários advocatícios — Parcela 2 (30%)',
        valorTotal: 3600.00,
        status: 'PAGA',
        dataEmissao: d(65),
        dataVencimento: d(60),
        dataPagamento: d(58),
      },
      {
        numero: `FAT-DEMO-003-${faturaBase}`,
        clienteId: cliente.id,
        descricao: 'Honorários advocatícios — Parcela final (40%)',
        valorTotal: 4800.00,
        status: 'PENDENTE',
        dataEmissao: d(5),
        dataVencimento: new Date(Date.now() + 30 * 86400000),
      },
    ],
  });
  console.log('Faturas criadas.');

  // 9. Honorário
  await db.honorario.create({
    data: {
      processoId: processo.id,
      clienteId: cliente.id,
      tipo: 'FIXO',
      status: 'ATIVO',
      valorTotal: 12000.00,
      descricao: 'Honorários advocatícios — Ação de Indenização por Danos Morais. Inclui todas as fases processuais até o trânsito em julgado.',
      dataContrato: d(125),
    },
  });
  console.log('Honorário criado.');

  console.log('\n✅ Dados fictícios criados com sucesso!');
  console.log(`\nCliente ID: ${cliente.id}`);
  console.log(`Processo ID: ${processo.id}`);
  console.log(`\nAcesse: /clientes/${cliente.id}`);
  console.log(`Acesse: /processos/${processo.id}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
