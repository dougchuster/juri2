import { NextResponse } from "next/server";

import { getInternalChatConversations } from "@/lib/chat/service";
import { chatErrorResponse } from "@/lib/chat/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const conversations = await getInternalChatConversations();
    return NextResponse.json({ conversations });
  } catch (error) {
    return chatErrorResponse(error, "Erro ao carregar conversas internas.");
  }
}
