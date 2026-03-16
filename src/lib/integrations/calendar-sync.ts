import "server-only";
import { db } from "@/lib/db";
import {
    createGoogleEvent,
    updateGoogleEvent,
    deleteGoogleEvent,
} from "./google-calendar";
import {
    createOutlookEvent,
    updateOutlookEvent,
    deleteOutlookEvent,
} from "./outlook-calendar";
import type { CalendarProvider } from "@/generated/prisma";

// ──────────────────────────────────────────────────────────
// Unified interface for creating/updating/deleting events
// across all connected calendar providers for a given user
// ──────────────────────────────────────────────────────────

interface CalendarEventData {
    title: string;
    description?: string;
    startAt: Date;
    endAt?: Date;
    location?: string;
    allDay?: boolean;
}

/**
 * Get all active calendar integrations for a user
 */
export async function getUserIntegrations(userId: string) {
    return db.calendarIntegration.findMany({
        where: { userId, enabled: true },
    });
}

/**
 * Get integration status for a user (for UI display)
 */
export async function getIntegrationStatus(userId: string) {
    const integrations = await db.calendarIntegration.findMany({
        where: { userId },
        select: {
            id: true,
            provider: true,
            email: true,
            enabled: true,
            lastSyncAt: true,
            syncErrors: true,
            createdAt: true,
        },
    });

    const google = integrations.find((i) => i.provider === "GOOGLE") || null;
    const outlook = integrations.find((i) => i.provider === "OUTLOOK") || null;

    const syncedEventsCount = await db.calendarEvent.count({
        where: {
            integrationId: { in: integrations.map((i) => i.id) },
        },
    });

    return { google, outlook, syncedEventsCount };
}

// ──────────────────────────────────────────────────────────
// SYNC: Push events to connected calendars
// ──────────────────────────────────────────────────────────

async function createExternalEvent(
    provider: CalendarProvider,
    userId: string,
    event: CalendarEventData
): Promise<string | null> {
    if (provider === "GOOGLE") {
        return (await createGoogleEvent(userId, event)) ?? null;
    } else if (provider === "OUTLOOK") {
        return (await createOutlookEvent(userId, event)) ?? null;
    }
    return null;
}

async function updateExternalEvent(
    provider: CalendarProvider,
    userId: string,
    externalEventId: string,
    event: Partial<CalendarEventData>
): Promise<boolean> {
    if (provider === "GOOGLE") {
        return updateGoogleEvent(userId, externalEventId, event);
    } else if (provider === "OUTLOOK") {
        return updateOutlookEvent(userId, externalEventId, event);
    }
    return false;
}

async function deleteExternalEvent(
    provider: CalendarProvider,
    userId: string,
    externalEventId: string
): Promise<boolean> {
    if (provider === "GOOGLE") {
        return deleteGoogleEvent(userId, externalEventId);
    } else if (provider === "OUTLOOK") {
        return deleteOutlookEvent(userId, externalEventId);
    }
    return false;
}

// ──────────────────────────────────────────────────────────
// PRAZO SYNC
// ──────────────────────────────────────────────────────────

/**
 * Sync a Prazo to all connected calendars for its advogado
 */
export async function syncPrazoToCalendars(prazoId: string) {
    const prazo = await db.prazo.findUnique({
        where: { id: prazoId },
        include: {
            processo: {
                select: { numeroCnj: true, cliente: { select: { nome: true } } },
            },
            advogado: { select: { userId: true } },
        },
    });

    if (!prazo) return;

    const userId = prazo.advogado.userId;
    const integrations = await getUserIntegrations(userId);

    const eventData: CalendarEventData = {
        title: `[PRAZO] ${prazo.descricao}`,
        description: [
            `Processo: ${prazo.processo.numeroCnj || "Sem nº"}`,
            `Cliente: ${prazo.processo.cliente?.nome ?? "Sem cliente"}`,
            `Tipo: ${prazo.fatal ? "FATAL" : "Cortesia"}`,
            `Contagem: ${prazo.tipoContagem}`,
            prazo.observacoes ? `Obs: ${prazo.observacoes}` : "",
        ].filter(Boolean).join("\n"),
        startAt: prazo.dataFatal,
        allDay: true,
    };

    for (const integration of integrations) {
        // Check if already synced
        const existing = await db.calendarEvent.findFirst({
            where: { integrationId: integration.id, prazoId },
        });

        if (existing) {
            // Update existing
            const updated = await updateExternalEvent(
                integration.provider,
                userId,
                existing.externalEventId,
                eventData
            );
            if (updated) {
                await db.calendarEvent.update({
                    where: { id: existing.id },
                    data: {
                        title: eventData.title,
                        description: eventData.description,
                        startAt: eventData.startAt,
                        allDay: true,
                        lastSyncAt: new Date(),
                    },
                });
            }
        } else {
            // Create new
            const externalId = await createExternalEvent(
                integration.provider,
                userId,
                eventData
            );
            if (externalId) {
                await db.calendarEvent.create({
                    data: {
                        integrationId: integration.id,
                        externalEventId: externalId,
                        prazoId,
                        title: eventData.title,
                        description: eventData.description,
                        startAt: eventData.startAt,
                        allDay: true,
                        syncDirection: "outbound",
                    },
                });

                // Update last sync time
                await db.calendarIntegration.update({
                    where: { id: integration.id },
                    data: { lastSyncAt: new Date() },
                });
            }
        }
    }
}

