import { NextRequest, NextResponse } from "next/server";
import { getWhatsappConnectionById, updateWhatsappConnection } from "@/lib/whatsapp/application/connection-service";
import { getWhatsappProviderAdapter } from "@/lib/whatsapp/providers/provider-registry";
import { requireWhatsAppAdminContext } from "@/app/api/admin/whatsapp/utils";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    const auth = await requireWhatsAppAdminContext();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const connection = await getWhatsappConnectionById(id);
    if (!connection || connection.escritorioId !== auth.escritorioId) {
        return NextResponse.json({ ok: false, error: "Conexao nao encontrada" }, { status: 404 });
    }

    const provider = getWhatsappProviderAdapter(connection.providerType);
    const result = await provider.healthCheck(connection);
    await updateWhatsappConnection(id, {
        healthStatus: result.status,
        lastHealthAt: new Date(),
        lastError: result.ok ? null : result.error || null,
    });
    return NextResponse.json(result);
}
