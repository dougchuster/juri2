-- Migration: add_missing_columns_legacy
-- Adiciona colunas presentes no schema Prisma mas ausentes na migration de produção

-- ── clientes: campos pessoais extras ─────────────────────────────────────────
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "cid"          TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "ctps"         TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "estadoCivil"  TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "nacionalidade" TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "nomeMae"      TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "pisPasep"     TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "profissao"    TEXT;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "sexo"         TEXT;

-- ── escritorios: campos de armazenamento ─────────────────────────────────────
ALTER TABLE "escritorios" ADD COLUMN IF NOT EXISTS "armazenamentoUsado"    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "escritorios" ADD COLUMN IF NOT EXISTS "limiteArmazenamento"   INTEGER NOT NULL DEFAULT 5120;
