import "dotenv/config";

import bcrypt from "bcryptjs";

import { Prisma, Role } from "../src/generated/prisma";
import { db } from "../src/lib/db";
import { buildDemoFuncionarios, type DemoFuncionario } from "./lib/demo-funcionarios";

const FUNCIONARIOS_PERFIS_KEY = "FUNCIONARIOS_PERFIS_CONFIG";

function resolveRole(role: DemoFuncionario["role"]): Role {
  if (role === "ADMIN") return Role.ADMIN;
  if (role === "ADVOGADO") return Role.ADVOGADO;
  return Role.ASSISTENTE;
}

function buildDepartamento(perfilProfissional: string) {
  return perfilProfissional === "ADVOGADO" ? "Advocacia" : "Administrativo";
}

function toPerfisList(value: unknown): Array<Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const root = value as Record<string, unknown>;
  return Array.isArray(root.perfis)
    ? root.perfis.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
}

async function upsertFuncionarioPerfilDirect(
  userId: string,
  payload: {
    perfilProfissional: string;
    cargo: string;
    nivel: string | null;
    departamento: string;
  }
) {
  const current = await db.appSetting.findUnique({
    where: { key: FUNCIONARIOS_PERFIS_KEY },
    select: { value: true },
  });

  const nowIso = new Date().toISOString();
  const perfis = toPerfisList(current?.value);
  const existing = perfis.find((item) => String(item.userId || "") === userId) || null;

  const nextPerfil = {
    ...(existing || {}),
    userId,
    perfilProfissional: payload.perfilProfissional,
    telefone: null,
    celular: null,
    whatsapp: null,
    endereco: null,
    numero: null,
    complemento: null,
    bairro: null,
    cidade: null,
    estado: null,
    cep: null,
    cpf: null,
    rg: null,
    dataNascimento: null,
    estadoCivil: null,
    nacionalidade: null,
    naturalidade: null,
    cargo: payload.cargo,
    nivel: payload.nivel,
    departamento: payload.departamento,
    gestorDireto: null,
    unidade: null,
    matricula: null,
    dataAdmissao: null,
    dataDesligamento: null,
    regimeContratacao: null,
    turnoTrabalho: null,
    cargaHorariaSemanal: null,
    escolaridade: null,
    bio: null,
    linkedin: null,
    instagram: null,
    banco: null,
    agencia: null,
    conta: null,
    chavePix: null,
    contatoEmergenciaNome: null,
    contatoEmergenciaParentesco: null,
    contatoEmergenciaTelefone: null,
    pis: null,
    ctps: null,
    cnh: null,
    passaporte: null,
    idiomas: [],
    hardSkills: [],
    softSkills: [],
    certificacoes: [],
    tagsInternas: [],
    observacoes: null,
    createdAt: String(existing?.createdAt || nowIso),
    updatedAt: nowIso,
  };

  const nextPerfis = existing
    ? perfis.map((item) => (String(item.userId || "") === userId ? nextPerfil : item))
    : [nextPerfil, ...perfis];

  await db.appSetting.upsert({
    where: { key: FUNCIONARIOS_PERFIS_KEY },
    update: {
      value: { perfis: nextPerfis } as Prisma.InputJsonValue,
    },
    create: {
      key: FUNCIONARIOS_PERFIS_KEY,
      value: { perfis: nextPerfis } as Prisma.InputJsonValue,
    },
  });
}

async function seedFuncionario(funcionario: DemoFuncionario) {
  const passwordHash = await bcrypt.hash(funcionario.password, 10);
  const role = resolveRole(funcionario.role);

  const user = await db.$transaction(async (tx) => {
    const persistedUser = await tx.user.upsert({
      where: { email: funcionario.email },
      update: {
        name: funcionario.name,
        passwordHash,
        role,
        isActive: true,
      },
      create: {
        name: funcionario.name,
        email: funcionario.email,
        passwordHash,
        role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (funcionario.criarAdvogado) {
      await tx.advogado.upsert({
        where: { userId: persistedUser.id },
        update: {
          oab: funcionario.oab || "N/I",
          seccional: (funcionario.seccional || "DF").toUpperCase(),
          especialidades: funcionario.especialidades,
          ativo: true,
        },
        create: {
          userId: persistedUser.id,
          oab: funcionario.oab || "N/I",
          seccional: (funcionario.seccional || "DF").toUpperCase(),
          especialidades: funcionario.especialidades,
          ativo: true,
        },
      });
    } else {
      await tx.advogado.deleteMany({ where: { userId: persistedUser.id } });
    }

    return persistedUser;
  });

  await upsertFuncionarioPerfilDirect(user.id, {
    perfilProfissional: funcionario.perfilProfissional,
    cargo: funcionario.cargo,
    nivel: funcionario.nivel,
    departamento: buildDepartamento(funcionario.perfilProfissional),
  });

  return {
    nome: user.name,
    email: user.email,
    role: user.role,
    perfil: funcionario.perfilProfissional,
    advogado: funcionario.criarAdvogado ? "sim" : "nao",
  };
}

async function main() {
  const funcionarios = buildDemoFuncionarios();
  const resultado = [];

  for (const funcionario of funcionarios) {
    resultado.push(await seedFuncionario(funcionario));
  }

  console.log("Funcionarios demo configurados com sucesso.");
  console.table(resultado);
  console.log(`Senha demo aplicada: ${funcionarios[0]?.password || "Demo@123456"}`);
  console.log("Altere as senhas depois no sistema, se necessario.");
}

main()
  .catch((error) => {
    console.error("Falha ao configurar funcionarios demo:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
