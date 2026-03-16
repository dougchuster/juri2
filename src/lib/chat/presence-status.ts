import type { InternalChatPresenceStatus } from "@/generated/prisma";
import { CHAT_LIMITS } from "@/lib/chat/constants";

export type ChatPresenceComputedStatus = InternalChatPresenceStatus;

export function computePresenceStatus(input: {
  manualStatus?: InternalChatPresenceStatus | null;
  lastActivityAt?: Date | string | null;
  connected: boolean;
  now?: number;
}): ChatPresenceComputedStatus {
  const now = input.now ?? Date.now();
  if (!input.connected) return "OFFLINE";

  if (input.manualStatus) {
    return input.manualStatus;
  }

  const activityTs = input.lastActivityAt ? new Date(input.lastActivityAt).getTime() : 0;
  if (!activityTs || now - activityTs > CHAT_LIMITS.awayThresholdMs) {
    return "AWAY";
  }

  return "ONLINE";
}
