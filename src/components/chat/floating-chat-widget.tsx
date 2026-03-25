"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ExternalLink,
  MessageCircleMore,
  MessageSquare,
  MessageSquarePlus,
  Minus,
  Search,
  Users2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatConversationAvatar } from "@/components/chat/chat-conversation-avatar";
import { ChatMessageItemCard } from "@/components/chat/chat-message-item";
import { ChatTeamPanel } from "@/components/chat/chat-team-panel";
import { ChatUserPicker } from "@/components/chat/chat-user-picker";
import { UserPresenceAvatar } from "@/components/chat/user-presence-avatar";
import { useInternalChatController, type ChatCurrentUser } from "@/lib/chat/client";
import { getChatPresenceDescription } from "@/lib/chat/presence-ui";
import type { ChatConversationItem } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { useInternalChatStore } from "@/store/use-internal-chat-store";

// ─── types ────────────────────────────────────────────────────────────────────

type Props = { currentUser: ChatCurrentUser };
type ActiveTab = "conversations" | "team";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatTs(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(value)
  );
}

function sortTs(c: ChatConversationItem) {
  return new Date(c.lastMessage?.createdAt || c.updatedAt || 0).getTime();
}

function convTitle(c: ChatConversationItem) {
  return c.title || c.otherParticipant?.name || "Conversa interna";
}

function convTypeLabel(c: ChatConversationItem) {
  if (c.type === "GROUP") return c.isTeamGroup ? "Equipe" : "Grupo";
  return "Direta";
}

function convPreview(c: ChatConversationItem) {
  return (
    c.lastMessage?.text ||
    c.lastMessage?.attachments[0]?.originalName ||
    (c.type === "GROUP" ? "Canal pronto para mensagens." : "Sem mensagens ainda.")
  );
}

function convSummary(c: ChatConversationItem) {
  if (c.type === "DIRECT") {
    return getChatPresenceDescription(c.otherParticipant?.presence.computedStatus);
  }
  const online = c.participants.filter(
    (p) => p.user.presence.computedStatus === "ONLINE"
  ).length;
  if (online > 0) return `${online} online`;
  return c.isTeamGroup ? "Grupo de equipe" : `${c.participants.length} participantes`;
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.38);
  } catch {
    // audio not available
  }
}

// ─── TabButton ────────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-1.5 border-b-2 px-4 pb-2.5 pt-1 text-[13px] font-semibold transition-all",
        active
          ? "border-[var(--accent)] text-[var(--accent-hover)]"
          : "border-transparent text-text-muted hover:text-text-secondary"
      )}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--highlight))] px-1.5 py-0.5 text-[10px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

// ─── ConversationRow ──────────────────────────────────────────────────────────

function ConversationRow({
  conversation,
  onOpen,
}: {
  conversation: ChatConversationItem;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(conversation.id)}
      className="group flex w-full items-start gap-3 rounded-[22px] border border-transparent px-3.5 py-3 text-left transition-all hover:border-[color:color-mix(in_srgb,var(--accent)_16%,white)] hover:bg-[rgba(255,255,255,0.72)]"
    >
      <ChatConversationAvatar conversation={conversation} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-sm",
              conversation.unreadCount > 0 ? "font-bold text-text-primary" : "font-semibold text-text-primary"
            )}
          >
            {convTitle(conversation)}
          </p>
          <span
            className={cn(
              "shrink-0 text-[11px]",
              conversation.unreadCount > 0 ? "font-semibold text-[var(--accent-hover)]" : "text-text-muted"
            )}
          >
            {formatTs(conversation.lastMessage?.createdAt || conversation.updatedAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px]">
          <span className="shrink-0 rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 font-semibold uppercase tracking-[0.12em] text-[var(--accent-hover)]">
            {convTypeLabel(conversation)}
          </span>
          <span className="truncate text-text-muted">{convSummary(conversation)}</span>
        </div>
        <p
          className={cn(
            "mt-1 truncate text-[12px]",
            conversation.unreadCount > 0 ? "font-medium text-text-primary" : "text-text-secondary"
          )}
        >
          {convPreview(conversation)}
        </p>
      </div>
      {conversation.unreadCount > 0 && (
        <span className="mt-1 inline-flex min-w-[22px] shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--highlight))] px-1.5 py-0.5 text-[10px] font-bold text-white">
          {conversation.unreadCount}
        </span>
      )}
    </button>
  );
}