/**
 * Remove a Prazo from all connected calendars
 */
export async function removePrazoFromCalendars(prazoId: string) {
    const events = await db.calendarEvent.findMany({
        where: { prazoId },
        include: { integration: { select: { provider: true, userId: true } } },
    });

    for (const event of events) {
        await deleteExternalEvent(
            event.integration.provider,
            event.integration.userId,
            event.externalEventId
        );
    }

    await db.calendarEvent.deleteMany({ where: { prazoId } });
}

// ──────────────────────────────────────────────────────────
// AUDIENCIA SYNC
// ──────────────────────────────────────────────────────────

/**
 * Sync an Audiencia to all connected calendars for its advogado
 */
export async function syncAudienciaToCalendars(audienciaId: string) {
    const audiencia = await db.audiencia.findUnique({
        where: { id: audienciaId },
        include: {
            processo: {
                select: { numeroCnj: true, cliente: { select: { nome: true } } },
            },
            advogado: { select: { userId: true } },
        },
    });

    if (!audiencia) return;

    const userId = audiencia.advogado.userId;
    const integrations = await getUserIntegrations(userId);

    const endAt = new Date(audiencia.data.getTime() + 2 * 3600000); // 2 hours default

    const eventData: CalendarEventData = {
        title: `[AUDIENCIA] ${audiencia.tipo} - ${audiencia.processo.cliente?.nome ?? "Sem cliente"}`,
        description: [
            `Processo: ${audiencia.processo.numeroCnj || "Sem nº"}`,
            `Cliente: ${audiencia.processo.cliente?.nome ?? "Sem cliente"}`,
            `Tipo: ${audiencia.tipo}`,
            audiencia.sala ? `Sala: ${audiencia.sala}` : "",
            audiencia.observacoes ? `Obs: ${audiencia.observacoes}` : "",
        ].filter(Boolean).join("\n"),
        startAt: audiencia.data,
        endAt,
        location: audiencia.local || undefined,
        allDay: false,
    };

    for (const integration of integrations) {
        const existing = await db.calendarEvent.findFirst({
            where: { integrationId: integration.id, audienciaId },
        });

        if (existing) {
            const updated = await updateExternalEvent(
                integration.provider,
                userId,
                existing.externalEventId,
                eventData
            );
            if (updated) {
                await db.calendarEvent.update({
                    where: { id: existing.id },
                    data: {
                        title: eventData.title,
                        description: eventData.description,
                        startAt: eventData.startAt,
                        endAt: eventData.endAt,
                        location: eventData.location,
                        lastSyncAt: new Date(),
                    },
                });
            }
        } else {
            const externalId = await createExternalEvent(
                integration.provider,
                userId,
                eventData
            );
            if (externalId) {
                await db.calendarEvent.create({
                    data: {
                        integrationId: integration.id,
                        externalEventId: externalId,
                        audienciaId,
                        title: eventData.title,
                        description: eventData.description,
                        startAt: eventData.startAt,
                        endAt: eventData.endAt,
                        location: eventData.location,
                        syncDirection: "outbound",
                    },
                });
                await db.calendarIntegration.update({
                    where: { id: integration.id },
                    data: { lastSyncAt: new Date() },
                });
            }
        }
    }
}

