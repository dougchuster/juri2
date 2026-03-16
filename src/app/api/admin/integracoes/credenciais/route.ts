import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/actions/auth";
import {
    getIntegrationCredentials,
    saveIntegrationCredentials,
} from "@/lib/integrations/credentials-store";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["ADMIN", "SOCIO", "CONTROLADOR"];

// ─── GET — Retorna status das credenciais (sem revelar valores) ───────────────

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (!ALLOWED_ROLES.includes(String(session.role))) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const creds = await getIntegrationCredentials();

    // Retorna apenas flags de presença + ambiente — nunca o valor real
    return NextResponse.json({
        clicksign: {
            hasToken: !!(creds.clicksign_access_token || process.env.CLICKSIGN_ACCESS_TOKEN),
            env: creds.clicksign_env ?? process.env.CLICKSIGN_ENV ?? "sandbox",
            fromEnv: !!process.env.CLICKSIGN_ACCESS_TOKEN,
        },
        asaas: {
            hasToken: !!(creds.asaas_api_key || process.env.ASAAS_API_KEY),
            env: creds.asaas_env ?? process.env.ASAAS_ENV ?? "sandbox",
            fromEnv: !!process.env.ASAAS_API_KEY,
        },
        portal: {
            hasSecret: !!(creds.portal_token_secret || process.env.PORTAL_TOKEN_SECRET),
            fromEnv: !!process.env.PORTAL_TOKEN_SECRET,
        },
    });
}

// ─── PUT — Salva/atualiza credenciais ─────────────────────────────────────────

const updateSchema = z.object({
    clicksign_access_token: z.string().max(500).optional().nullable(),
    clicksign_env: z.enum(["sandbox", "production"]).optional().nullable(),
    asaas_api_key: z.string().max(500).optional().nullable(),
    asaas_env: z.enum(["sandbox", "production"]).optional().nullable(),
    portal_token_secret: z.string().min(16).max(500).optional().nullable(),
});

export async function PUT(request: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    if (!ALLOWED_ROLES.includes(String(session.role))) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Dados inválidos", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    // Filtra undefined para não limpar campos não enviados
    const updates = Object.fromEntries(
        Object.entries(parsed.data).filter(([, v]) => v !== undefined)
    );

    await saveIntegrationCredentials(
        updates as Parameters<typeof saveIntegrationCredentials>[0]
    );

    return NextResponse.json({ ok: true });
}
