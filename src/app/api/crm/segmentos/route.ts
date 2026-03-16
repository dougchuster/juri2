import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recalculateSegmentMembers, previewSegment } from "@/lib/services/segment-engine";
import { z } from "zod";
import { requireCRMAuth } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

const createSegmentSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    rules: z.array(z.object({
        field: z.string(),
        operator: z.string().optional(),
        value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
    })).default([]),
    isDynamic: z.boolean().optional().default(true),
    previewOnly: z.boolean().optional().default(false),
});

async function resolveEscritorioId() {
    const escritorio = await db.escritorio.findFirst({ select: { id: true } });
    return escritorio?.id ?? null;
}

export async function GET(request: Request) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const escritorioId = auth.user.escritorioId ?? (await resolveEscritorioId());
        if (!escritorioId) return NextResponse.json({ error: "No config" }, { status: 400 });

        const { searchParams } = new URL(request.url);
        const preview = searchParams.get("preview") === "1";
        if (preview) {
            const rulesParam = searchParams.get("rules");
            const rules = rulesParam ? JSON.parse(rulesParam) : [];
            const result = await previewSegment(rules, 100);
            return NextResponse.json(result);
        }

        const segmentos = await db.contactSegment.findMany({
            where: { escritorioId },
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { members: true, campaigns: true },
                },
            },
        });

        return NextResponse.json(segmentos);
    } catch (error) {
        console.error("[CRM_SEGMENTOS_GET]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const escritorioId = auth.user.escritorioId ?? (await resolveEscritorioId());
        if (!escritorioId) return NextResponse.json({ error: "No config" }, { status: 400 });

        const body = await request.json();
        const parsed = createSegmentSchema.parse(body);

        if (parsed.previewOnly) {
            const preview = await previewSegment(parsed.rules, 100);
            return NextResponse.json(preview);
        }

        const created = await db.contactSegment.create({
            data: {
                escritorioId,
                name: parsed.name,
                description: parsed.description,
                rules: parsed.rules,
                isDynamic: parsed.isDynamic,
            },
        });

        await recalculateSegmentMembers(created.id);

        const refreshed = await db.contactSegment.findUnique({
            where: { id: created.id },
            include: {
                _count: {
                    select: { members: true },
                },
            },
        });

        return NextResponse.json(refreshed, { status: 201 });
    } catch (error: unknown) {
        console.error("[CRM_SEGMENTOS_POST]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
