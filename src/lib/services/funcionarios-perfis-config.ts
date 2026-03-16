import "server-only";

import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import type { FuncionarioPerfil } from "@/lib/types/funcionarios";

const FUNCIONARIOS_PERFIS_KEY = "FUNCIONARIOS_PERFIS_CONFIG";

function toString(value: unknown, fallback = "") {
    return typeof value === "string" ? value.trim() : fallback;
}

function toNullableString(value: unknown) {
    const normalized = toString(value);
    return normalized.length > 0 ? normalized : null;
}

function toIsoDate(value: unknown) {
    if (!value) return null;
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
}

function toStringArray(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => toString(item))
        .filter((item) => item.length > 0)
        .slice(0, 60);
}

function toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

function normalizePerfil(value: unknown): FuncionarioPerfil {
    const payload = toRecord(value);
    const nowIso = new Date().toISOString();
    const createdAt = toIsoDate(payload.createdAt) || nowIso;
    const updatedAt = toIsoDate(payload.updatedAt) || createdAt;

    return {
        userId: toString(payload.userId),
        perfilProfissional: toNullableString(payload.perfilProfissional),
        telefone: toNullableString(payload.telefone),
        celular: toNullableString(payload.celular),
        whatsapp: toNullableString(payload.whatsapp),
        endereco: toNullableString(payload.endereco),
        numero: toNullableString(payload.numero),
        complemento: toNullableString(payload.complemento),
        bairro: toNullableString(payload.bairro),
        cidade: toNullableString(payload.cidade),
        estado: toNullableString(payload.estado),
        cep: toNullableString(payload.cep),
        cpf: toNullableString(payload.cpf),
        rg: toNullableString(payload.rg),
        dataNascimento: toIsoDate(payload.dataNascimento),
        estadoCivil: toNullableString(payload.estadoCivil),
        nacionalidade: toNullableString(payload.nacionalidade),
        naturalidade: toNullableString(payload.naturalidade),
        cargo: toNullableString(payload.cargo),
        nivel: toNullableString(payload.nivel),
        departamento: toNullableString(payload.departamento),
        gestorDireto: toNullableString(payload.gestorDireto),
        unidade: toNullableString(payload.unidade),
        matricula: toNullableString(payload.matricula),
        dataAdmissao: toIsoDate(payload.dataAdmissao),
        dataDesligamento: toIsoDate(payload.dataDesligamento),
        regimeContratacao: toNullableString(payload.regimeContratacao),
        turnoTrabalho: toNullableString(payload.turnoTrabalho),
        cargaHorariaSemanal: toNullableString(payload.cargaHorariaSemanal),
        escolaridade: toNullableString(payload.escolaridade),
        bio: toNullableString(payload.bio),
        linkedin: toNullableString(payload.linkedin),
        instagram: toNullableString(payload.instagram),
        banco: toNullableString(payload.banco),
        agencia: toNullableString(payload.agencia),
        conta: toNullableString(payload.conta),
        chavePix: toNullableString(payload.chavePix),
        contatoEmergenciaNome: toNullableString(payload.contatoEmergenciaNome),
        contatoEmergenciaParentesco: toNullableString(payload.contatoEmergenciaParentesco),
        contatoEmergenciaTelefone: toNullableString(payload.contatoEmergenciaTelefone),
        pis: toNullableString(payload.pis),
        ctps: toNullableString(payload.ctps),
        cnh: toNullableString(payload.cnh),
        passaporte: toNullableString(payload.passaporte),
        idiomas: toStringArray(payload.idiomas),
        hardSkills: toStringArray(payload.hardSkills),
        softSkills: toStringArray(payload.softSkills),
        certificacoes: toStringArray(payload.certificacoes),
        tagsInternas: toStringArray(payload.tagsInternas),
        observacoes: toNullableString(payload.observacoes),
        createdAt,
        updatedAt,
    };
}

function normalizePayload(value: unknown): FuncionarioPerfil[] {
    const root = toRecord(value);
    const raw = Array.isArray(root.perfis) ? root.perfis : Array.isArray(value) ? value : [];
    return raw
        .map((item) => normalizePerfil(item))
        .filter((item) => item.userId.length > 0);
}

export async function getFuncionariosPerfisConfig(): Promise<FuncionarioPerfil[]> {
    try {
        const row = await db.appSetting.findUnique({
            where: { key: FUNCIONARIOS_PERFIS_KEY },
            select: { value: true },
        });
        if (!row) return [];
        return normalizePayload(row.value);
    } catch (error) {
        console.warn("[FuncionariosPerfisConfig] Falha ao carregar perfis:", error);
        return [];
    }
}

export async function saveFuncionariosPerfisConfig(
    perfis: FuncionarioPerfil[]
): Promise<FuncionarioPerfil[]> {
    const normalized = perfis.map((item) => normalizePerfil(item));
    try {
        await db.appSetting.upsert({
            where: { key: FUNCIONARIOS_PERFIS_KEY },
            update: { value: { perfis: normalized } as unknown as Prisma.InputJsonValue },
            create: {
                key: FUNCIONARIOS_PERFIS_KEY,
                value: { perfis: normalized } as unknown as Prisma.InputJsonValue,
            },
        });
    } catch (error) {
        console.warn("[FuncionariosPerfisConfig] Falha ao salvar perfis:", error);
    }
    return normalized;
}

export async function upsertFuncionarioPerfil(
    perfil: Omit<FuncionarioPerfil, "createdAt" | "updatedAt"> & {
        createdAt?: string;
        updatedAt?: string;
    }
): Promise<FuncionarioPerfil> {
    const nowIso = new Date().toISOString();
    const current = await getFuncionariosPerfisConfig();
    const existing = current.find((item) => item.userId === perfil.userId) || null;
    const normalized = normalizePerfil({
        ...perfil,
        createdAt: existing?.createdAt || perfil.createdAt || nowIso,
        updatedAt: nowIso,
    });
    const next = existing
        ? current.map((item) => (item.userId === normalized.userId ? normalized : item))
        : [normalized, ...current];
    await saveFuncionariosPerfisConfig(next);
    return normalized;
}

export async function removeFuncionarioPerfil(userId: string): Promise<boolean> {
    const normalizedUserId = toString(userId);
    if (!normalizedUserId) return false;

    const current = await getFuncionariosPerfisConfig();
    const next = current.filter((item) => item.userId !== normalizedUserId);
    if (next.length === current.length) return false;

    await saveFuncionariosPerfisConfig(next);
    return true;
}
