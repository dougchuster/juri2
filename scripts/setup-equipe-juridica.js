require("dotenv/config");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient, Role } = require("../src/generated/prisma");

const DEFAULT_PASSWORD = process.env.EQUIPE_JURIDICA_DEFAULT_PASSWORD || "Adv@123456";
const DEFAULT_SECCIONAL = process.env.EQUIPE_JURIDICA_SECCIONAL || "DF";

const ADVOGADOS = [
  {
    nome: "Paula Matos Andrade",
    email: "paula.matos.andrade@escritorio.local",
    oab: "10001",
    lider: true,
    especialidades: "Civel, Trabalhista",
  },
  {
    nome: "Ingrid Ruas",
    email: "ingrid.ruas@escritorio.local",
    oab: "10002",
    lider: false,
    especialidades: "Previdenciario, Civel",
  },
  {
    nome: "Sávia Coimbra",
    email: "savia.coimbra@escritorio.local",
    oab: "10003",
    lider: false,
    especialidades: "Tributario, Empresarial",
  },
  {
    nome: "Amanda",
    email: "amanda@escritorio.local",
    oab: "10004",
    lider: false,
    especialidades: "Familia, Civel",
  },
  {
    nome: "ismael",
    email: "ismael@escritorio.local",
    oab: "10005",
    lider: false,
    especialidades: "Trabalhista, Contencioso",
  },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    console.log("Criando equipe juridica...");
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const time = await prisma.time.upsert({
      where: { nome: "Equipe Juridica" },
      update: {
        descricao: "Equipe principal para designacao de casos juridicos.",
        cor: "#2563EB",
        ativo: true,
      },
      create: {
        nome: "Equipe Juridica",
        descricao: "Equipe principal para designacao de casos juridicos.",
        cor: "#2563EB",
        ativo: true,
      },
    });

    const created = [];

    for (const advogado of ADVOGADOS) {
      const user = await prisma.user.upsert({
        where: { email: advogado.email.toLowerCase() },
        update: {
          name: advogado.nome,
          role: Role.ADVOGADO,
          isActive: true,
        },
        create: {
          name: advogado.nome,
          email: advogado.email.toLowerCase(),
          passwordHash,
          role: Role.ADVOGADO,
          isActive: true,
        },
      });

      const perfilAdvogado = await prisma.advogado.upsert({
        where: { userId: user.id },
        update: {
          oab: advogado.oab,
          seccional: DEFAULT_SECCIONAL,
          especialidades: advogado.especialidades,
          ativo: true,
        },
        create: {
          userId: user.id,
          oab: advogado.oab,
          seccional: DEFAULT_SECCIONAL,
          especialidades: advogado.especialidades,
          ativo: true,
        },
      });

      await prisma.timeMembro.upsert({
        where: {
          timeId_advogadoId: {
            timeId: time.id,
            advogadoId: perfilAdvogado.id,
          },
        },
        update: {
          lider: Boolean(advogado.lider),
        },
        create: {
          timeId: time.id,
          advogadoId: perfilAdvogado.id,
          lider: Boolean(advogado.lider),
        },
      });

      created.push({
        nome: advogado.nome,
        email: advogado.email.toLowerCase(),
        oab: `${advogado.oab}/${DEFAULT_SECCIONAL}`,
        lider: advogado.lider ? "sim" : "nao",
      });
    }

    console.log("\nEquipe juridica configurada com sucesso.");
    console.table(created);
    console.log(`Senha padrao para novos usuarios criados: ${DEFAULT_PASSWORD}`);
    console.log("A designacao do advogado responsavel ja pode ser feita em Processos > Advogado Responsavel.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Falha ao configurar equipe juridica:", error);
  process.exit(1);
});
