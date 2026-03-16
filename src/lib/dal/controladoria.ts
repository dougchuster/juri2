import "server-only";
import { db } from "@/lib/db";

// =============================================================
// PROCESSOS ESTAGNADOS (sem movimentação há +120 dias)
// =============================================================

export async function getProcessosEstagnados(diasLimite = 120) {
    const limite = new Date();
    limite.setDate(limite.getDate() - diasLimite);

    // Processos ativos que não tiveram movimentação recente
    const processos = await db.processo.findMany({
        where: {
            status: { notIn: ["ENCERRADO", "ARQUIVADO"] },
            OR: [
                { movimentacoes: { none: {} } },
                { movimentacoes: { every: { data: { lt: limite } } } },
            ],
        },
        include: {
            cliente: { select: { nome: true } },
            advogado: { include: { user: { select: { name: true } } } },
            faseProcessual: { select: { nome: true } },
            _count: { select: { movimentacoes: true } },
        },
        orderBy: { updatedAt: "asc" },
        take: 50,
    });

    return processos;
}

// =============================================================
// ESTOQUE PROCESSUAL
// =============================================================

export async function getEstoqueProcessual() {
    const statusCounts = await db.processo.groupBy({
        by: ["status"],
        _count: true,
    });

    const tipoCounts = await db.processo.groupBy({
        by: ["tipo"],
        _count: true,
    });

    const total = await db.processo.count();
    const ativos = await db.processo.count({ where: { status: { notIn: ["ENCERRADO", "ARQUIVADO"] } } });
    const encerrados = await db.processo.count({ where: { status: "ENCERRADO" } });
    const arquivados = await db.processo.count({ where: { status: "ARQUIVADO" } });

    return {
        total,
        ativos,
        encerrados,
        arquivados,
        porStatus: statusCounts.map(s => ({ status: s.status, count: s._count })),
        porTipo: tipoCounts.map(t => ({ tipo: t.tipo, count: t._count })),
    };
}

// =============================================================
// SAFRAS DE PROCESSO (por ano de entrada)
// =============================================================

export async function getSafrasProcesso() {
    const processos = await db.processo.findMany({
        select: { dataDistribuicao: true, status: true, resultado: true },
    });

    const safras = new Map<number, { total: number; ativos: number; encerrados: number; ganhos: number; perdidos: number; acordos: number }>();

    for (const p of processos) {
        const ano = p.dataDistribuicao ? new Date(p.dataDistribuicao).getFullYear() : new Date().getFullYear();
        if (!safras.has(ano)) {
            safras.set(ano, { total: 0, ativos: 0, encerrados: 0, ganhos: 0, perdidos: 0, acordos: 0 });
        }
        const s = safras.get(ano)!;
        s.total++;
        if (["ENCERRADO", "ARQUIVADO"].includes(p.status)) {
            s.encerrados++;
            if (p.resultado === "GANHO") s.ganhos++;
            else if (p.resultado === "PERDIDO") s.perdidos++;
            else if (p.resultado === "ACORDO") s.acordos++;
        } else {
            s.ativos++;
        }
    }

    return Array.from(safras.entries())
        .map(([ano, data]) => ({ ano, ...data }))
        .sort((a, b) => b.ano - a.ano);
}

// =============================================================
// PROCESSOS GANHOS / PERDIDOS
// =============================================================

export async function getResultadosProcesso() {
    const resultados = await db.processo.groupBy({
        by: ["resultado"],
        where: { status: { in: ["ENCERRADO", "ARQUIVADO"] } },
        _count: true,
    });

    const total = resultados.reduce((sum, r) => sum + r._count, 0);
    const ganhos = resultados.find(r => r.resultado === "GANHO")?._count || 0;
    const perdidos = resultados.find(r => r.resultado === "PERDIDO")?._count || 0;
    const acordos = resultados.find(r => r.resultado === "ACORDO")?._count || 0;
    const desistencias = resultados.find(r => r.resultado === "DESISTENCIA")?._count || 0;
    const pendentes = resultados.find(r => r.resultado === "PENDENTE")?._count || 0;

    const taxaExito = total > 0 ? Math.round(((ganhos + acordos) / total) * 100) : 0;

    return { total, ganhos, perdidos, acordos, desistencias, pendentes, taxaExito };
}

// =============================================================
// CONTINGENCIAMENTO
// =============================================================

export async function getContingenciamento() {
    const result = await db.processo.aggregate({
        where: {
            status: { notIn: ["ENCERRADO", "ARQUIVADO"] },
            valorContingencia: { not: null },
        },
        _sum: { valorContingencia: true },
        _count: true,
    });

    const porRisco = await db.processo.groupBy({
        by: ["riscoContingencia"],
        where: {
            status: { notIn: ["ENCERRADO", "ARQUIVADO"] },
            riscoContingencia: { not: null },
        },
        _sum: { valorContingencia: true },
        _count: true,
    });

    return {
        totalValor: result._sum.valorContingencia?.toNumber() || 0,
        totalProcessos: result._count,
        porRisco: porRisco.map(r => ({
            risco: r.riscoContingencia || "N/A",
            valor: r._sum.valorContingencia?.toNumber() || 0,
            count: r._count,
        })),
    };
}

// =============================================================
// TEMPO MÉDIO DE DURAÇÃO
// =============================================================

export async function getTempoMedioProcesso() {
    const encerrados = await db.processo.findMany({
        where: {
            status: { in: ["ENCERRADO", "ARQUIVADO"] },
            dataDistribuicao: { not: null },
            dataEncerramento: { not: null },
        },
        select: { dataDistribuicao: true, dataEncerramento: true, tipo: true },
    });

    if (encerrados.length === 0) return { mediaDias: 0, mediaMeses: 0, porTipo: [] };

    let totalDias = 0;
    const porTipo = new Map<string, { total: number; count: number }>();

    for (const p of encerrados) {
        const inicio = new Date(p.dataDistribuicao!).getTime();
        const fim = new Date(p.dataEncerramento!).getTime();
        const dias = Math.round((fim - inicio) / (1000 * 60 * 60 * 24));
        totalDias += dias;

        if (!porTipo.has(p.tipo)) porTipo.set(p.tipo, { total: 0, count: 0 });
        const t = porTipo.get(p.tipo)!;
        t.total += dias;
        t.count++;
    }

    const mediaDias = Math.round(totalDias / encerrados.length);
    const mediaMeses = Math.round(mediaDias / 30);

    return {
        mediaDias,
        mediaMeses,
        porTipo: Array.from(porTipo.entries()).map(([tipo, data]) => ({
            tipo,
            mediaDias: Math.round(data.total / data.count),
        })),
    };
}

// =============================================================
// STATS CONSOLIDADOS
// =============================================================

export async function getControladoriaStats() {
    const [estoque, resultados, contingencia, tempoMedio] = await Promise.all([
        getEstoqueProcessual(),
        getResultadosProcesso(),
        getContingenciamento(),
        getTempoMedioProcesso(),
    ]);

    const estagnados = await db.processo.count({
        where: {
            status: { notIn: ["ENCERRADO", "ARQUIVADO"] },
            updatedAt: { lt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) },
        },
    });

    return { estoque, resultados, contingencia, tempoMedio, estagnados };
}
