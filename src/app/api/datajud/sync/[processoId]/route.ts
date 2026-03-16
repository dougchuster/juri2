import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import { DataJudConnector } from "@/lib/services/datajud";
import { unauthorized, notFound, internalError } from "@/lib/api/errors";

function normalizeCnj(value?: string | null): string {
  return (value || "").replace(/\D/g, "");
}

function normalizeDateOnly(dateLike: string | Date): Date {
  const d = new Date(dateLike);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ processoId: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { processoId } = await params;

  const processo = await db.processo.findUnique({
    where: { id: processoId },
    select: {
      id: true,
      numeroCnj: true,
      tribunal: true,
    },
  });

  if (!processo) return notFound("Processo não encontrado.");
  if (!processo.numeroCnj) {
    return NextResponse.json(
      { error: "Processo não possui número CNJ vinculado.", code: "NO_CNJ" },
      { status: 422 }
    );
  }

  // Busca todos os sources DataJud ativos para tentar o match correto
  const sources = await db.tribunalSource.findMany({
    where: {
      sourceType: "DATAJUD",
      enabled: true,
      alias: { not: null },
    },
    select: {
      id: true,
      alias: true,
      baseUrl: true,
      tribunal: { select: { sigla: true, nome: true } },
    },
    orderBy: [
      // Preferência: tribunal cujo nome/sigla bate com o campo tribunal do processo
      { tribunal: { sigla: "asc" } },
    ],
  });

  if (sources.length === 0) {
    return NextResponse.json(
      { error: "Nenhum tribunal DataJud configurado e habilitado.", code: "NO_SOURCE" },
      { status: 503 }
    );
  }

  // Tenta encontrar o source certo para o tribunal do processo
  let targetSource = sources[0];
  if (processo.tribunal) {
    const tribunalNorm = processo.tribunal.toUpperCase().trim();
    const match = sources.find(
      (s) =>
        s.tribunal.sigla.toUpperCase() === tribunalNorm ||
        s.tribunal.nome.toUpperCase().includes(tribunalNorm) ||
        tribunalNorm.includes(s.tribunal.sigla.toUpperCase())
    );
    if (match) targetSource = match;
  }

  try {
    const resultado = await DataJudConnector.buscarPorNumero(
      targetSource.alias!,
      processo.numeroCnj,
      targetSource.baseUrl
    );

    if (!resultado || resultado.movimentos.length === 0) {
      return NextResponse.json({
        ok: true,
        movimentosCriados: 0,
        message: "Nenhuma movimentação encontrada no DataJud para este processo.",
      });
    }

    const movimentosOrdenados = [...resultado.movimentos]
      .map((mov) => ({
        ...mov,
        data: new Date(mov.dataHora || Date.now()),
      }))
      .sort((a, b) => a.data.getTime() - b.data.getTime());

    let movimentosCriados = 0;
    let movimentosDuplicados = 0;

    // Atualiza a data da última movimentação no processo
    const maisRecente = movimentosOrdenados[movimentosOrdenados.length - 1];
    await db.processo.update({
      where: { id: processoId },
      data: { dataUltimaMovimentacao: maisRecente.data },
    });

    // Salva TODOS os movimentos (não apenas os 3 últimos como no job batch)
    for (const mov of movimentosOrdenados) {
      const dataMov = normalizeDateOnly(mov.data);
      const descricao = (mov.nome || `Movimento ${mov.codigo || ""}`).trim();

      const exists = await db.movimentacao.findFirst({
        where: {
          processoId,
          data: dataMov,
          descricao,
          fonte: "DATAJUD",
        },
        select: { id: true },
      });

      if (exists) {
        movimentosDuplicados += 1;
        continue;
      }

      await db.movimentacao.create({
        data: {
          processoId,
          data: dataMov,
          descricao,
          tipo: mov.codigo || null,
          fonte: "DATAJUD",
        },
      });
      movimentosCriados += 1;
    }

    return NextResponse.json({
      ok: true,
      movimentosCriados,
      movimentosDuplicados,
      totalEncontrados: resultado.movimentos.length,
      tribunal: targetSource.tribunal.sigla,
      message:
        movimentosCriados > 0
          ? `${movimentosCriados} movimentação(ões) importada(s) do DataJud.`
          : "Movimentações já estão atualizadas.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha na consulta ao DataJud.";
    return internalError(message);
  }
}
