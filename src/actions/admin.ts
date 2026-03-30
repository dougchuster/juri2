"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Prisma, Role } from "@/generated/prisma";
import { getSession } from "@/actions/auth";
import { requirePermission } from "@/lib/rbac/check-permission";
import {
    type DistributionCandidate,
    type DistributionProcess,
    suggestAdvogadoForProcess,
} from "@/lib/services/distribution-engine";
import {
    DEFAULT_OPERACOES_CONFIG,
    getOperacoesConfig,
    saveOperacoesConfig,
} from "@/lib/services/operacoes-config";
import { getOperacoesJuridicasData } from "@/lib/dal/admin";
import {
    removeFuncionarioPerfil,
    upsertFuncionarioPerfil,
} from "@/lib/services/funcionarios-perfis-config";
import { sendEmail, wrapInEmailLayout } from "@/lib/integrations/email-service";

// ── Feriados ──
const feriadoSchema = z.object({
    nome: z.string().min(2, "Nome é obrigatório"),
    data: z.string().min(1, "Data é obrigatória"),
    abrangencia: z.string().default("NACIONAL"),
    recorrente: z.coerce.boolean().default(false),
    escritorioId: z.string().min(1),
});

export async function createFeriado(formData: z.infer<typeof feriadoSchema>) {
    const parsed = feriadoSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        if (!(await requireAdminOperationalSession())) {
            return { success: false, error: { _form: ["Nao autorizado."] } };
        }

        await db.feriado.create({
            data: {
                nome: parsed.data.nome,
                data: new Date(parsed.data.data),
                abrangencia: parsed.data.abrangencia,
                recorrente: parsed.data.recorrente,
                escritorioId: parsed.data.escritorioId,
            },
        });
        revalidatePath("/admin");
        return { success: true };
    } catch (error) {
        console.error("Error creating feriado:", error);
        return { success: false, error: { _form: ["Erro ao criar feriado."] } };
    }
}

export async function updateFeriado(id: string, formData: z.infer<typeof feriadoSchema>) {
    const parsed = feriadoSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        if (!(await requireAdminOperationalSession())) {
            return { success: false, error: { _form: ["Nao autorizado."] } };
        }

        await db.feriado.update({
            where: { id },
            data: {
                nome: parsed.data.nome,
                data: new Date(parsed.data.data),
                abrangencia: parsed.data.abrangencia,
                recorrente: parsed.data.recorrente,
                escritorioId: parsed.data.escritorioId,
            },
        });
        revalidatePath("/admin");
        return { success: true };
    } catch (error) {
        console.error("Error updating feriado:", error);
        return { success: false, error: { _form: ["Erro ao atualizar feriado."] } };
    }
}

export async function deleteFeriado(id: string) {
    try {
        if (!(await requireAdminOperationalSession())) {
            return { success: false, error: "Nao autorizado." };
        }

        await db.feriado.delete({ where: { id } });
        revalidatePath("/admin");
        return { success: true };
    } catch (error) {
        console.error("Error deleting feriado:", error);
        return { success: false, error: "Erro ao excluir feriado." };
    }
}

// ── Escritório ──
const escritorioSchema = z.object({
    nome: z.string().min(2),
    cnpj: z.string().optional().or(z.literal("")),
    telefone: z.string().optional().or(z.literal("")),
    email: z.string().optional().or(z.literal("")),
    endereco: z.string().optional().or(z.literal("")),
});

export async function updateEscritorio(id: string, formData: z.infer<typeof escritorioSchema>) {
    const parsed = escritorioSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        if (!(await requireAdminOperationalSession())) {
            return { success: false, error: { _form: ["Nao autorizado."] } };
        }

        const nome = parsed.data.nome.trim();
        const cnpj = parsed.data.cnpj?.trim() || null;
        const telefone = parsed.data.telefone?.trim() || null;
        const email = parsed.data.email?.trim() || null;
        const endereco = parsed.data.endereco?.trim() || null;

        await db.$transaction(async (tx) => {
            await tx.escritorio.update({
                where: { id },
                data: {
                    nome,
                    cnpj,
                    telefone,
                    email,
                    endereco,
                },
            });

            await tx.appSetting.upsert({
                where: { key: "escritorio_nome" },
                update: { value: nome },
                create: { key: "escritorio_nome", value: nome },
            });

            if (cnpj) {
                await tx.appSetting.upsert({
                    where: { key: "escritorio_cnpj" },
                    update: { value: cnpj },
                    create: { key: "escritorio_cnpj", value: cnpj },
                });
            }

            if (telefone) {
                await tx.appSetting.upsert({
                    where: { key: "escritorio_telefone" },
                    update: { value: telefone },
                    create: { key: "escritorio_telefone", value: telefone },
                });
            }

            if (email) {
                await tx.appSetting.upsert({
                    where: { key: "escritorio_email" },
                    update: { value: email },
                    create: { key: "escritorio_email", value: email },
                });
            }
        });
        revalidatePath("/admin");
        return { success: true };
    } catch (error) {
        console.error("Error updating escritorio:", error);
        return { success: false, error: { _form: ["Erro ao atualizar escritório."] } };
    }
}

// ── Gestão de Usuários ──
export async function toggleUserActive(userId: string) {
    try {
        if (!(await requireAdminUserActionSession())) {
            return { success: false, error: "Nao autorizado." };
        }

        const user = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, isActive: true },
        });
        if (!user) return { success: false, error: "Usuario nao encontrado." };

        const nextActive = !user.isActive;
        await db.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { isActive: nextActive },
            });
            await tx.advogado.updateMany({
                where: { userId },
                data: { ativo: nextActive },
            });
        });

        revalidatePath("/admin");
        revalidatePath("/admin/equipe-juridica");
        return { success: true };
    } catch (error) {
        console.error("Error toggling user:", error);
        return { success: false, error: "Erro ao atualizar usuario." };
    }
}

const manualResetPasswordSchema = z.object({
    userId: z.string().min(1),
    newPassword: z.string().min(8, "A nova senha deve ter pelo menos 8 caracteres."),
});

const adminUserActionSchema = z.object({
    userId: z.string().min(1),
});

const deleteUserSchema = z.object({
    userId: z.string().min(1),
    transferToUserId: z.string().min(1, "Selecione quem recebera os vinculos operacionais."),
});

function buildTemporaryPassword(length = 12) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    const bytes = crypto.randomBytes(length);
    let password = "";

    for (let index = 0; index < length; index += 1) {
        password += alphabet[bytes[index] % alphabet.length];
    }

    return password;
}

async function requireAdminUserActionSession() {
    const session = await getSession();
    if (!session?.id) {
        return null;
    }

    const permission = await requirePermission("admin:equipe:editar", {
        fallbackRoles: ["ADMIN", "SOCIO"],
        errorMessage: "Nao autorizado.",
    });
    if ("error" in permission) {
        return null;
    }

    return session;
}

async function requireAdminOperationalSession() {
    const session = await getSession();
    if (!session?.id) {
        return null;
    }

    const permission = await requirePermission("admin:operacoes:editar", {
        fallbackRoles: ["ADMIN", "SOCIO"],
        errorMessage: "Nao autorizado.",
    });
    if ("error" in permission) {
        return null;
    }

    return session;
}

