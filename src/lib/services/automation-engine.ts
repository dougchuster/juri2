if (typeof window !== "undefined") {
    throw new Error("automation-engine is server-only");
}

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";
import { FlowExecutionStatus, FlowNodeType, TriggerType } from "@/generated/prisma";
import {
    enqueueFlowExecutionJob,
    isFlowExecutionQueueAvailable,
} from "@/lib/queue/flow-execution-queue";
import { upsertAttemptLifecycleForSource } from "@/lib/services/job-attempts";

export interface AutomationPayload {
    escritorioId: string;
    clienteId?: string;
    processoId?: string;
    userId?: string;
    [key: string]: unknown;
}

type FlowNode = {
    id: string;
    type?: string;
    data?: Record<string, unknown>;
};

type FlowEdge = {
    id?: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    label?: string;
};

type ExecutionLogEntry = {
    at: string;
    action: string;
    nodeId?: string;
    details?: string;
    waitUntil?: string;
    payload?: Record<string, unknown>;
};

const MAX_STEPS_PER_TICK = 20;

function asArray(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value) as unknown;
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

function parseNodes(raw: unknown): FlowNode[] {
    return asArray(raw)
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const obj = item as Record<string, unknown>;
            if (typeof obj.id !== "string") return null;
            return {
                id: obj.id,
                type: typeof obj.type === "string" ? obj.type : undefined,
                data: obj.data && typeof obj.data === "object" ? (obj.data as Record<string, unknown>) : {},
            } as FlowNode;
        })
        .filter((item): item is FlowNode => Boolean(item));
}

function parseEdges(raw: unknown): FlowEdge[] {
    return asArray(raw)
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const obj = item as Record<string, unknown>;
            if (typeof obj.source !== "string" || typeof obj.target !== "string") return null;
            return {
                id: typeof obj.id === "string" ? obj.id : undefined,
                source: obj.source,
                target: obj.target,
                sourceHandle: typeof obj.sourceHandle === "string" ? obj.sourceHandle : null,
                targetHandle: typeof obj.targetHandle === "string" ? obj.targetHandle : null,
                label: typeof obj.label === "string" ? obj.label : undefined,
            } as FlowEdge;
        })
        .filter((item): item is FlowEdge => Boolean(item));
}

function parseLog(raw: unknown): ExecutionLogEntry[] {
    return asArray(raw)
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const obj = item as Record<string, unknown>;
            if (typeof obj.action !== "string") return null;
            return {
                at: typeof obj.at === "string" ? obj.at : new Date().toISOString(),
                action: obj.action,
                nodeId: typeof obj.nodeId === "string" ? obj.nodeId : undefined,
                details: typeof obj.details === "string" ? obj.details : undefined,
                waitUntil: typeof obj.waitUntil === "string" ? obj.waitUntil : undefined,
                payload: obj.payload && typeof obj.payload === "object" ? (obj.payload as Record<string, unknown>) : undefined,
            } as ExecutionLogEntry;
        })
        .filter((item): item is ExecutionLogEntry => Boolean(item));
}

function extractPayloadFromLog(log: ExecutionLogEntry[]): AutomationPayload {
    const startEntry = log.find((entry) => entry.action === "EXECUTION_STARTED" && entry.payload);
    const payload = startEntry?.payload;

    if (payload && typeof payload.escritorioId === "string" && payload.escritorioId) {
        return payload as AutomationPayload;
    }

    return {
        escritorioId: "",
    };
}

function addLog(log: ExecutionLogEntry[], partial: Omit<ExecutionLogEntry, "at">) {
    log.push({
        at: new Date().toISOString(),
        ...partial,
    });
}

function toJsonValue<T>(value: T) {
    return JSON.parse(JSON.stringify(value));
}

function toInputJsonValue<T>(value: T): Prisma.InputJsonValue {
    return toJsonValue(value) as Prisma.InputJsonValue;
}

