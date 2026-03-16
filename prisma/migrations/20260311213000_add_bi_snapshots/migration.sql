CREATE TYPE "BIRefreshJobType" AS ENUM ('DAILY_BASELINE');
CREATE TYPE "BIRefreshRunStatus" AS ENUM ('SUCCESS', 'FAILED');
CREATE TYPE "BIMetricKey" AS ENUM (
    'PROCESSOS_ATIVOS',
    'PROCESSOS_ESTAGNADOS_120D',
    'TAXA_EXITO_PERCENT',
    'TEMPO_MEDIO_ENCERRAMENTO_DIAS',
    'CONTINGENCIA_TOTAL',
    'CLIENTES_INADIMPLENTES',
    'RECEBIDO_TOTAL',
    'A_RECEBER_TOTAL',
    'TAREFAS_CONCLUIDAS_30D',
    'HORAS_TRABALHADAS_30D'
);
CREATE TYPE "BIDimensionType" AS ENUM ('GLOBAL', 'ADVOGADO', 'TIPO_PROCESSO', 'RISCO_CONTINGENCIA', 'CLIENTE');

CREATE TABLE "bi_refresh_runs" (
    "id" TEXT NOT NULL,
    "jobType" "BIRefreshJobType" NOT NULL,
    "status" "BIRefreshRunStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "summary" JSONB,

    CONSTRAINT "bi_refresh_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bi_refresh_runs_jobType_startedAt_idx" ON "bi_refresh_runs"("jobType", "startedAt");
CREATE INDEX "bi_refresh_runs_status_idx" ON "bi_refresh_runs"("status");

CREATE TABLE "bi_indicador_snapshots" (
    "id" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "metricKey" "BIMetricKey" NOT NULL,
    "dimensionType" "BIDimensionType" NOT NULL,
    "dimensionValue" TEXT NOT NULL,
    "metricValue" DECIMAL(18,4) NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bi_indicador_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bi_indicador_snapshots_snapshotDate_metricKey_idx" ON "bi_indicador_snapshots"("snapshotDate", "metricKey");
CREATE INDEX "bi_indicador_snapshots_snapshotDate_dimensionType_idx" ON "bi_indicador_snapshots"("snapshotDate", "dimensionType");
CREATE INDEX "bi_indicador_snapshots_metricKey_dimensionType_idx" ON "bi_indicador_snapshots"("metricKey", "dimensionType");
CREATE UNIQUE INDEX "bi_indicador_snapshots_snapshotDate_metricKey_dimensionType_dim_key"
    ON "bi_indicador_snapshots"("snapshotDate", "metricKey", "dimensionType", "dimensionValue");

CREATE TABLE "juri_metric_definitions" (
    "id" TEXT NOT NULL,
    "key" "BIMetricKey" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "formulaText" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "juri_metric_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "juri_metric_definitions_key_key" ON "juri_metric_definitions"("key");
CREATE INDEX "juri_metric_definitions_isActive_idx" ON "juri_metric_definitions"("isActive");