async function getManagedUser(userId: string) {
    return db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            advogado: {
                select: {
                    id: true,
                    oab: true,
                    seccional: true,
                },
            },
        },
    });
}

async function assertDeleteUserAllowed(userId: string, actorUserId: string) {
    const user = await getManagedUser(userId);
    if (!user) return { ok: false as const, error: "Usuario nao encontrado." };
    if (user.id === actorUserId) {
        return { ok: false as const, error: "Voce nao pode excluir a propria conta." };
    }

    if (user.role === "ADMIN") {
        const totalAdmins = await db.user.count({ where: { role: "ADMIN", isActive: true } });
        if (totalAdmins <= 1) {
            return { ok: false as const, error: "Nao e permitido excluir o ultimo administrador ativo." };
        }
    }

    return { ok: true as const, user };
}

async function getDeleteTransferTarget(userId: string) {
    return db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            advogado: {
                select: {
                    id: true,
                    oab: true,
                    seccional: true,
                },
            },
        },
    });
}

async function assertDeleteTransferTarget(
    sourceUser: Awaited<ReturnType<typeof getManagedUser>>,
    transferToUserId: string
) {
    if (!sourceUser) {
        return { ok: false as const, error: "Usuario nao encontrado." };
    }

    if (sourceUser.id === transferToUserId) {
        return { ok: false as const, error: "Selecione outro usuario para assumir os vinculos." };
    }

    const targetUser = await getDeleteTransferTarget(transferToUserId);
    if (!targetUser) {
        return { ok: false as const, error: "Usuario de destino nao encontrado." };
    }

    if (!targetUser.isActive) {
        return { ok: false as const, error: "O usuario de destino precisa estar ativo." };
    }

    if (sourceUser.advogado && !targetUser.advogado) {
        return {
            ok: false as const,
            error: "Para excluir este usuario, selecione outro advogado ativo para receber os vinculos juridicos.",
        };
    }

    return { ok: true as const, targetUser };
}

async function transferTeamMemberships(
    tx: Prisma.TransactionClient,
    sourceAdvogadoId: string,
    targetAdvogadoId: string
) {
    const memberships = await tx.timeMembro.findMany({
        where: { advogadoId: sourceAdvogadoId },
        select: { timeId: true, lider: true },
    });

    for (const membership of memberships) {
        const existingMembership = await tx.timeMembro.findUnique({
            where: {
                timeId_advogadoId: {
                    timeId: membership.timeId,
                    advogadoId: targetAdvogadoId,
                },
            },
            select: { id: true, lider: true },
        });

        if (!existingMembership) {
            await tx.timeMembro.create({
                data: {
                    timeId: membership.timeId,
                    advogadoId: targetAdvogadoId,
                    lider: membership.lider,
                },
            });
            continue;
        }

        if (membership.lider && !existingMembership.lider) {
            await tx.timeMembro.update({
                where: { id: existingMembership.id },
                data: { lider: true },
            });
        }
    }

    await tx.timeMembro.deleteMany({
        where: { advogadoId: sourceAdvogadoId },
    });
}

async function transferAgendamentoObservers(
    tx: Prisma.TransactionClient,
    sourceUserId: string,
    targetUserId: string
) {
    const sourceObservers = await tx.agendamentoObservador.findMany({
        where: { userId: sourceUserId },
        select: { id: true, agendamentoId: true, adicionadoPorId: true },
    });

    for (const observer of sourceObservers) {
        const existingObserver = await tx.agendamentoObservador.findUnique({
            where: {
                agendamentoId_userId: {
                    agendamentoId: observer.agendamentoId,
                    userId: targetUserId,
                },
            },
            select: { id: true },
        });

        if (existingObserver) {
            await tx.agendamentoObservador.delete({
                where: { id: observer.id },
            });
            continue;
        }

        await tx.agendamentoObservador.update({
            where: { id: observer.id },
            data: { userId: targetUserId },
        });
    }

    await tx.agendamentoObservador.updateMany({
        where: { adicionadoPorId: sourceUserId },
        data: { adicionadoPorId: targetUserId },
    });
}

async function transferDeleteUserRelations(
    tx: Prisma.TransactionClient,
    input: {
        sourceUserId: string;
        targetUserId: string;
        sourceAdvogadoId: string | null;
        targetAdvogadoId: string | null;
    }
) {
    await tx.conversation.updateMany({
        where: { assignedToId: input.sourceUserId },
        data: { assignedToId: input.targetUserId },
    });

    await tx.internalChatConversation.updateMany({
        where: { createdById: input.sourceUserId },
        data: { createdById: input.targetUserId },
    });

    await tx.internalChatMessage.updateMany({
        where: { senderId: input.sourceUserId },
        data: { senderId: input.targetUserId },
    });

    await tx.processoAtribuicaoLog.updateMany({
        where: { triggeredByUserId: input.sourceUserId },
        data: { triggeredByUserId: input.targetUserId },
    });

    await tx.financeiroEscritorioLancamento.updateMany({
        where: { criadoPorId: input.sourceUserId },
        data: { criadoPorId: input.targetUserId },
    });

    await tx.casoFinanceiro.updateMany({
        where: { criadoPorId: input.sourceUserId },
        data: { criadoPorId: input.targetUserId },
    });

    await tx.repasseHonorario.updateMany({
        where: { funcionarioId: input.sourceUserId },
        data: { funcionarioId: input.targetUserId },
    });

    await tx.repasseHonorario.updateMany({
        where: { aprovadoPorId: input.sourceUserId },
        data: { aprovadoPorId: input.targetUserId },
    });

    await tx.cRMCard.updateMany({
        where: { ownerId: input.sourceUserId },
        data: { ownerId: input.targetUserId },
    });

    await tx.cRMActivity.updateMany({
        where: { ownerId: input.sourceUserId },
        data: { ownerId: input.targetUserId },
    });

    await tx.lgpdRequest.updateMany({
        where: { assignedToId: input.sourceUserId },
        data: { assignedToId: input.targetUserId },
    });

    await tx.logAuditoria.updateMany({
        where: { userId: input.sourceUserId },
        data: { userId: input.targetUserId },
    });

    await tx.agendamento.updateMany({
        where: { criadoPorId: input.sourceUserId },
        data: { criadoPorId: input.targetUserId },
    });

    await tx.agendamento.updateMany({
        where: { conferidoPorId: input.sourceUserId },
        data: { conferidoPorId: input.targetUserId },
    });

    await tx.agendamento.updateMany({
        where: { concluidoPorId: input.sourceUserId },
        data: { concluidoPorId: input.targetUserId },
    });

    await tx.agendamento.updateMany({
        where: { canceladoPorId: input.sourceUserId },
        data: { canceladoPorId: input.targetUserId },
    });

    await tx.agendamento.updateMany({
        where: { visualizadoPorId: input.sourceUserId },
        data: { visualizadoPorId: input.targetUserId },
    });

    await tx.agendamento.updateMany({
        where: { revisadoPor: input.sourceUserId },
        data: { revisadoPor: input.targetUserId },
    });

    await transferAgendamentoObservers(tx, input.sourceUserId, input.targetUserId);

    await tx.agendamentoComentario.updateMany({
        where: { userId: input.sourceUserId },
        data: { userId: input.targetUserId },
    });

    await tx.agendamentoHistorico.updateMany({
        where: { userId: input.sourceUserId },
        data: { userId: input.targetUserId },
    });

    await tx.agendamentoRecorrencia.updateMany({
        where: { criadoPorId: input.sourceUserId },
        data: { criadoPorId: input.targetUserId },
    });

    await tx.calendarIntegration.deleteMany({
        where: { userId: input.sourceUserId },
    });

    if (!input.sourceAdvogadoId || !input.targetAdvogadoId) {
        return;
    }

    await tx.processo.updateMany({
        where: { advogadoId: input.sourceAdvogadoId },
        data: { advogadoId: input.targetAdvogadoId },
    });

    await tx.prazo.updateMany({
        where: { advogadoId: input.sourceAdvogadoId },
        data: { advogadoId: input.targetAdvogadoId },
    });

    await tx.audiencia.updateMany({
        where: { advogadoId: input.sourceAdvogadoId },
        data: { advogadoId: input.targetAdvogadoId },
    });

    await tx.compromisso.updateMany({
        where: { advogadoId: input.sourceAdvogadoId },
        data: { advogadoId: input.targetAdvogadoId },
    });

    await tx.tarefa.updateMany({
        where: { advogadoId: input.sourceAdvogadoId },
        data: { advogadoId: input.targetAdvogadoId },
    });

    await tx.atendimento.updateMany({
        where: { advogadoId: input.sourceAdvogadoId },
        data: { advogadoId: input.targetAdvogadoId },
    });

    await tx.comissao.updateMany({
        where: { advogadoId: input.sourceAdvogadoId },
        data: { advogadoId: input.targetAdvogadoId },
    });

    await tx.publicacao.updateMany({
        where: { advogadoId: input.sourceAdvogadoId },
        data: { advogadoId: input.targetAdvogadoId },
    });

    await tx.distribuicao.updateMany({
        where: { advogadoId: input.sourceAdvogadoId },
        data: { advogadoId: input.targetAdvogadoId },
    });

    await tx.automacaoJob.updateMany({
        where: { advogadoId: input.sourceAdvogadoId },
        data: { advogadoId: input.targetAdvogadoId },
    });

    await tx.processoAtribuicaoLog.updateMany({
        where: { fromAdvogadoId: input.sourceAdvogadoId },
        data: { fromAdvogadoId: input.targetAdvogadoId },
    });

    await tx.processoAtribuicaoLog.updateMany({
        where: { toAdvogadoId: input.sourceAdvogadoId },
        data: { toAdvogadoId: input.targetAdvogadoId },
    });

    await tx.cRMCard.updateMany({
        where: { responsavelAdvogadoId: input.sourceAdvogadoId },
        data: { responsavelAdvogadoId: input.targetAdvogadoId },
    });

    await tx.casoParticipante.updateMany({
        where: { advogadoId: input.sourceAdvogadoId },
        data: { advogadoId: input.targetAdvogadoId },
    });

    await tx.repasseHonorario.updateMany({
        where: { advogadoId: input.sourceAdvogadoId },
        data: { advogadoId: input.targetAdvogadoId },
    });

    await tx.agendamento.updateMany({
        where: { responsavelId: input.sourceAdvogadoId },
        data: { responsavelId: input.targetAdvogadoId },
    });

    await transferTeamMemberships(tx, input.sourceAdvogadoId, input.targetAdvogadoId);
}

