import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdminApi, getClientIpFromRequest } from "@/lib/root-admin/api-auth";
import { getUserOrganizationMappings } from "@/lib/root-admin/user-organization";

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

    // Count related data — users via mapping table, not advogado (which has no direct org link)
    const [mappings, docCount] = await Promise.all([
      getUserOrganizationMappings(),
      db.documento.count({ where: { escritorioId: id } }),
    ]);
    const userCount = Object.values(mappings).filter((orgId) => orgId === id).length;

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
    const {
      nome, email, cnpj, telefone, endereco, cidade, estado, cep,
      observacoesAdmin, limiteUsuarios, limiteArmazenamento, origemCadastro,
      statusEscritorio,
    } = body;

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
    if (nome !== undefined) updateData.nome = String(nome).trim();
    if (email !== undefined) updateData.email = email ? String(email).trim() : null;
    if (cnpj !== undefined) updateData.cnpj = cnpj ? String(cnpj).trim() : null;
    if (telefone !== undefined) updateData.telefone = telefone ? String(telefone).trim() : null;
    if (endereco !== undefined) updateData.endereco = endereco ? String(endereco).trim() : null;
    if (cidade !== undefined) updateData.cidade = cidade ? String(cidade).trim() : null;
    if (estado !== undefined) updateData.estado = estado ? String(estado).trim() : null;
    if (cep !== undefined) updateData.cep = cep ? String(cep).trim() : null;
    if (observacoesAdmin !== undefined) updateData.observacoesAdmin = observacoesAdmin;
    if (limiteUsuarios !== undefined) updateData.limiteUsuarios = Number(limiteUsuarios);
    if (limiteArmazenamento !== undefined) updateData.limiteArmazenamento = Number(limiteArmazenamento);
    if (origemCadastro !== undefined) updateData.origemCadastro = origemCadastro;
    if (statusEscritorio !== undefined) updateData.statusEscritorio = statusEscritorio;

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
