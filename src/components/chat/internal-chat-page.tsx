"use client";

import {
  ChevronLeft,
  Inbox,
  MessageSquarePlus,
  Search,
  UsersRound,
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
import type { ChatConversationItem, ChatMessageItem } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

type Props = {
  currentUser: ChatCurrentUser;
  compact?: boolean;
  externalSelectedConversationId?: string | null;
  onSelectedConversationChange?: (conversationId: string | null) => void;
  "data-page-chat"?: boolean;
};

type ConversationFilter = "all" | "direct" | "group" | "unread";

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
  }).format(new Date(value));
}

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

function getConversationPreview(conversation: ChatConversationItem) {
  return (
    conversation.lastMessage?.text ||
    conversation.lastMessage?.attachments[0]?.originalName ||
    (conversation.type === "GROUP"
      ? "Canal pronto para mensagens da equipe."
      : "Abra a conversa para enviar a primeira mensagem.")
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
    return `${onlineCount} online agora`;
  }

  const participantCount = conversation.participants.length;
  if (participantCount === 0) {
    return "Grupo interno";
  }
  if (participantCount === 1) {
    return "1 participante";
  }
  return `${participantCount} participantes`;
}

function getConversationBadge(conversation: ChatConversationItem) {
  if (conversation.type === "DIRECT") {
    return "Direto";
  }
  return conversation.isTeamGroup ? "Equipe" : "Grupo";
}

