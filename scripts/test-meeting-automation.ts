import assert from "node:assert/strict";

import {
  buildMeetingReminderCorrelationId,
  classifyMeetingReply,
  isReminderDue,
} from "@/lib/services/meeting-automation";

function run() {
  assert.equal(
    buildMeetingReminderCorrelationId("cmp-1", "CLIENTE_D1"),
    "meeting:cmp-1:cliente:d1"
  );
  assert.equal(
    buildMeetingReminderCorrelationId("cmp-1", "RESPONSAVEL_H1"),
    "meeting:cmp-1:responsavel:h1"
  );

  const now = new Date("2026-03-13T15:00:00.000Z");
  const startAt = new Date("2026-03-14T15:00:00.000Z");

  assert.equal(
    isReminderDue({
      now,
      startAt,
      minutesBefore: 24 * 60,
      toleranceMinutes: 5,
    }),
    true,
    "D-1 deve disparar dentro da janela de tolerancia"
  );

  assert.equal(
    isReminderDue({
      now,
      startAt,
      minutesBefore: 60,
      toleranceMinutes: 5,
    }),
    false,
    "H-1 nao deve disparar 24 horas antes"
  );

  assert.equal(classifyMeetingReply("Confirmo minha presença amanhã."), "CONFIRMADA");
  assert.equal(classifyMeetingReply("Preciso remarcar a reunião."), "REMARCACAO");
  assert.equal(classifyMeetingReply("Quero cancelar esse compromisso."), "CANCELADA");
  assert.equal(classifyMeetingReply("Obrigado pelo aviso."), null);

  console.log("test-meeting-automation: ok");
}

run();
