import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import { unauthorized } from "@/lib/api/errors";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const [totalTribunais, tribunaisAtivos, sourcesDataJud] = await Promise.all([
    db.tribunal.count(),
    db.tribunal.count({ where: { ativo: true } }),
    db.tribunalSource.findMany({
      where: { sourceType: "DATAJUD" },
      select: {
        enabled: true,
        alias: true,
        requiresCert: true,
        tribunal: {
          select: {
            sigla: true,
            nome: true,
            ramo: true,
            uf: true,
            ativo: true,
          },
        },
      },
      orderBy: { tribunal: { sigla: "asc" } },
    }),
  ]);

  const habilitados = sourcesDataJud.filter((s) => s.enabled && s.alias);
  const semAlias = sourcesDataJud.filter((s) => !s.alias);
  const desabilitados = sourcesDataJud.filter((s) => !s.enabled);

  const porRamo = habilitados.reduce<Record<string, number>>((acc, s) => {
    const ramo = s.tribunal.ramo;
    acc[ramo] = (acc[ramo] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    cobertura: {
      totalCadastrados: totalTribunais,
      ativos: tribunaisAtivos,
      habilitadosDataJud: habilitados.length,
      semAliasDataJud: semAlias.length,
      desabilitados: desabilitados.length,
      percentualCoberto: totalTribunais > 0 ? Math.round((habilitados.length / totalTribunais) * 100) : 0,
    },
    porRamo,
    tribunais: {
      habilitados: habilitados.map((s) => ({
        sigla: s.tribunal.sigla,
        nome: s.tribunal.nome,
        ramo: s.tribunal.ramo,
        uf: s.tribunal.uf,
        alias: s.alias,
      })),
      pendentes: semAlias.map((s) => ({
        sigla: s.tribunal.sigla,
        nome: s.tribunal.nome,
        ramo: s.tribunal.ramo,
        uf: s.tribunal.uf,
      })),
    },
  });
}
