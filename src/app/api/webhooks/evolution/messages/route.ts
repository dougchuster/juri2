import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/middleware/rate-limit";
import { findEvolutionWhatsappConnection } from "@/lib/whatsapp/application/connection-service";
import { evolutionWhatsmeowProvider } from "@/lib/whatsapp/providers/evolution-whatsmeow-provider";
import { processWhatsappWebhookEvents } from "@/lib/whatsapp/application/webhook-service";

export async function POST(req: NextRequest) {
    try {
        const ip = getClientIp(req.headers);
        const limit = checkRateLimit(ip, { maxRequests: 1000, windowMs: 60_000 });
        if (!limit.allowed) {
            return NextResponse.json({ error: "Rate limited" }, { status: 429 });
        }

        const cloned = req.clone();
        const payload = await cloned.json().catch(() => null) as Record<string, unknown> | null;
        const eventType = String(payload?.event || "unknown");

        await db.webhookEvent.create({
            data: {
                source: "evolution_api",
                eventType,
                payload: (payload || {}) as Prisma.InputJsonValue,
            },
        });

        const instanceName =
            typeof payload?.instance === "string"
                ? payload.instance
                : typeof (payload?.data as Record<string, unknown> | undefined)?.instance === "string"
                    ? String((payload?.data as Record<string, unknown>).instance)
                    : typeof ((payload?.data as Record<string, unknown> | undefined)?.instance as Record<string, unknown> | undefined)?.instanceName === "string"
                        ? String((((payload?.data as Record<string, unknown>)?.instance as Record<string, unknown>).instanceName))
                        : null;

        const headerConnectionId = req.headers.get("x-connection-id");
        const connection = await findEvolutionWhatsappConnection({
            connectionId: headerConnectionId,
            instanceName,
        });

        if (!connection) {
            return NextResponse.json({ ok: true, handled: false, reason: "connection_not_found" });
        }

        const events = await evolutionWhatsmeowProvider.normalizeWebhook(req, connection);
        await processWhatsappWebhookEvents(events);

        return NextResponse.json({ ok: true, handled: true, count: events.length });
    } catch (error) {
        console.error("[Webhook Evolution Messages] Error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
