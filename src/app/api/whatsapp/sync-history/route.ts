import { postWhatsappSyncHistoryResponse } from "@/app/api/comunicacao/whatsapp/shared";
import { withLegacyWhatsappHeaders } from "@/app/api/comunicacao/whatsapp/compat";

export const dynamic = "force-dynamic";

/**
 * Legacy compatibility endpoint.
 * Triggers WhatsApp history sync when the active provider supports it.
 */
export async function POST() {
  const response = await postWhatsappSyncHistoryResponse();
  const legacyHeaders = withLegacyWhatsappHeaders(
    undefined,
    "/api/comunicacao/whatsapp/sync-history"
  ).headers;
  legacyHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}
