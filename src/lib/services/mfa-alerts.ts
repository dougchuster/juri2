import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";

type NotificationClient = Pick<typeof db, "notificacao"> | Prisma.TransactionClient;

export async function createMfaSecurityNotification(
    client: NotificationClient,
    input: {
        userId: string;
        titulo: string;
        mensagem: string;
        linkUrl?: string | null;
    }
) {
    await client.notificacao.create({
        data: {
            userId: input.userId,
            tipo: "SISTEMA",
            titulo: input.titulo,
            mensagem: input.mensagem,
            linkUrl: input.linkUrl ?? "/perfil",
        },
    });
}
