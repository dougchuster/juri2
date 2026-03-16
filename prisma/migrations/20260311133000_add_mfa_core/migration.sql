-- CreateEnum
CREATE TYPE "MfaLoginChallengeStatus" AS ENUM ('PENDENTE', 'VERIFICADO', 'EXPIRADO');

-- CreateTable
CREATE TABLE "users_mfa_config" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "secretEncrypted" TEXT NOT NULL,
    "enabledAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "enforcedByPolicy" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_mfa_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_setup_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secretEncrypted" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_setup_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_login_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "MfaLoginChallengeStatus" NOT NULL DEFAULT 'PENDENTE',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_login_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_mfa_config_userId_key" ON "users_mfa_config"("userId");

-- CreateIndex
CREATE INDEX "users_mfa_config_isEnabled_idx" ON "users_mfa_config"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_setup_challenges_userId_key" ON "mfa_setup_challenges"("userId");

-- CreateIndex
CREATE INDEX "mfa_setup_challenges_expiresAt_idx" ON "mfa_setup_challenges"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_login_challenges_token_key" ON "mfa_login_challenges"("token");

-- CreateIndex
CREATE INDEX "mfa_login_challenges_userId_status_idx" ON "mfa_login_challenges"("userId", "status");

-- CreateIndex
CREATE INDEX "mfa_login_challenges_expiresAt_idx" ON "mfa_login_challenges"("expiresAt");

-- AddForeignKey
ALTER TABLE "users_mfa_config" ADD CONSTRAINT "users_mfa_config_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_setup_challenges" ADD CONSTRAINT "mfa_setup_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_login_challenges" ADD CONSTRAINT "mfa_login_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
