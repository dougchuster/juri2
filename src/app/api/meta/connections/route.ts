import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";

const createSchema = z.object({
    displayName: z.string().min(1, "Nome de exibição obrigatório"),
    pageId: z.string().min(1, "Page ID obrigatório"),
    pageName: z.string().optional(),
    pageAccessToken: z.string().min(10, "Token de acesso obrigatório"),
    instagramAccountId: z.string().optional(),
    instagramUsername: z.string().optional(),
    verifyToken: z.string().min(6, "Verify token precisa ter ao menos 6 caracteres"),
});

async function requireAdmin() {
    const session = await getSession();
    if (!session) return { ok: false as const, response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
    if (!session.escritorioId) return { ok: false as const, response: NextResponse.json({ error: "Escritório não encontrado" }, { status: 403 }) };
    if (!(["ADMIN", "SOCIO"] as string[]).includes(session.role)) {
        return { ok: false as const, response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
    }
    return { ok: true as const, escritorioId: session.escritorioId };
}

// ─── GET — list connections for escritório ────────────────────────────────────

export async function GET(_req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const connections = await db.metaSocialConnection.findMany({
        where: { escritorioId: auth.escritorioId },
        select: {
            id: true,
            displayName: true,
            pageId: true,
            pageName: true,
            instagramAccountId: true,
            instagramUsername: true,
            verifyToken: true,
            isActive: true,
            lastWebhookAt: true,
            createdAt: true,
            _count: { select: { conversations: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(connections);
}

// ─── POST — create new connection ────────────────────────────────────────────

export async function POST(req: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
    }

    // Verify pageId uniqueness per escritório
    const existing = await db.metaSocialConnection.findFirst({
        where: { escritorioId: auth.escritorioId, pageId: parsed.data.pageId },
    });
    if (existing) {
        return NextResponse.json({ error: "Já existe uma conexão para este Page ID." }, { status: 409 });
    }

    const connection = await db.metaSocialConnection.create({
        data: {
            escritorioId: auth.escritorioId,
            displayName: parsed.data.displayName,
            pageId: parsed.data.pageId,
            pageName: parsed.data.pageName,
            pageAccessToken: parsed.data.pageAccessToken,
            instagramAccountId: parsed.data.instagramAccountId,
            instagramUsername: parsed.data.instagramUsername,
            verifyToken: parsed.data.verifyToken,
            isActive: true,
        },
        select: {
            id: true,
            displayName: true,
            pageId: true,
            pageName: true,
            instagramAccountId: true,
            instagramUsername: true,
            verifyToken: true,
            isActive: true,
            lastWebhookAt: true,
            createdAt: true,
        },
    });

    return NextResponse.json(connection, { status: 201 });
}
