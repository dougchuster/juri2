import type { Prisma, LgpdRequestStatus, LgpdRequestType } from "@/generated/prisma";
import { db } from "@/lib/db";

export type LgpdRequestFilters = {
    status?: LgpdRequestStatus;
    requestType?: LgpdRequestType;
    query?: string;
};

export type LgpdRequestListItem = {
    id: string;
    cliente: {
        id: string;
        nome: string;
        email: string | null;
        whatsapp: string | null;
        celular: string | null;
        status: string;
        marketingConsent: boolean;
        marketingConsentAt: string | null;
        anonymizedAt: string | null;
    };
    requestType: LgpdRequestType;
    status: LgpdRequestStatus;
    legalBasis: string | null;
    notes: string | null;
    resolutionNotes: string | null;
    openedAt: string;
    startedAt: string | null;
    completedAt: string | null;
    requestedBy: {
        id: string;
        name: string;
        role: string;
    } | null;
    assignedTo: {
        id: string;
        name: string;
        role: string;
    } | null;
    latestExport: {
        id: string;
        fileName: string;
        fileUrl: string;
        expiresAt: string;
        generatedAt: string;
        payloadSizeBytes: number;
        generatedBy: {
            id: string;
            name: string;
            role: string;
        } | null;
    } | null;
};

export type LgpdConsentHistoryItem = {
    id: string;
    cliente: {
        id: string;
        nome: string;
        email: string | null;
        marketingConsent: boolean;
        marketingConsentAt: string | null;
    };
    actionType: "CONSENTIMENTO" | "REVOGACAO_CONSENTIMENTO";
    details: string | null;
    createdAt: string;
    requestedBy: {
        id: string;
        name: string;
        role: string;
    } | null;
};

export type LgpdClientOption = {
    id: string;
    nome: string;
    email: string | null;
    whatsapp: string | null;
    status: string;
    marketingConsent: boolean;
    anonymizedAt: string | null;
};

function buildLgpdRequestWhere(filters: LgpdRequestFilters): Prisma.LgpdRequestWhereInput {
    const where: Prisma.LgpdRequestWhereInput = {};

    if (filters.status) where.status = filters.status;
    if (filters.requestType) where.requestType = filters.requestType;

    if (filters.query) {
        const query = filters.query.trim();
        where.OR = [
            { id: { contains: query, mode: "insensitive" } },
            { legalBasis: { contains: query, mode: "insensitive" } },
            { notes: { contains: query, mode: "insensitive" } },
            { resolutionNotes: { contains: query, mode: "insensitive" } },
            { cliente: { nome: { contains: query, mode: "insensitive" } } },
            { cliente: { email: { contains: query, mode: "insensitive" } } },
            { requestedBy: { name: { contains: query, mode: "insensitive" } } },
            { assignedTo: { name: { contains: query, mode: "insensitive" } } },
        ];
    }

    return where;
}

export async function listLgpdRequests(filters: LgpdRequestFilters, limit = 50): Promise<LgpdRequestListItem[]> {
    const items = await db.lgpdRequest.findMany({
        where: buildLgpdRequestWhere(filters),
        include: {
            cliente: {
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    whatsapp: true,
                    celular: true,
                    status: true,
                    marketingConsent: true,
                    marketingConsentAt: true,
                    anonymizedAt: true,
                },
            },
            requestedBy: {
                select: { id: true, name: true, role: true },
            },
            assignedTo: {
                select: { id: true, name: true, role: true },
            },
            exports: {
                take: 1,
                orderBy: { generatedAt: "desc" },
                select: {
                    id: true,
                    fileName: true,
                    fileUrl: true,
                    expiresAt: true,
                    generatedAt: true,
                    payloadSizeBytes: true,
                    generatedBy: {
                        select: { id: true, name: true, role: true },
                    },
                },
            },
        },
        orderBy: [{ updatedAt: "desc" }, { openedAt: "desc" }],
        take: limit,
    });

    return items.map((item) => ({
        id: item.id,
        cliente: {
            id: item.cliente.id,
            nome: item.cliente.nome,
            email: item.cliente.email,
            whatsapp: item.cliente.whatsapp,
            celular: item.cliente.celular,
            status: item.cliente.status,
            marketingConsent: item.cliente.marketingConsent,
            marketingConsentAt: item.cliente.marketingConsentAt?.toISOString() || null,
            anonymizedAt: item.cliente.anonymizedAt?.toISOString() || null,
        },
        requestType: item.requestType,
        status: item.status,
        legalBasis: item.legalBasis,
        notes: item.notes,
        resolutionNotes: item.resolutionNotes,
        openedAt: item.openedAt.toISOString(),
        startedAt: item.startedAt?.toISOString() || null,
        completedAt: item.completedAt?.toISOString() || null,
        requestedBy: item.requestedBy
            ? {
                  id: item.requestedBy.id,
                  name: item.requestedBy.name,
                  role: item.requestedBy.role,
              }
            : null,
        assignedTo: item.assignedTo
            ? {
                  id: item.assignedTo.id,
                  name: item.assignedTo.name,
                  role: item.assignedTo.role,
              }
            : null,
        latestExport: item.exports[0]
            ? {
                  id: item.exports[0].id,
                  fileName: item.exports[0].fileName,
                  fileUrl: item.exports[0].fileUrl,
                  expiresAt: item.exports[0].expiresAt.toISOString(),
                  generatedAt: item.exports[0].generatedAt.toISOString(),
                  payloadSizeBytes: item.exports[0].payloadSizeBytes,
                  generatedBy: item.exports[0].generatedBy
                      ? {
                            id: item.exports[0].generatedBy.id,
                            name: item.exports[0].generatedBy.name,
                            role: item.exports[0].generatedBy.role,
                        }
                      : null,
              }
            : null,
    }));
}

