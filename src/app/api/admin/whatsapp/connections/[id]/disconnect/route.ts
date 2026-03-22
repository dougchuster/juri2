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
    await provider.disconnect(connection);
    await updateWhatsappConnection(id, {
        status: "DISCONNECTED",
        connectedPhone: null,
        connectedName: null,
        lastError: null,
    });

    return NextResponse.json({ ok: true });
}
