import "server-only";

import { Prisma } from "@/generated/prisma";
import { z } from "zod";

import { db } from "@/lib/db";

const DASHBOARD_LAYOUT_PREFIX = "DASHBOARD_LAYOUT";

export const DASHBOARD_WIDGET_IDS = [
    "overview",
    "critical-deadlines",
    "communication-portfolio",
    "agenda",
    "my-tasks",
    "delegated-tasks",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export type DashboardColumnId = "main" | "side";

export interface DashboardLayoutConfig {
    mainOrder: DashboardWidgetId[];
    sideOrder: DashboardWidgetId[];
    hidden: DashboardWidgetId[];
}

const dashboardLayoutSchema = z.object({
    mainOrder: z.array(z.enum(DASHBOARD_WIDGET_IDS)).default(["overview", "critical-deadlines", "communication-portfolio"]),
    sideOrder: z.array(z.enum(DASHBOARD_WIDGET_IDS)).default(["agenda", "my-tasks", "delegated-tasks"]),
    hidden: z.array(z.enum(DASHBOARD_WIDGET_IDS)).default([]),
});

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutConfig = {
    mainOrder: ["overview", "critical-deadlines", "communication-portfolio"],
    sideOrder: ["agenda", "my-tasks", "delegated-tasks"],
    hidden: [],
};

function getDashboardLayoutKey(userId: string) {
    return `${DASHBOARD_LAYOUT_PREFIX}:${userId}`;
}

function dedupeWidgetIds(items: DashboardWidgetId[]) {
    return Array.from(new Set(items));
}

function normalizeDashboardLayout(input: unknown): DashboardLayoutConfig {
    const parsed = dashboardLayoutSchema.safeParse(input);
    const base = parsed.success ? parsed.data : DEFAULT_DASHBOARD_LAYOUT;
    const hidden = dedupeWidgetIds(base.hidden);

    const remaining = DASHBOARD_WIDGET_IDS.filter((item) => !hidden.includes(item));
    const mainOrder = dedupeWidgetIds(base.mainOrder).filter((item) => remaining.includes(item));
    const sideOrder = dedupeWidgetIds(base.sideOrder).filter((item) => remaining.includes(item) && !mainOrder.includes(item));

    const unassigned = remaining.filter((item) => !mainOrder.includes(item) && !sideOrder.includes(item));

    return {
        mainOrder: [...mainOrder, ...unassigned.filter((item) => DEFAULT_DASHBOARD_LAYOUT.mainOrder.includes(item))],
        sideOrder: [...sideOrder, ...unassigned.filter((item) => !DEFAULT_DASHBOARD_LAYOUT.mainOrder.includes(item))],
        hidden,
    };
}

export async function getDashboardLayout(userId: string | null | undefined) {
    if (!userId) return DEFAULT_DASHBOARD_LAYOUT;

    const setting = await db.appSetting.findUnique({
        where: { key: getDashboardLayoutKey(userId) },
        select: { value: true },
    });

    return normalizeDashboardLayout(setting?.value);
}

export async function saveDashboardLayout(userId: string, layout: DashboardLayoutConfig) {
    const normalized = normalizeDashboardLayout(layout);

    await db.appSetting.upsert({
        where: { key: getDashboardLayoutKey(userId) },
        update: { value: normalized as unknown as Prisma.InputJsonValue },
        create: {
            key: getDashboardLayoutKey(userId),
            value: normalized as unknown as Prisma.InputJsonValue,
        },
    });

    return normalized;
}

export async function resetDashboardLayout(userId: string) {
    await db.appSetting.deleteMany({
        where: { key: getDashboardLayoutKey(userId) },
    });

    return DEFAULT_DASHBOARD_LAYOUT;
}
