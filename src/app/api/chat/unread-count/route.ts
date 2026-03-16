import { NextResponse } from "next/server";

import { chatErrorResponse } from "@/lib/chat/http";
import { getInternalChatUnreadCount } from "@/lib/chat/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const unreadCount = await getInternalChatUnreadCount();
    return NextResponse.json({ unreadCount });
  } catch (error) {
    return chatErrorResponse(error, "Erro ao carregar contador de nao lidas.");
  }
}
