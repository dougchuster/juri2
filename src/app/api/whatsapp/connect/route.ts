import { NextResponse } from "next/server";
import {
  getPrimaryWhatsappConnection,
  updateWhatsappConnection,
} from "@/lib/whatsapp/application/connection-service";
import { getWhatsappProviderAdapter } from "@/lib/whatsapp/providers/provider-registry";
import {
  buildLegacyWhatsappStatusPayload,
  withLegacyWhatsappHeaders,
} from "@/app/api/comunicacao/whatsapp/compat";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Legacy compatibility endpoint.
 * New admin flows should use /api/admin/whatsapp/connections/[id]/connect.
 */
export async function POST() {
  try {
    const connection = await getPrimaryWhatsappConnection();
    if (!connection) {
      return NextResponse.json(
        { error: "Nenhuma conexao primaria de WhatsApp configurada" },
        withLegacyWhatsappHeaders(
          { status: 400 },
          "/api/admin/whatsapp/connections/[id]/connect"
        )
      );
    }

    const provider = getWhatsappProviderAdapter(connection.providerType);
    await updateWhatsappConnection(connection.id, { status: "CONNECTING", lastError: null });
    const connectResult = await provider.connect(connection);

    await updateWhatsappConnection(connection.id, {
      status: connectResult.status === "CONNECTED" ? "CONNECTED" : connectResult.qrCodeRaw ? "QR_REQUIRED" : "CONNECTING",
      connectedPhone: connectResult.connectedPhone || null,
      connectedName: connectResult.connectedName || null,
      lastConnectedAt: connectResult.status === "CONNECTED" ? new Date() : undefined,
      lastError: connectResult.error || null,
    });

    if (!connectResult.ok) {
      return NextResponse.json(
        { error: connectResult.error || "Erro ao conectar WhatsApp" },
        withLegacyWhatsappHeaders(
          { status: 500 },
          "/api/admin/whatsapp/connections/[id]/connect"
        )
      );
    }

    const finalStatus = buildLegacyWhatsappStatusPayload({
      status: connectResult.status,
      connected: connectResult.status === "CONNECTED",
      qrCode: connectResult.qrCode || null,
      qrCodeRaw: connectResult.qrCodeRaw || null,
      phoneNumber: connectResult.connectedPhone || null,
      name: connectResult.connectedName || null,
      providerType: connection.providerType,
    });

    return NextResponse.json({
      success: true,
      status: finalStatus,
      message: finalStatus.qrCode
        ? "QR Code gerado"
        : connection.providerType === "META_CLOUD_API"
          ? "Credenciais validadas e conexao habilitada."
          : "Conexao iniciada.",
    }, withLegacyWhatsappHeaders(undefined, "/api/admin/whatsapp/connections/[id]/connect"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[API] WhatsApp connect error:", message);
    return NextResponse.json(
      { error: `Erro ao conectar WhatsApp: ${message}` },
      withLegacyWhatsappHeaders(
        { status: 500 },
        "/api/admin/whatsapp/connections/[id]/connect"
      )
    );
  }
}
