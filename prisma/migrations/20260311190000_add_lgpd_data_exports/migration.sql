CREATE TABLE "lgpd_data_exports" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'application/json',
    "payloadSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" TEXT,

    CONSTRAINT "lgpd_data_exports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lgpd_data_exports_requestId_generatedAt_idx" ON "lgpd_data_exports"("requestId", "generatedAt");
CREATE INDEX "lgpd_data_exports_expiresAt_idx" ON "lgpd_data_exports"("expiresAt");
CREATE INDEX "lgpd_data_exports_generatedById_idx" ON "lgpd_data_exports"("generatedById");

ALTER TABLE "lgpd_data_exports"
    ADD CONSTRAINT "lgpd_data_exports_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "lgpd_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lgpd_data_exports"
    ADD CONSTRAINT "lgpd_data_exports_generatedById_fkey"
    FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
