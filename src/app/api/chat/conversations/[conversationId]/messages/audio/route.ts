import { NextResponse } from "next/server";
import { z } from "zod";

import { chatErrorResponse } from "@/lib/chat/http";
import { sendInternalChatAttachmentMessage } from "@/lib/chat/service";
import { emitChatMessageCreated } from "@/lib/chat/socket-server";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  storageKey: z.string().min(1),
  fileUrl: z.string().min(1),
  originalName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive(),
  durationSeconds: z.number().nonnegative().optional().nullable(),
  text: z.string().max(4000).optional().nullable(),
  metadataJson: z.record(z.string(), z.unknown()).optional().nullable(),
});

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { conversationId } = await context.params;
    const json = await request.json();
    const payload = payloadSchema.parse(json);
    const result = await sendInternalChatAttachmentMessage(conversationId, {
      kind: "AUDIO",
      storageKey: payload.storageKey,
      fileUrl: payload.fileUrl,
      originalName: payload.originalName,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
      durationSeconds: payload.durationSeconds ?? null,
      text: payload.text,
      metadataJson: payload.metadataJson ?? null,
    });
    await emitChatMessageCreated(conversationId, result.participantIds, {
      conversationId,
      message: result.message,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Audio invalido." }, { status: 400 });
    }
    return chatErrorResponse(error, "Erro ao enviar audio.");
  }
}
