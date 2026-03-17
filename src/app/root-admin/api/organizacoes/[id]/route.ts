import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdminApi, getClientIpFromRequest } from "@/lib/root-admin/api-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSuperAdminApi(request);
  if (error) return error;

  try {
    const { id } = await params;

    const org = await db.escritorio.findUnique({
      where: { id },
      include: {
        assinaturas: { include: { plano: true } },
        featureFlags: true,
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Count related data
    const [userCount, docCount] = await Promise.all([
      db.advogado.count(),
      db.documento.count({ where: { escritorioId: id } }),
    ]);

    return NextResponse.json(
      JSON.parse(JSON.stringify({
        ...org,
        _count: { users: userCount, documentos: docCount },
      }))
    );
  } catch (error) {
    console.error("[GET /organizacoes/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSuperAdminApi(request);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { observacoesAdmin, limiteUsuarios, limiteArmazenamento, origemCadastro } = body;

    // Verify org exists
    const existing = await db.escritorio.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Update allowed fields only
    const updateData: any = {};
    if (observacoesAdmin !== undefined) updateData.observacoesAdmin = observacoesAdmin;
    if (limiteUsuarios !== undefined) updateData.limiteUsuarios = limiteUsuarios;
    if (limiteArmazenamento !== undefined) updateData.limiteArmazenamento = limiteArmazenamento;
    if (origemCadastro !== undefined) updateData.origemCadastro = origemCadastro;

    const updated = await db.escritorio.update({
      where: { id },
      data: updateData,
      include: { assinaturas: { include: { plano: true } } },
    });

    // Log action
    await db.superAdminLog.create({
      data: {
        superAdminId: session!.superAdmin.id,
        acao: "EDITAR_ORGANIZACAO",
        detalhes: {
          orgId: id,
          changeSet: updateData,
        },
        ipAddress: getClientIpFromRequest(request),
      },
    });

    return NextResponse.json(JSON.parse(JSON.stringify(updated)));
  } catch (error) {
    console.error("[PATCH /organizacoes/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSuperAdminApi(request);
  if (error) return error;

  try {
    const { id } = await params;

    // Verify org exists
    const existing = await db.escritorio.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Soft delete: change status to INATIVO
    const deleted = await db.escritorio.update({
      where: { id },
      data: { statusEscritorio: "INATIVO" },
    });

    // Log action
    await db.superAdminLog.create({
      data: {
        superAdminId: session!.superAdmin.id,
        acao: "DELETAR_ORGANIZACAO",
        detalhes: {
          orgId: id,
          nome: existing.nome,
        },
        ipAddress: getClientIpFromRequest(request),
      },
    });

    return NextResponse.json(JSON.parse(JSON.stringify(deleted)));
  } catch (error) {
    console.error("[DELETE /organizacoes/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: 500 }
    );
  }
}
