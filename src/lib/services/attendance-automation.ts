import "server-only";

import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { getChatRedis } from "@/lib/chat/presence";
import { askGemini, isGeminiConfigured } from "@/lib/services/ai-gemini";
import { sendWhatsappDirectText } from "@/lib/whatsapp/application/message-service";
import { enqueueAttendanceAutomationJob } from "@/lib/queue/attendance-automation-queue";
import {
    parseHumanizedStyle,
    serializeHumanizedStyle,
} from "@/lib/services/attendance-automation-config";
import { emitCommunicationMessageCreated } from "@/lib/comunicacao/realtime";
import {
    type AttendanceAutomationFlowLike,
    buildAttendanceAutomationPrompt,
    canSendAutomatedReply,
    detectAttendanceUrgency,
    evaluateAttendanceAutomationFlow,
    replaceAttendanceAutomationVars,
} from "@/lib/services/attendance-automation-core";

const DEFAULT_FLOW_DEFINITIONS = [
    {
        name: "Recepcao fora do horario",
        description: "Responde de forma humanizada quando o escritorio recebe mensagens apos o horario comercial.",
        canal: "WHATSAPP" as const,
        isActive: true,
        priority: 10,
        triggerType: "AFTER_HOURS" as const,
        keywordMode: "ANY",
        keywords: [],
        businessHoursStart: 8,
        businessHoursEnd: 18,
        timezone: "America/Sao_Paulo",
        initialReplyTemplate:
            "Oi {nome}, aqui e a assistente virtual do {escritorio}. Nosso atendimento humano funciona das {inicio}h as {fim}h, mas eu ja registrei sua mensagem e posso adiantar o pre-atendimento por aqui.",
        followUpReplyTemplate:
            "Entendi, {nome}. Posso coletar o assunto inicial e deixar tudo organizado para a equipe. Me diga em uma frase o que voce precisa e, se for urgente, sinalize isso na mensagem.",
        aiEnabled: true,
        aiModel: "gemini-3.1-flash-lite-preview",
        aiInstructions:
            "Acolha a pessoa, colete o assunto principal, identifique se e cliente novo ou atual e jamais prometa analise juridica completa fora do horario.",
        humanizedStyle: serializeHumanizedStyle({ presetId: "cordial_profissional" }),
        maxAutoReplies: 3,
        cooldownMinutes: 3,
    },
    {
        name: "Triagem inteligente inicial",
        description: "Atende mensagens de consulta, agendamento, honorarios e documentacao com resposta contextual.",
        canal: "WHATSAPP" as const,
        isActive: true,
        priority: 20,
        triggerType: "KEYWORD" as const,
        keywordMode: "ANY",
        keywords: ["consulta", "agendar", "agendamento", "honorarios", "valor", "documento", "atendimento"],
        businessHoursStart: 8,
        businessHoursEnd: 18,
        timezone: "America/Sao_Paulo",
        initialReplyTemplate:
            "Oi {nome}, posso te ajudar com um pre-atendimento inicial do {escritorio}. Me diga resumidamente o assunto, se voce ja e cliente e qual o seu objetivo com esse contato.",
        followUpReplyTemplate:
            "Perfeito. Vou seguir com a triagem e organizar sua demanda para a equipe. Se tiver numero de processo, cidade ou urgencia, pode me enviar agora.",
        aiEnabled: true,
        aiModel: "gemini-3.1-flash-lite-preview",
        aiInstructions:
            "Responda como recepcao juridica inteligente, fazendo no maximo duas perguntas objetivas por vez e conduzindo o usuario para triagem.",
        humanizedStyle: serializeHumanizedStyle({ presetId: "acolhedor_empatico" }),
        maxAutoReplies: 4,
        cooldownMinutes: 2,
    },
];

const AUTOMATION_BURST_WINDOW_MS = 4_000;
const AUTOMATION_RECENT_OPENINGS_KEY_PREFIX = "attendance:conversation:";
const AUTOMATION_LOCK_KEY_PREFIX = "attendance:lock:";
const AUTOMATION_LOCK_TTL_SECONDS = 180;
const conversationAutomationLocks = new Map<string, Promise<void>>();

