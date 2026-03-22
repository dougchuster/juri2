import { getWhatsappAvatarResponse } from "@/app/api/comunicacao/whatsapp/shared";
import { withLegacyWhatsappHeaders } from "@/app/api/comunicacao/whatsapp/compat";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const response = await getWhatsappAvatarResponse(request);
  const legacyHeaders = withLegacyWhatsappHeaders(
    undefined,
    "/api/comunicacao/whatsapp/avatar"
  ).headers;
  legacyHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}
