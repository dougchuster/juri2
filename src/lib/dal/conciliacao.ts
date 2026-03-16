"server-only";

import { db } from "@/lib/db";

export async function getExtratos() {
    return db.extratoBancario.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            _count: { select: { itens: true } },
            itens: {
                where: { conciliado: false },
                select: { id: true },
            },
        },
        take: 50,
    });
}

export async function getExtratoById(id: string) {
    return db.extratoBancario.findUnique({
        where: { id },
        include: {
            itens: {
                orderBy: { data: "desc" },
                include: {
                    lancamentos: {
                        select: {
                            id: true,
                            descricao: true,
                            valorReal: true,
                            valorPrevisto: true,
                            dataPagamento: true,
                            status: true,
                        },
                    },
                },
            },
        },
    });
}

export async function getConciliacaoStats() {
    const [totalLancamentos, conciliados, extratos] = await Promise.all([
        db.financeiroEscritorioLancamento.count({ where: { status: "PAGO" } }),
        db.financeiroEscritorioLancamento.count({ where: { conciliado: true } }),
        db.extratoBancario.count(),
    ]);

    const pendentes = totalLancamentos - conciliados;
    const taxaConciliacao = totalLancamentos > 0
        ? Math.round((conciliados / totalLancamentos) * 100)
        : 0;

    return { totalLancamentos, conciliados, pendentes, extratos, taxaConciliacao };
}

export async function getLancamentosNaoConciliados() {
    return db.financeiroEscritorioLancamento.findMany({
        where: {
            conciliado: false,
            status: { in: ["PAGO", "RECEBIDO"] },
        },
        select: {
            id: true,
            descricao: true,
            tipoLancamento: true,
            valorReal: true,
            valorPrevisto: true,
            dataPagamento: true,
            dataCompetencia: true,
            fornecedorBeneficiario: true,
            conciliado: true,
        },
        orderBy: { dataCompetencia: "desc" },
        take: 200,
    });
}
