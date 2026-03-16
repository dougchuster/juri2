import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";
import { CampaignStatus, CanalComunicacao } from "@/generated/prisma";

export interface CampaignFilters {
    escritorioId: string;
    status?: CampaignStatus;
    canal?: CanalComunicacao;
    page?: number;
    pageSize?: number;
}

export async function getCampaigns(filters: CampaignFilters) {
    const { escritorioId, status, canal, page = 1, pageSize = 10 } = filters;

    const where: Prisma.CampaignWhereInput = { escritorioId };
    if (status) where.status = status;
    if (canal) where.canal = canal;

    const [campaigns, total] = await Promise.all([
        db.campaign.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
                template: { select: { id: true, name: true } },
                segment: { select: { id: true, name: true } },
            },
        }),
        db.campaign.count({ where }),
    ]);

    return {
        campaigns,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
}

export async function getCampaignById(id: string, escritorioId: string) {
    return db.campaign.findFirst({
        where: { id, escritorioId },
        include: {
            template: true,
            segment: true,
            recipients: {
                take: 100,
                orderBy: { id: "desc" } // Order fallbacks to id if createdAt unavailable
            }
        },
    });
}

export async function createCampaign(data: {
    escritorioId: string;
    name: string;
    description?: string;
    canal: CanalComunicacao;
    templateId?: string;
    segmentId?: string;
    listId?: string;
    createdBy: string;
    scheduledAt?: Date;
    rateLimit?: number;
    intervalMs?: number;
    abSubjectB?: string;
    abVariantPercent?: number;
}) {
    return db.campaign.create({
        data: {
            ...data,
            status: data.scheduledAt ? "SCHEDULED" : "DRAFT",
            rateLimit: data.rateLimit || 15,
            intervalMs: data.intervalMs || 4000,
        },
    });
}

export async function updateCampaignStatus(id: string, status: CampaignStatus) {
    const updateData: Prisma.CampaignUpdateInput = { status };
    if (status === "RUNNING") updateData.startedAt = new Date();
    if (status === "COMPLETED" || status === "CANCELLED") updateData.completedAt = new Date();

    return db.campaign.update({
        where: { id },
        data: updateData,
    });
}
