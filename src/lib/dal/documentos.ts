import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";

export async function getModelosDocumento() {
    return db.modeloDocumento.findMany({
        where: { ativo: true },
        include: { _count: { select: { variaveis: true } }, categoria: { select: { id: true, nome: true } } },
        orderBy: { nome: "asc" },
    });
}

export async function getDocumentos(filters: { search?: string; categoriaId?: string; pastaId?: string; page?: number } = {}) {
    const { search, categoriaId, pastaId, page = 1, pageSize = 20 } = { pageSize: 20, ...filters };
    const where: Record<string, unknown> = {};

    if (search) {
        where.OR = [
            { titulo: { contains: search, mode: "insensitive" } },
            { processo: { numeroCnj: { contains: search } } },
        ];
    }
    if (categoriaId) where.categoriaId = categoriaId;
    if (pastaId) where.pastaId = pastaId;

    const [documentos, total] = await Promise.all([
        db.documento.findMany({
            where,
            include: {
                processo: { select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } } },
                categoria: { select: { id: true, nome: true, cor: true } },
                pasta: { select: { id: true, nome: true } },
                _count: {
                    select: {
                        versoes: true,
                        comentariosRevisao: true,
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        db.documento.count({ where }),
    ]);

    return { documentos, total, page, totalPages: Math.ceil(total / pageSize) };
}

export async function getDocumentoStats() {
    const [total, categorias] = await Promise.all([
        db.documento.count(),
        db.documento.groupBy({
            by: ["categoriaId"],
            _count: true,
            orderBy: { _count: { categoriaId: "desc" } },
        }),
    ]);

    const modelos = await db.modeloDocumento.count({ where: { ativo: true } });

    return { total, modelos, categorias: categorias.map(c => ({ nome: c.categoriaId, count: c._count })) };
}

export async function getDocumentoById(id: string) {
    return db.documento.findUnique({
        where: { id },
        include: {
            processo: { select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } } },
            categoria: { select: { id: true, nome: true, cor: true } },
            pasta: { select: { id: true, nome: true } },
            versaoAtual: {
                select: {
                    id: true,
                    numero: true,
                    statusFluxo: true,
                    origem: true,
                    titulo: true,
                    conteudo: true,
                    arquivoUrl: true,
                    arquivoNome: true,
                    arquivoTamanho: true,
                    mimeType: true,
                    categoriaId: true,
                    categoriaNome: true,
                    pastaId: true,
                    pastaNome: true,
                    resumoAlteracoes: true,
                    restauradaDaVersaoId: true,
                    criadoPorUserId: true,
                    criadoPorNome: true,
                    publicadaEm: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },
            versaoPublicada: {
                select: {
                    id: true,
                    numero: true,
                    publicadaEm: true,
                    statusFluxo: true,
                },
            },
            versoes: {
                orderBy: { numero: "desc" },
                include: {
                    comentariosRevisao: {
                        orderBy: { createdAt: "desc" },
                    },
                },
            },
            _count: {
                select: {
                    versoes: true,
                    comentariosRevisao: true,
                },
            },
        },
    });
}

// Novas funções para suporte a Categorias Dinâmicas e Pastas

export async function getCategoriasDocumento() {
    if (!db.categoriaDocumento || !db.categoriaDocumento.findMany) return [];
    return db.categoriaDocumento.findMany({
        orderBy: { nome: "asc" }
    });
}

export async function getPastasDocumento(parentId?: string | null) {
    if (!db.pastaDocumento || !db.pastaDocumento.findMany) return [];

    const where: Prisma.PastaDocumentoWhereInput = {};
    if (parentId !== undefined) {
        where.parentId = parentId;
    }
    return db.pastaDocumento.findMany({
        where,
        orderBy: { nome: "asc" }
    });
}
