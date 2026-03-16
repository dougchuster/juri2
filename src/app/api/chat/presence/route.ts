import { NextResponse } from "next/server";
import { z } from "zod";

import { chatErrorResponse } from "@/lib/chat/http";
import { getChatAuthOrThrow } from "@/lib/chat/auth";
import { getRelevantPresence, updateInternalManualStatus } from "@/lib/chat/service";
import { emitChatPresenceUpdateForUser } from "@/lib/chat/socket-server";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  manualStatus: z.enum(["ONLINE", "AWAY", "BUSY"]).nullable(),
});

export async function GET(request: Request) {
  try {
    const user = await getChatAuthOrThrow();
    const { searchParams } = new URL(request.url);
    const ids = (searchParams.get("ids") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const presence = await getRelevantPresence(ids, user);
    return NextResponse.json({ presence });
  } catch (error) {
    return chatErrorResponse(error, "Erro ao carregar presenca.");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getChatAuthOrThrow();
    const json = await request.json();
    const payload = updateSchema.parse(json);
    const result = await updateInternalManualStatus(payload.manualStatus, user);
    await emitChatPresenceUpdateForUser(user);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Status manual invalido." }, { status: 400 });
    }
    return chatErrorResponse(error, "Erro ao atualizar status manual.");
  }
}
