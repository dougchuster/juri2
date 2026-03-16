import "dotenv/config";
import assert from "node:assert/strict";
import { db } from "@/lib/db";
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

async function main() {
    const marker = `Documento teste ${Date.now()}`;
    const escritorio = await db.escritorio.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
    });

    let documentoId: string | null = null;

    try {
        const created = await db.$transaction(async (tx) => {
            return createDocumentoWithInitialVersion(tx, {
                escritorioId: escritorio?.id || null,
                titulo: marker,
                conteudo: "Conteudo inicial do documento.",
                origem: "CRIACAO",
                actor: { nome: "Teste Automatizado" },
            });
        });

        documentoId = created.id;
        assert.equal(created.versao, 1, "deve iniciar em versao 1");

        const edited = await db.$transaction(async (tx) => {
            return createDocumentoVersion(tx, created.id, {
                titulo: `${marker} revisado`,
                conteudo: "Conteudo inicial do documento com revisao textual.",
                resumoAlteracoes: "Ajuste de redacao.",
                actor: { nome: "Teste Automatizado" },
            });
        });

        assert.equal(edited.versao, 2, "deve criar a segunda versao");

        await db.$transaction(async (tx) => submitDocumentoForReview(tx, created.id));
        await db.$transaction(async (tx) => approveDocumentoVersion(tx, created.id));

        const currentVersion = await db.documentoVersao.findFirst({
            where: { documentoId: created.id, numero: 2 },
            select: { id: true },
        });
        assert.ok(currentVersion, "deve localizar a versao em revisao/aprovacao");

        const comentario = await db.$transaction(async (tx) => {
            return addDocumentoReviewComment(
                tx,
                created.id,
                currentVersion!.id,
                "Revisar o pedido final antes da publicacao.",
                { nome: "Teste Automatizado" }
            );
        });

        await db.$transaction(async (tx) => resolveDocumentoReviewComment(tx, comentario.id));
        await db.$transaction(async (tx) => publishDocumentoVersion(tx, created.id));

        const afterPublish = await db.documento.findUnique({
            where: { id: created.id },
            select: {
                statusFluxo: true,
                versaoPublicadaId: true,
                bloqueadoEm: true,
            },
        });
        assert.equal(afterPublish?.statusFluxo, "PUBLICADA");
        assert.ok(afterPublish?.versaoPublicadaId, "deve definir a versao publicada");
        assert.ok(afterPublish?.bloqueadoEm, "deve bloquear o documento publicado");

        const restored = await db.$transaction(async (tx) => {
            return restoreDocumentoVersion(
                tx,
                created.id,
                currentVersion!.id,
                "Necessario reabrir para ajustes apos publicacao.",
                { nome: "Teste Automatizado" }
            );
        });

        assert.equal(restored.versao, 3, "restauracao deve criar nova versao, nao sobrescrever");
        assert.equal(restored.statusFluxo, "RASCUNHO", "restauracao deve voltar para rascunho");

        const versionCount = await db.documentoVersao.count({
            where: { documentoId: created.id },
        });
        assert.equal(versionCount, 3, "deve manter historico completo de versoes");

        let deleteBlocked = false;
        try {
            await db.$transaction(async (tx) => deleteDocumentoWithPolicy(tx, created.id));
        } catch (error) {
            deleteBlocked = error instanceof DocumentoVersioningError;
        }

        assert.equal(deleteBlocked, true, "nao deve permitir excluir documento com versao publicada");

        console.log("test-documento-versioning-db: ok");
    } finally {
        if (documentoId) {
            await db.documento.deleteMany({
                where: { id: documentoId },
            });
        }
        await db.$disconnect();
    }
}

void main();
