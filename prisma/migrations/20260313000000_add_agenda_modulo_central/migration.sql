-- Migration: add_agenda_modulo_central
-- Date: 2026-03-13
-- Description: Adiciona modulo central de Agenda com model Agendamento unificado,
--              observadores, comentarios, historico, recorrencia, filtros salvos e compartilhamento.

-- CreateEnum
CREATE TYPE "TipoAgendamento" AS ENUM ('PRAZO_FATAL', 'PRAZO_INTERMEDIARIO', 'AUDIENCIA', 'COMPROMISSO', 'TAREFA', 'REUNIAO', 'RETORNO', 'VERIFICACAO', 'DILIGENCIA', 'PRAZO_IA');

-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('PENDENTE', 'VISUALIZADO', 'CONCLUIDO', 'CONFERIDO', 'CANCELADO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "PrioridadeAgendamento" AS ENUM ('URGENTE', 'ALTA', 'NORMAL', 'BAIXA');

-- CreateEnum
CREATE TYPE "OrigemAgendamento" AS ENUM ('MANUAL', 'PUBLICACAO_IA', 'GOOGLE_CALENDAR', 'OUTLOOK_CALENDAR', 'RECORRENCIA', 'AUTOMACAO');

-- CreateEnum
CREATE TYPE "FrequenciaRecorrencia" AS ENUM ('DIARIO', 'SEMANAL', 'MENSAL', 'PERSONALIZADO');

-- CreateTable: agendamento_recorrencias
CREATE TABLE "agendamento_recorrencias" (
    "id" TEXT NOT NULL,
    "frequencia" "FrequenciaRecorrencia" NOT NULL,
    "intervalo" INTEGER NOT NULL DEFAULT 1,
    "diasSemana" INTEGER[],
    "diaMes" INTEGER,
    "dataTermino" TIMESTAMP(3),
    "maxOcorrencias" INTEGER,
    "apenasUteis" BOOLEAN NOT NULL DEFAULT false,
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agendamento_recorrencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable: agendamentos
CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL,
    "tipo" "TipoAgendamento" NOT NULL,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'PENDENTE',
    "prioridade" "PrioridadeAgendamento" NOT NULL DEFAULT 'NORMAL',
    "origem" "OrigemAgendamento" NOT NULL DEFAULT 'MANUAL',
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "observacoes" TEXT,
    "cor" TEXT,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "dataFatal" DATE,
    "dataCortesia" DATE,
    "diaInteiro" BOOLEAN NOT NULL DEFAULT false,
    "fatal" BOOLEAN,
    "tipoContagem" "TipoContagem",
    "tipoAudiencia" "TipoAudiencia",
    "local" TEXT,
    "sala" TEXT,
    "tipoCompromisso" "TipoCompromisso",
    "origemConfianca" DOUBLE PRECISION,
    "origemDados" JSONB,
    "revisadoPor" TEXT,
    "revisadoEm" TIMESTAMP(3),
    "conferido" BOOLEAN NOT NULL DEFAULT false,
    "conferidoPorId" TEXT,
    "conferidoEm" TIMESTAMP(3),
    "motivoRejeicao" TEXT,
    "concluidoEm" TIMESTAMP(3),
    "concluidoPorId" TEXT,
    "comoConcluido" TEXT,
    "canceladoEm" TIMESTAMP(3),
    "canceladoPorId" TEXT,
    "motivoCancelamento" TEXT,
    "visualizadoEm" TIMESTAMP(3),
    "visualizadoPorId" TEXT,
    "responsavelId" TEXT NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "processoId" TEXT,
    "clienteId" TEXT,
    "publicacaoOrigemId" TEXT,
    "prazoLegadoId" TEXT,
    "audienciaLegadaId" TEXT,
    "compromissoLegadoId" TEXT,
    "tarefaLegadaId" TEXT,
    "atendimentoLegadoId" TEXT,
    "recorrenciaId" TEXT,
    "recorrenciaIndex" INTEGER,
    "googleEventId" TEXT,
    "outlookEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable: agendamento_observadores
CREATE TABLE "agendamento_observadores" (
    "id" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adicionadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agendamento_observadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable: agendamento_comentarios
CREATE TABLE "agendamento_comentarios" (
    "id" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agendamento_comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable: agendamento_historicos
CREATE TABLE "agendamento_historicos" (
    "id" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "campo" TEXT,
    "valorAnterior" TEXT,
    "valorNovo" TEXT,
    "descricao" TEXT NOT NULL,
    "metadados" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agendamento_historicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable: agendamento_filtros_salvos
CREATE TABLE "agendamento_filtros_salvos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "filtros" JSONB NOT NULL,
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agendamento_filtros_salvos_pkey" PRIMARY KEY ("id")
);

-- CreateTable: agenda_compartilhamentos
CREATE TABLE "agenda_compartilhamentos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tipoAcesso" TEXT NOT NULL,
    "filtros" JSONB,
    "expiraEm" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "acessos" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_compartilhamentos_pkey" PRIMARY KEY ("id")
);

-- Add agendamentoId to calendar_events
ALTER TABLE "calendar_events" ADD COLUMN "agendamentoId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "agendamentos_prazoLegadoId_key" ON "agendamentos"("prazoLegadoId");
CREATE UNIQUE INDEX "agendamentos_audienciaLegadaId_key" ON "agendamentos"("audienciaLegadaId");
CREATE UNIQUE INDEX "agendamentos_compromissoLegadoId_key" ON "agendamentos"("compromissoLegadoId");
CREATE UNIQUE INDEX "agendamentos_tarefaLegadaId_key" ON "agendamentos"("tarefaLegadaId");
CREATE UNIQUE INDEX "agendamentos_atendimentoLegadoId_key" ON "agendamentos"("atendimentoLegadoId");
CREATE UNIQUE INDEX "agendamento_observadores_agendamentoId_userId_key" ON "agendamento_observadores"("agendamentoId", "userId");
CREATE UNIQUE INDEX "agenda_compartilhamentos_token_key" ON "agenda_compartilhamentos"("token");

-- CreateIndex (performance)
CREATE INDEX "agendamentos_responsavelId_idx" ON "agendamentos"("responsavelId");
CREATE INDEX "agendamentos_criadoPorId_idx" ON "agendamentos"("criadoPorId");
CREATE INDEX "agendamentos_processoId_idx" ON "agendamentos"("processoId");
CREATE INDEX "agendamentos_clienteId_idx" ON "agendamentos"("clienteId");
CREATE INDEX "agendamentos_tipo_idx" ON "agendamentos"("tipo");
CREATE INDEX "agendamentos_status_idx" ON "agendamentos"("status");
CREATE INDEX "agendamentos_dataInicio_idx" ON "agendamentos"("dataInicio");
CREATE INDEX "agendamentos_dataFatal_idx" ON "agendamentos"("dataFatal");
CREATE INDEX "agendamentos_status_dataInicio_idx" ON "agendamentos"("status", "dataInicio");
CREATE INDEX "agendamentos_status_dataFatal_idx" ON "agendamentos"("status", "dataFatal");
CREATE INDEX "agendamentos_responsavelId_status_dataInicio_idx" ON "agendamentos"("responsavelId", "status", "dataInicio");
CREATE INDEX "agendamentos_tipo_status_idx" ON "agendamentos"("tipo", "status");
CREATE INDEX "agendamentos_recorrenciaId_idx" ON "agendamentos"("recorrenciaId");
CREATE INDEX "agendamentos_conferido_idx" ON "agendamentos"("conferido");
CREATE INDEX "agendamentos_publicacaoOrigemId_idx" ON "agendamentos"("publicacaoOrigemId");
CREATE INDEX "agendamento_observadores_userId_idx" ON "agendamento_observadores"("userId");
CREATE INDEX "agendamento_observadores_agendamentoId_idx" ON "agendamento_observadores"("agendamentoId");
CREATE INDEX "agendamento_comentarios_agendamentoId_createdAt_idx" ON "agendamento_comentarios"("agendamentoId", "createdAt");
CREATE INDEX "agendamento_historicos_agendamentoId_createdAt_idx" ON "agendamento_historicos"("agendamentoId", "createdAt");
CREATE INDEX "agendamento_historicos_userId_idx" ON "agendamento_historicos"("userId");
CREATE INDEX "agendamento_filtros_salvos_userId_idx" ON "agendamento_filtros_salvos"("userId");
CREATE INDEX "agenda_compartilhamentos_token_idx" ON "agenda_compartilhamentos"("token");
CREATE INDEX "agenda_compartilhamentos_userId_idx" ON "agenda_compartilhamentos"("userId");
CREATE INDEX "calendar_events_agendamentoId_idx" ON "calendar_events"("agendamentoId");

-- AddForeignKey
ALTER TABLE "agendamento_recorrencias" ADD CONSTRAINT "agendamento_recorrencias_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "advogados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_conferidoPorId_fkey" FOREIGN KEY ("conferidoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_concluidoPorId_fkey" FOREIGN KEY ("concluidoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_canceladoPorId_fkey" FOREIGN KEY ("canceladoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_visualizadoPorId_fkey" FOREIGN KEY ("visualizadoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_revisadoPor_fkey" FOREIGN KEY ("revisadoPor") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_publicacaoOrigemId_fkey" FOREIGN KEY ("publicacaoOrigemId") REFERENCES "publicacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_recorrenciaId_fkey" FOREIGN KEY ("recorrenciaId") REFERENCES "agendamento_recorrencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "agendamento_observadores" ADD CONSTRAINT "agendamento_observadores_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agendamento_observadores" ADD CONSTRAINT "agendamento_observadores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agendamento_observadores" ADD CONSTRAINT "agendamento_observadores_adicionadoPorId_fkey" FOREIGN KEY ("adicionadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "agendamento_comentarios" ADD CONSTRAINT "agendamento_comentarios_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agendamento_comentarios" ADD CONSTRAINT "agendamento_comentarios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "agendamento_historicos" ADD CONSTRAINT "agendamento_historicos_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agendamento_historicos" ADD CONSTRAINT "agendamento_historicos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "agendamento_filtros_salvos" ADD CONSTRAINT "agendamento_filtros_salvos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agenda_compartilhamentos" ADD CONSTRAINT "agenda_compartilhamentos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
