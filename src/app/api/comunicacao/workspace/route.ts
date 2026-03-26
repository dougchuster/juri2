import { NextResponse } from "next/server";
import { fetchConversationWorkspace } from "@/actions/comunicacao";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    }

    const TIMEOUT_MS = 12_000;
    const result = await Promise.race([
      fetchConversationWorkspace(conversationId),
      new Promise<{ error: string }>((resolve) =>
        setTimeout(() => resolve({ error: "Tempo limite ao carregar painel da conversa." }), TIMEOUT_MS)
      ),
    ]);

    if (!result || !("success" in result) || !result.success) {
      return NextResponse.json(result || { error: "Falha ao carregar workspace" }, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[API] Error fetching workspace:", error);
    return NextResponse.json({ error: "Falha ao carregar workspace da conversa" }, { status: 500 });
  }
}
