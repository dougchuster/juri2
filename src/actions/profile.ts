"use server";

import { Prisma, Role } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { upsertFuncionarioPerfil } from "@/lib/services/funcionarios-perfis-config";

const ownProfileSchema = z.object({
    nome: z.string().min(2, "Nome e obrigatorio"),
    email: z.string().email("E-mail invalido"),
    avatarUrl: z
        .string()
        .trim()
        .max(2048)
        .refine((val) => {
            if (!val) return true;
            if (val.startsWith("/uploads/")) return true;
            try {
                const u = new URL(val);
                return u.protocol === "http:" || u.protocol === "https:";
            } catch {
                return false;
            }
        }, "URL da foto invalida")
        .optional(),
    telefone: z.string().optional().or(z.literal("")),
    celular: z.string().optional().or(z.literal("")),
    whatsapp: z.string().optional().or(z.literal("")),
    endereco: z.string().optional().or(z.literal("")),
    numero: z.string().optional().or(z.literal("")),
    complemento: z.string().optional().or(z.literal("")),
    bairro: z.string().optional().or(z.literal("")),
    cidade: z.string().optional().or(z.literal("")),
    estado: z.string().optional().or(z.literal("")),
    cep: z.string().optional().or(z.literal("")),
    cpf: z.string().optional().or(z.literal("")),
    rg: z.string().optional().or(z.literal("")),
    dataNascimento: z.string().optional().or(z.literal("")),
    estadoCivil: z.string().optional().or(z.literal("")),
    nacionalidade: z.string().optional().or(z.literal("")),
    naturalidade: z.string().optional().or(z.literal("")),
    perfilProfissional: z.string().optional().or(z.literal("")),
    cargo: z.string().optional().or(z.literal("")),
    nivel: z.string().optional().or(z.literal("")),
    departamento: z.string().optional().or(z.literal("")),
    gestorDireto: z.string().optional().or(z.literal("")),
    unidade: z.string().optional().or(z.literal("")),
    matricula: z.string().optional().or(z.literal("")),
    dataAdmissao: z.string().optional().or(z.literal("")),
    dataDesligamento: z.string().optional().or(z.literal("")),
    regimeContratacao: z.string().optional().or(z.literal("")),
    turnoTrabalho: z.string().optional().or(z.literal("")),
    cargaHorariaSemanal: z.string().optional().or(z.literal("")),
    escolaridade: z.string().optional().or(z.literal("")),
    bio: z.string().optional().or(z.literal("")),
    linkedin: z.string().optional().or(z.literal("")),
    instagram: z.string().optional().or(z.literal("")),
    banco: z.string().optional().or(z.literal("")),
    agencia: z.string().optional().or(z.literal("")),
    conta: z.string().optional().or(z.literal("")),
    chavePix: z.string().optional().or(z.literal("")),
    contatoEmergenciaNome: z.string().optional().or(z.literal("")),
    contatoEmergenciaParentesco: z.string().optional().or(z.literal("")),
    contatoEmergenciaTelefone: z.string().optional().or(z.literal("")),
    pis: z.string().optional().or(z.literal("")),
    ctps: z.string().optional().or(z.literal("")),
    cnh: z.string().optional().or(z.literal("")),
    passaporte: z.string().optional().or(z.literal("")),
    idiomas: z.array(z.string()).default([]),
    hardSkills: z.array(z.string()).default([]),
    softSkills: z.array(z.string()).default([]),
    certificacoes: z.array(z.string()).default([]),
    tagsInternas: z.array(z.string()).default([]),
    observacoes: z.string().optional().or(z.literal("")),
    oab: z.string().optional().or(z.literal("")),
    seccional: z.string().optional().or(z.literal("")),
    especialidades: z.string().optional().or(z.literal("")),
});

function normalizeDateIso(value: string | undefined) {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
}

function parseListInput(values: string[]) {
    return values
        .map((item) => String(item || "").trim())
        .filter((item) => item.length > 0)
        .slice(0, 60);
}

function resolvePerfilProfissional(role: Role, perfilInformado?: string) {
    if (perfilInformado?.trim()) return perfilInformado.trim();
    if (role === Role.ADVOGADO) return "ADVOGADO";
    if (role === Role.FINANCEIRO) return "FINANCEIRO";
    return "ADMINISTRATIVO";
}

function resolveCargo(role: Role, cargoInformado?: string) {
    if (cargoInformado?.trim()) return cargoInformado.trim();
    if (role === Role.ADVOGADO) return "Advogado";
    if (role === Role.FINANCEIRO) return "Financeiro";
    if (role === Role.SOCIO) return "Socio";
    if (role === Role.ADMIN) return "Administrador";
    if (role === Role.CONTROLADOR) return "Controlador";
    if (role === Role.ASSISTENTE) return "Assistente";
    if (role === Role.SECRETARIA) return "Secretaria";
    return "Administrativo";
}

function resolveDepartamento(perfilProfissional: string, departamentoInformado?: string) {
    if (departamentoInformado?.trim()) return departamentoInformado.trim();
    if (perfilProfissional === "ADVOGADO") return "Advocacia";
    if (perfilProfissional === "FINANCEIRO") return "Financeiro";
    return "Administrativo";
}

