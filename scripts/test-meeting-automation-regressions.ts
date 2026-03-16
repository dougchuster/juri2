import "dotenv/config";
import assert from "node:assert/strict";

import { db } from "@/lib/db";

type ScenarioContext = {
  clienteId: string;
  userId: string;
  advogadoId: string;
  atendimentoId: string;
  conversationId: string;
  compromissoId: string;
};

let sequence = 0;

function nextDigits() {
  sequence += 1;
  const base = `${Date.now()}`.slice(-8);
  return `${base}${String(sequence).padStart(2, "0")}`;
}

async function createScenario(options?: {
  withClientPhone?: boolean;
  startsInMinutes?: number;
  titlePrefix?: string;
}) {
  const digits = nextDigits();
  const startsInMinutes = options?.startsInMinutes ?? 26 * 60;
  const dataInicio = new Date(Date.now() + startsInMinutes * 60 * 1000);
  const dataFim = new Date(dataInicio.getTime() + 60 * 60 * 1000);
  const withClientPhone = options?.withClientPhone ?? true;

  const cliente = await db.cliente.create({
    data: {
      nome: `${options?.titlePrefix || "Meeting"} Cliente ${digits}`,
      email: `meeting.cliente.${digits}@example.com`,
      whatsapp: withClientPhone ? `+55119${digits}` : null,
      celular: withClientPhone ? `+55118${digits}` : null,
    },
    select: { id: true },
  });

  const user = await db.user.create({
    data: {
      email: `meeting.advogado.${digits}@example.com`,
      name: `${options?.titlePrefix || "Meeting"} Advogado ${digits}`,
      passwordHash: `hash-${digits}`,
      role: "ADVOGADO",
    },
    select: { id: true, email: true },
  });

  const advogado = await db.advogado.create({
    data: {
      userId: user.id,
      oab: `REG${digits}`,
      seccional: "GO",
    },
    select: { id: true },
  });

  const atendimento = await db.atendimento.create({
    data: {
      clienteId: cliente.id,
      advogadoId: advogado.id,
      assunto: `${options?.titlePrefix || "Meeting"} assunto ${digits}`,
      canal: "WHATSAPP",
    },
    select: { id: true },
  });

  const conversation = await db.conversation.create({
    data: {
      clienteId: cliente.id,
      atendimentoId: atendimento.id,
      canal: "WHATSAPP",
      assignedToId: user.id,
      subject: `${options?.titlePrefix || "Meeting"} conversa ${digits}`,
    },
    select: { id: true },
  });

  const compromisso = await db.compromisso.create({
    data: {
      advogadoId: advogado.id,
      clienteId: cliente.id,
      atendimentoId: atendimento.id,
      tipo: "REUNIAO",
      titulo: `${options?.titlePrefix || "Meeting"} reuniao ${digits}`,
      dataInicio,
      dataFim,
      local: "Google Meet",
    },
    select: { id: true },
  });

  return {
    ids: {
      clienteId: cliente.id,
      userId: user.id,
      advogadoId: advogado.id,
      atendimentoId: atendimento.id,
      conversationId: conversation.id,
      compromissoId: compromisso.id,
    } satisfies ScenarioContext,
    userEmail: user.email,
  };
}

async function cleanupScenario(ids: ScenarioContext) {
  await db.communicationJob.deleteMany({ where: { compromissoId: ids.compromissoId } });
  await db.compromissoReminder.deleteMany({ where: { compromissoId: ids.compromissoId } });
  await db.notificacao.deleteMany({ where: { userId: ids.userId } });
  await db.atendimentoHistorico.deleteMany({ where: { atendimentoId: ids.atendimentoId } });
  await db.compromisso.deleteMany({ where: { id: ids.compromissoId } });
  await db.conversation.deleteMany({ where: { id: ids.conversationId } });
  await db.atendimento.deleteMany({ where: { id: ids.atendimentoId } });
  await db.advogado.deleteMany({ where: { id: ids.advogadoId } });
  await db.user.deleteMany({ where: { id: ids.userId } });
  await db.cliente.deleteMany({ where: { id: ids.clienteId } });
}

