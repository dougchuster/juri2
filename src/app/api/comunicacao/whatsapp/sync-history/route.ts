import { postWhatsappSyncHistoryResponse } from "@/app/api/comunicacao/whatsapp/shared";

export const dynamic = "force-dynamic";

export async function POST() {
    return postWhatsappSyncHistoryResponse();
}
