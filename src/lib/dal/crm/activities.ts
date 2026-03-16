import "server-only";
import { db } from "@/lib/db";
import { CRMActivityOutcome, CRMActivityType, Prisma } from "@/generated/prisma";

export type CRMActivityFilters = {
    escritorioId: string;
    cardId?: string;
    clienteId?: string;
    ownerId?: string;
    outcome?: CRMActivityOutcome;
    type?: CRMActivityType;
    page?: number;
    pageSize?: number;
    scopeWhere?: Prisma.CRMActivityWhereInput;
};

export async function listCRMActivities(filters: CRMActivityFilters) {
    const {
        escritorioId,
        cardId,
        clienteId,
        ownerId,
        outcome,
        type,
        page = 1,
        pageSize = 50,
        scopeWhere,
    } = filters;

    const baseWhere: Prisma.CRMActivityWhereInput = {
        escritorioId,
        ...(cardId ? { cardId } : {}),
        ...(clienteId ? { clienteId } : {}),
        ...(ownerId ? { ownerId } : {}),
        ...(outcome ? { outcome } : {}),
        ...(type ? { type } : {}),
    };
    const where: Prisma.CRMActivityWhereInput =
        scopeWhere && Object.keys(scopeWhere).length > 0
            ? { AND: [baseWhere, scopeWhere] }
            : baseWhere;

    const [items, total] = await Promise.all([
        db.cRMActivity.findMany({
            where,
            include: {
                owner: { select: { id: true, name: true, role: true } },
                cliente: { select: { id: true, nome: true, email: true, celular: true, whatsapp: true } },
                card: { select: { id: true, title: true, stage: true, status: true } },
                processo: { select: { id: true, numeroCnj: true, status: true } },
            },
            orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        db.cRMActivity.count({ where }),
    ]);

    return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
}

export type CreateCRMActivityInput = {
    escritorioId: string;
    type: CRMActivityType;
    subject: string;
    description?: string;
    scheduledAt?: Date;
    completedAt?: Date;
    outcome?: CRMActivityOutcome;
    nextStep?: string;
    ownerId?: string;
    clienteId?: string;
    cardId?: string;
    processoId?: string;
};

export async function createCRMActivity(data: CreateCRMActivityInput) {
    const activity = await db.cRMActivity.create({
        data: {
            ...data,
            outcome: data.outcome || CRMActivityOutcome.PENDENTE,
        },
        include: {
            owner: { select: { id: true, name: true, role: true } },
            cliente: { select: { id: true, nome: true, email: true, celular: true, whatsapp: true } },
            card: { select: { id: true, title: true, stage: true, status: true } },
            processo: { select: { id: true, numeroCnj: true, status: true } },
        },
    });

    if (data.clienteId) {
        await db.cliente.update({
            where: { id: data.clienteId },
            data: { lastContactAt: data.completedAt || data.scheduledAt || new Date() },
        });
    }

    if (data.cardId) {
        const contactAt = data.completedAt || data.scheduledAt || new Date();
        const shouldRegisterFirstResponse =
            Boolean(data.completedAt) || (data.outcome && data.outcome !== CRMActivityOutcome.PENDENTE);

        await db.cRMCard.update({
            where: { id: data.cardId },
            data: {
                lastContactAt: contactAt,
            },
        });

        if (shouldRegisterFirstResponse) {
            await db.cRMCard.updateMany({
                where: {
                    id: data.cardId,
                    firstResponseAt: null,
                },
                data: {
                    firstResponseAt: contactAt,
                },
            });
        }
    }

    return activity;
}

export async function updateCRMActivity(id: string, data: Prisma.CRMActivityUpdateInput) {
    const updated = await db.cRMActivity.update({
        where: { id },
        data,
        include: {
            owner: { select: { id: true, name: true, role: true } },
            cliente: { select: { id: true, nome: true, email: true, celular: true, whatsapp: true } },
            card: { select: { id: true, title: true, stage: true, status: true } },
            processo: { select: { id: true, numeroCnj: true, status: true } },
        },
    });

    if (updated.cardId) {
        const contactAt = updated.completedAt || updated.scheduledAt || new Date();
        const shouldRegisterFirstResponse = updated.outcome !== CRMActivityOutcome.PENDENTE;

        await db.cRMCard.update({
            where: { id: updated.cardId },
            data: {
                lastContactAt: contactAt,
            },
        });

        if (shouldRegisterFirstResponse) {
            await db.cRMCard.updateMany({
                where: {
                    id: updated.cardId,
                    firstResponseAt: null,
                },
                data: {
                    firstResponseAt: contactAt,
                },
            });
        }
    }

    if (updated.clienteId) {
        await db.cliente.update({
            where: { id: updated.clienteId },
            data: {
                lastContactAt: updated.completedAt || updated.scheduledAt || new Date(),
            },
        });
    }

    return updated;
}

export async function deleteCRMActivity(id: string) {
    return db.cRMActivity.delete({ where: { id } });
}
