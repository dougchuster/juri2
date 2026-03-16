import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCRMAuth, canManageCRMConfiguration } from "@/lib/auth/crm-auth";
import type { Prisma } from "@/generated/prisma";

export const dynamic = "force-dynamic";

type StageInput = {
    id: string;
    name: string;
    color?: string;
    isWon?: boolean;
    isLost?: boolean;
};

const DEFAULT_STAGES: StageInput[] = [
    { id: "novo_lead", name: "Novo Lead", color: "#94a3b8" },
    { id: "qualificacao_inicial", name: "Qualificacao Inicial", color: "#38bdf8" },
    { id: "consulta_agendada", name: "Consulta Agendada", color: "#22d3ee" },
    { id: "consulta_realizada", name: "Consulta Realizada", color: "#f59e0b" },
    { id: "proposta_enviada", name: "Proposta Enviada", color: "#fb7185" },
    { id: "negociacao", name: "Negociacao", color: "#fbbf24" },
    { id: "ganha", name: "Ganha", color: "#4ade80", isWon: true },
    { id: "perdida", name: "Perdida", color: "#f87171", isLost: true },
];

function normalizeStageId(value: unknown) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "_");
}

function parseStages(value: unknown): StageInput[] {
    if (!Array.isArray(value)) return DEFAULT_STAGES;
    const stages = value
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const stage = item as Record<string, unknown>;
            const id = normalizeStageId(stage.id || stage.name);
            const name = String(stage.name || "").trim();
            if (!id || !name) return null;
            return {
                id,
                name,
                color: typeof stage.color === "string" && stage.color.trim() ? stage.color.trim() : undefined,
                isWon: stage.isWon === true,
                isLost: stage.isLost === true,
            } as StageInput;
        })
        .filter((item): item is StageInput => item !== null);

    return stages.length > 0 ? stages : DEFAULT_STAGES;
}

async function resolveEscritorioId() {
    const escritorio = await db.escritorio.findFirst({ select: { id: true } });
    return escritorio?.id ?? null;
}

export async function GET() {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const escritorioId = auth.user.escritorioId ?? (await resolveEscritorioId());
        if (!escritorioId) return NextResponse.json({ error: "Escritorio nao encontrado." }, { status: 400 });

        const items = await db.cRMPipeline.findMany({
            where: { escritorioId },
            include: {
                _count: {
                    select: { cards: true },
                },
            },
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        });
        return NextResponse.json(items);
    } catch (error: unknown) {
        console.error("[CRM_CONFIG_PIPELINES_GET]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        if (!canManageCRMConfiguration(auth.user)) {
            return NextResponse.json({ error: "Sem permissao para gerenciar pipelines." }, { status: 403 });
        }

        const escritorioId = auth.user.escritorioId ?? (await resolveEscritorioId());
        if (!escritorioId) return NextResponse.json({ error: "Escritorio nao encontrado." }, { status: 400 });

        const body = (await request.json()) as {
            name?: string;
            description?: string | null;
            areaDireito?: string | null;
            tipoCliente?: string | null;
            isDefault?: boolean;
            ativo?: boolean;
            stages?: unknown;
        };

        const name = (body.name || "").trim();
        if (!name) return NextResponse.json({ error: "Nome do pipeline e obrigatorio." }, { status: 400 });

        const stages = parseStages(body.stages) as unknown as Prisma.InputJsonValue;

        const item = await db.$transaction(async (tx) => {
            if (body.isDefault === true) {
                await tx.cRMPipeline.updateMany({
                    where: { escritorioId, isDefault: true },
                    data: { isDefault: false },
                });
            }

            return tx.cRMPipeline.create({
                data: {
                    escritorioId,
                    name,
                    description: body.description || null,
                    areaDireito: body.areaDireito || null,
                    tipoCliente: body.tipoCliente || null,
                    isDefault: body.isDefault === true,
                    ativo: body.ativo !== false,
                    stages,
                },
            });
        });

        return NextResponse.json(item, { status: 201 });
    } catch (error: unknown) {
        console.error("[CRM_CONFIG_PIPELINES_POST]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
