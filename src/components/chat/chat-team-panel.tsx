"use client";

import { ChevronDown, ChevronUp, MessageCircle, Search, Users2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn, getInitials } from "@/lib/utils";
import { getChatPresenceDotClass } from "@/lib/chat/presence-ui";

type PresenceStatus = "ONLINE" | "AWAY" | "BUSY" | "OFFLINE";

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  setor: string;
  presence: PresenceStatus;
  lastSeenAt: string | null;
};

type Section = {
  setor: string;
  members: Member[];
};

type Props = {
  onStartDirect: (userId: string) => void;
  className?: string;
};

function formatLastSeen(lastSeenAt: string | null, presence: PresenceStatus): string {
  if (presence === "ONLINE") return "Online agora";
  if (!lastSeenAt) return "Nunca conectado";

  const diff = Date.now() - new Date(lastSeenAt).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "Online agora";
  if (minutes < 60) return `Último acesso ${minutes}min atrás`;
  if (hours < 24) return `Último acesso ${hours}h atrás`;
  if (days === 1) return "Último acesso ontem";
  return `Último acesso há ${days} dias`;
}

function MemberAvatar({
  name,
  avatarUrl,
  presence,
}: {
  name: string;
  avatarUrl: string | null;
  presence: PresenceStatus;
}) {
  return (
    <div className="relative inline-flex shrink-0">
      <div className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-soft)] ring-1 ring-[var(--card-border)]">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-primary)]">
            {getInitials(name)}
          </span>
        )}
      </div>
      <span
        className={cn(
          "absolute bottom-0 right-0 block size-2.5 rounded-full border-2 border-[var(--bg-elevated)]",
          getChatPresenceDotClass(presence)
        )}
        aria-label={presence}
      />
    </div>
  );
}

function MemberRow({
  member,
  onStartDirect,
}: {
  member: Member;
  onStartDirect: (userId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group flex items-center gap-3 rounded-[18px] border border-transparent px-3 py-2 transition-all hover:border-[var(--card-border)] hover:bg-[var(--surface-soft)]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <MemberAvatar name={member.name} avatarUrl={member.avatarUrl} presence={member.presence} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{member.name}</p>
        <p className="truncate text-[11px] text-[var(--text-muted)]">
          {formatLastSeen(member.lastSeenAt, member.presence)}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onStartDirect(member.id)}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--card-border)] bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition-all hover:border-[color:color-mix(in_srgb,var(--accent)_30%,white)] hover:bg-[color:color-mix(in_srgb,var(--accent)_8%,white)] hover:text-[var(--accent-hover)] dark:bg-white/6 dark:hover:bg-white/10",
          hovered ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        aria-label={`Mensagem para ${member.name}`}
      >
        <MessageCircle size={11} />
        Mensagem
      </button>
    </div>
  );
}

function SectionBlock({
  section,
  onStartDirect,
  query,
}: {
  section: Section;
  onStartDirect: (userId: string) => void;
  query: string;
}) {
  const [open, setOpen] = useState(true);

  const filtered = query
    ? section.members.filter((m) =>
        m.name.toLowerCase().includes(query.toLowerCase())
      )
    : section.members;

  if (filtered.length === 0) return null;

  return (
    <div className="rounded-[20px] border border-[var(--card-border)] bg-[var(--bg-elevated)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {section.setor}
        </span>
        <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
          {filtered.length}
        </span>
        {open ? (
          <ChevronUp size={14} className="text-[var(--text-muted)]" />
        ) : (
          <ChevronDown size={14} className="text-[var(--text-muted)]" />
        )}
      </button>

      {open && (
        <div className="space-y-0.5 px-2 pb-2">
          {filtered.map((member) => (
            <MemberRow key={member.id} member={member} onStartDirect={onStartDirect} />
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-[18px] px-3 py-2">
      <div className="size-9 animate-pulse rounded-full bg-[var(--surface-soft)]" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-32 animate-pulse rounded-full bg-[var(--surface-soft)]" />
        <div className="h-2.5 w-20 animate-pulse rounded-full bg-[var(--surface-soft)]" />
      </div>
    </div>
  );
}

export function ChatTeamPanel({ onStartDirect, className }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/team-members");
      if (!res.ok) return;
      const data = (await res.json()) as { sections: Section[] };
      setSections(data.sections);
    } catch {
      // silently fail — stale data is fine
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMembers();
    intervalRef.current = setInterval(() => void fetchMembers(), 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMembers]);

  const totalVisible = sections.reduce((acc, s) => {
    if (!query) return acc + s.members.length;
    return (
      acc + s.members.filter((m) => m.name.toLowerCase().includes(query.toLowerCase())).length
    );
  }, 0);

  return (
    <div className={cn("flex h-full flex-col gap-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Users2 size={15} className="shrink-0 text-[var(--text-muted)]" />
        <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Equipe
        </span>
        {!loading && (
          <span className="ml-auto rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
            {totalVisible}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={13}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar membro..."
          className="w-full rounded-[18px] border border-[var(--card-border)] bg-[var(--surface-soft)] py-2 pl-8 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[color:color-mix(in_srgb,var(--accent)_40%,white)] focus:outline-none focus:ring-0"
        />
      </div>

      {/* Sections */}
      <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
        {loading ? (
          <div className="rounded-[20px] border border-[var(--card-border)] bg-[var(--bg-elevated)] px-2 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-[var(--card-border)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
            Nenhum membro encontrado.
          </div>
        ) : totalVisible === 0 ? (
          <div className="rounded-[20px] border border-dashed border-[var(--card-border)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
            Nenhum resultado para &ldquo;{query}&rdquo;.
          </div>
        ) : (
          sections.map((section) => (
            <SectionBlock
              key={section.setor}
              section={section}
              onStartDirect={onStartDirect}
              query={query}
            />
          ))
        )}
      </div>
    </div>
  );
}
