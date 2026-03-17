import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdminApi, getClientIpFromRequest } from "@/lib/root-admin/api-auth";
import { StatusEscritorio } from "@/generated/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSuperAdminApi(request);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, motivo } = body;

    if (!status || !Object.values(StatusEscritorio).includes(status as StatusEscritorio)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Verify org exists
    const existing = await db.escritorio.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Update status
    const updated = await db.escritorio.update({
      where: { id },
      data: { statusEscritorio: status },
    });

    // Log action
    await db.superAdminLog.create({
      data: {
        superAdminId: session!.superAdmin.id,
        acao: `ALTERAR_STATUS_${status}`,
        detalhes: {
          orgId: id,
          statusAntigo: existing.statusEscritorio,
          statusNovo: status,
          motivo: motivo || null,
        },
        ipAddress: getClientIpFromRequest(request),
      },
    });

    return NextResponse.json(JSON.parse(JSON.stringify(updated)));
  } catch (error) {
    console.error("[PATCH /organizacoes/[id]/status] Error:", error);
    return NextResponse.json(
      { error: "Failed to update organization status" },
      { status: 500 }
    );
  }
}
