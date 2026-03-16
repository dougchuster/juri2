import { NextResponse } from "next/server";
import { z } from "zod";

import { getChatAuthOrThrow } from "@/lib/chat/auth";
import { chatErrorResponse } from "@/lib/chat/http";
import { getOrCreateInternalDirectConversation } from "@/lib/chat/service";
import { emitChatConversationCreated } from "@/lib/chat/socket-server";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  targetUserId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await getChatAuthOrThrow();
    const json = await request.json();
    const payload = payloadSchema.parse(json);
    const conversation = await getOrCreateInternalDirectConversation(payload.targetUserId, user);
    await emitChatConversationCreated([user.id, payload.targetUserId], { conversation });
    return NextResponse.json({ conversation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Destino invalido." }, { status: 400 });
    }
    return chatErrorResponse(error, "Erro ao iniciar conversa interna.");
  }
}
