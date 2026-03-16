CREATE TYPE "TipoRegistroAtendimento" AS ENUM ('CONTATO', 'LEAD', 'CLIENTE', 'EX_CLIENTE', 'PARCEIRO');
CREATE TYPE "CicloVidaAtendimento" AS ENUM ('NOVO_CONTATO', 'LEAD', 'LEAD_QUALIFICADO', 'PROPOSTA_ENVIADA', 'EM_NEGOCIACAO', 'CLIENTE_ATIVO', 'CLIENTE_INATIVO', 'PERDIDO', 'ENCERRADO');
CREATE TYPE "StatusOperacionalAtendimento" AS ENUM ('NOVO', 'TRIAGEM', 'AGUARDANDO_CLIENTE', 'AGUARDANDO_EQUIPE_INTERNA', 'EM_ANALISE_JURIDICA', 'AGUARDANDO_DOCUMENTOS', 'REUNIAO_AGENDADA', 'REUNIAO_CONFIRMADA', 'PROPOSTA_ENVIADA', 'EM_NEGOCIACAO', 'CONTRATADO', 'NAO_CONTRATADO', 'ENCERRADO');
CREATE TYPE "PrioridadeAtendimento" AS ENUM ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE');
CREATE TYPE "SituacaoDocumentalAtendimento" AS ENUM ('SEM_DOCUMENTOS', 'PARCIAL', 'COMPLETA', 'CONFERIDA');
CREATE TYPE "StatusReuniaoAtendimento" AS ENUM ('NAO_AGENDADA', 'AGENDADA', 'CONFIRMADA', 'REMARCADA', 'CANCELADA', 'REALIZADA', 'NAO_COMPARECEU');

ALTER TABLE "atendimentos"
ADD COLUMN "tipoRegistro" "TipoRegistroAtendimento" NOT NULL DEFAULT 'LEAD',
ADD COLUMN "cicloVida" "CicloVidaAtendimento" NOT NULL DEFAULT 'LEAD',
ADD COLUMN "statusOperacional" "StatusOperacionalAtendimento" NOT NULL DEFAULT 'NOVO',
ADD COLUMN "prioridade" "PrioridadeAtendimento" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN "situacaoDocumental" "SituacaoDocumentalAtendimento" NOT NULL DEFAULT 'SEM_DOCUMENTOS',
ADD COLUMN "statusReuniao" "StatusReuniaoAtendimento" NOT NULL DEFAULT 'NAO_AGENDADA',
ADD COLUMN "areaJuridica" TEXT,
ADD COLUMN "subareaJuridica" TEXT,
ADD COLUMN "origemAtendimento" TEXT,
ADD COLUMN "proximaAcao" TEXT,
ADD COLUMN "proximaAcaoAt" TIMESTAMP(3),
ADD COLUMN "ultimaInteracaoEm" TIMESTAMP(3),
ADD COLUMN "chanceFechamento" INTEGER,
ADD COLUMN "valorEstimado" DECIMAL(15,2),
ADD COLUMN "motivoPerda" TEXT,
ADD COLUMN "dataReuniao" TIMESTAMP(3),
ADD COLUMN "observacoesReuniao" TEXT;

ALTER TABLE "conversations"
ADD COLUMN "atendimentoId" TEXT;

ALTER TABLE "atendimentos"
ADD CONSTRAINT "atendimentos_processoId_fkey"
FOREIGN KEY ("processoId") REFERENCES "processos"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "conversations"
ADD CONSTRAINT "conversations_atendimentoId_fkey"
FOREIGN KEY ("atendimentoId") REFERENCES "atendimentos"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "atendimentos_statusOperacional_idx" ON "atendimentos"("statusOperacional");
CREATE INDEX "atendimentos_prioridade_idx" ON "atendimentos"("prioridade");
CREATE INDEX "atendimentos_tipoRegistro_idx" ON "atendimentos"("tipoRegistro");
CREATE INDEX "atendimentos_cicloVida_idx" ON "atendimentos"("cicloVida");
CREATE INDEX "atendimentos_processoId_idx" ON "atendimentos"("processoId");
CREATE INDEX "conversations_atendimentoId_idx" ON "conversations"("atendimentoId");
