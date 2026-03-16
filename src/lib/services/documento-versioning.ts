import {
    OrigemVersaoDocumento,
    Prisma,
    StatusFluxoDocumento,
} from "@/generated/prisma";
import {
    buildDocumentoRestoreSummary,
    getDocumentoDeletePolicy,
    getNextDocumentoVersionNumber,
    summarizeDocumentoVersionChanges,
} from "@/lib/services/documento-versioning-core";

type TransactionClient = Prisma.TransactionClient;

export class DocumentoVersioningError extends Error {}

export interface DocumentoActor {
    userId?: string | null;
    nome?: string | null;
}

export interface DocumentoInitialVersionInput {
    processoId?: string | null;
    escritorioId?: string | null;
    pastaId?: string | null;
    categoriaId?: string | null;
    titulo: string;
    conteudo?: string | null;
    arquivoUrl?: string | null;
    arquivoNome?: string | null;
    arquivoTamanho?: number | null;
    mimeType?: string | null;
    origem?: OrigemVersaoDocumento;
    actor?: DocumentoActor;
}

export interface DocumentoVersionDraftInput {
    titulo: string;
    categoriaId?: string | null;
    pastaId?: string | null;
    conteudo?: string | null;
    resumoAlteracoes?: string | null;
    origem?: OrigemVersaoDocumento;
    actor?: DocumentoActor;
}

function normalizeOptionalText(value: string | null | undefined) {
    if (value === undefined) return undefined;
    const normalized = (value || "").trim();
    return normalized || null;
}

async function resolveActorName(tx: TransactionClient, actor?: DocumentoActor) {
    if (actor?.nome) return actor.nome;
    if (!actor?.userId) return null;

    const user = await tx.user.findUnique({
        where: { id: actor.userId },
        select: { name: true },
    });

    return user?.name || null;
}

async function resolveSnapshotLabels(tx: TransactionClient, input: { categoriaId?: string | null; pastaId?: string | null }) {
    const categoriaId = input.categoriaId || null;
    const pastaId = input.pastaId || null;

    const [categoria, pasta] = await Promise.all([
        categoriaId
            ? tx.categoriaDocumento.findUnique({
                where: { id: categoriaId },
                select: { nome: true },
            })
            : Promise.resolve(null),
        pastaId
            ? tx.pastaDocumento.findUnique({
                where: { id: pastaId },
                select: { nome: true },
            })
            : Promise.resolve(null),
    ]);

    return {
        categoriaNome: categoria?.nome || null,
        pastaNome: pasta?.nome || null,
    };
}

async function ensureCurrentVersion(
    tx: TransactionClient,
    documento: {
        id: string;
        titulo: string;
        conteudo: string | null;
        arquivoUrl: string | null;
        arquivoNome: string | null;
        arquivoTamanho: number | null;
        mimeType: string | null;
        categoriaId: string | null;
        pastaId: string | null;
        versao: number;
        versaoAtualId: string | null;
        createdAt: Date;
        updatedAt: Date;
        statusFluxo: StatusFluxoDocumento;
        versaoAtual?: {
            id: string;
            numero: number;
            titulo: string;
            conteudo: string | null;
            arquivoNome: string | null;
            categoriaNome: string | null;
            pastaNome: string | null;
        } | null;
    }
) {
    if (documento.versaoAtual) return documento.versaoAtual;

    const labels = await resolveSnapshotLabels(tx, {
        categoriaId: documento.categoriaId,
        pastaId: documento.pastaId,
    });

    const version = await tx.documentoVersao.create({
        data: {
            documentoId: documento.id,
            numero: Math.max(documento.versao || 1, 1),
            statusFluxo: documento.statusFluxo,
            origem: OrigemVersaoDocumento.CRIACAO,
            titulo: documento.titulo,
            conteudo: documento.conteudo,
            arquivoUrl: documento.arquivoUrl,
            arquivoNome: documento.arquivoNome,
            arquivoTamanho: documento.arquivoTamanho,
            mimeType: documento.mimeType,
            categoriaId: documento.categoriaId,
            categoriaNome: labels.categoriaNome,
            pastaId: documento.pastaId,
            pastaNome: labels.pastaNome,
            resumoAlteracoes: "Versao inicial reconstruida a partir do documento corrente.",
            createdAt: documento.createdAt,
            updatedAt: documento.updatedAt,
        },
        select: {
            id: true,
            numero: true,
            titulo: true,
            conteudo: true,
            arquivoNome: true,
            categoriaNome: true,
            pastaNome: true,
        },
    });

    await tx.documento.update({
        where: { id: documento.id },
        data: {
            versaoAtualId: version.id,
        },
    });

    return version;
}

