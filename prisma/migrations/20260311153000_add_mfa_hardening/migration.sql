-- AlterTable
ALTER TABLE "users_mfa_config"
ADD COLUMN "failedAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastFailedAt" TIMESTAMP(3),
ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "mfa_trusted_devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceLabel" TEXT NOT NULL,
    "userAgent" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_trusted_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mfa_trusted_devices_tokenHash_key" ON "mfa_trusted_devices"("tokenHash");

-- CreateIndex
CREATE INDEX "mfa_trusted_devices_userId_revokedAt_idx" ON "mfa_trusted_devices"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "mfa_trusted_devices_userId_expiresAt_idx" ON "mfa_trusted_devices"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "mfa_trusted_devices" ADD CONSTRAINT "mfa_trusted_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
