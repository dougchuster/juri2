import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TriggerType } from "@/generated/prisma";
import { z } from "zod";
import { requireCRMAuth, canManageCRMConfiguration } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

const createFlowSchema = z.object({
    name: z.string().min(1, "Nome e obrigatorio"),
    description: z.string().optional(),
    triggerType: z.nativeEnum(TriggerType),
    triggerEvent: z.string().optional(),
});

function buildTriggerConfig(triggerType: TriggerType, triggerEventRaw?: string) {
    const triggerEvent = String(triggerEventRaw || "").trim().toLowerCase();
    if (triggerType === TriggerType.MANUAL || triggerType === TriggerType.WEBHOOK) {
        return {
            triggerEvent: triggerEvent || "pipeline_moved",
        };
    }
    return triggerEvent ? { triggerEvent } : null;
}

export async function GET() {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const escritorioId = auth.user.escritorioId;
        if (!escritorioId) return NextResponse.json({ error: "No user context" }, { status: 400 });

        const flows = await db.automationFlow.findMany({
            where: { escritorioId },
            orderBy: { updatedAt: "desc" },
            select: {
                id: true,
                name: true,
                description: true,
                triggerType: true,
                triggerConfig: true,
                isActive: true,
                executionCount: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(flows);
    } catch (e) {
        console.error("[GET_FLOWS]", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        if (!canManageCRMConfiguration(auth.user)) {
            return NextResponse.json({ error: "Sem permissao para criar automacoes." }, { status: 403 });
        }

        const escritorioId = auth.user.escritorioId;
        if (!escritorioId) return NextResponse.json({ error: "No user context" }, { status: 400 });

        const body = await request.json();
        const validated = createFlowSchema.parse(body);
        const triggerConfig = buildTriggerConfig(validated.triggerType, validated.triggerEvent);

        const flow = await db.automationFlow.create({
            data: {
                escritorioId,
                name: validated.name,
                description: validated.description,
                triggerType: validated.triggerType as TriggerType,
                ...(triggerConfig ? { triggerConfig } : {}),
                isActive: false,
                nodes: JSON.stringify([
                    {
                        id: "trigger-1",
                        type: "triggerNode",
                        position: { x: 250, y: 50 },
                        data: {
                            type: "TRIGGER",
                            triggerType: validated.triggerType,
                            triggerEvent: triggerConfig?.triggerEvent || null,
                            label: "Gatilho Inicial",
                        },
                    },
                ]),
                edges: "[]",
            },
        });

        return NextResponse.json(flow);
    } catch (e) {
        console.error("[POST_FLOW]", e);
        return NextResponse.json({ error: "Validation Error / Internal Error" }, { status: 500 });
    }
}
