-- CreateEnum
CREATE TYPE "AttendanceAutomationTriggerType" AS ENUM ('AFTER_HOURS', 'KEYWORD', 'ALWAYS');

-- CreateEnum
CREATE TYPE "AttendanceAutomationSessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AttendanceAutomationEventType" AS ENUM ('INBOUND_EVALUATED', 'FLOW_MATCHED', 'AUTO_REPLIED', 'AI_REPLIED', 'FALLBACK_REPLIED', 'ERROR', 'SESSION_PAUSED');

-- AlterTable
ALTER TABLE "lgpd_requests" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "attendance_automation_flows" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "canal" "CanalComunicacao" NOT NULL DEFAULT 'WHATSAPP',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "triggerType" "AttendanceAutomationTriggerType" NOT NULL DEFAULT 'KEYWORD',
    "keywordMode" TEXT NOT NULL DEFAULT 'ANY',
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "businessHoursStart" INTEGER NOT NULL DEFAULT 8,
    "businessHoursEnd" INTEGER NOT NULL DEFAULT 18,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "initialReplyTemplate" TEXT NOT NULL,
    "followUpReplyTemplate" TEXT,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiModel" TEXT NOT NULL DEFAULT 'kimi-k2.5',
    "aiInstructions" TEXT,
    "humanizedStyle" TEXT,
    "maxAutoReplies" INTEGER NOT NULL DEFAULT 3,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_automation_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_automation_sessions" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "status" "AttendanceAutomationSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "lastInboundAt" TIMESTAMP(3),
    "lastReplyAt" TIMESTAMP(3),
    "lastTriggerReason" TEXT,
    "lastInboundSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_automation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_automation_events" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "flowId" TEXT,
    "sessionId" TEXT,
    "messageId" TEXT,
    "eventType" "AttendanceAutomationEventType" NOT NULL,
    "content" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_automation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_automation_flows_isActive_canal_priority_idx" ON "attendance_automation_flows"("isActive", "canal", "priority");

-- CreateIndex
CREATE INDEX "attendance_automation_sessions_flowId_status_idx" ON "attendance_automation_sessions"("flowId", "status");

-- CreateIndex
CREATE INDEX "attendance_automation_sessions_conversationId_status_idx" ON "attendance_automation_sessions"("conversationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_automation_sessions_conversationId_flowId_key" ON "attendance_automation_sessions"("conversationId", "flowId");

-- CreateIndex
CREATE INDEX "attendance_automation_events_conversationId_createdAt_idx" ON "attendance_automation_events"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "attendance_automation_events_flowId_createdAt_idx" ON "attendance_automation_events"("flowId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_automation_events_messageId_eventType_key" ON "attendance_automation_events"("messageId", "eventType");

-- AddForeignKey
ALTER TABLE "attendance_automation_sessions" ADD CONSTRAINT "attendance_automation_sessions_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_automation_sessions" ADD CONSTRAINT "attendance_automation_sessions_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "attendance_automation_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_automation_events" ADD CONSTRAINT "attendance_automation_events_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_automation_events" ADD CONSTRAINT "attendance_automation_events_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "attendance_automation_flows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_automation_events" ADD CONSTRAINT "attendance_automation_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "attendance_automation_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "bi_indicador_snapshots_snapshotDate_metricKey_dimensionType_dim" RENAME TO "bi_indicador_snapshots_snapshotDate_metricKey_dimensionType_key";
