import "server-only";

import type { InternalChatPresenceStatus } from "@/generated/prisma";
import { CHAT_LIMITS } from "@/lib/chat/constants";
import { isSameParticipantPair } from "@/lib/chat/direct-key";
import { getChatAuthOrThrow, listChatDirectoryUsers, listChatUsers, type ChatAuthUser } from "@/lib/chat/auth";
import {
  countUnreadMessagesForConversation,
  createInternalChatDirectConversation,
  createInternalChatGroupConversation,
  createInternalChatMessage,
  findChatTargetUser,
  findInternalChatConversationById,
  findInternalChatDirectConversation,
  listConversationParticipantIds,
  listInternalChatConversationsForUser,
  listInternalChatMessages,
  markInternalChatConversationRead,
} from "@/lib/chat/repository";
import { getPresenceSnapshotForUser, getPresenceSnapshots, setManualPresenceStatus } from "@/lib/chat/presence";
import type { ChatAttachmentItem, ChatConversationItem, ChatDirectoryUser, ChatMessageItem } from "@/lib/chat/types";

function normalizeAttachment(attachment: {
  id: string;
  kind: "FILE" | "AUDIO";
  fileUrl: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  metadataJson: unknown;
  createdAt: Date;
}): ChatAttachmentItem {
  return {
    id: attachment.id,
    kind: attachment.kind,
    fileUrl: attachment.fileUrl,
    storageKey: attachment.storageKey,
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    durationSeconds: attachment.durationSeconds,
    metadataJson:
      attachment.metadataJson && typeof attachment.metadataJson === "object" && !Array.isArray(attachment.metadataJson)
        ? (attachment.metadataJson as Record<string, unknown>)
        : null,
    createdAt: attachment.createdAt.toISOString(),
  };
}

function normalizeMessage(message: {
  id: string;
  conversationId: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: "ADMIN" | "SOCIO" | "ADVOGADO" | "CONTROLADOR" | "ASSISTENTE" | "FINANCEIRO" | "SECRETARIA";
  };
  type: "TEXT" | "FILE" | "AUDIO" | "SYSTEM";
  text: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  attachments: Array<{
    id: string;
    kind: "FILE" | "AUDIO";
    fileUrl: string;
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    durationSeconds: number | null;
    metadataJson: unknown;
    createdAt: Date;
  }>;
  reads: Array<{
    userId: string;
    readAt: Date;
  }>;
}): ChatMessageItem {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    sender: {
      id: message.sender.id,
      name: message.sender.name,
      avatarUrl: message.sender.avatarUrl || null,
      role: message.sender.role,
    },
    type: message.type,
    text: message.text,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    deletedAt: message.deletedAt?.toISOString() || null,
    attachments: message.attachments.map(normalizeAttachment),
    reads: message.reads.map((read) => ({
      userId: read.userId,
      readAt: read.readAt.toISOString(),
    })),
  };
}

function buildConversationTitle(
  conversation: Awaited<ReturnType<typeof findInternalChatConversationById>>,
  currentUser: ChatAuthUser
) {
  if (!conversation) return null;
  if (conversation.type === "GROUP") {
    if (conversation.title?.trim()) return conversation.title.trim();
    const names = conversation.participants
      .filter((participant) => participant.userId !== currentUser.id)
      .map((participant) => participant.user.name)
      .slice(0, 3);
    return names.join(", ") || "Grupo interno";
  }
  return conversation.participants.find((participant) => participant.userId !== currentUser.id)?.user.name || "Conversa";
}

function normalizeDirectoryUser(
  user: Awaited<ReturnType<typeof listChatDirectoryUsers>>[number],
  presence: Awaited<ReturnType<typeof getPresenceSnapshotForUser>>
): ChatDirectoryUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl || null,
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    advogado: user.advogado
      ? {
          id: user.advogado.id,
          oab: user.advogado.oab,
          seccional: user.advogado.seccional,
          especialidades: user.advogado.especialidades,
          equipes: user.advogado.timeMembros.map((membro) => ({
            id: membro.time.id,
            nome: membro.time.nome,
            cor: membro.time.cor,
            lider: membro.lider,
          })),
        }
      : null,
    presence: {
      manualStatus: presence?.manualStatus || null,
      computedStatus: presence?.computedStatus || "OFFLINE",
      lastSeenAt: presence?.lastSeenAt || null,
      lastActivityAt: presence?.lastActivityAt || null,
      connected: presence?.connected || false,
    },
  };
}

