-- Migration: Meta Social Connections (Facebook Messenger + Instagram DMs)

-- 1. Add new values to CanalComunicacao enum
ALTER TYPE "CanalComunicacao" ADD VALUE IF NOT EXISTS 'FACEBOOK_MESSENGER';
ALTER TYPE "CanalComunicacao" ADD VALUE IF NOT EXISTS 'INSTAGRAM_DM';

-- 2. Create MetaSocialConnection table
CREATE TABLE "meta_social_connections" (
    "id"                 TEXT NOT NULL,
    "escritorioId"       TEXT NOT NULL,
    "displayName"        TEXT NOT NULL,
    "pageId"             TEXT NOT NULL,
    "pageName"           TEXT,
    "pageAccessToken"    TEXT NOT NULL,
    "instagramAccountId" TEXT,
    "instagramUsername"  TEXT,
    "verifyToken"        TEXT NOT NULL,
    "isActive"           BOOLEAN NOT NULL DEFAULT true,
    "lastWebhookAt"      TIMESTAMP(3),
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "meta_social_connections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "meta_social_connections_escritorioId_idx" ON "meta_social_connections"("escritorioId");
CREATE INDEX "meta_social_connections_pageId_idx" ON "meta_social_connections"("pageId");

ALTER TABLE "meta_social_connections"
    ADD CONSTRAINT "meta_social_connections_escritorioId_fkey"
    FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Add new columns to conversations
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "metaSocialConnectionId" TEXT;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "externalSenderId" TEXT;

CREATE INDEX IF NOT EXISTS "conversations_metaSocialConnectionId_idx" ON "conversations"("metaSocialConnectionId");

ALTER TABLE "conversations"
    ADD CONSTRAINT "conversations_metaSocialConnectionId_fkey"
    FOREIGN KEY ("metaSocialConnectionId") REFERENCES "meta_social_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
