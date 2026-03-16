import { NextResponse } from "next/server";
import { z } from "zod";
import { CRMActivityOutcome, CRMActivityType } from "@/generated/prisma";
import { db } from "@/lib/db";
import { createCRMActivity, listCRMActivities } from "@/lib/dal/crm/activities";
import { requireCRMAuth } from "@/lib/auth/crm-auth";
import { buildActivityVisibilityWhere } from "@/lib/auth/crm-scope";
import { isUserScopedCRM } from "@/lib/auth/crm-auth";

const criarAtividadeSchema = z.object({
    type: z.nativeEnum(CRMActivityType),
    subject: z.string().min(1, "subject é obrigatório").max(500),
    description: z.string().max(5000).optional().nullable(),
    scheduledAt: z.string().datetime({ offset: true }).optional().nullable(),
    completedAt: z.string().datetime({ offset: true }).optional().nullable(),
    outcome: z.nativeEnum(CRMActivityOutcome).optional().nullable(),
    durationMinutes: z.number().int().min(1).max(1440).optional().nullable(),
    cardId: z.string().optional().nullable(),
    clienteId: z.string().optional().nullable(),
    processoId: z.string().optional().nullable(),
    ownerId: z.string().optional().nullable(),
});

export const dynamic = "force-dynamic";

async function resolveEscritorioId() {
    const escritorio = await db.escritorio.findFirst({ select: { id: true } });
    return escritorio?.id ?? null;
}

function parseActivityType(value: unknown): CRMActivityType | undefined {
    if (typeof value !== "string") return undefined;
    return Object.values(CRMActivityType).includes(value as CRMActivityType)
        ? (value as CRMActivityType)
        : undefined;
}

function parseActivityOutcome(value: unknown): CRMActivityOutcome | undefined {
    if (typeof value !== "string") return undefined;
    return Object.values(CRMActivityOutcome).includes(value as CRMActivityOutcome)
        ? (value as CRMActivityOutcome)
        : undefined;
}

export async function GET(request: Request) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const escritorioId = auth.user.escritorioId ?? (await resolveEscritorioId());
        if (!escritorioId) return NextResponse.json({ error: "No config" }, { status: 400 });

        const { searchParams } = new URL(request.url);
        const result = await listCRMActivities({
            escritorioId,
            cardId: searchParams.get("cardId") || undefined,
            clienteId: searchParams.get("clienteId") || undefined,
            ownerId: isUserScopedCRM(auth.user) ? auth.user.id : searchParams.get("ownerId") || undefined,
            type: parseActivityType(searchParams.get("type")),
            outcome: parseActivityOutcome(searchParams.get("outcome")),
            page: Math.max(1, Number(searchParams.get("page") || 1)),
            pageSize: Math.min(200, Math.max(1, Number(searchParams.get("pageSize") || 50))),
            scopeWhere: buildActivityVisibilityWhere(auth.user),
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("[CRM_ATIVIDADES_GET]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const escritorioId = auth.user.escritorioId ?? (await resolveEscritorioId());
        if (!escritorioId) return NextResponse.json({ error: "No config" }, { status: 400 });

        const raw = await request.json();
        const parsed = criarAtividadeSchema.safeParse(raw);
        if (!parsed.success) {
            const messages = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
            return NextResponse.json({ error: messages }, { status: 422 });
        }

        const {
            type,
            subject,
            description,
            scheduledAt,
            completedAt,
            outcome,
            cardId,
            clienteId,
            processoId,
            ownerId,
        } = parsed.data;

        const activity = await createCRMActivity({
            escritorioId,
            type,
            subject,
            description: description ?? undefined,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
            completedAt: completedAt ? new Date(completedAt) : undefined,
            outcome: outcome ?? undefined,
            ownerId: isUserScopedCRM(auth.user) ? auth.user.id : (ownerId ?? undefined),
            clienteId: clienteId ?? undefined,
            cardId: cardId ?? undefined,
            processoId: processoId ?? undefined,
        });

        return NextResponse.json(activity, { status: 201 });
    } catch (error: unknown) {
        console.error("[CRM_ATIVIDADES_POST]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
