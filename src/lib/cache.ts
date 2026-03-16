/**
 * Cache Redis para dados estáticos/semi-estáticos do sistema.
 *
 * Uso:
 *   const feriados = await cache.getOrSet("feriados:2026", () => db.feriado.findMany(), 3600);
 *
 * Se Redis indisponível, executa o fetcher diretamente (sem cache).
 * TTL padrão: 1 hora (3600 segundos).
 */

import { getRedisClient } from "./redis";

const DEFAULT_TTL_SEC = 3600;

export const cache = {
    /**
     * Retorna valor do cache ou executa o fetcher e armazena o resultado.
     */
    async getOrSet<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttlSeconds = DEFAULT_TTL_SEC
    ): Promise<T> {
        const redis = getRedisClient();

        if (redis) {
            try {
                const cached = await redis.get(key);
                if (cached !== null) {
                    return JSON.parse(cached) as T;
                }
            } catch {
                // Cache miss ou erro de conexão — continua para o fetcher
            }
        }

        const value = await fetcher();

        if (redis) {
            try {
                await redis.setex(key, ttlSeconds, JSON.stringify(value));
            } catch {
                // Falha ao salvar no cache — retorna o valor sem cachear
            }
        }

        return value;
    },

    /**
     * Invalida uma chave ou padrão de chaves.
     */
    async invalidate(pattern: string): Promise<void> {
        const redis = getRedisClient();
        if (!redis) return;

        try {
            if (pattern.includes("*")) {
                // Scan + delete para padrões com wildcard
                let cursor = "0";
                do {
                    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
                    cursor = nextCursor;
                    if (keys.length > 0) {
                        await redis.del(...keys);
                    }
                } while (cursor !== "0");
            } else {
                await redis.del(pattern);
            }
        } catch {
            // Ignora erros de invalidação
        }
    },

    /**
     * Define um valor diretamente (sem fetcher).
     */
    async set<T>(key: string, value: T, ttlSeconds = DEFAULT_TTL_SEC): Promise<void> {
        const redis = getRedisClient();
        if (!redis) return;

        try {
            await redis.setex(key, ttlSeconds, JSON.stringify(value));
        } catch {
            // Silencia
        }
    },

    /**
     * Lê um valor diretamente.
     */
    async get<T>(key: string): Promise<T | null> {
        const redis = getRedisClient();
        if (!redis) return null;

        try {
            const raw = await redis.get(key);
            return raw ? (JSON.parse(raw) as T) : null;
        } catch {
            return null;
        }
    },
};

// ── Chaves de cache pré-definidas ──────────────────────────────────────────────

export const CacheKeys = {
    feriados: (ano: number) => `feriados:${ano}`,
    tiposAcao: (escritorioId: string) => `tipos_acao:${escritorioId}`,
    fasesProcessuais: (escritorioId: string) => `fases_processuais:${escritorioId}`,
    origensCliente: () => "origens_cliente",
    crmConfig: (escritorioId: string) => `crm_config:${escritorioId}`,
    tribunais: () => "tribunais_catalogo",
    escritorioConfig: (escritorioId: string) => `escritorio_config:${escritorioId}`,
} as const;