function revalidateAdminUserPaths() {
    revalidatePath("/admin");
    revalidatePath("/admin/equipe-juridica");
}

export async function resetUserPassword(data: z.infer<typeof manualResetPasswordSchema>) {
    const parsed = manualResetPasswordSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    const session = await requireAdminUserActionSession();
    if (!session) {
        return { success: false, error: "Nao autorizado." };
    }

    const user = await getManagedUser(parsed.data.userId);
    if (!user) {
        return { success: false, error: "Usuario nao encontrado." };
    }

    try {
        const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);

        await db.$transaction(async (tx) => {
            const revokedSessions = await tx.session.deleteMany({
                where: { userId: user.id },
            });

            await tx.user.update({
                where: { id: user.id },
                data: { passwordHash },
            });

            await tx.logAuditoria.create({
                data: {
                    userId: session.id,
                    acao: "USUARIO_SENHA_REDEFINIDA",
                    entidade: "USUARIOS",
                    entidadeId: user.id,
                    dadosAntes: {
                        email: user.email,
                        role: user.role,
                    } as Prisma.InputJsonValue,
                    dadosDepois: {
                        sessoesRevogadas: revokedSessions.count,
                        redefinidaManualmente: true,
                    } as Prisma.InputJsonValue,
                },
            });
        });

        revalidateAdminUserPaths();
        return { success: true };
    } catch (error) {
        console.error("Error resetting user password:", error);
        return { success: false, error: "Erro ao redefinir a senha do usuario." };
    }
}

export async function generateAndSendTemporaryPassword(data: z.infer<typeof adminUserActionSchema>) {
    const parsed = adminUserActionSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    const session = await requireAdminUserActionSession();
    if (!session) {
        return { success: false, error: "Nao autorizado." };
    }

    const user = await getManagedUser(parsed.data.userId);
    if (!user) {
        return { success: false, error: "Usuario nao encontrado." };
    }

    const temporaryPassword = buildTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    try {
        await db.$transaction(async (tx) => {
            const revokedSessions = await tx.session.deleteMany({
                where: { userId: user.id },
            });

            await tx.user.update({
                where: { id: user.id },
                data: { passwordHash },
            });

            await tx.logAuditoria.create({
                data: {
                    userId: session.id,
                    acao: "USUARIO_SENHA_TEMPORARIA_GERADA",
                    entidade: "USUARIOS",
                    entidadeId: user.id,
                    dadosAntes: {
                        email: user.email,
                        role: user.role,
                    } as Prisma.InputJsonValue,
                    dadosDepois: {
                        emailEnviado: false,
                        sessoesRevogadas: revokedSessions.count,
                    } as Prisma.InputJsonValue,
                },
            });
        });

        const escritorio = await db.escritorio.findFirst({
            orderBy: { createdAt: "asc" },
            select: { nome: true },
        });

        const html = wrapInEmailLayout(
            `
                <p>Ola <strong>${user.name || user.email}</strong>,</p>
                <p>Uma nova senha temporaria foi gerada para o seu acesso ao sistema administrativo.</p>
                <p><strong>Senha temporaria:</strong> ${temporaryPassword}</p>
                <p>Por seguranca, recomendamos alterar a senha apos o proximo login.</p>
            `,
            escritorio?.nome
        );

        const delivery = await sendEmail({
            to: user.email,
            subject: "Nova senha temporaria de acesso",
            html,
        });

        if (!delivery.ok) {
            revalidateAdminUserPaths();
            return {
                success: true,
                emailSent: false,
                tempPassword: temporaryPassword,
                error: delivery.error || "Falha ao enviar o e-mail.",
            };
        }

        await db.logAuditoria.create({
            data: {
                userId: session.id,
                acao: "USUARIO_SENHA_TEMPORARIA_ENVIADA",
                entidade: "USUARIOS",
                entidadeId: user.id,
                dadosAntes: {
                    email: user.email,
                } as Prisma.InputJsonValue,
                dadosDepois: {
                    emailSent: true,
                    destinatario: user.email,
                } as Prisma.InputJsonValue,
            },
        });

        revalidateAdminUserPaths();
        return { success: true, emailSent: true };
    } catch (error) {
        console.error("Error generating temporary password:", error);
        return { success: false, error: "Erro ao gerar a senha temporaria." };
    }
}

