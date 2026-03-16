"use server";

import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import { registrarLogAuditoria } from "@/lib/services/audit-log";
import {
    DocumentoVersioningError,
    addDocumentoReviewComment,
    approveDocumentoVersion,
    createDocumentoVersion,
    createDocumentoWithInitialVersion,
    deleteDocumentoWithPolicy,
    publishDocumentoVersion,
    resolveDocumentoReviewComment,
    restoreDocumentoVersion,
    submitDocumentoForReview,
} from "@/lib/services/documento-versioning";
import {
    documentoComentarioSchema,
    documentoRestoreSchema,
    documentoVersionSchema,
    type DocumentoComentarioFormData,
    type DocumentoRestoreFormData,
    type DocumentoVersionFormData,
} from "@/lib/validators/documentos";
import { storeWhatsAppMediaFile } from "@/lib/whatsapp/media-storage";

const MAX_DOCUMENT_UPLOAD_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_DOCUMENT_EXTENSIONS = new Set([".pdf", ".docx", ".txt"]);
const MAX_EXTRACTED_CHARS = 40_000;

function normalizeExtractedText(input: string) {
    const normalized = input.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    if (normalized.length <= MAX_EXTRACTED_CHARS) return normalized;
    return normalized.slice(0, MAX_EXTRACTED_CHARS);
}

async function extractDocumentoText(input: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
}): Promise<{ text: string | null; warning: string | null }> {
    const extension = path.extname(input.fileName.toLowerCase());

    if (extension === ".txt" || input.mimeType.toLowerCase().startsWith("text/")) {
        const text = normalizeExtractedText(input.buffer.toString("utf8"));
        return { text: text || null, warning: text ? null : "Arquivo textual sem conteudo legivel." };
    }

    if (extension === ".docx") {
        try {
            const mammoth = (await import("mammoth")).default;
            const result = await mammoth.extractRawText({ buffer: input.buffer });
            const text = normalizeExtractedText(result.value || "");
            return { text: text || null, warning: text ? null : "DOCX sem conteudo textual relevante." };
        } catch {
            return { text: null, warning: "Nao foi possivel extrair texto do DOCX." };
        }
    }

    if (extension === ".pdf") {
        return { text: null, warning: "PDF armazenado sem extracao de texto automatica." };
    }

    return { text: null, warning: "Formato sem extracao textual configurada." };
}

async function getAuditActor() {
    const session = await getSession();
    return {
        userId: session?.id || null,
        nome: session?.name || null,
    };
}

async function getDefaultEscritorioId() {
    const escritorio = await db.escritorio.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
    });
    return escritorio?.id || null;
}

function safeRevalidate(pathname: string) {
    try {
        revalidatePath(pathname);
    } catch (error) {
        console.warn(`[documentos] revalidate skipped for ${pathname}:`, error);
    }
}

function revalidateDocumentoPaths(documentoId: string, processoId?: string | null) {
    safeRevalidate("/documentos");
    safeRevalidate(`/documentos/${documentoId}`);
    if (processoId) {
        safeRevalidate(`/processos/${processoId}`);
    }
}

function getDocumentoActionErrorMessage(error: unknown, fallback: string) {
    if (error instanceof DocumentoVersioningError) return error.message;
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

function buildDocumentoAuditSnapshot(documento: {
    id: string;
    titulo: string;
    statusFluxo?: string | null;
    versao?: number | null;
    processoId?: string | null;
    categoriaId?: string | null;
    pastaId?: string | null;
    versaoAtualId?: string | null;
    versaoPublicadaId?: string | null;
}) {
    return {
        titulo: documento.titulo,
        statusFluxo: documento.statusFluxo || null,
        versao: documento.versao || null,
        processoId: documento.processoId || null,
        categoriaId: documento.categoriaId || null,
        pastaId: documento.pastaId || null,
        versaoAtualId: documento.versaoAtualId || null,
        versaoPublicadaId: documento.versaoPublicadaId || null,
    };
}

const modeloSchema = z.object({
    nome: z.string().min(2, "Nome e obrigatorio"),
    categoriaId: z.string().optional(),
    conteudo: z.string().min(10, "Conteudo e obrigatorio"),
});

export async function createModeloDocumento(formData: z.infer<typeof modeloSchema>) {
    const parsed = modeloSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const escritorio = await db.escritorio.findFirst();
        await db.modeloDocumento.create({
            data: {
                escritorioId: escritorio?.id,
                nome: parsed.data.nome,
                categoriaId: parsed.data.categoriaId,
                conteudo: parsed.data.conteudo,
            },
        });
        safeRevalidate("/documentos");
        return { success: true };
    } catch (error) {
        console.error("Error creating modelo:", error);
        return { success: false, error: { _form: ["Erro ao criar modelo."] } };
    }
}