export async function removeAudienciaFromCalendars(audienciaId: string) {
    const events = await db.calendarEvent.findMany({
        where: { audienciaId },
        include: { integration: { select: { provider: true, userId: true } } },
    });

    for (const event of events) {
        await deleteExternalEvent(
            event.integration.provider,
            event.integration.userId,
            event.externalEventId
        );
    }

    await db.calendarEvent.deleteMany({ where: { audienciaId } });
}

// ──────────────────────────────────────────────────────────
// COMPROMISSO SYNC
// ──────────────────────────────────────────────────────────

export async function syncCompromissoToCalendars(compromissoId: string) {
    const compromisso = await db.compromisso.findUnique({
        where: { id: compromissoId },
        include: {
            cliente: { select: { nome: true } },
            advogado: { select: { userId: true } },
        },
    });

    if (!compromisso) return;

    const userId = compromisso.advogado.userId;
    const integrations = await getUserIntegrations(userId);

    const eventData: CalendarEventData = {
        title: compromisso.cliente?.nome ? `${compromisso.titulo} - ${compromisso.cliente.nome}` : compromisso.titulo,
        description: [
            compromisso.descricao || "",
            compromisso.cliente?.nome ? `Cliente: ${compromisso.cliente.nome}` : "",
        ].filter(Boolean).join("\n") || undefined,
        startAt: compromisso.dataInicio,
        endAt: compromisso.dataFim || undefined,
        location: compromisso.local || undefined,
        allDay: false,
    };

    for (const integration of integrations) {
        const existing = await db.calendarEvent.findFirst({
            where: { integrationId: integration.id, compromissoId },
        });

        if (existing) {
            const updated = await updateExternalEvent(
                integration.provider,
                userId,
                existing.externalEventId,
                eventData
            );
            if (updated) {
                await db.calendarEvent.update({
                    where: { id: existing.id },
                    data: {
                        title: eventData.title,
                        description: eventData.description,
                        startAt: eventData.startAt,
                        endAt: eventData.endAt,
                        location: eventData.location,
                        lastSyncAt: new Date(),
                    },
                });
            }
        } else {
            const externalId = await createExternalEvent(
                integration.provider,
                userId,
                eventData
            );
            if (externalId) {
                await db.calendarEvent.create({
                    data: {
                        integrationId: integration.id,
                        externalEventId: externalId,
                        compromissoId,
                        title: eventData.title,
                        description: eventData.description,
                        startAt: eventData.startAt,
                        endAt: eventData.endAt,
                        location: eventData.location,
                        syncDirection: "outbound",
                    },
                });
                await db.calendarIntegration.update({
                    where: { id: integration.id },
                    data: { lastSyncAt: new Date() },
                });
            }
        }
    }
}

export async function removeCompromissoFromCalendars(compromissoId: string) {
    const events = await db.calendarEvent.findMany({
        where: { compromissoId },
        include: { integration: { select: { provider: true, userId: true } } },
    });

    for (const event of events) {
        await deleteExternalEvent(
            event.integration.provider,
            event.integration.userId,
            event.externalEventId
        );
    }

    await db.calendarEvent.deleteMany({ where: { compromissoId } });
}

// ──────────────────────────────────────────────────────────
// FULL SYNC: Push all pending items to calendars
// ──────────────────────────────────────────────────────────

export async function fullSyncForUser(userId: string) {
    const integrations = await getUserIntegrations(userId);
    if (integrations.length === 0) return { synced: 0 };

    // Find advogado for this user
    const advogado = await db.advogado.findUnique({
        where: { userId },
        select: { id: true },
    });

    if (!advogado) return { synced: 0 };

    let synced = 0;

    // Sync all pending prazos
    const prazos = await db.prazo.findMany({
        where: { advogadoId: advogado.id, status: "PENDENTE" },
        select: { id: true },
    });
    for (const prazo of prazos) {
        await syncPrazoToCalendars(prazo.id);
        synced++;
    }

    // Sync all upcoming audiencias
    const audiencias = await db.audiencia.findMany({
        where: { advogadoId: advogado.id, realizada: false, data: { gte: new Date() } },
        select: { id: true },
    });
    for (const audiencia of audiencias) {
        await syncAudienciaToCalendars(audiencia.id);
        synced++;
    }

    // Sync all upcoming compromissos
    const compromissos = await db.compromisso.findMany({
        where: { advogadoId: advogado.id, concluido: false, dataInicio: { gte: new Date() } },
        select: { id: true },
    });
    for (const compromisso of compromissos) {
        await syncCompromissoToCalendars(compromisso.id);
        synced++;
    }

    return { synced };
}
