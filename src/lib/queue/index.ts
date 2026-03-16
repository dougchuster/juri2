
import type { ConnectionOptions } from "bullmq";

export const AUTOMACAO_NATIONAL_QUEUE_NAME = "national-orchestrator";

let sharedConnection: ConnectionOptions | null = null;

export function isRedisConfigured() {
  return Boolean(process.env.REDIS_URL?.trim());
}

export function getQueueConnection() {
  if (!isRedisConfigured()) return null;
  if (sharedConnection) return sharedConnection;

  const raw = String(process.env.REDIS_URL || "").trim();
  const normalized = raw && !/^\w+:\/\//.test(raw) ? `redis://${raw}` : raw;

  let redisUrl: URL;
  try {
    redisUrl = new URL(normalized);
  } catch {
    return null;
  }
  const dbRaw = redisUrl.pathname.replace("/", "").trim();
  const db = dbRaw ? Number(dbRaw) : undefined;

  sharedConnection = {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    ...(redisUrl.username ? { username: decodeURIComponent(redisUrl.username) } : {}),
    ...(redisUrl.password ? { password: decodeURIComponent(redisUrl.password) } : {}),
    ...(Number.isFinite(db) ? { db } : {}),
    ...(redisUrl.protocol === "rediss:" ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };

  return sharedConnection;
}

export async function closeQueueConnection() {
  sharedConnection = null;
}