async function getDocumentoForMutation(tx: TransactionClient, documentoId: string) {
    const documento = await tx.documento.findUnique({
        where: { id: documentoId },
        include: {
            versaoAtual: {
                select: {
                    id: true,
                    numero: true,
                    titulo: true,
                    conteudo: true,
                    arquivoNome: true,
                    categoriaNome: true,
                    pastaNome: true,
                },
            },
            _count: {
                select: {
                    versoes: true,
                },
            },
        },
    });

    if (!documento) {
        throw new DocumentoVersioningError("Documento nao encontrado.");
    }

    const versaoAtual = await ensureCurrentVersion(tx, documento);

    return {
        ...documento,
        versaoAtual,
    };
}

export async function createDocumentoWithInitialVersion(
    tx: TransactionClient,
    input: DocumentoInitialVersionInput
) {
    const actorName = await resolveActorName(tx, input.actor);
    const labels = await resolveSnapshotLabels(tx, {
        categoriaId: input.categoriaId,
        pastaId: input.pastaId,
    });

    const documento = await tx.documento.create({
        data: {
            processoId: input.processoId || null,
            escritorioId: input.escritorioId || null,
            pastaId: input.pastaId || null,
            categoriaId: input.categoriaId || null,
            titulo: input.titulo,
            conteudo: input.conteudo || null,
            arquivoUrl: input.arquivoUrl || null,
            arquivoNome: input.arquivoNome || null,
            arquivoTamanho: input.arquivoTamanho || null,
            mimeType: input.mimeType || null,
            versao: 1,
            statusFluxo: StatusFluxoDocumento.RASCUNHO,
        },
    });

    const version = await tx.documentoVersao.create({
        data: {
            documentoId: documento.id,
            numero: 1,
            statusFluxo: StatusFluxoDocumento.RASCUNHO,
            origem: input.origem || OrigemVersaoDocumento.CRIACAO,
            titulo: input.titulo,
            conteudo: input.conteudo || null,
            arquivoUrl: input.arquivoUrl || null,
            arquivoNome: input.arquivoNome || null,
            arquivoTamanho: input.arquivoTamanho || null,
            mimeType: input.mimeType || null,
            categoriaId: input.categoriaId || null,
            categoriaNome: labels.categoriaNome,
            pastaId: input.pastaId || null,
            pastaNome: labels.pastaNome,
            resumoAlteracoes:
                input.origem === OrigemVersaoDocumento.IMPORTACAO
                    ? "Versao inicial criada por importacao de arquivo."
                    : input.origem === OrigemVersaoDocumento.ANEXO_PROCESSO
                        ? "Versao inicial criada por anexo no processo."
                        : "Versao inicial criada manualmente.",
            criadoPorUserId: input.actor?.userId || null,
            criadoPorNome: actorName,
        },
        select: { id: true },
    });

    return tx.documento.update({
        where: { id: documento.id },
        data: {
            versaoAtualId: version.id,
        },
    });
}

