import { google } from "googleapis";
import { db } from "@/lib/db";

const SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
];

function getOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`
    );
}

/**
 * Generate the Google OAuth2 authorization URL
 */
export function getGoogleAuthUrl(userId: string): string {
    const oauth2Client = getOAuth2Client();
    return oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
        state: userId,
    });
}

/**
 * Exchange authorization code for tokens and save integration
 */
export async function handleGoogleCallback(code: string, userId: string) {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    // Get user email
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email || "unknown";

    // Save or update integration
    await db.calendarIntegration.upsert({
        where: {
            userId_provider: { userId, provider: "GOOGLE" },
        },
        update: {
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token || undefined,
            tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            email,
            enabled: true,
            syncErrors: 0,
        },
        create: {
            userId,
            provider: "GOOGLE",
            email,
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token || null,
            tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            calendarId: "primary",
            enabled: true,
        },
    });
}

/**
 * Get an authenticated Google Calendar client for a user
 */
async function getCalendarClient(userId: string) {
    const integration = await db.calendarIntegration.findUnique({
        where: {
            userId_provider: { userId, provider: "GOOGLE" },
        },
    });

    if (!integration || !integration.enabled) return null;

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
        expiry_date: integration.tokenExpiry?.getTime(),
    });

    // Auto-refresh token if expired
    oauth2Client.on("tokens", async (tokens) => {
        await db.calendarIntegration.update({
            where: { id: integration.id },
            data: {
                accessToken: tokens.access_token || integration.accessToken,
                refreshToken: tokens.refresh_token || integration.refreshToken,
                tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : integration.tokenExpiry,
            },
        });
    });

    return {
        calendar: google.calendar({ version: "v3", auth: oauth2Client }),
        integration,
    };
}

/**
 * Create a Google Calendar event
 */
export async function createGoogleEvent(
    userId: string,
    event: {
        title: string;
        description?: string;
        startAt: Date;
        endAt?: Date;
        location?: string;
        allDay?: boolean;
    }
) {
    const client = await getCalendarClient(userId);
    if (!client) return null;

    const { calendar, integration } = client;

    const eventBody: Record<string, unknown> = {
        summary: event.title,
        description: event.description || "",
        location: event.location || "",
    };

    if (event.allDay) {
        const dateStr = event.startAt.toISOString().split("T")[0];
        const endDate = event.endAt || new Date(event.startAt.getTime() + 86400000);
        eventBody.start = { date: dateStr };
        eventBody.end = { date: endDate.toISOString().split("T")[0] };
    } else {
        eventBody.start = {
            dateTime: event.startAt.toISOString(),
            timeZone: "America/Sao_Paulo",
        };
        eventBody.end = {
            dateTime: (event.endAt || new Date(event.startAt.getTime() + 3600000)).toISOString(),
            timeZone: "America/Sao_Paulo",
        };
    }

    // Add reminder
    eventBody.reminders = {
        useDefault: false,
        overrides: [
            { method: "popup", minutes: 60 },
            { method: "popup", minutes: 1440 }, // 1 day before
        ],
    };

    try {
        const res = await calendar.events.insert({
            calendarId: integration.calendarId || "primary",
            requestBody: eventBody as Parameters<typeof calendar.events.insert>[0] extends { requestBody?: infer R } ? R : never,
        });

        return res.data.id;
    } catch (error) {
        console.error("[Google Calendar] Error creating event:", error);
        await db.calendarIntegration.update({
            where: { id: integration.id },
            data: { syncErrors: { increment: 1 } },
        });
        return null;
    }
}

/**
 * Update a Google Calendar event
 */
export async function updateGoogleEvent(
    userId: string,
    externalEventId: string,
    event: {
        title?: string;
        description?: string;
        startAt?: Date;
        endAt?: Date;
        location?: string;
        allDay?: boolean;
    }
) {
    const client = await getCalendarClient(userId);
    if (!client) return false;

    const { calendar, integration } = client;

    const eventBody: Record<string, unknown> = {};
    if (event.title) eventBody.summary = event.title;
    if (event.description !== undefined) eventBody.description = event.description;
    if (event.location !== undefined) eventBody.location = event.location;

    if (event.startAt) {
        if (event.allDay) {
            eventBody.start = { date: event.startAt.toISOString().split("T")[0] };
            const endDate = event.endAt || new Date(event.startAt.getTime() + 86400000);
            eventBody.end = { date: endDate.toISOString().split("T")[0] };
        } else {
            eventBody.start = { dateTime: event.startAt.toISOString(), timeZone: "America/Sao_Paulo" };
            eventBody.end = {
                dateTime: (event.endAt || new Date(event.startAt.getTime() + 3600000)).toISOString(),
                timeZone: "America/Sao_Paulo",
            };
        }
    }

    try {
        await calendar.events.patch({
            calendarId: integration.calendarId || "primary",
            eventId: externalEventId,
            requestBody: eventBody as Parameters<typeof calendar.events.patch>[0] extends { requestBody?: infer R } ? R : never,
        });
        return true;
    } catch (error) {
        console.error("[Google Calendar] Error updating event:", error);
        return false;
    }
}

/**
 * Delete a Google Calendar event
 */
export async function deleteGoogleEvent(userId: string, externalEventId: string) {
    const client = await getCalendarClient(userId);
    if (!client) return false;

    const { calendar, integration } = client;

    try {
        await calendar.events.delete({
            calendarId: integration.calendarId || "primary",
            eventId: externalEventId,
        });
        return true;
    } catch (error) {
        console.error("[Google Calendar] Error deleting event:", error);
        return false;
    }
}

/**
 * Disconnect Google Calendar
 */
export async function disconnectGoogle(userId: string) {
    const integration = await db.calendarIntegration.findUnique({
        where: { userId_provider: { userId, provider: "GOOGLE" } },
    });
    if (!integration) return;

    // Try to revoke token
    try {
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ access_token: integration.accessToken });
        await oauth2Client.revokeCredentials();
    } catch {
        // Ignore revoke errors
    }

    // Delete synced events and integration
    await db.calendarEvent.deleteMany({ where: { integrationId: integration.id } });
    await db.calendarIntegration.delete({ where: { id: integration.id } });
}
