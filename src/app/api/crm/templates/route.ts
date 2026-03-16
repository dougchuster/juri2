import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma";
import { CanalComunicacao } from "@/generated/prisma";
import { db } from "@/lib/db";
import { requireCRMAuth, canManageCRMConfiguration } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

const CANAL_VALUES = ["WHATSAPP", "EMAIL"] as const;

const createSchema = z.object({
    name: z.string().min(1).max(120),
    canal: z.enum(CANAL_VALUES).optional().nullable(),
    category: z.string().min(1).max(60).default("GERAL"),
    subject: z.string().max(200).optional().nullable(),
    content: z.string().min(1),
    contentHtml: z.string().optional().nullable(),
    isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
    const auth = await requireCRMAuth();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const canal = searchParams.get("canal");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const where: Prisma.MessageTemplateWhereInput = {};

    if (canal && (canal === "WHATSAPP" || canal === "EMAIL")) {
        where.canal = canal as CanalComunicacao;
    }
    if (category) {
        where.category = category;
    }
    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { content: { contains: search, mode: "insensitive" } },
        ];
    }

    const templates = await db.messageTemplate.findMany({
        where,
        orderBy: [{ canal: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
    const auth = await requireCRMAuth();
    if (!auth.ok) return auth.response;
    if (!canManageCRMConfiguration(auth.user)) {
        return NextResponse.json({ error: "Sem permissão para criar templates." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
    }

    try {
        const { canal, ...rest } = parsed.data;
        const template = await db.messageTemplate.create({
            data: {
                ...rest,
                canal: canal as CanalComunicacao | null | undefined,
            },
        });
        return NextResponse.json(template, { status: 201 });
    } catch (err) {
        if ((err as { code?: string }).code === "P2002") {
            return NextResponse.json({ error: "Já existe um template com esse nome." }, { status: 409 });
        }
        return NextResponse.json({ error: "Erro ao criar template." }, { status: 500 });
    }
}
