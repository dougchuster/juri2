import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";

async function requireAdmin(escritorioId: string) {
    const session = await getSession();
    if (!session) return { ok: false as const, response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
    if (session.escritorioId !== escritorioId) return { ok: false as const, response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
    if (!(["ADMIN", "SOCIO"] as string[]).includes(session.role)) {
        return { ok: false as const, response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
    }
    return { ok: true as const };
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    const connection = await db.metaSocialConnection.findUnique({
        where: { id },
        select: { escritorioId: true },
    });
    if (!connection) {
        return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });
    }

    const auth = await requireAdmin(connection.escritorioId);
    if (!auth.ok) return auth.response;

    await db.metaSocialConnection.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    const connection = await db.metaSocialConnection.findUnique({
        where: { id },
        select: { escritorioId: true },
    });
    if (!connection) {
        return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });
    }

    const auth = await requireAdmin(connection.escritorioId);
    if (!auth.ok) return auth.response;

    const body = await req.json() as Record<string, unknown>;
    const updated = await db.metaSocialConnection.update({
        where: { id },
        data: {
            ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
            ...(typeof body.displayName === "string" ? { displayName: body.displayName } : {}),
            ...(typeof body.pageAccessToken === "string" ? { pageAccessToken: body.pageAccessToken } : {}),
            ...(typeof body.instagramAccountId === "string" ? { instagramAccountId: body.instagramAccountId } : {}),
            ...(typeof body.instagramUsername === "string" ? { instagramUsername: body.instagramUsername } : {}),
        },
        select: {
            id: true, displayName: true, pageId: true, pageName: true,
            instagramAccountId: true, instagramUsername: true, isActive: true,
        },
    });

    return NextResponse.json(updated);
}
