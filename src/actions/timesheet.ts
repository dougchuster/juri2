"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac/check-permission";
import { calculateDurationHours } from "@/lib/services/timesheet-core";
import {
    manualTimesheetEntrySchema,
    timerTimesheetEntrySchema,
    type ManualTimesheetEntryInput,
    type TimerTimesheetEntryInput,
} from "@/lib/validators/timesheet";

function firstIssueMessage(error: { issues?: Array<{ message?: string }> }) {
    return error.issues?.[0]?.message ?? "Dados invalidos.";
}

async function loadAccessibleTask(session: Awaited<ReturnType<typeof getSession>>, tarefaId: string) {
    if (!session) return null;

    const tarefa = await db.tarefa.findFirst({
        where: {
            id: tarefaId,
            ...(session.escritorioId ? { escritorioId: session.escritorioId } : {}),
        },
        select: {
            id: true,
            advogadoId: true,
            escritorioId: true,
        },
    });

    if (!tarefa) return null;

    if (session.role === "ADVOGADO" && session.advogado?.id && tarefa.advogadoId !== session.advogado.id) {
        return null;
    }

    return tarefa;
}

async function refreshSpentHoursForTask(tarefaId: string) {
    const aggregate = await db.tarefaRegistroHora.aggregate({
        where: { tarefaId },
        _sum: { horas: true },
    });

    await db.tarefa.update({
        where: { id: tarefaId },
        data: { horasGastas: aggregate._sum.horas ?? 0 },
    });
}

function revalidateTimesheetPaths() {
    revalidatePath("/financeiro");
    revalidatePath("/financeiro/rentabilidade");
    revalidatePath("/financeiro/timesheet");
    revalidatePath("/tarefas");
}

export async function createManualTimesheetEntry(input: ManualTimesheetEntryInput) {
    const permission = await requirePermission("financeiro:timesheet:criar", {
        fallbackRoles: ["ADMIN", "SOCIO", "ADVOGADO", "ASSISTENTE", "FINANCEIRO"],
        errorMessage: "Sem permissao para registrar horas.",
    });
    if ("error" in permission) return { success: false, error: permission.error };

    const parsed = manualTimesheetEntrySchema.safeParse(input);
    if (!parsed.success) return { success: false, error: firstIssueMessage(parsed.error) };

    const session = await getSession();
    if (!session?.id) return { success: false, error: "Sessao expirada. Faca login novamente." };

    const tarefa = await loadAccessibleTask(session, parsed.data.tarefaId);
    if (!tarefa) return { success: false, error: "Tarefa nao encontrada ou sem permissao para registrar horas." };

    await db.tarefaRegistroHora.create({
        data: {
            tarefaId: parsed.data.tarefaId,
            userId: session.id,
            horas: parsed.data.horas,
            descricao: parsed.data.descricao?.trim() || null,
            data: new Date(`${parsed.data.data}T00:00:00`),
        },
    });

    await refreshSpentHoursForTask(parsed.data.tarefaId);
    revalidateTimesheetPaths();

    return { success: true };
}

export async function createTimerTimesheetEntry(input: TimerTimesheetEntryInput) {
    const permission = await requirePermission("financeiro:timesheet:criar", {
        fallbackRoles: ["ADMIN", "SOCIO", "ADVOGADO", "ASSISTENTE", "FINANCEIRO"],
        errorMessage: "Sem permissao para registrar horas pelo cronometro.",
    });
    if ("error" in permission) return { success: false, error: permission.error };

    const parsed = timerTimesheetEntrySchema.safeParse(input);
    if (!parsed.success) return { success: false, error: firstIssueMessage(parsed.error) };

    const session = await getSession();
    if (!session?.id) return { success: false, error: "Sessao expirada. Faca login novamente." };

    const tarefa = await loadAccessibleTask(session, parsed.data.tarefaId);
    if (!tarefa) return { success: false, error: "Tarefa nao encontrada ou sem permissao para registrar horas." };

    const horas = calculateDurationHours(parsed.data.startedAt, parsed.data.endedAt);
    if (horas <= 0) {
        return { success: false, error: "Tempo insuficiente para gerar um lancamento." };
    }

    await db.tarefaRegistroHora.create({
        data: {
            tarefaId: parsed.data.tarefaId,
            userId: session.id,
            horas,
            descricao: parsed.data.descricao?.trim() || null,
            data: new Date(`${parsed.data.data}T00:00:00`),
        },
    });

    await refreshSpentHoursForTask(parsed.data.tarefaId);
    revalidateTimesheetPaths();

    return { success: true };
}

export async function deleteTimesheetEntry(entryId: string) {
    const permission = await requirePermission("financeiro:timesheet:excluir", {
        fallbackRoles: ["ADMIN", "SOCIO", "ADVOGADO", "FINANCEIRO"],
        errorMessage: "Sem permissao para excluir lancamentos de horas.",
    });
    if ("error" in permission) return { success: false, error: permission.error };

    const session = await getSession();
    if (!session?.id) return { success: false, error: "Sessao expirada. Faca login novamente." };

    const entry = await db.tarefaRegistroHora.findUnique({
        where: { id: entryId },
        select: {
            id: true,
            userId: true,
            tarefaId: true,
            tarefa: { select: { advogadoId: true, escritorioId: true } },
        },
    });

    if (!entry) return { success: false, error: "Lancamento nao encontrado." };
    if (session.escritorioId && entry.tarefa.escritorioId !== session.escritorioId) {
        return { success: false, error: "Lancamento nao encontrado." };
    }

    const canDeleteAny = ["ADMIN", "SOCIO", "FINANCEIRO"].includes(session.role);
    const canDeleteOwn = entry.userId === session.id;
    const canDeleteAdvogadoOwnTask =
        session.role === "ADVOGADO" &&
        session.advogado?.id &&
        entry.tarefa.advogadoId === session.advogado.id &&
        canDeleteOwn;

    if (!canDeleteAny && !canDeleteAdvogadoOwnTask) {
        return { success: false, error: "Sem permissao para excluir este lancamento." };
    }

    await db.tarefaRegistroHora.delete({ where: { id: entryId } });
    await refreshSpentHoursForTask(entry.tarefaId);
    revalidateTimesheetPaths();

    return { success: true };
}
