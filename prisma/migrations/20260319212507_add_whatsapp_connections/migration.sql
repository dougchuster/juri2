-- CreateEnum
CREATE TYPE "WhatsappProviderType" AS ENUM ('META_CLOUD_API', 'EVOLUTION_WHATSMEOW', 'EMBEDDED_BAILEYS_LEGACY');

-- CreateEnum
CREATE TYPE "WhatsappConnectionStatus" AS ENUM ('DRAFT', 'VALIDATING', 'QR_REQUIRED', 'CONNECTING', 'CONNECTED', 'DEGRADED', 'DISCONNECTED', 'ERROR', 'ARCHIVED');

-- CreateTable
CREATE TABLE "whatsapp_connections" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "providerType" "WhatsappProviderType" NOT NULL,
    "status" "WhatsappConnectionStatus" NOT NULL DEFAULT 'DRAFT',
    "displayName" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "connectedPhone" TEXT,
    "connectedName" TEXT,
    "externalInstanceName" TEXT,
    "externalInstanceId" TEXT,
    "baseUrl" TEXT,
    "healthStatus" TEXT,
    "lastHealthAt" TIMESTAMP(3),
    "lastConnectedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_connection_secrets" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_connection_secrets_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN "whatsappConnectionId" TEXT;

-- CreateIndex
CREATE INDEX "whatsapp_connections_escritorioId_providerType_idx" ON "whatsapp_connections"("escritorioId", "providerType");

-- CreateIndex
CREATE INDEX "whatsapp_connections_escritorioId_isPrimary_idx" ON "whatsapp_connections"("escritorioId", "isPrimary");

-- CreateIndex
CREATE INDEX "whatsapp_connections_status_idx" ON "whatsapp_connections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connection_secrets_connectionId_key" ON "whatsapp_connection_secrets"("connectionId");

-- CreateIndex
CREATE INDEX "conversations_whatsappConnectionId_idx" ON "conversations"("whatsappConnectionId");

-- AddForeignKey
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_connection_secrets" ADD CONSTRAINT "whatsapp_connection_secrets_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_whatsappConnectionId_fkey" FOREIGN KEY ("whatsappConnectionId") REFERENCES "whatsapp_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
