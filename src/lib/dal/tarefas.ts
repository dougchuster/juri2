import "server-only";
import { db } from "@/lib/db";
import type { PrioridadeTarefa, Role, StatusTarefa } from "@/generated/prisma";

export interface TarefaFilters {
    search?: string;
    status?: StatusTarefa;
    prioridade?: PrioridadeTarefa;
    advogadoId?: string;
    processoId?: string;
    page?: number;
    pageSize?: number;
}

export interface TarefaVisibilityScope {
    role?: Role | null;
    advogadoId?: string | null;
}

function getScopedAdvogadoId(scope?: TarefaVisibilityScope) {
    if (!scope || scope.role !== "ADVOGADO") return null;
    return scope.advogadoId || null;
}
export async function getTarefas(filters: TarefaFilters = {}, scope?: TarefaVisibilityScope) {
    const {
        search, status, prioridade, advogadoId, processoId,
        page = 1, pageSize = 20,
    } = filters;

    const where: Record<string, unknown> = {};
    const scopedAdvogadoId = getScopedAdvogadoId(scope);

    if (scope?.role === "ADVOGADO" && !scopedAdvogadoId) {
        return { tarefas: [], total: 0, page, pageSize, totalPages: 0 };
    }

    if (search) {
        where.OR = [
            { titulo: { contains: search, mode: "insensitive" } },
            { descricao: { contains: search, mode: "insensitive" } },
        ];
    }
    if (status) where.status = status;
    if (prioridade) where.prioridade = prioridade;
    if (advogadoId) where.advogadoId = advogadoId;
    if (scopedAdvogadoId) where.advogadoId = scopedAdvogadoId;
    if (processoId) where.processoId = processoId;

    const [tarefas, total] = await Promise.all([
        db.tarefa.findMany({
            where,
            include: {
                advogado: { include: { user: { select: { name: true } } } },
                processo: { select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } } },
                _count: { select: { comentarios: true, checklist: true } },
            },
            orderBy: [{ prioridade: "asc" }, { dataLimite: "asc" }, { createdAt: "desc" }],
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        db.tarefa.count({ where }),
    ]);

    return { tarefas, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getTarefasKanban(advogadoId?: string, scope?: TarefaVisibilityScope) {
    const where: Record<string, unknown> = {
        status: { notIn: ["CANCELADA"] },
    };
    const scopedAdvogadoId = getScopedAdvogadoId(scope);

    if (scope?.role === "ADVOGADO" && !scopedAdvogadoId) {
        return {
            A_FAZER: [],
            EM_ANDAMENTO: [],
            REVISAO: [],
            CONCLUIDA: [],
        };
    }
    if (advogadoId) where.advogadoId = advogadoId;
    if (scopedAdvogadoId) where.advogadoId = scopedAdvogadoId;

    const tarefas = await db.tarefa.findMany({
        where,
        include: {
            advogado: { include: { user: { select: { name: true } } } },
            processo: { select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } } },
            _count: { select: { comentarios: true, checklist: true } },
        },
        orderBy: [{ prioridade: "asc" }, { dataLimite: "asc" }],
        take: 200,
    });

    return {
        A_FAZER: tarefas.filter(t => t.status === "A_FAZER"),
        EM_ANDAMENTO: tarefas.filter(t => t.status === "EM_ANDAMENTO"),
        REVISAO: tarefas.filter(t => t.status === "REVISAO"),
        CONCLUIDA: tarefas.filter(t => t.status === "CONCLUIDA"),
    };
}

export async function getTarefaById(id: string, scope?: TarefaVisibilityScope) {
    const scopedAdvogadoId = getScopedAdvogadoId(scope);
    if (scope?.role === "ADVOGADO" && !scopedAdvogadoId) return null;

    return db.tarefa.findFirst({
        where: { id, ...(scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {}) },
        include: {
            advogado: { include: { user: true } },
            processo: { select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } } },
            comentarios: { orderBy: { createdAt: "desc" }, take: 50 },
            checklist: { orderBy: { ordem: "asc" } },
            registrosHora: { orderBy: { data: "desc" }, take: 20 },
        },
    });
}

export async function getTarefaStats(advogadoId?: string, scope?: TarefaVisibilityScope) {
    const scopedAdvogadoId = getScopedAdvogadoId(scope);
    if (scope?.role === "ADVOGADO" && !scopedAdvogadoId) {
        return {
            total: 0,
            aFazer: 0,
            emAndamento: 0,
            revisao: 0,
            concluidas: 0,
            taskscore: 0,
        };
    }

    const resolvedAdvogadoId = scopedAdvogadoId || advogadoId;
    const where = resolvedAdvogadoId ? { advogadoId: resolvedAdvogadoId } : {};

    const [total, aFazer, emAndamento, revisao, concluidas, pontosTotal] = await Promise.all([
        db.tarefa.count({ where }),
        db.tarefa.count({ where: { ...where, status: "A_FAZER" } }),
        db.tarefa.count({ where: { ...where, status: "EM_ANDAMENTO" } }),
        db.tarefa.count({ where: { ...where, status: "REVISAO" } }),
        db.tarefa.count({ where: { ...where, status: "CONCLUIDA" } }),
        db.tarefa.aggregate({
            where: { ...where, status: "CONCLUIDA" },
            _sum: { pontos: true },
        }),
    ]);

    return {
        total,
        aFazer,
        emAndamento,
        revisao,
        concluidas,
        taskscore: pontosTotal._sum.pontos || 0,
    };
}

