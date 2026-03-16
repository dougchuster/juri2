import "server-only";

import { db } from "@/lib/db";
import { AutomationEngine } from "@/lib/services/automation-engine";
import { processEvent } from "@/lib/services/communication-engine";
import {
  buildMeetingReminderCorrelationId,
  classifyMeetingReply,
  type MeetingReminderKind,
  type MeetingReplyIntent,
} from "@/lib/services/meeting-automation";
import type { EventType, Prisma } from "@/generated/prisma";

type LoadedCompromisso = Prisma.CompromissoGetPayload<{
  include: {
    cliente: { select: { id: true; nome: true; email: true; whatsapp: true; celular: true } };
    advogado: { select: { id: true; userId: true; user: { select: { id: true; name: true; email: true } } } };
    atendimento: {
      select: {
        id: true;
        statusReuniao: true;
        statusOperacional: true;
      };
    };
  };
}>;

const MEETING_EVENT_BY_KIND: Record<MeetingReminderKind, EventType> = {
  CLIENTE_CONFIRMACAO: "REUNIAO_CONFIRMACAO_CLIENTE",
  CLIENTE_D1: "REUNIAO_LEMBRETE_CLIENTE_D1",
  CLIENTE_H1: "REUNIAO_LEMBRETE_CLIENTE_H1",
  RESPONSAVEL_D1: "REUNIAO_LEMBRETE_RESPONSAVEL_D1",
  RESPONSAVEL_H1: "REUNIAO_LEMBRETE_RESPONSAVEL_H1",
};

function subtractMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() - minutes * 60_000);
}

function formatMeetingDate(date: Date) {
  return date.toLocaleDateString("pt-BR");
}

function formatMeetingTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMeetingDateTime(date: Date) {
  return `${formatMeetingDate(date)} as ${formatMeetingTime(date)}`;
}

function buildMeetingVariables(compromisso: LoadedCompromisso) {
  return {
    nome: compromisso.cliente?.nome || "cliente",
    cliente_nome: compromisso.cliente?.nome || "",
    advogado_nome: compromisso.advogado.user.name || "Advogado responsavel",
    compromisso_titulo: compromisso.titulo,
    compromisso_data: formatMeetingDate(compromisso.dataInicio),
    compromisso_hora: formatMeetingTime(compromisso.dataInicio),
    compromisso_data_hora: formatMeetingDateTime(compromisso.dataInicio),
    compromisso_local: compromisso.local || "A definir",
    confirmacao_instrucao:
      "Responda CONFIRMO para confirmar, REMARCAR para pedir remarcacao ou CANCELAR para cancelar.",
  };
}

async function getDefaultEscritorioId() {
  const escritorio = await db.escritorio.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return escritorio?.id || null;
}

async function loadCompromisso(compromissoId: string) {
  return db.compromisso.findUnique({
    where: { id: compromissoId },
    include: {
      cliente: { select: { id: true, nome: true, email: true, whatsapp: true, celular: true } },
      advogado: { select: { id: true, userId: true, user: { select: { id: true, name: true, email: true } } } },
      atendimento: {
        select: {
          id: true,
          statusReuniao: true,
          statusOperacional: true,
        },
      },
    },
  });
}

async function cancelJobsByCorrelationId(correlationId: string) {
  await db.communicationJob.updateMany({
    where: {
      correlationId,
      status: { in: ["PENDING", "PROCESSING"] },
    },
    data: {
      status: "CANCELLED",
      errorMessage: "Cancelado por atualizacao da automacao de reuniao.",
    },
  });
}

async function cancelAllMeetingReminders(compromissoId: string, reason: string) {
  const reminders = await db.compromissoReminder.findMany({
    where: {
      compromissoId,
      status: { in: ["PENDENTE", "AGENDADO"] },
    },
    select: { id: true, jobCorrelationId: true },
  });

  for (const reminder of reminders) {
    if (reminder.jobCorrelationId) {
      await cancelJobsByCorrelationId(reminder.jobCorrelationId);
    }
  }

  await db.compromissoReminder.updateMany({
    where: {
      compromissoId,
      status: { in: ["PENDENTE", "AGENDADO"] },
    },
    data: {
      status: "CANCELADO",
      cancelledAt: new Date(),
      jobCorrelationId: null,
    },
  });

  await db.communicationJob.updateMany({
    where: {
      compromissoId,
      status: { in: ["PENDING", "PROCESSING"] },
      correlationId: { startsWith: `meeting:${compromissoId}:` },
    },
    data: {
      status: "CANCELLED",
      errorMessage: reason,
    },
  });
}