async function enrichConversation(
  currentUser: ChatAuthUser,
  conversation: Awaited<ReturnType<typeof findInternalChatConversationById>>
) {
  if (!conversation) return null;

  const ownParticipant = conversation.participants.find((participant) => participant.userId === currentUser.id) || null;
  const otherParticipant = conversation.participants.find((participant) => participant.userId !== currentUser.id) || null;
  const visibleParticipants = conversation.participants.filter((participant) => participant.userId !== currentUser.id);
  const [presenceMap, unreadCount] = await Promise.all([
    getPresenceSnapshots(visibleParticipants.map((participant) => participant.user.id)),
    countUnreadMessagesForConversation({
      conversationId: conversation.id,
      userId: currentUser.id,
      lastReadAt: ownParticipant?.lastReadAt || null,
    }),
  ]);

  return {
    id: conversation.id,
    type: conversation.type,
    directKey: conversation.directKey,
    title: buildConversationTitle(conversation, currentUser),
    description: conversation.type === "GROUP" ? conversation.description || null : null,
    avatarUrl: conversation.avatarUrl || null,
    isTeamGroup: conversation.isTeamGroup,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    archivedAt: conversation.archivedAt?.toISOString() || null,
    lastReadAt: ownParticipant?.lastReadAt?.toISOString() || null,
    unreadCount,
    participants: visibleParticipants.map((participant) => ({
      id: participant.id,
      userId: participant.userId,
      joinedAt: participant.joinedAt.toISOString(),
      lastReadAt: participant.lastReadAt?.toISOString() || null,
      user: normalizeDirectoryUser(participant.user, presenceMap[participant.user.id] || null),
    })),
    otherParticipant: otherParticipant
      ? normalizeDirectoryUser(otherParticipant.user, presenceMap[otherParticipant.user.id] || null)
      : null,
    lastMessage: conversation.lastMessage ? normalizeMessage(conversation.lastMessage) : null,
  } satisfies ChatConversationItem;
}

export async function getChatDirectory(user?: ChatAuthUser) {
  const currentUser = user ?? (await getChatAuthOrThrow());
  const users = await listChatDirectoryUsers(currentUser.id);
  const presenceMap = await getPresenceSnapshots(users.map((item) => item.id));

  return users.map((item) => normalizeDirectoryUser(item, presenceMap[item.id] || null));
}

export async function getInternalChatConversations(user?: ChatAuthUser) {
  const currentUser = user ?? (await getChatAuthOrThrow());
  const conversations = await listInternalChatConversationsForUser({
    userId: currentUser.id,
    escritorioId: currentUser.escritorioId!,
  });

  const enriched = await Promise.all(conversations.map((conversation) => enrichConversation(currentUser, conversation)));
  return enriched.filter((item): item is ChatConversationItem => Boolean(item));
}

export async function getOrCreateInternalDirectConversation(
  targetUserId: string,
  user?: ChatAuthUser
) {
  const currentUser = user ?? (await getChatAuthOrThrow());
  if (!targetUserId) {
    throw new Error("CHAT_TARGET_REQUIRED");
  }
  if (isSameParticipantPair(currentUser.id, targetUserId)) {
    throw new Error("CHAT_SELF_CONVERSATION");
  }

  const targetUser = await findChatTargetUser(targetUserId);
  if (!targetUser) {
    throw new Error("CHAT_TARGET_NOT_FOUND");
  }

  const existing = await findInternalChatDirectConversation({
    escritorioId: currentUser.escritorioId!,
    userId: currentUser.id,
    targetUserId,
  });

  const conversation =
    existing ||
    (await createInternalChatDirectConversation({
      escritorioId: currentUser.escritorioId!,
      createdById: currentUser.id,
      userId: currentUser.id,
      targetUserId,
    }));

  return enrichConversation(currentUser, conversation);
}

export async function createInternalGroupConversation(
  input: {
    title: string;
    description?: string | null;
    memberUserIds: string[];
    isTeamGroup?: boolean;
  },
  user?: ChatAuthUser
) {
  const currentUser = user ?? (await getChatAuthOrThrow());
  const title = input.title.trim();
  if (title.length < 3) {
    throw new Error("CHAT_GROUP_TITLE_TOO_SHORT");
  }

  const memberUserIds = Array.from(
    new Set(input.memberUserIds.filter((memberId) => memberId && memberId !== currentUser.id))
  );

  if (memberUserIds.length < 2) {
    throw new Error("CHAT_GROUP_MIN_MEMBERS");
  }

  const users = await listChatUsers({ userIds: memberUserIds });
  if (users.length !== memberUserIds.length) {
    throw new Error("CHAT_GROUP_MEMBER_NOT_FOUND");
  }

  const conversation = await createInternalChatGroupConversation({
    escritorioId: currentUser.escritorioId!,
    createdById: currentUser.id,
    title,
    description: input.description?.trim() || null,
    isTeamGroup: input.isTeamGroup ?? false,
    memberUserIds,
  });

  return enrichConversation(currentUser, conversation);
}

export async function getInternalChatMessages(
  conversationId: string,
  cursor?: string | null,
  user?: ChatAuthUser
) {
  const currentUser = user ?? (await getChatAuthOrThrow());
  const conversation = await findInternalChatConversationById(conversationId, currentUser.escritorioId!);
  if (!conversation || !conversation.participants.some((participant) => participant.userId === currentUser.id)) {
    throw new Error("CHAT_CONVERSATION_NOT_FOUND");
  }

  const page = await listInternalChatMessages({
    conversationId,
    cursor,
    pageSize: CHAT_LIMITS.fetchMessagePageSize,
  });

  return {
    messages: page.items.map(normalizeMessage),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  };
}

