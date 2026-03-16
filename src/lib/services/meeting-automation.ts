export type MeetingReminderKind =
  | "CLIENTE_D1"
  | "CLIENTE_H1"
  | "RESPONSAVEL_D1"
  | "RESPONSAVEL_H1"
  | "CLIENTE_CONFIRMACAO";

export type MeetingReplyIntent =
  | "CONFIRMADA"
  | "REMARCACAO"
  | "CANCELADA";

const REMINDER_KIND_MAP: Record<MeetingReminderKind, string> = {
  CLIENTE_D1: "cliente:d1",
  CLIENTE_H1: "cliente:h1",
  RESPONSAVEL_D1: "responsavel:d1",
  RESPONSAVEL_H1: "responsavel:h1",
  CLIENTE_CONFIRMACAO: "cliente:confirmacao",
};

export function buildMeetingReminderCorrelationId(
  compromissoId: string,
  kind: MeetingReminderKind
) {
  return `meeting:${compromissoId}:${REMINDER_KIND_MAP[kind]}`;
}

export function isReminderDue(input: {
  now: Date;
  startAt: Date;
  minutesBefore: number;
  toleranceMinutes?: number;
}) {
  const toleranceMinutes = Math.max(0, input.toleranceMinutes ?? 5);
  const target = input.startAt.getTime() - input.minutesBefore * 60_000;
  const minWindow = target - toleranceMinutes * 60_000;
  const maxWindow = target + toleranceMinutes * 60_000;
  const now = input.now.getTime();

  return now >= minWindow && now <= maxWindow;
}

export function classifyMeetingReply(content: string): MeetingReplyIntent | null {
  const normalized = normalizeMeetingReply(content);
  if (!normalized) return null;

  if (
    containsAny(normalized, [
      "confirmo",
      "confirmada",
      "confirmado",
      "estarei presente",
      "vou comparecer",
      "estou confirmado",
      "presenca confirmada",
      "ok confirmo",
    ])
  ) {
    return "CONFIRMADA";
  }

  if (
    containsAny(normalized, [
      "remarcar",
      "remarcar",
      "remarcacao",
      "reagendar",
      "reagendamento",
      "outro horario",
      "mudar horario",
      "alterar horario",
    ])
  ) {
    return "REMARCACAO";
  }

  if (
    containsAny(normalized, [
      "cancelar",
      "cancelamento",
      "nao vou poder",
      "nao poderei",
      "nao posso comparecer",
      "desmarcar",
    ])
  ) {
    return "CANCELADA";
  }

  return null;
}

function normalizeMeetingReply(content: string) {
  return (content || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function containsAny(content: string, terms: string[]) {
  return terms.some((term) => content.includes(term));
}
