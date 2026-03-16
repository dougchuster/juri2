import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCRMAuth } from "@/lib/auth/crm-auth";
import { buildContatoVisibilityWhere } from "@/lib/auth/crm-scope";
import { AutomationEngine } from "@/lib/services/automation-engine";

export const dynamic = "force-dynamic";

const testSchema = z.object({
    clienteId: z.string().optional().nullable(),
});

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireCRMAuth();
    if (!auth.ok) return auth.response;

    const escritorioId = auth.user.escritorioId;
    if (!escritorioId) return NextResponse.json({ error: "Escritório não encontrado." }, { status: 400 });

    const { id } = await params;

    // Verify flow belongs to this escritório
    const flow = await db.automationFlow.findFirst({
        where: { id, escritorioId },
        select: { id: true, name: true, isActive: true, triggerType: true },
    });
    if (!flow) return NextResponse.json({ error: "Fluxo não encontrado." }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const parsed = testSchema.safeParse(body);
    const clienteId = parsed.success ? parsed.data.clienteId ?? undefined : undefined;

    // If no clienteId provided, pick the most recent contact accessible to this user
    let resolvedClienteId = clienteId;
    if (!resolvedClienteId) {
        const scopeWhere = buildContatoVisibilityWhere(auth.user);
        const sample = await db.cliente.findFirst({
            where: scopeWhere,
            orderBy: { createdAt: "desc" },
            select: { id: true },
        });
        resolvedClienteId = sample?.id;
    }

    try {
        const result = await AutomationEngine.startExecution(flow.id, {
            escritorioId,
            clienteId: resolvedClienteId,
            userId: auth.user.id,
            _testMode: true,
        });

        return NextResponse.json({
            ok: result.started,
            executionId: result.started ? result.executionId : null,
            reason: !result.started ? (result.reason ?? "Fluxo sem nó inicial.") : undefined,
            clienteId: resolvedClienteId,
        });
    } catch (err) {
        console.error("[FLOW_TEST]", err);
        return NextResponse.json({ error: "Erro ao testar fluxo." }, { status: 500 });
    }
}