export async function createDocumentoVersion(
    tx: TransactionClient,
    documentoId: string,
    input: DocumentoVersionDraftInput
) {
    const documento = await getDocumentoForMutation(tx, documentoId);
    const actorName = await resolveActorName(tx, input.actor);

    if (documento.bloqueadoEm) {
        throw new DocumentoVersioningError(
            "Documento bloqueado por versao publicada. Crie uma nova versao de trabalho a partir da restauracao."
        );
    }

    const nextVersionNumber = getNextDocumentoVersionNumber(documento.versao);
    const nextCategoriaId =
        input.categoriaId === undefined ? documento.categoriaId : input.categoriaId;
    const nextPastaId = input.pastaId === undefined ? documento.pastaId : input.pastaId;
    const nextConteudo = input.conteudo === undefined ? documento.conteudo : input.conteudo;
    const labels = await resolveSnapshotLabels(tx, {
        categoriaId: nextCategoriaId,
        pastaId: nextPastaId,
    });

    const resumoAlteracoes =
        normalizeOptionalText(input.resumoAlteracoes) ||
        summarizeDocumentoVersionChanges(
            {
                titulo: documento.titulo,
                conteudo: documento.conteudo,
                categoriaNome: documento.versaoAtual?.categoriaNome || null,
                pastaNome: documento.versaoAtual?.pastaNome || null,
                arquivoNome: documento.arquivoNome,
            },
            {
                titulo: input.titulo,
                conteudo: nextConteudo,
                categoriaNome: labels.categoriaNome,
                pastaNome: labels.pastaNome,
                arquivoNome: documento.arquivoNome,
            }
        );

    const version = await tx.documentoVersao.create({
        data: {
            documentoId,
            numero: nextVersionNumber,
            statusFluxo: StatusFluxoDocumento.RASCUNHO,
            origem: input.origem || OrigemVersaoDocumento.EDICAO,
            titulo: input.titulo,
            conteudo: nextConteudo || null,
            arquivoUrl: documento.arquivoUrl,
            arquivoNome: documento.arquivoNome,
            arquivoTamanho: documento.arquivoTamanho,
            mimeType: documento.mimeType,
            categoriaId: nextCategoriaId || null,
            categoriaNome: labels.categoriaNome,
            pastaId: nextPastaId || null,
            pastaNome: labels.pastaNome,
            resumoAlteracoes,
            criadoPorUserId: input.actor?.userId || null,
            criadoPorNome: actorName,
        },
        select: { id: true, numero: true },
    });

    return tx.documento.update({
        where: { id: documentoId },
        data: {
            titulo: input.titulo,
            conteudo: nextConteudo || null,
            categoriaId: nextCategoriaId || null,
            pastaId: nextPastaId || null,
            versao: version.numero,
            statusFluxo: StatusFluxoDocumento.RASCUNHO,
            versaoAtualId: version.id,
            bloqueadoEm: null,
            bloqueadoMotivo: null,
        },
    });
}

async function transitionDocumentoVersionStatus(
    tx: TransactionClient,
    documentoId: string,
    expectedStatus: StatusFluxoDocumento,
    nextStatus: StatusFluxoDocumento
) {
    const documento = await getDocumentoForMutation(tx, documentoId);

    if (documento.statusFluxo !== expectedStatus) {
        throw new DocumentoVersioningError(
            `Transicao invalida. Documento esta em ${documento.statusFluxo}.`
        );
    }

    if (!documento.versaoAtualId) {
        throw new DocumentoVersioningError("Documento sem versao atual definida.");
    }

    await tx.documentoVersao.update({
        where: { id: documento.versaoAtualId },
        data: {
            statusFluxo: nextStatus,
            publicadaEm: nextStatus === StatusFluxoDocumento.PUBLICADA ? new Date() : null,
        },
    });

    return tx.documento.update({
        where: { id: documentoId },
        data: {
            statusFluxo: nextStatus,
            ...(nextStatus === StatusFluxoDocumento.PUBLICADA
                ? {
                    versaoPublicadaId: documento.versaoAtualId,
                    bloqueadoEm: new Date(),
                    bloqueadoMotivo: `Versao ${documento.versao} publicada.`,
                }
                : {}),
        },
    });
}

export async function submitDocumentoForReview(tx: TransactionClient, documentoId: string) {
    return transitionDocumentoVersionStatus(
        tx,
        documentoId,
        StatusFluxoDocumento.RASCUNHO,
        StatusFluxoDocumento.EM_REVISAO
    );
}

export async function approveDocumentoVersion(tx: TransactionClient, documentoId: string) {
    return transitionDocumentoVersionStatus(
        tx,
        documentoId,
        StatusFluxoDocumento.EM_REVISAO,
        StatusFluxoDocumento.APROVADA
    );
}

export async function publishDocumentoVersion(tx: TransactionClient, documentoId: string) {
    return transitionDocumentoVersionStatus(
        tx,
        documentoId,
        StatusFluxoDocumento.APROVADA,
        StatusFluxoDocumento.PUBLICADA
    );
}