function normalizeNodeType(node: FlowNode): FlowNodeType | "UNKNOWN" {
    const rawType = (node.type === "default" ? node.data?.type : node.type) || node.data?.type;
    if (typeof rawType !== "string") return "UNKNOWN";

    const value = rawType.toUpperCase();
    if (value === "TRIGGERNODE" || value === "TRIGGER") return FlowNodeType.TRIGGER;
    if (value === "MESSAGENODE" || value === "SEND_MESSAGE") return FlowNodeType.SEND_MESSAGE;
    if (value === "WAITNODE" || value === "WAIT") return FlowNodeType.WAIT;
    if (value === "TAGNODE") {
        const action = String(node.data?.tagAction || "add").toLowerCase();
        return action === "remove" ? FlowNodeType.REMOVE_TAG : FlowNodeType.ADD_TAG;
    }
    if (value === "ADD_TAG") return FlowNodeType.ADD_TAG;
    if (value === "REMOVE_TAG") return FlowNodeType.REMOVE_TAG;
    if (value === "CREATE_TASK" || value === "TASKNODE" || value === "CREATETASKNODE") return FlowNodeType.CREATE_TASK;
    if (value === "UPDATE_STATUS") return FlowNodeType.UPDATE_STATUS;
    if (value === "END") return FlowNodeType.END;
    if (value === "CONDITION") return FlowNodeType.CONDITION;
    if (value === "NOTIFY_TEAM") return FlowNodeType.NOTIFY_TEAM;
    if (value === "WEBHOOK") return FlowNodeType.WEBHOOK;

    return "UNKNOWN";
}

function findRootNode(nodes: FlowNode[]): FlowNode | null {
    const trigger = nodes.find((node) => normalizeNodeType(node) === FlowNodeType.TRIGGER);
    if (trigger) return trigger;
    return nodes.length > 0 ? nodes[0] : null;
}

function findNextNodeId(currentNodeId: string, edges: FlowEdge[], branch?: "true" | "false"): string | null {
    if (branch) {
        const preferred = edges.find((edge) => {
            if (edge.source !== currentNodeId) return false;
            const label = (edge.label || "").toLowerCase();
            const sourceHandle = (edge.sourceHandle || "").toLowerCase();
            return label.includes(branch) || sourceHandle.includes(branch);
        });
        if (preferred) return preferred.target;
    }
    const edge = edges.find((item) => item.source === currentNodeId);
    return edge?.target || null;
}

function renderTemplate(template: string, values: Record<string, string>) {
    return template.replace(/\{([^}]+)\}|\{\{([^}]+)\}\}/g, (_, single, double) => {
        const key = String(single || double || "").trim();
        return values[key] ?? "";
    });
}

function stringifyVariableValue(value: unknown) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return JSON.stringify(value);
}

function buildTemplateVariables(
    payload: AutomationPayload,
    context: Awaited<ReturnType<typeof resolveFlowContext>>
) {
    const payloadVariables = Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [key, stringifyVariableValue(value)])
    );

    return {
        ...payloadVariables,
        nome: context.cliente?.nome || "",
        nome_cliente: context.cliente?.nome || "",
        cliente_id: context.cliente?.id || payload.clienteId || "",
        processo: context.processo?.numeroCnj || "",
        processo_id: context.processo?.id || payload.processoId || "",
        fase: context.processo?.status || "",
        processo_tipo: context.processo?.tipo || "",
    };
}

function renderTemplatedValue(value: unknown, variables: Record<string, string>): unknown {
    if (typeof value === "string") {
        return renderTemplate(value, variables);
    }

    if (Array.isArray(value)) {
        return value.map((item) => renderTemplatedValue(item, variables));
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, item]) => [
                key,
                renderTemplatedValue(item, variables),
            ])
        );
    }

    return value;
}

function parseWebhookHeaders(raw: unknown, variables: Record<string, string>) {
    if (!raw) return {} as Record<string, string>;

    let parsed: unknown = raw;
    if (typeof raw === "string") {
        try {
            parsed = JSON.parse(raw) as unknown;
        } catch {
            return {} as Record<string, string>;
        }
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {} as Record<string, string>;
    }

    return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [
            key,
            String(renderTemplatedValue(value, variables) ?? ""),
        ])
    );
}

async function scheduleExecution(executionId: string, delayMs = 0) {
    if (!isFlowExecutionQueueAvailable()) {
        return {
            queued: false,
            reason: "Fila de execucao de workflows indisponivel.",
        };
    }

    return enqueueFlowExecutionJob(executionId, delayMs);
}

function parseWaitMs(node: FlowNode): number {
    const amountRaw = Number(node.data?.delayAmount || node.data?.amount || 1);
    const amount = Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : 1;
    const unitRaw = String(node.data?.delayUnit || node.data?.unit || "days").toLowerCase();

    if (unitRaw === "seconds") return amount * 1000;
    if (unitRaw === "minutes") return amount * 60 * 1000;
    if (unitRaw === "hours") return amount * 60 * 60 * 1000;
    if (unitRaw === "weeks") return amount * 7 * 24 * 60 * 60 * 1000;
    return amount * 24 * 60 * 60 * 1000;
}

