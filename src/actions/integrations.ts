"use server";

import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getGoogleAuthUrl } from "@/lib/integrations/google-calendar";
import { getOutlookAuthUrl } from "@/lib/integrations/outlook-calendar";
import { disconnectGoogle } from "@/lib/integrations/google-calendar";
import { disconnectOutlook } from "@/lib/integrations/outlook-calendar";
import { fullSyncForUser, getIntegrationStatus } from "@/lib/integrations/calendar-sync";

/**
 * Connect Google Calendar - redirects to Google OAuth
 */
export async function connectGoogleCalendar() {
    const user = await getSession();
    if (!user) redirect("/login");

    const authUrl = getGoogleAuthUrl(user.id);
    redirect(authUrl);
}

/**
 * Connect Outlook Calendar - redirects to Microsoft OAuth
 */
export async function connectOutlookCalendar() {
    const user = await getSession();
    if (!user) redirect("/login");

    const authUrl = await getOutlookAuthUrl(user.id);
    redirect(authUrl);
}

/**
 * Disconnect Google Calendar
 */
export async function disconnectGoogleCalendar() {
    const user = await getSession();
    if (!user) redirect("/login");

    await disconnectGoogle(user.id);
    revalidatePath("/admin/integracoes");
}

/**
 * Disconnect Outlook Calendar
 */
export async function disconnectOutlookCalendar() {
    const user = await getSession();
    if (!user) redirect("/login");

    await disconnectOutlook(user.id);
    revalidatePath("/admin/integracoes");
}

/**
 * Trigger a full sync of all pending items to calendars
 */
export async function triggerFullSync() {
    const user = await getSession();
    if (!user) redirect("/login");

    try {
        const result = await fullSyncForUser(user.id);
        revalidatePath("/admin/integracoes");
        return { success: true, synced: result.synced };
    } catch (error) {
        console.error("[Full Sync] Error:", error);
        return { success: false, error: "Erro ao sincronizar calendários." };
    }
}

/**
 * Get calendar integration status for current user
 */
export async function getCalendarStatus() {
    const user = await getSession();
    if (!user) return null;
    return getIntegrationStatus(user.id);
}
