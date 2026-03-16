import { NextResponse } from "next/server";
import { whatsappService } from "@/lib/integrations/baileys-service";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

function hardResetAuthState() {
  const authDir = path.join(process.cwd(), ".whatsapp-auth");
  try {
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
    }
    fs.mkdirSync(authDir, { recursive: true });
  } catch (error) {
    console.error("[API] Hard reset auth state failed:", error);
  }
}

export async function POST() {
  try {
    await whatsappService.disconnect();
    return NextResponse.json({ success: true, message: "WhatsApp desconectado" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    hardResetAuthState();
    return NextResponse.json({
      success: true,
      message: "Sessao do WhatsApp resetada",
      warning: message,
    });
  }
}
