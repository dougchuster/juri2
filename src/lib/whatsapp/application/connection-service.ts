import "server-only";

import { db } from "@/lib/db";
import { decryptJson, encryptJson } from "@/lib/security/encrypted-json";
import type {
    WhatsappConnection,
    WhatsappConnectionStatus,
    WhatsappProviderType,
} from "@/generated/prisma";
import type {
    WhatsappConnectionSecretPayload,
    WhatsappConnectionWithSecret,
} from "@/lib/whatsapp/providers/types";

type CreateConnectionInput = {
    escritorioId: string;
    providerType: WhatsappProviderType;
    displayName: string;
    isPrimary?: boolean;
    isActive?: boolean;
    baseUrl?: string | null;
    externalInstanceName?: string | null;
    externalInstanceId?: string | null;
    secretPayload: WhatsappConnectionSecretPayload;
};

type UpdateConnectionInput = {
    displayName?: string;
    isPrimary?: boolean;
    isActive?: boolean;
    baseUrl?: string | null;
    externalInstanceName?: string | null;
    externalInstanceId?: string | null;
    status?: WhatsappConnectionStatus;
    connectedPhone?: string | null;
    connectedName?: string | null;
    healthStatus?: string | null;
    lastHealthAt?: Date | null;
    lastConnectedAt?: Date | null;
    lastSyncAt?: Date | null;
    lastError?: string | null;
    secretPayload?: WhatsappConnectionSecretPayload | null;
};

export async function getDefaultEscritorioId() {
    const escritorio = await db.escritorio.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
    });

    return escritorio?.id || null;
}

export async function listWhatsappConnections(escritorioId?: string | null) {
    const resolvedEscritorioId = escritorioId || await getDefaultEscritorioId();
    if (!resolvedEscritorioId) return [];

    const connections = await db.whatsappConnection.findMany({
        where: { escritorioId: resolvedEscritorioId },
        include: { secret: true },
        orderBy: [
            { isPrimary: "desc" },
            { createdAt: "asc" },
        ],
    });

    return connections.map(mapConnectionSecret);
}

export async function getWhatsappConnectionById(connectionId: string) {
    const connection = await db.whatsappConnection.findUnique({
        where: { id: connectionId },
        include: { secret: true },
    });

    return connection ? mapConnectionSecret(connection) : null;
}

export async function getPrimaryWhatsappConnection(escritorioId?: string | null) {
    const resolvedEscritorioId = escritorioId || await getDefaultEscritorioId();
    if (!resolvedEscritorioId) return null;

    const primary = await db.whatsappConnection.findFirst({
        where: {
            escritorioId: resolvedEscritorioId,
            isPrimary: true,
            isActive: true,
        },
        include: { secret: true },
        orderBy: { updatedAt: "desc" },
    });

    if (primary) return mapConnectionSecret(primary);

    const fallback = await db.whatsappConnection.findFirst({
        where: {
            escritorioId: resolvedEscritorioId,
            isActive: true,
        },
        include: { secret: true },
        orderBy: [
            { createdAt: "asc" },
        ],
    });

    return fallback ? mapConnectionSecret(fallback) : null;
}

export async function findMetaWhatsappConnectionByPhoneNumberId(phoneNumberId: string) {
    const connections = await db.whatsappConnection.findMany({
        where: {
            providerType: "META_CLOUD_API",
            isActive: true,
        },
        include: { secret: true },
        orderBy: { updatedAt: "desc" },
    });

    return connections
        .map(mapConnectionSecret)
        .find((connection) => {
            const secret = getDecryptedConnectionSecret(connection);
            return secret?.providerType === "META_CLOUD_API" && secret.phoneNumberId === phoneNumberId;
        }) || null;
}

export async function findEvolutionWhatsappConnection(params: {
    connectionId?: string | null;
    instanceName?: string | null;
}) {
    if (params.connectionId) {
        const connection = await getWhatsappConnectionById(params.connectionId);
        if (connection) return connection;
    }

    if (!params.instanceName) return null;

    const connection = await db.whatsappConnection.findFirst({
        where: {
            providerType: "EVOLUTION_WHATSMEOW",
            externalInstanceName: params.instanceName,
            isActive: true,
        },
        include: { secret: true },
        orderBy: { updatedAt: "desc" },
    });

    return connection ? mapConnectionSecret(connection) : null;
}

