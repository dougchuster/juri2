import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { requireCRMAuth } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

const filtersSchema = z.record(z.string(), z.unknown());

const createSchema = z.object({
    name: z.string().min(1).max(80),
    filters: filtersSchema,
    isShared: z.boolean().default(false),
});

export async function GET(_req: NextRequest) {
    const auth = await requireCRMAuth();
    if (!auth.ok) return auth.response;

    const escritorioId = auth.user.escritorioId;
    if (!escritorioId) return NextResponse.json({ error: "Escritório não encontrado." }, { status: 400 });

    const views = await db.cRMSavedView.findMany({
        where: {
            escritorioId,
            OR: [
                { userId: auth.user.id },
                { isShared: true },
            ],
        },
        orderBy: [{ isShared: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(views);
}

export async function POST(req: NextRequest) {
    const auth = await requireCRMAuth();
    if (!auth.ok) return auth.response;

    const escritorioId = auth.user.escritorioId;
    if (!escritorioId) return NextResponse.json({ error: "Escritório não encontrado." }, { status: 400 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, filters, isShared } = parsed.data;

    const view = await db.cRMSavedView.create({
        data: {
            escritorioId,
            userId: auth.user.id,
            name,
            filters: filters as Prisma.InputJsonValue,
            isShared,
        },
    });

    return NextResponse.json(view, { status: 201 });
}
