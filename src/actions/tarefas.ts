"use server";

import { db } from "@/lib/db";
import { tarefaSchema, tarefaComentarioSchema, tarefaChecklistSchema } from "@/lib/validators/tarefa";
import type { TarefaFormData } from "@/lib/validators/tarefa";
import { getEscritorioId, tenantFilter } from "@/lib/tenant";
import { fireEvent } from "@/lib/services/event-triggers";
import { registrarLogAuditoria } from "@/lib/services/audit-log";
import {
    removeLegacyAgendamentoRef,
    syncTarefaLegadaToAgendamento,
} from "@/lib/services/agendamento-legacy-sync";
import type { StatusTarefa, CategoriaEntrega } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/actions/auth";
import { requirePermission } from "@/lib/rbac/check-permission";

function emptyToNull(val: unknown) {
    return val === "" ? null : val;
}

function getScopedAdvogadoId(session: Awaited<ReturnType<typeof getSession>>) {
    if (!session || session.role !== "ADVOGADO") return null;
    return session.advogado?.id || null;
}

async function canAccessProcessoForTarefa(session: Awaited<ReturnType<typeof getSession>>, processoId: string | null) {
    const scopedAdvogadoId = getScopedAdvogadoId(session);
    if (!scopedAdvogadoId) return true;
    if (!processoId) return true;

    const processo = await db.processo.findFirst({
        where: { id: processoId, advogadoId: scopedAdvogadoId },
        select: { id: true },
    });
    return Boolean(processo);
}

async function canAccessTarefa(session: Awaited<ReturnType<typeof getSession>>, tarefaId: string) {
    const scopedAdvogadoId = getScopedAdvogadoId(session);
    if (!scopedAdvogadoId) return true;

    const tarefa = await db.tarefa.findFirst({
        where: { id: tarefaId, advogadoId: scopedAdvogadoId },
        select: { id: true },
    });
    return Boolean(tarefa);
}

async function canAccessChecklistItem(session: Awaited<ReturnType<typeof getSession>>, checklistItemId: string) {
    const scopedAdvogadoId = getScopedAdvogadoId(session);
    if (!scopedAdvogadoId) return true;

    const checklistItem = await db.tarefaChecklist.findFirst({
        where: { id: checklistItemId, tarefa: { advogadoId: scopedAdvogadoId } },
        select: { id: true },
    });
    return Boolean(checklistItem);
}

async function requireTarefaPermission(
    permissionKey: string,
    errorMessage: string,
    fallbackRoles?: ("ADMIN" | "SOCIO" | "ADVOGADO" | "CONTROLADOR" | "ASSISTENTE" | "FINANCEIRO" | "SECRETARIA")[],
) {
    const result = await requirePermission(permissionKey, {
        fallbackRoles,
        errorMessage,
    });

    if ("error" in result) {
        return result.error;
    }

    return null;
}

// =============================================================
// TAREFA CRUD
// =============================================================

export async function createTarefa(formData: TarefaFormData, criadoPorId: string) {
    const parsed = tarefaSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const d = parsed.data;
        const session = await getSession();
        if (!session) return { success: false, error: { _form: ["Sessao expirada. Faca login novamente."] } };
        const permissionError = await requireTarefaPermission(
            "tarefas:lista:criar",
            "Sem permissao para criar tarefas.",
            ["ADMIN", "SOCIO", "ADVOGADO", "ASSISTENTE"],
        );
        if (permissionError) {
            return { success: false, error: { _form: [permissionError] } };
        }

        const scopedAdvogadoId = getScopedAdvogadoId(session);
        const processoId = (emptyToNull(d.processoId) as string | null) || null;

        if (scopedAdvogadoId) {
            if (d.advogadoId !== scopedAdvogadoId) {
                return { success: false, error: { _form: ["Advogado so pode criar tarefa para si mesmo."] } };
            }

            const canAccessProcesso = await canAccessProcessoForTarefa(session, processoId);
            if (!canAccessProcesso) {
                return { success: false, error: { _form: ["Sem permissao para vincular tarefa a este processo."] } };
            }
        }

        const actorId = session.id || criadoPorId || "system";
        const escritorioId = await getEscritorioId();

        const tarefa = await db.tarefa.create({
            data: {
                titulo: d.titulo,
                descricao: emptyToNull(d.descricao) as string | null,
                prioridade: d.prioridade,
                status: d.status,
                pontos: d.pontos,
                dataLimite: d.dataLimite ? new Date(d.dataLimite) : null,
                processoId,
                advogadoId: d.advogadoId,
                criadoPorId: actorId,
                horasEstimadas: d.horasEstimadas || null,
                escritorioId,
            },
        });

        fireEvent("TAREFA_CRIADA", {
            tarefaId: tarefa.id,
            processoId: tarefa.processoId || undefined,
            variables: { tarefa_titulo: d.titulo },
        });
        await syncTarefaLegadaToAgendamento(tarefa.id).catch((error) => {
            console.warn("[tarefas] Falha ao sincronizar tarefa legada na agenda central:", error);
        });
        await registrarLogAuditoria({
            actorUserId: actorId,
            acao: "TAREFA_CRIADA",
            entidade: "Tarefa",
            entidadeId: tarefa.id,
            dadosDepois: {
                titulo: tarefa.titulo,
                status: tarefa.status,
                prioridade: tarefa.prioridade,
                advogadoId: tarefa.advogadoId,
                processoId: tarefa.processoId,
            },
        });

        revalidatePath("/tarefas");
        revalidatePath("/agenda");
        return { success: true };
    } catch (error) {
        console.error("Error creating tarefa:", error);
        return { success: false, error: { _form: ["Erro ao criar tarefa."] } };
    }
}

