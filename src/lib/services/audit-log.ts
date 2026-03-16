import { db } from "@/lib/db";

type AuditClient = Pick<typeof db, "logAuditoria" | "user">;

export interface AuditLogInput {
    acao: string;
    entidade: string;
    entidadeId: string;
    dadosAntes?: unknown;
    dadosDepois?: unknown;
    actorUserId?: string | null;
    ipAddress?: string | null;
    client?: AuditClient;
}

async function resolveAuditUserId(client: AuditClient, actorUserId?: string | null) {
    if (actorUserId) return actorUserId;
    const fallback = await client.user.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
    });
    return fallback?.id || null;
}

export async function registrarLogAuditoria(input: AuditLogInput) {
    try {
        const client = input.client || db;
        const userId = await resolveAuditUserId(client, input.actorUserId);
        if (!userId) return false;

        await client.logAuditoria.create({
            data: {
                userId,
                acao: input.acao,
                entidade: input.entidade,
                entidadeId: input.entidadeId,
                dadosAntes: input.dadosAntes ?? undefined,
                dadosDepois: input.dadosDepois ?? undefined,
                ipAddress: input.ipAddress ?? null,
            },
        });
        return true;
    } catch (error) {
        console.warn("[auditoria] Falha ao registrar log:", error);
        return false;
    }
}

