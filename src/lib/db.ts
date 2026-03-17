import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const REQUIRED_DELEGATES = [
  "publicacaoRegraTriagem",
  "publicacaoHistorico",
  "tribunal",
  "tribunalSource",
  "automacaoJob",
  "automacaoLog",
  "jobExecutionAttempt",
  "legalAgentConversation",
  "legalAgentMessage",
  "legalAgentMessageAttachment",
  "campaign",
  "contactSegment",
  "contactTag",
  "lgpdRequest",
  "lgpdDataExport",
  "retentionPolicy",
  "retentionExecution",
  "bIRefreshRun",
  "bIIndicadorSnapshot",
  "juriMetricDefinition",
  "cRMPipeline",
  "cRMCard",
  "cRMActivity",
  "cRMCommercialDocument",
  "cRMLossReason",
  "cRMConflictCheck",
  "cRMStageTransition",
  "origemCliente",
  "appSetting",
  "automationFlow",
  "attendanceAutomationFlow",
  "attendanceAutomationSession",
  "attendanceAutomationEvent",
  "financeiroEscritorioLancamento",
  "casoFinanceiro",
  "casoParticipante",
  "repasseHonorario",
  "despesaProcesso",
  "funcionarioFinanceiro",
  "funcionarioLancamento",
  "agendamento",
  "agendamentoObservador",
  "agendamentoComentario",
  "agendamentoHistorico",
  "agendamentoRecorrencia",
  "agendamentoFiltroSalvo",
  "agendaCompartilhamento",
  "internalChatConversation",
  "internalChatParticipant",
  "internalChatMessage",
  "internalChatAttachment",
  "internalChatRead",
  "internalChatPresence",
  "passwordResetToken",
  // Root Admin models
  "superAdmin",
  "superAdminSession",
  "superAdminLog",
  "plano",
  "assinatura",
  "faturaPlataforma",
  "featureFlag",
  "comunicadoPlataforma",
] as const;

function hasRequiredDelegates(client: PrismaClient | undefined) {
  if (!client) return false;
  const dynamicClient = client as unknown as Record<string, unknown>;
  return REQUIRED_DELEGATES.every((delegate) => typeof dynamicClient[delegate] !== "undefined");
}

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg(pool as any);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

if (globalForPrisma.prisma && !hasRequiredDelegates(globalForPrisma.prisma)) {
  void globalForPrisma.prisma.$disconnect().catch(() => null);
  globalForPrisma.prisma = undefined;
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
