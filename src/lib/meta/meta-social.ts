/**
 * Meta Social — Facebook Messenger + Instagram DMs via Graph API v21.0
 *
 * Fluxo de recebimento:
 *   Webhook Meta → /api/webhooks/meta/social → normalizeWebhookEvents → save to DB
 *
 * Fluxo de envio:
 *   send/route.ts → sendMetaMessage → Graph API
 */

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// ─── Types ──────────────────────────────────────────────────────────────────

export type MetaChannel = "FACEBOOK_MESSENGER" | "INSTAGRAM_DM";

export interface NormalizedMetaEvent {
    channel: MetaChannel;
    pageId: string;
    senderId: string;       // PSID (Messenger) or IGSID (Instagram)
    senderName?: string;
    messageId: string;
    text?: string;
    attachmentUrl?: string;
    attachmentType?: "image" | "video" | "audio" | "file";
    timestamp: Date;
    isEcho: boolean;        // message sent from page (our outgoing messages echoed back)
}

interface MetaWebhookBody {
    object?: string;
    entry?: Array<{
        id?: string;
        messaging?: Array<{
            sender?: { id?: string };
            recipient?: { id?: string };
            timestamp?: number;
            message?: {
                mid?: string;
                text?: string;
                is_echo?: boolean;
                attachments?: Array<{
                    type?: string;
                    payload?: { url?: string };
                }>;
            };
        }>;
    }>;
}

// ─── Normalize incoming webhook ──────────────────────────────────────────────

export function normalizeMetaWebhookEvents(body: MetaWebhookBody): NormalizedMetaEvent[] {
    const events: NormalizedMetaEvent[] = [];

    const isInstagram = body.object === "instagram";
    const channel: MetaChannel = isInstagram ? "INSTAGRAM_DM" : "FACEBOOK_MESSENGER";

    for (const entry of body.entry ?? []) {
        const pageId = entry.id ?? "";
        for (const msg of entry.messaging ?? []) {
            const senderId = msg.sender?.id;
            const messageId = msg.message?.mid;
            if (!senderId || !messageId) continue;

            const isEcho = msg.message?.is_echo === true;
            let attachmentUrl: string | undefined;
            let attachmentType: NormalizedMetaEvent["attachmentType"];

            const firstAtt = msg.message?.attachments?.[0];
            if (firstAtt) {
                attachmentUrl = firstAtt.payload?.url;
                const rawType = firstAtt.type?.toLowerCase();
                if (rawType === "image") attachmentType = "image";
                else if (rawType === "video") attachmentType = "video";
                else if (rawType === "audio") attachmentType = "audio";
                else attachmentType = "file";
            }

            events.push({
                channel,
                pageId,
                senderId,
                messageId,
                text: msg.message?.text,
                attachmentUrl,
                attachmentType,
                timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
                isEcho,
            });
        }
    }

    return events;
}

// ─── Send via Graph API ───────────────────────────────────────────────────────

export async function sendMetaTextMessage(
    pageAccessToken: string,
    recipientId: string,
    text: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    try {
        const res = await fetch(`${GRAPH_BASE}/me/messages?access_token=${pageAccessToken}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                recipient: { id: recipientId },
                message: { text },
                messaging_type: "RESPONSE",
            }),
        });

        const data = (await res.json()) as Record<string, unknown>;
        if (!res.ok) {
            const errMsg = (data.error as Record<string, unknown>)?.message as string | undefined;
            return { ok: false, error: errMsg ?? `HTTP ${res.status}` };
        }

        return { ok: true, messageId: data.message_id as string | undefined };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Network error" };
    }
}

// ─── Fetch sender profile from Graph API ─────────────────────────────────────

export async function fetchMetaSenderProfile(
    pageAccessToken: string,
    senderId: string,
): Promise<{ name?: string; profilePic?: string }> {
    try {
        const res = await fetch(
            `${GRAPH_BASE}/${senderId}?fields=name,profile_pic&access_token=${pageAccessToken}`,
        );
        if (!res.ok) return {};
        const data = (await res.json()) as Record<string, unknown>;
        return {
            name: data.name as string | undefined,
            profilePic: data.profile_pic as string | undefined,
        };
    } catch {
        return {};
    }
}
