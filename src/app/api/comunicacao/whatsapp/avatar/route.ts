import { getWhatsappAvatarResponse } from "@/app/api/comunicacao/whatsapp/shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    return getWhatsappAvatarResponse(request);
}
