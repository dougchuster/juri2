/**
 * Redis Pub/Sub para eventos de comunicação em tempo real.
 *
 * Resolve o problema do EventEmitter in-process:
 * - EventEmitter só funciona dentro do mesmo worker/processo
 * - Redis Pub/Sub distribui eventos para TODOS os workers/processos
 * - Fallback automático para EventEmitter local se Redis estiver offline
 *
 * Dois clientes separados: publisher e subscriber
 * (regra do ioredis: cliente em modo subscribe não pode publicar)
 */

import "server-only";

import Redis from "ioredis";
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { CanalComunicacao, MessageDirection, MessageStatus } from "@/generated/prisma";

export const REDIS_CHANNEL = "comunicacao:eventos";

/**
 * ID único por processo/worker — evita que o Redis re-entregue eventos
 * para o mesmo worker que os publicou (já foram emitidos localmente).
 */
const WORKER_ID = randomUUID();

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type RealtimePayload =
    | {
          type: "message_created";
          conversationId: string;
          messageId: string;
          direction: MessageDirection;
          canal: CanalComunicacao;
          status: MessageStatus;
          escritorioId: string | null;
      }
    | {
          type: "message_status_updated";
          conversationId: string;
          messageId: string;
          status: MessageStatus;
          escritorioId: string | null;
      }
    | {
          type: "automation_control_updated";
          conversationId: string;
          iaDesabilitada: boolean;
          iaDesabilitadaEm: string | null;
          iaDesabilitadaPor: string | null;
          autoAtendimentoPausado: boolean;
          pausadoAte: string | null;
          motivoPausa: string | null;
          updatedByName: string | null;
          escritorioId: string | null;
      }
    | {
          type: "whatsapp_connection_status_updated";
          connectionId: string;
          status: string;
          qrCode: string | null;
          qrCodeRaw: string | null;
          connectedPhone: string | null;
          connectedName: string | null;
          escritorioId: string | null;
      };

// ─── Singleton global ─────────────────────────────────────────────────────────

const g = globalThis as typeof globalThis & {
    __commsPublisher?: Redis | null;
    __commsSubscriber?: Redis | null;
    __commsLocalEmitter?: EventEmitter;
    __commsRedisAvailable?: boolean;
};

function getRedisUrl(): string | null {
    const raw = process.env.REDIS_URL;
    if (!raw) return null;
    return raw.includes("://") ? raw : `redis://${raw}`;
}

function makeRedisClient(role: "publisher" | "subscriber"): Redis | null {
    const url = getRedisUrl();
    if (!url) return null;

    const client = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true,
        connectTimeout: 3000,
        retryStrategy: (times) => Math.min(500 * Math.pow(2, times), 15_000),
    });

    client.on("error", () => {
        // Silencia — degrada para EventEmitter local
        if (role === "publisher") g.__commsRedisAvailable = false;
    });

    client.on("ready", () => {
        if (role === "publisher") g.__commsRedisAvailable = true;
    });

    return client;
}

function getLocalEmitter(): EventEmitter {
    if (!g.__commsLocalEmitter) {
        g.__commsLocalEmitter = new EventEmitter();
        g.__commsLocalEmitter.setMaxListeners(200);
    }
    return g.__commsLocalEmitter;
}

function getPublisher(): Redis | null {
    if (g.__commsPublisher === undefined) {
        g.__commsPublisher = makeRedisClient("publisher");
    }
    return g.__commsPublisher ?? null;
}

function getSubscriber(): Redis | null {
    if (g.__commsSubscriber === undefined) {
        g.__commsSubscriber = makeRedisClient("subscriber");
    }
    return g.__commsSubscriber ?? null;
}

// ─── Publisher ────────────────────────────────────────────────────────────────

/**
 * Publica um evento no Redis (cross-worker) + emite local (mesmo worker).
 * Se Redis offline, emite apenas localmente (fallback).
 */
export async function publishRealtimeEvent(payload: RealtimePayload): Promise<void> {
    // Emite localmente — o subscriber Redis filtrará mensagens deste worker
    getLocalEmitter().emit("event", payload);

    // Publica no Redis para os DEMAIS workers (inclui workerId para evitar duplicata)
    const pub = getPublisher();
    if (!pub) return;

    try {
        const envelope = { _workerId: WORKER_ID, payload };
        await pub.publish(REDIS_CHANNEL, JSON.stringify(envelope));
    } catch {
        // Redis offline — emissão local já ocorreu acima
    }
}

// ─── Subscriber ───────────────────────────────────────────────────────────────

/**
 * Subscreve nos eventos de comunicação (Redis + local).
 * Retorna função de cleanup para cancelar a subscrição.
 */
export function subscribeRealtimeEvents(
    listener: (payload: RealtimePayload) => void
): () => void {
    // Listener local (mesmo worker)
    const localEmitter = getLocalEmitter();
    localEmitter.on("event", listener);

    // Listener Redis (outros workers)
    const sub = getSubscriber();
    if (!sub) {
        return () => localEmitter.off("event", listener);
    }

    const redisListener = (_channel: string, message: string) => {
        try {
            const envelope = JSON.parse(message) as { _workerId: string; payload: RealtimePayload };
            // Ignora mensagens deste mesmo worker (já entregues via emit local)
            if (envelope._workerId === WORKER_ID) return;
            listener(envelope.payload);
        } catch {
            // Mensagem malformada — ignora
        }
    };

    // Subscrever no canal Redis
    void sub.subscribe(REDIS_CHANNEL).catch(() => {
        // Se falhar, fallback para local já está ativo
    });

    sub.on("message", redisListener);

    return () => {
        localEmitter.off("event", listener);
        sub.off("message", redisListener);
    };
}
