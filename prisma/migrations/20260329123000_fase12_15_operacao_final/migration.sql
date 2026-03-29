DO $$
BEGIN
    CREATE TYPE "StatusNotaFiscalServico" AS ENUM ('RASCUNHO', 'EMITIDA', 'CANCELADA');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "notas_fiscais_servico" (
    "id" TEXT NOT NULL,
    "faturaId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "serie" TEXT NOT NULL DEFAULT 'A1',
    "status" "StatusNotaFiscalServico" NOT NULL DEFAULT 'RASCUNHO',
    "valorServicos" DECIMAL(15,2) NOT NULL,
    "aliquotaIss" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "valorIss" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "codigoServico" TEXT,
    "descricaoServico" TEXT,
    "tomadorNome" TEXT NOT NULL,
    "tomadorDocumento" TEXT,
    "observacoes" TEXT,
    "payload" JSONB,
    "emitidaEm" TIMESTAMP(3),
    "canceladaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notas_fiscais_servico_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "notas_fiscais_servico_faturaId_key"
    ON "notas_fiscais_servico"("faturaId");

CREATE UNIQUE INDEX IF NOT EXISTS "notas_fiscais_servico_numero_key"
    ON "notas_fiscais_servico"("numero");

CREATE INDEX IF NOT EXISTS "notas_fiscais_servico_status_idx"
    ON "notas_fiscais_servico"("status");

CREATE INDEX IF NOT EXISTS "notas_fiscais_servico_emitidaEm_idx"
    ON "notas_fiscais_servico"("emitidaEm");

DO $$
BEGIN
    ALTER TABLE "notas_fiscais_servico"
        ADD CONSTRAINT "notas_fiscais_servico_faturaId_fkey"
        FOREIGN KEY ("faturaId") REFERENCES "faturas"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
