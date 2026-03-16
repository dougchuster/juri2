"use client";

import { io, type Socket } from "socket.io-client";
import { useEffect, useRef, useState, useTransition } from "react";

import { CHAT_LIMITS, CHAT_ROUTE_BASE, CHAT_SOCKET_EVENTS } from "@/lib/chat/constants";
import { computePresenceStatus } from "@/lib/chat/presence-status";
import type { ChatConversationItem, ChatDirectoryUser, ChatMessageItem } from "@/lib/chat/types";
import { useChatPresenceStore } from "@/store/use-chat-presence-store";

export type ChatCurrentUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
};

export type ChatDraftAttachment = {
  kind: "FILE" | "AUDIO";
  storageKey: string;
  fileUrl: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number | null;
};

type ChatControllerOptions = {
  currentUser: ChatCurrentUser;
  externalSelectedConversationId?: string | null;
  onSelectedConversationChange?: (conversationId: string | null) => void;
};

async function getJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const bodyText = await response.text();
  const isJsonResponse = contentType.includes("application/json");

  if (!isJsonResponse) {
    const normalized = bodyText.trim().toLowerCase();
    if (response.redirected || normalized.startsWith("<!doctype") || normalized.startsWith("<html")) {
      throw new Error(
        response.status === 401 || response.status === 403
          ? "Sua sessao do chat expirou. Atualize a pagina e entre novamente."
          : "O chat retornou uma resposta invalida. Atualize a pagina para tentar novamente."
      );
    }
    throw new Error("O chat retornou um formato de resposta inesperado.");
  }

  const json = JSON.parse(bodyText) as T & { error?: string };
  if (!response.ok) {
    throw new Error(json?.error || "Falha ao processar requisicao do chat.");
  }
  return json;
}

function createChatSocket() {
  return io({
    path: "/socket.io",
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnectionAttempts: 6,
    timeout: 15000,
  });
}

function mapSocketErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("xhr poll error") ||
    normalized.includes("websocket error") ||
    normalized.includes("timeout")
  ) {
    return "Atualizacoes em tempo real indisponiveis no momento. O chat continua funcionando, mas sem sincronizacao instantanea.";
  }
  if (normalized.includes("unauthorized_chat")) {
    return "Sua sessao do chat expirou. Atualize a pagina para reconectar.";
  }
  return message || "Falha de conexao do chat.";
}

function patchPresenceInDirectory(
  users: ChatDirectoryUser[],
  userId: string,
  presence: ChatDirectoryUser["presence"]
) {
  return users.map((item) =>
    item.id === userId
      ? {
          ...item,
          presence,
        }
      : item
  );
}

function patchPresenceInConversations(
  conversations: ChatConversationItem[],
  userId: string,
  presence: ChatDirectoryUser["presence"]
) {
  return conversations.map((conversation) => {
    const nextOtherParticipant =
      conversation.otherParticipant?.id === userId
        ? {
            ...conversation.otherParticipant,
            presence,
          }
        : conversation.otherParticipant;

    const nextParticipants = conversation.participants.map((participant) =>
      participant.user.id === userId
        ? {
            ...participant,
            user: {
              ...participant.user,
              presence,
            },
          }
        : participant
    );

    return {
      ...conversation,
      otherParticipant: nextOtherParticipant || null,
      participants: nextParticipants,
    };
  });
}

