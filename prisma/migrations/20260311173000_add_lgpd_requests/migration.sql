CREATE TYPE "LgpdRequestType" AS ENUM (
    'ACESSO',
    'CORRECAO',
    'ANONIMIZACAO',
    'EXCLUSAO',
    'REVOGACAO_CONSENTIMENTO',
    'OUTRO'
);

CREATE TYPE "LgpdRequestStatus" AS ENUM (
    'ABERTA',
    'EM_ANALISE',
    'EM_ATENDIMENTO',
    'CONCLUIDA',
    'CANCELADA'
);

CREATE TABLE "lgpd_requests" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "requestType" "LgpdRequestType" NOT NULL,
    "status" "LgpdRequestStatus" NOT NULL DEFAULT 'ABERTA',
    "legalBasis" TEXT,
    "notes" TEXT,
    "resolutionNotes" TEXT,
    "requestedById" TEXT,
    "assignedToId" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lgpd_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lgpd_requests_escritorioId_status_idx" ON "lgpd_requests"("escritorioId", "status");
CREATE INDEX "lgpd_requests_clienteId_status_idx" ON "lgpd_requests"("clienteId", "status");
CREATE INDEX "lgpd_requests_requestType_idx" ON "lgpd_requests"("requestType");
CREATE INDEX "lgpd_requests_requestedById_idx" ON "lgpd_requests"("requestedById");
CREATE INDEX "lgpd_requests_assignedToId_idx" ON "lgpd_requests"("assignedToId");
CREATE INDEX "lgpd_requests_openedAt_idx" ON "lgpd_requests"("openedAt");

ALTER TABLE "lgpd_requests"
    ADD CONSTRAINT "lgpd_requests_escritorioId_fkey"
    FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lgpd_requests"
    ADD CONSTRAINT "lgpd_requests_clienteId_fkey"
    FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lgpd_requests"
    ADD CONSTRAINT "lgpd_requests_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lgpd_requests"
    ADD CONSTRAINT "lgpd_requests_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
