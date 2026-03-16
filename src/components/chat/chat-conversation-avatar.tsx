"use client";

import { UsersRound } from "lucide-react";

import { UserPresenceAvatar } from "@/components/chat/user-presence-avatar";
import type { ChatConversationItem } from "@/lib/chat/types";
import { cn, getInitials } from "@/lib/utils";

type Props = {
  conversation: ChatConversationItem;
  size?: "sm" | "md" | "lg";
};

const groupSizeMap = {
  sm: "size-9",
  md: "size-11",
  lg: "size-14",
} as const;

const groupInsetMap = {
  sm: "size-4 text-[9px]",
  md: "size-5 text-[10px]",
  lg: "size-6 text-[11px]",
} as const;

export function ChatConversationAvatar({ conversation, size = "md" }: Props) {
  if (conversation.type === "DIRECT" && conversation.otherParticipant) {
    return (
      <UserPresenceAvatar
        name={conversation.otherParticipant.name}
        avatarUrl={conversation.otherParticipant.avatarUrl}
        status={conversation.otherParticipant.presence.computedStatus}
        size={size}
      />
    );
  }

  const leadParticipant = conversation.participants[0]?.user || null;
  const secondParticipant = conversation.participants[1]?.user || null;
  const groupName = conversation.title || "Grupo interno";

  return (
    <div className={cn("relative isolate rounded-[24px]", groupSizeMap[size])}>
      <div className="absolute inset-0 rounded-[24px] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_18%,white),rgba(255,255,255,0.92))] shadow-[0_16px_32px_color-mix(in_srgb,var(--accent)_18%,transparent)] dark:bg-[linear-gradient(135deg,rgba(195,160,127,0.24),rgba(255,255,255,0.06))]" />
      <div className="relative flex h-full w-full items-center justify-center rounded-[24px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.74),rgba(247,239,231,0.92))] text-[var(--accent)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]">
        <UsersRound size={size === "lg" ? 22 : size === "md" ? 18 : 15} />
      </div>

      {leadParticipant ? (
        <div
          className={cn(
            "absolute -bottom-1 -left-1 flex items-center justify-center overflow-hidden rounded-full border-2 border-[var(--bg-primary)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(244,233,222,0.96))] text-[var(--accent-hover)] shadow-[0_12px_24px_color-mix(in_srgb,var(--shadow-color)_16%,transparent)]",
            groupInsetMap[size]
          )}
          title={leadParticipant.name}
          aria-label={leadParticipant.name}
        >
          {leadParticipant.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={leadParticipant.avatarUrl} alt={leadParticipant.name} className="h-full w-full object-cover" />
          ) : (
            <span className="font-semibold uppercase tracking-[0.08em]">{getInitials(leadParticipant.name)}</span>
          )}
        </div>
      ) : null}

      {secondParticipant ? (
        <div
          className={cn(
            "absolute -bottom-1 -right-1 flex items-center justify-center overflow-hidden rounded-full border-2 border-[var(--bg-primary)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(244,233,222,0.96))] text-[var(--accent-hover)] shadow-[0_12px_24px_color-mix(in_srgb,var(--shadow-color)_16%,transparent)]",
            groupInsetMap[size]
          )}
          title={secondParticipant.name}
          aria-label={secondParticipant.name}
        >
          {secondParticipant.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={secondParticipant.avatarUrl} alt={secondParticipant.name} className="h-full w-full object-cover" />
          ) : (
            <span className="font-semibold uppercase tracking-[0.08em]">{getInitials(secondParticipant.name)}</span>
          )}
        </div>
      ) : null}

      <span className="sr-only">{groupName}</span>
    </div>
  );
}