function findPendingWait(log: ExecutionLogEntry[], nodeId: string) {
    const waits = log.filter((entry) => entry.nodeId === nodeId && entry.action === "WAIT_STARTED" && !!entry.waitUntil);
    if (waits.length === 0) return null;
    const last = waits[waits.length - 1];
    const completed = log.some((entry) => entry.nodeId === nodeId && entry.action === "WAIT_COMPLETED" && entry.at >= last.at);
    if (completed) return null;
    return last;
}

async function resolveFlowContext(input: { clienteId?: string | null; processoId?: string | null }) {
    const [cliente, processo] = await Promise.all([
        input.clienteId
            ? db.cliente.findUnique({
                where: { id: input.clienteId },
                select: {
                    id: true,
                    nome: true,
                    email: true,
                    telefone: true,
                    celular: true,
                    whatsapp: true,
                    status: true,
                    crmRelationship: true,
                    crmScore: true,
                },
            })
            : Promise.resolve(null),
        input.processoId
            ? db.processo.findUnique({
                where: { id: input.processoId },
                select: { id: true, numeroCnj: true, status: true, tipo: true },
            })
            : Promise.resolve(null),
    ]);

    return { cliente, processo };
}

async function ensureTag(escritorioId: string, tagName: string) {
    const normalized = tagName.trim();
    if (!normalized) return null;
    const existing = await db.contactTag.findFirst({
        where: { escritorioId, name: { equals: normalized, mode: "insensitive" } },
        select: { id: true },
    });
    if (existing) return existing.id;

    const created = await db.contactTag.create({
        data: {
            escritorioId,
            name: normalized,
            color: "#22c55e",
        },
        select: { id: true },
    });
    return created.id;
}

