import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
    enviarParaAssinatura,
    consultarStatusAssinatura,
    cancelarAssinatura,
} from "@/lib/services/assinatura-digital";

export const dynamic = "force-dynamic";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const enviarSchema = z.object({
    documentoId: z.string().min(1),
    clienteId: z.string().optional().nullable(),
    advogadoId: z.string().optional().nullable(),
    mensagem: z.string().max(500).optional().nullable(),
    prazoAssinaturaDias: z.number().int().min(1).max(90).optional(),
});

const consultarSchema = z.object({
    documentKey: z.string().min(1),
});

const cancelarSchema = z.object({
    documentKey: z.string().min(1),
});

// ─── POST — Enviar para assinatura ou cancelar ────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const action = searchParams.get("action") ?? "enviar";

        if (action === "enviar") {
            const parsed = enviarSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json(
                    { error: "Dados inválidos", details: parsed.error.flatten() },
                    { status: 400 }
                );
            }

            if (!parsed.data.clienteId && !parsed.data.advogadoId) {
                return NextResponse.json(
                    { error: "Pelo menos um signatário (clienteId ou advogadoId) é obrigatório" },
                    { status: 400 }
                );
            }

            const result = await enviarParaAssinatura(parsed.data);
            if (!result.ok) {
                return NextResponse.json({ error: result.error }, { status: 422 });
            }

            return NextResponse.json(result, { status: 201 });
        }

        if (action === "cancelar") {
            const parsed = cancelarSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json({ error: "documentKey obrigatório" }, { status: 400 });
            }

            const result = await cancelarAssinatura(parsed.data.documentKey);
            if (!result.ok) {
                return NextResponse.json({ error: result.error }, { status: 422 });
            }

            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    } catch (error) {
        console.error("[Assinar API] Erro:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

// ─── GET — Consultar status ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const documentKey = searchParams.get("documentKey");

        if (!documentKey) {
            return NextResponse.json({ error: "documentKey obrigatório" }, { status: 400 });
        }

        const parsed = consultarSchema.safeParse({ documentKey });
        if (!parsed.success) {
            return NextResponse.json({ error: "documentKey inválido" }, { status: 400 });
        }

        const result = await consultarStatusAssinatura(documentKey);
        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 422 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("[Assinar API] Erro GET:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
