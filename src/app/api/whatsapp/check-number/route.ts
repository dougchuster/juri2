import { NextResponse } from "next/server";
import { checkWhatsappNumberCapability } from "@/lib/whatsapp/application/provider-capabilities";
import { withLegacyWhatsappHeaders } from "@/app/api/comunicacao/whatsapp/compat";

export const dynamic = "force-dynamic";

/**
 * Legacy compatibility endpoint.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    if (!phone) {
      return NextResponse.json(
        { error: "phone obrigatorio" },
        withLegacyWhatsappHeaders({ status: 400 }, "/api/comunicacao/send")
      );
    }

    const result = await checkWhatsappNumberCapability(phone);
    return NextResponse.json(
      result,
      withLegacyWhatsappHeaders(
        { status: result.ok ? 200 : 400 },
        "/api/comunicacao/send"
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message },
      withLegacyWhatsappHeaders({ status: 500 }, "/api/comunicacao/send")
    );
  }
}
