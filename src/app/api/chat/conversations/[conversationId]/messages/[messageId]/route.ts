import { NextResponse } from "next/server";

import { getChatAuthOrThrow } from "@/lib/chat/auth";
import { chatErrorResponse } from "@/lib/chat/http";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    conversationId: string;
    messageId: string;
  }>;
};

/**
 * DELETE /api/chat/conversations/[conversationId]/messages/[messageId]
 * Soft-deletes a message (sets deletedAt). Only the sender can delete their own messages.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id: userId } = await getChatAuthOrThrow();
    const { conversationId, messageId } = await context.params;

    // Verify message exists and belongs to this conversation
    const message = await db.internalChatMessage.findFirst({
      where: { id: messageId, conversationId },
      select: { id: true, senderId: true, deletedAt: true },
    });

    if (!message) {
      return NextResponse.json({ error: "Mensagem não encontrada." }, { status: 404 });
    }

    if (message.deletedAt) {
      return NextResponse.json({ error: "Mensagem já foi apagada." }, { status: 400 });
    }

    // Only the sender can delete their message
    if (message.senderId !== userId) {
      return NextResponse.json({ error: "Você não pode apagar a mensagem de outro usuário." }, { status: 403 });
    }

    await db.internalChatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), text: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return chatErrorResponse(error, "Erro ao apagar mensagem.");
  }
}
