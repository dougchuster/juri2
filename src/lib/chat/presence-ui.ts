export type ChatPresenceStatus = "ONLINE" | "AWAY" | "BUSY" | "OFFLINE";

export function getChatPresenceLabel(status?: ChatPresenceStatus | null) {
  switch (status) {
    case "ONLINE":
      return "Online";
    case "AWAY":
      return "Ausente";
    case "BUSY":
      return "Ocupado";
    default:
      return "Offline";
  }
}

export function getChatPresenceDescription(status?: ChatPresenceStatus | null) {
  switch (status) {
    case "ONLINE":
      return "Disponivel agora";
    case "AWAY":
      return "Sem atividade recente";
    case "BUSY":
      return "Foco ativo";
    default:
      return "Sem conexao em tempo real";
  }
}

export function getChatPresenceAccentClass(status?: ChatPresenceStatus | null) {
  switch (status) {
    case "ONLINE":
      return "text-emerald-600 dark:text-emerald-300";
    case "AWAY":
      return "text-amber-600 dark:text-amber-300";
    case "BUSY":
      return "text-rose-600 dark:text-rose-300";
    default:
      return "text-slate-500 dark:text-slate-300";
  }
}

export function getChatPresenceDotClass(status?: ChatPresenceStatus | null) {
  switch (status) {
    case "ONLINE":
      return "bg-emerald-500";
    case "AWAY":
      return "bg-amber-400";
    case "BUSY":
      return "bg-rose-500";
    default:
      return "bg-slate-400";
  }
}

export function getChatPresenceChipClasses(status: Exclude<ChatPresenceStatus, "OFFLINE"> | "AUTO", active: boolean) {
  if (!active) {
    return "border-white/10 bg-white/50 text-text-secondary hover:border-border-hover hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/8";
  }

  switch (status) {
    case "AUTO":
      return "border-[color:color-mix(in_srgb,var(--accent)_32%,white)] bg-[color:color-mix(in_srgb,var(--accent)_16%,white)] text-[var(--accent-hover)] shadow-[0_14px_28px_color-mix(in_srgb,var(--accent)_18%,transparent)] dark:text-[var(--accent)]";
    case "ONLINE":
      return "border-emerald-300/70 bg-emerald-500/12 text-emerald-700 shadow-[0_14px_28px_rgba(16,185,129,0.18)] dark:border-emerald-400/30 dark:bg-emerald-500/18 dark:text-emerald-200";
    case "AWAY":
      return "border-amber-300/70 bg-amber-500/12 text-amber-700 shadow-[0_14px_28px_rgba(245,158,11,0.18)] dark:border-amber-400/30 dark:bg-amber-500/18 dark:text-amber-100";
    case "BUSY":
      return "border-rose-300/70 bg-rose-500/12 text-rose-700 shadow-[0_14px_28px_rgba(244,63,94,0.18)] dark:border-rose-400/30 dark:bg-rose-500/18 dark:text-rose-100";
    default:
      return "";
  }
}
