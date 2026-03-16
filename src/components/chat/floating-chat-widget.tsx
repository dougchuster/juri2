"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ExternalLink,
  MessageCircleMore,
  MessageSquarePlus,
  Minus,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatConversationAvatar } from "@/components/chat/chat-conversation-avatar";
import { ChatMessageItemCard } from "@/components/chat/chat-message-item";
import { ChatUserPicker } from "@/components/chat/chat-user-picker";
import { UserPresenceAvatar } from "@/components/chat/user-presence-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-fields";
import { useInternalChatController, type ChatCurrentUser } from "@/lib/chat/client";
import { getChatPresenceDescription } from "@/lib/chat/presence-ui";
import type { ChatConversationItem } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { useInternalChatStore } from "@/store/use-internal-chat-store";

type Props = {
  currentUser: ChatCurrentUser;
};

type ConversationFilter = "all" | "direct" | "group";

function formatConversationTimestamp(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getConversationSortTimestamp(conversation: ChatConversationItem) {
  return new Date(conversation.lastMessage?.createdAt || conversation.updatedAt || 0).getTime();
}

function getConversationTitle(conversation: ChatConversationItem) {
  return conversation.title || conversation.otherParticipant?.name || "Conversa interna";
}

function getConversationTypeLabel(conversation: ChatConversationItem) {
  if (conversation.type === "GROUP") {
    return conversation.isTeamGroup ? "Equipe" : "Grupo";
  }

  return "Direta";
}

function getConversationPreview(conversation: ChatConversationItem) {
  return (
    conversation.lastMessage?.text ||
    conversation.lastMessage?.attachments[0]?.originalName ||
    (conversation.type === "GROUP" ? "Canal pronto para mensagens da equipe." : "Sem mensagens ainda.")
  );
}

function getConversationSummary(conversation: ChatConversationItem) {
  if (conversation.type === "DIRECT") {
    return getChatPresenceDescription(conversation.otherParticipant?.presence.computedStatus);
  }

  const onlineCount = conversation.participants.filter(
    (participant) => participant.user.presence.computedStatus === "ONLINE"
  ).length;
  if (onlineCount > 0) {
    return `${onlineCount} online`;
  }
  return conversation.isTeamGroup ? "Grupo de equipe" : `${conversation.participants.length} participantes`;
}

type ConversationSwitcherSectionProps = {
  emptyLabel: string;
  items: ChatConversationItem[];
  onSelect: (conversationId: string) => void;
  selectedConversationId: string;
  title: string;
};

function ConversationSwitcherSection({
  emptyLabel,
  items,
  onSelect,
  selectedConversationId,
  title,
}: ConversationSwitcherSectionProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">{title}</span>
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
            {items.length}
          </span>
        </div>
        <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(207,193,177,0.85),transparent)]" />
      </div>

      {items.length ? (
        <div className="space-y-1.5">
          {items.map((conversation) => {
            const isActive = conversation.id === selectedConversationId;

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelect(conversation.id)}
                className={cn(
                  "group relative w-full overflow-hidden rounded-[20px] border px-3 py-2.5 text-left transition-all duration-200",
                  isActive
                    ? "border-[color:color-mix(in_srgb,var(--accent)_22%,white)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_11%,white),rgba(255,255,255,0.94))] shadow-[0_14px_26px_color-mix(in_srgb,var(--accent)_10%,transparent)]"
                    : "border-transparent bg-[rgba(255,255,255,0.62)] hover:border-[color:color-mix(in_srgb,var(--accent)_12%,white)] hover:bg-[rgba(255,255,255,0.82)]"
                )}
              >
                {isActive ? (
                  <span className="absolute inset-y-2 left-1 w-1 rounded-full bg-[linear-gradient(180deg,var(--accent),var(--highlight))]" />
                ) : null}

                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <ChatConversationAvatar conversation={conversation} size="sm" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-text-primary">
                          {getConversationTitle(conversation)}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-text-muted">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 font-semibold uppercase tracking-[0.14em]",
                              isActive
                                ? "bg-[color:color-mix(in_srgb,var(--accent)_18%,white)] text-[var(--accent-hover)]"
                                : "bg-[var(--surface-soft)] text-text-secondary"
                            )}
                          >
                            {getConversationTypeLabel(conversation)}
                          </span>
                          <span className="truncate">{getConversationSummary(conversation)}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span
                          className={cn(
                            "text-[11px] font-medium",
                            conversation.unreadCount > 0 ? "text-[var(--accent-hover)]" : "text-text-muted"
                          )}
                        >
                          {formatConversationTimestamp(
                            conversation.lastMessage?.createdAt || conversation.updatedAt
                          )}
                        </span>
                        {conversation.unreadCount > 0 ? (
                          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--highlight))] px-2 py-0.5 text-[10px] font-semibold text-white">
                            {conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <p
                      className={cn(
                        "mt-1.5 truncate text-[12px]",
                        isActive
                          ? "text-text-primary"
                          : conversation.unreadCount > 0
                            ? "font-medium text-text-primary"
                            : "text-text-secondary"
                      )}
                    >
                      {getConversationPreview(conversation)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[18px] border border-dashed border-[var(--border-color)] bg-[rgba(255,255,255,0.56)] px-4 py-5 text-sm text-text-muted">
          {emptyLabel}
        </div>
      )}
    </section>
  );
}

