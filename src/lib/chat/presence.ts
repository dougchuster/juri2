import "server-only";

import Redis from "ioredis";

import type { InternalChatPresenceStatus } from "@/generated/prisma";
import { db } from "@/lib/db";
import { CHAT_LIMITS } from "@/lib/chat/constants";
import { computePresenceStatus, type ChatPresenceComputedStatus } from "@/lib/chat/presence-status";

type PresenceRedisState = {
  connections: number;
  lastActivityAt: string | null;
  lastSeenAt: string | null;
  escritorioId: string | null;
};

export type ChatPresenceSnapshot = {
  userId: string;
  manualStatus: InternalChatPresenceStatus | null;
  computedStatus: ChatPresenceComputedStatus;
  lastSeenAt: string | null;
  lastActivityAt: string | null;
  connected: boolean;
};

const memoryConnections = new Map<string, number>();
const memoryActivity = new Map<string, number>();
const memorySeen = new Map<string, number>();

let redisSingleton: Redis | null | undefined;
let hasLoggedRedisConnectionError = false;

function logRedisFallbackOnce(error: unknown) {
  if (hasLoggedRedisConnectionError) return;
  hasLoggedRedisConnectionError = true;
  console.warn("[chat-presence] Redis unavailable; using in-memory fallback.", error);
}

function getPresenceKey(userId: string) {
  return `chat:presence:${userId}`;
}

function getRedisUrl() {
  const raw = String(process.env.REDIS_URL || "").trim();
  if (!raw) return null;
  return /^\w+:\/\//.test(raw) ? raw : `redis://${raw}`;
}

export function getChatRedis() {
  if (redisSingleton !== undefined) return redisSingleton;

  const url = getRedisUrl();
  if (!url) {
    redisSingleton = null;
    return redisSingleton;
  }

  redisSingleton = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  redisSingleton.on("error", (error) => {
    logRedisFallbackOnce(error);
  });

  return redisSingleton;
}

async function readRedisPresenceState(userId: string): Promise<PresenceRedisState | null> {
  const redis = getChatRedis();
  if (!redis) return null;

  try {
    const payload = await redis.hgetall(getPresenceKey(userId));
    if (!payload || Object.keys(payload).length === 0) return null;

    return {
      connections: Number(payload.connections || 0),
      lastActivityAt: payload.lastActivityAt || null,
      lastSeenAt: payload.lastSeenAt || null,
      escritorioId: payload.escritorioId || null,
    };
  } catch (error) {
    logRedisFallbackOnce(error);
    return null;
  }
}

async function writeRedisPresenceState(
  userId: string,
  patch: Partial<PresenceRedisState>,
  expireSeconds = Math.ceil(CHAT_LIMITS.onlineGraceMs / 1000) * 3
) {
  const redis = getChatRedis();
  if (!redis) return;

  try {
    const key = getPresenceKey(userId);
    const update: Record<string, string> = {};
    if (patch.connections !== undefined) update.connections = String(patch.connections);
    if (patch.lastActivityAt !== undefined && patch.lastActivityAt !== null) {
      update.lastActivityAt = patch.lastActivityAt;
    }
    if (patch.lastSeenAt !== undefined && patch.lastSeenAt !== null) {
      update.lastSeenAt = patch.lastSeenAt;
    }
    if (patch.escritorioId !== undefined && patch.escritorioId !== null) {
      update.escritorioId = patch.escritorioId;
    }

    if (Object.keys(update).length > 0) {
      await redis.hset(key, update);
    }
    await redis.expire(key, expireSeconds);
  } catch (error) {
    logRedisFallbackOnce(error);
  }
}

function resolveMemorySnapshot(userId: string) {
  return {
    connections: memoryConnections.get(userId) || 0,
    lastActivityAt: memoryActivity.get(userId) || null,
    lastSeenAt: memorySeen.get(userId) || null,
  };
}

export async function markPresenceConnected(input: {
  userId: string;
  escritorioId: string;
}) {
  const now = new Date();
  const redisState = await readRedisPresenceState(input.userId);
  const nextConnections = (redisState?.connections || memoryConnections.get(input.userId) || 0) + 1;

  memoryConnections.set(input.userId, nextConnections);
  memoryActivity.set(input.userId, now.getTime());

  await writeRedisPresenceState(input.userId, {
    connections: nextConnections,
    lastActivityAt: now.toISOString(),
    escritorioId: input.escritorioId,
  });

  await db.internalChatPresence.upsert({
    where: { userId: input.userId },
    update: {
      escritorioId: input.escritorioId,
      lastActivityAt: now,
      lastSeenAt: now,
    },
    create: {
      userId: input.userId,
      escritorioId: input.escritorioId,
      lastActivityAt: now,
      lastSeenAt: now,
    },
  });
}