export async function cancelMeetingAutomation(compromissoId: string, reason = "Automacao cancelada manualmente.") {
  await cancelAllMeetingReminders(compromissoId, reason);
  return { cancelled: true };
}

function buildReminderPlans(compromisso: LoadedCompromisso, now: Date) {
  const plans: Array<{ kind: MeetingReminderKind; scheduledFor: Date; eventType: EventType }> = [];

  const canNotifyClient = Boolean(
    compromisso.clienteId &&
    (compromisso.cliente?.whatsapp || compromisso.cliente?.celular)
  );
  const canNotifyResponsible = Boolean(compromisso.advogado.user.email);

  if (
    canNotifyClient &&
    compromisso.statusConfirmacao === "PENDENTE" &&
    compromisso.dataInicio.getTime() > now.getTime()
  ) {
    plans.push({
      kind: "CLIENTE_CONFIRMACAO",
      scheduledFor: now,
      eventType: MEETING_EVENT_BY_KIND.CLIENTE_CONFIRMACAO,
    });
  }

  const clientD1 = subtractMinutes(compromisso.dataInicio, 24 * 60);
  if (canNotifyClient && clientD1.getTime() > now.getTime()) {
    plans.push({
      kind: "CLIENTE_D1",
      scheduledFor: clientD1,
      eventType: MEETING_EVENT_BY_KIND.CLIENTE_D1,
    });
  }

  const clientH1 = subtractMinutes(compromisso.dataInicio, 60);
  if (canNotifyClient && clientH1.getTime() > now.getTime()) {
    plans.push({
      kind: "CLIENTE_H1",
      scheduledFor: clientH1,
      eventType: MEETING_EVENT_BY_KIND.CLIENTE_H1,
    });
  }

  const responsibleD1 = subtractMinutes(compromisso.dataInicio, 24 * 60);
  if (canNotifyResponsible && responsibleD1.getTime() > now.getTime()) {
    plans.push({
      kind: "RESPONSAVEL_D1",
      scheduledFor: responsibleD1,
      eventType: MEETING_EVENT_BY_KIND.RESPONSAVEL_D1,
    });
  }

  const responsibleH1 = subtractMinutes(compromisso.dataInicio, 60);
  if (canNotifyResponsible && responsibleH1.getTime() > now.getTime()) {
    plans.push({
      kind: "RESPONSAVEL_H1",
      scheduledFor: responsibleH1,
      eventType: MEETING_EVENT_BY_KIND.RESPONSAVEL_H1,
    });
  }

  return plans;
}

async function syncReminderForPlan(compromisso: LoadedCompromisso, plan: { kind: MeetingReminderKind; scheduledFor: Date; eventType: EventType }) {
  const existing = await db.compromissoReminder.findUnique({
    where: {
      compromissoId_kind: {
        compromissoId: compromisso.id,
        kind: plan.kind,
      },
    },
  });

  const correlationId = buildMeetingReminderCorrelationId(compromisso.id, plan.kind);
  const variables = buildMeetingVariables(compromisso);

  const sameSchedule =
    existing &&
    existing.status === "AGENDADO" &&
    existing.jobCorrelationId === correlationId &&
    existing.scheduledFor.getTime() === plan.scheduledFor.getTime();

  if (sameSchedule) {
    return { jobsCreated: 0, reminderUpdated: false };
  }

  if (existing?.jobCorrelationId) {
    await cancelJobsByCorrelationId(existing.jobCorrelationId);
  }

  const result = await processEvent(plan.eventType, {
    compromissoId: compromisso.id,
    clienteId: compromisso.clienteId || undefined,
    atendimentoId: compromisso.atendimentoId || undefined,
    userId: compromisso.advogado.userId,
    scheduledFor: plan.scheduledFor,
    correlationId,
    variables,
  });

  await db.compromissoReminder.upsert({
    where: {
      compromissoId_kind: {
        compromissoId: compromisso.id,
        kind: plan.kind,
      },
    },
    create: {
      compromissoId: compromisso.id,
      kind: plan.kind,
      status: result.jobsCreated > 0 ? "AGENDADO" : "PENDENTE",
      scheduledFor: plan.scheduledFor,
      jobCorrelationId: result.jobsCreated > 0 ? correlationId : null,
    },
    update: {
      status: result.jobsCreated > 0 ? "AGENDADO" : "PENDENTE",
      scheduledFor: plan.scheduledFor,
      cancelledAt: null,
      processedAt: null,
      jobCorrelationId: result.jobsCreated > 0 ? correlationId : null,
    },
  });

  return { jobsCreated: result.jobsCreated, reminderUpdated: true };
}

