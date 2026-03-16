-- CreateEnum
CREATE TYPE "InternalChatConversationType" AS ENUM ('DIRECT');

-- CreateEnum
CREATE TYPE "InternalChatMessageType" AS ENUM ('TEXT', 'FILE', 'AUDIO', 'SYSTEM');

-- CreateEnum
CREATE TYPE "InternalChatAttachmentKind" AS ENUM ('FILE', 'AUDIO');

-- CreateEnum
CREATE TYPE "InternalChatPresenceStatus" AS ENUM ('ONLINE', 'AWAY', 'BUSY', 'OFFLINE');

-- CreateTable
CREATE TABLE "internal_chat_conversations" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "type" "InternalChatConversationType" NOT NULL DEFAULT 'DIRECT',
    "createdById" TEXT NOT NULL,
    "directKey" TEXT,
    "lastMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "internal_chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_chat_participants" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "mutedUntil" TIMESTAMP(3),

    CONSTRAINT "internal_chat_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_chat_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "type" "InternalChatMessageType" NOT NULL,
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "internal_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_chat_attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "kind" "InternalChatAttachmentKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationSeconds" INTEGER,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_chat_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_chat_reads" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_chat_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_chat_presence" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "manualStatus" "InternalChatPresenceStatus",
    "lastSeenAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_chat_presence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "internal_chat_conversations_directKey_key" ON "internal_chat_conversations"("directKey");

-- CreateIndex
CREATE INDEX "internal_chat_conversations_escritorioId_updatedAt_idx" ON "internal_chat_conversations"("escritorioId", "updatedAt");

-- CreateIndex
CREATE INDEX "internal_chat_conversations_escritorioId_type_idx" ON "internal_chat_conversations"("escritorioId", "type");

-- CreateIndex
CREATE INDEX "internal_chat_participants_userId_escritorioId_idx" ON "internal_chat_participants"("userId", "escritorioId");

-- CreateIndex
CREATE INDEX "internal_chat_participants_conversationId_escritorioId_idx" ON "internal_chat_participants"("conversationId", "escritorioId");

-- CreateIndex
CREATE UNIQUE INDEX "internal_chat_participants_conversationId_userId_key" ON "internal_chat_participants"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "internal_chat_messages_conversationId_createdAt_idx" ON "internal_chat_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "internal_chat_messages_escritorioId_senderId_idx" ON "internal_chat_messages"("escritorioId", "senderId");

-- CreateIndex
CREATE INDEX "internal_chat_attachments_messageId_idx" ON "internal_chat_attachments"("messageId");

-- CreateIndex
CREATE INDEX "internal_chat_attachments_escritorioId_kind_idx" ON "internal_chat_attachments"("escritorioId", "kind");

-- CreateIndex
CREATE INDEX "internal_chat_reads_userId_readAt_idx" ON "internal_chat_reads"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "internal_chat_reads_messageId_userId_key" ON "internal_chat_reads"("messageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "internal_chat_presence_userId_key" ON "internal_chat_presence"("userId");

-- CreateIndex
CREATE INDEX "internal_chat_presence_escritorioId_manualStatus_idx" ON "internal_chat_presence"("escritorioId", "manualStatus");

-- AddForeignKey
ALTER TABLE "internal_chat_conversations" ADD CONSTRAINT "internal_chat_conversations_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_conversations" ADD CONSTRAINT "internal_chat_conversations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_conversations" ADD CONSTRAINT "internal_chat_conversations_lastMessageId_fkey" FOREIGN KEY ("lastMessageId") REFERENCES "internal_chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_participants" ADD CONSTRAINT "internal_chat_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "internal_chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_participants" ADD CONSTRAINT "internal_chat_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_participants" ADD CONSTRAINT "internal_chat_participants_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_messages" ADD CONSTRAINT "internal_chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "internal_chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_messages" ADD CONSTRAINT "internal_chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_messages" ADD CONSTRAINT "internal_chat_messages_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_attachments" ADD CONSTRAINT "internal_chat_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "internal_chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_attachments" ADD CONSTRAINT "internal_chat_attachments_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_reads" ADD CONSTRAINT "internal_chat_reads_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "internal_chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_reads" ADD CONSTRAINT "internal_chat_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_presence" ADD CONSTRAINT "internal_chat_presence_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_chat_presence" ADD CONSTRAINT "internal_chat_presence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
