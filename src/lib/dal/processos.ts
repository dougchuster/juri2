import "server-only";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import type { Role, StatusProcesso, TipoProcesso } from "@/generated/prisma";
import { normalizeMojibake } from "@/lib/text-normalization";
import { cache, CacheKeys } from "@/lib/cache";

async function getDefaultEscritorioId() {
    const e = await db.escritorio.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    return e?.id || null;
}

export interface ProcessoFilters {
    search?: string;
    status?: StatusProcesso;
    tipo?: TipoProcesso;
    advogadoId?: string;
    clienteId?: string;
    faseProcessualId?: string;
    triagem?: "sem_cliente" | "com_cliente";
    page?: number;
    pageSize?: number;
}

export interface ProcessoVisibilityScope {
    role?: Role | null;
    advogadoId?: string | null;
}

function getScopedAdvogadoId(scope?: ProcessoVisibilityScope) {
    if (!scope || scope.role !== "ADVOGADO") return null;
    return scope.advogadoId || null;
}

function dedupeByNormalizedNome<T extends { nome: string }>(items: T[]) {
    const deduped = new Map<string, T>();

    for (const item of items) {
        const nome = normalizeMojibake(item.nome);
        const key = nome.trim().toLocaleLowerCase("pt-BR");
        const normalizedItem = { ...item, nome };
        const existing = deduped.get(key);

        if (!existing || existing.nome !== nome) {
            deduped.set(key, normalizedItem);
        }
    }

    return Array.from(deduped.values());
}