export async function scheduleMeetingAutomation(compromissoId: string) {
  const compromisso = await loadCompromisso(compromissoId);
  if (!compromisso) return { jobsCreated: 0, remindersUpdated: 0, skipped: true };

  const now = new Date();
  if (
    compromisso.concluido ||
    compromisso.statusConfirmacao === "CANCELADO" ||
    compromisso.canceladoAt ||
    compromisso.dataInicio.getTime() <= now.getTime()
  ) {
    await cancelAllMeetingReminders(compromisso.id, "Compromisso concluido, cancelado ou expirado.");
    return { jobsCreated: 0, remindersUpdated: 0, skipped: true };
  }

  const plans = buildReminderPlans(compromisso, now);
  const activeKinds = new Set(plans.map((plan) => plan.kind));

  const staleReminders = await db.compromissoReminder.findMany({
    where: {
      compromissoId: compromisso.id,
      kind: { notIn: Array.from(activeKinds) },
      status: { in: ["PENDENTE", "AGENDADO"] },
    },
    select: { id: true, jobCorrelationId: true },
  });

  for (const reminder of staleReminders) {
    if (reminder.jobCorrelationId) {
      await cancelJobsByCorrelationId(reminder.jobCorrelationId);
    }
  }

  if (staleReminders.length > 0) {
    await db.compromissoReminder.updateMany({
      where: {
        id: { in: staleReminders.map((item) => item.id) },
      },
      data: {
        status: "CANCELADO",
        cancelledAt: new Date(),
        jobCorrelationId: null,
      },
    });
  }

  let jobsCreated = 0;
  let remindersUpdated = 0;
  for (const plan of plans) {
    const result = await syncReminderForPlan(compromisso, plan);
    jobsCreated += result.jobsCreated;
    if (result.reminderUpdated) remindersUpdated += 1;
  }

  return { jobsCreated, remindersUpdated, skipped: false };
}

export async function scheduleMeetingAutomationBatch(limit = 100) {
  const compromissos = await db.compromisso.findMany({
    where: {
      concluido: false,
      canceladoAt: null,
      dataInicio: { gt: new Date() },
    },
    orderBy: { dataInicio: "asc" },
    take: limit,
    select: { id: true },
  });

  let jobsCreated = 0;
  let remindersUpdated = 0;
  for (const compromisso of compromissos) {
    const result = await scheduleMeetingAutomation(compromisso.id);
    jobsCreated += result.jobsCreated;
    remindersUpdated += result.remindersUpdated;
  }

  return {
    compromissosProcessados: compromissos.length,
    jobsCreated,
    remindersUpdated,
  };
}