async function executeNode(
    node: FlowNode,
    flowId: string,
    escritorioId: string,
    payload: AutomationPayload,
    context: Awaited<ReturnType<typeof resolveFlowContext>>,
    log: ExecutionLogEntry[],
) {
    const kind = normalizeNodeType(node);
    const variables = buildTemplateVariables(payload, context);

    if (kind === FlowNodeType.TRIGGER) {
        addLog(log, { action: "TRIGGER_PASSED", nodeId: node.id });
        return { type: "CONTINUE" as const };
    }

    if (kind === FlowNodeType.SEND_MESSAGE) {
        const cliente = context.cliente;
        if (!cliente) {
            addLog(log, { action: "MESSAGE_SKIPPED", nodeId: node.id, details: "Cliente ausente no contexto." });
            return { type: "CONTINUE" as const };
        }

        const canal = String(node.data?.channel || "whatsapp").toUpperCase() === "EMAIL" ? "EMAIL" : "WHATSAPP";
        const template = String(node.data?.messageBody || node.data?.content || "Atualizacao automatica do escritorio.");
        const subject = String(node.data?.subject || "Atualizacao juridica");
        const rendered = renderTemplate(template, variables);

        const recipientPhone = cliente.whatsapp || cliente.celular || cliente.telefone;
        const recipientEmail = cliente.email;

        if (canal === "WHATSAPP" && !recipientPhone) {
            addLog(log, { action: "MESSAGE_SKIPPED", nodeId: node.id, details: "Contato sem telefone para WhatsApp." });
            return { type: "CONTINUE" as const };
        }
        if (canal === "EMAIL" && !recipientEmail) {
            addLog(log, { action: "MESSAGE_SKIPPED", nodeId: node.id, details: "Contato sem e-mail." });
            return { type: "CONTINUE" as const };
        }

        await db.communicationJob.create({
            data: {
                canal,
                recipientPhone: canal === "WHATSAPP" ? recipientPhone : null,
                recipientEmail: canal === "EMAIL" ? recipientEmail : null,
                clienteId: cliente.id,
                subject: canal === "EMAIL" ? subject : null,
                content: rendered,
                variables,
                processoId: context.processo?.id || null,
                correlationId: flowId,
                scheduledFor: new Date(),
            },
        });

        addLog(log, { action: "MESSAGE_QUEUED", nodeId: node.id, details: `${canal} enfileirado para ${cliente.nome}.` });
        return { type: "CONTINUE" as const };
    }

    if (kind === FlowNodeType.ADD_TAG || kind === FlowNodeType.REMOVE_TAG) {
        const cliente = context.cliente;
        if (!cliente) {
            addLog(log, { action: "TAG_SKIPPED", nodeId: node.id, details: "Cliente ausente no contexto." });
            return { type: "CONTINUE" as const };
        }

        const tagName = String(node.data?.tagName || "").trim();
        if (!tagName) {
            addLog(log, { action: "TAG_SKIPPED", nodeId: node.id, details: "Tag nao configurada." });
            return { type: "CONTINUE" as const };
        }

        const tagId = await ensureTag(escritorioId, tagName);
        if (!tagId) {
            addLog(log, { action: "TAG_SKIPPED", nodeId: node.id, details: "Falha ao resolver tag." });
            return { type: "CONTINUE" as const };
        }

        if (kind === FlowNodeType.ADD_TAG) {
            await db.clienteContactTag.upsert({
                where: { clienteId_tagId: { clienteId: cliente.id, tagId } },
                create: { clienteId: cliente.id, tagId },
                update: {},
            });
            addLog(log, { action: "TAG_ADDED", nodeId: node.id, details: `Tag '${tagName}' aplicada.` });
        } else {
            await db.clienteContactTag.deleteMany({ where: { clienteId: cliente.id, tagId } });
            addLog(log, { action: "TAG_REMOVED", nodeId: node.id, details: `Tag '${tagName}' removida.` });
        }

        return { type: "CONTINUE" as const };
    }

    if (kind === FlowNodeType.CREATE_TASK) {
        const taskTitle = String(node.data?.taskTitle || node.data?.label || "Tarefa automatica CRM");
        const taskDescription = String(node.data?.taskDescription || "Gerada por fluxo automatico do CRM.");
        const prioridadeMap: Record<string, "URGENTE" | "ALTA" | "NORMAL" | "BAIXA"> = {
            urgent: "URGENTE",
            alta: "ALTA",
            high: "ALTA",
            baixa: "BAIXA",
            low: "BAIXA",
            normal: "NORMAL",
            media: "NORMAL",
            medium: "NORMAL",
        };
        const rawPriority = String(node.data?.priority || "normal").toLowerCase();
        const prioridade = prioridadeMap[rawPriority] || "NORMAL";

        const [advogado, user] = await Promise.all([
            db.advogado.findFirst({ where: { ativo: true }, select: { id: true } }),
            db.user.findFirst({ where: { isActive: true }, select: { id: true } }),
        ]);

        if (!advogado || !user) {
            addLog(log, { action: "TASK_SKIPPED", nodeId: node.id, details: "Nao foi encontrado responsavel para criar tarefa." });
            return { type: "CONTINUE" as const };
        }

        const dueInDays = Number(node.data?.dueInDays || 1);
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() + (Number.isFinite(dueInDays) ? Math.max(0, dueInDays) : 1));

        await db.tarefa.create({
            data: {
                titulo: taskTitle,
                descricao: taskDescription,
                prioridade,
                advogadoId: advogado.id,
                criadoPorId: user.id,
                processoId: context.processo?.id || null,
                dataLimite,
            },
        });

        addLog(log, { action: "TASK_CREATED", nodeId: node.id, details: taskTitle });
        return { type: "CONTINUE" as const };
    }

    if (kind === FlowNodeType.UPDATE_STATUS) {
        const cliente = context.cliente;
        if (!cliente) {
            addLog(log, { action: "STATUS_SKIPPED", nodeId: node.id, details: "Cliente ausente no contexto." });
            return { type: "CONTINUE" as const };
        }

        const nextRelationship = String(node.data?.crmRelationship || "").toUpperCase();
        const nextStatus = String(node.data?.status || "").toUpperCase();

        const data: Record<string, unknown> = {};
        if (nextRelationship) data.crmRelationship = nextRelationship;
        if (nextStatus) data.status = nextStatus;

        if (Object.keys(data).length > 0) {
            await db.cliente.update({
                where: { id: cliente.id },
                data,
            });
            addLog(log, { action: "STATUS_UPDATED", nodeId: node.id, details: "Status/relacao atualizado no cliente." });
        } else {
            addLog(log, { action: "STATUS_SKIPPED", nodeId: node.id, details: "Nenhum campo configurado." });
        }

        return { type: "CONTINUE" as const };
    }

    if (kind === FlowNodeType.WAIT) {
        const existingWait = findPendingWait(log, node.id);
        const now = new Date();

        if (!existingWait) {
            const waitMs = parseWaitMs(node);
            const waitUntil = new Date(now.getTime() + waitMs);
            addLog(log, {
                action: "WAIT_STARTED",
                nodeId: node.id,
                waitUntil: waitUntil.toISOString(),
                details: `Aguardando ate ${waitUntil.toISOString()}.`,
            });
            return { type: "WAITING" as const, waitUntil };
        }

        const waitUntil = existingWait.waitUntil ? new Date(existingWait.waitUntil) : null;
        if (waitUntil && waitUntil.getTime() > now.getTime()) {
            return { type: "WAITING" as const, waitUntil };
        }

        addLog(log, { action: "WAIT_COMPLETED", nodeId: node.id, details: "Tempo de espera concluido." });
        return { type: "CONTINUE" as const };
    }

    if (kind === FlowNodeType.END) {
        addLog(log, { action: "FLOW_END_NODE", nodeId: node.id });
        return { type: "END" as const };
    }

    if (kind === FlowNodeType.CONDITION) {
        const cliente = context.cliente;
        const field = String(node.data?.field || "").toLowerCase();
        const operator = String(node.data?.operator || "gte").toLowerCase();
        const compareValue = Number(node.data?.value || 0);

        let conditionResult = false;
        if (cliente && field === "crm_score") {
            const score = Number(cliente.crmScore || 0);
            if (operator === "gt") conditionResult = score > compareValue;
            if (operator === "gte") conditionResult = score >= compareValue;
            if (operator === "lt") conditionResult = score < compareValue;
            if (operator === "lte") conditionResult = score <= compareValue;
            if (operator === "eq") conditionResult = score === compareValue;
        }

        addLog(log, {
            action: "CONDITION_EVALUATED",
            nodeId: node.id,
            details: `Resultado: ${conditionResult ? "TRUE" : "FALSE"}`,
        });
        return { type: "CONDITION" as const, result: conditionResult };
    }

    if (kind === FlowNodeType.WEBHOOK) {
        const url = String(node.data?.webhookUrl || node.data?.url || "").trim();
        if (!url) {
            addLog(log, { action: "WEBHOOK_SKIPPED", nodeId: node.id, details: "URL nao configurada." });
            return { type: "CONTINUE" as const };
        }

        const method = String(node.data?.method || "POST").trim().toUpperCase() || "POST";
        const timeoutMsRaw = Number(node.data?.timeoutMs || 10_000);
        const timeoutMs = Number.isFinite(timeoutMsRaw) ? Math.max(1_000, timeoutMsRaw) : 10_000;
        const headers = parseWebhookHeaders(node.data?.headers, variables);
        const rawBody =
            node.data?.body ??
            node.data?.payload ?? {
                flowId,
                executionPayload: payload,
                context: {
                    clienteId: context.cliente?.id || null,
                    processoId: context.processo?.id || null,
                },
            };
        const renderedBody = renderTemplatedValue(rawBody, variables);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const finalHeaders = { ...headers };
            let body: string | undefined;

            if (method !== "GET" && method !== "HEAD") {
                if (typeof renderedBody === "string") {
                    body = renderedBody;
                } else {
                    body = JSON.stringify(renderedBody);
                    if (!Object.keys(finalHeaders).some((key) => key.toLowerCase() === "content-type")) {
                        finalHeaders["Content-Type"] = "application/json";
                    }
                }
            }

            const response = await fetch(url, {
                method,
                headers: finalHeaders,
                body,
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`Webhook respondeu ${response.status}.`);
            }

            addLog(log, {
                action: "WEBHOOK_SENT",
                nodeId: node.id,
                details: `${method} ${url} -> ${response.status}`,
            });
            return { type: "CONTINUE" as const };
        } finally {
            clearTimeout(timer);
        }
    }

    addLog(log, { action: "NODE_SKIPPED", nodeId: node.id, details: "Tipo de no nao suportado." });
    return { type: "CONTINUE" as const };
}

