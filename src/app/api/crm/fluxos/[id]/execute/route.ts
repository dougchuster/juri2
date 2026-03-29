import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCRMAuth, canManageCRMConfiguration } from "@/lib/auth/crm-auth";
import { buildContatoVisibilityWhere } from "@/lib/auth/crm-scope";
import { AutomationEngine } from "@/lib/services/automation-engine";

export const dynamic = "force-dynamic";

const executeSchema = z.object({
    clienteId: z.string().optional().nullable(),
    processoId: z.string().optional().nullable(),
    payload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireCRMAuth();
    if (!auth.ok) return auth.response;
    if (!canManageCRMConfiguration(auth.user)) {
        return NextResponse.json({ error: "Sem permissao para executar automacoes." }, { status: 403 });
    }

    const escritorioId = auth.user.escritorioId;
    if (!escritorioId) {
        return NextResponse.json({ error: "Escritorio nao encontrado." }, { status: 400 });
    }

    const { id } = await params;
    const flow = await db.automationFlow.findFirst({
        where: { id, escritorioId },
        select: { id: true, name: true, isActive: true },
    });
    if (!flow) {
        return NextResponse.json({ error: "Fluxo nao encontrado." }, { status: 404 });
    }
    if (!flow.isActive) {
        return NextResponse.json({ error: "Fluxo inativo. Ative antes de executar." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = executeSchema.safeParse(body);
    const clienteId = parsed.success ? parsed.data.clienteId ?? undefined : undefined;
    const processoId = parsed.success ? parsed.data.processoId ?? undefined : undefined;
    const extraPayload = parsed.success ? parsed.data.payload ?? {} : {};

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
            ...extraPayload,
            escritorioId,
            clienteId: resolvedClienteId,
            processoId,
            userId: auth.user.id,
            _manualExecution: true,
        });

        return NextResponse.json({
            ok: result.started,
            executionId: result.started ? result.executionId : null,
            queued: result.started ? Boolean(result.queued) : false,
            reason: !result.started ? (result.reason ?? "Fluxo sem no inicial.") : undefined,
            clienteId: resolvedClienteId,
            processoId: processoId || null,
        });
    } catch (error) {
        console.error("[FLOW_EXECUTE]", error);
        return NextResponse.json({ error: "Erro ao executar fluxo." }, { status: 500 });
    }
}
