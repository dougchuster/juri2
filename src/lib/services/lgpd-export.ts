import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { PrismaClient } from "@/generated/prisma";
import { buildLgpdExportFileName, calculateLgpdExportExpiry } from "@/lib/services/lgpd-export-core";

type PrismaLike = PrismaClient;

async function ensureExportDirectory(generatedAt: Date) {
    const year = String(generatedAt.getUTCFullYear());
    const month = String(generatedAt.getUTCMonth() + 1).padStart(2, "0");
    const dir = path.join(process.cwd(), "storage", "lgpd-exports", year, month);
    await fs.mkdir(dir, { recursive: true });
    return dir;
}

async function buildClienteExportSnapshot(db: PrismaLike, clienteId: string) {
    const [cliente, processos, atendimentos, compromissos, crmCards, crmActivities, crmDocuments, conversations, lgpdEvents, lgpdRequests] =
        await Promise.all([
            db.cliente.findUnique({
                where: { id: clienteId },
                include: {
                    origem: true,
                    contactTags: { include: { tag: true } },
                    phones: true,
                },
            }),
            db.processo.findMany({
                where: { clienteId },
                select: {
                    id: true,
                    numeroCnj: true,
                    tipo: true,
                    status: true,
                    resultado: true,
                    tribunal: true,
                    valorCausa: true,
                    dataDistribuicao: true,
                    dataEncerramento: true,
                    dataUltimaMovimentacao: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { updatedAt: "desc" },
            }),
            db.atendimento.findMany({
                where: { clienteId },
                select: {
                    id: true,
                    assunto: true,
                    status: true,
                    canal: true,
                    areaJuridica: true,
                    subareaJuridica: true,
                    dataReuniao: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { updatedAt: "desc" },
            }),
            db.compromisso.findMany({
                where: { clienteId },
                select: {
                    id: true,
                    titulo: true,
                    tipo: true,
                    dataInicio: true,
                    dataFim: true,
                    statusConfirmacao: true,
                    createdAt: true,
                },
                orderBy: { dataInicio: "desc" },
            }),
            db.cRMCard.findMany({
                where: { clienteId },
                select: {
                    id: true,
                    title: true,
                    stage: true,
                    status: true,
                    areaDireito: true,
                    probability: true,
                    value: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { updatedAt: "desc" },
            }),
            db.cRMActivity.findMany({
                where: { clienteId },
                select: {
                    id: true,
                    type: true,
                    subject: true,
                    outcome: true,
                    scheduledAt: true,
                    completedAt: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { createdAt: "desc" },
            }),
            db.cRMCommercialDocument.findMany({
                where: { clienteId },
                select: {
                    id: true,
                    type: true,
                    nome: true,
                    descricao: true,
                    fileUrl: true,
                    signedAt: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
            }),
            db.conversation.findMany({
                where: { clienteId },
                select: {
                    id: true,
                    canal: true,
                    status: true,
                    subject: true,
                    lastMessageAt: true,
                    unreadCount: true,
                    createdAt: true,
                    messages: {
                        take: 20,
                        orderBy: { createdAt: "desc" },
                        select: {
                            id: true,
                            direction: true,
                            content: true,
                            status: true,
                            sentAt: true,
                            createdAt: true,
                        },
                    },
                },
                orderBy: { updatedAt: "desc" },
            }),
            db.cRMLGPDEvent.findMany({
                where: { clienteId },
                select: {
                    id: true,
                    actionType: true,
                    details: true,
                    createdAt: true,
                    requestedBy: { select: { id: true, name: true, role: true } },
                },
                orderBy: { createdAt: "desc" },
            }),
            db.lgpdRequest.findMany({
                where: { clienteId },
                select: {
                    id: true,
                    requestType: true,
                    status: true,
                    legalBasis: true,
                    notes: true,
                    resolutionNotes: true,
                    openedAt: true,
                    startedAt: true,
                    completedAt: true,
                    requestedBy: { select: { id: true, name: true, role: true } },
                    assignedTo: { select: { id: true, name: true, role: true } },
                },
                orderBy: { openedAt: "desc" },
            }),
        ]);

    if (!cliente) {
        throw new Error("Titular nao encontrado para exportacao.");
    }

    return {
        generatedAt: new Date().toISOString(),
        titular: cliente,
        processos,
        atendimentos,
        compromissos,
        crm: {
            oportunidades: crmCards,
            atividades: crmActivities,
            documentos: crmDocuments,
        },
        comunicacao: conversations,
        lgpd: {
            eventos: lgpdEvents,
            solicitacoes: lgpdRequests,
        },
    };
}

export async function generateLgpdDataExport(db: PrismaLike, input: {
    requestId: string;
    actorUserId: string;
}) {
    const request = await db.lgpdRequest.findUnique({
        where: { id: input.requestId },
        include: {
            cliente: {
                select: { id: true, nome: true },
            },
        },
    });

    if (!request) {
        throw new Error("Solicitacao LGPD nao encontrada.");
    }

    const generatedAt = new Date();
    const expiresAt = calculateLgpdExportExpiry(generatedAt);
    const payload = await buildClienteExportSnapshot(db, request.clienteId);
    const content = JSON.stringify(payload, null, 2);

    const dir = await ensureExportDirectory(generatedAt);
    const exportId = crypto.randomUUID();
    const fileName = buildLgpdExportFileName({
        clienteNome: request.cliente.nome,
        requestId: request.id,
        generatedAt,
    });
    const filePath = path.join(dir, fileName);
    await fs.writeFile(filePath, content, "utf8");

    const exportRow = await db.lgpdDataExport.create({
        data: {
            id: exportId,
            requestId: request.id,
            fileName,
            filePath,
            fileUrl: `/api/admin/lgpd/exports/${exportId}`,
            contentType: "application/json",
            payloadSizeBytes: Buffer.byteLength(content, "utf8"),
            expiresAt,
            generatedById: input.actorUserId,
        },
    });

    return {
        request,
        exportRow,
    };
}