async function main() {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as NodeModule;

  const { processMeetingReplyFromConversation, scheduleMeetingAutomation } = await import(
    "@/lib/services/meeting-automation-service"
  );

  const contexts: ScenarioContext[] = [];

  try {
    const confirm = await createScenario({ titlePrefix: "Confirmacao" });
    contexts.push(confirm.ids);

    const confirmSchedule = await scheduleMeetingAutomation(confirm.ids.compromissoId);
    assert.equal(confirmSchedule.jobsCreated, 5, "Confirmacao: deveria criar 5 jobs iniciais.");

    const confirmReplyFirst = await processMeetingReplyFromConversation(confirm.ids.conversationId, "CONFIRMO");
    const confirmReplySecond = await processMeetingReplyFromConversation(confirm.ids.conversationId, "CONFIRMO");
    assert.equal(confirmReplyFirst.applied, true, "Confirmacao: a primeira resposta deveria ser aplicada.");
    assert.equal(confirmReplySecond.applied, true, "Confirmacao: a segunda resposta deveria ser tratada.");

    const [confirmJobs, confirmNotifications, confirmHistory] = await Promise.all([
      db.communicationJob.findMany({
        where: { compromissoId: confirm.ids.compromissoId },
        include: { rule: { select: { eventType: true } } },
      }),
      db.notificacao.findMany({ where: { userId: confirm.ids.userId } }),
      db.atendimentoHistorico.findMany({ where: { atendimentoId: confirm.ids.atendimentoId } }),
    ]);

    assert.equal(confirmJobs.length, 6, "Confirmacao duplicada nao deve criar job extra.");
    assert.equal(
      confirmJobs.filter((job) => job.rule?.eventType === "REUNIAO_CONFIRMADA").length,
      1,
      "Confirmacao duplicada nao deve disparar o evento duas vezes."
    );
    assert.equal(confirmNotifications.length, 1, "Confirmacao duplicada nao deve criar notificacao duplicada.");
    assert.equal(
      confirmHistory.filter((item) => item.descricao.includes("confirmou a reuniao")).length,
      1,
      "Confirmacao duplicada nao deve duplicar historico."
    );

    const reschedule = await createScenario({ titlePrefix: "Remarcacao" });
    contexts.push(reschedule.ids);

    const rescheduleSchedule = await scheduleMeetingAutomation(reschedule.ids.compromissoId);
    assert.equal(rescheduleSchedule.jobsCreated, 5, "Remarcacao: deveria criar 5 jobs iniciais.");

    await processMeetingReplyFromConversation(reschedule.ids.conversationId, "REMARCAR");
    await processMeetingReplyFromConversation(reschedule.ids.conversationId, "REMARCAR");

    const [rescheduleCompromisso, rescheduleReminders, rescheduleJobs, rescheduleNotifications, rescheduleHistory] =
      await Promise.all([
        db.compromisso.findUnique({
          where: { id: reschedule.ids.compromissoId },
          select: { statusConfirmacao: true },
        }),
        db.compromissoReminder.findMany({
          where: { compromissoId: reschedule.ids.compromissoId },
          select: { status: true },
        }),
        db.communicationJob.findMany({
          where: { compromissoId: reschedule.ids.compromissoId },
          include: { rule: { select: { eventType: true } } },
        }),
        db.notificacao.findMany({ where: { userId: reschedule.ids.userId } }),
        db.atendimentoHistorico.findMany({ where: { atendimentoId: reschedule.ids.atendimentoId } }),
      ]);

    assert.equal(
      rescheduleCompromisso?.statusConfirmacao,
      "REMARCACAO_SOLICITADA",
      "Remarcacao: o compromisso deveria refletir a solicitacao."
    );
    assert.ok(
      rescheduleReminders.every((item) => item.status === "CANCELADO"),
      "Remarcacao: todos os reminders ativos deveriam ser cancelados."
    );
    assert.equal(
      rescheduleJobs.filter((job) => job.rule?.eventType === "REUNIAO_REMARCACAO_SOLICITADA").length,
      1,
      "Remarcacao duplicada nao deve gerar segundo job de aviso."
    );
    assert.equal(rescheduleNotifications.length, 1, "Remarcacao duplicada nao deve gerar notificacao duplicada.");
    assert.equal(
      rescheduleHistory.filter((item) => item.descricao.includes("solicitou remarcacao")).length,
      1,
      "Remarcacao duplicada nao deve duplicar historico."
    );

    const cancel = await createScenario({ titlePrefix: "Cancelamento" });
    contexts.push(cancel.ids);

    const cancelSchedule = await scheduleMeetingAutomation(cancel.ids.compromissoId);
    assert.equal(cancelSchedule.jobsCreated, 5, "Cancelamento: deveria criar 5 jobs iniciais.");

    await processMeetingReplyFromConversation(cancel.ids.conversationId, "CANCELAR");
    await processMeetingReplyFromConversation(cancel.ids.conversationId, "CANCELAR");

    const [cancelCompromisso, cancelAtendimento, cancelReminders, cancelJobs, cancelNotifications, cancelHistory] =
      await Promise.all([
        db.compromisso.findUnique({
          where: { id: cancel.ids.compromissoId },
          select: { statusConfirmacao: true, canceladoAt: true },
        }),
        db.atendimento.findUnique({
          where: { id: cancel.ids.atendimentoId },
          select: { statusReuniao: true, statusOperacional: true },
        }),
        db.compromissoReminder.findMany({
          where: { compromissoId: cancel.ids.compromissoId },
          select: { status: true },
        }),
        db.communicationJob.findMany({
          where: { compromissoId: cancel.ids.compromissoId },
          include: { rule: { select: { eventType: true } } },
        }),
        db.notificacao.findMany({ where: { userId: cancel.ids.userId } }),
        db.atendimentoHistorico.findMany({ where: { atendimentoId: cancel.ids.atendimentoId } }),
      ]);

    assert.equal(cancelCompromisso?.statusConfirmacao, "CANCELADO", "Cancelamento: o compromisso deveria ser cancelado.");
    assert.ok(cancelCompromisso?.canceladoAt, "Cancelamento: a data de cancelamento deveria ser registrada.");
    assert.equal(cancelAtendimento?.statusReuniao, "CANCELADA", "Cancelamento: o atendimento deveria refletir cancelamento.");
    assert.equal(
      cancelAtendimento?.statusOperacional,
      "AGUARDANDO_CLIENTE",
      "Cancelamento: o atendimento deveria voltar para aguardando cliente."
    );
    assert.ok(
      cancelReminders.every((item) => item.status === "CANCELADO"),
      "Cancelamento: todos os reminders deveriam ser cancelados."
    );
    assert.equal(
      cancelJobs.filter((job) => job.rule?.eventType === "REUNIAO_CANCELADA").length,
      1,
      "Cancelamento duplicado nao deve gerar segundo job de aviso."
    );
    assert.equal(cancelNotifications.length, 1, "Cancelamento duplicado nao deve gerar notificacao duplicada.");
    assert.equal(
      cancelHistory.filter((item) => item.descricao.includes("cancelou a reuniao")).length,
      1,
      "Cancelamento duplicado nao deve duplicar historico."
    );

    const noPhone = await createScenario({ titlePrefix: "SemWhatsApp", withClientPhone: false });
    contexts.push(noPhone.ids);

    const noPhoneSchedule = await scheduleMeetingAutomation(noPhone.ids.compromissoId);
    const noPhoneReminders = await db.compromissoReminder.findMany({
      where: { compromissoId: noPhone.ids.compromissoId },
      orderBy: { kind: "asc" },
      select: { kind: true, status: true },
    });

    assert.equal(noPhoneSchedule.jobsCreated, 2, "Sem WhatsApp: deveria criar apenas os 2 jobs do responsavel.");
    assert.equal(noPhoneSchedule.remindersUpdated, 2, "Sem WhatsApp: deveria agendar apenas os reminders do responsavel.");
    assert.deepEqual(
      noPhoneReminders.map((item) => item.kind),
      ["RESPONSAVEL_D1", "RESPONSAVEL_H1"],
      "Sem WhatsApp: nao deveria haver reminder de cliente."
    );

    const pastMeeting = await createScenario({ titlePrefix: "Expirada", startsInMinutes: -120 });
    contexts.push(pastMeeting.ids);

    const pastSchedule = await scheduleMeetingAutomation(pastMeeting.ids.compromissoId);
    const [pastJobs, pastReminders] = await Promise.all([
      db.communicationJob.count({ where: { compromissoId: pastMeeting.ids.compromissoId } }),
      db.compromissoReminder.count({ where: { compromissoId: pastMeeting.ids.compromissoId } }),
    ]);

    assert.equal(pastSchedule.skipped, true, "Reuniao passada deve ser ignorada.");
    assert.equal(pastJobs, 0, "Reuniao passada nao deve criar jobs.");
    assert.equal(pastReminders, 0, "Reuniao passada nao deve criar reminders.");

    console.log(
      JSON.stringify({
        ok: true,
        scenarios: 5,
        checks: [
          "confirmacao_idempotente",
          "remarcacao_idempotente",
          "cancelamento_idempotente",
          "sem_whatsapp_cliente",
          "reuniao_expirada",
        ],
      })
    );
  } finally {
    for (const context of contexts.reverse()) {
      await cleanupScenario(context).catch(() => null);
    }
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
