export function buildInternalChatDirectKey(
  escritorioId: string,
  userAId: string,
  userBId: string
) {
  const [left, right] = [userAId, userBId].sort((a, b) => a.localeCompare(b));
  return `${escritorioId}:${left}:${right}`;
}

export function isSameParticipantPair(userAId: string, userBId: string) {
  return userAId.trim() === userBId.trim();
}
