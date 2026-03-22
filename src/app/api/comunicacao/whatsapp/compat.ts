import { getPrimaryWhatsappConnection } from "@/lib/whatsapp/application/connection-service";
import { getWhatsappProviderAdapter } from "@/lib/whatsapp/providers/provider-registry";

const LEGACY_WHATSAPP_SUNSET = "Tue, 30 Jun 2026 23:59:59 GMT";

export function normalizeLegacyWhatsappState(status?: string | null): "open" | "connecting" | "close" {
    switch (status) {
        case "open":
        case "CONNECTED":
            return "open";
        case "connecting":
        case "CONNECTING":
        case "QR_REQUIRED":
        case "VALIDATING":
            return "connecting";
        default:
            return "close";
    }
}

export function buildLegacyWhatsappStatusPayload(input: {
    status?: string | null;
    connected?: boolean;
    qrCode?: string | null;
    qrCodeRaw?: string | null;
    phoneNumber?: string | null;
    name?: string | null;
    error?: string | null;
    providerType?: string | null;
}) {
    return {
        connected: Boolean(input.connected ?? (input.status === "CONNECTED" || input.status === "open")),
        state: normalizeLegacyWhatsappState(input.status),
        providerStatus: input.status || "DISCONNECTED",
        providerType: input.providerType || null,
        qrCode: input.qrCode || null,
        qrCodeRaw: input.qrCodeRaw || null,
        phoneNumber: input.phoneNumber || null,
        name: input.name || null,
        error: input.error || null,
    };
}

export function withLegacyWhatsappHeaders(
    init: ResponseInit | undefined,
    successorPath: string,
) {
    const headers = new Headers(init?.headers);
    headers.set("Deprecation", "true");
    headers.set("Sunset", LEGACY_WHATSAPP_SUNSET);
    headers.set("Link", `<${successorPath}>; rel="successor-version"`);
    headers.set("X-Deprecated-Endpoint", "true");

    return {
        ...init,
        headers,
    };
}

export async function getPrimaryWhatsappRuntime() {
    const connection = await getPrimaryWhatsappConnection();
    if (!connection) {
        return {
            connection: null,
            provider: null,
            status: null,
            qr: null,
        };
    }

    const provider = getWhatsappProviderAdapter(connection.providerType);
    const [status, qr] = await Promise.all([
        provider.getStatus(connection),
        provider.getQrCode(connection),
    ]);

    return {
        connection,
        provider,
        status,
        qr,
    };
}
