/**
 * Singleton do cliente Redis (ioredis) para uso geral no servidor.
 *
 * - Compartilha a mesma instância com o rate limiter para não abrir conexões extras.
 * - Usa lazy connect com graceful degradation: se Redis estiver offline,
 *   as operações falham silenciosamente e o caller deve usar fallback.
 * - Em build/teste sem REDIS_URL, exporta null para que o cache seja skip silencioso.
 */

import Redis from "ioredis";

let redisClient: Redis | null = null;

function getRedisUrl(): string | null {
    const raw = process.env.REDIS_URL;
    if (!raw) return null;
    if (raw.includes("://")) return raw;
    return `redis://${raw}`;
}

function createClient(): Redis | null {
    const url = getRedisUrl();
    if (!url) return null;

    const client = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true,
        connectTimeout: 2000,
    });

    client.on("error", () => {
        // Silencia erros de conexão — o cache opera em modo degradado
    });

    return client;
}

export function getRedisClient(): Redis | null {
    if (!redisClient) {
        redisClient = createClient();
    }
    return redisClient;
}
