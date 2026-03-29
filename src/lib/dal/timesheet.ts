import "server-only";

import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma";
import { buildTimesheetReport } from "@/lib/services/timesheet-core";

export type TimesheetFilters = {
    search?: string;
    from?: string;
    to?: string;
    userId?: string;
    processoId?: string;
    tarefaId?: string;
};

export type TimesheetScope = {
    userId?: string | null;
    role?: Role | null;
    advogadoId?: string | null;
    escritorioId?: string | null;
};

function getScopedUserId(scope?: TimesheetScope) {
    if (!scope || scope.role !== "ADVOGADO") return null;
    return scope.userId ?? null;
}

function toDateEndInclusive(value: string) {
    const date = new Date(`${value}T23:59:59.999`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function firstNonEmpty(value?: string | null) {
    return value?.trim() ? value.trim() : undefined;
}

export async function getTimesheetPageData(filters: TimesheetFilters = {}, scope?: TimesheetScope) {
    const scopedUserId = getScopedUserId(scope);
    if (scope?.role === "ADVOGADO" && !scopedUserId) {
        return {
            filters,
            summary: buildTimesheetReport([]),
            entries: [],
            selects: { tasks: [], users: [], processes: [] },
            currentUserId: null,
            permissions: { canCreate: false, canDeleteAny: false, canFilterUsers: false },
        };
    }

    const where: Record<string, unknown> = {};
    const tarefaWhere: Record<string, unknown> = {};

    if (scope?.escritorioId) tarefaWhere.escritorioId = scope.escritorioId;
    if (filters.processoId) tarefaWhere.processoId = filters.processoId;
    if (filters.tarefaId) where.tarefaId = filters.tarefaId;
    if (scopedUserId) where.userId = scopedUserId;
    else if (filters.userId) where.userId = filters.userId;

    const from = firstNonEmpty(filters.from);
    const to = firstNonEmpty(filters.to);
    if (from || to) {
        const dataFilter: Record<string, Date> = {};
        if (from) dataFilter.gte = new Date(`${from}T00:00:00`);
        if (to) {
            const inclusive = toDateEndInclusive(to);
            if (inclusive) dataFilter.lte = inclusive;
        }
        where.data = dataFilter;
    }

    const search = firstNonEmpty(filters.search);
    if (search) {
        where.OR = [
            { descricao: { contains: search, mode: "insensitive" } },
            { tarefa: { titulo: { contains: search, mode: "insensitive" } } },
            { tarefa: { descricao: { contains: search, mode: "insensitive" } } },
            { tarefa: { processo: { numeroCnj: { contains: search, mode: "insensitive" } } } },
            { tarefa: { processo: { cliente: { nome: { contains: search, mode: "insensitive" } } } } },
        ];
    }

    if (Object.keys(tarefaWhere).length > 0) {
        where.tarefa = tarefaWhere;
    }

    const [entriesRaw, tasksRaw, processesRaw, activeUsers] = await Promise.all([
        db.tarefaRegistroHora.findMany({
            where,
            orderBy: [{ data: "desc" }, { createdAt: "desc" }],
            take: 150,
            select: {
                id: true,
                tarefaId: true,
                userId: true,
                horas: true,
                descricao: true,
                data: true,
                createdAt: true,
                tarefa: {
                    select: {
                        id: true,
                        titulo: true,
                        processoId: true,
                        processo: {
                            select: {
                                id: true,
                                numeroCnj: true,
                                cliente: { select: { nome: true } },
                            },
                        },
                    },
                },
            },
        }),
        db.tarefa.findMany({
            where: {
                ...(scope?.escritorioId ? { escritorioId: scope.escritorioId } : {}),
                ...(scope?.role === "ADVOGADO" && scope.advogadoId ? { advogadoId: scope.advogadoId } : {}),
            },
            orderBy: [{ updatedAt: "desc" }],
            take: 200,
            select: {
                id: true,
                titulo: true,
                processo: {
                    select: {
                        numeroCnj: true,
                        cliente: { select: { nome: true } },
                    },
                },
            },
        }),
        db.processo.findMany({
            where: {
                ...(scope?.escritorioId ? { escritorioId: scope.escritorioId } : {}),
                ...(scope?.role === "ADVOGADO" && scope.advogadoId ? { advogadoId: scope.advogadoId } : {}),
            },
            orderBy: [{ updatedAt: "desc" }],
            take: 120,
            select: {
                id: true,
                numeroCnj: true,
                cliente: { select: { nome: true } },
            },
        }),
        scope?.escritorioId
            ? db.user.findMany({
                where: { escritorioId: scope.escritorioId, isActive: true },
                orderBy: [{ name: "asc" }],
                take: 120,
                select: { id: true, name: true },
            })
            : Promise.resolve([]),
    ]);

    const missingUserIds = Array.from(new Set(entriesRaw.map((entry) => entry.userId))).filter(
        (userId) => !activeUsers.some((user) => user.id === userId),
    );

    const extraUsers = missingUserIds.length
        ? await db.user.findMany({
            where: { id: { in: missingUserIds } },
            select: { id: true, name: true },
        })
        : [];

    const userNameMap = new Map(
        [...activeUsers, ...extraUsers].map((user) => [user.id, user.name ?? "Usuario"] as const),
    );

    const entries = entriesRaw.map((entry) => ({
        id: entry.id,
        tarefaId: entry.tarefaId,
        tarefaTitulo: entry.tarefa.titulo,
        processoId: entry.tarefa.processoId,
        processoNumero: entry.tarefa.processo?.numeroCnj ?? null,
        clienteNome: entry.tarefa.processo?.cliente?.nome ?? null,
        userId: entry.userId,
        userName: userNameMap.get(entry.userId) ?? "Usuario",
        horas: entry.horas,
        descricao: entry.descricao,
        data: entry.data.toISOString().slice(0, 10),
        createdAt: entry.createdAt.toISOString(),
    }));

    const summary = buildTimesheetReport(entries);
    const role = scope?.role ?? null;

    return {
        filters,
        summary,
        entries,
        selects: {
            tasks: tasksRaw.map((task) => ({
                value: task.id,
                label: `${task.titulo}${task.processo?.numeroCnj ? ` - ${task.processo.numeroCnj}` : ""}${task.processo?.cliente?.nome ? ` - ${task.processo.cliente.nome}` : ""}`,
            })),
            users: activeUsers.map((user) => ({ value: user.id, label: user.name ?? "Usuario" })),
            processes: processesRaw.map((processo) => ({
                value: processo.id,
                label: `${processo.numeroCnj ?? "Sem numero"}${processo.cliente?.nome ? ` - ${processo.cliente.nome}` : ""}`,
            })),
        },
        currentUserId: scope?.userId ?? null,
        permissions: {
            canCreate: ["ADMIN", "SOCIO", "ADVOGADO", "ASSISTENTE", "FINANCEIRO"].includes(role ?? ""),
            canDeleteAny: ["ADMIN", "SOCIO", "FINANCEIRO"].includes(role ?? ""),
            canFilterUsers: role !== "ADVOGADO",
        },
    };
}
