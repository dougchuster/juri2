import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { runAttendanceAutomationForInboundMessage } from "@/lib/services/attendance-automation";

export const dynamic = "force-dynamic";

const triggerSchema = z.object({
    previewOnly: z.boolean().optional().default(false),
    recentInboundCount: z.number().int().min(1).max(12).optional().default(6),
    incomingTextOverride: z.string().max(4000).nullable().optional(),
});

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session?.id) {
            return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
        }

        const body = await request
            .json()
            .catch(() => ({}));

        const parsedBody = triggerSchema.safeParse(body);
        if (!parsedBody.success) {
            return NextResponse.json({ error: "Payload invalido para trigger da automacao." }, { status: 422 });
        }

        const { id } = await context.params;
        const { incomingTextOverride, previewOnly, recentInboundCount } = parsedBody.data;

        const conversation = await db.conversation.findFirst({
            where: { id, ...(session.escritorioId ? { escritorioId: session.escritorioId } : {}) },
            select: {
                id: true,
                canal: true,
                messages: {
                    where: { direction: "INBOUND" },
                    orderBy: { createdAt: "desc" },
                    take: recentInboundCount,
                    select: { id: true, content: true },
                },
            },
        });

        if (!conversation) {
            return NextResponse.json({ error: "Conversa nao encontrada." }, { status: 404 });
        }

        if (conversation.canal !== "WHATSAPP") {
            return NextResponse.json(
                { error: "Automacao disponivel apenas para conversas WhatsApp." },
                { status: 422 }
            );
        }

        const latestInbound = conversation.messages[0];
        if (!latestInbound?.content?.trim() && !incomingTextOverride?.trim()) {
            return NextResponse.json(
                { error: "Nenhuma mensagem recebida nesta conversa." },
                { status: 422 }
            );
        }

        const assembledContext = incomingTextOverride?.trim()
            ? incomingTextOverride.trim()
            : conversation.messages
                  .slice()
                  .reverse()
                  .map((message) => message.content?.trim() || "")
                  .filter(Boolean)
                  .join("\n");

        const result = await runAttendanceAutomationForInboundMessage({
            conversationId: conversation.id,
            messageId: latestInbound?.id || null,
            incomingText: assembledContext,
            source: "manual",
            forceRetry: true,
            skipBurstDelay: true,
            dryRun: previewOnly,
        });

        if (previewOnly) {
            if (!result.handled || !result.preview) {
                return NextResponse.json(
                    { success: false, error: result.reason || "Nenhum fluxo correspondeu a conversa." },
                    { status: 422 }
                );
            }

            return NextResponse.json({
                success: true,
                preview: {
                    ...result.preview,
                    context: assembledContext,
                    recentInboundCount,
                },
            });
        }

        if (result.handled) {
            return NextResponse.json({
                success: true,
                reason: result.reason,
                flowId: result.flowId,
                mode: result.mode,
            });
        }

        return NextResponse.json(
            { success: false, error: result.reason || "Nenhum fluxo correspondeu a conversa." },
            { status: 422 }
        );
    } catch (error) {
        console.error("[trigger-automation] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Falha ao acionar automacao." },
            { status: 500 }
        );
    }
}