export async function deleteUser(data: z.infer<typeof deleteUserSchema>) {
    const parsed = deleteUserSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    const session = await requireAdminUserActionSession();
    if (!session) {
        return { success: false, error: "Nao autorizado." };
    }

    const allowed = await assertDeleteUserAllowed(parsed.data.userId, session.id);
    if (!allowed.ok) {
        return { success: false, error: allowed.error };
    }

    const transferTarget = await assertDeleteTransferTarget(allowed.user, parsed.data.transferToUserId);
    if (!transferTarget.ok) {
        return { success: false, error: transferTarget.error };
    }

    try {
        await db.$transaction(async (tx) => {
            await transferDeleteUserRelations(tx, {
                sourceUserId: allowed.user.id,
                targetUserId: transferTarget.targetUser.id,
                sourceAdvogadoId: allowed.user.advogado?.id ?? null,
                targetAdvogadoId: transferTarget.targetUser.advogado?.id ?? null,
            });

            if (allowed.user.advogado?.id) {
                await tx.advogado.delete({
                    where: { id: allowed.user.advogado.id },
                });
            }

            await tx.session.deleteMany({
                where: { userId: allowed.user.id },
            });

            await tx.logAuditoria.create({
                data: {
                    userId: session.id,
                    acao: "USUARIO_EXCLUIDO",
                    entidade: "USUARIOS",
                    entidadeId: allowed.user.id,
                    dadosAntes: {
                        nome: allowed.user.name,
                        email: allowed.user.email,
                        role: allowed.user.role,
                        isActive: allowed.user.isActive,
                        advogado: allowed.user.advogado
                            ? {
                                  oab: allowed.user.advogado.oab,
                                  seccional: allowed.user.advogado.seccional,
                              }
                            : null,
                    } as Prisma.InputJsonValue,
                    dadosDepois: {
                        removido: true,
                        transferidoPara: {
                            userId: transferTarget.targetUser.id,
                            nome: transferTarget.targetUser.name,
                            email: transferTarget.targetUser.email,
                            advogado: transferTarget.targetUser.advogado
                                ? {
                                      oab: transferTarget.targetUser.advogado.oab,
                                      seccional: transferTarget.targetUser.advogado.seccional,
                                  }
                                : null,
                        },
                    } as Prisma.InputJsonValue,
                },
            });

            await tx.user.delete({
                where: { id: allowed.user.id },
            });
        });

        await removeFuncionarioPerfil(allowed.user.id);
        revalidateAdminUserPaths();
        return { success: true };
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            (error.code === "P2003" || error.code === "P2014")
        ) {
            return {
                success: false,
                error: "Ainda existem vinculos que nao puderam ser transferidos automaticamente. Revise o usuario de destino e tente novamente.",
            };
        }

        console.error("Error deleting user:", error);
        return { success: false, error: "Erro ao excluir usuario." };
    }
}
// -- Equipe Juridica --
const createAdvogadoSchema = z.object({
    nome: z.string().min(2, "Nome e obrigatorio"),
    email: z.string().email("E-mail invalido"),
    senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    oab: z.string().min(3, "OAB e obrigatoria"),
    seccional: z.string().min(2, "UF da OAB e obrigatoria").max(4),
    especialidades: z.string().optional().or(z.literal("")),
    comissaoPercent: z.coerce.number().min(0).max(100).default(0),
});

const createFuncionarioSchema = z.object({
    nome: z.string().min(2, "Nome e obrigatorio"),
    email: z.string().email("E-mail invalido"),
    senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    role: z.nativeEnum(Role),
    perfilProfissional: z.string().optional().or(z.literal("")),
    cargo: z.string().optional().or(z.literal("")),
    nivel: z.string().optional().or(z.literal("")),
    criarAdvogado: z.coerce.boolean().default(false),
    oab: z.string().optional().or(z.literal("")),
    seccional: z.string().optional().or(z.literal("")),
    especialidades: z.string().optional().or(z.literal("")),
    comissaoPercent: z.coerce.number().min(0).max(100).default(0),
});

const updateAdvogadoSchema = z.object({
    advogadoId: z.string().min(1),
    nome: z.string().min(2, "Nome e obrigatorio"),
    email: z.string().email("E-mail invalido"),
    oab: z.string().min(3, "OAB e obrigatoria"),
    seccional: z.string().min(2, "UF da OAB e obrigatoria").max(4),
    especialidades: z.string().optional().or(z.literal("")),
    comissaoPercent: z.coerce.number().min(0).max(100).default(0),
});

const createEquipeSchema = z.object({
    nome: z.string().min(2, "Nome da equipe e obrigatorio"),
    descricao: z.string().optional().or(z.literal("")),
    cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#2563EB"),
});

const vincularMembroSchema = z.object({
    timeId: z.string().min(1),
    advogadoId: z.string().min(1),
    lider: z.coerce.boolean().default(false),
});

const funcionarioPerfilSchema = z.object({
    userId: z.string().min(1),
    nome: z.string().min(2, "Nome e obrigatorio"),
    email: z.string().email("E-mail invalido"),
    role: z.nativeEnum(Role),
    avatarUrl: z
        .string()
        .trim()
        .max(2048)
        .refine((val) => {
            if (!val) return true;
            // Uploaded avatars are stored under /public/uploads (served as /uploads/...)
            if (val.startsWith("/uploads/")) return true;
            try {
                const u = new URL(val);
                return u.protocol === "http:" || u.protocol === "https:";
            } catch {
                return false;
            }
        }, "URL da foto inválida")
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
    comissaoPercent: z.coerce.number().min(0).max(100).optional(),
});

function normalizeUniqueError(error: unknown, fallback: string) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return fallback;
    }
    return null;
}

function revalidateEquipeJuridicaPaths() {
    revalidatePath("/admin");
    revalidatePath("/admin/equipe-juridica");
    revalidatePath("/processos");
}

function parseListInput(values: string[]) {
    return values
        .map((item) => String(item || "").trim())
        .filter((item) => item.length > 0)
        .slice(0, 60);
}

function normalizeDateIso(value: string | undefined) {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
}

export async function createAdvogadoConta(data: z.infer<typeof createAdvogadoSchema>) {
    const parsed = createAdvogadoSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    const session = await getSession();
    if (!session?.id || !["ADMIN", "SOCIO"].includes(String(session.role))) {
        return { success: false, error: "Nao autorizado." };
    }

    try {
        const d = parsed.data;
        const email = d.email.trim().toLowerCase();
        const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
        if (existing) {
            return {
                success: false,
                error: { email: ["Ja existe um usuario com este e-mail."] },
            };
        }

        const passwordHash = await bcrypt.hash(d.senha, 10);

        await db.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name: d.nome.trim(),
                    email,
                    passwordHash,
                    role: Role.ADVOGADO,
                    isActive: true,
                    escritorioId: session.escritorioId ?? null,
                },
            });

            await tx.advogado.create({
                data: {
                    userId: user.id,
                    oab: d.oab.trim(),
                    seccional: d.seccional.trim().toUpperCase(),
                    especialidades: d.especialidades?.trim() || null,
                    comissaoPercent: d.comissaoPercent,
                    ativo: true,
                },
            });
        });

        revalidateEquipeJuridicaPaths();
        return { success: true };
    } catch (error) {
        const uniqueError = normalizeUniqueError(error, "Ja existe advogado com esta OAB.");
        if (uniqueError) {
            return { success: false, error: { _form: [uniqueError] } };
        }
        console.error("Error creating advogado account:", error);
        return { success: false, error: { _form: ["Erro ao criar conta de advogado."] } };
    }
}

