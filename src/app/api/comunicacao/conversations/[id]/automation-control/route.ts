import { NextResponse } from "next/server";
import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { emitCommunicationRealtimeEvent } from "@/lib/comunicacao/realtime";
import { emitCommunicationAutomationControlUpdated } from "@/lib/chat/socket-server";

export const dynamic = "force-dynamic";

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session?.id) {
            return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
        }

        const { id } = await context.params;
        const body = await request.json().catch(() => ({}));
        const iaDesabilitada = typeof body.iaDesabilitada === "boolean" ? body.iaDesabilitada : undefined;
        const autoAtendimentoPausado =
            typeof body.autoAtendimentoPausado === "boolean" ? body.autoAtendimentoPausado : undefined;
        const pausarPorMinutos = Number(body.pausarPorMinutos || 0);
        const motivo = String(body.motivo || "").trim() || null;

        const shouldPauseTemporarily = Number.isFinite(pausarPorMinutos) && pausarPorMinutos > 0;
        const pausadoAte = shouldPauseTemporarily
            ? new Date(Date.now() + pausarPorMinutos * 60 * 1000)
            : null;

        const conversation = await db.conversation.findUnique({
            where: { id },
        });

        if (!conversation) {
            return NextResponse.json({ error: "Conversa nao encontrada." }, { status: 404 });
        }

        const updatedConversation = await db.conversation.update({
            where: { id },
            data: {
                ...(iaDesabilitada !== undefined
                    ? {
                          iaDesabilitada,
                          iaDesabilitadaEm: iaDesabilitada ? new Date() : null,
                          iaDesabilitadaPor: iaDesabilitada ? session.id : null,
                      }
                    : {}),
                ...(shouldPauseTemporarily
                    ? {
                          autoAtendimentoPausado: true,
                          pausadoAte,
                          motivoPausa: motivo,
                      }
                    : autoAtendimentoPausado !== undefined
                      ? {
                            autoAtendimentoPausado,
                            pausadoAte: autoAtendimentoPausado ? conversation.pausadoAte : null,
                            motivoPausa: autoAtendimentoPausado ? motivo || conversation.motivoPausa : null,
                        }
                      : {}),
            },
        });

        const payload = {
            type: "automation_control_updated" as const,
            conversationId: updatedConversation.id,
            iaDesabilitada: updatedConversation.iaDesabilitada,
            iaDesabilitadaEm: updatedConversation.iaDesabilitadaEm?.toISOString() || null,
            iaDesabilitadaPor: updatedConversation.iaDesabilitadaPor,
            autoAtendimentoPausado: updatedConversation.autoAtendimentoPausado,
            pausadoAte: updatedConversation.pausadoAte?.toISOString() || null,
            motivoPausa: updatedConversation.motivoPausa,
            updatedByName: session.name || null,
        };

        emitCommunicationRealtimeEvent(payload);
        emitCommunicationAutomationControlUpdated(payload);

        return NextResponse.json({
            success: true,
            conversation: {
                ...updatedConversation,
                iaDesabilitadaEm: updatedConversation.iaDesabilitadaEm?.toISOString() || null,
                pausadoAte: updatedConversation.pausadoAte?.toISOString() || null,
            },
        });
    } catch (error) {
        console.error("[communication automation control] Error:", error);
        return NextResponse.json({ error: "Falha ao atualizar controle de IA." }, { status: 500 });
    }
}
