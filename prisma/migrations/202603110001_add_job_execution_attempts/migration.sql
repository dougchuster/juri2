CREATE TYPE "JobExecutionAttemptSourceType" AS ENUM ('AUTOMACAO_NACIONAL_JOB', 'FLOW_EXECUTION');
CREATE TYPE "JobExecutionAttemptTriggerSource" AS ENUM ('SYSTEM', 'MANUAL_RETRY', 'MANUAL_CANCEL');
CREATE TYPE "JobExecutionAttemptStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TABLE "job_execution_attempts" (
    "id" TEXT NOT NULL,
    "sourceType" "JobExecutionAttemptSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "chainKey" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "triggerSource" "JobExecutionAttemptTriggerSource" NOT NULL DEFAULT 'SYSTEM',
    "retryOfSourceId" TEXT,
    "triggeredById" TEXT,
    "reason" TEXT,
    "status" "JobExecutionAttemptStatus" NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,
    "payloadSnapshot" JSONB,
    "resultSnapshot" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_execution_attempts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "job_execution_attempts"
ADD CONSTRAINT "job_execution_attempts_triggeredById_fkey"
FOREIGN KEY ("triggeredById") REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "job_execution_attempts_sourceType_sourceId_idx"
ON "job_execution_attempts"("sourceType", "sourceId");

CREATE INDEX "job_execution_attempts_chainKey_attemptNumber_idx"
ON "job_execution_attempts"("chainKey", "attemptNumber");

CREATE INDEX "job_execution_attempts_retryOfSourceId_idx"
ON "job_execution_attempts"("retryOfSourceId");

CREATE INDEX "job_execution_attempts_triggeredById_idx"
ON "job_execution_attempts"("triggeredById");
