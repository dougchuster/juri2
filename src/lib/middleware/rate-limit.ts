/**
 * Rate limiter com Redis-backed storage + fallback in-memory
 * Funciona em multi-instância/Vercel quando Redis está disponível.
 * Degradação graciosa: se Redis estiver offline, usa Map em memória.
 */

import Redis from "ioredis";

// ── Redis singleton (compartilhado) ──────────────────────────────────────────

let redisClient: Redis | null | undefined;

function getRedisUrl(): string | null {
    const raw = String(process.env.REDIS_URL || "").trim();
    if (!raw) return null;
    return /^\w+:\/\//.test(raw) ? raw : `redis://${raw}`;
}

function getRedis(): Redis | null {
    if (redisClient !== undefined) return redisClient;
    const url = getRedisUrl();
    if (!url) {
        redisClient = null;
        return null;
    }
    redisClient = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true,
        connectTimeout: 2000,
    });
    redisClient.on("error", () => {
        // silencia erros de conexão para não poluir logs — fallback in-memory assume
    });
    return redisClient;
}

// ── In-memory fallback ────────────────────────────────────────────────────────

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore) {
        if (entry.resetAt < now) memoryStore.delete(key);
    }
}, 5 * 60 * 1000);

function checkInMemory(
    key: string,
    maxRequests: number,
    windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = memoryStore.get(key);

    if (!entry || entry.resetAt < now) {
        memoryStore.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
    }

    entry.count++;
    memoryStore.set(key, entry);
    return {
        allowed: entry.count <= maxRequests,
        remaining: Math.max(0, maxRequests - entry.count),
        resetAt: entry.resetAt,
    };
}

// ── Redis-backed check ────────────────────────────────────────────────────────

async function checkRedis(
    redis: Redis,
    key: string,
    maxRequests: number,
    windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const windowSec = Math.ceil(windowMs / 1000);
    const now = Date.now();

    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.pttl(key);
    const results = await pipeline.exec();

    if (!results) throw new Error("Redis pipeline returned null");

    const count = results[0][1] as number;
    let ttlMs = results[1][1] as number;

    // Define TTL no primeiro acesso
    if (count === 1 || ttlMs < 0) {
        await redis.expire(key, windowSec);
        ttlMs = windowMs;
    }

    const resetAt = now + ttlMs;
    return {
        allowed: count <= maxRequests,
        remaining: Math.max(0, maxRequests - count),
        resetAt,
    };
}

// ── Interface pública ─────────────────────────────────────────────────────────

export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    /** Prefixo para isolar limites por contexto (ex: "login", "api", "webhook") */
    prefix?: string;
}

export async function checkRateLimitAsync(
    identifier: string,
    config: RateLimitConfig = { maxRequests: 100, windowMs: 60_000 }
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const prefix = config.prefix ?? "rl";
    const key = `${prefix}:${identifier}`;

    const redis = getRedis();
    if (redis) {
        try {
            return await checkRedis(redis, key, config.maxRequests, config.windowMs);
        } catch {
            // Redis falhou — usa fallback in-memory
        }
    }

    return checkInMemory(key, config.maxRequests, config.windowMs);
}

/**
 * Versão síncrona mantida para retrocompatibilidade (somente in-memory).
 * Prefira checkRateLimitAsync para novos usos.
 */
export function checkRateLimit(
    ip: string,
    config: RateLimitConfig = { maxRequests: 100, windowMs: 60_000 }
): { allowed: boolean; remaining: number; resetAt: number } {
    const prefix = config.prefix ?? "rl";
    return checkInMemory(`${prefix}:${ip}`, config.maxRequests, config.windowMs);
}

/**
 * Obtém o IP real do cliente (suporta proxies, Cloudflare, Vercel)
 */
export function getClientIp(headers: Headers): string {
    return (
        headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headers.get("x-real-ip") ||
        headers.get("cf-connecting-ip") ||
        "unknown"
    );
}
