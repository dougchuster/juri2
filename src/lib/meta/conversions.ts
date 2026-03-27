import crypto from "crypto";
import { db } from "@/lib/db";

// ── Tipos ────────────────────────────────────────────────────────────────────

export type MetaEventName =
    | "Lead"
    | "Purchase"
    | "Schedule"
    | "Contact"
    | "CompleteRegistration"
    | "StartTrial"
    | "SubmitApplication";

export interface MetaUserData {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    /** IP do cliente (não hashear) */
    clientIp?: string;
    /** User-Agent do cliente (não hashear) */
    userAgent?: string;
    /** Facebook Click ID (_fbc cookie) */
    fbc?: string;
    /** Facebook Browser ID (_fbp cookie) */
    fbp?: string;
}

export interface MetaCustomData {
    value?: number;
    currency?: string;
    contentName?: string;
    contentCategory?: string;
    orderId?: string;
    numItems?: number;
}

export interface MetaConversionEvent {
    eventName: MetaEventName;
    /** Unix timestamp em segundos. Default: agora */
    eventTime?: number;
    userData?: MetaUserData;
    customData?: MetaCustomData;
    eventSourceUrl?: string;
    actionSource?: "website" | "app" | "crm" | "system_generated" | "email" | "phone_call";
}

// ── Hashing ──────────────────────────────────────────────────────────────────

function sha256(value: string): string {
    return crypto.createHash("sha256").update(value.toLowerCase().trim()).digest("hex");
}

function normalizePhone(phone: string): string {
    // Remove tudo exceto dígitos e o + inicial
    const digits = phone.replace(/[^\d]/g, "");
    // Adiciona DDI Brasil se necessário
    if (digits.length === 10 || digits.length === 11) {
        return `55${digits}`;
    }
    return digits;
}

function buildUserData(userData: MetaUserData): Record<string, string | string[]> {
    const ud: Record<string, string | string[]> = {};

    if (userData.email) ud.em = [sha256(userData.email)];
    if (userData.phone) ud.ph = [sha256(normalizePhone(userData.phone))];
    if (userData.firstName) ud.fn = [sha256(userData.firstName)];
    if (userData.lastName) ud.ln = [sha256(userData.lastName)];
    if (userData.clientIp) ud.client_ip_address = userData.clientIp;
    if (userData.userAgent) ud.client_user_agent = userData.userAgent;
    if (userData.fbc) ud.fbc = userData.fbc;
    if (userData.fbp) ud.fbp = userData.fbp;

    return ud;
}

// ── Envio principal ──────────────────────────────────────────────────────────

export interface SendConversionResult {
    success: boolean;
    eventsReceived?: number;
    error?: string;
}

export async function sendConversionEvent(
    escritorioId: string,
    event: MetaConversionEvent
): Promise<SendConversionResult> {
    try {
        const config = await db.metaPixelConfig.findUnique({
            where: { escritorioId },
        });

        if (!config || !config.isActive) {
            return { success: false, error: "Pixel Meta não configurado ou inativo" };
        }

        const apiVersion = process.env.META_GRAPH_API_VERSION ?? "v22.0";
        const url = `https://graph.facebook.com/${apiVersion}/${config.pixelId}/events?access_token=${config.accessToken}`;

        const payload: Record<string, unknown> = {
            data: [
                {
                    event_name: event.eventName,
                    event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
                    event_source_url:
                        event.eventSourceUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://app.advjuridico.com.br",
                    action_source: event.actionSource ?? "crm",
                    user_data: event.userData ? buildUserData(event.userData) : {},
                    ...(event.customData && Object.keys(event.customData).length > 0
                        ? {
                              custom_data: {
                                  ...(event.customData.value !== undefined && { value: event.customData.value }),
                                  ...(event.customData.currency && { currency: event.customData.currency }),
                                  ...(event.customData.contentName && { content_name: event.customData.contentName }),
                                  ...(event.customData.contentCategory && {
                                      content_category: event.customData.contentCategory,
                                  }),
                                  ...(event.customData.orderId && { order_id: event.customData.orderId }),
                                  ...(event.customData.numItems !== undefined && {
                                      num_items: event.customData.numItems,
                                  }),
                              },
                          }
                        : {}),
                },
            ],
            ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}),
        };

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = (await res.json()) as { events_received?: number; error?: { message: string } };

        if (!res.ok) {
            console.error(`[Meta Conversions] Erro ao enviar ${event.eventName}:`, data.error?.message);
            return { success: false, error: data.error?.message ?? "Erro desconhecido" };
        }

        // Atualiza contador e timestamp do último evento
        await db.metaPixelConfig.update({
            where: { escritorioId },
            data: {
                lastEventAt: new Date(),
                eventsCount: { increment: 1 },
            },
        });

        return { success: true, eventsReceived: data.events_received };
    } catch (err) {
        console.error(`[Meta Conversions] Exceção:`, err);
        return { success: false, error: String(err) };
    }
}

// ── Helpers semânticos (chamados pelas actions/DAL) ──────────────────────────

/** Dispara evento Lead quando um card CRM é criado */
export async function trackLead(
    escritorioId: string,
    opts: {
        clienteNome?: string;
        clienteEmail?: string;
        clienteTelefone?: string;
        areaDireito?: string;
        cardId?: string;
    }
) {
    const [firstName, ...rest] = (opts.clienteNome ?? "").split(" ");
    return sendConversionEvent(escritorioId, {
        eventName: "Lead",
        userData: {
            email: opts.clienteEmail,
            phone: opts.clienteTelefone,
            firstName,
            lastName: rest.join(" ") || undefined,
        },
        customData: {
            contentCategory: opts.areaDireito,
            orderId: opts.cardId,
        },
        actionSource: "crm",
    });
}

/** Dispara evento Purchase quando oportunidade é GANHA */
export async function trackPurchase(
    escritorioId: string,
    opts: {
        clienteEmail?: string;
        clienteTelefone?: string;
        valor?: number;
        areaDireito?: string;
        cardId?: string;
    }
) {
    return sendConversionEvent(escritorioId, {
        eventName: "Purchase",
        userData: {
            email: opts.clienteEmail,
            phone: opts.clienteTelefone,
        },
        customData: {
            value: opts.valor,
            currency: "BRL",
            contentCategory: opts.areaDireito,
            orderId: opts.cardId,
        },
        actionSource: "crm",
    });
}

/** Dispara evento Schedule quando agendamento é criado com cliente */
export async function trackSchedule(
    escritorioId: string,
    opts: {
        clienteEmail?: string;
        clienteTelefone?: string;
        clienteNome?: string;
        tipo?: string;
    }
) {
    const [firstName, ...rest] = (opts.clienteNome ?? "").split(" ");
    return sendConversionEvent(escritorioId, {
        eventName: "Schedule",
        userData: {
            email: opts.clienteEmail,
            phone: opts.clienteTelefone,
            firstName,
            lastName: rest.join(" ") || undefined,
        },
        customData: {
            contentCategory: opts.tipo,
        },
        actionSource: "crm",
    });
}
