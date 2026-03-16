import { NextResponse } from "next/server";
import { z } from "zod";

import { getChatAuthOrThrow } from "@/lib/chat/auth";
import { chatErrorResponse } from "@/lib/chat/http";
import { createInternalGroupConversation } from "@/lib/chat/service";
import { emitChatConversationCreated } from "@/lib/chat/socket-server";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().max(240).optional().or(z.literal("")),
  memberUserIds: z.array(z.string().min(1)).min(2),
  isTeamGroup: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getChatAuthOrThrow();
    const json = await request.json();
    const payload = payloadSchema.parse(json);

    const conversation = await createInternalGroupConversation(
      {
        title: payload.title,
        description: payload.description || null,
        memberUserIds: payload.memberUserIds,
        isTeamGroup: payload.isTeamGroup ?? false,
      },
      user
    );

    await emitChatConversationCreated(
      [user.id, ...payload.memberUserIds],
      { conversation }
    );

    return NextResponse.json({ conversation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados invalidos para criar o grupo." }, { status: 400 });
    }
    return chatErrorResponse(error, "Erro ao criar grupo interno.");
  }
}
