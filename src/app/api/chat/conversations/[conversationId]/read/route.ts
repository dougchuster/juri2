import { NextResponse } from "next/server";

import { chatErrorResponse } from "@/lib/chat/http";
import { markInternalChatRead } from "@/lib/chat/service";
import { emitChatMessageRead } from "@/lib/chat/socket-server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { conversationId } = await context.params;
    const result = await markInternalChatRead(conversationId);
    await emitChatMessageRead(conversationId, result.participantIds, {
      conversationId,
      readAt: result.readAt,
    });
    return NextResponse.json(result);
  } catch (error) {
    return chatErrorResponse(error, "Erro ao marcar conversa como lida.");
  }
}
