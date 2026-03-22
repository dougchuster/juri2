import { NextRequest, NextResponse } from "next/server";
import { requireWhatsAppAdminContext } from "@/app/api/admin/whatsapp/utils";
import { getWhatsappConnectionById, setPrimaryWhatsappConnection } from "@/lib/whatsapp/application/connection-service";

export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    const auth = await requireWhatsAppAdminContext();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const existing = await getWhatsappConnectionById(id);
    if (!existing || existing.escritorioId !== auth.escritorioId) {
        return NextResponse.json({ ok: false, error: "Conexao nao encontrada" }, { status: 404 });
    }

    const connection = await setPrimaryWhatsappConnection(id);
    if (!connection) {
        return NextResponse.json({ ok: false, error: "Conexao nao encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}