export async function createFuncionarioConta(data: z.infer<typeof createFuncionarioSchema>) {
    const parsed = createFuncionarioSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    const session = await getSession();
    if (!session?.id || !["ADMIN", "SOCIO"].includes(String(session.role))) {
        return { success: false, error: "Nao autorizado." };
    }

    try {
        const d = parsed.data;
        const email = d.email.trim().toLowerCase();
        const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
        if (existing) {
            return {
                success: false,
                error: { email: ["Ja existe um usuario com este e-mail."] },
            };
        }

        const passwordHash = await bcrypt.hash(d.senha, 10);
        const created = await db.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name: d.nome.trim(),
                    email,
                    passwordHash,
                    role: d.role,
                    isActive: true,
                    escritorioId: session.escritorioId ?? null,
                },
                select: { id: true },
            });

            const shouldCreateAdvogado = Boolean(d.criarAdvogado) || (d.cargo || "").toLowerCase().includes("adv");
            const oab = (d.oab || "").trim();
            const seccional = (d.seccional || "").trim().toUpperCase();

            if (shouldCreateAdvogado) {
                if (!oab || oab.length < 3) {
                    throw new Error("Informe uma OAB valida para criar o perfil de advogado.");
                }
                if (!seccional || seccional.length < 2) {
                    throw new Error("Informe a UF (seccional) da OAB.");
                }

                await tx.advogado.create({
                    data: {
                        userId: user.id,
                        oab,
                        seccional,
                        especialidades: d.especialidades?.trim() || null,
                        comissaoPercent: typeof d.comissaoPercent === "number" ? d.comissaoPercent : 0,
                        ativo: true,
                    },
                });
            }

            return user;
        });

        await upsertFuncionarioPerfil({
            userId: created.id,
            perfilProfissional: d.perfilProfissional?.trim() || null,
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
            cargo: d.cargo?.trim() || null,
            nivel: d.nivel?.trim() || null,
            departamento: null,
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
        });

        revalidateEquipeJuridicaPaths();
        return { success: true, userId: created.id };
    } catch (error) {
        const normalized = normalizeUniqueError(error, "E-mail ja cadastrado.");
        if (normalized) return { success: false, error: normalized };
        const msg = error instanceof Error ? error.message : null;
        console.error("Error creating funcionario:", error);
        return { success: false, error: msg || "Erro ao criar funcionario." };
    }
}

export async function updateAdvogadoConta(data: z.infer<typeof updateAdvogadoSchema>) {
    const parsed = updateAdvogadoSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const d = parsed.data;
        const email = d.email.trim().toLowerCase();

        await db.$transaction(async (tx) => {
            const advogado = await tx.advogado.findUnique({
                where: { id: d.advogadoId },
                select: { userId: true },
            });

            if (!advogado) throw new Error("Advogado nao encontrado");

            const duplicateUser = await tx.user.findFirst({
                where: {
                    email,
                    id: { not: advogado.userId },
                },
                select: { id: true },
            });
            if (duplicateUser) throw new Error("Ja existe um usuario com este e-mail");

            await tx.user.update({
                where: { id: advogado.userId },
                data: {
                    name: d.nome.trim(),
                    email,
                    role: Role.ADVOGADO,
                },
            });

            await tx.advogado.update({
                where: { id: d.advogadoId },
                data: {
                    oab: d.oab.trim(),
                    seccional: d.seccional.trim().toUpperCase(),
                    especialidades: d.especialidades?.trim() || null,
                    comissaoPercent: d.comissaoPercent,
                },
            });
        });

        revalidateEquipeJuridicaPaths();
        return { success: true };
    } catch (error) {
        if (error instanceof Error && error.message.includes("Ja existe um usuario")) {
            return { success: false, error: { email: [error.message] } };
        }
        const uniqueError = normalizeUniqueError(error, "Ja existe advogado com esta OAB.");
        if (uniqueError) return { success: false, error: { _form: [uniqueError] } };
        console.error("Error updating advogado:", error);
        return { success: false, error: { _form: ["Erro ao atualizar advogado."] } };
    }
}

export async function salvarPerfilFuncionarioCompleto(
    data: z.infer<typeof funcionarioPerfilSchema>
) {
    const parsed = funcionarioPerfilSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const d = parsed.data;
        const session = await getSession();
        const resolvedPerfilProfissional =
            d.perfilProfissional?.trim() ||
            (d.role === Role.ADVOGADO
                ? "ADVOGADO"
                : d.role === Role.FINANCEIRO
                  ? "FINANCEIRO"
                  : "ADMINISTRATIVO");
        const resolvedCargo =
            d.cargo?.trim() ||
            (d.role === Role.ADVOGADO
                ? "Advogado"
                : d.role === Role.FINANCEIRO
                  ? "Financeiro"
                  : d.role === Role.SOCIO
                    ? "Socio"
                    : d.role === Role.ADMIN
                      ? "Administrador"
                      : d.role === Role.CONTROLADOR
                        ? "Controlador"
                        : d.role === Role.ASSISTENTE
                          ? "Assistente"
                          : d.role === Role.SECRETARIA
                            ? "Secretaria"
                            : "Administrativo");
        const resolvedDepartamento =
            d.departamento?.trim() ||
            (resolvedPerfilProfissional === "ADVOGADO"
                ? "Advocacia"
                : resolvedPerfilProfissional === "FINANCEIRO"
                  ? "Financeiro"
                  : "Administrativo");

        await db.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: d.userId },
                select: { id: true, email: true },
            });
            if (!user) throw new Error("Funcionario nao encontrado.");

            const normalizedEmail = d.email.trim().toLowerCase();
            const duplicate = await tx.user.findFirst({
                where: {
                    email: normalizedEmail,
                    id: { not: d.userId },
                },
                select: { id: true },
            });
            if (duplicate) {
                throw new Error("Ja existe um usuario com este e-mail.");
            }

            await tx.user.update({
                where: { id: d.userId },
                data: {
                    name: d.nome.trim(),
                    email: normalizedEmail,
                    role: d.role,
                    avatarUrl: d.avatarUrl?.trim() || null,
                },
            });

            const advogado = await tx.advogado.findUnique({
                where: { userId: d.userId },
                select: { id: true },
            });

            if (advogado) {
                await tx.advogado.update({
                    where: { id: advogado.id },
                    data: {
                        oab: d.oab?.trim() || "N/I",
                        seccional: (d.seccional?.trim() || "DF").toUpperCase(),
                        especialidades: d.especialidades?.trim() || null,
                        comissaoPercent:
                            typeof d.comissaoPercent === "number" ? d.comissaoPercent : undefined,
                    },
                });
            }
        });

        const perfil = await upsertFuncionarioPerfil({
            userId: d.userId,
            perfilProfissional: resolvedPerfilProfissional,
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
            cargo: resolvedCargo,
            nivel: d.nivel?.trim() || null,
            departamento: resolvedDepartamento,
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

        if (session?.id) {
            try {
                await db.logAuditoria.create({
                    data: {
                        userId: session.id,
                        acao: "FUNCIONARIO_PERFIL_ATUALIZADO",
                        entidade: "FUNCIONARIOS",
                        entidadeId: d.userId,
                        dadosAntes: Prisma.JsonNull,
                        dadosDepois: {
                            role: d.role,
                            avatarUrl: d.avatarUrl?.trim() || null,
                            perfilAtualizadoEm: perfil.updatedAt,
                        } as Prisma.InputJsonValue,
                    },
                });
            } catch (error) {
                console.warn("[FuncionarioPerfil] Falha ao registrar auditoria:", error);
            }
        }

        revalidateEquipeJuridicaPaths();
        return { success: true, perfil };
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("Ja existe um usuario")) {
                return { success: false, error: { email: [error.message] } };
            }
            if (error.message.includes("nao encontrado")) {
                return { success: false, error: { _form: [error.message] } };
            }
        }
        console.error("Error updating funcionario profile:", error);
        return { success: false, error: { _form: ["Erro ao salvar perfil do funcionario."] } };
    }
}

