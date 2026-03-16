"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/actions/auth";
import { refreshBISnapshots } from "@/lib/services/bi-refresh";

async function requireBISession() {
    const session = await getSession();
    if (!session?.id) {
        throw new Error("Sessao invalida.");
    }

    if (!["ADMIN", "SOCIO", "CONTROLADOR", "FINANCEIRO"].includes(String(session.role))) {
        throw new Error("Sem permissao para operar BI interno.");
    }

    return session;
}

export async function refreshBISnapshotsAction() {
    try {
        const session = await requireBISession();
        const result = await refreshBISnapshots({ actorUserId: session.id });
        revalidatePath("/admin/bi");
        return { success: true, result };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao atualizar BI interno.",
        };
    }
}
