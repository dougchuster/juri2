"server-only";

import { db } from "@/lib/db";

export interface AndamentosFilter {
    q?: string;
    advogadoId?: string;
    hasNew?: boolean; // true = com novos (7d), false = sem novos
}

const SETE_DIAS_MS  = 7  * 24 * 60 * 60 * 1000;
const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;

export async function getAndamentosStats() {
    const sete   = new Date(Date.now() - SETE_DIAS_MS);
    const trinta = new Date(Date.now() - TRINTA_DIAS_MS);

    const [total, comNovos, semMovimento] = await Promise.all([
        db.processo.count({
            where: { status: { notIn: ["ENCERRADO", "ARQUIVADO"] } },
        }),
        db.processo.count({
            where: {
                status: { notIn: ["ENCERRADO", "ARQUIVADO"] },
                dataUltimaMovimentacao: { gte: sete },
            },
        }),
        db.processo.count({
            where: {
                status: { notIn: ["ENCERRADO", "ARQUIVADO"] },
                OR: [
                    { dataUltimaMovimentacao: null },
                    { dataUltimaMovimentacao: { lt: trinta } },
                ],
            },
        }),
    ]);

    const capturaPercent = total > 0
        ? Math.round(((total - semMovimento) / total) * 100)
        : 0;

    return { total, comNovos, semMovimento, capturaPercent };
}

export async function getAndamentos(filters: AndamentosFilter = {}) {
    const { q, advogadoId, hasNew } = filters;
    const sete = new Date(Date.now() - SETE_DIAS_MS);

    return db.processo.findMany({
        where: {
            status: { notIn: ["ENCERRADO", "ARQUIVADO"] },
            ...(advogadoId ? { advogadoId } : {}),
            ...(hasNew === true  ? { dataUltimaMovimentacao: { gte: sete } } : {}),
            ...(hasNew === false ? {
                OR: [
                    { dataUltimaMovimentacao: null },
                    { dataUltimaMovimentacao: { lt: sete } },
                ],
            } : {}),
            ...(q ? {
                OR: [
                    { numeroCnj: { contains: q, mode: "insensitive" } },
                    { cliente:   { nome: { contains: q, mode: "insensitive" } } },
                    { objeto:    { contains: q, mode: "insensitive" } },
                ],
            } : {}),
        },
        select: {
            id: true,
            numeroCnj: true,
            status: true,
            objeto: true,
            tribunal: true,
            dataUltimaMovimentacao: true,
            cliente: { select: { id: true, nome: true } },
            advogado: { select: { id: true, user: { select: { name: true } } } },
            partes: {
                where: { tipoParte: "REU" },
                select: { nome: true },
                take: 1,
            },
            // movimentações recentes (últimos 7d) — apenas contagem
            movimentacoes: {
                where: { data: { gte: sete } },
                select: { id: true },
            },
            _count: { select: { movimentacoes: true } },
        },
        orderBy: [
            { dataUltimaMovimentacao: { sort: "desc", nulls: "last" } },
        ],
        take: 300,
    });
}

// Lista simplificada para o selector do modal
export async function getProcessosParaAndamento() {
    return db.processo.findMany({
        where: { status: { notIn: ["ENCERRADO", "ARQUIVADO"] } },
        select: {
            id: true,
            numeroCnj: true,
            objeto: true,
            cliente: { select: { nome: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
    });
}
