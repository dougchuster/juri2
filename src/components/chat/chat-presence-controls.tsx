"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getChatPresenceChipClasses,
  getChatPresenceDescription,
  getChatPresenceLabel,
  type ChatPresenceStatus,
} from "@/lib/chat/presence-ui";

type Props = {
  manualStatus: "ONLINE" | "AWAY" | "BUSY" | null;
  computedStatus: ChatPresenceStatus;
  isPending?: boolean;
  compact?: boolean;
  onChange: (status: "ONLINE" | "AWAY" | "BUSY" | null) => void | Promise<void>;
};

export function ChatPresenceControls({
  manualStatus,
  computedStatus,
  isPending = false,
  compact = false,
  onChange,
}: Props) {
  return (
    <div className="space-y-3">
      <div className={cn("flex flex-wrap gap-2", compact && "gap-1.5")}>
        <button
          type="button"
          disabled={isPending}
          onClick={() => void onChange(null)}
          className={cn(
            "inline-flex min-w-[72px] items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold transition-all",
            compact && "min-w-[60px] px-2.5 py-1.5 text-[12px]",
            getChatPresenceChipClasses("AUTO", manualStatus === null)
          )}
        >
          {isPending && manualStatus === null ? <Loader2 size={13} className="animate-spin" /> : "Auto"}
        </button>

        {(["ONLINE", "AWAY", "BUSY"] as const).map((status) => (
          <button
            key={status}
            type="button"
            disabled={isPending}
            onClick={() => void onChange(status)}
            className={cn(
              "inline-flex min-w-[88px] items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold transition-all",
              compact && "min-w-[70px] px-2.5 py-1.5 text-[12px]",
              getChatPresenceChipClasses(status, manualStatus === status)
            )}
          >
            {isPending && manualStatus === status ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              getChatPresenceLabel(status)
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span className="font-semibold uppercase tracking-[0.16em]">Status atual</span>
        <span className="rounded-full bg-black/5 px-2 py-1 text-[11px] font-semibold text-text-secondary dark:bg-white/8">
          {getChatPresenceLabel(computedStatus)}
        </span>
        {!compact ? <span>{getChatPresenceDescription(computedStatus)}</span> : null}
      </div>
    </div>
  );
}
