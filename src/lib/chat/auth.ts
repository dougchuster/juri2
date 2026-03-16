import "server-only";

import type { Role } from "@/generated/prisma";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_INACTIVITY_MS = 30 * 60 * 1000;
const SESSION_REFRESH_THRESHOLD_MS = 10 * 60 * 1000;

const CHAT_ALLOWED_ROLES = new Set<Role>([
  "ADMIN",
  "SOCIO",
  "ADVOGADO",
  "CONTROLADOR",
  "ASSISTENTE",
  "FINANCEIRO",
  "SECRETARIA",
]);

export type ChatAuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  isActive: boolean;
  advogadoId: string | null;
  escritorioId: string | null;
};

export async function resolveChatEscritorioId() {
  const escritorio = await db.escritorio.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  return escritorio?.id || null;
}

export async function getChatAuthUser(): Promise<ChatAuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value || "";
  if (!token) return null;
  return getChatAuthUserByToken(token);
}

export async function getChatAuthUserByToken(token: string): Promise<ChatAuthUser | null> {
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          isActive: true,
          advogado: {
            select: { id: true },
          },
        },
      },
    },
  });

  const now = new Date();
  if (!session || session.expiresAt < now || !session.user.isActive) {
    if (session) {
      await db.session.delete({ where: { token } }).catch(() => null);
    }
    return null;
  }

  if (!CHAT_ALLOWED_ROLES.has(session.user.role)) {
    return null;
  }

  const remainingMs = session.expiresAt.getTime() - now.getTime();
  if (remainingMs <= SESSION_REFRESH_THRESHOLD_MS) {
    await db.session.update({
      where: { token },
      data: { expiresAt: new Date(now.getTime() + SESSION_INACTIVITY_MS) },
    });
  }

  const escritorioId = await resolveChatEscritorioId();

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    avatarUrl: session.user.avatarUrl || null,
    isActive: session.user.isActive,
    advogadoId: session.user.advogado?.id || null,
    escritorioId,
  };
}

export async function listChatDirectoryUsers(currentUserId: string) {
  return listChatUsers({
    excludeUserId: currentUserId,
  });
}

export async function listChatUsers(input?: {
  excludeUserId?: string;
  userIds?: string[];
}) {
  const escritorioId = await resolveChatEscritorioId();
  if (!escritorioId) return [];

  return db.user.findMany({
    where: {
      isActive: true,
      ...(input?.excludeUserId || input?.userIds?.length
        ? {
            id: {
              ...(input?.excludeUserId ? { not: input.excludeUserId } : {}),
              ...(input?.userIds?.length ? { in: input.userIds } : {}),
            },
          }
        : {}),
      role: { in: Array.from(CHAT_ALLOWED_ROLES) },
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
    orderBy: { name: "asc" },
  });
}

export async function assertConversationParticipant(
  conversationId: string,
  userId: string,
  escritorioId: string
) {
  const participant = await db.internalChatParticipant.findFirst({
    where: {
      conversationId,
      userId,
      escritorioId,
      archivedAt: null,
      conversation: {
        archivedAt: null,
      },
    },
    select: {
      id: true,
      conversation: {
        select: {
          id: true,
          escritorioId: true,
        },
      },
    },
  });

  if (!participant) {
    throw new Error("FORBIDDEN_CHAT_CONVERSATION");
  }

  return participant;
}

export async function getChatAuthOrThrow() {
  const user = await getChatAuthUser();
  if (!user) {
    throw new Error("UNAUTHORIZED_CHAT");
  }
  if (!user.escritorioId) {
    throw new Error("MISSING_CHAT_ESCRITORIO");
  }
  return user;
}