export type AttendanceAutomationPreview = {
    flowName: string | null;
    reason: string | null;
    reply: string;
    mode: "ai" | "template" | "fallback" | null;
};

export type AttendanceAutomationRunResult = {
    handled: boolean;
    reason: string | null;
    flowId?: string;
    mode?: "ai" | "template" | "fallback" | null;
    preview?: AttendanceAutomationPreview;
};

function hasAttendanceAutomationDelegates() {
    const dynamicDb = db as unknown as Record<string, unknown>;
    return ["attendanceAutomationFlow", "attendanceAutomationSession", "attendanceAutomationEvent"].every(
        (delegate) => typeof dynamicDb[delegate] !== "undefined"
    );
}

function trimText(value: string | null | undefined, max = 1200) {
    const normalized = (value || "").replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1)}...`;
}

function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withMemoryConversationAutomationLock<T>(conversationId: string, fn: () => Promise<T>) {
    const previous = conversationAutomationLocks.get(conversationId) || Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
        release = resolve;
    });
    const queued = previous.finally(() => current);

    conversationAutomationLocks.set(conversationId, queued);

    await previous;
    try {
        return await fn();
    } finally {
        release();
        if (conversationAutomationLocks.get(conversationId) === queued) {
            conversationAutomationLocks.delete(conversationId);
        }
    }
}

function buildConversationAutomationLockKey(conversationId: string) {
    return `${AUTOMATION_LOCK_KEY_PREFIX}${conversationId}`;
}

async function acquireConversationAutomationRedisLock(conversationId: string) {
    const redis = getChatRedis();
    if (!redis) return null;

    const token = randomUUID();
    const key = buildConversationAutomationLockKey(conversationId);

    if (redis.status === "wait") {
        await redis.connect();
    }

    for (let attempt = 0; attempt < 40; attempt += 1) {
        const result = await redis.set(key, token, "EX", AUTOMATION_LOCK_TTL_SECONDS, "NX");
        if (result === "OK") {
            return { redis, key, token };
        }
        await wait(400);
    }

    return null;
}

async function releaseConversationAutomationRedisLock(input: {
    redis: NonNullable<ReturnType<typeof getChatRedis>>;
    key: string;
    token: string;
}) {
    await input.redis.eval(
        `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            end
            return 0
        `,
        1,
        input.key,
        input.token
    );
}

async function withConversationAutomationLock<T>(conversationId: string, fn: () => Promise<T>) {
    try {
        const redisLock = await acquireConversationAutomationRedisLock(conversationId);
        if (!redisLock) {
            return await withMemoryConversationAutomationLock(conversationId, fn);
        }

        try {
            return await fn();
        } finally {
            await releaseConversationAutomationRedisLock(redisLock);
        }
    } catch (error) {
        console.warn("[attendance-automation] Falling back to in-memory lock:", error);
        return await withMemoryConversationAutomationLock(conversationId, fn);
    }
}

function collectPendingInboundBurst(
    messages: Array<{
        id: string;
        content: string;
        createdAt: Date;
    }>
) {
    if (messages.length === 0) return messages;

    const burst = [messages[messages.length - 1]];
    for (let index = messages.length - 2; index >= 0; index -= 1) {
        const current = messages[index];
        const next = burst[0];
        if (next.createdAt.getTime() - current.createdAt.getTime() > AUTOMATION_BURST_WINDOW_MS) {
            break;
        }
        burst.unshift(current);
    }

    return burst;
}

async function getOfficeName() {
    const escritorio = await db.escritorio.findFirst({
        orderBy: { createdAt: "asc" },
        select: { nome: true },
    });
    return escritorio?.nome || "Escritorio Juridico";
}

function buildTemplateVars(input: {
    clientName: string;
    officeName: string;
    flow: {
        businessHoursStart: number;
        businessHoursEnd: number;
    };
}) {
    return {
        nome: input.clientName,
        escritorio: input.officeName,
        inicio: input.flow.businessHoursStart,
        fim: input.flow.businessHoursEnd,
    };
}

function buildUrgencyReplyTemplate(input: {
    clientName: string;
    officeName: string;
    flow: {
        businessHoursStart: number;
        businessHoursEnd: number;
    };
    incomingText: string;
}) {
    const normalized = input.incomingText.toLowerCase();
    if (normalized.includes("pres") || normalized.includes("pris") || normalized.includes("delegacia")) {
        return replaceAttendanceAutomationVars(
            "Entendi a urgencia, {nome}. Vamos tentar acionar a equipe o mais rapido possivel para verificar esse caso de prisao. Ja deixei seu atendimento com prioridade maxima. Me confirme so dois pontos, se puder: em qual cidade ou delegacia ele esta e se ja houve audiencia ou contato com algum advogado.",
            buildTemplateVars(input)
        );
    }

    return replaceAttendanceAutomationVars(
        "Entendi a urgencia, {nome}. Vamos tentar acionar a equipe o mais rapido possivel para verificar seu caso. Nosso atendimento humano funciona das {inicio}h as {fim}h, mas eu ja vou deixar sua mensagem marcada com prioridade maxima. Se puder, me diga em uma frase o que aconteceu e onde voce esta agora.",
        buildTemplateVars(input)
    );
}

function buildRecentOpeningsRedisKey(conversationId: string) {
    return `${AUTOMATION_RECENT_OPENINGS_KEY_PREFIX}${conversationId}:recent-openings`;
}

function extractReplyOpening(content: string) {
    return trimText(content, 180)
        .split(" ")
        .slice(0, 5)
        .join(" ")
        .trim();
}

async function listRecentReplyOpenings(conversationId: string) {
    const redis = getChatRedis();
    if (!redis) return [] as string[];

    try {
        if (redis.status === "wait") {
            await redis.connect();
        }
        const values = await redis.lrange(buildRecentOpeningsRedisKey(conversationId), 0, 2);
        return values.map((item) => trimText(item, 120)).filter(Boolean);
    } catch (error) {
        console.error("[attendance-automation] Failed to read recent openings:", error);
        return [] as string[];
    }
}

async function rememberRecentReplyOpening(conversationId: string, content: string) {
    const redis = getChatRedis();
    const opening = extractReplyOpening(content);
    if (!redis || !opening) return;

    try {
        if (redis.status === "wait") {
            await redis.connect();
        }
        const key = buildRecentOpeningsRedisKey(conversationId);
        await redis.lpush(key, opening);
        await redis.ltrim(key, 0, 2);
        await redis.expire(key, 3600);
    } catch (error) {
        console.error("[attendance-automation] Failed to persist recent opening:", error);
    }
}

async function resolveConversationAutomationGate(input: {
    conversationId: string;
    iaDesabilitada: boolean;
    autoAtendimentoPausado: boolean;
    pausadoAte: Date | null;
}) {
    if (input.autoAtendimentoPausado && input.pausadoAte && input.pausadoAte.getTime() <= Date.now()) {
        await db.conversation.update({
            where: { id: input.conversationId },
            data: {
                autoAtendimentoPausado: false,
                pausadoAte: null,
                motivoPausa: null,
            },
        });
        return {
            blocked: false,
            iaDesabilitada: input.iaDesabilitada,
            autoAtendimentoPausado: false,
            pausadoAte: null,
            reason: null,
        };
    }

    if (input.iaDesabilitada) {
        return {
            blocked: true,
            iaDesabilitada: true,
            autoAtendimentoPausado: input.autoAtendimentoPausado,
            pausadoAte: input.pausadoAte,
            reason: "IA desabilitada manualmente para esta conversa.",
        };
    }

    if (input.autoAtendimentoPausado) {
        return {
            blocked: true,
            iaDesabilitada: input.iaDesabilitada,
            autoAtendimentoPausado: true,
            pausadoAte: input.pausadoAte,
            reason: input.pausadoAte
                ? "Autoatendimento pausado temporariamente para esta conversa."
                : "Autoatendimento pausado manualmente para esta conversa.",
        };
    }

    return {
        blocked: false,
        iaDesabilitada: input.iaDesabilitada,
        autoAtendimentoPausado: input.autoAtendimentoPausado,
        pausadoAte: input.pausadoAte,
        reason: null,
    };
}

async function createAutomationEvent(input: {
    conversationId: string;
    flowId?: string | null;
    sessionId?: string | null;
    messageId?: string | null;
    eventType:
        | "INBOUND_EVALUATED"
        | "FLOW_MATCHED"
        | "AUTO_REPLIED"
        | "AI_REPLIED"
        | "FALLBACK_REPLIED"
        | "ERROR"
        | "SESSION_PAUSED";
    content?: string | null;
    metadata?: Record<string, unknown> | null;
}) {
    return db.attendanceAutomationEvent.create({
        data: {
            conversationId: input.conversationId,
            flowId: input.flowId || null,
            sessionId: input.sessionId || null,
            messageId: input.messageId || null,
            eventType: input.eventType,
            content: input.content || null,
            metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
        },
    });
}

async function buildAutomationReply(input: {
    flow: AttendanceAutomationFlowLike & {
        aiModel: string;
    };
    conversationId: string;
    officeName: string;
    clientName: string;
    incomingText: string;
    replyTemplate: string;
    recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
}) {
    if (!input.flow.aiEnabled) {
        return {
            content: input.replyTemplate,
            mode: "template" as const,
            model: null,
        };
    }

    if (!isGeminiConfigured()) {
        return {
            content: input.replyTemplate,
            mode: "fallback" as const,
            model: null,
        };
    }

    try {
        const recentOpenings = await listRecentReplyOpenings(input.conversationId);
        const styleSelection = parseHumanizedStyle(input.flow.humanizedStyle);
        const systemPrompt = buildAttendanceAutomationPrompt({
            officeName: input.officeName,
            clientName: input.clientName,
            flow: input.flow,
            incomingText: input.incomingText,
            replyTemplate: input.replyTemplate,
            recentMessages: input.recentMessages,
            blockedOpenings: recentOpenings,
        });

        const completion = await askGemini(
            [{ role: "user", content: input.incomingText || input.replyTemplate }],
            {
                module: "comunicacao_cliente",
                systemInstruction: systemPrompt,
                temperature: styleSelection.presetId === "formal_tecnico" ? 0.45 : 0.72,
                maxOutputTokens: 300,
            }
        );

        return {
            content: completion.content,
            mode: "ai" as const,
            model: completion.model,
        };
    } catch (error) {
        return {
            content: input.replyTemplate,
            mode: "fallback" as const,
            model: null,
            error: error instanceof Error ? error.message : "Falha ao usar Gemini.",
        };
    }
}

export async function ensureAttendanceAutomationDefaults() {
    if (!hasAttendanceAutomationDelegates()) {
        console.warn("[attendance-automation] Prisma client without attendance automation delegates; skipping defaults bootstrap.");
        return false;
    }

    for (const definition of DEFAULT_FLOW_DEFINITIONS) {
        const existing = await db.attendanceAutomationFlow.findFirst({
            where: { name: definition.name },
            select: { id: true },
        });
        const data = {
            description: definition.description,
            canal: definition.canal,
            isActive: definition.isActive,
            priority: definition.priority,
            triggerType: definition.triggerType,
            keywordMode: definition.keywordMode,
            keywords: definition.keywords,
            businessHoursStart: definition.businessHoursStart,
            businessHoursEnd: definition.businessHoursEnd,
            timezone: definition.timezone,
            initialReplyTemplate: definition.initialReplyTemplate,
            followUpReplyTemplate: definition.followUpReplyTemplate,
            aiEnabled: definition.aiEnabled,
            aiModel: definition.aiModel,
            aiInstructions: definition.aiInstructions,
            humanizedStyle: definition.humanizedStyle,
            maxAutoReplies: definition.maxAutoReplies,
            cooldownMinutes: definition.cooldownMinutes,
        };

        if (existing) continue;

        await db.attendanceAutomationFlow.create({
            data: {
                name: definition.name,
                ...data,
            },
        });
    }

    return true;
}

export async function getAttendanceAutomationDashboard() {
    const bootstrapped = await ensureAttendanceAutomationDefaults();

    if (!bootstrapped || !hasAttendanceAutomationDelegates()) {
        return {
            stats: {
                totalFlows: 0,
                activeFlows: 0,
                aiFlows: 0,
                afterHoursFlows: 0,
                todayEventCount: 0,
            },
            flows: [],
            recentEvents: [],
        };
    }

    const [flows, recentEvents, todayEventCount] = await Promise.all([
        db.attendanceAutomationFlow.findMany({
            orderBy: [{ priority: "asc" }, { name: "asc" }],
        }),
        db.attendanceAutomationEvent.findMany({
            orderBy: { createdAt: "desc" },
            take: 24,
            include: {
                flow: { select: { id: true, name: true } },
                conversation: {
                    select: {
                        id: true,
                        canal: true,
                        cliente: { select: { nome: true } },
                    },
                },
            },
        }),
        db.attendanceAutomationEvent.count({
            where: {
                createdAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                },
            },
        }),
    ]);

    const activeFlows = flows.filter((item) => item.isActive).length;
    const aiFlows = flows.filter((item) => item.aiEnabled).length;
    const afterHoursFlows = flows.filter((item) => item.triggerType === "AFTER_HOURS" && item.isActive).length;

    return {
        stats: {
            totalFlows: flows.length,
            activeFlows,
            aiFlows,
            afterHoursFlows,
            todayEventCount,
        },
        flows,
        recentEvents,
    };
}

export async function previewAttendanceAutomationFlow(input: {
    flowId: string;
    incomingText: string;
}) {
    const flow = await db.attendanceAutomationFlow.findUnique({
        where: { id: input.flowId },
    });

    if (!flow) {
        throw new Error("Fluxo de automacao nao encontrado.");
    }

    const officeName = await getOfficeName();
    const replyTemplate = replaceAttendanceAutomationVars(flow.initialReplyTemplate, {
        nome: "Cliente teste",
        escritorio: officeName,
        inicio: flow.businessHoursStart,
        fim: flow.businessHoursEnd,
    });

    return buildAutomationReply({
        flow,
        conversationId: `preview:${flow.id}`,
        officeName,
        clientName: "Cliente teste",
        incomingText: input.incomingText,
        replyTemplate,
        recentMessages: [
            { role: "user", content: trimText(input.incomingText, 500) },
        ],
    });
}

export async function scheduleAttendanceAutomationForInboundMessage(input: {
    conversationId: string;
    messageId?: string | null;
    incomingText: string;
    source: "baileys" | "evolution-webhook" | "manual";
    forceRetry?: boolean;
}) {
    const queued = await enqueueAttendanceAutomationJob(
        {
            conversationId: input.conversationId,
            messageId: input.messageId || null,
            incomingText: input.incomingText,
            source: input.source,
            forceRetry: input.forceRetry || false,
        },
        input.forceRetry ? 0 : AUTOMATION_BURST_WINDOW_MS
    );

    if (queued.queued) {
        return {
            queued: true,
            mode: "queue" as const,
            duplicated: queued.duplicated === true,
        };
    }

    const result = await runAttendanceAutomationForInboundMessage(input);
    return {
        queued: false,
        mode: "direct" as const,
        reason: queued.reason || null,
        result,
    };
}

export async function runAttendanceAutomationForInboundMessage(input: {
    conversationId: string;
    messageId?: string | null;
    incomingText: string;
    source: "baileys" | "evolution-webhook" | "manual";
    forceRetry?: boolean;
    skipBurstDelay?: boolean;
    dryRun?: boolean;
}): Promise<AttendanceAutomationRunResult> {
    try {
        return await withConversationAutomationLock(input.conversationId, async () => {
        const incomingText = trimText(input.incomingText, 4000);
        const shouldReuseInboundEventKey = !(input.source === "manual" && input.forceRetry);
        if (!incomingText) {
            return { handled: false, reason: "Mensagem vazia para automacao." };
        }

        if (!input.forceRetry && input.messageId) {
            const alreadyProcessed = await db.attendanceAutomationEvent.findFirst({
                where: {
                    messageId: input.messageId,
                    eventType: "INBOUND_EVALUATED",
                },
                select: { id: true },
            });

            if (alreadyProcessed) {
                return { handled: false, reason: "Mensagem ja avaliada pela automacao." };
            }
        }

        if (!input.forceRetry && input.messageId && !input.skipBurstDelay) {
            await wait(AUTOMATION_BURST_WINDOW_MS);
        }

        const conversation = await db.conversation.findUnique({
            where: { id: input.conversationId },
            select: {
                id: true,
                canal: true,
                iaDesabilitada: true,
                autoAtendimentoPausado: true,
                pausadoAte: true,
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                cliente: {
                    select: {
                        id: true,
                        nome: true,
                        whatsapp: true,
                        celular: true,
                    },
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 12,
                    select: {
                        id: true,
                        content: true,
                        direction: true,
                        createdAt: true,
                    },
                },
                automationSessions: {
                    orderBy: { updatedAt: "desc" },
                    take: 4,
                    select: {
                        lastReplyAt: true,
                    },
                },
            },
        });

        if (!conversation || conversation.canal !== "WHATSAPP") {
            return { handled: false, reason: "Conversa inexistente ou canal nao suportado." };
        }

        const conversationGate = await resolveConversationAutomationGate({
            conversationId: conversation.id,
            iaDesabilitada: conversation.iaDesabilitada,
            autoAtendimentoPausado: conversation.autoAtendimentoPausado,
            pausadoAte: conversation.pausadoAte,
        });

        if (conversationGate.blocked) {
            if (!input.dryRun) {
            await createAutomationEvent({
                conversationId: conversation.id,
                messageId: input.messageId || null,
                eventType: "SESSION_PAUSED",
                content: conversationGate.reason,
                metadata: {
                    gate: conversationGate.iaDesabilitada ? "ia_desabilitada" : "auto_atendimento_pausado",
                    pausadoAte: conversationGate.pausadoAte?.toISOString() || null,
                },
            });
            }
            return {
                handled: false,
                reason: conversationGate.reason || "Automacao pausada nesta conversa.",
            };
        }

        const lastAutomationReplyAt =
            conversation.automationSessions
                .map((item) => item.lastReplyAt)
                .filter((value): value is Date => Boolean(value))
                .sort((a, b) => b.getTime() - a.getTime())[0] || null;

        const pendingInboundMessages = conversation.messages
            .filter((message) => message.direction === "INBOUND")
            .filter((message) => !lastAutomationReplyAt || message.createdAt > lastAutomationReplyAt)
            .slice()
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .map((message) => ({
                id: message.id,
                content: trimText(message.content, 1000),
                createdAt: message.createdAt,
            }))
            .filter((message) => message.content);

        const inboundBurst = collectPendingInboundBurst(pendingInboundMessages);
        if (inboundBurst.length === 0) {
            return { handled: false, reason: "Mensagens recentes ja foram cobertas por resposta automatica." };
        }

        const combinedInboundText = inboundBurst.map((message) => message.content).join("\n");
        const latestInboundMessageId = inboundBurst[inboundBurst.length - 1]?.id || input.messageId || null;
        const eventMessageId = shouldReuseInboundEventKey ? latestInboundMessageId : null;

        const alreadyProcessedBurst = !input.forceRetry && latestInboundMessageId
            ? await db.attendanceAutomationEvent.findFirst({
                where: {
                    messageId: latestInboundMessageId,
                    eventType: "INBOUND_EVALUATED",
                },
                select: { id: true },
            })
            : null;

        if (alreadyProcessedBurst) {
            return { handled: false, reason: "Rajada recente ja processada pela automacao." };
        }

        if (!input.dryRun) {
            await createAutomationEvent({
                conversationId: conversation.id,
                messageId: eventMessageId,
                eventType: "INBOUND_EVALUATED",
                content: combinedInboundText,
                metadata: {
                    source: input.source,
                    replayedByHuman: !shouldReuseInboundEventKey,
                    burstMessageIds: inboundBurst.map((message) => message.id),
                },
            });
        }

        const flows = await db.attendanceAutomationFlow.findMany({
            where: {
                isActive: true,
                canal: "WHATSAPP",
            },
            orderBy: [{ priority: "asc" }, { name: "asc" }],
        });

        const now = new Date();
        const officeName = await getOfficeName();
        const clientName = conversation.cliente.nome || "Cliente";
        const phone = conversation.cliente.whatsapp || conversation.cliente.celular;
        const hasUrgencySignal = detectAttendanceUrgency(combinedInboundText);

        if (!phone) {
            if (!input.dryRun) {
            await createAutomationEvent({
                conversationId: conversation.id,
                eventType: "ERROR",
                content: "Cliente sem telefone de WhatsApp vinculado para resposta automatica.",
            });
            }
            return { handled: false, reason: "Cliente sem WhatsApp." };
        }

        for (const flow of flows) {
            const match = evaluateAttendanceAutomationFlow({
                flow,
                incomingText: combinedInboundText,
                referenceDate: now,
            });

            if (!match.matched) continue;

            const session = input.dryRun
                ? await db.attendanceAutomationSession.findUnique({
                    where: {
                        conversationId_flowId: {
                            conversationId: conversation.id,
                            flowId: flow.id,
                        },
                    },
                    select: {
                        id: true,
                        replyCount: true,
                        lastReplyAt: true,
                    },
                })
                : await db.attendanceAutomationSession.upsert({
                    where: {
                        conversationId_flowId: {
                            conversationId: conversation.id,
                            flowId: flow.id,
                        },
                    },
                    update: {
                        status: "ACTIVE",
                        lastInboundAt: now,
                        lastTriggerReason: match.reason,
                        lastInboundSummary: combinedInboundText,
                    },
                    create: {
                        conversationId: conversation.id,
                        flowId: flow.id,
                        status: "ACTIVE",
                        lastInboundAt: now,
                        lastTriggerReason: match.reason,
                        lastInboundSummary: combinedInboundText,
                    },
                });

            if (!input.dryRun && session) {
                await createAutomationEvent({
                    conversationId: conversation.id,
                    flowId: flow.id,
                    sessionId: session.id,
                    messageId: eventMessageId,
                    eventType: "FLOW_MATCHED",
                    content: match.reason,
                    metadata: {
                        source: input.source,
                        replayedByHuman: !shouldReuseInboundEventKey,
                        burstMessageIds: inboundBurst.map((message) => message.id),
                    },
                });
            }

            const permission = canSendAutomatedReply({
                flow,
                session,
                now,
                bypassCooldown: hasUrgencySignal,
            });

            if (!permission.allowed) {
                if (!input.dryRun && session) {
                    await createAutomationEvent({
                        conversationId: conversation.id,
                        flowId: flow.id,
                        sessionId: session.id,
                        eventType: "SESSION_PAUSED",
                        content: permission.reason,
                        metadata: {
                            urgentSignal: hasUrgencySignal,
                        },
                    });
                }
                return { handled: false, reason: permission.reason || "Fluxo pausado." };
            }

            const baseTemplate = hasUrgencySignal
                ? buildUrgencyReplyTemplate({
                    clientName,
                    officeName,
                    flow,
                    incomingText: combinedInboundText,
                })
                : (session?.replyCount || 0) > 0 && flow.followUpReplyTemplate
                    ? flow.followUpReplyTemplate
                    : flow.initialReplyTemplate;

            const replyTemplate = replaceAttendanceAutomationVars(baseTemplate, buildTemplateVars({
                clientName,
                officeName,
                flow,
            }));

            const recentMessages = conversation.messages
                .slice()
                .reverse()
                .map((message) => ({
                    role: message.direction === "INBOUND" ? "user" as const : "assistant" as const,
                    content: trimText(message.content, 600),
                }))
                .filter((message) => message.content);

            const reply = hasUrgencySignal
                ? {
                    content: replyTemplate,
                    mode: "template" as const,
                    model: null,
                }
                : await buildAutomationReply({
                    flow,
                    conversationId: conversation.id,
                    officeName,
                    clientName,
                    incomingText: combinedInboundText,
                    replyTemplate,
                    recentMessages,
                });

            if (input.dryRun) {
                return {
                    handled: true,
                    reason: match.reason,
                    flowId: flow.id,
                    mode: reply.mode,
                    preview: {
                        flowName: flow.name,
                        reason: match.reason,
                        reply: reply.content,
                        mode: reply.mode,
                    },
                };
            }

            if (!session) {
                return {
                    handled: false,
                    reason: "Sessao de automacao indisponivel para envio.",
                };
            }

            const sendResult = await sendWhatsappDirectText({ phone, content: reply.content });
            if (!sendResult.ok) {
                await createAutomationEvent({
                    conversationId: conversation.id,
                    flowId: flow.id,
                    sessionId: session.id,
                    eventType: "ERROR",
                    content: sendResult.error || "Falha ao enviar resposta automatica.",
                    metadata: { mode: reply.mode },
                });
                return {
                    handled: false,
                    reason: sendResult.error || "Falha ao enviar resposta automatica.",
                };
            }

            const sentAt = new Date();
            const createdMessage = await db.message.create({
                data: {
                    conversationId: conversation.id,
                    direction: "OUTBOUND",
                    canal: "WHATSAPP",
                    content: reply.content,
                    status: "SENT",
                    providerMsgId: sendResult.providerMessageId || null,
                    senderName: officeName,
                    sentAt,
                    createdAt: sentAt,
                },
            });
            emitCommunicationMessageCreated({
                conversationId: conversation.id,
                messageId: createdMessage.id,
                direction: "OUTBOUND",
                canal: "WHATSAPP",
                status: "SENT",
            });

            await db.conversation.update({
                where: { id: conversation.id },
                data: {
                    lastMessageAt: sentAt,
                },
            });

            await db.attendanceAutomationSession.update({
                where: { id: session.id },
                data: {
                    replyCount: { increment: 1 },
                    lastReplyAt: sentAt,
                    lastTriggerReason: match.reason,
                    lastInboundSummary: combinedInboundText,
                },
            });

            await createAutomationEvent({
                conversationId: conversation.id,
                flowId: flow.id,
                sessionId: session.id,
                eventType:
                    reply.mode === "ai"
                        ? "AI_REPLIED"
                        : reply.mode === "fallback"
                            ? "FALLBACK_REPLIED"
                            : "AUTO_REPLIED",
                content: reply.content,
                metadata: {
                    model: reply.model,
                    source: input.source,
                    error: null,
                    urgentSignal: hasUrgencySignal,
                    burstMessageIds: inboundBurst.map((message) => message.id),
                },
            });

            await rememberRecentReplyOpening(conversation.id, reply.content);

            return {
                handled: true,
                reason: match.reason,
                flowId: flow.id,
                mode: reply.mode,
            };
        }

        return {
            handled: false,
            reason: "Nenhum fluxo ativo correspondeu a mensagem recebida.",
        };
        });
    } catch (fatalError) {
        const message = fatalError instanceof Error ? fatalError.message : String(fatalError);
        console.error("[attendance-automation] Fatal error:", message, fatalError);
        return { handled: false, reason: `Erro interno: ${message}` };
    }
}