export async function syncMeetingReminderStatuses(limit = 200) {
  const reminders = await db.compromissoReminder.findMany({
    where: {
      status: { in: ["AGENDADO", "PENDENTE"] },
      jobCorrelationId: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  let updated = 0;
  for (const reminder of reminders) {
    if (!reminder.jobCorrelationId) continue;

    const jobs = await db.communicationJob.findMany({
      where: { correlationId: reminder.jobCorrelationId },
      select: { status: true, completedAt: true },
    });
    if (jobs.length === 0) continue;

    const allCompleted = jobs.every((job) => job.status === "COMPLETED");
    const allCancelled = jobs.every((job) => job.status === "CANCELLED");
    const allFailed = jobs.every((job) => job.status === "FAILED");

    if (!allCompleted && !allCancelled && !allFailed) continue;

    await db.compromissoReminder.update({
      where: { id: reminder.id },
      data: {
        status: allCompleted ? "ENVIADO" : allCancelled ? "CANCELADO" : "FALHOU",
        processedAt: allCompleted ? jobs.map((job) => job.completedAt).filter(Boolean).sort().at(-1) || new Date() : reminder.processedAt,
        cancelledAt: allCancelled ? new Date() : reminder.cancelledAt,
      },
    });
    updated += 1;
  }

  return { updated };
}

async function createMeetingNotification(compromisso: LoadedCompromisso, title: string, message: string) {
  await db.notificacao.create({
    data: {
      userId: compromisso.advogado.user.id,
      tipo: "SISTEMA",
      titulo: title,
      mensagem: message,
      linkUrl: "/comunicacao",
    },
  });
}

async function appendAttendanceHistory(
  atendimentoId: string,
  userId: string,
  description: string
) {
  await db.atendimentoHistorico.create({
    data: {
      atendimentoId,
      userId,
      canal: "WHATSAPP",
      descricao: description,
    },
  });
}

export async function applyMeetingReply(compromissoId: string, intent: MeetingReplyIntent, details?: { source?: string; content?: string }) {
  const compromisso = await loadCompromisso(compromissoId);
  if (!compromisso) return { applied: false, reason: "Compromisso nao encontrado" };

  const now = new Date();
  const variables = buildMeetingVariables(compromisso);

  if (intent === "CONFIRMADA" && compromisso.statusConfirmacao === "CONFIRMADO") {
    return { applied: true, compromissoId: compromisso.id, intent, duplicate: true };
  }

  if (intent === "REMARCACAO" && compromisso.statusConfirmacao === "REMARCACAO_SOLICITADA") {
    return { applied: true, compromissoId: compromisso.id, intent, duplicate: true };
  }

  if (intent === "CANCELADA" && compromisso.statusConfirmacao === "CANCELADO") {
    return { applied: true, compromissoId: compromisso.id, intent, duplicate: true };
  }

  if (intent === "CONFIRMADA") {
    await db.compromisso.update({
      where: { id: compromisso.id },
      data: {
        statusConfirmacao: "CONFIRMADO",
        confirmadoAt: now,
        canceladoAt: null,
      },
    });

    if (compromisso.atendimentoId) {
      await db.atendimento.update({
        where: { id: compromisso.atendimentoId },
        data: {
          statusReuniao: "CONFIRMADA",
          statusOperacional: "REUNIAO_CONFIRMADA",
          ultimaInteracaoEm: now,
        },
      });
      await appendAttendanceHistory(
        compromisso.atendimentoId,
        compromisso.advogado.user.id,
        "Cliente confirmou a reuniao pelo WhatsApp."
      );
    }

    await createMeetingNotification(
      compromisso,
      "Reuniao confirmada",
      `${compromisso.cliente?.nome || "Cliente"} confirmou a reuniao de ${formatMeetingDateTime(compromisso.dataInicio)}.`
    );

    await processEvent("REUNIAO_CONFIRMADA", {
      compromissoId: compromisso.id,
      clienteId: compromisso.clienteId || undefined,
      atendimentoId: compromisso.atendimentoId || undefined,
      userId: compromisso.advogado.userId,
      variables,
    });
  }

  if (intent === "REMARCACAO") {
    await db.compromisso.update({
      where: { id: compromisso.id },
      data: {
        statusConfirmacao: "REMARCACAO_SOLICITADA",
      },
    });

    if (compromisso.atendimentoId) {
      await db.atendimento.update({
        where: { id: compromisso.atendimentoId },
        data: {
          ultimaInteracaoEm: now,
          proximaAcao: "Cliente solicitou remarcacao da reuniao.",
        },
      });
      await appendAttendanceHistory(
        compromisso.atendimentoId,
        compromisso.advogado.user.id,
        "Cliente solicitou remarcacao da reuniao pelo WhatsApp."
      );
    }

    await cancelAllMeetingReminders(compromisso.id, "Automacao cancelada apos solicitacao de remarcacao.");
    await createMeetingNotification(
      compromisso,
      "Pedido de remarcacao",
      `${compromisso.cliente?.nome || "Cliente"} pediu para remarcar a reuniao de ${formatMeetingDateTime(compromisso.dataInicio)}.`
    );

    await processEvent("REUNIAO_REMARCACAO_SOLICITADA", {
      compromissoId: compromisso.id,
      clienteId: compromisso.clienteId || undefined,
      atendimentoId: compromisso.atendimentoId || undefined,
      userId: compromisso.advogado.userId,
      variables,
    });
  }

  if (intent === "CANCELADA") {
    await db.compromisso.update({
      where: { id: compromisso.id },
      data: {
        statusConfirmacao: "CANCELADO",
        canceladoAt: now,
      },
    });

    if (compromisso.atendimentoId) {
      await db.atendimento.update({
        where: { id: compromisso.atendimentoId },
        data: {
          statusReuniao: "CANCELADA",
          statusOperacional: "AGUARDANDO_CLIENTE",
          ultimaInteracaoEm: now,
        },
      });
      await appendAttendanceHistory(
        compromisso.atendimentoId,
        compromisso.advogado.user.id,
        "Cliente cancelou a reuniao pelo WhatsApp."
      );
    }

    await cancelAllMeetingReminders(compromisso.id, "Automacao cancelada apos cancelamento da reuniao.");
    await createMeetingNotification(
      compromisso,
      "Reuniao cancelada",
      `${compromisso.cliente?.nome || "Cliente"} cancelou a reuniao de ${formatMeetingDateTime(compromisso.dataInicio)}.`
    );

    await processEvent("REUNIAO_CANCELADA", {
      compromissoId: compromisso.id,
      clienteId: compromisso.clienteId || undefined,
      atendimentoId: compromisso.atendimentoId || undefined,
      userId: compromisso.advogado.userId,
      variables,
    });
  }

  const escritorioId = await getDefaultEscritorioId();
  if (escritorioId) {
    await AutomationEngine.handleCustomEvent(
      intent === "CONFIRMADA"
        ? "meeting_confirmed"
        : intent === "REMARCACAO"
          ? "meeting_reschedule_requested"
          : "meeting_cancelled",
      {
        escritorioId,
        clienteId: compromisso.clienteId || undefined,
        userId: compromisso.advogado.user.id,
        compromissoId: compromisso.id,
        atendimentoId: compromisso.atendimentoId || undefined,
        source: details?.source || "whatsapp",
        messageContent: details?.content || "",
      }
    );
  }

  return { applied: true, compromissoId: compromisso.id, intent };
}

export async function processMeetingReplyFromConversation(conversationId: string, content: string) {
  const intent = classifyMeetingReply(content);
  if (!intent) return { applied: false, reason: "Mensagem sem intencao de reuniao" };

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      clienteId: true,
      atendimentoId: true,
    },
  });
  if (!conversation) return { applied: false, reason: "Conversa nao encontrada" };

  const now = new Date();
  const compromisso = await db.compromisso.findFirst({
    where: {
      OR: [
        conversation.atendimentoId ? { atendimentoId: conversation.atendimentoId } : undefined,
        conversation.clienteId ? { clienteId: conversation.clienteId } : undefined,
      ].filter(Boolean) as Prisma.CompromissoWhereInput[],
      concluido: false,
      canceladoAt: null,
      dataInicio: { gte: subtractMinutes(now, 6 * 60) },
    },
    orderBy: { dataInicio: "asc" },
    select: { id: true },
  });

  if (!compromisso) return { applied: false, reason: "Nenhum compromisso elegivel encontrado" };

  return applyMeetingReply(compromisso.id, intent, {
    source: "whatsapp",
    content,
  });
}
