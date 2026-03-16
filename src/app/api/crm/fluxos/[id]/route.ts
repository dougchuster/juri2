import { NextResponse } from "next/server";
import { TriggerType, type Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { requireCRMAuth, canManageCRMConfiguration } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

function normalizeTriggerConfig(raw: unknown) {
    if (!raw || typeof raw !== "object") return null;
    const config = raw as Record<string, unknown>;
    const result: Record<string, string> = {};

    const triggerEvent = String(config.triggerEvent || config.event || config.type || "").trim().toLowerCase();
    if (triggerEvent) result.triggerEvent = triggerEvent;

    const source = String(config.source || "").trim();
    if (source) result.source = source;

    const tagName = String(config.tagName || "").trim();
    if (tagName) result.tagName = tagName;

    return Object.keys(result).length > 0 ? result : null;
}

function extractTriggerConfigFromNodes(nodesRaw: unknown) {
    if (!Array.isArray(nodesRaw)) return null;

    const triggerNode = nodesRaw.find((node) => {
        if (!node || typeof node !== "object") return false;
        const n = node as Record<string, unknown>;
        const nodeType = String(n.type || "").toLowerCase();
        if (nodeType === "triggernode") return true;
        const data = n.data && typeof n.data === "object" ? (n.data as Record<string, unknown>) : null;
        if (!data) return false;
        const dataType = String(data.type || "").toLowerCase();
        if (dataType === "trigger" || dataType === "triggernode") return true;
        return String(n.id || "") === "trigger-1";
    });

    if (!triggerNode || typeof triggerNode !== "object") return null;
    const data =
        (triggerNode as Record<string, unknown>).data && typeof (triggerNode as Record<string, unknown>).data === "object"
            ? ((triggerNode as Record<string, unknown>).data as Record<string, unknown>)
            : null;

    return normalizeTriggerConfig(data);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const { id } = await context.params;
        const escritorioId = auth.user.escritorioId;
        if (!escritorioId) return NextResponse.json({ error: "No user context" }, { status: 400 });

        const flow = await db.automationFlow.findFirst({
            where: {
                id: id,
                escritorioId
            },
            include: {
                executions: { take: 10, orderBy: { startedAt: 'desc' } }
            }
        });

        if (!flow) return NextResponse.json({ error: "Flow not found" }, { status: 404 });

        return NextResponse.json(flow);
    } catch (e) {
        console.error("[GET_FLOW_ID]", e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        if (!canManageCRMConfiguration(auth.user)) {
            return NextResponse.json({ error: "Sem permissao para editar automacoes." }, { status: 403 });
        }

        const { id } = await context.params;
        const escritorioId = auth.user.escritorioId;
        if (!escritorioId) return NextResponse.json({ error: "No user" }, { status: 400 });

        const body = await request.json();

        const updateData: Prisma.AutomationFlowUpdateInput = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.isActive !== undefined) updateData.isActive = body.isActive;
        if (typeof body.triggerType === "string" && body.triggerType in TriggerType) {
            updateData.triggerType = body.triggerType as TriggerType;
        }

        let extractedTriggerConfig: ReturnType<typeof extractTriggerConfigFromNodes> | null = null;
        if (body.nodes !== undefined) updateData.nodes = JSON.stringify(body.nodes);
        if (body.edges !== undefined) updateData.edges = JSON.stringify(body.edges);
        if (body.nodes !== undefined) {
            extractedTriggerConfig = extractTriggerConfigFromNodes(body.nodes);
        }

        const explicitTriggerConfig = normalizeTriggerConfig(body.triggerConfig);
        if (explicitTriggerConfig) {
            updateData.triggerConfig = explicitTriggerConfig;
        } else if (extractedTriggerConfig) {
            updateData.triggerConfig = extractedTriggerConfig;
        }

        const flow = await db.automationFlow.update({
            where: { id: id, escritorioId },
            data: updateData
        });

        return NextResponse.json(flow);
    } catch (e) {
        console.error("[PUT_FLOW_ID]", e);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
