import { getWhatsappStatusResponse } from "@/app/api/comunicacao/whatsapp/shared";

export const dynamic = "force-dynamic";

export async function GET() {
    return getWhatsappStatusResponse();
}
