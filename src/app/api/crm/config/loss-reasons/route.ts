import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCRMAuth, canManageCRMConfiguration } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

async function resolveEscritorioId() {
    const escritorio = await db.escritorio.findFirst({ select: { id: true } });
    return escritorio?.id ?? null;
}

export async function GET() {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const escritorioId = auth.user.escritorioId ?? (await resolveEscritorioId());
        if (!escritorioId) return NextResponse.json({ error: "No config" }, { status: 400 });

        const reasons = await db.cRMLossReason.findMany({
            where: { escritorioId },
            orderBy: { nome: "asc" },
        });

        return NextResponse.json(reasons);
    } catch (error) {
        console.error("[CRM_LOSS_REASONS_GET]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;
        if (!canManageCRMConfiguration(auth.user)) {
            return NextResponse.json({ error: "Sem permissao para configurar motivos de perda." }, { status: 403 });
        }

        const escritorioId = auth.user.escritorioId ?? (await resolveEscritorioId());
        if (!escritorioId) return NextResponse.json({ error: "No config" }, { status: 400 });

        const body = await request.json();
        if (!body.nome) return NextResponse.json({ error: "Nome e obrigatorio" }, { status: 400 });

        const created = await db.cRMLossReason.create({
            data: {
                escritorioId,
                nome: body.nome,
                descricao: body.descricao,
                ativo: body.ativo ?? true,
            },
        });

        return NextResponse.json(created, { status: 201 });
    } catch (error: unknown) {
        console.error("[CRM_LOSS_REASONS_POST]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
