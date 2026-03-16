"use client";

import { CHAT_PRESENCE_STATUS_META } from "@/lib/chat/constants";
import { cn, getInitials } from "@/lib/utils";

type Props = {
  name: string;
  avatarUrl: string | null;
  status: keyof typeof CHAT_PRESENCE_STATUS_META;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-14 text-base",
} as const;

export function UserPresenceAvatar({ name, avatarUrl, status, size = "md" }: Props) {
  const meta = CHAT_PRESENCE_STATUS_META[status];

  return (
    <div className="relative inline-flex">
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-[var(--bg-primary)] shadow-[0_12px_24px_color-mix(in_srgb,var(--shadow-color)_16%,transparent)]",
          meta.ringClassName,
          sizeMap[size]
        )}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="font-semibold uppercase tracking-[0.08em] text-text-primary">
            {getInitials(name)}
          </span>
        )}
      </div>

      <span
        className={cn(
          "absolute bottom-0 right-0 block rounded-full border-2 border-[var(--bg-primary)]",
          meta.dotClassName,
          size === "sm" ? "size-3" : size === "md" ? "size-3.5" : "size-4"
        )}
        aria-label={meta.label}
        title={meta.label}
      />
    </div>
  );
}