export async function getLgpdRequestSummary(filters: LgpdRequestFilters) {
    const baseWhere = buildLgpdRequestWhere(filters);

    const [total, abertas, emAnalise, emAtendimento, concluidas, canceladas] = await Promise.all([
        db.lgpdRequest.count({ where: baseWhere }),
        db.lgpdRequest.count({ where: { AND: [baseWhere, { status: "ABERTA" }] } }),
        db.lgpdRequest.count({ where: { AND: [baseWhere, { status: "EM_ANALISE" }] } }),
        db.lgpdRequest.count({ where: { AND: [baseWhere, { status: "EM_ATENDIMENTO" }] } }),
        db.lgpdRequest.count({ where: { AND: [baseWhere, { status: "CONCLUIDA" }] } }),
        db.lgpdRequest.count({ where: { AND: [baseWhere, { status: "CANCELADA" }] } }),
    ]);

    return {
        total,
        abertas,
        emAnalise,
        emAtendimento,
        concluidas,
        canceladas,
    };
}

export async function getLgpdConsentMetrics() {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [activeTotal, grantedLast30Days, revokedLast30Days] = await Promise.all([
        db.cliente.count({ where: { marketingConsent: true } }),
        db.cRMLGPDEvent.count({
            where: {
                actionType: "CONSENTIMENTO",
                createdAt: { gte: last30Days },
            },
        }),
        db.cRMLGPDEvent.count({
            where: {
                actionType: "REVOGACAO_CONSENTIMENTO",
                createdAt: { gte: last30Days },
            },
        }),
    ]);

    return {
        activeTotal,
        grantedLast30Days,
        revokedLast30Days,
    };
}

export async function listLgpdConsentHistory(limit = 20, query?: string): Promise<LgpdConsentHistoryItem[]> {
    const where: Prisma.CRMLGPDEventWhereInput = {
        actionType: { in: ["CONSENTIMENTO", "REVOGACAO_CONSENTIMENTO"] },
    };

    if (query?.trim()) {
        const normalized = query.trim();
        where.OR = [
            { cliente: { nome: { contains: normalized, mode: "insensitive" } } },
            { cliente: { email: { contains: normalized, mode: "insensitive" } } },
            { details: { contains: normalized, mode: "insensitive" } },
        ];
    }

    const items = await db.cRMLGPDEvent.findMany({
        where,
        include: {
            cliente: {
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    marketingConsent: true,
                    marketingConsentAt: true,
                },
            },
            requestedBy: {
                select: { id: true, name: true, role: true },
            },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
    });

    return items.map((item) => ({
        id: item.id,
        cliente: {
            id: item.cliente.id,
            nome: item.cliente.nome,
            email: item.cliente.email,
            marketingConsent: item.cliente.marketingConsent,
            marketingConsentAt: item.cliente.marketingConsentAt?.toISOString() || null,
        },
        actionType: item.actionType as LgpdConsentHistoryItem["actionType"],
        details: item.details,
        createdAt: item.createdAt.toISOString(),
        requestedBy: item.requestedBy
            ? {
                  id: item.requestedBy.id,
                  name: item.requestedBy.name,
                  role: item.requestedBy.role,
              }
            : null,
    }));
}

export async function listLgpdRequestClientOptions(limit = 80): Promise<LgpdClientOption[]> {
    const items = await db.cliente.findMany({
        select: {
            id: true,
            nome: true,
            email: true,
            whatsapp: true,
            status: true,
            marketingConsent: true,
            anonymizedAt: true,
        },
        orderBy: [{ updatedAt: "desc" }, { nome: "asc" }],
        take: limit,
    });

    return items.map((item) => ({
        id: item.id,
        nome: item.nome,
        email: item.email,
        whatsapp: item.whatsapp,
        status: item.status,
        marketingConsent: item.marketingConsent,
        anonymizedAt: item.anonymizedAt?.toISOString() || null,
    }));
}