export async function sendInternalChatTextMessage(
  conversationId: string,
  text: string,
  user?: ChatAuthUser
) {
  const currentUser = user ?? (await getChatAuthOrThrow());
  const normalizedText = text.trim();
  if (!normalizedText) {
    throw new Error("CHAT_EMPTY_MESSAGE");
  }
  if (normalizedText.length > CHAT_LIMITS.messageMaxLength) {
    throw new Error("CHAT_MESSAGE_TOO_LONG");
  }

  const conversation = await findInternalChatConversationById(conversationId, currentUser.escritorioId!);
  if (!conversation || !conversation.participants.some((participant) => participant.userId === currentUser.id)) {
    throw new Error("CHAT_CONVERSATION_NOT_FOUND");
  }

  const message = await createInternalChatMessage({
    conversationId,
    escritorioId: currentUser.escritorioId!,
    senderId: currentUser.id,
    type: "TEXT",
    text: normalizedText,
  });

  const participantIds = await listConversationParticipantIds(conversationId);

  return {
    message: normalizeMessage(message),
    participantIds,
  };
}

export async function sendInternalChatAttachmentMessage(
  conversationId: string,
  attachment: {
    kind: "FILE" | "AUDIO";
    storageKey: string;
    fileUrl: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    durationSeconds?: number | null;
    metadataJson?: Record<string, unknown> | null;
    text?: string | null;
  },
  user?: ChatAuthUser
) {
  const currentUser = user ?? (await getChatAuthOrThrow());
  const conversation = await findInternalChatConversationById(conversationId, currentUser.escritorioId!);
  if (!conversation || !conversation.participants.some((participant) => participant.userId === currentUser.id)) {
    throw new Error("CHAT_CONVERSATION_NOT_FOUND");
  }

  const message = await createInternalChatMessage({
    conversationId,
    escritorioId: currentUser.escritorioId!,
    senderId: currentUser.id,
    type: attachment.kind === "AUDIO" ? "AUDIO" : "FILE",
    text: attachment.text?.trim() || null,
    attachments: [
      {
        kind: attachment.kind,
        storageKey: attachment.storageKey,
        fileUrl: attachment.fileUrl,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        durationSeconds: attachment.durationSeconds ?? null,
        metadataJson: attachment.metadataJson ?? null,
      },
    ],
  });

  const participantIds = await listConversationParticipantIds(conversationId);

  return {
    message: normalizeMessage(message),
    participantIds,
  };
}

export async function markInternalChatRead(
  conversationId: string,
  user?: ChatAuthUser
) {
  const currentUser = user ?? (await getChatAuthOrThrow());
  const conversation = await findInternalChatConversationById(conversationId, currentUser.escritorioId!);
  if (!conversation || !conversation.participants.some((participant) => participant.userId === currentUser.id)) {
    throw new Error("CHAT_CONVERSATION_NOT_FOUND");
  }

  const readAt = await markInternalChatConversationRead({
    conversationId,
    userId: currentUser.id,
  });

  const participantIds = await listConversationParticipantIds(conversationId);

  return {
    readAt: readAt.toISOString(),
    participantIds,
  };
}

export async function getInternalChatUnreadCount(user?: ChatAuthUser) {
  const currentUser = user ?? (await getChatAuthOrThrow());
  const conversations = await listInternalChatConversationsForUser({
    userId: currentUser.id,
    escritorioId: currentUser.escritorioId!,
    limit: 100,
  });

  const counts = await Promise.all(
    conversations.map((conversation) => {
      const ownParticipant = conversation.participants.find((participant) => participant.userId === currentUser.id) || null;
      return countUnreadMessagesForConversation({
        conversationId: conversation.id,
        userId: currentUser.id,
        lastReadAt: ownParticipant?.lastReadAt || null,
      });
    })
  );

  return counts.reduce((total, value) => total + value, 0);
}

export async function getRelevantPresence(userIds: string[], user?: ChatAuthUser) {
  const currentUser = user ?? (await getChatAuthOrThrow());
  const snapshots = await getPresenceSnapshots(userIds.filter((userId) => userId !== currentUser.id));
  return snapshots;
}

export async function updateInternalManualStatus(
  manualStatus: InternalChatPresenceStatus | null,
  user?: ChatAuthUser
) {
  const currentUser = user ?? (await getChatAuthOrThrow());
  const next = await setManualPresenceStatus({
    userId: currentUser.id,
    escritorioId: currentUser.escritorioId!,
    manualStatus,
  });

  return {
    manualStatus: next.manualStatus,
    lastSeenAt: next.lastSeenAt?.toISOString() || null,
    lastActivityAt: next.lastActivityAt?.toISOString() || null,
  };
}
