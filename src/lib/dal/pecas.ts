import { db } from "@/lib/db";

export interface PecaFilters {
    tipoPeca?: string;
    area?: string;
    status?: string;
    processoId?: string;
    clienteId?: string;
    page?: number;
    pageSize?: number;
}

export async function getPecasIA(filters: PecaFilters = {}, userId?: string) {
    const { tipoPeca, area, status, processoId, clienteId, page = 1, pageSize = 10 } = filters;

    const where: Record<string, unknown> = {};
    if (tipoPeca) where.tipoPeca = tipoPeca;
    if (area) where.area = area;
    if (status) where.status = status;
    if (processoId) where.processoId = processoId;
    if (clienteId) where.clienteId = clienteId;
    if (userId) where.criadoPorId = userId;

    const [pecas, total] = await Promise.all([
        db.pecaIA.findMany({
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
        db.pecaIA.count({ where }),
    ]);

    return { pecas, total, page, totalPages: Math.ceil(total / pageSize) };
}

export async function getPecaStats(userId?: string) {
    const where = userId ? { criadoPorId: userId } : {};

    const [total, geradas, rascunhos, finalizadas] = await Promise.all([
        db.pecaIA.count({ where }),
        db.pecaIA.count({ where: { ...where, status: "GERADA" } }),
        db.pecaIA.count({ where: { ...where, status: "RASCUNHO" } }),
        db.pecaIA.count({ where: { ...where, status: "FINALIZADA" } }),
    ]);

    return { total, geradas, rascunhos, finalizadas };
}

export async function getPecaById(id: string) {
    return db.pecaIA.findUnique({
        where: { id },
        include: {
            processo: { select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } } },
            cliente: { select: { id: true, nome: true } },
            criadoPor: { select: { name: true } },
        },
    });
}
