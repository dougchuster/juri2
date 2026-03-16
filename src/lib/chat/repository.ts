import "server-only";

import type { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { buildInternalChatDirectKey } from "@/lib/chat/direct-key";

const messageInclude = {
  sender: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      role: true,
    },
  },
  attachments: {
    orderBy: { createdAt: "asc" },
  },
  reads: {
    orderBy: { readAt: "asc" },
  },
} satisfies Prisma.InternalChatMessageInclude;

const participantSelect = {
  id: true,
  userId: true,
  joinedAt: true,
  lastReadAt: true,
  archivedAt: true,
  mutedUntil: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      lastLoginAt: true,
      advogado: {
        select: {
          id: true,
          oab: true,
          seccional: true,
          especialidades: true,
          timeMembros: {
            select: {
              lider: true,
              time: {
                select: {
                  id: true,
                  nome: true,
                  cor: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.InternalChatParticipantSelect;

const conversationSelect = {
  id: true,
  type: true,
  directKey: true,
  title: true,
  description: true,
  avatarUrl: true,
  isTeamGroup: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  participants: {
    where: {
      archivedAt: null,
    },
    select: participantSelect,
  },
  lastMessage: {
    include: messageInclude,
  },
} satisfies Prisma.InternalChatConversationSelect;

export async function findInternalChatConversationById(conversationId: string, escritorioId: string) {
  return db.internalChatConversation.findFirst({
    where: {
      id: conversationId,
      escritorioId,
      archivedAt: null,
    },
    select: conversationSelect,
  });
}

export async function listInternalChatConversationsForUser(input: {
  userId: string;
  escritorioId: string;
  limit?: number;
}) {
  return db.internalChatConversation.findMany({
    where: {
      escritorioId: input.escritorioId,
      archivedAt: null,
      participants: {
        some: {
          userId: input.userId,
          archivedAt: null,
        },
      },
    },
    select: conversationSelect,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: input.limit ?? 30,
  });
}

export async function findInternalChatDirectConversation(input: {
  escritorioId: string;
  userId: string;
  targetUserId: string;
}) {
  const directKey = buildInternalChatDirectKey(input.escritorioId, input.userId, input.targetUserId);

  return db.internalChatConversation.findUnique({
    where: { directKey },
    select: conversationSelect,
  });
}

export async function createInternalChatDirectConversation(input: {
  escritorioId: string;
  createdById: string;
  userId: string;
  targetUserId: string;
}) {
  const directKey = buildInternalChatDirectKey(input.escritorioId, input.userId, input.targetUserId);

  try {
    return await db.internalChatConversation.create({
      data: {
        escritorioId: input.escritorioId,
        createdById: input.createdById,
        directKey,
        type: "DIRECT",
        participants: {
          create: [
            {
              escritorioId: input.escritorioId,
              userId: input.userId,
            },
            {
              escritorioId: input.escritorioId,
              userId: input.targetUserId,
            },
          ],
        },
      },
      select: conversationSelect,
    });
  } catch (error) {
    const prismaError = error as { code?: string } | null;
    if (prismaError?.code === "P2002") {
      return findInternalChatDirectConversation(input);
    }
    throw error;
  }
}

export async function createInternalChatGroupConversation(input: {
  escritorioId: string;
  createdById: string;
  title: string;
  description?: string | null;
  avatarUrl?: string | null;
  isTeamGroup?: boolean;
  memberUserIds: string[];
}) {
  const participantIds = Array.from(new Set([input.createdById, ...input.memberUserIds]));

  return db.internalChatConversation.create({
    data: {
      escritorioId: input.escritorioId,
      createdById: input.createdById,
      type: "GROUP",
      title: input.title,
      description: input.description ?? null,
      avatarUrl: input.avatarUrl ?? null,
      isTeamGroup: input.isTeamGroup ?? false,
      participants: {
        create: participantIds.map((userId) => ({
          escritorioId: input.escritorioId,
          userId,
        })),
      },
    },
    select: conversationSelect,
  });
}

export async function listInternalChatMessages(input: {
  conversationId: string;
  cursor?: string | null;
  pageSize?: number;
}) {
  const pageSize = input.pageSize ?? 40;
  const messages = await db.internalChatMessage.findMany({
    where: {
      conversationId: input.conversationId,
      deletedAt: null,
    },
    include: messageInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: pageSize + 1,
    ...(input.cursor
      ? {
          cursor: { id: input.cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = messages.length > pageSize;
  const sliced = hasMore ? messages.slice(0, pageSize) : messages;
  const ordered = sliced.reverse();

  return {
    items: ordered,
    nextCursor: hasMore ? ordered[0]?.id || null : null,
    hasMore,
  };
}

export async function createInternalChatMessage(input: {
  conversationId: string;
  escritorioId: string;
  senderId: string;
  type: "TEXT" | "FILE" | "AUDIO" | "SYSTEM";
  text?: string | null;
  attachments?: Array<{
    kind: "FILE" | "AUDIO";
    storageKey: string;
    fileUrl: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    durationSeconds?: number | null;
    metadataJson?: Record<string, unknown> | null;
  }>;
}) {
  return db.$transaction(async (tx) => {
    const message = await tx.internalChatMessage.create({
      data: {
        conversationId: input.conversationId,
        escritorioId: input.escritorioId,
        senderId: input.senderId,
        type: input.type,
        text: input.text || null,
        attachments: input.attachments?.length
          ? {
              create: input.attachments.map((attachment) => ({
                escritorioId: input.escritorioId,
                kind: attachment.kind,
                storageKey: attachment.storageKey,
                fileUrl: attachment.fileUrl,
                originalName: attachment.originalName,
                mimeType: attachment.mimeType,
                sizeBytes: attachment.sizeBytes,
                durationSeconds: attachment.durationSeconds ?? null,
                metadataJson: attachment.metadataJson
                  ? JSON.parse(JSON.stringify(attachment.metadataJson))
                  : undefined,
              })),
            }
          : undefined,
        reads: {
          create: {
            userId: input.senderId,
          },
        },
      },
      include: messageInclude,
    });

    await tx.internalChatConversation.update({
      where: { id: input.conversationId },
      data: {
        lastMessageId: message.id,
        updatedAt: message.createdAt,
      },
    });

    await tx.internalChatParticipant.updateMany({
      where: {
        conversationId: input.conversationId,
        userId: input.senderId,
      },
      data: {
        lastReadAt: message.createdAt,
      },
    });

    return message;
  });
}

export async function markInternalChatConversationRead(input: {
  conversationId: string;
  userId: string;
}) {
  return db.$transaction(async (tx) => {
    const now = new Date();
    const unreadMessages = await tx.internalChatMessage.findMany({
      where: {
        conversationId: input.conversationId,
        deletedAt: null,
        senderId: {
          not: input.userId,
        },
      },
      select: {
        id: true,
      },
    });

    await tx.internalChatParticipant.updateMany({
      where: {
        conversationId: input.conversationId,
        userId: input.userId,
      },
      data: {
        lastReadAt: now,
      },
    });

    if (unreadMessages.length > 0) {
      await tx.internalChatRead.createMany({
        data: unreadMessages.map((message) => ({
          messageId: message.id,
          userId: input.userId,
          readAt: now,
        })),
        skipDuplicates: true,
      });
    }

    return now;
  });
}

export async function countUnreadMessagesForConversation(input: {
  conversationId: string;
  userId: string;
  lastReadAt?: Date | null;
}) {
  return db.internalChatMessage.count({
    where: {
      conversationId: input.conversationId,
      deletedAt: null,
      senderId: {
        not: input.userId,
      },
      ...(input.lastReadAt
        ? {
            createdAt: {
              gt: input.lastReadAt,
            },
          }
        : {}),
    },
  });
}

export async function listConversationParticipantIds(conversationId: string) {
  const rows = await db.internalChatParticipant.findMany({
    where: {
      conversationId,
      archivedAt: null,
    },
    select: {
      userId: true,
    },
  });

  return rows.map((row) => row.userId);
}

export async function findChatTargetUser(userId: string) {
  return db.user.findFirst({
    where: {
      id: userId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      lastLoginAt: true,
      advogado: {
        select: {
          id: true,
          oab: true,
          seccional: true,
          especialidades: true,
          timeMembros: {
            select: {
              lider: true,
              time: {
                select: {
                  id: true,
                  nome: true,
                  cor: true,
                },
              },
            },
          },
        },
      },
    },
  });
}
