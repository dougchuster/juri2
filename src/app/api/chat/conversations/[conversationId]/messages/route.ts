import { NextResponse } from "next/server";
import { z } from "zod";

import { chatErrorResponse } from "@/lib/chat/http";
import { getInternalChatMessages, sendInternalChatTextMessage } from "@/lib/chat/service";
import { emitChatMessageCreated } from "@/lib/chat/socket-server";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  text: z.string().min(1).max(4000),
});

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { conversationId } = await context.params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const result = await getInternalChatMessages(conversationId, cursor);
    return NextResponse.json(result);
  } catch (error) {
    return chatErrorResponse(error, "Erro ao carregar mensagens.");
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { conversationId } = await context.params;
    const json = await request.json();
    const payload = payloadSchema.parse(json);
    const result = await sendInternalChatTextMessage(conversationId, payload.text);
    await emitChatMessageCreated(conversationId, result.participantIds, {
      conversationId,
      message: result.message,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Mensagem invalida." }, { status: 400 });
    }
    return chatErrorResponse(error, "Erro ao enviar mensagem.");
  }
}
