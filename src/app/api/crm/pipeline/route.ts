import { NextResponse } from "next/server";
import { z } from "zod";
import { getEscritorioPipeline, createCard, getLossReasons, ensureEscritorioPipeline } from "@/lib/dal/crm/pipeline";
import { db } from "@/lib/db";
import { requireCRMAuth } from "@/lib/auth/crm-auth";
import { buildCardVisibilityWhere } from "@/lib/auth/crm-scope";
import { isUserScopedCRM } from "@/lib/auth/crm-auth";
import { resolveAutomaticAssignment } from "@/lib/services/crm-config";
import { AutomationEngine } from "@/lib/services/automation-engine";
import { getCRMConfig } from "@/lib/services/crm-config";

const criarCardSchema = z.object({
    pipelineId: z.string().min(1, "pipelineId é obrigatório"),
    clienteId: z.string().min(1, "clienteId é obrigatório"),
    title: z.string().min(1, "título é obrigatório").max(255),
    stage: z.string().min(1, "stage é obrigatório"),
    value: z.number().min(0).optional(),
    probability: z.number().min(0).max(100).optional(),
    notes: z.string().max(2000).optional().nullable(),
    expectedCloseAt: z.string().datetime({ offset: true }).optional().nullable(),
    areaDireito: z.string().max(100).optional().nullable(),
    subareaDireito: z.string().max(100).optional().nullable(),
    origem: z.string().max(100).optional().nullable(),
    description: z.string().max(5000).optional().nullable(),
    ownerId: z.string().optional().nullable(),
    responsavelAdvogadoId: z.string().optional().nullable(),
    lostReasonId: z.string().optional().nullable(),
    lostReasonDetail: z.string().max(500).optional().nullable(),
    currency: z.string().max(10).optional().nullable(),
});

export const dynamic = "force-dynamic";

function normalizeOptionalString(value: unknown) {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

async function resolveEscritorioId() {
    const escritorio = await db.escritorio.findFirst({ select: { id: true } });
    return escritorio?.id ?? null;
}

export async function GET(request: Request) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const escritorioId = auth.user.escritorioId ?? (await resolveEscritorioId());
        if (!escritorioId) {
            return NextResponse.json({ error: "Escritorio nao encontrado." }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const pipelineId = searchParams.get("pipelineId") || undefined;

        await ensureEscritorioPipeline(escritorioId);

        const cardScope = buildCardVisibilityWhere(auth.user);
        const [pipeline, lossReasons, pipelines, config] = await Promise.all([
            getEscritorioPipeline(escritorioId, pipelineId, cardScope),
            getLossReasons(escritorioId),
            db.cRMPipeline.findMany({
                where: { escritorioId, ativo: true },
                select: { id: true, name: true, areaDireito: true, isDefault: true },
                orderBy: [{ isDefault: "desc" }, { name: "asc" }],
            }),
            getCRMConfig(),
        ]);

        return NextResponse.json({
            ...pipeline,
            lossReasons,
            pipelines,
            crmConfig: {
                areasDireito: config.areasDireito,
                subareasByArea: config.subareasByArea,
            },
        });
    } catch (error: unknown) {
        console.error("[API] Error fetching pipeline:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: "Internal Server Error", message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const raw = await request.json();
        const parsed = criarCardSchema.safeParse(raw);
        if (!parsed.success) {
            const messages = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
            return NextResponse.json({ error: messages }, { status: 422 });
        }

        const {
            pipelineId,
            clienteId,
            title,
            stage,
            value,
            probability,
            notes,
            expectedCloseAt,
            areaDireito,
            subareaDireito,
            origem,
            description,
            ownerId,
            responsavelAdvogadoId,
            lostReasonId,
            lostReasonDetail,
            currency,
        } = parsed.data;

        const assignment = isUserScopedCRM(auth.user)
            ? { ownerId: auth.user.id, responsavelAdvogadoId: auth.user.advogadoId || responsavelAdvogadoId || null }
            : await resolveAutomaticAssignment({
                areaDireito: areaDireito ?? undefined,
                origem: origem ?? undefined,
                ownerId: ownerId ?? undefined,
                responsavelAdvogadoId: responsavelAdvogadoId ?? undefined,
            });

        const card = await createCard({
            pipelineId,
            clienteId,
            title,
            stage,
            value,
            probability,
            notes: notes ?? undefined,
            expectedCloseAt: expectedCloseAt ? new Date(expectedCloseAt) : undefined,
            areaDireito: areaDireito ?? undefined,
            subareaDireito: subareaDireito ?? undefined,
            origem: origem ?? undefined,
            description: description ?? undefined,
            ownerId: assignment.ownerId || undefined,
            responsavelAdvogadoId: assignment.responsavelAdvogadoId || undefined,
            lostReasonId: lostReasonId ?? undefined,
            lostReasonDetail: lostReasonDetail ?? undefined,
            currency: currency ?? undefined,
        });

        const escritorioId = auth.user.escritorioId ?? (await resolveEscritorioId());
        if (escritorioId) {
            void AutomationEngine.handleCustomEvent("pipeline_moved", {
                escritorioId,
                clienteId: card.clienteId,
                cardId: card.id,
                stage: card.stage,
                status: card.status,
                source: card.origem || undefined,
            });
        }

        return NextResponse.json(card, { status: 201 });
    } catch (error: unknown) {
        console.error("[API] Error creating pipeline card:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