export async function getProcessos(filters: ProcessoFilters = {}, scope?: ProcessoVisibilityScope) {
    const {
        search, status, tipo, advogadoId, clienteId, faseProcessualId, triagem,
        page = 1, pageSize = 10,
    } = filters;

    const where: Record<string, unknown> = {};
    const scopedAdvogadoId = getScopedAdvogadoId(scope);

    if (scope?.role === "ADVOGADO" && !scopedAdvogadoId) {
        return {
            processos: [],
            total: 0,
            page,
            pageSize,
            totalPages: 0,
        };
    }

    if (search) {
        where.OR = [
            { numeroCnj: { contains: search } },
            { objeto: { contains: search, mode: "insensitive" } },
            { cliente: { nome: { contains: search, mode: "insensitive" } } },
            { tribunal: { contains: search, mode: "insensitive" } },
        ];
    }

    if (status) where.status = status;
    if (tipo) where.tipo = tipo;
    if (advogadoId) where.advogadoId = advogadoId;
    if (clienteId) where.clienteId = clienteId;
    if (faseProcessualId) where.faseProcessualId = faseProcessualId;
    if (triagem === "sem_cliente") where.clienteId = null;
    if (triagem === "com_cliente") where.clienteId = { not: null };
    if (scopedAdvogadoId) where.advogadoId = scopedAdvogadoId;

    const [processos, total] = await Promise.all([
        db.processo.findMany({
            where,
            include: {
                cliente: { select: { id: true, nome: true } },
                advogado: { include: { user: { select: { name: true } } } },
                faseProcessual: { select: { id: true, nome: true, cor: true } },
                tipoAcao: { select: { id: true, nome: true } },
                _count: { select: { prazos: true, tarefas: true, movimentacoes: true } },
            },
            orderBy: { updatedAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        db.processo.count({ where }),
    ]);

    return {
        processos,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
}

export async function getProcessoById(id: string, scope?: ProcessoVisibilityScope) {
    const scopedAdvogadoId = getScopedAdvogadoId(scope);
    if (scope?.role === "ADVOGADO" && !scopedAdvogadoId) return null;

    const session = await getSession();
    const escritorioId = session?.escritorioId;
    return db.processo.findFirst({
        where: {
            id,
            ...(escritorioId ? { escritorioId } : {}),
            ...(scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {}),
        },
        include: {
            cliente: true,
            advogado: { include: { user: true } },
            faseProcessual: true,
            tipoAcao: true,
            movimentacoes: { orderBy: { data: "desc" }, take: 50 },
            prazos: {
                include: { advogado: { include: { user: { select: { name: true } } } } },
                orderBy: { dataFatal: "asc" },
                take: 50,
            },
            tarefas: { orderBy: { createdAt: "desc" }, take: 20 },
            audiencias: {
                include: { advogado: { include: { user: { select: { name: true } } } } },
                orderBy: { data: "asc" },
                take: 50,
            },
            documentos: { orderBy: { createdAt: "desc" }, take: 50 },
            honorarios: {
                include: { cliente: { select: { nome: true } } },
                take: 20,
            },
            partes: { orderBy: { tipoParte: "asc" } },
        },
    });
}

export async function getProcessoStats(scope?: ProcessoVisibilityScope) {
    const scopedAdvogadoId = getScopedAdvogadoId(scope);
    if (scope?.role === "ADVOGADO" && !scopedAdvogadoId) {
        return { total: 0, emAndamento: 0, sentenca: 0, encerrados: 0, prazosPendentes: 0 };
    }

    const processoScope = scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {};
    const prazoScope = scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {};

    const [total, emAndamento, sentenca, encerrados, prazosPendentes] = await Promise.all([
        db.processo.count({ where: processoScope }),
        db.processo.count({ where: { ...processoScope, status: "EM_ANDAMENTO" } }),
        db.processo.count({ where: { ...processoScope, status: "SENTENCA" } }),
        db.processo.count({ where: { ...processoScope, status: "ENCERRADO" } }),
        db.prazo.count({ where: { ...prazoScope, status: "PENDENTE" } }),
    ]);

    return { total, emAndamento, sentenca, encerrados, prazosPendentes };
}

export async function getAdvogados() {
    return db.advogado.findMany({
        where: { ativo: true },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { user: { name: "asc" } },
    });
}

export async function getTiposAcao() {
    const escritorioId = await getDefaultEscritorioId();
    const cacheKey = CacheKeys.tiposAcao(escritorioId ?? "default");

    const tipos = await cache.getOrSet(
        cacheKey,
        () => db.tipoAcao.findMany({
            where: escritorioId ? { ativo: true, escritorioId } : { ativo: true },
            orderBy: { nome: "asc" },
        }),
        3600 // 1 hora
    );

    return dedupeByNormalizedNome(tipos).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function getFasesProcessuais() {
    const escritorioId = await getDefaultEscritorioId();
    const cacheKey = CacheKeys.fasesProcessuais(escritorioId ?? "default");

    const fases = await cache.getOrSet(
        cacheKey,
        () => db.faseProcessual.findMany({
            where: escritorioId ? { ativo: true, escritorioId } : { ativo: true },
            orderBy: { ordem: "asc" },
        }),
        3600 // 1 hora
    );

    return dedupeByNormalizedNome(fases).sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
}

/**
 * Retorna lista de feriados (ISO date strings), com cache de 24h.
 * Feriados são dados estáticos — mudam raramente.
 */
export async function getFeriadosIso(): Promise<string[]> {
    const ano = new Date().getFullYear();
    const cacheKey = CacheKeys.feriados(ano);

    return cache.getOrSet(
        cacheKey,
        async () => {
            const feriados = await db.feriado.findMany({ select: { data: true } });
            return feriados.map((f) => f.data.toISOString().split("T")[0]);
        },
        86400 // 24 horas
    );
}

export async function getClientesForSelect() {
    return db.cliente.findMany({
        where: { status: { in: ["ATIVO", "PROSPECTO", "INATIVO"] } },
        select: { id: true, nome: true, cpf: true, cnpj: true },
        orderBy: { nome: "asc" },
    });
}

export async function getDocumentosParaMovimentacao(processoId: string) {
    return db.documento.findMany({
        where: {
            OR: [
                { processoId: null },
                { processoId },
            ],
        },
        select: {
            id: true,
            titulo: true,
            arquivoNome: true,
            processoId: true,
            updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 40,
    });
}
