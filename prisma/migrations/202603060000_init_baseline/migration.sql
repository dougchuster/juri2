-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SOCIO', 'ADVOGADO', 'CONTROLADOR', 'ASSISTENTE', 'FINANCEIRO', 'SECRETARIA');

-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('FISICA', 'JURIDICA');

-- CreateEnum
CREATE TYPE "StatusCliente" AS ENUM ('PROSPECTO', 'ATIVO', 'INATIVO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "LeadTemperatura" AS ENUM ('FRIO', 'MORNO', 'QUENTE');

-- CreateEnum
CREATE TYPE "CRMRelationshipType" AS ENUM ('LEAD', 'CLIENTE_POTENCIAL', 'CLIENTE_ATIVO', 'CLIENTE_INATIVO', 'PARCEIRO', 'FORNECEDOR', 'PARTE_CONTRARIA');

-- CreateEnum
CREATE TYPE "CRMInterestLevel" AS ENUM ('BAIXO', 'MEDIO', 'ALTO');

-- CreateEnum
CREATE TYPE "TribunalSourceType" AS ENUM ('DATAJUD', 'DJEN', 'DIARIO', 'PORTAL');

-- CreateEnum
CREATE TYPE "TipoProcesso" AS ENUM ('JUDICIAL', 'ADMINISTRATIVO', 'CONSULTIVO', 'SERVICO', 'PROSPECCAO');

-- CreateEnum
CREATE TYPE "StatusProcesso" AS ENUM ('PROSPECCAO', 'CONSULTORIA', 'AJUIZADO', 'EM_ANDAMENTO', 'AUDIENCIA_MARCADA', 'SENTENCA', 'RECURSO', 'TRANSITO_JULGADO', 'EXECUCAO', 'ENCERRADO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "ResultadoProcesso" AS ENUM ('GANHO', 'PERDIDO', 'ACORDO', 'DESISTENCIA', 'PENDENTE');

-- CreateEnum
CREATE TYPE "TipoParte" AS ENUM ('AUTOR', 'REU', 'TERCEIRO', 'TESTEMUNHA', 'PERITO', 'ASSISTENTE_TECNICO');

-- CreateEnum
CREATE TYPE "TipoVinculo" AS ENUM ('CONEXAO', 'CONTINENCIA', 'RECURSO', 'INCIDENTE', 'RELACIONADO');

-- CreateEnum
CREATE TYPE "StatusPrazo" AS ENUM ('PENDENTE', 'CONCLUIDO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "TipoContagem" AS ENUM ('DIAS_UTEIS', 'DIAS_CORRIDOS');

-- CreateEnum
CREATE TYPE "OrigemPrazo" AS ENUM ('MANUAL', 'PUBLICACAO_IA');

-- CreateEnum
CREATE TYPE "TipoAudiencia" AS ENUM ('CONCILIACAO', 'INSTRUCAO', 'JULGAMENTO', 'UNA', 'OUTRA');

-- CreateEnum
CREATE TYPE "TipoCompromisso" AS ENUM ('REUNIAO', 'CONSULTA', 'VISITA', 'DILIGENCIA', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusConfirmacaoCompromisso" AS ENUM ('PENDENTE', 'CONFIRMADO', 'REMARCACAO_SOLICITADA', 'CANCELADO');

-- CreateEnum
CREATE TYPE "CompromissoReminderKind" AS ENUM ('CLIENTE_CONFIRMACAO', 'CLIENTE_D1', 'CLIENTE_H1', 'RESPONSAVEL_D1', 'RESPONSAVEL_H1');

-- CreateEnum
CREATE TYPE "CompromissoReminderStatus" AS ENUM ('PENDENTE', 'AGENDADO', 'ENVIADO', 'CANCELADO', 'FALHOU');

-- CreateEnum
CREATE TYPE "PrioridadeTarefa" AS ENUM ('URGENTE', 'ALTA', 'NORMAL', 'BAIXA');

-- CreateEnum
CREATE TYPE "StatusTarefa" AS ENUM ('A_FAZER', 'EM_ANDAMENTO', 'REVISAO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CategoriaEntrega" AS ENUM ('D_MENOS_1', 'D_0', 'FORA_PRAZO');

-- CreateEnum
CREATE TYPE "StatusAtendimento" AS ENUM ('LEAD', 'QUALIFICACAO', 'PROPOSTA', 'FECHAMENTO', 'CONVERTIDO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "CanalAtendimento" AS ENUM ('PRESENCIAL', 'TELEFONE', 'EMAIL', 'WHATSAPP', 'SITE', 'INDICACAO');

-- CreateEnum
CREATE TYPE "ViabilidadeAtendimento" AS ENUM ('VIAVEL', 'INVIAVEL', 'EM_ANALISE');

-- CreateEnum

-- CreateEnum

-- CreateEnum

-- CreateEnum

-- CreateEnum

-- CreateEnum

-- CreateEnum
CREATE TYPE "TipoHonorario" AS ENUM ('FIXO', 'EXITO', 'POR_HORA', 'MISTO');

-- CreateEnum
CREATE TYPE "StatusHonorario" AS ENUM ('ATIVO', 'SUSPENSO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('CLIENTE_CADASTRADO', 'PROCESSO_ABERTO', 'PRAZO_VENCENDO', 'PRAZO_D5', 'PRAZO_D3', 'PRAZO_D1', 'PRAZO_D0', 'FATURA_VENCENDO', 'FATURA_VENCIDA', 'CLIENTE_INATIVO_30D', 'MENSAGEM_RECEBIDA', 'TAG_ADICIONADA', 'WEBHOOK', 'CRON', 'MANUAL');

-- CreateEnum
CREATE TYPE "FlowNodeType" AS ENUM ('TRIGGER', 'CONDITION', 'SEND_MESSAGE', 'WAIT', 'ADD_TAG', 'REMOVE_TAG', 'UPDATE_STATUS', 'CREATE_TASK', 'NOTIFY_TEAM', 'WEBHOOK', 'END');

-- CreateEnum
CREATE TYPE "FlowExecutionStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StatusFatura" AS ENUM ('PENDENTE', 'PAGA', 'ATRASADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoConta" AS ENUM ('CUSTO_PROCESSUAL', 'DESPESA_ESCRITORIO', 'FORNECEDOR', 'IMPOSTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoLancamentoFinanceiro" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "ClassificacaoLancamentoFinanceiro" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "StatusLancamentoFinanceiro" AS ENUM ('PENDENTE', 'PAGO', 'PARCIAL', 'CANCELADO', 'RECEBIDO');

-- CreateEnum
CREATE TYPE "FormaPagamentoFinanceira" AS ENUM ('PIX', 'BOLETO', 'TRANSFERENCIA', 'DINHEIRO', 'CARTAO', 'DEBITO_AUTOMATICO');

-- CreateEnum
CREATE TYPE "PeriodicidadeFinanceira" AS ENUM ('MENSAL', 'QUINZENAL', 'ANUAL', 'UNICA');

-- CreateEnum
CREATE TYPE "TipoEventoCasoFinanceiro" AS ENUM ('HONORARIO_CONTRATUAL', 'HONORARIO_EXITO', 'SUCUMBENCIA', 'ACORDO', 'LEVANTAMENTO', 'REEMBOLSO', 'CUSTA', 'DESPESA');

-- CreateEnum
CREATE TYPE "StatusCasoFinanceiro" AS ENUM ('PREVISTO', 'A_RECEBER', 'RECEBIDO_PARCIAL', 'RECEBIDO_INTEGRAL', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "ModoRateioHonorario" AS ENUM ('MANUAL', 'IGUALITARIO', 'PERCENTUAL', 'RETENCAO_ADMINISTRATIVA', 'PAPEL_NO_CASO');

-- CreateEnum
CREATE TYPE "PapelCasoFinanceiro" AS ENUM ('CAPTACAO', 'ESTRATEGIA', 'AUDIENCIA', 'EXECUCAO', 'RESPONSAVEL_PRINCIPAL', 'APOIO');

-- CreateEnum
CREATE TYPE "StatusRateioHonorario" AS ENUM ('PENDENTE', 'PARCIAL', 'PAGO');

-- CreateEnum
CREATE TYPE "TipoRepasseHonorario" AS ENUM ('ADVOGADO', 'SOCIO', 'FUNCIONARIO', 'COMERCIAL');

-- CreateEnum
CREATE TYPE "TipoDespesaProcessoFinanceiro" AS ENUM ('CUSTA', 'DESLOCAMENTO', 'COPIAS', 'PERICIA', 'CORRESPONDENTE', 'DESPESA_ADMINISTRATIVA_RATEADA', 'OUTROS');

-- CreateEnum
CREATE TYPE "ResponsavelPagamentoDespesaProcesso" AS ENUM ('ESCRITORIO', 'CLIENTE', 'ADVOGADO');

-- CreateEnum
CREATE TYPE "StatusDespesaProcessoFinanceiro" AS ENUM ('PENDENTE', 'PAGO', 'REEMBOLSADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoVinculoFuncionarioFinanceiro" AS ENUM ('CLT', 'ESTAGIO', 'PJ', 'AUTONOMO');

-- CreateEnum
CREATE TYPE "StatusRegistroFinanceiroAtivo" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "StatusPagamentoFolha" AS ENUM ('PENDENTE', 'PAGO', 'PARCIAL', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusPublicacao" AS ENUM ('PENDENTE', 'DISTRIBUIDA', 'IGNORADA', 'VINCULADA');

-- CreateEnum
CREATE TYPE "TipoHistoricoPublicacao" AS ENUM ('CRIADA', 'STATUS_ALTERADO', 'PROCESSO_VINCULADO', 'PROCESSO_DESVINCULADO', 'REGRA_TRIAGEM_APLICADA', 'PRAZO_GERADO_IA', 'PRAZO_NAO_IDENTIFICADO');

-- CreateEnum
CREATE TYPE "StatusAutomacaoJob" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED', 'CANCELED');

-- CreateEnum

-- CreateEnum

-- CreateEnum

-- CreateEnum
CREATE TYPE "StatusAutomacaoLog" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "StatusDistribuicao" AS ENUM ('SUGERIDA', 'APROVADA', 'REJEITADA', 'REDISTRIBUIDA');

-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'OUTLOOK');

-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('PRAZO_VENCENDO', 'PRAZO_VENCIDO', 'TAREFA_ATRIBUIDA', 'TAREFA_REATRIBUIDA', 'FATURA_VENCENDO', 'FATURA_VENCIDA', 'AUDIENCIA_PROXIMA', 'ANIVERSARIANTE', 'PROCESSO_MOVIMENTACAO', 'SISTEMA', 'MENSAGEM_RECEBIDA', 'ENVIO_FALHOU');

-- CreateEnum
CREATE TYPE "WhatsAppOptIn" AS ENUM ('OPTED_IN', 'OPTED_OUT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CanalComunicacao" AS ENUM ('WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'RECEIVED', 'FAILED');

-- CreateEnum

-- CreateEnum

-- CreateEnum

-- CreateEnum

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('PRAZO_D5', 'PRAZO_D3', 'PRAZO_D1', 'PRAZO_D0', 'PROCESSO_STATUS_CHANGED', 'PROCESSO_MOVIMENTACAO', 'TAREFA_CRIADA', 'TAREFA_VENCIDA', 'TAREFA_CONCLUIDA', 'PIPELINE_ETAPA_CHANGED', 'FATURA_VENCENDO', 'FATURA_VENCIDA', 'REUNIAO_CONFIRMACAO_CLIENTE', 'REUNIAO_LEMBRETE_CLIENTE_D1', 'REUNIAO_LEMBRETE_CLIENTE_H1', 'REUNIAO_LEMBRETE_RESPONSAVEL_D1', 'REUNIAO_LEMBRETE_RESPONSAVEL_H1', 'REUNIAO_CONFIRMADA', 'REUNIAO_REMARCACAO_SOLICITADA', 'REUNIAO_CANCELADA');

-- CreateEnum
CREATE TYPE "RuleTarget" AS ENUM ('CLIENTE', 'RESPONSAVEL', 'AMBOS');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LegalAgentConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "LegalAgentMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecipientStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED', 'OPT_OUT');

-- CreateEnum
CREATE TYPE "CRMOpportunityStatus" AS ENUM ('ABERTO', 'GANHA', 'PERDIDA', 'CONGELADA');

-- CreateEnum
CREATE TYPE "CRMActivityType" AS ENUM ('LIGACAO', 'REUNIAO_PRESENCIAL', 'REUNIAO_ONLINE', 'EMAIL', 'WHATSAPP', 'TAREFA_INTERNA', 'AUDIENCIA_COMERCIAL');

-- CreateEnum
CREATE TYPE "CRMActivityOutcome" AS ENUM ('PENDENTE', 'REALIZADA', 'NAO_REALIZADA', 'REAGENDADA', 'ATENDIDA', 'NAO_ATENDIDA', 'CAIXA_POSTAL', 'REMARCADA', 'NAO_COMPARECEU');

-- CreateEnum
CREATE TYPE "CRMDocumentType" AS ENUM ('PROPOSTA_HONORARIOS', 'CONTRATO_SERVICOS', 'MINUTA_ACORDO', 'QUESTIONARIO_INTAKE', 'TERMO_CONFIDENCIALIDADE', 'OUTRO');

-- CreateEnum
CREATE TYPE "CRMConflictEntityType" AS ENUM ('CLIENTE', 'PARTE_CONTRARIA', 'PROCESSO');

-- CreateEnum
CREATE TYPE "CRMConflictDecision" AS ENUM ('EM_ANALISE', 'PROSSEGUIR', 'RECUSAR');

-- CreateEnum
CREATE TYPE "CRMLGPDActionType" AS ENUM ('CONSENTIMENTO', 'REVOGACAO_CONSENTIMENTO', 'ANONIMIZACAO', 'ELIMINACAO', 'CONSULTA_DADOS');

-- CreateEnum
CREATE TYPE "ContactTagCategory" AS ENUM ('PROCESSOS', 'PRAZOS', 'COBRANCAS', 'ATENDIMENTO', 'OUTROS');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADVOGADO',
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escritorios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escritorios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feriados" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "recorrente" BOOLEAN NOT NULL DEFAULT true,
    "abrangencia" TEXT NOT NULL DEFAULT 'NACIONAL',
    "escritorioId" TEXT NOT NULL,

    CONSTRAINT "feriados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_acao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "grupo" TEXT,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "escritorioId" TEXT NOT NULL,

    CONSTRAINT "tipos_acao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fases_processuais" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "cor" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "escritorioId" TEXT NOT NULL,

    CONSTRAINT "fases_processuais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "origens_cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "origens_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "tipoPessoa" "TipoPessoa" NOT NULL DEFAULT 'FISICA',
    "status" "StatusCliente" NOT NULL DEFAULT 'PROSPECTO',
    "temperatura" "LeadTemperatura",
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "rg" TEXT,
    "dataNascimento" DATE,
    "razaoSocial" TEXT,
    "cnpj" TEXT,
    "nomeFantasia" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "celular" TEXT,
    "whatsapp" TEXT,
    "endereco" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "origemId" TEXT,
    "observacoes" TEXT,
    "inadimplente" BOOLEAN NOT NULL DEFAULT false,
    "crmRelationship" "CRMRelationshipType" NOT NULL DEFAULT 'LEAD',
    "crmInterestLevel" "CRMInterestLevel",
    "crmScore" INTEGER NOT NULL DEFAULT 0,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "marketingConsentAt" TIMESTAMP(3),
    "marketingConsentChannel" "CanalComunicacao",
    "marketingConsentSource" TEXT,
    "dadosOrigem" TEXT,
    "dadosOrigemDetalhe" TEXT,
    "lastContactAt" TIMESTAMP(3),
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advogados" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oab" TEXT NOT NULL,
    "seccional" TEXT NOT NULL,
    "especialidades" TEXT,
    "comissaoPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "advogados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tribunais_catalogo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "ramo" TEXT NOT NULL,
    "uf" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tribunais_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tribunal_sources" (
    "id" TEXT NOT NULL,
    "tribunalId" TEXT NOT NULL,
    "sourceType" "TribunalSourceType" NOT NULL,
    "baseUrl" TEXT,
    "alias" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "requiresCert" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tribunal_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "times" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "cor" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_membros" (
    "id" TEXT NOT NULL,
    "timeId" TEXT NOT NULL,
    "advogadoId" TEXT NOT NULL,
    "lider" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "time_membros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processos" (
    "id" TEXT NOT NULL,
    "numeroCnj" TEXT,
    "tipo" "TipoProcesso" NOT NULL DEFAULT 'JUDICIAL',
    "status" "StatusProcesso" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "resultado" "ResultadoProcesso" NOT NULL DEFAULT 'PENDENTE',
    "tipoAcaoId" TEXT,
    "faseProcessualId" TEXT,
    "tribunal" TEXT,
    "vara" TEXT,
    "comarca" TEXT,
    "foro" TEXT,
    "objeto" TEXT,
    "valorCausa" DECIMAL(15,2),
    "valorContingencia" DECIMAL(15,2),
    "riscoContingencia" TEXT,
    "dataDistribuicao" DATE,
    "dataEncerramento" DATE,
    "advogadoId" TEXT NOT NULL,
    "clienteId" TEXT,
    "observacoes" TEXT,
    "dataUltimaMovimentacao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processo_atribuicao_logs" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "fromAdvogadoId" TEXT,
    "toAdvogadoId" TEXT NOT NULL,
    "automatico" BOOLEAN NOT NULL DEFAULT false,
    "modoDistribuicao" TEXT,
    "mesmaEquipe" BOOLEAN NOT NULL DEFAULT false,
    "scoreOrigem" DOUBLE PRECISION,
    "scoreDestino" DOUBLE PRECISION,
    "motivo" TEXT,
    "triggeredByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processo_atribuicao_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partes_processo" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "clienteId" TEXT,
    "tipoParte" "TipoParte" NOT NULL,
    "nome" TEXT,
    "cpfCnpj" TEXT,
    "advogado" TEXT,

    CONSTRAINT "partes_processo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" TEXT,
    "fonte" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processos_vinculados" (
    "id" TEXT NOT NULL,
    "processoOrigemId" TEXT NOT NULL,
    "processoDestinoId" TEXT NOT NULL,
    "tipoVinculo" "TipoVinculo" NOT NULL,

    CONSTRAINT "processos_vinculados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prazos" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "advogadoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataFatal" DATE NOT NULL,
    "dataCortesia" DATE,
    "tipoContagem" "TipoContagem" NOT NULL DEFAULT 'DIAS_UTEIS',
    "status" "StatusPrazo" NOT NULL DEFAULT 'PENDENTE',
    "fatal" BOOLEAN NOT NULL DEFAULT true,
    "origem" "OrigemPrazo" NOT NULL DEFAULT 'MANUAL',
    "origemPublicacaoId" TEXT,
    "origemConfianca" DOUBLE PRECISION,
    "origemDados" JSONB,
    "concluidoEm" TIMESTAMP(3),
    "concluidoPorId" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prazos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audiencias" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "advogadoId" TEXT NOT NULL,
    "tipo" "TipoAudiencia" NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "local" TEXT,
    "sala" TEXT,
    "observacoes" TEXT,
    "realizada" BOOLEAN NOT NULL DEFAULT false,
    "resultadoResumo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audiencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compromissos" (
    "id" TEXT NOT NULL,
    "advogadoId" TEXT NOT NULL,
    "clienteId" TEXT,
    "atendimentoId" TEXT,
    "tipo" "TipoCompromisso" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "local" TEXT,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "statusConfirmacao" "StatusConfirmacaoCompromisso" NOT NULL DEFAULT 'PENDENTE',
    "confirmadoAt" TIMESTAMP(3),
    "canceladoAt" TIMESTAMP(3),
    "motivoCancelamento" TEXT,
    "googleEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compromissos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compromisso_reminders" (
    "id" TEXT NOT NULL,
    "compromissoId" TEXT NOT NULL,
    "kind" "CompromissoReminderKind" NOT NULL,
    "status" "CompromissoReminderStatus" NOT NULL DEFAULT 'PENDENTE',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "jobCorrelationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compromisso_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prioridade" "PrioridadeTarefa" NOT NULL DEFAULT 'NORMAL',
    "status" "StatusTarefa" NOT NULL DEFAULT 'A_FAZER',
    "pontos" INTEGER NOT NULL DEFAULT 1,
    "categoriaEntrega" "CategoriaEntrega",
    "dataLimite" DATE,
    "concluidaEm" TIMESTAMP(3),
    "processoId" TEXT,
    "advogadoId" TEXT NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "horasEstimadas" DOUBLE PRECISION,
    "horasGastas" DOUBLE PRECISION DEFAULT 0,
    "workflowTemplateId" TEXT,
    "ordemWorkflow" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefa_comentarios" (
    "id" TEXT NOT NULL,
    "tarefaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarefa_comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefa_checklists" (
    "id" TEXT NOT NULL,
    "tarefaId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tarefa_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefa_registros_hora" (
    "id" TEXT NOT NULL,
    "tarefaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "horas" DOUBLE PRECISION NOT NULL,
    "descricao" TEXT,
    "data" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarefa_registros_hora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "faseProcessualId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_etapas" (
    "id" TEXT NOT NULL,
    "workflowTemplateId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "pontos" INTEGER NOT NULL DEFAULT 1,
    "ordem" INTEGER NOT NULL,
    "diasPrazo" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "workflow_etapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atendimentos" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "advogadoId" TEXT NOT NULL,
    "status" "StatusAtendimento" NOT NULL DEFAULT 'LEAD',
    "canal" "CanalAtendimento" NOT NULL DEFAULT 'PRESENCIAL',
    "viabilidade" "ViabilidadeAtendimento" NOT NULL DEFAULT 'EM_ANALISE',
    "assunto" TEXT NOT NULL,
    "resumo" TEXT,
    "dataRetorno" TIMESTAMP(3),
    "processoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atendimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atendimento_historicos" (
    "id" TEXT NOT NULL,
    "atendimentoId" TEXT NOT NULL,
    "canal" "CanalAtendimento" NOT NULL,
    "descricao" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atendimento_historicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "honorarios" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" "TipoHonorario" NOT NULL,
    "status" "StatusHonorario" NOT NULL DEFAULT 'ATIVO',
    "valorTotal" DECIMAL(15,2) NOT NULL,
    "percentualExito" DECIMAL(5,2),
    "valorHora" DECIMAL(10,2),
    "descricao" TEXT,
    "dataContrato" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "honorarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_flows" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" "TriggerType" NOT NULL,
    "triggerConfig" JSONB,
    "nodes" JSONB NOT NULL DEFAULT '[]',
    "edges" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_executions" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "clienteId" TEXT,
    "processoId" TEXT,
    "status" "FlowExecutionStatus" NOT NULL DEFAULT 'RUNNING',
    "currentNodeId" TEXT,
    "errorMessage" TEXT,
    "log" JSONB NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "flow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faturas" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "honorarioId" TEXT,
    "clienteId" TEXT NOT NULL,
    "status" "StatusFatura" NOT NULL DEFAULT 'PENDENTE',
    "valorTotal" DECIMAL(15,2) NOT NULL,
    "dataEmissao" DATE NOT NULL,
    "dataVencimento" DATE NOT NULL,
    "dataPagamento" DATE,
    "descricao" TEXT,
    "recorrente" BOOLEAN NOT NULL DEFAULT false,
    "gatewayId" TEXT,
    "boletoUrl" TEXT,
    "pixCode" TEXT,
    "centroCustoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fatura_parcelas" (
    "id" TEXT NOT NULL,
    "faturaId" TEXT NOT NULL,
    "numeroParcela" INTEGER NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "dataVencimento" DATE NOT NULL,
    "dataPagamento" DATE,
    "status" "StatusFatura" NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "fatura_parcelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_pagar" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" "TipoConta" NOT NULL DEFAULT 'DESPESA_ESCRITORIO',
    "valor" DECIMAL(15,2) NOT NULL,
    "dataVencimento" DATE NOT NULL,
    "dataPagamento" DATE,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "processoId" TEXT,
    "centroCustoId" TEXT,
    "contaBancariaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_bancarias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "banco" TEXT,
    "agencia" TEXT,
    "conta" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'CORRENTE',
    "saldoInicial" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "escritorioId" TEXT NOT NULL,

    CONSTRAINT "contas_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centros_custo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "escritorioId" TEXT NOT NULL,

    CONSTRAINT "centros_custo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comissoes" (
    "id" TEXT NOT NULL,
    "advogadoId" TEXT NOT NULL,
    "faturaId" TEXT,
    "valor" DECIMAL(15,2) NOT NULL,
    "percentual" DECIMAL(5,2) NOT NULL,
    "referencia" TEXT,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "dataPagamento" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financeiro_escritorio_lancamentos" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "tipoLancamento" "TipoLancamentoFinanceiro" NOT NULL,
    "classificacao" "ClassificacaoLancamentoFinanceiro" NOT NULL,
    "categoriaPrincipal" TEXT NOT NULL,
    "subcategoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "centroCustoId" TEXT,
    "processoId" TEXT,
    "clienteId" TEXT,
    "valorPrevisto" DECIMAL(15,2) NOT NULL,
    "valorReal" DECIMAL(15,2),
    "dataCompetencia" DATE NOT NULL,
    "dataVencimento" DATE,
    "dataPagamento" DATE,
    "status" "StatusLancamentoFinanceiro" NOT NULL DEFAULT 'PENDENTE',
    "formaPagamento" "FormaPagamentoFinanceira",
    "recorrente" BOOLEAN NOT NULL DEFAULT false,
    "periodicidade" "PeriodicidadeFinanceira" NOT NULL DEFAULT 'UNICA',
    "fornecedorBeneficiario" TEXT,
    "reembolsavel" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "anexos" JSONB,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financeiro_escritorio_lancamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caso_financeiro" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "contratoId" TEXT,
    "tipoEvento" "TipoEventoCasoFinanceiro" NOT NULL,
    "descricaoEvento" TEXT NOT NULL,
    "valorBrutoCaso" DECIMAL(15,2),
    "baseCalculoHonorario" DECIMAL(15,2),
    "percentualHonorarioEscritorio" DECIMAL(5,2),
    "valorHonorarioEscritorio" DECIMAL(15,2),
    "valorRecebidoEscritorio" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "valorAReceberEscritorio" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "modoRateio" "ModoRateioHonorario" NOT NULL DEFAULT 'PERCENTUAL',
    "retencaoAdministrativaPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "retencaoAdministrativaValor" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "impostosCaso" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "dataResultado" DATE,
    "dataRecebimento" DATE,
    "statusFinanceiro" "StatusCasoFinanceiro" NOT NULL DEFAULT 'PREVISTO',
    "observacoes" TEXT,
    "comprovantes" JSONB,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caso_financeiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caso_participantes" (
    "id" TEXT NOT NULL,
    "casoFinanceiroId" TEXT NOT NULL,
    "advogadoId" TEXT NOT NULL,
    "papelNoCaso" "PapelCasoFinanceiro" NOT NULL,
    "percentualParticipacao" DECIMAL(5,2) NOT NULL,
    "valorPrevistoRateio" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "valorPagoRateio" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "valorPendenteRateio" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "dataPagamento" DATE,
    "statusRateio" "StatusRateioHonorario" NOT NULL DEFAULT 'PENDENTE',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caso_participantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repasses_honorarios" (
    "id" TEXT NOT NULL,
    "casoFinanceiroId" TEXT NOT NULL,
    "advogadoId" TEXT,
    "funcionarioId" TEXT,
    "tipoRepasse" "TipoRepasseHonorario" NOT NULL,
    "valorPrevisto" DECIMAL(15,2) NOT NULL,
    "valorPago" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "dataPrevista" DATE,
    "dataPagamento" DATE,
    "status" "StatusRateioHonorario" NOT NULL DEFAULT 'PENDENTE',
    "formaPagamento" "FormaPagamentoFinanceira",
    "observacoes" TEXT,
    "aprovadoPorId" TEXT,
    "aprovadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repasses_honorarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despesas_processo" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "clienteId" TEXT,
    "casoFinanceiroId" TEXT,
    "tipoDespesa" "TipoDespesaProcessoFinanceiro" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "pagoPor" "ResponsavelPagamentoDespesaProcesso" NOT NULL,
    "reembolsavel" BOOLEAN NOT NULL DEFAULT false,
    "dataLancamento" DATE NOT NULL,
    "dataPagamento" DATE,
    "status" "StatusDespesaProcessoFinanceiro" NOT NULL DEFAULT 'PENDENTE',
    "comprovante" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "despesas_processo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funcionarios_financeiro" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipoVinculo" "TipoVinculoFuncionarioFinanceiro" NOT NULL,
    "salarioBase" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "beneficios" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "encargos" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "comissao" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ajudaCusto" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "valorTotalMensal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "centroCustoId" TEXT,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE,
    "status" "StatusRegistroFinanceiroAtivo" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funcionarios_financeiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funcionarios_lancamentos" (
    "id" TEXT NOT NULL,
    "funcionarioFinanceiroId" TEXT NOT NULL,
    "competencia" DATE NOT NULL,
    "salario" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "valeTransporte" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "valeRefeicao" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "comissao" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "encargos" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "desconto" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "valorTotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "statusPagamento" "StatusPagamentoFolha" NOT NULL DEFAULT 'PENDENTE',
    "dataPagamento" DATE,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funcionarios_lancamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_documento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "cor" TEXT DEFAULT '#E9AE60',
    "escritorioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pastas_documento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "escritorioId" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pastas_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelo_documentos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoriaId" TEXT,
    "conteudo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "escritorioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modelo_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_variaveis" (
    "id" TEXT NOT NULL,
    "modeloId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "origem" TEXT NOT NULL,

    CONSTRAINT "documento_variaveis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "processoId" TEXT,
    "pastaId" TEXT,
    "categoriaId" TEXT,
    "escritorioId" TEXT,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT,
    "arquivoUrl" TEXT,
    "arquivoNome" TEXT,
    "arquivoTamanho" INTEGER,
    "mimeType" TEXT,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicacoes" (
    "id" TEXT NOT NULL,
    "tribunal" TEXT NOT NULL,
    "diario" TEXT,
    "dataPublicacao" DATE NOT NULL,
    "conteudo" TEXT NOT NULL,
    "identificador" TEXT,
    "processoNumero" TEXT,
    "partesTexto" TEXT,
    "oabsEncontradas" TEXT[],
    "importadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StatusPublicacao" NOT NULL DEFAULT 'PENDENTE',
    "processoId" TEXT,
    "advogadoId" TEXT,

    CONSTRAINT "publicacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicacao_historicos" (
    "id" TEXT NOT NULL,
    "publicacaoId" TEXT NOT NULL,
    "tipo" "TipoHistoricoPublicacao" NOT NULL,
    "descricao" TEXT NOT NULL,
    "statusAnterior" "StatusPublicacao",
    "statusNovo" "StatusPublicacao",
    "origem" TEXT NOT NULL DEFAULT 'MANUAL',
    "metadados" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publicacao_historicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicacao_regras_triagem" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "prioridade" INTEGER NOT NULL DEFAULT 100,
    "tribunal" TEXT,
    "statusDestino" "StatusPublicacao" NOT NULL DEFAULT 'PENDENTE',
    "palavrasChaveIncluir" TEXT[],
    "palavrasChaveExcluir" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publicacao_regras_triagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automacao_jobs" (
    "id" TEXT NOT NULL,
    "advogadoId" TEXT NOT NULL,
    "modo" TEXT NOT NULL DEFAULT 'NACIONAL',
    "status" "StatusAutomacaoJob" NOT NULL DEFAULT 'QUEUED',
    "janelaInicio" TIMESTAMP(3),
    "janelaFim" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "erroResumo" TEXT,
    "totalTribunais" INTEGER NOT NULL DEFAULT 0,
    "sucessoTribunais" INTEGER NOT NULL DEFAULT 0,
    "falhaTribunais" INTEGER NOT NULL DEFAULT 0,
    "publicacoesCapturadas" INTEGER NOT NULL DEFAULT 0,
    "publicacoesImportadas" INTEGER NOT NULL DEFAULT 0,
    "prazosCriados" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automacao_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable

-- CreateTable
CREATE TABLE "automacao_logs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "tribunal" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),
    "status" "StatusAutomacaoLog" NOT NULL DEFAULT 'QUEUED',
    "erro" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automacao_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribuicoes" (
    "id" TEXT NOT NULL,
    "publicacaoId" TEXT NOT NULL,
    "advogadoId" TEXT NOT NULL,
    "status" "StatusDistribuicao" NOT NULL DEFAULT 'SUGERIDA',
    "cargaNoMomento" INTEGER NOT NULL DEFAULT 0,
    "motivo" TEXT,
    "aprovadoPor" TEXT,
    "aprovadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distribuicoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_integrations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "calendarId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "syncErrors" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "prazoId" TEXT,
    "audienciaId" TEXT,
    "compromissoId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "location" TEXT,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncDirection" TEXT NOT NULL DEFAULT 'outbound',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "linkUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_phones" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneDisplay" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'principal',
    "isWhatsApp" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "whatsappOptIn" "WhatsAppOptIn" NOT NULL DEFAULT 'OPTED_IN',
    "lastContactAt" TIMESTAMP(3),
    "lastInboundAt" TIMESTAMP(3),
    "lastOutboundAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_phones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "canal" "CanalComunicacao" NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT,
    "processoId" TEXT,
    "assignedToId" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "canal" "CanalComunicacao" NOT NULL,
    "content" TEXT NOT NULL,
    "contentHtml" TEXT,
    "templateId" TEXT,
    "templateVars" JSONB,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "providerMsgId" TEXT,
    "errorMessage" TEXT,
    "senderPhone" TEXT,
    "senderName" TEXT,
    "processoId" TEXT,
    "prazoId" TEXT,
    "tarefaId" TEXT,
    "sentById" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "fileUrl" TEXT NOT NULL,
    "providerUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "canal" "CanalComunicacao",
    "category" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "contentHtml" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable

-- CreateTable

-- CreateTable

-- CreateTable

-- CreateTable

-- CreateTable

-- CreateTable
CREATE TABLE "notification_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "canal" "CanalComunicacao",
    "templateId" TEXT NOT NULL,
    "target" "RuleTarget" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggerOffset" INTEGER,
    "sendHourStart" INTEGER DEFAULT 8,
    "sendHourEnd" INTEGER DEFAULT 18,
    "workdaysOnly" BOOLEAN NOT NULL DEFAULT true,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "retryInterval" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_jobs" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT,
    "canal" "CanalComunicacao" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "recipientPhone" TEXT,
    "recipientEmail" TEXT,
    "clienteId" TEXT,
    "userId" TEXT,
    "templateId" TEXT,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "contentHtml" TEXT,
    "variables" JSONB,
    "attachments" JSONB,
    "processoId" TEXT,
    "prazoId" TEXT,
    "tarefaId" TEXT,
    "compromissoId" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastAttemptAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "providerMsgId" TEXT,
    "correlationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_agent_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "title" TEXT,
    "status" "LegalAgentConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "memorySummary" TEXT,
    "summaryMessageCount" INTEGER NOT NULL DEFAULT 0,
    "memoryUpdatedAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_agent_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_agent_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "LegalAgentMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT,
    "promptChars" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_agent_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_agent_message_attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "fileUrl" TEXT NOT NULL,
    "extractedText" TEXT,
    "extractedChars" INTEGER NOT NULL DEFAULT 0,
    "extractionStatus" TEXT NOT NULL DEFAULT 'unsupported',
    "extractionMethod" TEXT NOT NULL DEFAULT 'none',
    "warning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_agent_message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_auditoria" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "dadosAntes" JSONB,
    "dadosDepois" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_segments" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" JSONB NOT NULL DEFAULT '[]',
    "isDynamic" BOOLEAN NOT NULL DEFAULT true,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_segment_members" (
    "segmentId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_segment_members_pkey" PRIMARY KEY ("segmentId","clienteId")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "canal" "CanalComunicacao" NOT NULL,
    "templateId" TEXT,
    "segmentId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "rateLimit" INTEGER NOT NULL DEFAULT 15,
    "intervalMs" INTEGER NOT NULL DEFAULT 4000,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_recipients" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "status" "RecipientStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "providerMsgId" TEXT,
    "openedAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),

    CONSTRAINT "campaign_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_pipelines" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "areaDireito" TEXT,
    "tipoCliente" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "stages" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_cards" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "stage" TEXT NOT NULL,
    "status" "CRMOpportunityStatus" NOT NULL DEFAULT 'ABERTO',
    "areaDireito" TEXT,
    "subareaDireito" TEXT,
    "origem" TEXT,
    "value" DOUBLE PRECISION DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "probability" INTEGER DEFAULT 0,
    "expectedCloseAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "ownerId" TEXT,
    "responsavelAdvogadoId" TEXT,
    "equipeResponsavel" TEXT,
    "lostReasonId" TEXT,
    "lostReasonDetail" TEXT,
    "urgency" TEXT,
    "penalSituacaoInvestigado" TEXT,
    "localCustodia" TEXT,
    "prazosCriticos" TEXT,
    "civilTipoDemanda" TEXT,
    "valorCausaEstimado" DOUBLE PRECISION,
    "parteAdversa" TEXT,
    "trabalhistaTipo" TEXT,
    "vinculoEmpregaticio" TEXT,
    "tempoServicoMeses" INTEGER,
    "principaisPedidosRiscos" TEXT,
    "previdenciarioTipoBeneficio" TEXT,
    "situacaoInss" TEXT,
    "convertedToProcess" BOOLEAN NOT NULL DEFAULT false,
    "convertedAt" TIMESTAMP(3),
    "history" JSONB NOT NULL DEFAULT '[]',
    "firstResponseAt" TIMESTAMP(3),
    "lastContactAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_loss_reasons" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_loss_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_card_process_links" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "processoId" TEXT,
    "numeroCnj" TEXT,
    "tipoAcao" TEXT,
    "varaOrgaoJulgador" TEXT,
    "statusProcesso" TEXT,
    "faseProcessual" TEXT,
    "valorCausa" DOUBLE PRECISION,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_card_process_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_activities" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "type" "CRMActivityType" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "outcome" "CRMActivityOutcome" NOT NULL DEFAULT 'PENDENTE',
    "nextStep" TEXT,
    "ownerId" TEXT,
    "clienteId" TEXT,
    "cardId" TEXT,
    "processoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_commercial_documents" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "clienteId" TEXT,
    "cardId" TEXT,
    "processoId" TEXT,
    "type" "CRMDocumentType" NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "fileUrl" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "templateName" TEXT,
    "mergeData" JSONB,
    "signedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_commercial_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_conflict_checks" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "cardId" TEXT,
    "clienteId" TEXT,
    "entityType" "CRMConflictEntityType" NOT NULL,
    "matchedEntityId" TEXT,
    "matchedEntityLabel" TEXT,
    "reason" TEXT,
    "decision" "CRMConflictDecision" NOT NULL DEFAULT 'EM_ANALISE',
    "decisionNotes" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_conflict_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_stage_transitions" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT NOT NULL,
    "changedById" TEXT,
    "notes" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_stage_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_lgpd_events" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "actionType" "CRMLGPDActionType" NOT NULL,
    "details" TEXT,
    "requestedById" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_lgpd_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_tags" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ContactTagCategory" NOT NULL DEFAULT 'ATENDIMENTO',
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente_contact_tags" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "cliente_contact_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "escritorios_cnpj_key" ON "escritorios"("cnpj");

-- CreateIndex
CREATE INDEX "feriados_data_idx" ON "feriados"("data");

-- CreateIndex
CREATE UNIQUE INDEX "feriados_data_escritorioId_key" ON "feriados"("data", "escritorioId");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_acao_nome_escritorioId_key" ON "tipos_acao"("nome", "escritorioId");

-- CreateIndex
CREATE INDEX "fases_processuais_ordem_idx" ON "fases_processuais"("ordem");

-- CreateIndex
CREATE UNIQUE INDEX "fases_processuais_nome_escritorioId_key" ON "fases_processuais"("nome", "escritorioId");

-- CreateIndex
CREATE UNIQUE INDEX "origens_cliente_nome_key" ON "origens_cliente"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cpf_key" ON "clientes"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cnpj_key" ON "clientes"("cnpj");

-- CreateIndex
CREATE INDEX "clientes_nome_idx" ON "clientes"("nome");

-- CreateIndex
CREATE INDEX "clientes_cpf_idx" ON "clientes"("cpf");

-- CreateIndex
CREATE INDEX "clientes_cnpj_idx" ON "clientes"("cnpj");

-- CreateIndex
CREATE INDEX "clientes_status_idx" ON "clientes"("status");

-- CreateIndex
CREATE INDEX "clientes_inadimplente_idx" ON "clientes"("inadimplente");

-- CreateIndex
CREATE UNIQUE INDEX "advogados_userId_key" ON "advogados"("userId");

-- CreateIndex
CREATE INDEX "advogados_oab_idx" ON "advogados"("oab");

-- CreateIndex
CREATE UNIQUE INDEX "tribunais_catalogo_sigla_key" ON "tribunais_catalogo"("sigla");

-- CreateIndex
CREATE INDEX "tribunais_catalogo_ramo_idx" ON "tribunais_catalogo"("ramo");

-- CreateIndex
CREATE INDEX "tribunais_catalogo_uf_idx" ON "tribunais_catalogo"("uf");

-- CreateIndex
CREATE INDEX "tribunais_catalogo_ativo_idx" ON "tribunais_catalogo"("ativo");

-- CreateIndex
CREATE INDEX "tribunal_sources_sourceType_enabled_idx" ON "tribunal_sources"("sourceType", "enabled");

-- CreateIndex
CREATE INDEX "tribunal_sources_alias_idx" ON "tribunal_sources"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "tribunal_sources_tribunalId_sourceType_key" ON "tribunal_sources"("tribunalId", "sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "times_nome_key" ON "times"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "time_membros_timeId_advogadoId_key" ON "time_membros"("timeId", "advogadoId");

-- CreateIndex
CREATE UNIQUE INDEX "processos_numeroCnj_key" ON "processos"("numeroCnj");

-- CreateIndex
CREATE INDEX "processos_numeroCnj_idx" ON "processos"("numeroCnj");

-- CreateIndex
CREATE INDEX "processos_status_idx" ON "processos"("status");

-- CreateIndex
CREATE INDEX "processos_tipo_idx" ON "processos"("tipo");

-- CreateIndex
CREATE INDEX "processos_advogadoId_idx" ON "processos"("advogadoId");

-- CreateIndex
CREATE INDEX "processos_clienteId_idx" ON "processos"("clienteId");

-- CreateIndex
CREATE INDEX "processos_faseProcessualId_idx" ON "processos"("faseProcessualId");

-- CreateIndex
CREATE INDEX "processos_tipoAcaoId_idx" ON "processos"("tipoAcaoId");

-- CreateIndex
CREATE INDEX "processos_dataDistribuicao_idx" ON "processos"("dataDistribuicao");

-- CreateIndex
CREATE INDEX "processos_dataUltimaMovimentacao_idx" ON "processos"("dataUltimaMovimentacao");

-- CreateIndex
CREATE INDEX "processo_atribuicao_logs_processoId_idx" ON "processo_atribuicao_logs"("processoId");

-- CreateIndex
CREATE INDEX "processo_atribuicao_logs_fromAdvogadoId_idx" ON "processo_atribuicao_logs"("fromAdvogadoId");

-- CreateIndex
CREATE INDEX "processo_atribuicao_logs_toAdvogadoId_idx" ON "processo_atribuicao_logs"("toAdvogadoId");

-- CreateIndex
CREATE INDEX "processo_atribuicao_logs_triggeredByUserId_idx" ON "processo_atribuicao_logs"("triggeredByUserId");

-- CreateIndex
CREATE INDEX "processo_atribuicao_logs_createdAt_idx" ON "processo_atribuicao_logs"("createdAt");

-- CreateIndex
CREATE INDEX "partes_processo_processoId_idx" ON "partes_processo"("processoId");

-- CreateIndex
CREATE INDEX "movimentacoes_processoId_idx" ON "movimentacoes"("processoId");

-- CreateIndex
CREATE INDEX "movimentacoes_data_idx" ON "movimentacoes"("data");

-- CreateIndex
CREATE UNIQUE INDEX "processos_vinculados_processoOrigemId_processoDestinoId_key" ON "processos_vinculados"("processoOrigemId", "processoDestinoId");

-- CreateIndex
CREATE INDEX "prazos_processoId_idx" ON "prazos"("processoId");

-- CreateIndex
CREATE INDEX "prazos_advogadoId_idx" ON "prazos"("advogadoId");

-- CreateIndex
CREATE INDEX "prazos_dataFatal_idx" ON "prazos"("dataFatal");

-- CreateIndex
CREATE INDEX "prazos_status_idx" ON "prazos"("status");

-- CreateIndex
CREATE INDEX "prazos_status_dataFatal_idx" ON "prazos"("status", "dataFatal");

-- CreateIndex
CREATE INDEX "prazos_origem_idx" ON "prazos"("origem");

-- CreateIndex
CREATE INDEX "prazos_origemPublicacaoId_idx" ON "prazos"("origemPublicacaoId");

-- CreateIndex
CREATE INDEX "prazos_origem_createdAt_idx" ON "prazos"("origem", "createdAt");

-- CreateIndex
CREATE INDEX "audiencias_processoId_idx" ON "audiencias"("processoId");

-- CreateIndex
CREATE INDEX "audiencias_advogadoId_idx" ON "audiencias"("advogadoId");

-- CreateIndex
CREATE INDEX "audiencias_data_idx" ON "audiencias"("data");

-- CreateIndex
CREATE INDEX "compromissos_advogadoId_idx" ON "compromissos"("advogadoId");

-- CreateIndex
CREATE INDEX "compromissos_clienteId_idx" ON "compromissos"("clienteId");

-- CreateIndex
CREATE INDEX "compromissos_atendimentoId_idx" ON "compromissos"("atendimentoId");

-- CreateIndex
CREATE INDEX "compromissos_dataInicio_idx" ON "compromissos"("dataInicio");

-- CreateIndex
CREATE INDEX "compromisso_reminders_status_scheduledFor_idx" ON "compromisso_reminders"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "compromisso_reminders_jobCorrelationId_idx" ON "compromisso_reminders"("jobCorrelationId");

-- CreateIndex
CREATE UNIQUE INDEX "compromisso_reminders_compromissoId_kind_key" ON "compromisso_reminders"("compromissoId", "kind");

-- CreateIndex
CREATE INDEX "tarefas_advogadoId_idx" ON "tarefas"("advogadoId");

-- CreateIndex
CREATE INDEX "tarefas_processoId_idx" ON "tarefas"("processoId");

-- CreateIndex
CREATE INDEX "tarefas_status_idx" ON "tarefas"("status");

-- CreateIndex
CREATE INDEX "tarefas_prioridade_idx" ON "tarefas"("prioridade");

-- CreateIndex
CREATE INDEX "tarefas_dataLimite_idx" ON "tarefas"("dataLimite");

-- CreateIndex
CREATE INDEX "tarefas_status_advogadoId_idx" ON "tarefas"("status", "advogadoId");

-- CreateIndex
CREATE INDEX "tarefa_comentarios_tarefaId_idx" ON "tarefa_comentarios"("tarefaId");

-- CreateIndex
CREATE INDEX "tarefa_checklists_tarefaId_idx" ON "tarefa_checklists"("tarefaId");

-- CreateIndex
CREATE INDEX "tarefa_registros_hora_tarefaId_idx" ON "tarefa_registros_hora"("tarefaId");

-- CreateIndex
CREATE INDEX "tarefa_registros_hora_userId_idx" ON "tarefa_registros_hora"("userId");

-- CreateIndex
CREATE INDEX "tarefa_registros_hora_data_idx" ON "tarefa_registros_hora"("data");

-- CreateIndex
CREATE INDEX "workflow_etapas_workflowTemplateId_idx" ON "workflow_etapas"("workflowTemplateId");

-- CreateIndex
CREATE INDEX "workflow_etapas_ordem_idx" ON "workflow_etapas"("ordem");

-- CreateIndex
CREATE INDEX "atendimentos_clienteId_idx" ON "atendimentos"("clienteId");

-- CreateIndex
CREATE INDEX "atendimentos_advogadoId_idx" ON "atendimentos"("advogadoId");

-- CreateIndex
CREATE INDEX "atendimentos_status_idx" ON "atendimentos"("status");

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex
CREATE INDEX "atendimentos_createdAt_idx" ON "atendimentos"("createdAt");

-- CreateIndex
CREATE INDEX "atendimento_historicos_atendimentoId_idx" ON "atendimento_historicos"("atendimentoId");

-- CreateIndex
CREATE INDEX "honorarios_processoId_idx" ON "honorarios"("processoId");

-- CreateIndex
CREATE INDEX "honorarios_clienteId_idx" ON "honorarios"("clienteId");

-- CreateIndex
CREATE INDEX "automation_flows_escritorioId_idx" ON "automation_flows"("escritorioId");

-- CreateIndex
CREATE INDEX "automation_flows_isActive_idx" ON "automation_flows"("isActive");

-- CreateIndex
CREATE INDEX "flow_executions_flowId_idx" ON "flow_executions"("flowId");

-- CreateIndex
CREATE INDEX "flow_executions_clienteId_idx" ON "flow_executions"("clienteId");

-- CreateIndex
CREATE INDEX "flow_executions_processoId_idx" ON "flow_executions"("processoId");

-- CreateIndex
CREATE INDEX "flow_executions_status_idx" ON "flow_executions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "faturas_numero_key" ON "faturas"("numero");

-- CreateIndex
CREATE INDEX "faturas_clienteId_idx" ON "faturas"("clienteId");

-- CreateIndex
CREATE INDEX "faturas_honorarioId_idx" ON "faturas"("honorarioId");

-- CreateIndex
CREATE INDEX "faturas_status_idx" ON "faturas"("status");

-- CreateIndex
CREATE INDEX "faturas_dataVencimento_idx" ON "faturas"("dataVencimento");

-- CreateIndex
CREATE INDEX "faturas_status_dataVencimento_idx" ON "faturas"("status", "dataVencimento");

-- CreateIndex
CREATE INDEX "fatura_parcelas_faturaId_idx" ON "fatura_parcelas"("faturaId");

-- CreateIndex
CREATE INDEX "fatura_parcelas_dataVencimento_idx" ON "fatura_parcelas"("dataVencimento");

-- CreateIndex
CREATE INDEX "contas_pagar_processoId_idx" ON "contas_pagar"("processoId");

-- CreateIndex
CREATE INDEX "contas_pagar_dataVencimento_idx" ON "contas_pagar"("dataVencimento");

-- CreateIndex
CREATE INDEX "contas_pagar_pago_idx" ON "contas_pagar"("pago");

-- CreateIndex
CREATE UNIQUE INDEX "centros_custo_nome_escritorioId_key" ON "centros_custo"("nome", "escritorioId");

-- CreateIndex
CREATE INDEX "comissoes_advogadoId_idx" ON "comissoes"("advogadoId");

-- CreateIndex
CREATE INDEX "comissoes_pago_idx" ON "comissoes"("pago");

-- CreateIndex
CREATE INDEX "financeiro_escritorio_lancamentos_escritorioId_dataCompeten_idx" ON "financeiro_escritorio_lancamentos"("escritorioId", "dataCompetencia");

-- CreateIndex
CREATE INDEX "financeiro_escritorio_lancamentos_centroCustoId_idx" ON "financeiro_escritorio_lancamentos"("centroCustoId");

-- CreateIndex
CREATE INDEX "financeiro_escritorio_lancamentos_processoId_idx" ON "financeiro_escritorio_lancamentos"("processoId");

-- CreateIndex
CREATE INDEX "financeiro_escritorio_lancamentos_clienteId_idx" ON "financeiro_escritorio_lancamentos"("clienteId");

-- CreateIndex
CREATE INDEX "financeiro_escritorio_lancamentos_status_idx" ON "financeiro_escritorio_lancamentos"("status");

-- CreateIndex
CREATE INDEX "financeiro_escritorio_lancamentos_tipoLancamento_classifica_idx" ON "financeiro_escritorio_lancamentos"("tipoLancamento", "classificacao");

-- CreateIndex
CREATE INDEX "caso_financeiro_escritorioId_statusFinanceiro_idx" ON "caso_financeiro"("escritorioId", "statusFinanceiro");

-- CreateIndex
CREATE INDEX "caso_financeiro_clienteId_idx" ON "caso_financeiro"("clienteId");

-- CreateIndex
CREATE INDEX "caso_financeiro_processoId_idx" ON "caso_financeiro"("processoId");

-- CreateIndex
CREATE INDEX "caso_financeiro_dataResultado_idx" ON "caso_financeiro"("dataResultado");

-- CreateIndex
CREATE INDEX "caso_financeiro_dataRecebimento_idx" ON "caso_financeiro"("dataRecebimento");

-- CreateIndex
CREATE INDEX "caso_participantes_casoFinanceiroId_idx" ON "caso_participantes"("casoFinanceiroId");

-- CreateIndex
CREATE INDEX "caso_participantes_advogadoId_idx" ON "caso_participantes"("advogadoId");

-- CreateIndex
CREATE INDEX "caso_participantes_statusRateio_idx" ON "caso_participantes"("statusRateio");

-- CreateIndex
CREATE INDEX "repasses_honorarios_casoFinanceiroId_idx" ON "repasses_honorarios"("casoFinanceiroId");

-- CreateIndex
CREATE INDEX "repasses_honorarios_advogadoId_idx" ON "repasses_honorarios"("advogadoId");

-- CreateIndex
CREATE INDEX "repasses_honorarios_funcionarioId_idx" ON "repasses_honorarios"("funcionarioId");

-- CreateIndex
CREATE INDEX "repasses_honorarios_status_idx" ON "repasses_honorarios"("status");

-- CreateIndex
CREATE INDEX "despesas_processo_processoId_idx" ON "despesas_processo"("processoId");

-- CreateIndex
CREATE INDEX "despesas_processo_clienteId_idx" ON "despesas_processo"("clienteId");

-- CreateIndex
CREATE INDEX "despesas_processo_casoFinanceiroId_idx" ON "despesas_processo"("casoFinanceiroId");

-- CreateIndex
CREATE INDEX "despesas_processo_status_idx" ON "despesas_processo"("status");

-- CreateIndex
CREATE UNIQUE INDEX "funcionarios_financeiro_userId_key" ON "funcionarios_financeiro"("userId");

-- CreateIndex
CREATE INDEX "funcionarios_financeiro_escritorioId_idx" ON "funcionarios_financeiro"("escritorioId");

-- CreateIndex
CREATE INDEX "funcionarios_financeiro_centroCustoId_idx" ON "funcionarios_financeiro"("centroCustoId");

-- CreateIndex
CREATE INDEX "funcionarios_financeiro_status_idx" ON "funcionarios_financeiro"("status");

-- CreateIndex
CREATE INDEX "funcionarios_lancamentos_funcionarioFinanceiroId_idx" ON "funcionarios_lancamentos"("funcionarioFinanceiroId");

-- CreateIndex
CREATE INDEX "funcionarios_lancamentos_competencia_idx" ON "funcionarios_lancamentos"("competencia");

-- CreateIndex
CREATE INDEX "funcionarios_lancamentos_statusPagamento_idx" ON "funcionarios_lancamentos"("statusPagamento");

-- CreateIndex
CREATE UNIQUE INDEX "funcionarios_lancamentos_funcionarioFinanceiroId_competenci_key" ON "funcionarios_lancamentos"("funcionarioFinanceiroId", "competencia");

-- CreateIndex
CREATE INDEX "categorias_documento_escritorioId_idx" ON "categorias_documento"("escritorioId");

-- CreateIndex
CREATE INDEX "pastas_documento_escritorioId_idx" ON "pastas_documento"("escritorioId");

-- CreateIndex
CREATE INDEX "pastas_documento_parentId_idx" ON "pastas_documento"("parentId");

-- CreateIndex
CREATE INDEX "modelo_documentos_categoriaId_idx" ON "modelo_documentos"("categoriaId");

-- CreateIndex
CREATE INDEX "modelo_documentos_escritorioId_idx" ON "modelo_documentos"("escritorioId");

-- CreateIndex
CREATE UNIQUE INDEX "documento_variaveis_modeloId_chave_key" ON "documento_variaveis"("modeloId", "chave");

-- CreateIndex
CREATE INDEX "documentos_processoId_idx" ON "documentos"("processoId");

-- CreateIndex
CREATE INDEX "documentos_pastaId_idx" ON "documentos"("pastaId");

-- CreateIndex
CREATE INDEX "documentos_categoriaId_idx" ON "documentos"("categoriaId");

-- CreateIndex
CREATE INDEX "documentos_escritorioId_idx" ON "documentos"("escritorioId");

-- CreateIndex
CREATE INDEX "publicacoes_dataPublicacao_idx" ON "publicacoes"("dataPublicacao");

-- CreateIndex
CREATE INDEX "publicacoes_status_idx" ON "publicacoes"("status");

-- CreateIndex
CREATE INDEX "publicacoes_tribunal_idx" ON "publicacoes"("tribunal");

-- CreateIndex
CREATE INDEX "publicacoes_advogadoId_idx" ON "publicacoes"("advogadoId");

-- CreateIndex
CREATE INDEX "publicacoes_processoNumero_idx" ON "publicacoes"("processoNumero");

-- CreateIndex
CREATE INDEX "publicacao_historicos_publicacaoId_createdAt_idx" ON "publicacao_historicos"("publicacaoId", "createdAt");

-- CreateIndex
CREATE INDEX "publicacao_historicos_tipo_idx" ON "publicacao_historicos"("tipo");

-- CreateIndex
CREATE INDEX "publicacao_regras_triagem_ativo_prioridade_idx" ON "publicacao_regras_triagem"("ativo", "prioridade");

-- CreateIndex
CREATE INDEX "publicacao_regras_triagem_statusDestino_idx" ON "publicacao_regras_triagem"("statusDestino");

-- CreateIndex
CREATE INDEX "publicacao_regras_triagem_tribunal_idx" ON "publicacao_regras_triagem"("tribunal");

-- CreateIndex
CREATE INDEX "automacao_jobs_advogadoId_createdAt_idx" ON "automacao_jobs"("advogadoId", "createdAt");

-- CreateIndex
CREATE INDEX "automacao_jobs_status_createdAt_idx" ON "automacao_jobs"("status", "createdAt");

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex
CREATE INDEX "automacao_logs_jobId_tribunal_idx" ON "automacao_logs"("jobId", "tribunal");

-- CreateIndex
CREATE INDEX "automacao_logs_jobId_status_idx" ON "automacao_logs"("jobId", "status");

-- CreateIndex
CREATE INDEX "automacao_logs_sourceType_idx" ON "automacao_logs"("sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "distribuicoes_publicacaoId_key" ON "distribuicoes"("publicacaoId");

-- CreateIndex
CREATE INDEX "distribuicoes_advogadoId_idx" ON "distribuicoes"("advogadoId");

-- CreateIndex
CREATE INDEX "distribuicoes_status_idx" ON "distribuicoes"("status");

-- CreateIndex
CREATE INDEX "distribuicoes_createdAt_idx" ON "distribuicoes"("createdAt");

-- CreateIndex
CREATE INDEX "calendar_integrations_userId_idx" ON "calendar_integrations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_integrations_userId_provider_key" ON "calendar_integrations"("userId", "provider");

-- CreateIndex
CREATE INDEX "calendar_events_prazoId_idx" ON "calendar_events"("prazoId");

-- CreateIndex
CREATE INDEX "calendar_events_audienciaId_idx" ON "calendar_events"("audienciaId");

-- CreateIndex
CREATE INDEX "calendar_events_compromissoId_idx" ON "calendar_events"("compromissoId");

-- CreateIndex
CREATE INDEX "calendar_events_integrationId_idx" ON "calendar_events"("integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_integrationId_externalEventId_key" ON "calendar_events"("integrationId", "externalEventId");

-- CreateIndex
CREATE INDEX "notificacoes_userId_idx" ON "notificacoes"("userId");

-- CreateIndex
CREATE INDEX "notificacoes_userId_lida_idx" ON "notificacoes"("userId", "lida");

-- CreateIndex
CREATE INDEX "notificacoes_createdAt_idx" ON "notificacoes"("createdAt");

-- CreateIndex
CREATE INDEX "client_phones_clienteId_idx" ON "client_phones"("clienteId");

-- CreateIndex
CREATE INDEX "client_phones_phone_idx" ON "client_phones"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "client_phones_phone_key" ON "client_phones"("phone");

-- CreateIndex
CREATE INDEX "conversations_clienteId_idx" ON "conversations"("clienteId");

-- CreateIndex
CREATE INDEX "conversations_status_idx" ON "conversations"("status");

-- CreateIndex
CREATE INDEX "conversations_canal_idx" ON "conversations"("canal");

-- CreateIndex

-- CreateIndex
CREATE INDEX "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "messages_providerMsgId_key" ON "messages"("providerMsgId");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_providerMsgId_idx" ON "messages"("providerMsgId");

-- CreateIndex
CREATE INDEX "messages_status_idx" ON "messages"("status");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "message_attachments_messageId_idx" ON "message_attachments"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_name_key" ON "message_templates"("name");

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex

-- CreateIndex
CREATE INDEX "communication_jobs_status_idx" ON "communication_jobs"("status");

-- CreateIndex
CREATE INDEX "communication_jobs_scheduledFor_idx" ON "communication_jobs"("scheduledFor");

-- CreateIndex
CREATE INDEX "communication_jobs_status_scheduledFor_idx" ON "communication_jobs"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "communication_jobs_correlationId_idx" ON "communication_jobs"("correlationId");

-- CreateIndex
CREATE INDEX "communication_jobs_compromissoId_idx" ON "communication_jobs"("compromissoId");

-- CreateIndex
CREATE INDEX "webhook_events_source_eventType_idx" ON "webhook_events"("source", "eventType");

-- CreateIndex
CREATE INDEX "webhook_events_processed_idx" ON "webhook_events"("processed");

-- CreateIndex
CREATE INDEX "webhook_events_createdAt_idx" ON "webhook_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings"("key");

-- CreateIndex
CREATE INDEX "legal_agent_conversations_userId_agentId_status_idx" ON "legal_agent_conversations"("userId", "agentId", "status");

-- CreateIndex
CREATE INDEX "legal_agent_conversations_userId_lastMessageAt_idx" ON "legal_agent_conversations"("userId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "legal_agent_conversations_agentId_status_idx" ON "legal_agent_conversations"("agentId", "status");

-- CreateIndex
CREATE INDEX "legal_agent_messages_conversationId_createdAt_idx" ON "legal_agent_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "legal_agent_messages_role_idx" ON "legal_agent_messages"("role");

-- CreateIndex
CREATE INDEX "legal_agent_message_attachments_messageId_idx" ON "legal_agent_message_attachments"("messageId");

-- CreateIndex
CREATE INDEX "logs_auditoria_userId_idx" ON "logs_auditoria"("userId");

-- CreateIndex
CREATE INDEX "logs_auditoria_entidade_entidadeId_idx" ON "logs_auditoria"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "logs_auditoria_createdAt_idx" ON "logs_auditoria"("createdAt");

-- CreateIndex
CREATE INDEX "contact_segments_escritorioId_idx" ON "contact_segments"("escritorioId");

-- CreateIndex
CREATE INDEX "contact_segment_members_segmentId_idx" ON "contact_segment_members"("segmentId");

-- CreateIndex
CREATE INDEX "contact_segment_members_clienteId_idx" ON "contact_segment_members"("clienteId");

-- CreateIndex
CREATE INDEX "campaigns_escritorioId_idx" ON "campaigns"("escritorioId");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaign_recipients_campaignId_idx" ON "campaign_recipients"("campaignId");

-- CreateIndex
CREATE INDEX "campaign_recipients_clienteId_idx" ON "campaign_recipients"("clienteId");

-- CreateIndex
CREATE INDEX "campaign_recipients_status_idx" ON "campaign_recipients"("status");

-- CreateIndex
CREATE INDEX "crm_pipelines_escritorioId_idx" ON "crm_pipelines"("escritorioId");

-- CreateIndex
CREATE INDEX "crm_pipelines_areaDireito_idx" ON "crm_pipelines"("areaDireito");

-- CreateIndex
CREATE INDEX "crm_pipelines_ativo_idx" ON "crm_pipelines"("ativo");

-- CreateIndex
CREATE INDEX "crm_cards_pipelineId_idx" ON "crm_cards"("pipelineId");

-- CreateIndex
CREATE INDEX "crm_cards_clienteId_idx" ON "crm_cards"("clienteId");

-- CreateIndex
CREATE INDEX "crm_cards_stage_idx" ON "crm_cards"("stage");

-- CreateIndex
CREATE INDEX "crm_cards_status_idx" ON "crm_cards"("status");

-- CreateIndex
CREATE INDEX "crm_cards_areaDireito_idx" ON "crm_cards"("areaDireito");

-- CreateIndex
CREATE INDEX "crm_cards_ownerId_idx" ON "crm_cards"("ownerId");

-- CreateIndex
CREATE INDEX "crm_cards_responsavelAdvogadoId_idx" ON "crm_cards"("responsavelAdvogadoId");

-- CreateIndex
CREATE INDEX "crm_loss_reasons_escritorioId_idx" ON "crm_loss_reasons"("escritorioId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_loss_reasons_escritorioId_nome_key" ON "crm_loss_reasons"("escritorioId", "nome");

-- CreateIndex
CREATE INDEX "crm_card_process_links_cardId_idx" ON "crm_card_process_links"("cardId");

-- CreateIndex
CREATE INDEX "crm_card_process_links_processoId_idx" ON "crm_card_process_links"("processoId");

-- CreateIndex
CREATE INDEX "crm_card_process_links_numeroCnj_idx" ON "crm_card_process_links"("numeroCnj");

-- CreateIndex
CREATE UNIQUE INDEX "crm_card_process_links_cardId_processoId_key" ON "crm_card_process_links"("cardId", "processoId");

-- CreateIndex
CREATE INDEX "crm_activities_escritorioId_idx" ON "crm_activities"("escritorioId");

-- CreateIndex
CREATE INDEX "crm_activities_ownerId_idx" ON "crm_activities"("ownerId");

-- CreateIndex
CREATE INDEX "crm_activities_clienteId_idx" ON "crm_activities"("clienteId");

-- CreateIndex
CREATE INDEX "crm_activities_cardId_idx" ON "crm_activities"("cardId");

-- CreateIndex
CREATE INDEX "crm_activities_processoId_idx" ON "crm_activities"("processoId");

-- CreateIndex
CREATE INDEX "crm_activities_scheduledAt_idx" ON "crm_activities"("scheduledAt");

-- CreateIndex
CREATE INDEX "crm_activities_outcome_idx" ON "crm_activities"("outcome");

-- CreateIndex
CREATE INDEX "crm_commercial_documents_escritorioId_idx" ON "crm_commercial_documents"("escritorioId");

-- CreateIndex
CREATE INDEX "crm_commercial_documents_clienteId_idx" ON "crm_commercial_documents"("clienteId");

-- CreateIndex
CREATE INDEX "crm_commercial_documents_cardId_idx" ON "crm_commercial_documents"("cardId");

-- CreateIndex
CREATE INDEX "crm_commercial_documents_processoId_idx" ON "crm_commercial_documents"("processoId");

-- CreateIndex
CREATE INDEX "crm_commercial_documents_type_idx" ON "crm_commercial_documents"("type");

-- CreateIndex
CREATE INDEX "crm_conflict_checks_escritorioId_idx" ON "crm_conflict_checks"("escritorioId");

-- CreateIndex
CREATE INDEX "crm_conflict_checks_cardId_idx" ON "crm_conflict_checks"("cardId");

-- CreateIndex
CREATE INDEX "crm_conflict_checks_clienteId_idx" ON "crm_conflict_checks"("clienteId");

-- CreateIndex
CREATE INDEX "crm_conflict_checks_entityType_idx" ON "crm_conflict_checks"("entityType");

-- CreateIndex
CREATE INDEX "crm_conflict_checks_decision_idx" ON "crm_conflict_checks"("decision");

-- CreateIndex
CREATE INDEX "crm_stage_transitions_cardId_idx" ON "crm_stage_transitions"("cardId");

-- CreateIndex
CREATE INDEX "crm_stage_transitions_changedById_idx" ON "crm_stage_transitions"("changedById");

-- CreateIndex
CREATE INDEX "crm_stage_transitions_changedAt_idx" ON "crm_stage_transitions"("changedAt");

-- CreateIndex
CREATE INDEX "crm_lgpd_events_escritorioId_idx" ON "crm_lgpd_events"("escritorioId");

-- CreateIndex
CREATE INDEX "crm_lgpd_events_clienteId_idx" ON "crm_lgpd_events"("clienteId");

-- CreateIndex
CREATE INDEX "crm_lgpd_events_actionType_idx" ON "crm_lgpd_events"("actionType");

-- CreateIndex
CREATE INDEX "contact_tags_escritorioId_idx" ON "contact_tags"("escritorioId");

-- CreateIndex
CREATE INDEX "contact_tags_category_idx" ON "contact_tags"("category");

-- CreateIndex
CREATE UNIQUE INDEX "contact_tags_escritorioId_name_key" ON "contact_tags"("escritorioId", "name");

-- CreateIndex
CREATE INDEX "cliente_contact_tags_clienteId_idx" ON "cliente_contact_tags"("clienteId");

-- CreateIndex
CREATE INDEX "cliente_contact_tags_tagId_idx" ON "cliente_contact_tags"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_contact_tags_clienteId_tagId_key" ON "cliente_contact_tags"("clienteId", "tagId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feriados" ADD CONSTRAINT "feriados_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_acao" ADD CONSTRAINT "tipos_acao_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fases_processuais" ADD CONSTRAINT "fases_processuais_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_origemId_fkey" FOREIGN KEY ("origemId") REFERENCES "origens_cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advogados" ADD CONSTRAINT "advogados_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tribunal_sources" ADD CONSTRAINT "tribunal_sources_tribunalId_fkey" FOREIGN KEY ("tribunalId") REFERENCES "tribunais_catalogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_membros" ADD CONSTRAINT "time_membros_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "times"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_membros" ADD CONSTRAINT "time_membros_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "advogados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processos" ADD CONSTRAINT "processos_tipoAcaoId_fkey" FOREIGN KEY ("tipoAcaoId") REFERENCES "tipos_acao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processos" ADD CONSTRAINT "processos_faseProcessualId_fkey" FOREIGN KEY ("faseProcessualId") REFERENCES "fases_processuais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processos" ADD CONSTRAINT "processos_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "advogados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processos" ADD CONSTRAINT "processos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_atribuicao_logs" ADD CONSTRAINT "processo_atribuicao_logs_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_atribuicao_logs" ADD CONSTRAINT "processo_atribuicao_logs_fromAdvogadoId_fkey" FOREIGN KEY ("fromAdvogadoId") REFERENCES "advogados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_atribuicao_logs" ADD CONSTRAINT "processo_atribuicao_logs_toAdvogadoId_fkey" FOREIGN KEY ("toAdvogadoId") REFERENCES "advogados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo_atribuicao_logs" ADD CONSTRAINT "processo_atribuicao_logs_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partes_processo" ADD CONSTRAINT "partes_processo_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partes_processo" ADD CONSTRAINT "partes_processo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processos_vinculados" ADD CONSTRAINT "processos_vinculados_processoOrigemId_fkey" FOREIGN KEY ("processoOrigemId") REFERENCES "processos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processos_vinculados" ADD CONSTRAINT "processos_vinculados_processoDestinoId_fkey" FOREIGN KEY ("processoDestinoId") REFERENCES "processos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prazos" ADD CONSTRAINT "prazos_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prazos" ADD CONSTRAINT "prazos_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "advogados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prazos" ADD CONSTRAINT "prazos_origemPublicacaoId_fkey" FOREIGN KEY ("origemPublicacaoId") REFERENCES "publicacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audiencias" ADD CONSTRAINT "audiencias_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audiencias" ADD CONSTRAINT "audiencias_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "advogados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compromissos" ADD CONSTRAINT "compromissos_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "advogados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compromissos" ADD CONSTRAINT "compromissos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compromissos" ADD CONSTRAINT "compromissos_atendimentoId_fkey" FOREIGN KEY ("atendimentoId") REFERENCES "atendimentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compromisso_reminders" ADD CONSTRAINT "compromisso_reminders_compromissoId_fkey" FOREIGN KEY ("compromissoId") REFERENCES "compromissos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "advogados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefa_comentarios" ADD CONSTRAINT "tarefa_comentarios_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "tarefas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefa_checklists" ADD CONSTRAINT "tarefa_checklists_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "tarefas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefa_registros_hora" ADD CONSTRAINT "tarefa_registros_hora_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "tarefas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_faseProcessualId_fkey" FOREIGN KEY ("faseProcessualId") REFERENCES "fases_processuais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_etapas" ADD CONSTRAINT "workflow_etapas_workflowTemplateId_fkey" FOREIGN KEY ("workflowTemplateId") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "advogados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey

-- AddForeignKey
ALTER TABLE "atendimento_historicos" ADD CONSTRAINT "atendimento_historicos_atendimentoId_fkey" FOREIGN KEY ("atendimentoId") REFERENCES "atendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "honorarios" ADD CONSTRAINT "honorarios_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "honorarios" ADD CONSTRAINT "honorarios_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_flows" ADD CONSTRAINT "automation_flows_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_executions" ADD CONSTRAINT "flow_executions_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "automation_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_executions" ADD CONSTRAINT "flow_executions_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_executions" ADD CONSTRAINT "flow_executions_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_honorarioId_fkey" FOREIGN KEY ("honorarioId") REFERENCES "honorarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_centroCustoId_fkey" FOREIGN KEY ("centroCustoId") REFERENCES "centros_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fatura_parcelas" ADD CONSTRAINT "fatura_parcelas_faturaId_fkey" FOREIGN KEY ("faturaId") REFERENCES "faturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_centroCustoId_fkey" FOREIGN KEY ("centroCustoId") REFERENCES "centros_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_contaBancariaId_fkey" FOREIGN KEY ("contaBancariaId") REFERENCES "contas_bancarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_bancarias" ADD CONSTRAINT "contas_bancarias_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centros_custo" ADD CONSTRAINT "centros_custo_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "advogados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_escritorio_lancamentos" ADD CONSTRAINT "financeiro_escritorio_lancamentos_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_escritorio_lancamentos" ADD CONSTRAINT "financeiro_escritorio_lancamentos_centroCustoId_fkey" FOREIGN KEY ("centroCustoId") REFERENCES "centros_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_escritorio_lancamentos" ADD CONSTRAINT "financeiro_escritorio_lancamentos_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_escritorio_lancamentos" ADD CONSTRAINT "financeiro_escritorio_lancamentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_escritorio_lancamentos" ADD CONSTRAINT "financeiro_escritorio_lancamentos_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso_financeiro" ADD CONSTRAINT "caso_financeiro_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso_financeiro" ADD CONSTRAINT "caso_financeiro_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso_financeiro" ADD CONSTRAINT "caso_financeiro_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso_financeiro" ADD CONSTRAINT "caso_financeiro_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso_participantes" ADD CONSTRAINT "caso_participantes_casoFinanceiroId_fkey" FOREIGN KEY ("casoFinanceiroId") REFERENCES "caso_financeiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso_participantes" ADD CONSTRAINT "caso_participantes_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "advogados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repasses_honorarios" ADD CONSTRAINT "repasses_honorarios_casoFinanceiroId_fkey" FOREIGN KEY ("casoFinanceiroId") REFERENCES "caso_financeiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repasses_honorarios" ADD CONSTRAINT "repasses_honorarios_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "advogados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repasses_honorarios" ADD CONSTRAINT "repasses_honorarios_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repasses_honorarios" ADD CONSTRAINT "repasses_honorarios_aprovadoPorId_fkey" FOREIGN KEY ("aprovadoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas_processo" ADD CONSTRAINT "despesas_processo_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas_processo" ADD CONSTRAINT "despesas_processo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas_processo" ADD CONSTRAINT "despesas_processo_casoFinanceiroId_fkey" FOREIGN KEY ("casoFinanceiroId") REFERENCES "caso_financeiro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funcionarios_financeiro" ADD CONSTRAINT "funcionarios_financeiro_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funcionarios_financeiro" ADD CONSTRAINT "funcionarios_financeiro_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funcionarios_financeiro" ADD CONSTRAINT "funcionarios_financeiro_centroCustoId_fkey" FOREIGN KEY ("centroCustoId") REFERENCES "centros_custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funcionarios_lancamentos" ADD CONSTRAINT "funcionarios_lancamentos_funcionarioFinanceiroId_fkey" FOREIGN KEY ("funcionarioFinanceiroId") REFERENCES "funcionarios_financeiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_documento" ADD CONSTRAINT "categorias_documento_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastas_documento" ADD CONSTRAINT "pastas_documento_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "pastas_documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastas_documento" ADD CONSTRAINT "pastas_documento_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelo_documentos" ADD CONSTRAINT "modelo_documentos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelo_documentos" ADD CONSTRAINT "modelo_documentos_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_variaveis" ADD CONSTRAINT "documento_variaveis_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "modelo_documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_pastaId_fkey" FOREIGN KEY ("pastaId") REFERENCES "pastas_documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "advogados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacao_historicos" ADD CONSTRAINT "publicacao_historicos_publicacaoId_fkey" FOREIGN KEY ("publicacaoId") REFERENCES "publicacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automacao_jobs" ADD CONSTRAINT "automacao_jobs_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "advogados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey

-- AddForeignKey
ALTER TABLE "automacao_logs" ADD CONSTRAINT "automacao_logs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "automacao_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribuicoes" ADD CONSTRAINT "distribuicoes_publicacaoId_fkey" FOREIGN KEY ("publicacaoId") REFERENCES "publicacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribuicoes" ADD CONSTRAINT "distribuicoes_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "advogados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "calendar_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_phones" ADD CONSTRAINT "client_phones_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey

-- AddForeignKey
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "message_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_jobs" ADD CONSTRAINT "communication_jobs_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "notification_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_jobs" ADD CONSTRAINT "communication_jobs_compromissoId_fkey" FOREIGN KEY ("compromissoId") REFERENCES "compromissos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_agent_conversations" ADD CONSTRAINT "legal_agent_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_agent_messages" ADD CONSTRAINT "legal_agent_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "legal_agent_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_agent_message_attachments" ADD CONSTRAINT "legal_agent_message_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "legal_agent_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_segments" ADD CONSTRAINT "contact_segments_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_segment_members" ADD CONSTRAINT "contact_segment_members_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "contact_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_segment_members" ADD CONSTRAINT "contact_segment_members_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "contact_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_pipelines" ADD CONSTRAINT "crm_pipelines_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_cards" ADD CONSTRAINT "crm_cards_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "crm_pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_cards" ADD CONSTRAINT "crm_cards_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_cards" ADD CONSTRAINT "crm_cards_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_cards" ADD CONSTRAINT "crm_cards_responsavelAdvogadoId_fkey" FOREIGN KEY ("responsavelAdvogadoId") REFERENCES "advogados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_cards" ADD CONSTRAINT "crm_cards_lostReasonId_fkey" FOREIGN KEY ("lostReasonId") REFERENCES "crm_loss_reasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_loss_reasons" ADD CONSTRAINT "crm_loss_reasons_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_card_process_links" ADD CONSTRAINT "crm_card_process_links_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "crm_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_card_process_links" ADD CONSTRAINT "crm_card_process_links_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "crm_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_commercial_documents" ADD CONSTRAINT "crm_commercial_documents_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_commercial_documents" ADD CONSTRAINT "crm_commercial_documents_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_commercial_documents" ADD CONSTRAINT "crm_commercial_documents_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "crm_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_commercial_documents" ADD CONSTRAINT "crm_commercial_documents_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_commercial_documents" ADD CONSTRAINT "crm_commercial_documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_conflict_checks" ADD CONSTRAINT "crm_conflict_checks_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_conflict_checks" ADD CONSTRAINT "crm_conflict_checks_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "crm_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_conflict_checks" ADD CONSTRAINT "crm_conflict_checks_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_conflict_checks" ADD CONSTRAINT "crm_conflict_checks_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_stage_transitions" ADD CONSTRAINT "crm_stage_transitions_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "crm_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_stage_transitions" ADD CONSTRAINT "crm_stage_transitions_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_lgpd_events" ADD CONSTRAINT "crm_lgpd_events_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_lgpd_events" ADD CONSTRAINT "crm_lgpd_events_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_lgpd_events" ADD CONSTRAINT "crm_lgpd_events_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_contact_tags" ADD CONSTRAINT "cliente_contact_tags_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_contact_tags" ADD CONSTRAINT "cliente_contact_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "contact_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
