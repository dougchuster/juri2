import "dotenv/config";
import { db } from "@/lib/db";

type TemplateSeed = {
  name: string;
  canal: "WHATSAPP" | "EMAIL";
  category: string;
  subject?: string | null;
  content: string;
};

async function main() {
  const templates: TemplateSeed[] = [
    {
      name: "meeting_confirmation_request_client_whatsapp",
      canal: "WHATSAPP",
      category: "ATENDIMENTO_REUNIAO",
      content:
        'Ola {cliente_nome}, sua reuniao "{compromisso_titulo}" ficou agendada para {compromisso_data} as {compromisso_hora}. Local: {compromisso_local}. {confirmacao_instrucao}',
    },
    {
      name: "meeting_reminder_client_d1_whatsapp",
      canal: "WHATSAPP",
      category: "ATENDIMENTO_REUNIAO",
      content:
        'Lembrete: sua reuniao "{compromisso_titulo}" sera amanha, {compromisso_data}, as {compromisso_hora}. Local: {compromisso_local}. {confirmacao_instrucao}',
    },
    {
      name: "meeting_reminder_client_h1_whatsapp",
      canal: "WHATSAPP",
      category: "ATENDIMENTO_REUNIAO",
      content:
        'Sua reuniao "{compromisso_titulo}" comeca em 1 hora, as {compromisso_hora}. Local: {compromisso_local}.',
    },
    {
      name: "meeting_reminder_responsavel_d1_email",
      canal: "EMAIL",
      category: "ATENDIMENTO_REUNIAO",
      subject: "Lembrete D-1: reuniao com {cliente_nome}",
      content:
        'Lembrete D-1: a reuniao "{compromisso_titulo}" com {cliente_nome} esta marcada para {compromisso_data} as {compromisso_hora}.',
    },
    {
      name: "meeting_reminder_responsavel_h1_email",
      canal: "EMAIL",
      category: "ATENDIMENTO_REUNIAO",
      subject: "Lembrete H-1: reuniao com {cliente_nome}",
      content:
        'Lembrete H-1: a reuniao "{compromisso_titulo}" com {cliente_nome} comeca em 1 hora, as {compromisso_hora}.',
    },
    {
      name: "meeting_confirmed_responsavel_email",
      canal: "EMAIL",
      category: "ATENDIMENTO_REUNIAO",
      subject: "Cliente confirmou a reuniao de {compromisso_data}",
      content:
        '{cliente_nome} confirmou a reuniao "{compromisso_titulo}" marcada para {compromisso_data} as {compromisso_hora}.',
    },
    {
      name: "meeting_reschedule_requested_responsavel_email",
      canal: "EMAIL",
      category: "ATENDIMENTO_REUNIAO",
      subject: "Pedido de remarcacao de reuniao",
      content:
        '{cliente_nome} pediu remarcacao da reuniao "{compromisso_titulo}" originalmente marcada para {compromisso_data} as {compromisso_hora}.',
    },
    {
      name: "meeting_cancelled_responsavel_email",
      canal: "EMAIL",
      category: "ATENDIMENTO_REUNIAO",
      subject: "Reuniao cancelada pelo cliente",
      content:
        '{cliente_nome} cancelou a reuniao "{compromisso_titulo}" marcada para {compromisso_data} as {compromisso_hora}.',
    },
  ];

  for (const template of templates) {
    await db.messageTemplate.upsert({
      where: { name: template.name },
      create: {
        name: template.name,
        canal: template.canal,
        category: template.category,
        subject: template.subject || null,
        content: template.content,
        isActive: true,
      },
      update: {
        canal: template.canal,
        category: template.category,
        subject: template.subject || null,
        content: template.content,
        isActive: true,
      },
    });
  }

  const savedTemplates = await db.messageTemplate.findMany({
    where: { name: { in: templates.map((item) => item.name) } },
    select: { id: true, name: true },
  });
  const templateByName = new Map(savedTemplates.map((item) => [item.name, item.id]));

  const rules = [
    {
      name: "Reuniao - Solicitacao de confirmacao ao cliente",
      eventType: "REUNIAO_CONFIRMACAO_CLIENTE",
      canal: "WHATSAPP",
      target: "CLIENTE",
      templateName: "meeting_confirmation_request_client_whatsapp",
    },
    {
      name: "Reuniao - Lembrete D-1 ao cliente",
      eventType: "REUNIAO_LEMBRETE_CLIENTE_D1",
      canal: "WHATSAPP",
      target: "CLIENTE",
      templateName: "meeting_reminder_client_d1_whatsapp",
    },
    {
      name: "Reuniao - Lembrete H-1 ao cliente",
      eventType: "REUNIAO_LEMBRETE_CLIENTE_H1",
      canal: "WHATSAPP",
      target: "CLIENTE",
      templateName: "meeting_reminder_client_h1_whatsapp",
    },
    {
      name: "Reuniao - Lembrete D-1 ao responsavel",
      eventType: "REUNIAO_LEMBRETE_RESPONSAVEL_D1",
      canal: "EMAIL",
      target: "RESPONSAVEL",
      templateName: "meeting_reminder_responsavel_d1_email",
    },
    {
      name: "Reuniao - Lembrete H-1 ao responsavel",
      eventType: "REUNIAO_LEMBRETE_RESPONSAVEL_H1",
      canal: "EMAIL",
      target: "RESPONSAVEL",
      templateName: "meeting_reminder_responsavel_h1_email",
    },
    {
      name: "Reuniao - Cliente confirmou",
      eventType: "REUNIAO_CONFIRMADA",
      canal: "EMAIL",
      target: "RESPONSAVEL",
      templateName: "meeting_confirmed_responsavel_email",
    },
    {
      name: "Reuniao - Cliente pediu remarcacao",
      eventType: "REUNIAO_REMARCACAO_SOLICITADA",
      canal: "EMAIL",
      target: "RESPONSAVEL",
      templateName: "meeting_reschedule_requested_responsavel_email",
    },
    {
      name: "Reuniao - Cliente cancelou",
      eventType: "REUNIAO_CANCELADA",
      canal: "EMAIL",
      target: "RESPONSAVEL",
      templateName: "meeting_cancelled_responsavel_email",
    },
  ] as const;

  for (const rule of rules) {
    const templateId = templateByName.get(rule.templateName);
    if (!templateId) continue;

    const existing = await db.notificationRule.findFirst({
      where: { name: rule.name },
      select: { id: true },
    });

    if (existing) {
      await db.notificationRule.update({
        where: { id: existing.id },
        data: {
          eventType: rule.eventType as never,
          canal: rule.canal as never,
          target: rule.target as never,
          templateId,
          isActive: true,
          workdaysOnly: false,
          sendHourStart: 0,
          sendHourEnd: 23,
        },
      });
    } else {
      await db.notificationRule.create({
        data: {
          name: rule.name,
          eventType: rule.eventType as never,
          canal: rule.canal as never,
          target: rule.target as never,
          templateId,
          isActive: true,
          workdaysOnly: false,
          sendHourStart: 0,
          sendHourEnd: 23,
        },
      });
    }
  }

  console.log(
    JSON.stringify({
      ok: true,
      templates: templates.length,
      rules: rules.length,
    })
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
