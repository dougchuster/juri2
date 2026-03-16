import { NextResponse } from "next/server";

import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function POST(_request: Request, context: RouteContext) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    try {
        const { id } = await context.params;
        const readAt = new Date();

        await db.conversation.update({
            where: { id },
            data: { unreadCount: 0 },
        });

        await db.message.updateMany({
            where: {
                conversationId: id,
                direction: "INBOUND",
                readAt: null,
            },
            data: { readAt },
        });

        return NextResponse.json({ success: true, conversationId: id, readAt: readAt.toISOString() });
    } catch (error) {
        console.error("[API] Error marking communication conversation as read:", error);
        return NextResponse.json({ error: "Falha ao marcar conversa como lida." }, { status: 500 });
    }
}