export async function toggleAdvogadoAtivo(advogadoId: string) {
    try {
        const advogado = await db.advogado.findUnique({
            where: { id: advogadoId },
            select: { id: true, ativo: true, userId: true },
        });

        if (!advogado) return { success: false, error: "Advogado nao encontrado." };

        const nextActive = !advogado.ativo;

        await db.$transaction(async (tx) => {
            await tx.advogado.update({
                where: { id: advogado.id },
                data: { ativo: nextActive },
            });
            await tx.user.update({
                where: { id: advogado.userId },
                data: { isActive: nextActive, role: Role.ADVOGADO },
            });
        });

        revalidateEquipeJuridicaPaths();
        return { success: true };
    } catch (error) {
        console.error("Error toggling advogado active state:", error);
        return { success: false, error: "Erro ao alterar status do advogado." };
    }
}

export async function createEquipeJuridica(data: z.infer<typeof createEquipeSchema>) {
    const parsed = createEquipeSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const d = parsed.data;
        await db.time.create({
            data: {
                nome: d.nome.trim(),
                descricao: d.descricao?.trim() || null,
                cor: d.cor,
                ativo: true,
            },
        });
        revalidateEquipeJuridicaPaths();
        return { success: true };
    } catch (error) {
        const uniqueError = normalizeUniqueError(error, "Ja existe equipe com este nome.");
        if (uniqueError) return { success: false, error: { nome: [uniqueError] } };
        console.error("Error creating legal team:", error);
        return { success: false, error: { _form: ["Erro ao criar equipe juridica."] } };
    }
}

export async function vincularAdvogadoNaEquipe(data: z.infer<typeof vincularMembroSchema>) {
    const parsed = vincularMembroSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const d = parsed.data;
        await db.$transaction(async (tx) => {
            if (d.lider) {
                await tx.timeMembro.updateMany({
                    where: { timeId: d.timeId },
                    data: { lider: false },
                });
            }
            await tx.timeMembro.upsert({
                where: {
                    timeId_advogadoId: {
                        timeId: d.timeId,
                        advogadoId: d.advogadoId,
                    },
                },
                update: { lider: d.lider },
                create: {
                    timeId: d.timeId,
                    advogadoId: d.advogadoId,
                    lider: d.lider,
                },
            });
        });

        revalidateEquipeJuridicaPaths();
        return { success: true };
    } catch (error) {
        console.error("Error linking lawyer to team:", error);
        return { success: false, error: { _form: ["Erro ao vincular advogado na equipe."] } };
    }
}

export async function removerAdvogadoDaEquipe(timeId: string, advogadoId: string) {
    if (!timeId || !advogadoId) {
        return { success: false, error: "Dados invalidos para remocao." };
    }

    try {
        await db.timeMembro.deleteMany({
            where: { timeId, advogadoId },
        });
        revalidateEquipeJuridicaPaths();
        return { success: true };
    } catch (error) {
        console.error("Error removing lawyer from team:", error);
        return { success: false, error: "Erro ao remover advogado da equipe." };
    }
}

const atribuirProcessoSchema = z.object({
    processoId: z.string().min(1),
    advogadoId: z.string().min(1),
});

export async function atribuirProcessoParaAdvogado(data: z.infer<typeof atribuirProcessoSchema>) {
    const parsed = atribuirProcessoSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const d = parsed.data;
        const [processo, advogado] = await Promise.all([
            db.processo.findUnique({
                where: { id: d.processoId },
                select: { id: true, advogadoId: true },
            }),
            db.advogado.findUnique({
                where: { id: d.advogadoId },
                select: { id: true, ativo: true, user: { select: { isActive: true } } },
            }),
        ]);

        if (!processo) return { success: false, error: "Processo nao encontrado." };
        if (!advogado || !advogado.ativo || !advogado.user.isActive) {
            return { success: false, error: "Advogado inativo ou inexistente." };
        }

        await db.processo.update({
            where: { id: d.processoId },
            data: { advogadoId: d.advogadoId },
        });
        await registrarAtribuicaoProcesso({
            processoId: d.processoId,
            fromAdvogadoId: processo.advogadoId,
            toAdvogadoId: d.advogadoId,
            automatico: false,
            modoDistribuicao: "MANUAL",
            mesmaEquipe: false,
            scoreOrigem: null,
            scoreDestino: null,
            motivo: "Atribuicao manual no painel operacional",
        });

        revalidatePath("/processos");
        revalidatePath(`/processos/${d.processoId}`);
        revalidatePath("/admin");
        revalidatePath("/admin/equipe-juridica");
        revalidatePath("/admin/operacoes-juridicas");

        return { success: true };
    } catch (error) {
        console.error("Error assigning process to lawyer:", error);
        return { success: false, error: "Erro ao atribuir processo para advogado." };
    }
}

const distribuirAutoSchema = z.object({
    processoIds: z.array(z.string().min(1)).optional(),
    apenasQuandoSobrecarregado: z.coerce.boolean().default(true),
    modoDistribuicao: z.enum(["GLOBAL", "EQUIPE"]).default("GLOBAL"),
    fallbackGlobal: z.coerce.boolean().default(true),
    triggeredByUserId: z.string().optional().or(z.literal("")),
});

type MutableLoad = DistributionCandidate & {
    email: string;
    equipes: string[];
};

function scoreCarga(carga: DistributionCandidate) {
    return carga.processosAtivos * 3 + carga.tarefasAbertas * 2 + carga.prazosVencidos * 5;
}

async function registrarAtribuicaoProcesso(params: {
    processoId: string;
    fromAdvogadoId: string | null;
    toAdvogadoId: string;
    automatico: boolean;
    modoDistribuicao?: string | null;
    mesmaEquipe?: boolean;
    scoreOrigem?: number | null;
    scoreDestino?: number | null;
    motivo?: string | null;
    triggeredByUserId?: string | null;
}) {
    try {
        await db.processoAtribuicaoLog.create({
            data: {
                processoId: params.processoId,
                fromAdvogadoId: params.fromAdvogadoId,
                toAdvogadoId: params.toAdvogadoId,
                automatico: params.automatico,
                modoDistribuicao: params.modoDistribuicao || null,
                mesmaEquipe: params.mesmaEquipe ?? false,
                scoreOrigem: params.scoreOrigem ?? null,
                scoreDestino: params.scoreDestino ?? null,
                motivo: params.motivo || null,
                triggeredByUserId: params.triggeredByUserId || null,
            },
        });
    } catch (error) {
        console.warn("[ProcessoAtribuicaoLog] Could not persist:", error);
    }
}