export async function deleteModeloDocumento(id: string) {
    try {
        await db.modeloDocumento.delete({ where: { id } });
        safeRevalidate("/documentos");
        return { success: true };
    } catch (error) {
        console.error("Error deleting modelo:", error);
        return { success: false, error: "Erro ao excluir modelo." };
    }
}

export async function deleteDocumento(id: string) {
    try {
        const actor = await getAuditActor();
        const deleted = await db.$transaction(async (tx) => {
            const previous = await tx.documento.findUnique({
                where: { id },
                select: {
                    id: true,
                    titulo: true,
                    statusFluxo: true,
                    versao: true,
                    processoId: true,
                    categoriaId: true,
                    pastaId: true,
                    versaoAtualId: true,
                    versaoPublicadaId: true,
                },
            });

            if (!previous) {
                throw new DocumentoVersioningError("Documento nao encontrado.");
            }

            const deletedDocumento = await deleteDocumentoWithPolicy(tx, id);
            await registrarLogAuditoria({
                client: tx,
                actorUserId: actor.userId,
                acao: "DOCUMENTO_EXCLUIDO",
                entidade: "Documento",
                entidadeId: id,
                dadosAntes: buildDocumentoAuditSnapshot(previous),
                dadosDepois: {
                    id: deletedDocumento.id,
                    deletedAt: new Date().toISOString(),
                },
            });

            return deletedDocumento;
        });

        revalidateDocumentoPaths(deleted.id, deleted.processoId);
        return { success: true };
    } catch (error) {
        console.error("Error deleting documento:", error);
        return { success: false, error: getDocumentoActionErrorMessage(error, "Erro ao excluir documento.") };
    }
}

// ==========================================
// Categoria Actions
// ==========================================

export async function createCategoria(data: { nome: string; descricao?: string; cor?: string }) {
    try {
        const escritorio = await db.escritorio.findFirst();
        await db.categoriaDocumento.create({
            data: { ...data, escritorioId: escritorio?.id },
        });
        safeRevalidate("/documentos");
        return { success: true };
    } catch {
        return { success: false, error: "Erro ao criar categoria" };
    }
}

export async function deleteCategoria(id: string) {
    try {
        await db.categoriaDocumento.delete({ where: { id } });
        safeRevalidate("/documentos");
        return { success: true };
    } catch {
        return { success: false, error: "Erro ao deletar categoria" };
    }
}

// ==========================================
// Pasta Actions
// ==========================================

export async function createPasta(data: { nome: string; descricao?: string; parentId?: string }) {
    try {
        const escritorio = await db.escritorio.findFirst();
        await db.pastaDocumento.create({
            data: { ...data, escritorioId: escritorio?.id },
        });
        safeRevalidate("/documentos");
        return { success: true };
    } catch {
        return { success: false, error: "Erro ao criar pasta" };
    }
}

export async function deletePasta(id: string) {
    try {
        await db.pastaDocumento.delete({ where: { id } });
        safeRevalidate("/documentos");
        return { success: true };
    } catch {
        return { success: false, error: "Erro ao deletar pasta" };
    }
}

// ==========================================
// Importacao
// ==========================================

