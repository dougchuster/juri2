import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";

const REQUIRED_EVENT_TYPES = [
  "REUNIAO_CONFIRMACAO_CLIENTE",
  "REUNIAO_LEMBRETE_CLIENTE_D1",
  "REUNIAO_LEMBRETE_CLIENTE_H1",
  "REUNIAO_LEMBRETE_RESPONSAVEL_D1",
  "REUNIAO_LEMBRETE_RESPONSAVEL_H1",
  "REUNIAO_CONFIRMADA",
] as const;

async function ensureMeetingRules() {
  const rules = await db.notificationRule.findMany({
    where: {
      eventType: { in: [...REQUIRED_EVENT_TYPES] },
      isActive: true,
    },
    select: {
      eventType: true,
    },
  });

  const available = new Set(rules.map((rule) => rule.eventType));
  const missing = REQUIRED_EVENT_TYPES.filter((eventType) => !available.has(eventType));

  assert.equal(
    missing.length,
    0,
    `Regras de reuniao ausentes: ${missing.join(", ")}. Rode npm run db:seed:meeting-automation antes do smoke test.`
  );
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

  await ensureMeetingRules();

  const suffix = randomUUID().slice(0, 8);
  const now = Date.now();
  const dataInicio = new Date(now + 30 * 60 * 60 * 1000);
  const dataFim = new Date(dataInicio.getTime() + 60 * 60 * 1000);

  let clienteId: string | undefined;
  let userId: string | undefined;
  let advogadoId: string | undefined;
  let atendimentoId: string | undefined;
  let conversationId: string | undefined;
  let compromissoId: string | undefined;

  try {
    const cliente = await db.cliente.create({
      data: {
        nome: `Smoke Cliente ${suffix}`,
        email: `smoke.cliente.${suffix}@example.com`,
        whatsapp: `+55119999${suffix}`,
        celular: `+55118888${suffix}`,
      },
      select: { id: true },
    });
    clienteId = cliente.id;

    const user = await db.user.create({
      data: {
        email: `smoke.advogado.${suffix}@example.com`,
        name: `Smoke Advogado ${suffix}`,
        passwordHash: `smoke-hash-${suffix}`,
        role: "ADVOGADO",
      },
      select: { id: true, email: true },
    });
    userId = user.id;

    const advogado = await db.advogado.create({
      data: {
        userId: user.id,
        oab: `SMK${suffix}`,
        seccional: "GO",
      },
      select: { id: true },
    });
    advogadoId = advogado.id;

    const atendimento = await db.atendimento.create({
      data: {
        clienteId: cliente.id,
        advogadoId: advogado.id,
        assunto: `Smoke reuniao ${suffix}`,
        canal: "WHATSAPP",
      },
      select: { id: true },
    });
    atendimentoId = atendimento.id;

    const conversation = await db.conversation.create({
      data: {
        clienteId: cliente.id,
        atendimentoId: atendimento.id,
        canal: "WHATSAPP",
        assignedToId: user.id,
        subject: `Smoke conversation ${suffix}`,
      },
      select: { id: true },
    });
    conversationId = conversation.id;

    const compromisso = await db.compromisso.create({
      data: {
        advogadoId: advogado.id,
        clienteId: cliente.id,
        atendimentoId: atendimento.id,
        tipo: "REUNIAO",
        titulo: `Smoke reuniao ${suffix}`,
        dataInicio,
        dataFim,
        local: "Google Meet",
      },
      select: { id: true },
    });
    compromissoId = compromisso.id;

    const scheduleResult = await scheduleMeetingAutomation(compromisso.id);
    assert.equal(scheduleResult.skipped, false, "A automacao da reuniao nao deveria ser ignorada.");
    assert.equal(scheduleResult.jobsCreated, 5, "Era esperado criar 5 jobs iniciais de reuniao.");
    assert.equal(scheduleResult.remindersUpdated, 5, "Era esperado sincronizar 5 reminders.");

    const reminders = await db.compromissoReminder.findMany({
      where: { compromissoId: compromisso.id },
      orderBy: { kind: "asc" },
      select: {
        kind: true,
        status: true,
        jobCorrelationId: true,
      },
    });

    assert.equal(reminders.length, 5, "Era esperado persistir 5 reminders de reuniao.");
    assert.deepEqual(
      reminders.map((item) => item.kind),
      ["CLIENTE_CONFIRMACAO", "CLIENTE_D1", "CLIENTE_H1", "RESPONSAVEL_D1", "RESPONSAVEL_H1"],
      "Os reminders criados nao batem com o plano esperado."
    );
    assert.ok(
      reminders.every((item) => item.status === "AGENDADO" && item.jobCorrelationId),
      "Todos os reminders deveriam estar agendados com correlationId."
    );

    const initialJobs = await db.communicationJob.findMany({
      where: { compromissoId: compromisso.id },
      include: {
        rule: {
          select: {
            eventType: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    assert.equal(initialJobs.length, 5, "Era esperado criar 5 jobs na fila.");
    assert.equal(
      initialJobs.filter((job) => job.canal === "WHATSAPP").length,
      3,
      "Era esperado criar 3 jobs WhatsApp para o cliente."
    );
    assert.equal(
      initialJobs.filter((job) => job.canal === "EMAIL").length,
      2,
      "Era esperado criar 2 jobs de email para o responsavel."
    );

    const replyResult = await processMeetingReplyFromConversation(conversation.id, "CONFIRMO");
    assert.equal(replyResult.applied, true, "A resposta do cliente deveria confirmar a reuniao.");

    const [updatedCompromisso, updatedAtendimento, historicos, notificacoes, jobsAfterReply] = await Promise.all([
      db.compromisso.findUnique({
        where: { id: compromisso.id },
        select: {
          statusConfirmacao: true,
          confirmadoAt: true,
        },
      }),
      db.atendimento.findUnique({
        where: { id: atendimento.id },
        select: {
          statusReuniao: true,
          statusOperacional: true,
          ultimaInteracaoEm: true,
        },
      }),
      db.atendimentoHistorico.findMany({
        where: { atendimentoId: atendimento.id },
        orderBy: { createdAt: "asc" },
        select: {
          descricao: true,
        },
      }),
      db.notificacao.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: {
          titulo: true,
          mensagem: true,
        },
      }),
      db.communicationJob.findMany({
        where: { compromissoId: compromisso.id },
        include: {
          rule: {
            select: {
              eventType: true,
            },
          },
        },
      }),
    ]);

    assert.equal(updatedCompromisso?.statusConfirmacao, "CONFIRMADO", "O compromisso deveria ficar confirmado.");
    assert.ok(updatedCompromisso?.confirmadoAt, "O compromisso deveria registrar a data de confirmacao.");
    assert.equal(updatedAtendimento?.statusReuniao, "CONFIRMADA", "O atendimento deveria refletir a reuniao confirmada.");
    assert.equal(
      updatedAtendimento?.statusOperacional,
      "REUNIAO_CONFIRMADA",
      "O atendimento deveria refletir o status operacional de reuniao confirmada."
    );
    assert.ok(updatedAtendimento?.ultimaInteracaoEm, "O atendimento deveria registrar a ultima interacao.");
    assert.ok(
      historicos.some((item) => item.descricao.includes("confirmou a reuniao")),
      "O historico do atendimento deveria registrar a confirmacao."
    );
    assert.ok(
      notificacoes.some((item) => item.titulo === "Reuniao confirmada"),
      "Uma notificacao interna de reuniao confirmada deveria ser criada."
    );
    assert.equal(jobsAfterReply.length, 6, "A confirmacao deveria adicionar 1 job extra ao responsavel.");
    assert.ok(
      jobsAfterReply.some(
        (job) =>
          job.rule?.eventType === "REUNIAO_CONFIRMADA" &&
          job.canal === "EMAIL" &&
          job.recipientEmail === user.email
      ),
      "Deveria existir um job de email para o responsavel avisando da confirmacao."
    );

    console.log(
      JSON.stringify({
        ok: true,
        compromissoId: compromisso.id,
        jobsBeforeReply: initialJobs.length,
        jobsAfterReply: jobsAfterReply.length,
        reminders: reminders.length,
      })
    );
  } finally {
    if (compromissoId) {
      await db.communicationJob.deleteMany({ where: { compromissoId } });
      await db.compromissoReminder.deleteMany({ where: { compromissoId } });
      await db.compromisso.deleteMany({ where: { id: compromissoId } });
    }

    if (atendimentoId) {
      await db.atendimentoHistorico.deleteMany({ where: { atendimentoId } });
    }

    if (conversationId) {
      await db.conversation.deleteMany({ where: { id: conversationId } });
    }

    if (atendimentoId) {
      await db.atendimento.deleteMany({ where: { id: atendimentoId } });
    }

    if (advogadoId) {
      await db.advogado.deleteMany({ where: { id: advogadoId } });
    }

    if (userId) {
      await db.user.deleteMany({ where: { id: userId } });
    }

    if (clienteId) {
      await db.cliente.deleteMany({ where: { id: clienteId } });
    }

    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
