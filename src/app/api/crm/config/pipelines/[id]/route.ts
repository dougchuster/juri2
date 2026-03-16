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
    if (!Array.isArray(value)) return [];
    return value
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
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        if (!canManageCRMConfiguration(auth.user)) {
            return NextResponse.json({ error: "Sem permissao para gerenciar pipelines." }, { status: 403 });
        }

        const { id } = await params;
        const body = (await request.json()) as {
            name?: string;
            description?: string | null;
            areaDireito?: string | null;
            tipoCliente?: string | null;
            isDefault?: boolean;
            ativo?: boolean;
            stages?: unknown;
        };

        const existing = await db.cRMPipeline.findUnique({
            where: { id },
            select: { id: true, escritorioId: true },
        });
        if (!existing) return NextResponse.json({ error: "Pipeline nao encontrado." }, { status: 404 });

        const updateData: Prisma.CRMPipelineUpdateInput = {
            ...(body.name !== undefined ? { name: body.name } : {}),
            ...(body.description !== undefined ? { description: body.description } : {}),
            ...(body.areaDireito !== undefined ? { areaDireito: body.areaDireito } : {}),
            ...(body.tipoCliente !== undefined ? { tipoCliente: body.tipoCliente } : {}),
            ...(body.ativo !== undefined ? { ativo: body.ativo } : {}),
        };

        if (body.stages !== undefined) {
            const stages = parseStages(body.stages);
            if (stages.length === 0) {
                return NextResponse.json({ error: "Informe ao menos um estagio valido." }, { status: 400 });
            }
            updateData.stages = stages as unknown as Prisma.InputJsonValue;
        }

        const item = await db.$transaction(async (tx) => {
            if (body.isDefault === true) {
                await tx.cRMPipeline.updateMany({
                    where: {
                        escritorioId: existing.escritorioId,
                        isDefault: true,
                        id: { not: id },
                    },
                    data: { isDefault: false },
                });
                updateData.isDefault = true;
            }

            return tx.cRMPipeline.update({
                where: { id },
                data: updateData,
            });
        });

        return NextResponse.json(item);
    } catch (error: unknown) {
        console.error("[CRM_CONFIG_PIPELINES_PATCH]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        if (!canManageCRMConfiguration(auth.user)) {
            return NextResponse.json({ error: "Sem permissao para gerenciar pipelines." }, { status: 403 });
        }

        const { id } = await params;
        const pipeline = await db.cRMPipeline.findUnique({
            where: { id },
            select: {
                id: true,
                isDefault: true,
                _count: { select: { cards: true } },
            },
        });
        if (!pipeline) return NextResponse.json({ error: "Pipeline nao encontrado." }, { status: 404 });

        if (pipeline.isDefault) {
            return NextResponse.json({ error: "Pipeline padrao nao pode ser removido." }, { status: 400 });
        }

        if (pipeline._count.cards > 0) {
            await db.cRMPipeline.update({
                where: { id },
                data: { ativo: false },
            });
            return NextResponse.json({ success: true, archived: true });
        }

        await db.cRMPipeline.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("[CRM_CONFIG_PIPELINES_DELETE]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
