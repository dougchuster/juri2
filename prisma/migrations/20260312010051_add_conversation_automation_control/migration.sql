-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "autoAtendimentoPausado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "iaDesabilitada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "iaDesabilitadaEm" TIMESTAMP(3),
ADD COLUMN     "iaDesabilitadaPor" TEXT,
ADD COLUMN     "motivoPausa" TEXT,
ADD COLUMN     "pausadoAte" TIMESTAMP(3);
