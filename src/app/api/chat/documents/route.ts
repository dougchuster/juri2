import { NextResponse } from "next/server";

import { getChatAuthOrThrow } from "@/lib/chat/auth";
import { chatErrorResponse } from "@/lib/chat/http";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/documents
 *
 * Browse system documents & folders for sharing in chat.
 *
 * Query params:
 *   pastaId  — filter documents inside a specific folder (omit for root)
 *   search   — search documents by title
 *   page     — pagination (default 1)
 */
export async function GET(request: Request) {
  try {
    await getChatAuthOrThrow();

    const { searchParams } = new URL(request.url);
    const pastaId = searchParams.get("pastaId") || null;
    const search = searchParams.get("search") || "";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = 30;

    // Build document filter
    const docWhere: Record<string, unknown> = {};
    if (pastaId) {
      docWhere.pastaId = pastaId;
    } else if (!search) {
      // When not searching and no folder selected, show root-level docs (no pasta)
      docWhere.pastaId = null;
    }
    if (search) {
      docWhere.OR = [
        { titulo: { contains: search, mode: "insensitive" } },
        { arquivoNome: { contains: search, mode: "insensitive" } },
        { processo: { numeroCnj: { contains: search } } },
      ];
    }

    // Fetch folders (subfolders of current pastaId) & documents in parallel
    const [pastas, documentos, total] = await Promise.all([
      // Only fetch folders when not searching
      search
        ? []
        : db.pastaDocumento.findMany({
            where: { parentId: pastaId ?? null },
            orderBy: { nome: "asc" },
            select: {
              id: true,
              nome: true,
              parentId: true,
              _count: { select: { documentos: true, subPastas: true } },
            },
          }),

      db.documento.findMany({
        where: docWhere,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          titulo: true,
          arquivoUrl: true,
          arquivoNome: true,
          arquivoTamanho: true,
          mimeType: true,
          updatedAt: true,
          categoria: { select: { id: true, nome: true, cor: true } },
          pasta: { select: { id: true, nome: true } },
          processo: {
            select: {
              id: true,
              numeroCnj: true,
              cliente: { select: { nome: true } },
            },
          },
        },
      }),

      db.documento.count({ where: docWhere }),
    ]);

    // If navigating into a subfolder, get parent info for breadcrumb
    let currentFolder: { id: string; nome: string; parentId: string | null } | null = null;
    if (pastaId) {
      currentFolder = await db.pastaDocumento.findUnique({
        where: { id: pastaId },
        select: { id: true, nome: true, parentId: true },
      });
    }

    return NextResponse.json({
      pastas,
      documentos,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
      currentFolder,
    });
  } catch (error) {
    return chatErrorResponse(error, "Erro ao buscar documentos.");
  }
}
