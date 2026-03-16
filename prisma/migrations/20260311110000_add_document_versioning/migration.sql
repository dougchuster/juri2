-- CreateEnum
CREATE TYPE "StatusFluxoDocumento" AS ENUM ('RASCUNHO', 'EM_REVISAO', 'APROVADA', 'PUBLICADA');

-- CreateEnum
CREATE TYPE "OrigemVersaoDocumento" AS ENUM ('CRIACAO', 'IMPORTACAO', 'ANEXO_PROCESSO', 'EDICAO', 'RESTAURACAO');

-- AlterTable
ALTER TABLE "documentos"
ADD COLUMN "bloqueadoEm" TIMESTAMP(3),
ADD COLUMN "bloqueadoMotivo" TEXT,
ADD COLUMN "statusFluxo" "StatusFluxoDocumento" NOT NULL DEFAULT 'RASCUNHO',
ADD COLUMN "versaoAtualId" TEXT,
ADD COLUMN "versaoPublicadaId" TEXT;

-- CreateTable
CREATE TABLE "documento_versoes" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "statusFluxo" "StatusFluxoDocumento" NOT NULL DEFAULT 'RASCUNHO',
    "origem" "OrigemVersaoDocumento" NOT NULL DEFAULT 'CRIACAO',
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT,
    "arquivoUrl" TEXT,
    "arquivoNome" TEXT,
    "arquivoTamanho" INTEGER,
    "mimeType" TEXT,
    "categoriaId" TEXT,
    "categoriaNome" TEXT,
    "pastaId" TEXT,
    "pastaNome" TEXT,
    "resumoAlteracoes" TEXT,
    "restauradaDaVersaoId" TEXT,
    "criadoPorUserId" TEXT,
    "criadoPorNome" TEXT,
    "publicadaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documento_versoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_comentarios_revisao" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "versaoId" TEXT NOT NULL,
    "autorUserId" TEXT,
    "autorNome" TEXT,
    "conteudo" TEXT NOT NULL,
    "resolvido" BOOLEAN NOT NULL DEFAULT false,
    "resolvidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documento_comentarios_revisao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documento_versoes_documentoId_createdAt_idx" ON "documento_versoes"("documentoId", "createdAt");

-- CreateIndex
CREATE INDEX "documento_versoes_statusFluxo_idx" ON "documento_versoes"("statusFluxo");

-- CreateIndex
CREATE UNIQUE INDEX "documento_versoes_documentoId_numero_key" ON "documento_versoes"("documentoId", "numero");

-- CreateIndex
CREATE INDEX "documento_comentarios_revisao_documentoId_createdAt_idx" ON "documento_comentarios_revisao"("documentoId", "createdAt");

-- CreateIndex
CREATE INDEX "documento_comentarios_revisao_versaoId_idx" ON "documento_comentarios_revisao"("versaoId");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_versaoAtualId_key" ON "documentos"("versaoAtualId");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_versaoPublicadaId_key" ON "documentos"("versaoPublicadaId");

-- CreateIndex
CREATE INDEX "documentos_statusFluxo_idx" ON "documentos"("statusFluxo");

-- Backfill legado
INSERT INTO "documento_versoes" (
    "id",
    "documentoId",
    "numero",
    "statusFluxo",
    "origem",
    "titulo",
    "conteudo",
    "arquivoUrl",
    "arquivoNome",
    "arquivoTamanho",
    "mimeType",
    "categoriaId",
    "categoriaNome",
    "pastaId",
    "pastaNome",
    "resumoAlteracoes",
    "createdAt",
    "updatedAt"
)
SELECT
    CONCAT('legacy-doc-version-', d."id"),
    d."id",
    COALESCE(d."versao", 1),
    'RASCUNHO'::"StatusFluxoDocumento",
    'CRIACAO'::"OrigemVersaoDocumento",
    d."titulo",
    d."conteudo",
    d."arquivoUrl",
    d."arquivoNome",
    d."arquivoTamanho",
    d."mimeType",
    d."categoriaId",
    c."nome",
    d."pastaId",
    p."nome",
    'Versao inicial criada a partir do documento legado.',
    d."createdAt",
    d."updatedAt"
FROM "documentos" d
LEFT JOIN "categorias_documento" c ON c."id" = d."categoriaId"
LEFT JOIN "pastas_documento" p ON p."id" = d."pastaId";

UPDATE "documentos"
SET
    "versaoAtualId" = CONCAT('legacy-doc-version-', "id"),
    "statusFluxo" = 'RASCUNHO'::"StatusFluxoDocumento"
WHERE "versaoAtualId" IS NULL;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_versaoAtualId_fkey" FOREIGN KEY ("versaoAtualId") REFERENCES "documento_versoes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_versaoPublicadaId_fkey" FOREIGN KEY ("versaoPublicadaId") REFERENCES "documento_versoes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "documento_versoes" ADD CONSTRAINT "documento_versoes_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_versoes" ADD CONSTRAINT "documento_versoes_restauradaDaVersaoId_fkey" FOREIGN KEY ("restauradaDaVersaoId") REFERENCES "documento_versoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_comentarios_revisao" ADD CONSTRAINT "documento_comentarios_revisao_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_comentarios_revisao" ADD CONSTRAINT "documento_comentarios_revisao_versaoId_fkey" FOREIGN KEY ("versaoId") REFERENCES "documento_versoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
