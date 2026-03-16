import "server-only";
import { db } from "@/lib/db";

export interface RelatorioFilters {
    de?: Date;
    ate?: Date;
    advogadoId?: string;
}

export async function getRelatorioClientes(filters: RelatorioFilters = {}) {
    const { de, ate, advogadoId } = filters;
    return db.cliente.findMany({
        where: {
            ...(de || ate ? { createdAt: { ...(de ? { gte: de } : {}), ...(ate ? { lte: ate } : {}) } } : {}),
        },
        select: {
            id: true, nome: true, tipoPessoa: true, status: true, email: true, telefone: true,
            crmRelationship: true, createdAt: true,
            processos: { select: { id: true }, where: { status: { notIn: ["ENCERRADO", "ARQUIVADO"] } } },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
    });
}

export async function getRelatorioProcessos(filters: RelatorioFilters = {}) {
    const { de, ate, advogadoId } = filters;
    return db.processo.findMany({
        where: {
            ...(advogadoId ? { advogadoId } : {}),
            ...(de || ate ? { createdAt: { ...(de ? { gte: de } : {}), ...(ate ? { lte: ate } : {}) } } : {}),
        },
        select: {
            id: true, numeroCnj: true, tipo: true, status: true, resultado: true,
            valorCausa: true, dataDistribuicao: true, createdAt: true,
            cliente: { select: { nome: true } },
            advogado: { select: { oab: true, user: { select: { name: true } } } },
            tipoAcao: { select: { nome: true } },
            faseProcessual: { select: { nome: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
    });
}

export async function getRelatorioTarefas(filters: RelatorioFilters = {}) {
    const { de, ate, advogadoId } = filters;
    return db.tarefa.findMany({
        where: {
            ...(advogadoId ? { advogadoId } : {}),
            ...(de || ate ? { createdAt: { ...(de ? { gte: de } : {}), ...(ate ? { lte: ate } : {}) } } : {}),
        },
        select: {
            id: true, titulo: true, status: true, prioridade: true, pontos: true,
            dataLimite: true, concluidaEm: true, categoriaEntrega: true, createdAt: true,
            advogado: { select: { user: { select: { name: true } } } },
            processo: { select: { numeroCnj: true, cliente: { select: { nome: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
    });
}

export async function getRelatorioPrazos(filters: RelatorioFilters = {}) {
    const { de, ate, advogadoId } = filters;
    return db.prazo.findMany({
        where: {
            ...(advogadoId ? { advogadoId } : {}),
            ...(de || ate ? { createdAt: { ...(de ? { gte: de } : {}), ...(ate ? { lte: ate } : {}) } } : {}),
        },
        select: {
            id: true, descricao: true, dataFatal: true, status: true, origem: true, createdAt: true,
            advogado: { select: { user: { select: { name: true } } } },
            processo: { select: { numeroCnj: true, cliente: { select: { nome: true } } } },
        },
        orderBy: { dataFatal: "asc" },
        take: 500,
    });
}

export async function getRelatorioPublicacoes(filters: RelatorioFilters = {}) {
    const { de, ate } = filters;
    return db.publicacao.findMany({
        where: {
            ...(de || ate ? { dataPublicacao: { ...(de ? { gte: de } : {}), ...(ate ? { lte: ate } : {}) } } : {}),
        },
        select: {
            id: true, tribunal: true, dataPublicacao: true,
            status: true, importadaEm: true,
            processo: { select: { numeroCnj: true, cliente: { select: { nome: true } } } },
        },
        orderBy: { dataPublicacao: "desc" },
        take: 500,
    });
}

export async function getRelatorioStats(filters: RelatorioFilters = {}) {
    const { de, ate } = filters;
    const dateFilter = de || ate ? {
        createdAt: { ...(de ? { gte: de } : {}), ...(ate ? { lte: ate } : {}) }
    } : {};

    const [clientes, processos, tarefas, prazos, publicacoes] = await Promise.all([
        db.cliente.count({ where: dateFilter }),
        db.processo.count({ where: dateFilter }),
        db.tarefa.count({ where: dateFilter }),
        db.prazo.count({ where: dateFilter }),
        db.publicacao.count({ where: de || ate
            ? { dataPublicacao: { ...(de ? { gte: de } : {}), ...(ate ? { lte: ate } : {}) } }
            : {} }),
    ]);

    return { clientes, processos, tarefas, prazos, publicacoes };
}
