import "server-only";

import type { Server as HttpServer } from "node:http";

import { createAdapter } from "@socket.io/redis-streams-adapter";
import type { InternalChatPresenceStatus } from "@/generated/prisma";
import { getChatAuthUserByToken, resolveChatEscritorioId, type ChatAuthUser } from "@/lib/chat/auth";
import {
  CHAT_SOCKET_EVENTS,
  CHAT_SOCKET_ROOMS,
} from "@/lib/chat/constants";
import { db } from "@/lib/db";
import {
  getInternalChatUnreadCount,
  getOrCreateInternalDirectConversation,
  getInternalChatConversations,
} from "@/lib/chat/service";
import {
  getPresenceSnapshotForUser,
  getChatRedis,
  markPresenceActivity,
  markPresenceConnected,
  markPresenceDisconnected,
  setManualPresenceStatus,
} from "@/lib/chat/presence";
import { assertConversationParticipant } from "@/lib/chat/auth";
import { Server as SocketIOServer } from "socket.io";

type SocketData = {
  user: ChatAuthUser;
};

type ChatSocketServer = SocketIOServer<Record<string, never>, Record<string, never>, Record<string, never>, SocketData>;

const globalForChatSocket = globalThis as typeof globalThis & {
  __internalChatIo?: ChatSocketServer;
};

function parseCookies(header: string | undefined) {
  return Object.fromEntries(
    String(header || "")
      .split(";")
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const [key, ...rest] = chunk.split("=");
        return [key, decodeURIComponent(rest.join("="))];
      })
  );
}

async function resolveSocketUser(cookieHeader: string | undefined) {
  const cookies = parseCookies(cookieHeader);
  const token = cookies.session_token || "";
  return getChatAuthUserByToken(token);
}

async function ensureRedisAdapter(io: ChatSocketServer) {
  const redis = getChatRedis();
  if (!redis) return;

  try {
    if (redis.status === "wait") {
      await redis.connect();
    }
    io.adapter(createAdapter(redis));
  } catch (error) {
    console.error("[chat-socket] Failed to initialize Redis Streams adapter:", error);
  }
}

async function emitPresenceUpdate(io: ChatSocketServer, user: ChatAuthUser) {
  const snapshot = await getPresenceSnapshotForUser(user.id);
  io.to(CHAT_SOCKET_ROOMS.escritorio(user.escritorioId!)).emit(CHAT_SOCKET_EVENTS.presenceUpdate, {
    userId: user.id,
    presence: snapshot,
  });
}

async function emitUnreadUpdate(io: ChatSocketServer, userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds));
  await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const dbUser = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          isActive: true,
          advogado: { select: { id: true } },
        },
      });
      if (!dbUser?.isActive) return;

      const escritorioId = await resolveChatEscritorioId();
      if (!escritorioId) return;

      const user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        avatarUrl: dbUser.avatarUrl || null,
        isActive: dbUser.isActive,
        advogadoId: dbUser.advogado?.id || null,
        escritorioId,
      } satisfies ChatAuthUser;

      const unreadCount = await getInternalChatUnreadCount(user);
      io.to(CHAT_SOCKET_ROOMS.user(user.id)).emit(CHAT_SOCKET_EVENTS.unreadUpdate, {
        userId: user.id,
        unreadCount,
      });
    })
  );
}