export async function updateTarefa(id: string, formData: TarefaFormData) {
    const parsed = tarefaSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const session = await getSession();
        if (!session) return { success: false, error: { _form: ["Sessao expirada. Faca login novamente."] } };
        const permissionError = await requireTarefaPermission(
            "tarefas:lista:editar",
            "Sem permissao para atualizar tarefas.",
            ["ADMIN", "SOCIO", "ADVOGADO", "ASSISTENTE"],
        );
        if (permissionError) {
            return { success: false, error: { _form: [permissionError] } };
        }

        const canAccessCurrent = await canAccessTarefa(session, id);
        if (!canAccessCurrent) return { success: false, error: { _form: ["Sem permissao para atualizar esta tarefa."] } };
        const filter = await tenantFilter();
        const tarefaAntes = await db.tarefa.findFirst({
            where: { id, ...filter },
            select: {
                titulo: true,
                status: true,
                prioridade: true,
                advogadoId: true,
                processoId: true,
                dataLimite: true,
            },
        });
        if (!tarefaAntes) return { success: false, error: { _form: ["Tarefa não encontrada ou sem permissão."] } };

        const d = parsed.data;
        const scopedAdvogadoId = getScopedAdvogadoId(session);
        const processoId = (emptyToNull(d.processoId) as string | null) || null;

        if (scopedAdvogadoId) {
            if (d.advogadoId !== scopedAdvogadoId) {
                return { success: false, error: { _form: ["Advogado so pode manter tarefa atribuida a si mesmo."] } };
            }

            const canAccessProcesso = await canAccessProcessoForTarefa(session, processoId);
            if (!canAccessProcesso) {
                return { success: false, error: { _form: ["Sem permissao para vincular tarefa a este processo."] } };
            }
        }

        const tarefaAtualizada = await db.tarefa.update({
            where: { id },
            data: {
                titulo: d.titulo,
                descricao: emptyToNull(d.descricao) as string | null,
                prioridade: d.prioridade,
                status: d.status,
                pontos: d.pontos,
                dataLimite: d.dataLimite ? new Date(d.dataLimite) : null,
                processoId,
                advogadoId: d.advogadoId,
                horasEstimadas: d.horasEstimadas || null,
            },
            select: {
                id: true,
                titulo: true,
                status: true,
                prioridade: true,
                advogadoId: true,
                processoId: true,
                dataLimite: true,
            },
        });
        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "TAREFA_ATUALIZADA",
            entidade: "Tarefa",
            entidadeId: id,
            dadosAntes: tarefaAntes,
            dadosDepois: tarefaAtualizada,
        });
        await syncTarefaLegadaToAgendamento(id).catch((error) => {
            console.warn("[tarefas] Falha ao atualizar tarefa legada na agenda central:", error);
        });

        revalidatePath("/tarefas");
        revalidatePath("/agenda");
        return { success: true };
    } catch (error) {
        console.error("Error updating tarefa:", error);
        return { success: false, error: { _form: ["Erro ao atualizar tarefa."] } };
    }
}