export async function distribuirProcessosAutomaticamente(data?: z.infer<typeof distribuirAutoSchema>) {
    const parsed = distribuirAutoSchema.safeParse(data ?? {});
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const d = parsed.data;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [advogados, processosByAdvogado, prazosVencidosByAdvogado, tarefasAbertasByAdvogado, processos] =
            await Promise.all([
                db.advogado.findMany({
                    where: { ativo: true, user: { isActive: true } },
                    select: {
                        id: true,
                        especialidades: true,
                        user: { select: { name: true, email: true } },
                        timeMembros: { select: { timeId: true } },
                    },
                    orderBy: { user: { name: "asc" } },
                }),
                db.processo.groupBy({
                    by: ["advogadoId"],
                    where: { status: { notIn: ["ENCERRADO", "ARQUIVADO"] } },
                    _count: { _all: true },
                }),
                db.prazo.groupBy({
                    by: ["advogadoId"],
                    where: {
                        status: { in: ["PENDENTE", "VENCIDO"] },
                        dataFatal: { lt: today },
                    },
                    _count: { _all: true },
                }),
                db.tarefa.groupBy({
                    by: ["advogadoId"],
                    where: { status: { in: ["A_FAZER", "EM_ANDAMENTO", "REVISAO"] } },
                    _count: { _all: true },
                }),
                db.processo.findMany({
                    where: {
                        status: { notIn: ["ENCERRADO", "ARQUIVADO"] },
                        ...(d.processoIds?.length ? { id: { in: d.processoIds } } : {}),
                    },
                    select: {
                        id: true,
                        advogadoId: true,
                        numeroCnj: true,
                        objeto: true,
                        tipoAcao: { select: { nome: true } },
                        advogado: {
                            select: {
                                timeMembros: { select: { timeId: true } },
                            },
                        },
                    },
                    orderBy: { updatedAt: "desc" },
                    take: d.processoIds?.length ? undefined : 120,
                }),
            ]);

        if (advogados.length < 2) {
            return { success: false, error: "Sao necessarios pelo menos dois advogados ativos para distribuicao." };
        }

        const processosMap = new Map(processosByAdvogado.map((i) => [i.advogadoId, i._count._all]));
        const prazosMap = new Map(prazosVencidosByAdvogado.map((i) => [i.advogadoId, i._count._all]));
        const tarefasMap = new Map(tarefasAbertasByAdvogado.map((i) => [i.advogadoId, i._count._all]));

        const cargas = new Map<string, MutableLoad>(
            advogados.map((advogado) => [
                advogado.id,
                {
                    advogadoId: advogado.id,
                    nome: advogado.user.name,
                    email: advogado.user.email,
                    especialidades: advogado.especialidades,
                    processosAtivos: processosMap.get(advogado.id) || 0,
                    prazosVencidos: prazosMap.get(advogado.id) || 0,
                    tarefasAbertas: tarefasMap.get(advogado.id) || 0,
                    equipes: advogado.timeMembros.map((membro) => membro.timeId),
                },
            ])
        );

        const orderedProcessos = processos.slice().sort((a, b) => {
            const cargaA = cargas.get(a.advogadoId);
            const cargaB = cargas.get(b.advogadoId);
            return (cargaB ? scoreCarga(cargaB) : 0) - (cargaA ? scoreCarga(cargaA) : 0);
        });

        let movidos = 0;
        let ignorados = 0;
        const detalhes: Array<{
            processoId: string;
            numeroCnj: string | null;
            de: string;
            para: string;
            motivo: string;
        }> = [];

        for (const processo of orderedProcessos) {
            const cargaAtual = cargas.get(processo.advogadoId);
            if (!cargaAtual) {
                ignorados += 1;
                continue;
            }

            if (d.apenasQuandoSobrecarregado && scoreCarga(cargaAtual) < 14) {
                ignorados += 1;
                continue;
            }

            const distributionProcess: DistributionProcess = {
                processoId: processo.id,
                objeto: processo.objeto,
                tipoAcaoNome: processo.tipoAcao?.nome || null,
                advogadoAtualId: processo.advogadoId,
            };
            const origemTimes = new Set(processo.advogado.timeMembros.map((membro) => membro.timeId));
            const allLoads = Array.from(cargas.values());
            const equipeCandidates = allLoads.filter((carga) =>
                carga.equipes.some((timeId) => origemTimes.has(timeId))
            );

            let candidateLoads = allLoads;
            let sugestaoOrigem: "GLOBAL" | "EQUIPE" | "FALLBACK_GLOBAL" = "GLOBAL";
            const primaryByTeam = d.modoDistribuicao === "EQUIPE" && equipeCandidates.length > 0;
            if (d.modoDistribuicao === "EQUIPE") {
                if (equipeCandidates.length > 0) {
                    candidateLoads = equipeCandidates;
                    sugestaoOrigem = "EQUIPE";
                } else if (d.fallbackGlobal) {
                    candidateLoads = allLoads;
                    sugestaoOrigem = "FALLBACK_GLOBAL";
                } else {
                    candidateLoads = [];
                    sugestaoOrigem = "EQUIPE";
                }
            }

            if (candidateLoads.length === 0) {
                ignorados += 1;
                continue;
            }

            const candidates = candidateLoads.map<DistributionCandidate>((carga) => ({
                advogadoId: carga.advogadoId,
                nome: carga.nome,
                especialidades: carga.especialidades,
                processosAtivos: carga.processosAtivos,
                prazosVencidos: carga.prazosVencidos,
                tarefasAbertas: carga.tarefasAbertas,
            }));
            let sugestao = suggestAdvogadoForProcess(distributionProcess, candidates);
            if (
                d.modoDistribuicao === "EQUIPE" &&
                d.fallbackGlobal &&
                primaryByTeam &&
                (!sugestao || sugestao.advogadoId === processo.advogadoId)
            ) {
                const fallbackCandidates = allLoads.map<DistributionCandidate>((carga) => ({
                    advogadoId: carga.advogadoId,
                    nome: carga.nome,
                    especialidades: carga.especialidades,
                    processosAtivos: carga.processosAtivos,
                    prazosVencidos: carga.prazosVencidos,
                    tarefasAbertas: carga.tarefasAbertas,
                }));
                const fallbackSugestao = suggestAdvogadoForProcess(distributionProcess, fallbackCandidates);
                if (fallbackSugestao && fallbackSugestao.advogadoId !== processo.advogadoId) {
                    sugestao = fallbackSugestao;
                    sugestaoOrigem = "FALLBACK_GLOBAL";
                }
            }
            if (!sugestao || sugestao.advogadoId === processo.advogadoId) {
                ignorados += 1;
                continue;
            }

            const cargaSugerida = cargas.get(sugestao.advogadoId);
            if (!cargaSugerida) {
                ignorados += 1;
                continue;
            }

            const ganho = scoreCarga(cargaAtual) - scoreCarga(cargaSugerida);
            if (ganho < 3) {
                ignorados += 1;
                continue;
            }

            await db.processo.update({
                where: { id: processo.id },
                data: { advogadoId: sugestao.advogadoId },
            });
            const mesmaEquipe = origemTimes.size > 0 && cargaSugerida.equipes.some((timeId) => origemTimes.has(timeId));
            await registrarAtribuicaoProcesso({
                processoId: processo.id,
                fromAdvogadoId: processo.advogadoId,
                toAdvogadoId: sugestao.advogadoId,
                automatico: true,
                modoDistribuicao: sugestaoOrigem === "FALLBACK_GLOBAL" ? "EQUIPE_FALLBACK_GLOBAL" : d.modoDistribuicao,
                mesmaEquipe,
                scoreOrigem: scoreCarga(cargaAtual),
                scoreDestino: scoreCarga(cargaSugerida),
                motivo: sugestao.specialtyMatch
                    ? sugestaoOrigem === "FALLBACK_GLOBAL"
                        ? "Redistribuicao automatica com match de especialidade (fallback global)"
                        : "Redistribuicao automatica com match de especialidade"
                    : sugestaoOrigem === "FALLBACK_GLOBAL"
                        ? "Redistribuicao automatica por carga (fallback global)"
                        : "Redistribuicao automatica por balanceamento de carga",
                triggeredByUserId: d.triggeredByUserId || null,
            });

            cargaAtual.processosAtivos = Math.max(0, cargaAtual.processosAtivos - 1);
            cargaSugerida.processosAtivos += 1;

            movidos += 1;
            detalhes.push({
                processoId: processo.id,
                numeroCnj: processo.numeroCnj,
                de: cargaAtual.nome,
                para: cargaSugerida.nome,
                motivo: sugestao.specialtyMatch
                    ? sugestaoOrigem === "FALLBACK_GLOBAL"
                        ? "Fallback global com match de especialidade"
                        : "Balanceamento de carga com match de especialidade"
                    : sugestaoOrigem === "FALLBACK_GLOBAL"
                        ? "Fallback global por carga"
                        : "Balanceamento de carga",
            });
        }

        revalidatePath("/processos");
        revalidatePath("/admin");
        revalidatePath("/admin/equipe-juridica");
        revalidatePath("/admin/operacoes-juridicas");

        return {
            success: true,
            analisados: orderedProcessos.length,
            movidos,
            ignorados,
            modoDistribuicao: d.modoDistribuicao,
            detalhes: detalhes.slice(0, 25),
        };
    } catch (error) {
        console.error("Error auto distributing processes:", error);
        return { success: false, error: "Erro ao executar distribuicao automatica." };
    }
}