export function InternalChatPage({
  currentUser,
  compact = false,
  externalSelectedConversationId,
  onSelectedConversationChange,
  ...rest
}: Props) {
  const controller = useInternalChatController({
    currentUser,
    externalSelectedConversationId,
    onSelectedConversationChange,
  });
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);

  const groupedMessages = useMemo(() => {
    const map = new Map<string, ChatMessageItem[]>();
    for (const message of controller.messages) {
      const key = new Date(message.createdAt).toDateString();
      const current = map.get(key) || [];
      current.push(message);
      map.set(key, current);
    }
    return Array.from(map.entries());
  }, [controller.messages]);

  const filteredConversations = useMemo(() => {
    const term = query.trim().toLowerCase();
    return controller.conversations
      .filter((conversation) => {
        if (filter === "direct" && conversation.type !== "DIRECT") return false;
        if (filter === "group" && conversation.type !== "GROUP") return false;
        if (filter === "unread" && conversation.unreadCount === 0) return false;

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
      })
      .sort((left, right) => {
        if (right.unreadCount !== left.unreadCount) {
          return right.unreadCount - left.unreadCount;
        }

        return getConversationSortTimestamp(right) - getConversationSortTimestamp(left);
      });
  }, [controller.conversations, filter, query]);

  const groupCount = useMemo(
    () => controller.conversations.filter((conversation) => conversation.type === "GROUP").length,
    [controller.conversations]
  );

  const typingLabel = useMemo(() => {
    if (!controller.typingUserId || !controller.selectedConversation) return null;

    if (controller.selectedConversation.type === "DIRECT") {
      return controller.selectedConversation.otherParticipant?.name || "Usuario";
    }

    return (
      controller.selectedConversation.participants.find(
        (participant) => participant.userId === controller.typingUserId
      )?.user.name || "Alguem do grupo"
    );
  }, [controller.selectedConversation, controller.typingUserId]);

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    });
  }, [controller.messages, controller.selectedConversationId]);

  const filterOptions: Array<{ id: ConversationFilter; label: string; count: number }> = [
    { id: "all", label: "Todas", count: controller.conversations.length },
    {
      id: "direct",
      label: "Diretas",
      count: controller.conversations.filter((conversation) => conversation.type === "DIRECT").length,
    },
    { id: "group", label: "Grupos", count: groupCount },
    { id: "unread", label: "Nao lidas", count: controller.conversations.filter((conversation) => conversation.unreadCount > 0).length },
  ];

  return (
    <div
      {...rest}
      className={cn(
        // mobile: 560px  —  md (768px+): 620px  —  lg (1024px+): 700px  —  xl/fullHD: 810px
        "flex flex-col h-[560px] md:h-[620px] lg:h-[700px] xl:h-[810px]",
        compact && "h-full"
      )}
    >
      <div
        className={cn(
          compact
            ? "grid h-full grid-cols-1 gap-3"
            : "flex-1 min-h-0 grid grid-cols-1 gap-4 md:grid-cols-[290px_1fr] lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr]"
        )}
      >
      <aside className={cn(
        "glass-card min-h-0 flex-col overflow-hidden p-4",
        !compact && controller.selectedConversationId ? "hidden md:flex" : "flex"
      )}>
        <div className="mb-3 rounded-[24px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.88),rgba(246,239,232,0.9))] px-4 py-3 dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            Inbox interna
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-text-secondary">
            <span className="text-[var(--accent-hover)] dark:text-[var(--accent)]">
              {controller.globalUnreadCount} nao lidas
            </span>
            <span>
              {
                controller.conversations.filter((conversation) => conversation.type === "DIRECT").length
              }{" "}
              pessoais
            </span>
            <span>{groupCount} grupos</span>
          </div>
        </div>

        <div className="relative">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por conversa, pessoa ou grupo..."
            className="pl-11"
          />
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-all",
                filter === option.id
                  ? "border-[color:color-mix(in_srgb,var(--accent)_30%,white)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_14%,white),rgba(255,255,255,0.92))] text-[var(--accent-hover)] shadow-[0_12px_24px_color-mix(in_srgb,var(--accent)_12%,transparent)] dark:text-[var(--accent)]"
                  : "border-[var(--card-border)] bg-[var(--surface-soft)] text-text-secondary hover:border-border-hover"
              )}
            >
              {option.label}
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-text-muted dark:bg-white/8">
                {option.count}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          <div className="mb-2 px-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
              Conversas priorizadas
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Nao lidas e mais recentes aparecem primeiro.
            </p>
          </div>

          {filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => controller.setSelectedConversationId(conversation.id)}
              className={cn(
                "w-full rounded-[20px] border px-3 py-2 text-left transition-all",
                controller.selectedConversationId === conversation.id
                  ? "border-[color:color-mix(in_srgb,var(--accent)_28%,white)] bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(245,236,228,0.94))] shadow-[0_20px_38px_color-mix(in_srgb,var(--accent)_12%,transparent)] dark:bg-[linear-gradient(145deg,rgba(195,160,127,0.16),rgba(255,255,255,0.04))]"
                  : "border-[var(--card-border)] bg-[var(--surface-soft)] hover:-translate-y-[1px] hover:border-border-hover"
              )}
            >
              <div className="flex items-start gap-2">
                <ChatConversationAvatar conversation={conversation} size="sm" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold leading-tight text-text-primary">
                        {getConversationTitle(conversation)}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-hover)] dark:text-[var(--accent)]">
                          {getConversationBadge(conversation)}
                        </span>
                        <span className="truncate text-[11px] text-text-muted">
                          {getConversationSummary(conversation)}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] text-text-muted">
                      {formatConversationTimestamp(conversation.lastMessage?.createdAt || conversation.updatedAt)}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-[13px] text-text-secondary">
                    {getConversationPreview(conversation)}
                  </p>
                </div>

                {conversation.unreadCount > 0 ? (
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--highlight))] px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-[0_12px_24px_color-mix(in_srgb,var(--accent)_24%,transparent)]">
                    {conversation.unreadCount}
                  </span>
                ) : null}
              </div>
            </button>
          ))}

          {!filteredConversations.length ? (
            <div className="rounded-[26px] border border-dashed border-white/70 px-5 py-8 text-center text-sm text-text-muted dark:border-white/10">
              Nenhuma conversa encontrada para esse filtro.
            </div>
          ) : null}
        </div>
      </aside>

      <section className={cn(
        "glass-card min-h-0 flex-col overflow-hidden p-4",
        !compact && !controller.selectedConversationId ? "hidden md:flex" : "flex"
      )}>
        {controller.selectedConversation ? (
          <>
            <button
              type="button"
              onClick={() => controller.setSelectedConversationId(null)}
              className="mb-3 flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary md:hidden"
            >
              <ChevronLeft size={15} />
              Conversas
            </button>
            <header className="rounded-[32px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(245,237,230,0.94))] p-5 shadow-[0_24px_48px_color-mix(in_srgb,var(--shadow-color)_14%,transparent)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]">
              <div className="mb-4 h-1 w-16 rounded-full bg-[linear-gradient(90deg,var(--accent),var(--highlight))]" />
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <ChatConversationAvatar conversation={controller.selectedConversation} size="lg" />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[1.6rem] font-semibold tracking-[-0.03em] text-text-primary">
                        {getConversationTitle(controller.selectedConversation)}
                      </h3>
                      <span className="rounded-full border border-[color:color-mix(in_srgb,var(--accent)_20%,white)] bg-[var(--accent-subtle)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-hover)] dark:text-[var(--accent)]">
                        {getConversationBadge(controller.selectedConversation)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-text-secondary">
                      {controller.selectedConversation.description?.trim() ||
                        getConversationSummary(controller.selectedConversation)}
                    </p>

                    <p className="mt-2 text-[11px] font-medium text-text-muted">
                      {controller.selectedConversation.lastMessage?.createdAt
                        ? `Ultima atividade ${formatConversationTimestamp(controller.selectedConversation.lastMessage.createdAt)}`
                        : "Canal pronto para novas mensagens"}
                    </p>

                    {controller.selectedConversation.type === "GROUP" ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {controller.selectedConversation.participants.map((participant) => (
                          <span
                            key={participant.id}
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-white/78 px-3 py-2 text-xs text-text-primary dark:bg-white/6"
                          >
                            <UserPresenceAvatar
                              name={participant.user.name}
                              avatarUrl={participant.user.avatarUrl}
                              status={participant.user.presence.computedStatus}
                              size="sm"
                            />
                            <span className="max-w-[160px] truncate">{participant.user.name}</span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setIsPickerOpen(true)}>
                    <MessageSquarePlus size={14} />
                    Nova conversa
                  </Button>
                </div>
              </div>

              {controller.realtimeWarning ? (
                <div className="mt-4 rounded-[22px] border border-amber-300/30 bg-[linear-gradient(90deg,rgba(202,109,12,0.10),rgba(164,112,63,0.08))] px-4 py-3 text-sm text-[color:#9a5b18] dark:text-amber-200">
                  {controller.realtimeWarning}
                </div>
              ) : null}
            </header>

            <div
              ref={messagesViewportRef}
              className="mt-4 flex-1 overflow-y-auto rounded-[32px] border border-white/70 bg-[radial-gradient(240px_240px_at_top_right,rgba(201,166,133,0.1),transparent_72%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,243,238,0.94))] px-4 py-5 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]"
            >
              {controller.isMessagesLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-text-muted">
                  Carregando mensagens...
                </div>
              ) : (
                <div className="space-y-5">
                  {groupedMessages.map(([groupKey, groupMessages]) => (
                    <div key={groupKey} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/70 dark:bg-white/10" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                          {formatDateLabel(groupMessages[0].createdAt)}
                        </span>
                        <div className="h-px flex-1 bg-white/70 dark:bg-white/10" />
                      </div>
                      {groupMessages.map((message) => (
                        <ChatMessageItemCard
                          key={message.id}
                          currentUserId={currentUser.id}
                          message={message}
                          showSender={controller.selectedConversation?.type === "GROUP"}
                        />
                      ))}
                    </div>
                  ))}

                  {!groupedMessages.length ? (
                    <div className="flex min-h-[320px] items-center justify-center rounded-[26px] border border-dashed border-white/70 text-center text-sm text-text-muted dark:border-white/10">
                      Esse canal ainda esta vazio. Envie a primeira mensagem para iniciar a conversa.
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {typingLabel ? (
              <div className="pb-2 pt-2 text-xs text-text-muted">
                {typingLabel} esta digitando...
              </div>
            ) : null}

            <div className="mt-3 rounded-[30px] border border-white/70 bg-[radial-gradient(180px_180px_at_top_right,rgba(201,166,133,0.1),transparent_70%),linear-gradient(180deg,rgba(255,255,255,0.88),rgba(246,239,232,0.9))] p-4 shadow-[0_18px_36px_color-mix(in_srgb,var(--shadow-color)_12%,transparent)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]">
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
        ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-[32px] border border-dashed border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(246,239,232,0.88))] px-6 text-center dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
            <div className="flex size-20 items-center justify-center rounded-[28px] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_16%,white),rgba(255,255,255,0.9))] text-[var(--accent)] shadow-[0_18px_36px_color-mix(in_srgb,var(--accent)_14%,transparent)]">
              <Inbox size={30} />
            </div>
            <h3 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-text-primary">
              Selecione uma conversa
            </h3>
            <p className="mt-2 max-w-[34ch] text-sm text-text-secondary">
              Abra uma conversa direta, crie um grupo de equipe ou acompanhe suas mensagens nao lidas em uma unica inbox.
            </p>
            <div className="mt-6 flex gap-2">
              <Button type="button" onClick={() => setIsPickerOpen(true)}>
                <UsersRound size={14} />
                Novo canal
              </Button>
            </div>
          </div>
        )}

        {controller.error ? (
          <div className="mt-3 rounded-[22px] border border-amber-300/30 bg-[linear-gradient(90deg,rgba(202,109,12,0.10),rgba(164,112,63,0.08))] px-4 py-3 text-sm text-[color:#9a5b18] dark:text-amber-200">
            {controller.error}
          </div>
        ) : null}
      </section>
      </div>

      <ChatUserPicker
        isOpen={isPickerOpen}
        users={controller.users}
        isSubmitting={controller.isMutating}
        onClose={() => setIsPickerOpen(false)}
        onCreateDirect={(userId) => controller.createDirectConversation(userId)}
        onCreateGroup={(input) => controller.createGroupConversation(input)}
      />
    </div>
  );
}
