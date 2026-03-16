CREATE TYPE "RetentionPolicyEntity" AS ENUM ('LGPD_DATA_EXPORT', 'CLIENTE_ARQUIVADO');
CREATE TYPE "RetentionActionType" AS ENUM ('DELETE', 'ANONYMIZE');
CREATE TYPE "RetentionExecutionStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED', 'DRY_RUN');
CREATE TYPE "RetentionExecutionMode" AS ENUM ('MANUAL', 'AUTO');

ALTER TABLE "lgpd_data_exports"
    ADD COLUMN "purgedAt" TIMESTAMP(3),
    ADD COLUMN "purgeError" TEXT;

CREATE INDEX "lgpd_data_exports_purgedAt_idx" ON "lgpd_data_exports"("purgedAt");

CREATE TABLE "retention_policies" (
    "id" TEXT NOT NULL,
    "entityName" "RetentionPolicyEntity" NOT NULL,
    "actionType" "RetentionActionType" NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "lastExecutedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "retention_policies_entityName_key" ON "retention_policies"("entityName");
CREATE INDEX "retention_policies_isActive_idx" ON "retention_policies"("isActive");
CREATE INDEX "retention_policies_lastExecutedAt_idx" ON "retention_policies"("lastExecutedAt");
CREATE INDEX "retention_policies_createdById_idx" ON "retention_policies"("createdById");
CREATE INDEX "retention_policies_updatedById_idx" ON "retention_policies"("updatedById");

CREATE TABLE "retention_executions" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "status" "RetentionExecutionStatus" NOT NULL,
    "mode" "RetentionExecutionMode" NOT NULL DEFAULT 'MANUAL',
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "triggeredById" TEXT,

    CONSTRAINT "retention_executions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "retention_executions_policyId_startedAt_idx" ON "retention_executions"("policyId", "startedAt");
CREATE INDEX "retention_executions_status_idx" ON "retention_executions"("status");
CREATE INDEX "retention_executions_mode_idx" ON "retention_executions"("mode");
CREATE INDEX "retention_executions_triggeredById_idx" ON "retention_executions"("triggeredById");

ALTER TABLE "retention_policies"
    ADD CONSTRAINT "retention_policies_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "retention_policies"
    ADD CONSTRAINT "retention_policies_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "retention_executions"
    ADD CONSTRAINT "retention_executions_policyId_fkey"
    FOREIGN KEY ("policyId") REFERENCES "retention_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "retention_executions"
    ADD CONSTRAINT "retention_executions_triggeredById_fkey"
    FOREIGN KEY ("triggeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
