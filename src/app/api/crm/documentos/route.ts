import { NextResponse } from "next/server";
import { CRMDocumentType } from "@/generated/prisma";
import { db } from "@/lib/db";
import { requireCRMAuth } from "@/lib/auth/crm-auth";
import { buildDocumentVisibilityWhere } from "@/lib/auth/crm-scope";
import { isUserScopedCRM } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

async function resolveEscritorioId() {
    const escritorio = await db.escritorio.findFirst({ select: { id: true } });
    return escritorio?.id ?? null;
}

function parseDocumentType(value: unknown): CRMDocumentType | undefined {
    if (typeof value !== "string") return undefined;
    return Object.values(CRMDocumentType).includes(value as CRMDocumentType)
        ? (value as CRMDocumentType)
        : undefined;
}

export async function GET(request: Request) {
    try {
        const auth = await requireCRMAuth();
        if (!auth.ok) return auth.response;

        const escritorioId = auth.user.escritorioId ?? (await resolveEscritorioId());
        if (!escritorioId) return NextResponse.json({ error: "No config" }, { status: 400 });

        const { searchParams } = new URL(request.url);
        const cardId = searchParams.get("cardId") || undefined;
        const clienteId = searchParams.get("clienteId") || undefined;
        const documentScope = buildDocumentVisibilityWhere(auth.user);

        const docs = await db.cRMCommercialDocument.findMany({
            where: {
                AND: [
                    {
                        escritorioId,
                        ...(cardId ? { cardId } : {}),
                        ...(clienteId ? { clienteId } : {}),
                    },
                    documentScope,
                ],
            },
            include: {
                cliente: { select: { id: true, nome: true } },
                card: { select: { id: true, title: true } },
                processo: { select: { id: true, numeroCnj: true } },
                createdBy: { select: { id: true, name: true } },
            },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(docs);
    } catch (error) {
        console.error("[CRM_DOCS_GET]", error);
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
        const type = parseDocumentType(body.type);
        if (!type || !body.nome || !body.fileUrl) {
            return NextResponse.json({ error: "Campos obrigatorios: type, nome, fileUrl" }, { status: 400 });
        }

        const created = await db.cRMCommercialDocument.create({
            data: {
                escritorioId,
                type,
                nome: body.nome,
                descricao: body.descricao,
                fileUrl: body.fileUrl,
                version: Number(body.version) || 1,
                templateName: body.templateName,
                mergeData: body.mergeData || undefined,
                signedAt: body.signedAt ? new Date(body.signedAt) : null,
                createdById: isUserScopedCRM(auth.user) ? auth.user.id : body.createdById,
                cardId: body.cardId,
                clienteId: body.clienteId,
                processoId: body.processoId,
            },
        });

        return NextResponse.json(created, { status: 201 });
    } catch (error: unknown) {
        console.error("[CRM_DOCS_POST]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