export async function moveTarefa(id: string, newStatus: StatusTarefa) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Sessao expirada. Faca login novamente." };
        const permissionError = await requireTarefaPermission(
            "tarefas:lista:editar",
            "Sem permissao para mover esta tarefa.",
            ["ADMIN", "SOCIO", "ADVOGADO", "ASSISTENTE"],
        );
        if (permissionError) return { success: false, error: permissionError };

        const canAccess = await canAccessTarefa(session, id);
        if (!canAccess) return { success: false, error: "Sem permissao para mover esta tarefa." };
        const filter = await tenantFilter();
        const tarefaAntes = await db.tarefa.findFirst({
            where: { id, ...filter },
            select: { status: true, concluidaEm: true, categoriaEntrega: true },
        });
        if (!tarefaAntes) return { success: false, error: "Tarefa não encontrada ou sem permissão." };

        const updateData: Record<string, unknown> = { status: newStatus };

        if (newStatus === "CONCLUIDA") {
            const tarefa = await db.tarefa.findFirst({ where: { id, ...filter }, select: { dataLimite: true } });
            updateData.concluidaEm = new Date();

            if (tarefa?.dataLimite) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const limitDay = new Date(tarefa.dataLimite);
                limitDay.setHours(0, 0, 0, 0);

                let categoria: CategoriaEntrega = "D_0";
                if (today < limitDay) categoria = "D_MENOS_1";
                else if (today > limitDay) categoria = "FORA_PRAZO";

                updateData.categoriaEntrega = categoria;
            }
        }

        if (newStatus !== "CONCLUIDA") {
            updateData.concluidaEm = null;
            updateData.categoriaEntrega = null;
        }

        const tarefa = await db.tarefa.update({
            where: { id },
            data: updateData,
            select: { id: true, titulo: true, processoId: true, status: true, concluidaEm: true, categoriaEntrega: true },
        });

        if (newStatus === "CONCLUIDA") {
            fireEvent("TAREFA_CONCLUIDA", {
                tarefaId: tarefa.id,
                processoId: tarefa.processoId || undefined,
                variables: { tarefa_titulo: tarefa.titulo },
            });
        }
        await syncTarefaLegadaToAgendamento(id).catch((error) => {
            console.warn("[tarefas] Falha ao atualizar status da tarefa na agenda central:", error);
        });
        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "TAREFA_STATUS_ATUALIZADO",
            entidade: "Tarefa",
            entidadeId: id,
            dadosAntes: tarefaAntes,
            dadosDepois: {
                status: tarefa.status,
                concluidaEm: tarefa.concluidaEm,
                categoriaEntrega: tarefa.categoriaEntrega,
            },
        });

        revalidatePath("/tarefas");
        revalidatePath("/agenda");
        return { success: true };
    } catch (error) {
        console.error("Error moving tarefa:", error);
        return { success: false, error: "Erro ao mover tarefa." };
    }
}

export async function deleteTarefa(id: string) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Sessao expirada. Faca login novamente." };
        const permissionError = await requireTarefaPermission(
            "tarefas:lista:excluir",
            "Sem permissao para excluir tarefas.",
            ["ADMIN", "SOCIO"],
        );
        if (permissionError) return { success: false, error: permissionError };

        const canAccess = await canAccessTarefa(session, id);
        if (!canAccess) return { success: false, error: "Sem permissao para excluir esta tarefa." };
        const filter = await tenantFilter();
        const tarefaAntes = await db.tarefa.findFirst({
            where: { id, ...filter },
            select: {
                titulo: true,
                status: true,
                prioridade: true,
                advogadoId: true,
                processoId: true,
            },
        });
        if (!tarefaAntes) return { success: false, error: "Tarefa não encontrada ou sem permissão." };
        await db.tarefa.delete({ where: { id } });
        await removeLegacyAgendamentoRef("tarefa", id).catch((error) => {
            console.warn("[tarefas] Falha ao remover tarefa legada da agenda central:", error);
        });
        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "TAREFA_EXCLUIDA",
            entidade: "Tarefa",
            entidadeId: id,
            dadosAntes: tarefaAntes,
            dadosDepois: { removida: true },
        });
        revalidatePath("/tarefas");
        revalidatePath("/agenda");
        return { success: true };
    } catch (error) {
        console.error("Error deleting tarefa:", error);
        return { success: false, error: "Erro ao excluir tarefa." };
    }
}

