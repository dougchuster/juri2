import "server-only";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma";
import { getMfaSetupSnapshot } from "@/lib/services/mfa-service";

export async function getUserMfaState(userId: string, email: string, role: Role) {
    return db.$transaction(async (tx) => {
        const snapshot = await getMfaSetupSnapshot(tx, { id: userId, email, role });
        const securityAlerts = await tx.notificacao.findMany({
            where: {
                userId,
                tipo: "SISTEMA",
                titulo: { startsWith: "Seguranca:" },
            },
            orderBy: { createdAt: "desc" },
            take: 6,
            select: {
                id: true,
                titulo: true,
                mensagem: true,
                lida: true,
                createdAt: true,
            },
        });

        return {
            ...snapshot,
            securityAlerts,
        };
    });
}