export async function addDocumentoReviewComment(
    tx: TransactionClient,
    documentoId: string,
    versaoId: string,
    conteudo: string,
    actor?: DocumentoActor
) {
    const version = await tx.documentoVersao.findUnique({
        where: { id: versaoId },
        select: { id: true, documentoId: true },
    });

    if (!version || version.documentoId !== documentoId) {
        throw new DocumentoVersioningError("Versao de documento invalida para comentario.");
    }

    const actorName = await resolveActorName(tx, actor);

    return tx.documentoComentarioRevisao.create({
        data: {
            documentoId,
            versaoId,
            conteudo,
            autorUserId: actor?.userId || null,
            autorNome: actorName,
        },
    });
}

export async function resolveDocumentoReviewComment(
    tx: TransactionClient,
    comentarioId: string
) {
    return tx.documentoComentarioRevisao.update({
        where: { id: comentarioId },
        data: {
            resolvido: true,
            resolvidoEm: new Date(),
        },
    });
}

export async function restoreDocumentoVersion(
    tx: TransactionClient,
    documentoId: string,
    sourceVersionId: string,
    reason?: string | null,
    actor?: DocumentoActor
) {
    const documento = await getDocumentoForMutation(tx, documentoId);
    const sourceVersion = await tx.documentoVersao.findUnique({
        where: { id: sourceVersionId },
    });

    if (!sourceVersion || sourceVersion.documentoId !== documentoId) {
        throw new DocumentoVersioningError("Versao de origem nao encontrada.");
    }

    const actorName = await resolveActorName(tx, actor);
    const nextVersionNumber = getNextDocumentoVersionNumber(documento.versao);
    const version = await tx.documentoVersao.create({
        data: {
            documentoId,
            numero: nextVersionNumber,
            statusFluxo: StatusFluxoDocumento.RASCUNHO,
            origem: OrigemVersaoDocumento.RESTAURACAO,
            titulo: sourceVersion.titulo,
            conteudo: sourceVersion.conteudo,
            arquivoUrl: sourceVersion.arquivoUrl,
            arquivoNome: sourceVersion.arquivoNome,
            arquivoTamanho: sourceVersion.arquivoTamanho,
            mimeType: sourceVersion.mimeType,
            categoriaId: sourceVersion.categoriaId,
            categoriaNome: sourceVersion.categoriaNome,
            pastaId: sourceVersion.pastaId,
            pastaNome: sourceVersion.pastaNome,
            resumoAlteracoes: buildDocumentoRestoreSummary(sourceVersion.numero, reason),
            restauradaDaVersaoId: sourceVersion.id,
            criadoPorUserId: actor?.userId || null,
            criadoPorNome: actorName,
        },
        select: { id: true, numero: true },
    });

    return tx.documento.update({
        where: { id: documentoId },
        data: {
            titulo: sourceVersion.titulo,
            conteudo: sourceVersion.conteudo,
            arquivoUrl: sourceVersion.arquivoUrl,
            arquivoNome: sourceVersion.arquivoNome,
            arquivoTamanho: sourceVersion.arquivoTamanho,
            mimeType: sourceVersion.mimeType,
            categoriaId: sourceVersion.categoriaId,
            pastaId: sourceVersion.pastaId,
            versao: version.numero,
            statusFluxo: StatusFluxoDocumento.RASCUNHO,
            versaoAtualId: version.id,
            bloqueadoEm: null,
            bloqueadoMotivo: null,
        },
    });
}

export async function deleteDocumentoWithPolicy(tx: TransactionClient, documentoId: string) {
    const documento = await tx.documento.findUnique({
        where: { id: documentoId },
        include: {
            _count: {
                select: {
                    versoes: true,
                },
            },
        },
    });

    if (!documento) {
        throw new DocumentoVersioningError("Documento nao encontrado.");
    }

    const deletePolicy = getDocumentoDeletePolicy({
        statusFluxo: documento.statusFluxo,
        versionCount: documento._count.versoes,
        hasPublishedVersion: Boolean(documento.versaoPublicadaId),
    });

    if (!deletePolicy.allow) {
        throw new DocumentoVersioningError(deletePolicy.reason || "Documento nao pode ser excluido.");
    }

    return tx.documento.delete({
        where: { id: documentoId },
    });
}
