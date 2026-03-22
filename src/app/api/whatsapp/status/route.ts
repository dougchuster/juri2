import { getWhatsappStatusResponse } from "@/app/api/comunicacao/whatsapp/shared";
import { withLegacyWhatsappHeaders } from "@/app/api/comunicacao/whatsapp/compat";

export const dynamic = "force-dynamic";

/**
 * Legacy compatibility endpoint.
 * Prefer /api/comunicacao/whatsapp/status for module consumers.
 */
export async function GET() {
  const response = await getWhatsappStatusResponse();
  const legacyHeaders = withLegacyWhatsappHeaders(
    undefined,
    "/api/comunicacao/whatsapp/status"
  ).headers;
  legacyHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}