// =============================================================
// COMENTARIOS
// =============================================================

export async function addComentario(tarefaId: string, userId: string, conteudo: string) {
    const parsed = tarefaComentarioSchema.safeParse({ conteudo });
    if (!parsed.success) return { success: false, error: "Comentario invalido." };

    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Sessao expirada. Faca login novamente." };
        const permissionError = await requireTarefaPermission(
            "tarefas:lista:ver",
            "Sem permissao para comentar nesta tarefa.",
            ["ADMIN", "SOCIO", "ADVOGADO", "ASSISTENTE"],
        );
        if (permissionError) return { success: false, error: permissionError };

        const canAccess = await canAccessTarefa(session, tarefaId);
        if (!canAccess) return { success: false, error: "Sem permissao para comentar nesta tarefa." };

        const actorUserId = session.id || userId;

        await db.tarefaComentario.create({
            data: { tarefaId, userId: actorUserId, conteudo },
        });

        revalidatePath("/tarefas");
        return { success: true };
    } catch (error) {
        console.error("Error adding comment:", error);
        return { success: false, error: "Erro ao adicionar comentario." };
    }
}

// =============================================================
// CHECKLIST
// =============================================================

export async function addChecklistItem(tarefaId: string, texto: string) {
    const parsed = tarefaChecklistSchema.safeParse({ texto });
    if (!parsed.success) return { success: false, error: "Texto invalido." };

    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Sessao expirada. Faca login novamente." };
        const permissionError = await requireTarefaPermission(
            "tarefas:lista:editar",
            "Sem permissao para alterar checklist desta tarefa.",
            ["ADMIN", "SOCIO", "ADVOGADO", "ASSISTENTE"],
        );
        if (permissionError) return { success: false, error: permissionError };

        const canAccess = await canAccessTarefa(session, tarefaId);
        if (!canAccess) return { success: false, error: "Sem permissao para alterar checklist desta tarefa." };

        const maxOrder = await db.tarefaChecklist.findFirst({
            where: { tarefaId },
            orderBy: { ordem: "desc" },
            select: { ordem: true },
        });

        await db.tarefaChecklist.create({
            data: { tarefaId, texto, ordem: (maxOrder?.ordem ?? -1) + 1 },
        });

        revalidatePath("/tarefas");
        return { success: true };
    } catch (error) {
        console.error("Error adding checklist item:", error);
        return { success: false, error: "Erro ao adicionar item." };
    }
}

export async function toggleChecklistItem(id: string) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Sessao expirada. Faca login novamente." };
        const permissionError = await requireTarefaPermission(
            "tarefas:lista:editar",
            "Sem permissao para alterar este item.",
            ["ADMIN", "SOCIO", "ADVOGADO", "ASSISTENTE"],
        );
        if (permissionError) return { success: false, error: permissionError };

        const canAccess = await canAccessChecklistItem(session, id);
        if (!canAccess) return { success: false, error: "Sem permissao para alterar este item." };

        const item = await db.tarefaChecklist.findFirst({ where: { id } });
        if (!item) return { success: false, error: "Item nao encontrado." };

        await db.tarefaChecklist.update({
            where: { id },
            data: { concluido: !item.concluido },
        });

        revalidatePath("/tarefas");
        return { success: true };
    } catch (error) {
        console.error("Error toggling checklist item:", error);
        return { success: false, error: "Erro ao atualizar item." };
    }
}

export async function deleteChecklistItem(id: string) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Sessao expirada. Faca login novamente." };
        const permissionError = await requireTarefaPermission(
            "tarefas:lista:editar",
            "Sem permissao para excluir este item.",
            ["ADMIN", "SOCIO", "ADVOGADO", "ASSISTENTE"],
        );
        if (permissionError) return { success: false, error: permissionError };

        const canAccess = await canAccessChecklistItem(session, id);
        if (!canAccess) return { success: false, error: "Sem permissao para excluir este item." };

        await db.tarefaChecklist.delete({ where: { id } });
        revalidatePath("/tarefas");
        return { success: true };
    } catch (error) {
        console.error("Error deleting checklist item:", error);
        return { success: false, error: "Erro ao excluir item." };
    }
}
