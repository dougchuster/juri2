"use server";

import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function markNotificationsAsRead(notificationIds?: string[]) {
    const session = await getSession();

    if (!session?.id) {
        return { ok: false as const, error: "Sessao invalida." };
    }

    const ids = (notificationIds || []).filter(Boolean);

    await db.notificacao.updateMany({
        where: {
            userId: session.id,
            lida: false,
            ...(ids.length > 0 ? { id: { in: ids } } : {}),
        },
        data: { lida: true },
    });

    revalidatePath("/dashboard", "layout");

    return { ok: true as const };
}
