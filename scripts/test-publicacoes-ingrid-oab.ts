import "dotenv/config";

import { db } from "@/lib/db";
import { capturarPublicacoesNacionalPorOab } from "@/lib/services/publicacoes-capture";

const TRIBUNAIS_PADRAO = [
  "TJSP",
  "TJRJ",
  "TJMG",
  "TJRS",
  "TJPR",
  "TJSC",
  "TJBA",
  "TJPE",
  "TJCE",
  "TJDFT",
  "TRF1",
  "TRF2",
  "TRF3",
  "TRF4",
  "TRF5",
  "TRF6",
  "TRT1",
  "TRT2",
  "TRT3",
  "TRT4",
  "TRT5",
  "TRT6",
  "TRT9",
  "TRT12",
  "TRT15",
  "STJ",
  "STF",
  "TST",
];

function formatDateOnly(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function normalizeDateOnly(dateLike: string | Date) {
  const d = new Date(dateLike);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function run() {
  const alvoNome = "INGRID DE FREITAS RUAS";
  const oabNumero = "62898";
  const oabUf = "DF";

  const advogada = await db.advogado.findFirst({
    where: {
      OR: [
        {
          user: {
            name: {
              contains: "Ingrid",
              mode: "insensitive",
            },
          },
        },
        {
          oab: oabNumero,
          seccional: oabUf,
        },
      ],
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          isActive: true,
        },
      },
    },
  });

  if (!advogada) {
    throw new Error("Nao encontrei advogada Ingrid no cadastro.");
  }

  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - 10);
  const dataInicio = formatDateOnly(inicio);
  const dataFim = formatDateOnly(hoje);

  console.log("Teste de captura por OAB (pipeline real)");
  console.log(`Advogada alvo informada: ${alvoNome}`);
  console.log(`Cadastro usado: ${advogada.user.name} <${advogada.user.email}>`);
  console.log(`OAB de teste: ${advogada.oab}/${advogada.seccional}`);
  console.log(`Janela: ${dataInicio} ate ${dataFim}`);

  const captura = await capturarPublicacoesNacionalPorOab(
    {
      tribunais: TRIBUNAIS_PADRAO,
      dataInicio,
      dataFim,
      limitePorConsulta: 40,
      maxPaginasPorConsulta: 4,
      timeoutMs: 30_000,
      requestIntervalMs: 1250,
    },
    [
      {
        id: advogada.id,
        oab: advogada.oab,
        seccional: advogada.seccional,
      },
    ]
  );

  let importadas = 0;
  let duplicadas = 0;
  let errosPersistencia = 0;

  for (const item of captura.publicacoes) {
    try {
      const dataPublicacao = normalizeDateOnly(item.dataPublicacao);
      const existing = await db.publicacao.findFirst({
        where: item.identificador
          ? {
              tribunal: item.tribunal,
              identificador: item.identificador,
            }
          : {
              tribunal: item.tribunal,
              dataPublicacao,
              processoNumero: item.processoNumero,
              conteudo: item.conteudo,
            },
        select: { id: true },
      });

      if (existing) {
        duplicadas += 1;
        continue;
      }

      await db.publicacao.create({
        data: {
          tribunal: item.tribunal,
          diario: item.diario,
          dataPublicacao,
          conteudo: item.conteudo,
          identificador: item.identificador,
          processoNumero: item.processoNumero,
          partesTexto: item.partesTexto,
          oabsEncontradas: item.oabsEncontradas,
          advogadoId: item.advogadoId,
        },
      });
      importadas += 1;
    } catch (error) {
      console.error("[persist-publicacoes] erro:", error);
      errosPersistencia += 1;
    }
  }

  console.log("Resumo:");
  console.log(`- Tribunais consultados: ${TRIBUNAIS_PADRAO.length}`);
  console.log(`- Paginas consultadas: ${captura.meta.paginasConsultadas || 0}`);
  console.log(`- Capturadas: ${captura.publicacoes.length}`);
  console.log(`- Importadas: ${importadas}`);
  console.log(`- Duplicadas: ${duplicadas}`);
  console.log(`- Erros persistencia: ${errosPersistencia}`);
  console.log(`- Erros consulta: ${captura.erros.length}`);

  if (Object.keys(captura.porTribunal).length > 0) {
    console.log("Top tribunais com retorno:");
    const top = Object.entries(captura.porTribunal)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
    for (const [tribunal, qtd] of top) {
      console.log(`  - ${tribunal}: ${qtd}`);
    }
  }

  if (captura.erros.length > 0) {
    console.log("Amostra de erros:");
    for (const erro of captura.erros.slice(0, 8)) {
      console.log(`  - ${erro}`);
    }
  }
}

run()
  .catch((error) => {
    console.error("[test-publicacoes-ingrid-oab] Erro:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect().catch(() => null);
  });

