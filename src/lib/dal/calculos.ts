import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";

export interface CalculoFilters {
    tipo?: string;
    processoId?: string;
    clienteId?: string;
    page?: number;
    pageSize?: number;
}

export async function getCalculos(filters: CalculoFilters = {}, userId?: string) {
    const { tipo, processoId, clienteId, page = 1, pageSize = 10 } = filters;

    const where: Record<string, unknown> = {};
    if (tipo) where.tipo = tipo;
    if (processoId) where.processoId = processoId;
    if (clienteId) where.clienteId = clienteId;
    if (userId) where.criadoPorId = userId;

    const [calculos, total] = await Promise.all([
        db.calculo.findMany({
            where,
            include: {
                processo: { select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } } },
                cliente: { select: { id: true, nome: true } },
                criadoPor: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        db.calculo.count({ where }),
    ]);

    return { calculos, total, page, totalPages: Math.ceil(total / pageSize) };
}

export async function getCalculoStats(userId?: string) {
    const where = userId ? { criadoPorId: userId } : {};

    const [total, monetarios, previdenciarios, trabalhistas] = await Promise.all([
        db.calculo.count({ where }),
        db.calculo.count({ where: { ...where, tipo: "MONETARIO" } }),
        db.calculo.count({ where: { ...where, tipo: "PREVIDENCIARIO" } }),
        db.calculo.count({ where: { ...where, tipo: "TRABALHISTA" } }),
    ]);

    return { total, monetarios, previdenciarios, trabalhistas };
}

export async function getCalculoById(id: string) {
    return db.calculo.findUnique({
        where: { id },
        include: {
            processo: { select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } } },
            cliente: { select: { id: true, nome: true } },
            criadoPor: { select: { name: true } },
        },
    });
}