export async function importDocumentoToLibrary(input: {
    file: File;
    pastaId?: string | null;
    processoId?: string | null;
    titulo?: string | null;
    skipMovimentacao?: boolean;
}) {
    const file = input.file;
    const pastaId = input.pastaId || null;
    const processoId = input.processoId || null;
    const tituloInformado = input.titulo?.trim() || null;
    const skipMovimentacao = Boolean(input.skipMovimentacao);

    if (!file) return { success: false, error: "Nenhum arquivo enviado." };
    if (file.size <= 0) return { success: false, error: "Arquivo vazio." };
    if (file.size > MAX_DOCUMENT_UPLOAD_SIZE) {
        return { success: false, error: "Arquivo excede o limite de 25MB." };
    }

    try {
        const extension = path.extname(file.name.toLowerCase());
        if (!ALLOWED_DOCUMENT_EXTENSIONS.has(extension)) {
            return { success: false, error: "Formato invalido. Apenas PDF, DOCX e TXT sao permitidos." };
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const mimeType = file.type || "application/octet-stream";

        const [escritorioId, pastaValida, actor] = await Promise.all([
            getDefaultEscritorioId(),
            pastaId ? db.pastaDocumento.findUnique({ where: { id: pastaId } }) : Promise.resolve(null),
            getAuditActor(),
        ]);

        const processo = processoId
            ? await db.processo.findUnique({
                where: { id: processoId },
                select: { id: true, numeroCnj: true },
            })
            : null;

        if (pastaId && !pastaValida) {
            return {
                success: false,
                error: "A pasta selecionada nao existe mais. Limpe o filtro e tente novamente.",
            };
        }
        if (processoId && !processo) {
            return {
                success: false,
                error: "O processo selecionado nao existe mais.",
            };
        }

        const stored = await storeWhatsAppMediaFile({
            buffer,
            fileName: file.name,
            mimeType,
            folder: "documentos",
        });

        const extraction = await extractDocumentoText({
            buffer,
            fileName: file.name,
            mimeType,
        });

        const documento = await db.$transaction(async (tx) => {
            const created = await createDocumentoWithInitialVersion(tx, {
                processoId: processoId || null,
                escritorioId,
                pastaId: pastaId || null,
                titulo: tituloInformado || file.name,
                conteudo: extraction.text || null,
                arquivoUrl: stored.fileUrl,
                arquivoNome: file.name,
                arquivoTamanho: file.size,
                mimeType,
                origem: "IMPORTACAO",
                actor,
            });

            await registrarLogAuditoria({
                client: tx,
                actorUserId: actor.userId,
                acao: "DOCUMENTO_CRIADO",
                entidade: "Documento",
                entidadeId: created.id,
                dadosDepois: buildDocumentoAuditSnapshot(created),
            });

            if (processoId && !skipMovimentacao) {
                const descricaoMovimentacao = processo?.numeroCnj
                    ? `Documento anexado ao processo ${processo.numeroCnj}: ${tituloInformado || file.name}`
                    : `Documento anexado ao processo: ${tituloInformado || file.name}`;

                await tx.movimentacao.create({
                    data: {
                        processoId,
                        data: new Date(),
                        descricao: descricaoMovimentacao,
                        tipo: "DOCUMENTO",
                        fonte: "Biblioteca de documentos",
                    },
                });

                await tx.processo.update({
                    where: { id: processoId },
                    data: { dataUltimaMovimentacao: new Date() },
                });
            }

            return created;
        });

        revalidateDocumentoPaths(documento.id, documento.processoId);
        return {
            success: true,
            warning: extraction.warning || null,
            documentoId: documento.id,
            titulo: documento.titulo,
        };
    } catch (error) {
        console.error("Erro import:", error);
        return {
            success: false,
            error: getDocumentoActionErrorMessage(error, "Falha ao processar arquivo."),
        };
    }
}

export async function importDocumentoAction(formData: FormData) {
    return importDocumentoToLibrary({
        file: formData.get("file") as File,
        pastaId: formData.get("pastaId") as string | null,
        processoId: formData.get("processoId") as string | null,
        titulo: (formData.get("titulo") as string | null) || null,
        skipMovimentacao: formData.get("skipMovimentacao") === "true",
    });
}

// ==========================================
// Versionamento real
// ==========================================

export async function createDocumentoVersionAction(documentoId: string, formData: DocumentoVersionFormData) {
    const parsed = documentoVersionSchema.safeParse(formData);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const actor = await getAuditActor();
        const documento = await db.$transaction(async (tx) => {
            const before = await tx.documento.findUnique({
                where: { id: documentoId },
                select: {
                    id: true,
                    titulo: true,
                    statusFluxo: true,
                    versao: true,
                    processoId: true,
                    categoriaId: true,
                    pastaId: true,
                    versaoAtualId: true,
                    versaoPublicadaId: true,
                },
            });

            if (!before) {
                throw new DocumentoVersioningError("Documento nao encontrado.");
            }

            const updated = await createDocumentoVersion(tx, documentoId, {
                ...parsed.data,
                actor,
            });

            await registrarLogAuditoria({
                client: tx,
                actorUserId: actor.userId,
                acao: "DOCUMENTO_VERSAO_CRIADA",
                entidade: "Documento",
                entidadeId: documentoId,
                dadosAntes: buildDocumentoAuditSnapshot(before),
                dadosDepois: buildDocumentoAuditSnapshot(updated),
            });

            return updated;
        });

        revalidateDocumentoPaths(documento.id, documento.processoId);
        return { success: true };
    } catch (error) {
        console.error("Error creating documento version:", error);
        return {
            success: false,
            error: getDocumentoActionErrorMessage(error, "Nao foi possivel criar a nova versao."),
        };
    }
}

