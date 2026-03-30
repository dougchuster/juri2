import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdminApi } from "@/lib/root-admin/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { error } = await requireSuperAdminApi(request);
  if (error) return error;

  try {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      allAssinaturas,
      expirando7,
      expirando30,
    ] = await Promise.all([
      db.assinatura.findMany({
        include: {
          plano: { select: { nome: true, precoMensal: true } },
          escritorio: { select: { id: true, nome: true, statusEscritorio: true } },
        },
        orderBy: { dataRenovacao: "asc" },
      }),
      db.assinatura.count({
        where: {
          status: { in: ["ATIVO", "TRIAL"] },
          dataRenovacao: { lte: in7Days, gte: now },
        },
      }),
      db.assinatura.count({
        where: {
          status: { in: ["ATIVO", "TRIAL"] },
          dataRenovacao: { lte: in30Days, gte: now },
        },
      }),
    ]);

    const statusCounts = allAssinaturas.reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});

    // Estimated monthly revenue from active (non-trial) subscriptions
    const receitaMensal = allAssinaturas
      .filter((a) => a.status === "ATIVO")
      .reduce((sum, a) => sum + Number(a.plano?.precoMensal || 0), 0);

    return NextResponse.json({
      receitaMensal,
      statusCounts,
      expirando7,
      expirando30,
      assinaturas: allAssinaturas.map((a) => ({
        id: a.id,
        status: a.status,
        planoNome: a.plano?.nome || "—",
        precoMensal: Number(a.plano?.precoMensal || 0),
        escritorioId: a.escritorioId,
        escritorioNome: a.escritorio?.nome || "—",
        statusEscritorio: a.escritorio?.statusEscritorio || "—",
        dataInicio: a.dataInicio,
        dataRenovacao: a.dataRenovacao,
      })),
    });
  } catch (err) {
    console.error("[financeiro/overview] Error:", err);
    return NextResponse.json({ error: "Failed to fetch financial overview" }, { status: 500 });
  }
}
