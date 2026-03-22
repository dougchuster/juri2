import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/middleware/rate-limit";
import { findMetaWhatsappConnectionByPhoneNumberId, listWhatsappConnections, getDecryptedConnectionSecret } from "@/lib/whatsapp/application/connection-service";
import { metaCloudProvider } from "@/lib/whatsapp/providers/meta-cloud-provider";
import { processWhatsappWebhookEvents } from "@/lib/whatsapp/application/webhook-service";

export async function GET(req: NextRequest) {
    const mode = req.nextUrl.searchParams.get("hub.mode");
    const verifyToken = req.nextUrl.searchParams.get("hub.verify_token");
    const challenge = req.nextUrl.searchParams.get("hub.challenge");

    if (mode !== "subscribe" || !verifyToken || !challenge) {
        return NextResponse.json({ error: "Invalid verification request" }, { status: 400 });
    }

    const connections = await listWhatsappConnections();
    const match = connections.find((connection) => {
        const secret = getDecryptedConnectionSecret(connection);
        return secret?.providerType === "META_CLOUD_API" && secret.verifyToken === verifyToken;
    });

    if (!match) {
        return NextResponse.json({ error: "Verify token invalido" }, { status: 403 });
    }

    return new Response(challenge, { status: 200 });
}

export async function POST(req: NextRequest) {
    const ip = getClientIp(req.headers);
    const limit = checkRateLimit(ip, { maxRequests: 100, windowMs: 60_000 });
    if (!limit.allowed) {
        return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const cloned = req.clone();
    const payload = await cloned.json() as {
        entry?: Array<{
            changes?: Array<{
                value?: {
                    metadata?: {
                        phone_number_id?: string;
                    };
                };
            }>;
        }>;
    };

    const phoneNumberId = payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    if (!phoneNumberId) {
        return NextResponse.json({ ok: true, handled: false, reason: "missing_phone_number_id" });
    }

    const connection = await findMetaWhatsappConnectionByPhoneNumberId(phoneNumberId);
    if (!connection) {
        return NextResponse.json({ ok: true, handled: false, reason: "connection_not_found" });
    }

    const events = await metaCloudProvider.normalizeWebhook(req, connection);
    await processWhatsappWebhookEvents(events);
    return NextResponse.json({ ok: true, handled: true, count: events.length });
}