async function continueExecution(executionId: string, maxSteps = MAX_STEPS_PER_TICK) {
    const execution = await db.flowExecution.findUnique({
        where: { id: executionId },
        include: { flow: true },
    });
    if (!execution || execution.status !== FlowExecutionStatus.RUNNING) return { advanced: false, status: execution?.status };

    const nodes = parseNodes(execution.flow.nodes);
    const edges = parseEdges(execution.flow.edges);
    if (nodes.length === 0) {
        await db.flowExecution.update({
            where: { id: execution.id },
            data: {
                status: FlowExecutionStatus.FAILED,
                errorMessage: "Fluxo sem nos configurados.",
                completedAt: new Date(),
            },
        });
        await upsertAttemptLifecycleForSource({
            sourceType: "FLOW_EXECUTION",
            sourceId: execution.id,
            status: "FAILED",
            errorMessage: "Fluxo sem nos configurados.",
            finishedAt: new Date(),
        });
        return { advanced: false, status: FlowExecutionStatus.FAILED };
    }

    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const log = parseLog(execution.log);
    const payload = {
        ...extractPayloadFromLog(log),
        escritorioId: execution.flow.escritorioId,
        clienteId: execution.clienteId || undefined,
        processoId: execution.processoId || undefined,
    } satisfies AutomationPayload;
    let currentNodeId = execution.currentNodeId || findRootNode(nodes)?.id || null;
    const context = await resolveFlowContext({ clienteId: execution.clienteId, processoId: execution.processoId });
    let steps = 0;

    while (currentNodeId && steps < maxSteps) {
        steps += 1;

        const node = nodeMap.get(currentNodeId);
        if (!node) {
            addLog(log, { action: "EXECUTION_ERROR", nodeId: currentNodeId, details: "No nao encontrado no fluxo." });
            await db.flowExecution.update({
                where: { id: execution.id },
                data: {
                    status: FlowExecutionStatus.FAILED,
                    errorMessage: `No ${currentNodeId} nao encontrado.`,
                    currentNodeId,
                    log: toInputJsonValue(log),
                    completedAt: new Date(),
                },
            });
            await upsertAttemptLifecycleForSource({
                sourceType: "FLOW_EXECUTION",
                sourceId: execution.id,
                status: "FAILED",
                errorMessage: `No ${currentNodeId} nao encontrado.`,
                finishedAt: new Date(),
                resultSnapshot: {
                    currentNodeId,
                },
            });
            return { advanced: true, status: FlowExecutionStatus.FAILED };
        }

        const result = await executeNode(
            node,
            execution.flowId,
            execution.flow.escritorioId,
            payload,
            context,
            log
        );

        if (result.type === "WAITING") {
            await db.flowExecution.update({
                where: { id: execution.id },
                data: {
                    status: FlowExecutionStatus.RUNNING,
                    currentNodeId: node.id,
                    log: toInputJsonValue(log),
                },
            });
            if (result.waitUntil) {
                const delayMs = Math.max(0, result.waitUntil.getTime() - Date.now());
                const queueResult = await scheduleExecution(execution.id, delayMs);
                addLog(log, {
                    action: queueResult.queued ? "WAIT_SCHEDULED" : "WAIT_SCHEDULE_FAILED",
                    nodeId: node.id,
                    waitUntil: result.waitUntil.toISOString(),
                    details: queueResult.queued
                        ? `Reexecucao agendada para ${result.waitUntil.toISOString()}.`
                        : queueResult.reason || "Falha ao agendar reexecucao do WAIT.",
                });
                await db.flowExecution.update({
                    where: { id: execution.id },
                    data: {
                        log: toInputJsonValue(log),
                    },
                });
            }
            return { advanced: true, status: FlowExecutionStatus.RUNNING, waiting: true };
        }

        if (result.type === "END") {
            currentNodeId = null;
            break;
        }

        if (result.type === "CONDITION") {
            currentNodeId = findNextNodeId(node.id, edges, result.result ? "true" : "false");
            continue;
        }

        currentNodeId = findNextNodeId(node.id, edges);
    }

    if (!currentNodeId) {
        addLog(log, { action: "EXECUTION_COMPLETED", details: "Fluxo concluido." });
        await db.flowExecution.update({
            where: { id: execution.id },
            data: {
                status: FlowExecutionStatus.COMPLETED,
                currentNodeId: null,
                completedAt: new Date(),
                log: toInputJsonValue(log),
            },
        });
        await upsertAttemptLifecycleForSource({
            sourceType: "FLOW_EXECUTION",
            sourceId: execution.id,
            status: "COMPLETED",
            finishedAt: new Date(),
            resultSnapshot: {
                completed: true,
            },
        });
        return { advanced: true, status: FlowExecutionStatus.COMPLETED };
    }

    await db.flowExecution.update({
        where: { id: execution.id },
        data: {
            status: FlowExecutionStatus.RUNNING,
            currentNodeId,
            log: toInputJsonValue(log),
        },
    });

    return { advanced: true, status: FlowExecutionStatus.RUNNING };
}