export async function markPresenceActivity(input: {
  userId: string;
  escritorioId: string;
}) {
  const now = new Date();
  memoryActivity.set(input.userId, now.getTime());

  await writeRedisPresenceState(input.userId, {
    lastActivityAt: now.toISOString(),
    escritorioId: input.escritorioId,
  });

  await db.internalChatPresence.upsert({
    where: { userId: input.userId },
    update: {
      escritorioId: input.escritorioId,
      lastActivityAt: now,
      lastSeenAt: now,
    },
    create: {
      userId: input.userId,
      escritorioId: input.escritorioId,
      lastActivityAt: now,
      lastSeenAt: now,
    },
  });
}

export async function markPresenceDisconnected(input: {
  userId: string;
  escritorioId: string;
}) {
  const now = new Date();
  const redisState = await readRedisPresenceState(input.userId);
  const baseConnections = redisState?.connections ?? memoryConnections.get(input.userId) ?? 0;
  const nextConnections = Math.max(0, baseConnections - 1);

  if (nextConnections > 0) {
    memoryConnections.set(input.userId, nextConnections);
  } else {
    memoryConnections.delete(input.userId);
  }
  memorySeen.set(input.userId, now.getTime());

  await writeRedisPresenceState(input.userId, {
    connections: nextConnections,
    lastSeenAt: now.toISOString(),
    escritorioId: input.escritorioId,
  });

  await db.internalChatPresence.upsert({
    where: { userId: input.userId },
    update: {
      escritorioId: input.escritorioId,
      lastSeenAt: now,
    },
    create: {
      userId: input.userId,
      escritorioId: input.escritorioId,
      lastSeenAt: now,
    },
  });
}

export async function setManualPresenceStatus(input: {
  userId: string;
  escritorioId: string;
  manualStatus: InternalChatPresenceStatus | null;
}) {
  const now = new Date();
  return db.internalChatPresence.upsert({
    where: { userId: input.userId },
    update: {
      escritorioId: input.escritorioId,
      manualStatus: input.manualStatus,
      lastActivityAt: now,
      lastSeenAt: now,
    },
    create: {
      userId: input.userId,
      escritorioId: input.escritorioId,
      manualStatus: input.manualStatus,
      lastActivityAt: now,
      lastSeenAt: now,
    },
  });
}

export async function getPresenceSnapshotForUser(
  userId: string
): Promise<ChatPresenceSnapshot | null> {
  const [dbPresence, redisState] = await Promise.all([
    db.internalChatPresence.findUnique({
      where: { userId },
      select: {
        userId: true,
        manualStatus: true,
        lastSeenAt: true,
        lastActivityAt: true,
      },
    }),
    readRedisPresenceState(userId),
  ]);

  const memory = resolveMemorySnapshot(userId);
  const lastActivityAt =
    redisState?.lastActivityAt ||
    (memory.lastActivityAt ? new Date(memory.lastActivityAt).toISOString() : null) ||
    dbPresence?.lastActivityAt?.toISOString() ||
    null;
  const lastSeenAt =
    redisState?.lastSeenAt ||
    (memory.lastSeenAt ? new Date(memory.lastSeenAt).toISOString() : null) ||
    dbPresence?.lastSeenAt?.toISOString() ||
    null;
  const connected =
    (redisState?.connections || 0) > 0 ||
    (memory.connections || 0) > 0 ||
    Boolean(lastActivityAt && Date.now() - new Date(lastActivityAt).getTime() <= CHAT_LIMITS.onlineGraceMs);

  if (!dbPresence && !redisState && !memory.connections && !memory.lastActivityAt && !memory.lastSeenAt) {
    return null;
  }

  return {
    userId,
    manualStatus: dbPresence?.manualStatus || null,
    computedStatus: computePresenceStatus({
      manualStatus: dbPresence?.manualStatus,
      lastActivityAt,
      connected,
    }),
    lastSeenAt,
    lastActivityAt,
    connected,
  };
}

export async function getPresenceSnapshots(userIds: string[]) {
  const entries = await Promise.all(userIds.map(async (userId) => [userId, await getPresenceSnapshotForUser(userId)] as const));
  return Object.fromEntries(
    entries.map(([userId, snapshot]) => [
      userId,
      snapshot || {
        userId,
        manualStatus: null,
        computedStatus: "OFFLINE" as const,
        lastSeenAt: null,
        lastActivityAt: null,
        connected: false,
      },
    ])
  );
}
