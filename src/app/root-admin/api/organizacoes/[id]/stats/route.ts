import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdminApi } from "@/lib/root-admin/api-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSuperAdminApi(request);
  if (error) return error;

  try {
    const { id } = await params;

    // Verify org exists
    const org = await db.escritorio.findUnique({ where: { id } });
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get stats in parallel
    const [totalDocumentos, totalUsuarios] = await Promise.all([
      db.documento.count({ where: { escritorioId: id } }),
      db.user.count({ where: { escritorioId: id } }),
    ]);

    return NextResponse.json({
      processos: {
        total: 0,
        abertos: 0,
      },
      clientes: 0,
      documentos: totalDocumentos,
      usuarios: totalUsuarios,
      armazenamento: {
        usado: org.armazenamentoUsado || 0,
        limite: org.limiteArmazenamento,
        percentual: org.limiteArmazenamento > 0
          ? Math.round(((org.armazenamentoUsado || 0) / org.limiteArmazenamento) * 100)
          : 0,
      },
      ultimaAtividade: org.ultimaAtividade,
    });
  } catch (error) {
    console.error("[GET /organizacoes/[id]/stats] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization stats" },
      { status: 500 }
    );
  }
}
