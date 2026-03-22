import { NextResponse } from "next/server";
import {
  getPrimaryWhatsappConnection,
  updateWhatsappConnection,
} from "@/lib/whatsapp/application/connection-service";
import { getWhatsappProviderAdapter } from "@/lib/whatsapp/providers/provider-registry";
import { withLegacyWhatsappHeaders } from "@/app/api/comunicacao/whatsapp/compat";

export const dynamic = "force-dynamic";

/**
 * Legacy compatibility endpoint.
 * New admin flows should use /api/admin/whatsapp/connections/[id]/disconnect.
 */
export async function POST() {
  try {
    const connection = await getPrimaryWhatsappConnection();
    if (!connection) {
      return NextResponse.json(
        { success: true, message: "Nenhuma conexao primaria configurada" },
        withLegacyWhatsappHeaders(
          undefined,
          "/api/admin/whatsapp/connections/[id]/disconnect"
        )
      );
    }

    const provider = getWhatsappProviderAdapter(connection.providerType);
    await provider.disconnect(connection);
    await updateWhatsappConnection(connection.id, {
      status: "DISCONNECTED",
      connectedPhone: null,
      connectedName: null,
      lastError: null,
    });

    return NextResponse.json(
      { success: true, message: "WhatsApp desconectado" },
      withLegacyWhatsappHeaders(
        undefined,
        "/api/admin/whatsapp/connections/[id]/disconnect"
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { success: false, message: "Falha ao desconectar WhatsApp", warning: message },
      withLegacyWhatsappHeaders(
        { status: 500 },
        "/api/admin/whatsapp/connections/[id]/disconnect"
      )
    );
  }
}