// ─── FloatingChatWidget (public export) ───────────────────────────────────────

export function FloatingChatWidget({ currentUser }: Props) {
  const pathname = usePathname();
  if (pathname === "/chat") return null;
  return <FloatingChatWidgetPanel currentUser={currentUser} />;
}

// ─── FloatingChatWidgetPanel ──────────────────────────────────────────────────

function FloatingChatWidgetPanel({ currentUser }: Props) {
  const {
    isOpen,
    selectedConversationId,
    open,
    close,
    setSelectedConversationId,
    setGlobalUnreadCount,
  } = useInternalChatStore();

  const controller = useInternalChatController({
    currentUser,
    externalSelectedConversationId: selectedConversationId,
    onSelectedConversationChange: setSelectedConversationId,
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>("conversations");
  const [query, setQuery] = useState("");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const prevUnreadRef = useRef<number | null>(null);

  const selectedConversation = controller.selectedConversation;
  const isInThread = !!selectedConversation;

  // Sync global unread count → Zustand (sidebar badge)
  useEffect(() => {
    setGlobalUnreadCount(controller.globalUnreadCount);
  }, [controller.globalUnreadCount, setGlobalUnreadCount]);

  // Notification sound
  useEffect(() => {
    const cur = controller.globalUnreadCount;
    if (prevUnreadRef.current === null) {
      prevUnreadRef.current = cur;
      return;
    }
    if (cur > prevUnreadRef.current) playNotificationSound();
    prevUnreadRef.current = cur;
  }, [controller.globalUnreadCount]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!isOpen) return;
    const vp = messagesViewportRef.current;
    if (!vp) return;
    vp.scrollTo({ top: vp.scrollHeight, behavior: "smooth" });
  }, [controller.messages, controller.selectedConversationId, isOpen]);

  // When starting a direct from team panel → switch to conversations tab + open thread
  const handleStartDirect = (userId: string) => {
    void controller.createDirectConversation(userId);
    setActiveTab("conversations");
  };

  // TRUE back button — clears selection to return to list
  const handleBack = () => {
    setSelectedConversationId(null);
  };

  const filteredConversations = useMemo(() => {
    const term = query.trim().toLowerCase();
    return controller.conversations
      .filter((c) => {
        if (!term) return true;
        return [
          convTitle(c),
          convPreview(c),
          c.description ?? "",
          c.otherParticipant?.email ?? "",
          c.participants.map((p) => p.user.name).join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => {
        if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
        return sortTs(b) - sortTs(a);
      });
  }, [controller.conversations, query]);

  const typingLabel = useMemo(() => {
    if (!controller.typingUserId || !selectedConversation) return null;
    if (selectedConversation.type === "DIRECT") {
      return selectedConversation.otherParticipant?.name || "Usuário";
    }
    return (
      selectedConversation.participants.find((p) => p.userId === controller.typingUserId)?.user
        .name || "Alguém do grupo"
    );
  }, [controller.typingUserId, selectedConversation]);

  return (
    <>
      <style jsx global>{`
        @keyframes floatingChatPanelIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      {/* ── Open panel ──────────────────────────────────────────────────────── */}
      {isOpen && (
        <section
          className="dashboard-content-frame fixed bottom-4 right-4 z-[140] flex h-[min(78vh,700px)] w-[min(calc(100vw-1.5rem),476px)] flex-col overflow-hidden rounded-[30px] border border-[color:color-mix(in_srgb,var(--card-border)_84%,white)] bg-[radial-gradient(240px_240px_at_bottom_right,rgba(198,156,120,0.12),transparent_72%),linear-gradient(180deg,rgba(255,252,249,0.94),rgba(247,240,233,0.86))] shadow-[0_24px_56px_color-mix(in_srgb,var(--shadow-color)_18%,transparent)] backdrop-blur-[30px]"
          style={{ animation: "floatingChatPanelIn .18s ease-out" }}
        >
          {/* Gradient accent bar */}
          <div className="h-1.5 shrink-0 bg-[linear-gradient(90deg,#d29f68_0%,#93bfaa_45%,#ca8d60_100%)]" />

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <header className="flex shrink-0 items-center gap-2.5 border-b border-[var(--border-color)] bg-[rgba(255,255,255,0.52)] px-4 py-3 backdrop-blur-sm">
            {isInThread ? (
              <>
                {/* Back button — true navigation back to list */}
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-elevated)] text-text-secondary transition-all hover:border-[color:color-mix(in_srgb,var(--accent)_30%,white)] hover:text-[var(--accent-hover)]"
                  title="Voltar para conversas"
                >
                  <ChevronLeft size={16} />
                </button>

                <ChatConversationAvatar conversation={selectedConversation} size="sm" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {convTitle(selectedConversation)}
                    </p>
                    <span className="shrink-0 rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-hover)]">
                      {convTypeLabel(selectedConversation)}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-text-muted">
                    {controller.realtimeWarning || convSummary(selectedConversation)}
                  </p>
                </div>
              </>
            ) : (
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                  Inbox interna
                </p>
                <p className="truncate text-sm font-semibold text-text-primary">
                  Conversas da equipe
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {!isInThread && (
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="flex size-9 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-elevated)] text-text-secondary transition-all hover:border-[color:color-mix(in_srgb,var(--accent)_30%,white)] hover:text-[var(--accent-hover)]"
                  title="Nova conversa"
                >
                  <MessageSquarePlus size={15} />
                </button>
              )}
              <Link href="/chat">
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-elevated)] text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
                  title="Abrir chat completo"
                >
                  <ExternalLink size={15} />
                </button>
              </Link>
              <button
                type="button"
                onClick={close}
                className="flex size-9 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-elevated)] text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
                title="Minimizar"
              >
                <Minus size={15} />
              </button>
            </div>
          </header>

          {/* ── Tab bar — visible only on list/team views ────────────────────── */}
          {!isInThread && (
            <div className="flex shrink-0 gap-0 border-b border-[var(--border-color)] bg-[rgba(255,255,255,0.38)] px-5 backdrop-blur-sm">
              <TabButton
                active={activeTab === "conversations"}
                onClick={() => setActiveTab("conversations")}
                icon={<MessageSquare size={13} />}
                label="Conversas"
                badge={controller.globalUnreadCount > 0 ? controller.globalUnreadCount : undefined}
              />
              <TabButton
                active={activeTab === "team"}
                onClick={() => setActiveTab("team")}
                icon={<Users2 size={13} />}
                label="Equipe"
              />
            </div>
          )}

          {/* ── Content area ─────────────────────────────────────────────────── */}
          <div className="min-h-0 flex-1 overflow-hidden">
            {isInThread ? (
              /* ── Thread view ── */
              <div className="flex h-full flex-col px-3.5 py-3">
                {/* Group participants strip */}
                {selectedConversation.type === "GROUP" && (
                  <div className="mb-2.5 flex flex-wrap gap-2">
                    {selectedConversation.participants.slice(0, 5).map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--card-border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] text-text-primary"
                      >
                        <UserPresenceAvatar
                          name={p.user.name}
                          avatarUrl={p.user.avatarUrl}
                          status={p.user.presence.computedStatus}
                          size="sm"
                        />
                        <span className="max-w-[100px] truncate">{p.user.name}</span>
                      </span>
                    ))}
                    {selectedConversation.participants.length > 5 && (
                      <span className="inline-flex items-center rounded-full border border-[var(--card-border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] text-text-muted">
                        +{selectedConversation.participants.length - 5}
                      </span>
                    )}
                  </div>
                )}

                {/* Messages */}
                <div
                  ref={messagesViewportRef}
                  className="flex-1 space-y-3 overflow-y-auto rounded-[26px] bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(248,242,236,0.20))] px-2 py-2"
                >
                  {controller.messages.map((message) => (
                    <ChatMessageItemCard
                      key={message.id}
                      currentUserId={currentUser.id}
                      message={message}
                      showSender={selectedConversation.type === "GROUP"}
                      onDelete={controller.deleteMessage}
                    />
                  ))}

                  {!controller.messages.length && !controller.isMessagesLoading && (
                    <div className="rounded-[22px] border border-dashed border-[var(--border-color)] bg-[var(--surface-soft)] px-4 py-8 text-center text-sm text-text-muted">
                      Esse canal ainda não recebeu mensagens.
                    </div>
                  )}
                </div>

                {/* Typing indicator */}
                {typingLabel && (
                  <p className="px-1 pb-1 pt-2 text-[11px] text-text-muted">
                    {typingLabel} está digitando...
                  </p>
                )}

                {/* Composer */}
                <div className="mt-2 rounded-[24px] border border-[var(--card-border)] bg-[rgba(255,255,255,0.62)] p-2.5">
                  <ChatComposer
                    disabled={controller.isMutating}
                    onSendText={controller.sendTextMessage}
                    onSendAttachment={controller.sendAttachmentMessage}
                    onUploadAttachment={controller.uploadAttachment}
                    onTypingChange={controller.emitTyping}
                    onError={controller.setError}
                  />
                </div>
              </div>
            ) : activeTab === "conversations" ? (
              /* ── Conversation list ── */
              <div className="flex h-full flex-col gap-3 px-4 py-3">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Não lidas", value: controller.globalUnreadCount },
                    {
                      label: "Diretas",
                      value: controller.conversations.filter((c) => c.type === "DIRECT").length,
                    },
                    {
                      label: "Grupos",
                      value: controller.conversations.filter((c) => c.type === "GROUP").length,
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-[18px] border border-[var(--card-border)] bg-[rgba(255,255,255,0.56)] px-3 py-2.5"
                    >
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                        {label}
                      </p>
                      <p className="mt-1 text-base font-bold text-text-primary">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nome, grupo ou mensagem..."
                    className="w-full rounded-[18px] border border-[var(--card-border)] bg-[rgba(255,255,255,0.62)] py-2 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-[color:color-mix(in_srgb,var(--accent)_40%,white)] focus:outline-none"
                  />
                </div>

                {/* Realtime warning */}
                {controller.realtimeWarning && (
                  <div className="rounded-[14px] border border-amber-300/30 bg-[color:color-mix(in_srgb,var(--warning)_8%,white)] px-3 py-2 text-xs font-medium text-[color:#9a5b18]">
                    {controller.realtimeWarning}
                  </div>
                )}

                {/* Conversation list */}
                <div className="flex-1 space-y-1 overflow-y-auto pr-0.5">
                  {filteredConversations.map((c) => (
                    <ConversationRow key={c.id} conversation={c} onOpen={open} />
                  ))}

                  {!filteredConversations.length && (
                    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--border-color)] bg-[rgba(255,255,255,0.42)] px-6 py-8 text-center">
                      <p className="text-sm font-medium text-text-secondary">
                        Nenhuma conversa encontrada.
                      </p>
                      <p className="mt-1.5 max-w-[220px] text-xs leading-5 text-text-muted">
                        Inicie uma conversa direta ou crie um grupo.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsPickerOpen(true)}
                        className="mt-4 rounded-full border border-[var(--card-border)] bg-[var(--bg-elevated)] px-4 py-2 text-xs font-semibold text-[var(--accent-hover)] transition-colors hover:border-border-hover"
                      >
                        Nova conversa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ── Team panel ── */
              <div className="h-full overflow-y-auto p-4">
                <ChatTeamPanel
                  currentUserId={currentUser.id}
                  onStartDirect={handleStartDirect}
                />
              </div>
            )}
          </div>

          {/* Error bar */}
          {controller.error && (
            <div className="shrink-0 border-t border-amber-300/20 bg-[linear-gradient(90deg,rgba(202,109,12,0.10),rgba(164,112,63,0.08))] px-4 py-3 text-sm text-[color:#9a5b18]">
              {controller.error}
            </div>
          )}
        </section>
      )}

      {/* ── Floating button (closed state) ──────────────────────────────────── */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => open()}
          className="fixed bottom-4 right-4 z-[130] flex h-16 min-w-16 items-center justify-center rounded-full bg-accent px-5 text-white shadow-[0_24px_60px_color-mix(in_srgb,var(--accent)_34%,transparent)] transition-transform duration-200 hover:-translate-y-[2px]"
          aria-label="Abrir chat interno"
        >
          <MessageCircleMore size={22} />
          {controller.globalUnreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-60" />
              <span className="relative inline-flex min-w-[22px] items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[11px] font-bold text-white">
                {controller.globalUnreadCount > 99 ? "99+" : controller.globalUnreadCount}
              </span>
            </span>
          )}
        </button>
      )}

      {/* ── User / group picker ──────────────────────────────────────────────── */}
      <ChatUserPicker
        isOpen={isPickerOpen}
        users={controller.users}
        isSubmitting={controller.isMutating}
        onClose={() => setIsPickerOpen(false)}
        onCreateDirect={(userId) => controller.createDirectConversation(userId)}
        onCreateGroup={(input) => controller.createGroupConversation(input)}
      />
    </>
  );
}
