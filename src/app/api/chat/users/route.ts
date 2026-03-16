import { NextResponse } from "next/server";

import { getChatDirectory } from "@/lib/chat/service";
import { chatErrorResponse } from "@/lib/chat/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await getChatDirectory();
    return NextResponse.json({ users });
  } catch (error) {
    return chatErrorResponse(error, "Erro ao carregar diretorio interno.");
  }
}
