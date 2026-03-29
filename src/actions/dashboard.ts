"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSession } from "@/actions/auth";
import {
    DASHBOARD_WIDGET_IDS,
    resetDashboardLayout,
    saveDashboardLayout,
    type DashboardLayoutConfig,
} from "@/lib/services/dashboard-layout";

const dashboardLayoutPayloadSchema = z.object({
    mainOrder: z.array(z.enum(DASHBOARD_WIDGET_IDS)),
    sideOrder: z.array(z.enum(DASHBOARD_WIDGET_IDS)),
    hidden: z.array(z.enum(DASHBOARD_WIDGET_IDS)),
});

export async function saveDashboardLayoutAction(payload: DashboardLayoutConfig) {
    const session = await getSession();
    if (!session?.id) {
        return { success: false as const, error: "Nao autenticado." };
    }

    const parsed = dashboardLayoutPayloadSchema.safeParse(payload);
    if (!parsed.success) {
        return { success: false as const, error: parsed.error.flatten().fieldErrors };
    }

    const layout = await saveDashboardLayout(session.id, parsed.data);
    revalidatePath("/dashboard");
    return { success: true as const, data: layout };
}

export async function resetDashboardLayoutAction() {
    const session = await getSession();
    if (!session?.id) {
        return { success: false as const, error: "Nao autenticado." };
    }

    const layout = await resetDashboardLayout(session.id);
    revalidatePath("/dashboard");
    return { success: true as const, data: layout };
}
