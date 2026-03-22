import { NextRequest, NextResponse } from "next/server";
import { getWhatsappConnectionById, updateWhatsappConnection } from "@/lib/whatsapp/application/connection-service";
import { getWhatsappProviderAdapter } from "@/lib/whatsapp/providers/provider-registry";
import { requireWhatsAppAdminContext } from "@/app/api/admin/whatsapp/utils";

export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    const auth = await requireWhatsAppAdminContext();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const connection = await getWhatsappConnectionById(id);
    if (!connection || connection.escritorioId !== auth.escritorioId) {
        return NextResponse.json({ ok: false, error: "Conexao nao encontrada" }, { status: 404 });
    }

    const provider = getWhatsappProviderAdapter(connection.providerType);
    await updateWhatsappConnection(id, { status: "CONNECTING", lastError: null });

    try {
        const result = await provider.connect(connection);
        await updateWhatsappConnection(id, {
            status: result.status === "CONNECTED" ? "CONNECTED" : result.qrCodeRaw ? "QR_REQUIRED" : "CONNECTING",
            connectedPhone: result.connectedPhone || null,
            connectedName: result.connectedName || null,
            lastConnectedAt: result.status === "CONNECTED" ? new Date() : undefined,
            lastError: null,
        });
        return NextResponse.json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao conectar";
        await updateWhatsappConnection(id, { status: "ERROR", lastError: message });
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