export async function submitDocumentoForReviewAction(documentoId: string) {
    try {
        const actor = await getAuditActor();
        const documento = await db.$transaction(async (tx) => {
            const before = await tx.documento.findUnique({
                where: { id: documentoId },
                select: {
                    id: true,
                    titulo: true,
                    statusFluxo: true,
                    versao: true,
                    processoId: true,
                    categoriaId: true,
                    pastaId: true,
                    versaoAtualId: true,
                    versaoPublicadaId: true,
                },
            });

            if (!before) throw new DocumentoVersioningError("Documento nao encontrado.");

            const updated = await submitDocumentoForReview(tx, documentoId);
            await registrarLogAuditoria({
                client: tx,
                actorUserId: actor.userId,
                acao: "DOCUMENTO_ENVIADO_REVISAO",
                entidade: "Documento",
                entidadeId: documentoId,
                dadosAntes: buildDocumentoAuditSnapshot(before),
                dadosDepois: buildDocumentoAuditSnapshot(updated),
            });

            return updated;
        });

        revalidateDocumentoPaths(documento.id, documento.processoId);
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: getDocumentoActionErrorMessage(error, "Nao foi possivel enviar para revisao."),
        };
    }
}

export async function approveDocumentoVersionAction(documentoId: string) {
    try {
        const actor = await getAuditActor();
        const documento = await db.$transaction(async (tx) => {
            const before = await tx.documento.findUnique({
                where: { id: documentoId },
                select: {
                    id: true,
                    titulo: true,
                    statusFluxo: true,
                    versao: true,
                    processoId: true,
                    categoriaId: true,
                    pastaId: true,
                    versaoAtualId: true,
                    versaoPublicadaId: true,
                },
            });

            if (!before) throw new DocumentoVersioningError("Documento nao encontrado.");

            const updated = await approveDocumentoVersion(tx, documentoId);
            await registrarLogAuditoria({
                client: tx,
                actorUserId: actor.userId,
                acao: "DOCUMENTO_APROVADO",
                entidade: "Documento",
                entidadeId: documentoId,
                dadosAntes: buildDocumentoAuditSnapshot(before),
                dadosDepois: buildDocumentoAuditSnapshot(updated),
            });

            return updated;
        });

        revalidateDocumentoPaths(documento.id, documento.processoId);
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: getDocumentoActionErrorMessage(error, "Nao foi possivel aprovar a versao."),
        };
    }
}

