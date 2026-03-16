import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";
import { FlowExecutionStatus, FlowNodeType, TriggerType } from "@/generated/prisma";
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

function parseWaitMs(node: FlowNode): number {
    const amountRaw = Number(node.data?.delayAmount || node.data?.amount || 1);
    const amount = Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : 1;
    const unitRaw = String(node.data?.delayUnit || node.data?.unit || "days").toLowerCase();

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
    context: Awaited<ReturnType<typeof resolveFlowContext>>,
    log: ExecutionLogEntry[],
) {
    const kind = normalizeNodeType(node);

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
        const variables = {
            nome: cliente.nome,
            nome_cliente: cliente.nome,
            fase: context.processo?.status || "",
            processo: context.processo?.numeroCnj || "",
        };
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
            return { type: "WAITING" as const };
        }

        const waitUntil = existingWait.waitUntil ? new Date(existingWait.waitUntil) : null;
        if (waitUntil && waitUntil.getTime() > now.getTime()) {
            return { type: "WAITING" as const };
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

        const result = await executeNode(node, execution.flowId, execution.flow.escritorioId, context, log);

        if (result.type === "WAITING") {
            await db.flowExecution.update({
                where: { id: execution.id },
                data: {
                    status: FlowExecutionStatus.RUNNING,
                    currentNodeId: node.id,
                    log: toInputJsonValue(log),
                },
            });
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

        const execution = await db.flowExecution.create({
            data: {
                flowId: flow.id,
                clienteId: payload.clienteId || null,
                processoId: payload.processoId || null,
                status: FlowExecutionStatus.RUNNING,
                currentNodeId: root.id,
                log: toJsonValue([
                    {
                        at: new Date().toISOString(),
                        action: "EXECUTION_STARTED",
                        nodeId: root.id,
                        payload,
                    },
                ]),
            },
            select: { id: true },
        });
        await upsertAttemptLifecycleForSource({
            sourceType: "FLOW_EXECUTION",
            sourceId: execution.id,
            status: "RUNNING",
            startedAt: new Date(),
            payloadSnapshot: payload,
        });

        await db.automationFlow.update({
            where: { id: flow.id },
            data: { executionCount: { increment: 1 } },
        });

        await continueExecution(execution.id);
        return { started: true, executionId: execution.id };
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
