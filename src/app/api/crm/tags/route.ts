import { NextResponse } from "next/server";
import type { ContactTagCategory, Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { requireCRMAuth } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

const CONTACT_TAG_CATEGORIES: ContactTagCategory[] = [
    "PROCESSOS",
    "PRAZOS",
    "COBRANCAS",
    "ATENDIMENTO",
    "OUTROS",
];

async function resolveEscritorioId() {
    const escritorio = await db.escritorio.findFirst({ select: { id: true } });
    return escritorio?.id ?? null;
}

function isUnknownCategoryArgumentError(error: unknown) {
    if (!error) return false;
    const message = typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message)
        : String(error);
    return message.includes("Unknown argument `category`");
}

export async function GET(request: Request) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const escritorioId = auth.user.escritorioId ?? (await resolveEscritorioId());
        if (!escritorioId) {
            return NextResponse.json({ error: "Escritorio nao configurado" }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("q");
        const category = searchParams.get("category")?.toUpperCase() as ContactTagCategory | undefined;

        const whereClause: Prisma.ContactTagWhereInput = { escritorioId };
        if (search) {
            whereClause.name = { contains: search, mode: "insensitive" };
        }
        if (category && CONTACT_TAG_CATEGORIES.includes(category)) {
            whereClause.category = category;
        }

        let tags;
        try {
            tags = await db.contactTag.findMany({
                where: whereClause,
                orderBy: [{ category: "asc" }, { name: "asc" }],
                include: {
                    _count: {
                        select: { clientes: true },
                    },
                },
            });
        } catch (error) {
            if (!isUnknownCategoryArgumentError(error)) throw error;
            // Fallback for stale runtime clients before process restart.
            tags = await db.contactTag.findMany({
                where: { escritorioId, ...(search ? { name: { contains: search, mode: "insensitive" } } : {}) },
                orderBy: { name: "asc" },
                include: {
                    _count: {
                        select: { clientes: true },
                    },
                },
            });
        }

        return NextResponse.json(tags);
    } catch (error) {
        console.error("[GET_TAGS_ERROR]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const escritorioId = auth.user.escritorioId ?? (await resolveEscritorioId());
        if (!escritorioId) {
            return NextResponse.json({ error: "Escritorio nao configurado" }, { status: 400 });
        }

        const body = await request.json();
        const { name, color, description } = body;
        const categoryRaw = typeof body?.category === "string" ? body.category.toUpperCase() : "ATENDIMENTO";

        if (!name) {
            return NextResponse.json({ error: "Nome da tag e obrigatorio" }, { status: 400 });
        }
        if (!CONTACT_TAG_CATEGORIES.includes(categoryRaw as ContactTagCategory)) {
            return NextResponse.json({ error: "Categoria de tag invalida." }, { status: 400 });
        }

        let newTag;
        try {
            newTag = await db.contactTag.create({
                data: {
                    name,
                    category: categoryRaw as ContactTagCategory,
                    color: color || "#3B82F6",
                    description,
                    escritorioId,
                },
            });
        } catch (error) {
            if (!isUnknownCategoryArgumentError(error)) throw error;
            // Fallback for stale runtime clients before process restart.
            newTag = await db.contactTag.create({
                data: {
                    name,
                    color: color || "#3B82F6",
                    description,
                    escritorioId,
                },
            });
        }

        return NextResponse.json(newTag);
    } catch (error: unknown) {
        console.error("[POST_TAGS_ERROR]", error);
        const code =
            typeof error === "object" && error !== null && "code" in error
                ? (error as { code?: unknown }).code
                : undefined;
        if (code === "P2002") {
            return NextResponse.json({ error: "Ja existe uma tag com este nome." }, { status: 409 });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