const operacoesConfigSchema = z.object({
    slaWhatsappMinutes: z.coerce.number().min(5).max(720),
    slaEmailMinutes: z.coerce.number().min(10).max(1440),
    slaAtendimentoNoReturnHours: z.coerce.number().min(1).max(240),
    autoDistributionEnabled: z.coerce.boolean().default(DEFAULT_OPERACOES_CONFIG.autoDistributionEnabled),
    autoDistributionHour: z.coerce.number().min(0).max(23),
    autoDistributionOnlyOverloaded: z.coerce.boolean().default(
        DEFAULT_OPERACOES_CONFIG.autoDistributionOnlyOverloaded
    ),
    autoDistributionMode: z.enum(["GLOBAL", "EQUIPE"]).default(DEFAULT_OPERACOES_CONFIG.autoDistributionMode),
    autoDistributionFallbackGlobal: z.coerce.boolean().default(
        DEFAULT_OPERACOES_CONFIG.autoDistributionFallbackGlobal
    ),
});

export async function updateOperacoesConfig(data: z.infer<typeof operacoesConfigSchema>) {
    const parsed = operacoesConfigSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const config = await saveOperacoesConfig(parsed.data);
        revalidatePath("/admin");
        revalidatePath("/admin/operacoes-juridicas");
        return { success: true, config };
    } catch (error) {
        console.error("Error updating operacoes config:", error);
        return { success: false, error: "Erro ao salvar configuracoes de operacoes." };
    }
}

async function notifyAdminAndSociosNoRepeat(title: string, mensagem: string, linkUrl?: string) {
    const windowStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const existing = await db.notificacao.findFirst({
        where: {
            tipo: "SISTEMA",
            titulo: title,
            createdAt: { gte: windowStart },
        },
        select: { id: true },
    });
    if (existing) return 0;

    const users = await db.user.findMany({
        where: { isActive: true, role: { in: ["ADMIN", "SOCIO"] } },
        select: { id: true },
    });
    if (users.length === 0) return 0;

    const result = await db.notificacao.createMany({
        data: users.map((user) => ({
            userId: user.id,
            tipo: "SISTEMA",
            titulo: title,
            mensagem,
            linkUrl: linkUrl || null,
        })),
    });
    return result.count;
}

export async function runOperacoesJobAgora(forceDistribution = true) {
    try {
        const now = new Date();
        const config = await getOperacoesConfig();

        const distributionResult = forceDistribution
            ? await distribuirProcessosAutomaticamente({
                  apenasQuandoSobrecarregado: config.autoDistributionOnlyOverloaded,
                  modoDistribuicao: config.autoDistributionMode,
                  fallbackGlobal: config.autoDistributionFallbackGlobal,
              })
            : { success: true, movidos: 0, analisados: 0, ignorados: 0, skipped: true };

        const data = await getOperacoesJuridicasData();

        const notifications = {
            conversas: 0,
            atendimentos: 0,
            distribuicao: 0,
        };

        if (data.metrics.slaConversasPendentes > 0) {
            notifications.conversas = await notifyAdminAndSociosNoRepeat(
                "SLA de conversas em atraso",
                `${data.metrics.slaConversasPendentes} conversa(s) abertas estao fora de SLA.`,
                "/comunicacao"
            );
        }
        if (data.metrics.slaAtendimentosPendentes > 0) {
            notifications.atendimentos = await notifyAdminAndSociosNoRepeat(
                "SLA de atendimentos em atraso",
                `${data.metrics.slaAtendimentosPendentes} atendimento(s) estao fora de SLA.`,
                "/atendimentos"
            );
        }

        const distributionPayload = distributionResult as { success?: boolean; movidos?: number; skipped?: boolean };
        if (distributionPayload.success && !distributionPayload.skipped && (distributionPayload.movidos || 0) > 0) {
            notifications.distribuicao = await notifyAdminAndSociosNoRepeat(
                "Distribuição automática executada",
                `${distributionPayload.movidos} processo(s) foram redistribuidos automaticamente.`,
                "/admin/operacoes-juridicas"
            );
        }

        revalidatePath("/admin/operacoes-juridicas");
        revalidatePath("/comunicacao");
        revalidatePath("/atendimentos");

        return {
            success: true,
            timestamp: now.toISOString(),
            distributionResult,
            sla: {
                conversasPendentes: data.metrics.slaConversasPendentes,
                atendimentosPendentes: data.metrics.slaAtendimentosPendentes,
            },
            notifications,
        };
    } catch (error) {
        console.error("Error running operacoes job now:", error);
        return { success: false, error: "Erro ao executar job operacional." };
    }
}


