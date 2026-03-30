import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdminApi } from "@/lib/root-admin/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { error } = await requireSuperAdminApi(request);
  if (error) return error;

  try {
    const planos = await db.plano.findMany({
      orderBy: { precoMensal: "asc" },
      select: {
        id: true,
        nome: true,
        slug: true,
        precoMensal: true,
        precoAnual: true,
        maxUsuarios: true,
        maxArmazenamentoMB: true,
        features: true,
        ativo: true,
        createdAt: true,
      },
    });

    return NextResponse.json(JSON.parse(JSON.stringify(planos)));
  } catch (err) {
    console.error("[configuracoes/planos] Error:", err);
    return NextResponse.json({ error: "Failed to fetch planos" }, { status: 500 });
  }
}
