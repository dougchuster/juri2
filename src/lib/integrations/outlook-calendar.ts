import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import { db } from "@/lib/db";

const SCOPES = [
    "openid",
    "profile",
    "email",
    "offline_access",
    "Calendars.ReadWrite",
];

function getMsalClient() {
    return new ConfidentialClientApplication({
        auth: {
            clientId: process.env.MICROSOFT_CLIENT_ID || "",
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
            authority: "https://login.microsoftonline.com/common",
        },
    });
}

/**
 * Generate the Microsoft OAuth2 authorization URL
 */
export async function getOutlookAuthUrl(userId: string): Promise<string> {
    const msalClient = getMsalClient();
    const authUrl = await msalClient.getAuthCodeUrl({
        scopes: SCOPES,
        redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/outlook/callback`,
        state: userId,
        prompt: "consent",
    });
    return authUrl;
}

/**
 * Exchange authorization code for tokens and save integration
 */
export async function handleOutlookCallback(code: string, userId: string) {
    const msalClient = getMsalClient();

    const result = await msalClient.acquireTokenByCode({
        code,
        scopes: SCOPES,
        redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/outlook/callback`,
    });

    const accessToken = result.accessToken;
    const expiresOn = result.expiresOn;

    // Get user email from Graph
    const graphClient = Client.init({
        authProvider: (done) => done(null, accessToken),
    });

    const me = await graphClient.api("/me").select("mail,userPrincipalName").get();
    const email = me.mail || me.userPrincipalName || "unknown";

    // MSAL doesn't directly expose refresh token in v2
    // We store the full token info; for refresh we use MSAL's cache
    // In production, use a proper token cache (Redis, DB, etc.)
    const serializedCache = msalClient.getTokenCache().serialize();

    await db.calendarIntegration.upsert({
        where: {
            userId_provider: { userId, provider: "OUTLOOK" },
        },
        update: {
            accessToken,
            refreshToken: serializedCache,
            tokenExpiry: expiresOn || null,
            email,
            enabled: true,
            syncErrors: 0,
        },
        create: {
            userId,
            provider: "OUTLOOK",
            email,
            accessToken,
            refreshToken: serializedCache,
            tokenExpiry: expiresOn || null,
            enabled: true,
        },
    });
}

/**
 * Get an authenticated Microsoft Graph client for a user
 */
async function getGraphClient(userId: string) {
    const integration = await db.calendarIntegration.findUnique({
        where: {
            userId_provider: { userId, provider: "OUTLOOK" },
        },
    });

    if (!integration || !integration.enabled) return null;

    let accessToken = integration.accessToken;

    // Check if token is expired and try to refresh
    if (integration.tokenExpiry && integration.tokenExpiry < new Date()) {
        try {
            const msalClient = getMsalClient();

            // Restore token cache
            if (integration.refreshToken) {
                msalClient.getTokenCache().deserialize(integration.refreshToken);
            }

            const accounts = await msalClient.getTokenCache().getAllAccounts();
            if (accounts.length > 0) {
                const result = await msalClient.acquireTokenSilent({
                    account: accounts[0],
                    scopes: SCOPES,
                });

                accessToken = result.accessToken;
                const serializedCache = msalClient.getTokenCache().serialize();

                await db.calendarIntegration.update({
                    where: { id: integration.id },
                    data: {
                        accessToken,
                        refreshToken: serializedCache,
                        tokenExpiry: result.expiresOn || null,
                    },
                });
            }
        } catch (error) {
            console.error("[Outlook] Token refresh failed:", error);
            await db.calendarIntegration.update({
                where: { id: integration.id },
                data: { syncErrors: { increment: 1 } },
            });
            return null;
        }
    }

    const graphClient = Client.init({
        authProvider: (done) => done(null, accessToken),
    });

    return { graphClient, integration };
}

/**
 * Create an Outlook Calendar event
 */
export async function createOutlookEvent(
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
    const client = await getGraphClient(userId);
    if (!client) return null;

    const { graphClient, integration } = client;

    const endAt = event.endAt || new Date(event.startAt.getTime() + 3600000);

    const eventBody: Record<string, unknown> = {
        subject: event.title,
        body: {
            contentType: "text",
            content: event.description || "",
        },
        isAllDay: event.allDay || false,
        isReminderOn: true,
        reminderMinutesBeforeStart: 60,
    };

    if (event.allDay) {
        eventBody.start = {
            dateTime: event.startAt.toISOString().split("T")[0] + "T00:00:00",
            timeZone: "E. South America Standard Time",
        };
        eventBody.end = {
            dateTime: endAt.toISOString().split("T")[0] + "T00:00:00",
            timeZone: "E. South America Standard Time",
        };
    } else {
        eventBody.start = {
            dateTime: event.startAt.toISOString(),
            timeZone: "E. South America Standard Time",
        };
        eventBody.end = {
            dateTime: endAt.toISOString(),
            timeZone: "E. South America Standard Time",
        };
    }

    if (event.location) {
        eventBody.location = { displayName: event.location };
    }

    try {
        const res = await graphClient.api("/me/events").post(eventBody);
        return res.id as string;
    } catch (error) {
        console.error("[Outlook] Error creating event:", error);
        await db.calendarIntegration.update({
            where: { id: integration.id },
            data: { syncErrors: { increment: 1 } },
        });
        return null;
    }
}

/**
 * Update an Outlook Calendar event
 */
export async function updateOutlookEvent(
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
    const client = await getGraphClient(userId);
    if (!client) return false;

    const { graphClient } = client;

    const eventBody: Record<string, unknown> = {};
    if (event.title) eventBody.subject = event.title;
    if (event.description !== undefined) {
        eventBody.body = { contentType: "text", content: event.description };
    }
    if (event.location !== undefined) {
        eventBody.location = { displayName: event.location };
    }

    if (event.startAt) {
        const endAt = event.endAt || new Date(event.startAt.getTime() + 3600000);
        if (event.allDay) {
            eventBody.start = { dateTime: event.startAt.toISOString().split("T")[0] + "T00:00:00", timeZone: "E. South America Standard Time" };
            eventBody.end = { dateTime: endAt.toISOString().split("T")[0] + "T00:00:00", timeZone: "E. South America Standard Time" };
            eventBody.isAllDay = true;
        } else {
            eventBody.start = { dateTime: event.startAt.toISOString(), timeZone: "E. South America Standard Time" };
            eventBody.end = { dateTime: endAt.toISOString(), timeZone: "E. South America Standard Time" };
        }
    }

    try {
        await graphClient.api(`/me/events/${externalEventId}`).patch(eventBody);
        return true;
    } catch (error) {
        console.error("[Outlook] Error updating event:", error);
        return false;
    }
}

/**
 * Delete an Outlook Calendar event
 */
export async function deleteOutlookEvent(userId: string, externalEventId: string) {
    const client = await getGraphClient(userId);
    if (!client) return false;

    const { graphClient } = client;

    try {
        await graphClient.api(`/me/events/${externalEventId}`).delete();
        return true;
    } catch (error) {
        console.error("[Outlook] Error deleting event:", error);
        return false;
    }
}

/**
 * Disconnect Outlook Calendar
 */
export async function disconnectOutlook(userId: string) {
    const integration = await db.calendarIntegration.findUnique({
        where: { userId_provider: { userId, provider: "OUTLOOK" } },
    });
    if (!integration) return;

    await db.calendarEvent.deleteMany({ where: { integrationId: integration.id } });
    await db.calendarIntegration.delete({ where: { id: integration.id } });
}
