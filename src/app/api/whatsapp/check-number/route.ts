import { NextResponse } from "next/server";
import { whatsappService } from "@/lib/integrations/baileys-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    if (!phone) {
      return NextResponse.json({ error: "phone obrigatorio" }, { status: 400 });
    }

    const result = await whatsappService.checkNumber(phone);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