export const AutomationEngine = {
    async handleEvent(triggerType: TriggerType, payload: AutomationPayload) {
        const activeFlows = await db.automationFlow.findMany({
            where: {
                escritorioId: payload.escritorioId,
                triggerType,
                isActive: true,
            },
            select: { id: true, triggerConfig: true },
        });

        if (activeFlows.length === 0) return { started: 0 };

        let started = 0;
        for (const flow of activeFlows) {
            if (!this.evaluateTriggerCondition(flow.triggerConfig, payload)) continue;
            const result = await this.startExecution(flow.id, payload);
            if (result.started) started += 1;
        }

        return { started };
    },

    async startExecution(flowId: string, payload: AutomationPayload) {
        const flow = await db.automationFlow.findUnique({
            where: { id: flowId },
            select: { id: true, nodes: true, isActive: true },
        });
        if (!flow || !flow.isActive) return { started: false };

        const nodes = parseNodes(flow.nodes);
        const root = findRootNode(nodes);
        if (!root) return { started: false, reason: "Fluxo sem no inicial." };

        const queueAvailable = isFlowExecutionQueueAvailable();
        const initialLog: ExecutionLogEntry[] = [
            {
                at: new Date().toISOString(),
                action: "EXECUTION_STARTED",
                nodeId: root.id,
                payload,
            },
        ];
        if (queueAvailable) {
            initialLog.push({
                at: new Date().toISOString(),
                action: "EXECUTION_QUEUED",
                nodeId: root.id,
                details: "Execucao enviada para a fila dedicada de workflows.",
            });
        }

        const execution = await db.flowExecution.create({
            data: {
                flowId: flow.id,
                clienteId: payload.clienteId || null,
                processoId: payload.processoId || null,
                status: FlowExecutionStatus.RUNNING,
                currentNodeId: root.id,
                log: toJsonValue(initialLog),
            },
            select: { id: true },
        });
        await upsertAttemptLifecycleForSource({
            sourceType: "FLOW_EXECUTION",
            sourceId: execution.id,
            status: queueAvailable ? "QUEUED" : "RUNNING",
            startedAt: queueAvailable ? undefined : new Date(),
            payloadSnapshot: payload,
        });

        await db.automationFlow.update({
            where: { id: flow.id },
            data: { executionCount: { increment: 1 } },
        });

        if (queueAvailable) {
            const queueResult = await scheduleExecution(execution.id);
            if (queueResult.queued) {
                return { started: true, executionId: execution.id, queued: true };
            }

            const currentLog = parseLog(
                (
                    await db.flowExecution.findUnique({
                        where: { id: execution.id },
                        select: { log: true },
                    })
                )?.log
            );
            addLog(currentLog, {
                action: "EXECUTION_QUEUE_FALLBACK",
                nodeId: root.id,
                details: queueResult.reason || "Fila indisponivel, executando inline.",
            });
            await db.flowExecution.update({
                where: { id: execution.id },
                data: {
                    log: toInputJsonValue(currentLog),
                },
            });
        }

        await upsertAttemptLifecycleForSource({
            sourceType: "FLOW_EXECUTION",
            sourceId: execution.id,
            status: "RUNNING",
            startedAt: new Date(),
            payloadSnapshot: payload,
        });

        await continueExecution(execution.id);
        return { started: true, executionId: execution.id, queued: false };
    },

    async processExecutionJob(
        executionId: string,
        retryContext?: {
            attemptNumber?: number;
            maxAttempts?: number;
        }
    ) {
        await upsertAttemptLifecycleForSource({
            sourceType: "FLOW_EXECUTION",
            sourceId: executionId,
            status: "RUNNING",
            startedAt: new Date(),
        });

        try {
            return await continueExecution(executionId);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Erro desconhecido no runtime do workflow.";
            const current = await db.flowExecution.findUnique({
                where: { id: executionId },
                select: {
                    id: true,
                    status: true,
                    log: true,
                },
            });

            if (!current) {
                throw error;
            }

            const attemptNumber = retryContext?.attemptNumber || 1;
            const maxAttempts = retryContext?.maxAttempts || 1;
            const shouldRetry = attemptNumber < maxAttempts;
            const log = parseLog(current.log);
            addLog(log, {
                action: shouldRetry ? "EXECUTION_RETRY_SCHEDULED" : "EXECUTION_FAILED",
                details: shouldRetry
                    ? `Tentativa ${attemptNumber}/${maxAttempts} falhou: ${message}`
                    : message,
                payload: {
                    attemptNumber,
                    maxAttempts,
                },
            });

            await db.flowExecution.update({
                where: { id: executionId },
                data: {
                    status: shouldRetry ? FlowExecutionStatus.RUNNING : FlowExecutionStatus.FAILED,
                    errorMessage: message,
                    log: toInputJsonValue(log),
                    ...(shouldRetry ? {} : { completedAt: new Date() }),
                },
            });

            await upsertAttemptLifecycleForSource({
                sourceType: "FLOW_EXECUTION",
                sourceId: executionId,
                status: shouldRetry ? "RUNNING" : "FAILED",
                errorMessage: message,
                ...(shouldRetry ? {} : { finishedAt: new Date() }),
            });

            if (shouldRetry) {
                throw error;
            }

            return {
                advanced: true,
                failed: true,
                status: FlowExecutionStatus.FAILED,
            };
        }
    },

    async handleCustomEvent(eventName: string, payload: AutomationPayload) {
        const event = String(eventName || "").trim().toLowerCase();
        if (!event) return { started: 0 };

        const candidateFlows = await db.automationFlow.findMany({
            where: {
                escritorioId: payload.escritorioId,
                isActive: true,
                triggerType: { in: [TriggerType.MANUAL, TriggerType.WEBHOOK] },
            },
            select: {
                id: true,
                triggerConfig: true,
            },
        });
        if (candidateFlows.length === 0) return { started: 0 };

        let started = 0;
        for (const flow of candidateFlows) {
            const triggerConfig =
                flow.triggerConfig && typeof flow.triggerConfig === "object"
                    ? (flow.triggerConfig as Record<string, unknown>)
                    : {};
            const configuredEvent = String(
                triggerConfig.triggerEvent || triggerConfig.event || triggerConfig.type || ""
            )
                .trim()
                .toLowerCase();

            if (!configuredEvent || configuredEvent !== event) continue;
            if (!this.evaluateTriggerCondition(flow.triggerConfig, payload)) continue;

            const result = await this.startExecution(flow.id, payload);
            if (result.started) started += 1;
        }

        return { started };
    },

    async processPendingExecutions(limit = 50) {
        const running = await db.flowExecution.findMany({
            where: { status: FlowExecutionStatus.RUNNING },
            orderBy: { startedAt: "asc" },
            take: limit,
            select: { id: true },
        });

        if (isFlowExecutionQueueAvailable()) {
            let processed = 0;

            for (const exec of running) {
                const queueResult = await scheduleExecution(exec.id);
                if (queueResult.queued) processed += 1;
            }

            return { processed, completed: 0, waiting: 0, failed: 0 };
        }

        let processed = 0;
        let completed = 0;
        let waiting = 0;
        let failed = 0;

        for (const exec of running) {
            const result = await continueExecution(exec.id);
            if (!result.advanced) continue;
            processed += 1;
            if (result.status === FlowExecutionStatus.COMPLETED) completed += 1;
            if (result.status === FlowExecutionStatus.FAILED) failed += 1;
            if (result.waiting) waiting += 1;
        }

        return { processed, completed, waiting, failed };
    },

    async cancelExecution(executionId: string, reason?: string) {
        const cancelled = await db.flowExecution.update({
            where: { id: executionId },
            data: {
                status: FlowExecutionStatus.CANCELLED,
                errorMessage: reason || "Cancelado manualmente.",
                completedAt: new Date(),
            },
        });
        await upsertAttemptLifecycleForSource({
            sourceType: "FLOW_EXECUTION",
            sourceId: executionId,
            status: "CANCELLED",
            errorMessage: reason || "Cancelado manualmente.",
            finishedAt: new Date(),
        });
        return cancelled;
    },

    evaluateTriggerCondition(triggerConfigRaw: unknown, payload: AutomationPayload): boolean {
        if (!triggerConfigRaw || typeof triggerConfigRaw !== "object") return true;
        const config = triggerConfigRaw as Record<string, unknown>;

        const expectedTag = typeof config.tagName === "string" ? config.tagName.toLowerCase() : null;
        if (expectedTag) {
            const payloadTag = String(payload.tagName || "").toLowerCase();
            if (!payloadTag || payloadTag !== expectedTag) return false;
        }

        const expectedSource = typeof config.source === "string" ? config.source.toLowerCase() : null;
        if (expectedSource) {
            const payloadSource = String(payload.source || "").toLowerCase();
            if (!payloadSource || payloadSource !== expectedSource) return false;
        }

        return true;
    },
};
