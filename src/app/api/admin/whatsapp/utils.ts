import { NextResponse } from "next/server";
import { getSession } from "@/actions/auth";
import { getDefaultEscritorioId } from "@/lib/whatsapp/application/connection-service";

const ALLOWED_ROLES = new Set(["ADMIN", "SOCIO", "CONTROLADOR"]);

export async function requireWhatsAppAdminContext() {
    const session = await getSession();
    if (!session) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: "Nao autenticado" }, { status: 401 }),
        };
    }

    if (!ALLOWED_ROLES.has(String(session.role))) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: "Sem permissao" }, { status: 403 }),
        };
    }

    const escritorioId = await getDefaultEscritorioId();
    if (!escritorioId) {
        return {
            ok: false as const,
            response: NextResponse.json({ error: "Escritorio nao configurado" }, { status: 400 }),
        };
    }

    return {
        ok: true as const,
        session,
        escritorioId,
    };
}
