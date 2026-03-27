import { NextResponse } from "next/server";
import { getSession } from "@/actions/auth";
import { sendConversionEvent } from "@/lib/meta/conversions";

export async function POST() {
    const session = await getSession();
    if (!session || !["ADMIN", "SOCIO", "CONTROLADOR"].includes(session.role)) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (!session.escritorioId) {
        return NextResponse.json({ error: "Escritório não encontrado" }, { status: 400 });
    }

    const result = await sendConversionEvent(session.escritorioId, {
        eventName: "Lead",
        userData: { email: session.email ?? undefined },
        customData: { contentName: "Teste de Pixel - Sistema Jurídico" },
        actionSource: "system_generated",
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