export async function publishDocumentoVersionAction(documentoId: string) {
    try {
        const actor = await getAuditActor();
        const documento = await db.$transaction(async (tx) => {
            const before = await tx.documento.findUnique({
                where: { id: documentoId },
                select: {
                    id: true,
                    titulo: true,
                    statusFluxo: true,
                    versao: true,
                    processoId: true,
                    categoriaId: true,
                    pastaId: true,
                    versaoAtualId: true,
                    versaoPublicadaId: true,
                },
            });

            if (!before) throw new DocumentoVersioningError("Documento nao encontrado.");

            const updated = await publishDocumentoVersion(tx, documentoId);
            await registrarLogAuditoria({
                client: tx,
                actorUserId: actor.userId,
                acao: "DOCUMENTO_PUBLICADO",
                entidade: "Documento",
                entidadeId: documentoId,
                dadosAntes: buildDocumentoAuditSnapshot(before),
                dadosDepois: buildDocumentoAuditSnapshot(updated),
            });

            return updated;
        });

        revalidateDocumentoPaths(documento.id, documento.processoId);
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: getDocumentoActionErrorMessage(error, "Nao foi possivel publicar a versao."),
        };
    }
}

export async function restoreDocumentoVersionAction(documentoId: string, formData: DocumentoRestoreFormData) {
    const parsed = documentoRestoreSchema.safeParse(formData);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const actor = await getAuditActor();
        const documento = await db.$transaction(async (tx) => {
            const before = await tx.documento.findUnique({
                where: { id: documentoId },
                select: {
                    id: true,
                    titulo: true,
                    statusFluxo: true,
                    versao: true,
                    processoId: true,
                    categoriaId: true,
                    pastaId: true,
                    versaoAtualId: true,
                    versaoPublicadaId: true,
                },
            });

            if (!before) throw new DocumentoVersioningError("Documento nao encontrado.");

            const updated = await restoreDocumentoVersion(
                tx,
                documentoId,
                parsed.data.versaoId,
                parsed.data.motivo,
                actor
            );

            await registrarLogAuditoria({
                client: tx,
                actorUserId: actor.userId,
                acao: "DOCUMENTO_RESTAURADO",
                entidade: "Documento",
                entidadeId: documentoId,
                dadosAntes: buildDocumentoAuditSnapshot(before),
                dadosDepois: buildDocumentoAuditSnapshot(updated),
            });

            return updated;
        });

        revalidateDocumentoPaths(documento.id, documento.processoId);
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: getDocumentoActionErrorMessage(error, "Nao foi possivel restaurar a versao."),
        };
    }
}

export async function addDocumentoReviewCommentAction(
    documentoId: string,
    versaoId: string,
    formData: DocumentoComentarioFormData
) {
    const parsed = documentoComentarioSchema.safeParse(formData);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const actor = await getAuditActor();
        const result = await db.$transaction(async (tx) => {
            const comentario = await addDocumentoReviewComment(
                tx,
                documentoId,
                versaoId,
                parsed.data.conteudo,
                actor
            );

            await registrarLogAuditoria({
                client: tx,
                actorUserId: actor.userId,
                acao: "DOCUMENTO_COMENTARIO_REVISAO_CRIADO",
                entidade: "Documento",
                entidadeId: documentoId,
                dadosDepois: {
                    comentarioId: comentario.id,
                    versaoId,
                },
            });

            return comentario;
        });

        revalidateDocumentoPaths(documentoId, null);
        return { success: true, comentarioId: result.id };
    } catch (error) {
        return {
            success: false,
            error: getDocumentoActionErrorMessage(error, "Nao foi possivel registrar o comentario."),
        };
    }
}

export async function resolveDocumentoReviewCommentAction(documentoId: string, comentarioId: string) {
    try {
        const actor = await getAuditActor();
        await db.$transaction(async (tx) => {
            await resolveDocumentoReviewComment(tx, comentarioId);
            await registrarLogAuditoria({
                client: tx,
                actorUserId: actor.userId,
                acao: "DOCUMENTO_COMENTARIO_REVISAO_RESOLVIDO",
                entidade: "Documento",
                entidadeId: documentoId,
                dadosDepois: { comentarioId },
            });
        });

        revalidateDocumentoPaths(documentoId, null);
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: getDocumentoActionErrorMessage(error, "Nao foi possivel resolver o comentario."),
        };
    }
}