export async function saveOwnProfileAction(data: z.infer<typeof ownProfileSchema>) {
    const session = await getSession();
    if (!session?.id) {
        return { success: false, error: { _form: ["Sessao expirada. Faça login novamente."] } };
    }

    const parsed = ownProfileSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const d = parsed.data;
        const email = d.email.trim().toLowerCase();
        const perfilProfissional = resolvePerfilProfissional(session.role as Role, d.perfilProfissional);
        const cargo = resolveCargo(session.role as Role, d.cargo);
        const departamento = resolveDepartamento(perfilProfissional, d.departamento);

        await db.$transaction(async (tx) => {
            const duplicate = await tx.user.findFirst({
                where: {
                    email,
                    id: { not: session.id },
                },
                select: { id: true },
            });

            if (duplicate) {
                throw new Error("Ja existe um usuario com este e-mail.");
            }

            await tx.user.update({
                where: { id: session.id },
                data: {
                    name: d.nome.trim(),
                    email,
                    avatarUrl: d.avatarUrl?.trim() || null,
                },
            });

            const advogado = await tx.advogado.findUnique({
                where: { userId: session.id },
                select: { id: true },
            });

            if (advogado) {
                await tx.advogado.update({
                    where: { id: advogado.id },
                    data: {
                        oab: d.oab?.trim() || "N/I",
                        seccional: (d.seccional?.trim() || "DF").toUpperCase(),
                        especialidades: d.especialidades?.trim() || null,
                    },
                });
            }
        });

        const perfil = await upsertFuncionarioPerfil({
            userId: session.id,
            perfilProfissional,
            telefone: d.telefone?.trim() || null,
            celular: d.celular?.trim() || null,
            whatsapp: d.whatsapp?.trim() || null,
            endereco: d.endereco?.trim() || null,
            numero: d.numero?.trim() || null,
            complemento: d.complemento?.trim() || null,
            bairro: d.bairro?.trim() || null,
            cidade: d.cidade?.trim() || null,
            estado: d.estado?.trim() || null,
            cep: d.cep?.trim() || null,
            cpf: d.cpf?.trim() || null,
            rg: d.rg?.trim() || null,
            dataNascimento: normalizeDateIso(d.dataNascimento),
            estadoCivil: d.estadoCivil?.trim() || null,
            nacionalidade: d.nacionalidade?.trim() || null,
            naturalidade: d.naturalidade?.trim() || null,
            cargo,
            nivel: d.nivel?.trim() || null,
            departamento,
            gestorDireto: d.gestorDireto?.trim() || null,
            unidade: d.unidade?.trim() || null,
            matricula: d.matricula?.trim() || null,
            dataAdmissao: normalizeDateIso(d.dataAdmissao),
            dataDesligamento: normalizeDateIso(d.dataDesligamento),
            regimeContratacao: d.regimeContratacao?.trim() || null,
            turnoTrabalho: d.turnoTrabalho?.trim() || null,
            cargaHorariaSemanal: d.cargaHorariaSemanal?.trim() || null,
            escolaridade: d.escolaridade?.trim() || null,
            bio: d.bio?.trim() || null,
            linkedin: d.linkedin?.trim() || null,
            instagram: d.instagram?.trim() || null,
            banco: d.banco?.trim() || null,
            agencia: d.agencia?.trim() || null,
            conta: d.conta?.trim() || null,
            chavePix: d.chavePix?.trim() || null,
            contatoEmergenciaNome: d.contatoEmergenciaNome?.trim() || null,
            contatoEmergenciaParentesco: d.contatoEmergenciaParentesco?.trim() || null,
            contatoEmergenciaTelefone: d.contatoEmergenciaTelefone?.trim() || null,
            pis: d.pis?.trim() || null,
            ctps: d.ctps?.trim() || null,
            cnh: d.cnh?.trim() || null,
            passaporte: d.passaporte?.trim() || null,
            idiomas: parseListInput(d.idiomas),
            hardSkills: parseListInput(d.hardSkills),
            softSkills: parseListInput(d.softSkills),
            certificacoes: parseListInput(d.certificacoes),
            tagsInternas: parseListInput(d.tagsInternas),
            observacoes: d.observacoes?.trim() || null,
        });

        try {
            await db.logAuditoria.create({
                data: {
                    userId: session.id,
                    acao: "MEU_PERFIL_ATUALIZADO",
                    entidade: "USUARIO",
                    entidadeId: session.id,
                    dadosAntes: Prisma.JsonNull,
                    dadosDepois: {
                        email,
                        avatarUrl: d.avatarUrl?.trim() || null,
                        perfilAtualizadoEm: perfil.updatedAt,
                    } as Prisma.InputJsonValue,
                },
            });
        } catch (error) {
            console.warn("[MeuPerfil] Falha ao registrar auditoria:", error);
        }

        revalidatePath("/perfil");
        revalidatePath("/dashboard");

        return { success: true, perfil };
    } catch (error) {
        if (error instanceof Error && error.message.includes("Ja existe um usuario")) {
            return { success: false, error: { email: [error.message] } };
        }

        console.error("Error saving own profile:", error);
        return { success: false, error: { _form: ["Erro ao salvar seu perfil."] } };
    }
}
