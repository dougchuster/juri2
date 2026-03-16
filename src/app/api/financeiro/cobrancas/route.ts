import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { gerarCobrancaAsaas, sincronizarStatusCobranca, cancelarCobranca } from "@/lib/services/asaas-billing";

export const dynamic = "force-dynamic";

// ─── Schema de validação ──────────────────────────────────────────────────────

const gerarCobrancaSchema = z.object({
    faturaId: z.string().min(1),
    tipoPagamento: z.enum(["PIX", "BOLETO"]),
});

const sincronizarSchema = z.object({
    faturaId: z.string().min(1),
});

const cancelarSchema = z.object({
    faturaId: z.string().min(1),
});

// ─── POST /api/financeiro/cobrancas — Gerar cobrança ─────────────────────────

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const action = searchParams.get("action") ?? "gerar";

        if (action === "gerar") {
            const parsed = gerarCobrancaSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json(
                    { error: "Dados inválidos", details: parsed.error.flatten() },
                    { status: 400 }
                );
            }

            const result = await gerarCobrancaAsaas(parsed.data);
            if (!result.ok) {
                return NextResponse.json({ error: result.error }, { status: 422 });
            }

            return NextResponse.json(result);
        }

        if (action === "sincronizar") {
            const parsed = sincronizarSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json({ error: "faturaId obrigatório" }, { status: 400 });
            }

            const result = await sincronizarStatusCobranca(parsed.data.faturaId);
            if (!result.ok) {
                return NextResponse.json({ error: result.error }, { status: 422 });
            }

            return NextResponse.json(result);
        }

        if (action === "cancelar") {
            const parsed = cancelarSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json({ error: "faturaId obrigatório" }, { status: 400 });
            }

            const result = await cancelarCobranca(parsed.data.faturaId);
            if (!result.ok) {
                return NextResponse.json({ error: result.error }, { status: 422 });
            }

            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    } catch (error) {
        console.error("[Cobrancas API] Erro:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

// ─── GET /api/financeiro/cobrancas?faturaId=xxx — Status da cobrança ─────────

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const faturaId = searchParams.get("faturaId");

        if (!faturaId) {
            return NextResponse.json({ error: "faturaId obrigatório" }, { status: 400 });
        }

        const result = await sincronizarStatusCobranca(faturaId);
        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 422 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("[Cobrancas API] Erro GET:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