export async function initializeChatSocketServer(server: HttpServer) {
  if (globalForChatSocket.__internalChatIo) {
    return globalForChatSocket.__internalChatIo;
  }

  const io: ChatSocketServer = new SocketIOServer(server, {
    path: "/socket.io",
    addTrailingSlash: false,
    cors: {
      origin: true,
      credentials: true,
    },
  });

  await ensureRedisAdapter(io);

  io.use(async (socket, next) => {
    try {
      const user = await resolveSocketUser(socket.handshake.headers.cookie);
      if (!user || !user.escritorioId) {
        next(new Error("UNAUTHORIZED_CHAT"));
        return;
      }
      socket.data.user = user;
      next();
    } catch (error) {
      next(error as Error);
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.data.user;
    await markPresenceConnected({
      userId: user.id,
      escritorioId: user.escritorioId!,
    });

    socket.join(CHAT_SOCKET_ROOMS.user(user.id));
    socket.join(CHAT_SOCKET_ROOMS.escritorio(user.escritorioId!));

    const conversations = await getInternalChatConversations(user);
    conversations.forEach((conversation) => {
      socket.join(CHAT_SOCKET_ROOMS.conversation(conversation.id));
    });

    await emitPresenceUpdate(io, user);
    await emitUnreadUpdate(io, [user.id]);

    socket.on(CHAT_SOCKET_EVENTS.heartbeat, async () => {
      await markPresenceActivity({
        userId: user.id,
        escritorioId: user.escritorioId!,
      });
      await emitPresenceUpdate(io, user);
    });

    socket.on(CHAT_SOCKET_EVENTS.joinConversation, async (payload: { conversationId?: string; targetUserId?: string }) => {
      if (payload.targetUserId) {
        const conversation = await getOrCreateInternalDirectConversation(payload.targetUserId, user);
        if (conversation?.id) {
          socket.join(CHAT_SOCKET_ROOMS.conversation(conversation.id));
        }
        return;
      }

      if (!payload.conversationId) return;
      await assertConversationParticipant(payload.conversationId, user.id, user.escritorioId!);
      socket.join(CHAT_SOCKET_ROOMS.conversation(payload.conversationId));
    });

    socket.on(CHAT_SOCKET_EVENTS.leaveConversation, async (payload: { conversationId?: string }) => {
      if (!payload.conversationId) return;
      socket.leave(CHAT_SOCKET_ROOMS.conversation(payload.conversationId));
    });

    socket.on(CHAT_SOCKET_EVENTS.typingSet, async (payload: { conversationId?: string; active?: boolean }) => {
      if (!payload.conversationId) return;
      await assertConversationParticipant(payload.conversationId, user.id, user.escritorioId!);
      io.to(CHAT_SOCKET_ROOMS.conversation(payload.conversationId)).except(socket.id).emit(
        payload.active ? CHAT_SOCKET_EVENTS.typingStart : CHAT_SOCKET_EVENTS.typingStop,
        {
          conversationId: payload.conversationId,
          userId: user.id,
        }
      );
    });

    socket.on(CHAT_SOCKET_EVENTS.manualStatus, async (payload: { manualStatus?: InternalChatPresenceStatus | null }) => {
      const nextStatus =
        payload.manualStatus === null || payload.manualStatus === undefined ? null : payload.manualStatus;
      await setManualPresenceStatus({
        userId: user.id,
        escritorioId: user.escritorioId!,
        manualStatus: nextStatus,
      });
      await emitPresenceUpdate(io, user);
    });

    socket.on("disconnect", async () => {
      await markPresenceDisconnected({
        userId: user.id,
        escritorioId: user.escritorioId!,
      });
      await emitPresenceUpdate(io, user);
    });
  });

  globalForChatSocket.__internalChatIo = io;
  return io;
}

export function getChatSocketServer() {
  return globalForChatSocket.__internalChatIo || null;
}

export async function emitChatConversationCreated(userIds: string[], payload: unknown) {
  const io = getChatSocketServer();
  if (!io) return;
  userIds.forEach((userId) => {
    io.to(CHAT_SOCKET_ROOMS.user(userId)).emit(CHAT_SOCKET_EVENTS.conversationCreated, payload);
  });
  await emitUnreadUpdate(io, userIds);
}

export async function emitChatMessageCreated(conversationId: string, userIds: string[], payload: unknown) {
  const io = getChatSocketServer();
  if (!io) return;
  io.to(CHAT_SOCKET_ROOMS.conversation(conversationId)).emit(CHAT_SOCKET_EVENTS.messageNew, payload);
  await emitUnreadUpdate(io, userIds);
}

export async function emitChatMessageRead(conversationId: string, userIds: string[], payload: unknown) {
  const io = getChatSocketServer();
  if (!io) return;
  io.to(CHAT_SOCKET_ROOMS.conversation(conversationId)).emit(CHAT_SOCKET_EVENTS.messageRead, payload);
  await emitUnreadUpdate(io, userIds);
}

export async function emitChatPresenceUpdateForUser(user: ChatAuthUser) {
  const io = getChatSocketServer();
  if (!io) return;
  await emitPresenceUpdate(io, user);
}

export function emitCommunicationAutomationControlUpdated(payload: {
  conversationId: string;
  iaDesabilitada: boolean;
  iaDesabilitadaEm: string | null;
  iaDesabilitadaPor: string | null;
  autoAtendimentoPausado: boolean;
  pausadoAte: string | null;
  motivoPausa: string | null;
  updatedByName: string | null;
}) {
  const io = getChatSocketServer();
  if (!io) return;
  (io as unknown as { emit: (event: string, payload: unknown) => void }).emit(
    "comunicacao:automation-control-updated",
    payload
  );
}
