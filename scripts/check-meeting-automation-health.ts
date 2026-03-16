import "dotenv/config";

import { db } from "@/lib/db";
import { testSmtpConnection } from "@/lib/integrations/email-service";
import { whatsappService } from "@/lib/integrations/baileys-service";

async function main() {
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [
    templates,
    rules,
    upcomingMeetings,
    dueNext24h,
    remindersByStatus,
    staleMeetingJobs,
    failedMeetingJobs,
    cancelledMeetingJobs,
    calendarIntegrations,
    recentProblemJobs,
  ] = await Promise.all([
    db.messageTemplate.count({
      where: {
        name: {
          in: [
            "meeting_confirmation_request_client_whatsapp",
            "meeting_reminder_client_d1_whatsapp",
            "meeting_reminder_client_h1_whatsapp",
            "meeting_reminder_responsavel_d1_email",
            "meeting_reminder_responsavel_h1_email",
            "meeting_confirmed_responsavel_email",
            "meeting_reschedule_requested_responsavel_email",
            "meeting_cancelled_responsavel_email",
          ],
        },
      },
    }),
    db.notificationRule.count({
      where: {
        eventType: {
          in: [
            "REUNIAO_CONFIRMACAO_CLIENTE",
            "REUNIAO_LEMBRETE_CLIENTE_D1",
            "REUNIAO_LEMBRETE_CLIENTE_H1",
            "REUNIAO_LEMBRETE_RESPONSAVEL_D1",
            "REUNIAO_LEMBRETE_RESPONSAVEL_H1",
            "REUNIAO_CONFIRMADA",
            "REUNIAO_REMARCACAO_SOLICITADA",
            "REUNIAO_CANCELADA",
          ],
        },
        isActive: true,
      },
    }),
    db.compromisso.count({
      where: {
        tipo: "REUNIAO",
        concluido: false,
        canceladoAt: null,
        dataInicio: { gt: now },
      },
    }),
    db.compromisso.count({
      where: {
        tipo: "REUNIAO",
        concluido: false,
        canceladoAt: null,
        dataInicio: { gt: now, lte: next24h },
      },
    }),
    db.compromissoReminder.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    db.communicationJob.count({
      where: {
        compromissoId: { not: null },
        status: { in: ["PENDING", "PROCESSING"] },
        scheduledFor: { lt: now },
      },
    }),
    db.communicationJob.count({
      where: {
        compromissoId: { not: null },
        status: "FAILED",
      },
    }),
    db.communicationJob.count({
      where: {
        compromissoId: { not: null },
        status: "CANCELLED",
      },
    }),
    db.calendarIntegration.groupBy({
      by: ["provider", "enabled"],
      _count: { _all: true },
    }),
    db.communicationJob.findMany({
      where: {
        compromissoId: { not: null },
        status: { in: ["FAILED", "CANCELLED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        rule: { select: { name: true } },
        compromisso: {
          select: {
            titulo: true,
            dataInicio: true,
            cliente: { select: { nome: true } },
          },
        },
      },
    }),
  ]);

  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  const smtp = smtpConfigured
    ? await testSmtpConnection()
    : { ok: false, skipped: true, reason: "SMTP_* nao configurado completamente." };

  const whatsappStatus = whatsappService.getStatus();

  console.log(
    JSON.stringify(
      {
        ok: staleMeetingJobs === 0 && failedMeetingJobs === 0,
        checkedAt: now.toISOString(),
        configuration: {
          templates,
          rules,
          smtp,
          whatsapp: {
            connected: whatsappStatus.connected,
            state: whatsappStatus.state,
            phoneNumber: whatsappStatus.phoneNumber,
            name: whatsappStatus.name,
          },
          calendarIntegrations,
        },
        workload: {
          upcomingMeetings,
          dueNext24h,
          remindersByStatus,
          staleMeetingJobs,
          failedMeetingJobs,
          cancelledMeetingJobs,
        },
        recentProblemJobs: recentProblemJobs.map((job) => ({
          id: job.id,
          status: job.status,
          canal: job.canal,
          rule: job.rule?.name || null,
          recipientPhone: job.recipientPhone,
          recipientEmail: job.recipientEmail,
          errorMessage: job.errorMessage,
          createdAt: job.createdAt,
          compromisso: job.compromisso
            ? {
                titulo: job.compromisso.titulo,
                dataInicio: job.compromisso.dataInicio,
                clienteNome: job.compromisso.cliente?.nome || null,
              }
            : null,
        })),
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