export function FloatingChatWidget({ currentUser }: Props) {
  const pathname = usePathname();
  if (pathname === "/chat") {
    return null;
  }

  return <FloatingChatWidgetPanel currentUser={currentUser} />;
}

function FloatingChatWidgetPanel({ currentUser }: Props) {
  const { isOpen, selectedConversationId, open, close, setSelectedConversationId } = useInternalChatStore();
  const controller = useInternalChatController({
    currentUser,
    externalSelectedConversationId: selectedConversationId,
    onSelectedConversationChange: setSelectedConversationId,
  });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isConversationSwitcherOpen, setIsConversationSwitcherOpen] = useState(false);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);

  const selectedConversation = controller.selectedConversation;

  const filteredConversations = useMemo(() => {
    const term = query.trim().toLowerCase();
    return controller.conversations.filter((conversation) => {
      if (filter === "direct" && conversation.type !== "DIRECT") return false;
      if (filter === "group" && conversation.type !== "GROUP") return false;

      if (!term) return true;

      const haystack = [
        getConversationTitle(conversation),
        getConversationPreview(conversation),
        conversation.description || "",
        conversation.otherParticipant?.email || "",
        conversation.participants.map((participant) => participant.user.name).join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [controller.conversations, filter, query]);

  const typingLabel = useMemo(() => {
    if (!controller.typingUserId || !selectedConversation) return null;

    if (selectedConversation.type === "DIRECT") {
      return selectedConversation.otherParticipant?.name || "Usuario";
    }

    return (
      selectedConversation.participants.find(
        (participant) => participant.userId === controller.typingUserId
      )?.user.name || "Alguem do grupo"
    );
  }, [controller.typingUserId, selectedConversation]);

  useEffect(() => {
    if (!isOpen) return;
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [controller.messages, controller.selectedConversationId, isOpen]);

  const switcherConversations = useMemo(() => {
    const term = query.trim().toLowerCase();
    return controller.conversations
      .filter((conversation) => {
        if (!term) return true;
        return [
          getConversationTitle(conversation),
          getConversationPreview(conversation),
          conversation.description || "",
          conversation.otherParticipant?.email || "",
          conversation.participants.map((participant) => participant.user.name).join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((left, right) => {
        if (right.unreadCount !== left.unreadCount) {
          return right.unreadCount - left.unreadCount;
        }

        return getConversationSortTimestamp(right) - getConversationSortTimestamp(left);
      });
  }, [controller.conversations, query]);

  const switcherDirectConversations = useMemo(
    () => switcherConversations.filter((conversation) => conversation.type === "DIRECT"),
    [switcherConversations]
  );

  const switcherGroupConversations = useMemo(
    () => switcherConversations.filter((conversation) => conversation.type === "GROUP"),
    [switcherConversations]
  );

  const switcherUnreadConversations = useMemo(
    () => switcherConversations.filter((conversation) => conversation.unreadCount > 0),
    [switcherConversations]
  );

  const switcherRecentConversations = useMemo(() => {
    const unreadIds = new Set(switcherUnreadConversations.map((conversation) => conversation.id));
    const recent = switcherConversations.filter(
      (conversation) => conversation.id !== selectedConversation?.id && !unreadIds.has(conversation.id)
    );
    return recent.slice(0, 4);
  }, [selectedConversation?.id, switcherConversations, switcherUnreadConversations]);

  const topActionButtonClass =
    "size-10 rounded-full border border-[color:color-mix(in_srgb,var(--card-border)_72%,white)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,240,233,0.88))] p-0 shadow-[0_10px_22px_color-mix(in_srgb,var(--shadow-color)_10%,transparent)] hover:border-border-hover hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,241,234,0.94))]";

  return (
    <>
      <style jsx global>{`
        @keyframes floatingChatPanelIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {isOpen ? (
        <section
          className="dashboard-content-frame fixed bottom-4 right-4 z-[140] flex h-[min(78vh,700px)] w-[min(calc(100vw-1.5rem),476px)] flex-col overflow-hidden rounded-[30px] border border-[color:color-mix(in_srgb,var(--card-border)_84%,white)] bg-[radial-gradient(240px_240px_at_bottom_right,rgba(198,156,120,0.12),transparent_72%),linear-gradient(180deg,rgba(255,252,249,0.94),rgba(247,240,233,0.86))] shadow-[0_24px_56px_color-mix(in_srgb,var(--shadow-color)_18%,transparent)] backdrop-blur-[30px]"
          style={{ position: "fixed" }}
        >
          <div className="h-1.5 bg-[linear-gradient(90deg,#d29f68_0%,#93bfaa_45%,#ca8d60_100%)]" />

          {!selectedConversation ? (
            <header className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] px-5 py-4">
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                  Inbox interna
                </p>
                <h2 className="truncate text-lg font-semibold text-text-primary">Conversas da equipe</h2>
                <p className="truncate text-xs text-text-secondary">
                  {`${controller.conversations.length} conversas prontas para resposta`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsPickerOpen(true)}
                  className={topActionButtonClass}
                  title="Nova conversa"
                >
                  <MessageSquarePlus size={16} className="text-[var(--accent-hover)]" />
                </Button>
                <Link href="/chat">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className={topActionButtonClass}
                    title="Abrir chat completo"
                  >
                    <ExternalLink size={16} className="text-[color:#8f6947]" />
                  </Button>
                </Link>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => close()}
                  title="Minimizar chat"
                  className={topActionButtonClass}
                >
                  <Minus size={16} className="text-text-secondary" />
                </Button>
              </div>
            </header>
          ) : null}

          {!selectedConversation ? (
            <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="surface-soft rounded-[22px] px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Nao lidas
                  </p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">{controller.globalUnreadCount}</p>
                </div>
                <div className="surface-soft rounded-[22px] px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Diretas
                  </p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">
                    {controller.conversations.filter((conversation) => conversation.type === "DIRECT").length}
                  </p>
                </div>
                <div className="surface-soft rounded-[22px] px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Grupos
                  </p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">
                    {controller.conversations.filter((conversation) => conversation.type === "GROUP").length}
                  </p>
                </div>
              </div>

              <div className="relative mt-4">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por pessoa, grupo ou mensagem..."
                  className="pl-11"
                />
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {[
                  { id: "all", label: "Todas" },
                  { id: "direct", label: "Diretas" },
                  { id: "group", label: "Grupos" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFilter(option.id as ConversationFilter)}
                    className={cn(
                      "rounded-full border px-3 py-2 text-xs font-semibold transition-all",
                      filter === option.id
                        ? "border-[color:color-mix(in_srgb,var(--accent)_30%,white)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_14%,white),rgba(255,255,255,0.92))] text-[var(--accent-hover)] shadow-[0_12px_24px_color-mix(in_srgb,var(--accent)_12%,transparent)]"
                        : "border-[var(--card-border)] bg-[var(--surface-soft)] text-text-secondary hover:border-border-hover"
                    )}
                  >
                    {option.label}
                  </button>
                ))}

                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void controller.refreshConversations()}
                  className="ml-auto rounded-full"
                >
                  <RefreshCw size={14} />
                </Button>
              </div>

              {controller.realtimeWarning ? (
                <div className="mt-3 rounded-[18px] border border-amber-300/30 bg-[color:color-mix(in_srgb,var(--warning)_8%,white)] px-4 py-2 text-xs font-medium text-[color:#9a5b18]">
                  {controller.realtimeWarning}
                </div>
              ) : null}

              <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => open(conversation.id)}
                    className="surface-soft flex w-full items-start gap-3 rounded-[22px] border border-transparent px-3.5 py-3 text-left transition-all hover:-translate-y-[1px] hover:border-[color:color-mix(in_srgb,var(--accent)_16%,white)]"
                  >
                    <ChatConversationAvatar conversation={conversation} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-text-primary">
                          {getConversationTitle(conversation)}
                        </p>
                        <span className="text-[11px] text-text-muted">
                          {formatConversationTimestamp(
                            conversation.lastMessage?.createdAt || conversation.updatedAt
                          )}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-text-muted">
                        <span className="rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 font-semibold text-[var(--accent-hover)]">
                          {conversation.type === "GROUP"
                            ? conversation.isTeamGroup
                              ? "Equipe"
                              : "Grupo"
                            : "Direto"}
                        </span>
                        <span className="truncate normal-case tracking-normal">
                          {getConversationSummary(conversation)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[13px] text-text-secondary">
                        {getConversationPreview(conversation)}
                      </p>
                    </div>
                    {conversation.unreadCount > 0 ? (
                      <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--highlight))] px-2 py-1 text-[11px] font-semibold text-white">
                        {conversation.unreadCount}
                      </span>
                    ) : null}
                  </button>
                ))}

                {!filteredConversations.length ? (
                  <div className="surface-soft flex min-h-[214px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--border-color)] px-6 py-10 text-center">
                    <p className="text-base font-medium text-text-secondary">Nenhuma conversa encontrada.</p>
                    <p className="mt-2 max-w-[240px] text-sm leading-6 text-text-muted">
                      Inicie uma conversa direta ou crie um grupo para começar a trocar mensagens.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(true)}
                      className="mt-5 rounded-full border border-[var(--card-border)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--accent-hover)] transition-colors hover:border-border-hover"
                    >
                      Nova conversa
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col px-3.5 py-3.5">
              <div className="surface-soft rounded-[24px] px-4 py-3 shadow-[0_14px_28px_color-mix(in_srgb,var(--shadow-color)_10%,transparent)]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setIsConversationSwitcherOpen(true);
                    }}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-elevated)] text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
                    title="Voltar para conversas"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <ChatConversationAvatar conversation={selectedConversation} size="sm" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {getConversationTitle(selectedConversation)}
                      </p>
                      <span className="shrink-0 rounded-full bg-[color:rgba(210,189,170,0.42)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-hover)]">
                        {selectedConversation.type === "GROUP"
                          ? selectedConversation.isTeamGroup
                            ? "Equipe"
                            : "Grupo"
                          : "Direto"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-text-secondary">
                      {controller.realtimeWarning ||
                        selectedConversation.description?.trim() ||
                        getConversationSummary(selectedConversation)}
                    </p>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <Link
                      href="/chat"
                      className="hidden rounded-full border border-[var(--card-border)] bg-[var(--bg-elevated)] px-5 py-3 text-[13px] font-medium text-text-primary transition-colors hover:border-border-hover sm:inline-flex"
                    >
                      Abrir tela completa
                    </Link>
                    <button
                      type="button"
                      onClick={() => close()}
                      className="hidden size-11 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-elevated)] text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary sm:inline-flex"
                      title="Minimizar chat"
                    >
                      <Minus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {selectedConversation.type === "GROUP" ? (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {selectedConversation.participants.slice(0, 5).map((participant) => (
                    <span
                      key={participant.id}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs text-text-primary"
                    >
                      <UserPresenceAvatar
                        name={participant.user.name}
                        avatarUrl={participant.user.avatarUrl}
                        status={participant.user.presence.computedStatus}
                        size="sm"
                      />
                      <span className="max-w-[110px] truncate">{participant.user.name}</span>
                    </span>
                  ))}
                  {selectedConversation.participants.length > 5 ? (
                    <span className="inline-flex items-center rounded-full border border-[var(--card-border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs text-text-muted">
                      +{selectedConversation.participants.length - 5}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {isConversationSwitcherOpen ? (
                <div className="mt-3 flex min-h-0 flex-1 animate-[floatingChatPanelIn_.18s_ease-out] overflow-hidden rounded-[26px] border border-[var(--card-border)] bg-[radial-gradient(220px_220px_at_top_right,rgba(201,166,133,0.12),transparent_72%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,242,236,0.94))]">
                  <div className="flex min-h-0 w-full flex-col">
                    <div className="border-b border-[var(--border-color)] bg-[rgba(255,255,255,0.36)] px-4 py-3 backdrop-blur-[10px]">
                      <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                          Conversas
                        </p>
                        <p className="mt-1 text-sm font-semibold text-text-primary">
                          Troca rapida de atendimento
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {`${switcherConversations.length} resultado${switcherConversations.length === 1 ? "" : "s"} entre diretas e grupos`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsConversationSwitcherOpen(false)}
                        className="rounded-full border border-[var(--card-border)] bg-[rgba(255,255,255,0.72)] px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
                      >
                        Fechar
                      </button>
                    </div>

                    <div className="relative mt-3">
                      <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar por nome, grupo ou mensagem..."
                        className="pl-11"
                      />
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-text-secondary">
                      <span className="inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--accent)_22%,white)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_10%,white),rgba(255,255,255,0.92))] px-3 py-1.5 text-[11px] font-medium text-[var(--accent-hover)]">
                        <span className="size-2 rounded-full bg-[var(--accent)]" />
                        {switcherUnreadConversations.length} nao lidas
                      </span>
                      <span>{switcherDirectConversations.length} pessoais</span>
                      <span>{switcherGroupConversations.length} grupos</span>
                    </div>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
                      {switcherUnreadConversations.length ? (
                        <ConversationSwitcherSection
                          title="Nao lidas"
                          items={switcherUnreadConversations}
                          selectedConversationId={selectedConversation.id}
                          emptyLabel="Nenhuma conversa nao lida."
                          onSelect={(conversationId) => {
                            setIsConversationSwitcherOpen(false);
                            open(conversationId);
                          }}
                        />
                      ) : null}

                    {switcherRecentConversations.length ? (
                      <section className="space-y-2">
                        <div className="flex items-center justify-between gap-3 px-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                              Recentes
                            </span>
                            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                              {switcherRecentConversations.length}
                            </span>
                          </div>
                          <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(207,193,177,0.85),transparent)]" />
                        </div>

                        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
                          {switcherRecentConversations.map((conversation) => (
                            <button
                              key={conversation.id}
                              type="button"
                              onClick={() => {
                                setIsConversationSwitcherOpen(false);
                                open(conversation.id);
                              }}
                              className="min-w-[150px] snap-start rounded-[20px] border border-[color:color-mix(in_srgb,var(--accent)_12%,white)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,242,236,0.92))] px-3 py-3 text-left shadow-[0_10px_24px_color-mix(in_srgb,var(--shadow-color)_8%,transparent)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[color:color-mix(in_srgb,var(--accent)_22%,white)]"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <ChatConversationAvatar conversation={conversation} size="sm" />
                                <span className="text-[11px] font-medium text-text-muted">
                                  {formatConversationTimestamp(
                                    conversation.lastMessage?.createdAt || conversation.updatedAt
                                  )}
                                </span>
                              </div>
                              <p className="mt-2 truncate text-sm font-semibold text-text-primary">
                                {getConversationTitle(conversation)}
                              </p>
                              <p className="mt-1 truncate text-[12px] text-text-secondary">
                                {getConversationPreview(conversation)}
                              </p>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <span
                                  className={cn(
                                    "truncate text-[11px]",
                                    conversation.unreadCount > 0 ? "text-text-primary" : "text-text-muted"
                                  )}
                                >
                                  {getConversationTypeLabel(conversation)} / {getConversationSummary(conversation)}
                                </span>
                                {conversation.unreadCount > 0 ? (
                                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--highlight))] px-2 py-0.5 text-[10px] font-semibold text-white">
                                    {conversation.unreadCount}
                                  </span>
                                ) : null}
                              </div>
                            </button>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    <ConversationSwitcherSection
                      title="Conversas pessoais"
                      items={switcherDirectConversations}
                      selectedConversationId={selectedConversation.id}
                      emptyLabel="Nenhuma conversa pessoal encontrada."
                      onSelect={(conversationId) => {
                        setIsConversationSwitcherOpen(false);
                        open(conversationId);
                      }}
                    />

                      <ConversationSwitcherSection
                        title="Grupos"
                        items={switcherGroupConversations}
                        selectedConversationId={selectedConversation.id}
                        emptyLabel="Nenhum grupo encontrado."
                        onSelect={(conversationId) => {
                          setIsConversationSwitcherOpen(false);
                          open(conversationId);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    ref={messagesViewportRef}
                    className="mt-3 flex-1 animate-[floatingChatPanelIn_.18s_ease-out] space-y-3 overflow-y-auto rounded-[26px] bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(248,242,236,0.20))] px-2 py-2"
                  >
                    {controller.messages.map((message) => (
                      <ChatMessageItemCard
                        key={message.id}
                        currentUserId={currentUser.id}
                        message={message}
                        showSender={selectedConversation.type === "GROUP"}
                      />
                    ))}

                    {!controller.messages.length && !controller.isMessagesLoading ? (
                      <div className="rounded-[22px] border border-dashed border-[var(--border-color)] bg-[var(--surface-soft)] px-4 py-8 text-center text-sm text-text-muted">
                        Esse canal ainda nao recebeu mensagens.
                      </div>
                    ) : null}
                  </div>

                  {typingLabel ? (
                    <div className="pb-1 pt-2 text-xs text-text-muted">
                      {typingLabel} esta digitando...
                    </div>
                  ) : null}

                  <div className="mt-2 border-t border-[var(--border-color)] px-2 pt-2 text-right text-[12px] text-text-muted">
                    {selectedConversation.lastMessage?.createdAt
                      ? `Ultima atividade ${formatConversationTimestamp(selectedConversation.lastMessage.createdAt)}`
                      : "Ultima atividade agora"}
                  </div>

                  <div className="surface-soft mt-2 rounded-[24px] p-2.5">
                    <ChatComposer
                      disabled={controller.isMutating}
                      onSendText={controller.sendTextMessage}
                      onSendAttachment={controller.sendAttachmentMessage}
                      onUploadAttachment={controller.uploadAttachment}
                      onTypingChange={controller.emitTyping}
                      onError={controller.setError}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {controller.error ? (
            <div className="border-t border-amber-300/20 bg-[linear-gradient(90deg,rgba(202,109,12,0.10),rgba(164,112,63,0.08))] px-4 py-3 text-sm text-[color:#9a5b18]">
              {controller.error}
            </div>
          ) : null}
        </section>
      ) : null}

      {!isOpen ? (
        <button
          type="button"
          onClick={() => open()}
          className="fixed bottom-4 right-4 z-[130] flex h-16 min-w-16 items-center justify-center rounded-full bg-accent px-5 text-white shadow-[0_24px_60px_color-mix(in_srgb,var(--accent)_34%,transparent)] transition-transform duration-200 hover:-translate-y-[2px]"
          aria-label="Abrir chat interno"
        >
          <MessageCircleMore size={22} />
          {controller.globalUnreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-6 items-center justify-center rounded-full bg-danger px-1.5 py-1 text-[11px] font-bold text-white">
              {controller.globalUnreadCount > 99 ? "99+" : controller.globalUnreadCount}
            </span>
          ) : null}
        </button>
      ) : null}

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