export function useInternalChatController(options: ChatControllerOptions) {
  const [users, setUsers] = useState<ChatDirectoryUser[]>([]);
  const [conversations, setConversations] = useState<ChatConversationItem[]>([]);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [selectedConversationId, setSelectedConversationIdState] = useState<string | null>(
    options.externalSelectedConversationId ?? null
  );
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [globalUnreadCount, setGlobalUnreadCount] = useState(0);
  const [manualStatus, setManualStatus] = useState<"ONLINE" | "AWAY" | "BUSY" | null>(null);
  const [isBootstrapping, startBootstrapTransition] = useTransition();
  const [isMutating, setIsMutating] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeWarning, setRealtimeWarning] = useState<string | null>(null);
  const { setCurrentPresence } = useChatPresenceStore();

  const socketRef = useRef<Socket | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const selectedConversationIdRef = useRef<string | null>(options.externalSelectedConversationId ?? null);
  const typingUserIdRef = useRef<string | null>(null);
  const joinedConversationIdRef = useRef<string | null>(null);

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) || null;

  const applySelectedConversation = (conversationId: string | null) => {
    selectedConversationIdRef.current = conversationId;
    setSelectedConversationIdState(conversationId);
    options.onSelectedConversationChange?.(conversationId);
  };

  async function refreshUsers() {
    const data = await getJson<{ users: ChatDirectoryUser[] }>(`${CHAT_ROUTE_BASE}/users`);
    setUsers(data.users);
    setError(null);
  }

  async function refreshConversations(preferredConversationId?: string | null) {
    const data = await getJson<{ conversations: ChatConversationItem[] }>(`${CHAT_ROUTE_BASE}/conversations`);
    setConversations(data.conversations);
    const nextSelected =
      preferredConversationId ??
      options.externalSelectedConversationId ??
      selectedConversationIdRef.current ??
      data.conversations[0]?.id ??
      null;
    applySelectedConversation(nextSelected);
    setError(null);
  }

  async function refreshUnreadCount() {
    const data = await getJson<{ unreadCount: number }>(`${CHAT_ROUTE_BASE}/unread-count`);
    setGlobalUnreadCount(data.unreadCount);
    setError(null);
  }

  async function refreshMessages(conversationId: string) {
    setIsMessagesLoading(true);
    try {
      const data = await getJson<{
        messages: ChatMessageItem[];
        nextCursor: string | null;
        hasMore: boolean;
      }>(`${CHAT_ROUTE_BASE}/conversations/${conversationId}/messages`);
      setMessages(data.messages);
      setError(null);
    } finally {
      setIsMessagesLoading(false);
    }
  }

  async function markConversationRead(conversationId: string) {
    await getJson(`${CHAT_ROUTE_BASE}/conversations/${conversationId}/read`, {
      method: "POST",
    });
  }

  async function bootstrap() {
    setError(null);
    startBootstrapTransition(async () => {
      try {
        await Promise.all([refreshUsers(), refreshConversations(), refreshUnreadCount()]);
      } catch (bootstrapError) {
        setError(
          bootstrapError instanceof Error
            ? bootstrapError.message
            : "Falha ao inicializar o chat interno."
        );
      }
    });
  }

  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const externalConversationId = options.externalSelectedConversationId ?? null;
    if (externalConversationId && externalConversationId !== selectedConversationIdRef.current) {
      applySelectedConversation(externalConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.externalSelectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) {
      typingUserIdRef.current = null;
      setTypingUserId(null);
      setMessages([]);
      return;
    }

    typingUserIdRef.current = null;
    setTypingUserId(null);

    void (async () => {
      try {
        await refreshMessages(selectedConversationId);
        await markConversationRead(selectedConversationId);
      } catch (messageError) {
        setError(
          messageError instanceof Error
            ? messageError.message
            : "Falha ao carregar mensagens."
        );
      }
    })();
  }, [selectedConversationId]);

  useEffect(() => {
    const socket = createChatSocket();
    socketRef.current = socket;

    const handleConversationCreated = async (payload: { conversation?: ChatConversationItem | null }) => {
      const nextId = payload?.conversation?.id || selectedConversationIdRef.current;
      await refreshConversations(nextId);
    };

    const handleMessageNew = async (payload: { conversationId?: string; message?: ChatMessageItem }) => {
      if (!payload?.conversationId) return;
      await refreshConversations(payload.conversationId);
      if (payload.conversationId === selectedConversationIdRef.current) {
        await refreshMessages(payload.conversationId);
        await markConversationRead(payload.conversationId);
      }
    };

    const handleMessageRead = async (payload: { conversationId?: string }) => {
      if (!payload?.conversationId) return;
      if (payload.conversationId === selectedConversationIdRef.current) {
        await refreshMessages(payload.conversationId);
      }
      await refreshConversations(payload.conversationId);
    };

    const handlePresenceUpdate = (payload: {
      userId?: string;
      presence?: ChatDirectoryUser["presence"];
    }) => {
      if (!payload.userId || !payload.presence) return;
      setUsers((current) => patchPresenceInDirectory(current, payload.userId!, payload.presence!));
      setConversations((current) =>
        patchPresenceInConversations(current, payload.userId!, payload.presence!)
      );
      if (payload.userId === options.currentUser.id) {
        setManualStatus((payload.presence.manualStatus as "ONLINE" | "AWAY" | "BUSY" | null) || null);
        setCurrentPresence({
          ...payload.presence,
          userId: payload.userId,
        });
      }
    };

    const handleTypingStart = (payload: { conversationId?: string; userId?: string }) => {
      if (
        payload.conversationId === selectedConversationIdRef.current &&
        payload.userId !== options.currentUser.id
      ) {
        typingUserIdRef.current = payload.userId || null;
        setTypingUserId(payload.userId || null);
      }
    };

    const handleTypingStop = (payload: { conversationId?: string; userId?: string }) => {
      if (
        payload.conversationId === selectedConversationIdRef.current &&
        payload.userId === typingUserIdRef.current
      ) {
        typingUserIdRef.current = null;
        setTypingUserId(null);
      }
    };

    const handleUnreadUpdate = (payload: { userId?: string; unreadCount?: number }) => {
      if (payload.userId === options.currentUser.id && typeof payload.unreadCount === "number") {
        setGlobalUnreadCount(payload.unreadCount);
      }
    };

    socket.on(CHAT_SOCKET_EVENTS.conversationCreated, handleConversationCreated);
    socket.on(CHAT_SOCKET_EVENTS.messageNew, handleMessageNew);
    socket.on(CHAT_SOCKET_EVENTS.messageRead, handleMessageRead);
    socket.on(CHAT_SOCKET_EVENTS.presenceUpdate, handlePresenceUpdate);
    socket.on(CHAT_SOCKET_EVENTS.typingStart, handleTypingStart);
    socket.on(CHAT_SOCKET_EVENTS.typingStop, handleTypingStop);
    socket.on(CHAT_SOCKET_EVENTS.unreadUpdate, handleUnreadUpdate);
    socket.on("connect", () => {
      setRealtimeWarning(null);
    });
    socket.on(CHAT_SOCKET_EVENTS.connectError, (socketError) => {
      setRealtimeWarning(mapSocketErrorMessage(socketError.message || ""));
    });

    heartbeatRef.current = window.setInterval(() => {
      socket.emit(CHAT_SOCKET_EVENTS.heartbeat);
    }, CHAT_LIMITS.heartbeatIntervalMs);

    return () => {
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
      }
      if (joinedConversationIdRef.current) {
        socket.emit(CHAT_SOCKET_EVENTS.leaveConversation, {
          conversationId: joinedConversationIdRef.current,
        });
      }
      socket.disconnect();
      socketRef.current = null;
    };
    // The socket must be created once per authenticated user and reads live refs for current selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.currentUser.id]);

  useEffect(() => {
    if (!socketRef.current) return;

    if (joinedConversationIdRef.current && joinedConversationIdRef.current !== selectedConversationId) {
      socketRef.current.emit(CHAT_SOCKET_EVENTS.leaveConversation, {
        conversationId: joinedConversationIdRef.current,
      });
      joinedConversationIdRef.current = null;
    }

    if (!selectedConversationId) return;

    socketRef.current.emit(CHAT_SOCKET_EVENTS.joinConversation, {
      conversationId: selectedConversationId,
    });
    joinedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  async function createDirectConversation(targetUserId: string) {
    setIsMutating(true);
    setError(null);
    try {
      const data = await getJson<{ conversation: ChatConversationItem }>(
        `${CHAT_ROUTE_BASE}/conversations/direct`,
        {
          method: "POST",
          body: JSON.stringify({ targetUserId }),
        }
      );
      applySelectedConversation(data.conversation.id);
      await refreshConversations(data.conversation.id);
      return data.conversation;
    } catch (mutationError) {
      const nextError =
        mutationError instanceof Error
          ? mutationError.message
          : "Falha ao abrir conversa.";
      setError(nextError);
      throw new Error(nextError);
    } finally {
      setIsMutating(false);
    }
  }

  async function createGroupConversation(input: {
    title: string;
    description?: string | null;
    memberUserIds: string[];
    isTeamGroup?: boolean;
  }) {
    setIsMutating(true);
    setError(null);
    try {
      const data = await getJson<{ conversation: ChatConversationItem }>(
        `${CHAT_ROUTE_BASE}/conversations/group`,
        {
          method: "POST",
          body: JSON.stringify(input),
        }
      );
      applySelectedConversation(data.conversation.id);
      await refreshConversations(data.conversation.id);
      return data.conversation;
    } catch (mutationError) {
      const nextError =
        mutationError instanceof Error
          ? mutationError.message
          : "Falha ao criar grupo.";
      setError(nextError);
      throw new Error(nextError);
    } finally {
      setIsMutating(false);
    }
  }

  async function sendTextMessage(text: string) {
    if (!selectedConversationId) return;
    setIsMutating(true);
    setError(null);
    try {
      await getJson(`${CHAT_ROUTE_BASE}/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      await refreshMessages(selectedConversationId);
      await refreshConversations(selectedConversationId);
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Falha ao enviar mensagem."
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function sendAttachmentMessage(attachment: ChatDraftAttachment, text?: string) {
    if (!selectedConversationId) return;
    setIsMutating(true);
    setError(null);
    try {
      const route =
        attachment.kind === "AUDIO"
          ? `${CHAT_ROUTE_BASE}/conversations/${selectedConversationId}/messages/audio`
          : `${CHAT_ROUTE_BASE}/conversations/${selectedConversationId}/messages/file`;

      await getJson(route, {
        method: "POST",
        body: JSON.stringify({
          ...attachment,
          text: text || null,
          metadataJson:
            attachment.durationSeconds != null
              ? { durationSeconds: attachment.durationSeconds }
              : null,
        }),
      });
      await refreshMessages(selectedConversationId);
      await refreshConversations(selectedConversationId);
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Falha ao enviar anexo."
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function uploadAttachment(file: File, kind: "FILE" | "AUDIO") {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("kind", kind);

    const response = await fetch(`${CHAT_ROUTE_BASE}/attachments/upload`, {
      method: "POST",
      body: formData,
    });
    const contentType = response.headers.get("content-type") || "";
    const bodyText = await response.text();
    if (!contentType.includes("application/json")) {
      throw new Error(
        response.redirected || bodyText.trim().toLowerCase().startsWith("<!doctype")
          ? "Sua sessao do chat expirou. Atualize a pagina antes de enviar anexos."
          : "O upload do chat retornou uma resposta invalida."
      );
    }
    const json = JSON.parse(bodyText) as {
      error?: string;
      success?: boolean;
      storageKey?: string;
      fileUrl?: string;
      originalName?: string;
      mimeType?: string;
      sizeBytes?: number;
    };

    if (!response.ok || !json.success || !json.storageKey || !json.fileUrl) {
      throw new Error(json.error || "Falha ao processar upload do chat.");
    }

    return {
      kind,
      storageKey: json.storageKey,
      fileUrl: json.fileUrl,
      originalName: json.originalName || file.name,
      mimeType: json.mimeType || file.type || "application/octet-stream",
      sizeBytes: json.sizeBytes || file.size,
    } satisfies ChatDraftAttachment;
  }

  async function updateManualStatus(manualPresence: "ONLINE" | "AWAY" | "BUSY" | null) {
    setError(null);
    try {
      await getJson(`${CHAT_ROUTE_BASE}/presence`, {
        method: "PATCH",
        body: JSON.stringify({ manualStatus: manualPresence }),
      });
      setManualStatus(manualPresence);
      setCurrentPresence((current) =>
        current
          ? {
              ...current,
              manualStatus: manualPresence,
              computedStatus: computePresenceStatus({
                manualStatus: manualPresence,
                connected: current.connected,
                lastActivityAt: current.lastActivityAt,
              }),
            }
          : current
      );
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Falha ao atualizar status manual."
      );
    }
  }

  function emitTyping(active: boolean) {
    if (!selectedConversationId || !socketRef.current) return;
    socketRef.current.emit(CHAT_SOCKET_EVENTS.typingSet, {
      conversationId: selectedConversationId,
      active,
    });
  }

  return {
    users,
    conversations,
    messages,
    selectedConversationId,
    selectedConversation,
    typingUserId,
    globalUnreadCount,
    manualStatus,
    isBootstrapping,
    isMutating,
    isMessagesLoading,
    error,
    realtimeWarning,
    setError,
    setSelectedConversationId: applySelectedConversation,
    refreshUsers,
    refreshConversations,
    refreshMessages,
    refreshUnreadCount,
    createDirectConversation,
    createGroupConversation,
    sendTextMessage,
    sendAttachmentMessage,
    uploadAttachment,
    updateManualStatus,
    emitTyping,
  };
}