export async function createWhatsappConnection(input: CreateConnectionInput) {
    const connection = await db.$transaction(async (tx) => {
        if (input.isPrimary) {
            await tx.whatsappConnection.updateMany({
                where: { escritorioId: input.escritorioId, isPrimary: true },
                data: { isPrimary: false },
            });
        }

        return tx.whatsappConnection.create({
            data: {
                escritorioId: input.escritorioId,
                providerType: input.providerType,
                displayName: input.displayName,
                isPrimary: Boolean(input.isPrimary),
                isActive: input.isActive ?? true,
                baseUrl: input.baseUrl || null,
                externalInstanceName: input.externalInstanceName || null,
                externalInstanceId: input.externalInstanceId || null,
                secret: {
                    create: {
                        payload: encryptJson(input.secretPayload),
                    },
                },
            },
            include: { secret: true },
        });
    });

    return mapConnectionSecret(connection);
}

export async function updateWhatsappConnection(connectionId: string, input: UpdateConnectionInput) {
    const current = await db.whatsappConnection.findUnique({
        where: { id: connectionId },
        select: { id: true, escritorioId: true },
    });

    if (!current) return null;

    const connection = await db.$transaction(async (tx) => {
        if (input.isPrimary) {
            await tx.whatsappConnection.updateMany({
                where: {
                    escritorioId: current.escritorioId,
                    isPrimary: true,
                    NOT: { id: connectionId },
                },
                data: { isPrimary: false },
            });
        }

        await tx.whatsappConnection.update({
            where: { id: connectionId },
            data: {
                ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
                ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
                ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
                ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl || null } : {}),
                ...(input.externalInstanceName !== undefined ? { externalInstanceName: input.externalInstanceName || null } : {}),
                ...(input.externalInstanceId !== undefined ? { externalInstanceId: input.externalInstanceId || null } : {}),
                ...(input.status !== undefined ? { status: input.status } : {}),
                ...(input.connectedPhone !== undefined ? { connectedPhone: input.connectedPhone || null } : {}),
                ...(input.connectedName !== undefined ? { connectedName: input.connectedName || null } : {}),
                ...(input.healthStatus !== undefined ? { healthStatus: input.healthStatus || null } : {}),
                ...(input.lastHealthAt !== undefined ? { lastHealthAt: input.lastHealthAt } : {}),
                ...(input.lastConnectedAt !== undefined ? { lastConnectedAt: input.lastConnectedAt } : {}),
                ...(input.lastSyncAt !== undefined ? { lastSyncAt: input.lastSyncAt } : {}),
                ...(input.lastError !== undefined ? { lastError: input.lastError || null } : {}),
            },
            include: { secret: true },
        });

        if (input.secretPayload !== undefined) {
            await tx.whatsappConnectionSecret.upsert({
                where: { connectionId },
                update: {
                    payload: input.secretPayload ? encryptJson(input.secretPayload) : {},
                },
                create: {
                    connectionId,
                    payload: input.secretPayload ? encryptJson(input.secretPayload) : {},
                },
            });
        }

        return tx.whatsappConnection.findUniqueOrThrow({
            where: { id: connectionId },
            include: { secret: true },
        });
    });

    return mapConnectionSecret(connection);
}

export async function deleteWhatsappConnection(connectionId: string) {
    await db.whatsappConnection.delete({ where: { id: connectionId } });
}

export async function setPrimaryWhatsappConnection(connectionId: string) {
    const connection = await db.whatsappConnection.findUnique({
        where: { id: connectionId },
        select: { id: true, escritorioId: true },
    });

    if (!connection) return null;

    await db.$transaction([
        db.whatsappConnection.updateMany({
            where: { escritorioId: connection.escritorioId, isPrimary: true },
            data: { isPrimary: false },
        }),
        db.whatsappConnection.update({
            where: { id: connectionId },
            data: { isPrimary: true },
        }),
    ]);

    return getWhatsappConnectionById(connectionId);
}

export async function resolveConversationWhatsappConnection(conversationId: string) {
    const conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        select: {
            id: true,
            whatsappConnectionId: true,
        },
    });

    if (!conversation) return null;
    if (conversation.whatsappConnectionId) {
        return getWhatsappConnectionById(conversation.whatsappConnectionId);
    }

    return getPrimaryWhatsappConnection();
}

export async function attachConversationToConnection(conversationId: string, connectionId: string) {
    await db.conversation.update({
        where: { id: conversationId },
        data: { whatsappConnectionId: connectionId },
    });
}

export function getDecryptedConnectionSecret(
    connection: WhatsappConnectionWithSecret | (WhatsappConnection & { secret: { payload: unknown } | null })
) {
    return decryptJson<WhatsappConnectionSecretPayload>(connection.secret?.payload || null);
}

function mapConnectionSecret(connection: WhatsappConnectionWithSecret) {
    return {
        ...connection,
        secret: connection.secret
            ? {
                ...connection.secret,
                payload: connection.secret.payload,
            }
            : null,
    };
}
