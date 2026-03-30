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

    // Tenta desconectar da Evolution API; se credenciais nao houver (chave de criptografia
    // diferente entre ambientes), apenas atualiza o DB sem abortar a operacao.
    try {
        await provider.disconnect(connection);
    } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        const isCredentialsError =
            msg.toLowerCase().includes("credenciais") ||
            msg.toLowerCase().includes("nao configuradas") ||
            msg.toLowerCase().includes("not configured");
        if (!isCredentialsError) {
            return NextResponse.json({ ok: false, error: msg || "Falha ao desconectar" }, { status: 500 });
        }
        // Credenciais inacessiveis — marca como desconectado no banco mesmo assim
    }

    await updateWhatsappConnection(id, {
        status: "DISCONNECTED",
        connectedPhone: null,
        connectedName: null,
        lastError: null,
    });

    return NextResponse.json({ ok: true });
}
