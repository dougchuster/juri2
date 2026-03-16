import "server-only";
import { db } from "@/lib/db";

export interface LeaderboardEntry {
    advogadoId: string;
    nome: string;
    avatarUrl: string | null;
    oab: string;
    taskscore: number;
    total: number;
    concluidas: number;
    emAndamento: number;
    aFazer: number;
    noPrazo: number;
    foraPrazo: number;
    taxaEntrega: number; // % concluidas / total
    badges: string[];
}

export async function getLeaderboard(mes?: number, ano?: number): Promise<LeaderboardEntry[]> {
    const now = new Date();
    const targetMes = mes ?? now.getMonth() + 1;
    const targetAno = ano ?? now.getFullYear();

    const inicioMes = new Date(targetAno, targetMes - 1, 1);
    const fimMes = new Date(targetAno, targetMes, 0, 23, 59, 59);

    const advogados = await db.advogado.findMany({
        include: { user: { select: { name: true, avatarUrl: true } } },
        orderBy: { user: { name: "asc" } },
    });

    const entries: LeaderboardEntry[] = await Promise.all(
        advogados.map(async (adv) => {
            const whereBase = { advogadoId: adv.id, createdAt: { gte: inicioMes, lte: fimMes } };

            const [total, concluidas, emAndamento, aFazer, noPrazo, foraPrazo, pontos] = await Promise.all([
                db.tarefa.count({ where: whereBase }),
                db.tarefa.count({ where: { ...whereBase, status: "CONCLUIDA" } }),
                db.tarefa.count({ where: { ...whereBase, status: "EM_ANDAMENTO" } }),
                db.tarefa.count({ where: { ...whereBase, status: "A_FAZER" } }),
                db.tarefa.count({ where: { ...whereBase, status: "CONCLUIDA", categoriaEntrega: { in: ["D_0", "D_MENOS_1"] } } }),
                db.tarefa.count({ where: { ...whereBase, status: "CONCLUIDA", categoriaEntrega: "FORA_PRAZO" } }),
                db.tarefa.aggregate({
                    where: { ...whereBase, status: "CONCLUIDA" },
                    _sum: { pontos: true },
                }),
            ]);

            const taskscore = pontos._sum.pontos ?? 0;
            const taxaEntrega = total > 0 ? Math.round((concluidas / total) * 100) : 0;

            const badges: string[] = [];
            if (taskscore > 0) {
                if (foraPrazo === 0 && concluidas > 0) badges.push("ZERO_ATRASOS");
                if (concluidas >= 10) badges.push("MARATONISTA");
                if (taskscore >= 500) badges.push("DESTAQUE");
            }

            return {
                advogadoId: adv.id,
                nome: adv.user.name,
                avatarUrl: adv.user.avatarUrl,
                oab: adv.oab,
                taskscore,
                total,
                concluidas,
                emAndamento,
                aFazer,
                noPrazo,
                foraPrazo,
                taxaEntrega,
                badges,
            };
        })
    );

    return entries.sort((a, b) => b.taskscore - a.taskscore);
}

export async function getProdutividadeStats() {
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalTarefasMes, concluidasMes, foraPrazoMes, pontosMes] = await Promise.all([
        db.tarefa.count({ where: { createdAt: { gte: inicioMes } } }),
        db.tarefa.count({ where: { status: "CONCLUIDA", concluidaEm: { gte: inicioMes } } }),
        db.tarefa.count({ where: { status: "CONCLUIDA", categoriaEntrega: "FORA_PRAZO", concluidaEm: { gte: inicioMes } } }),
        db.tarefa.aggregate({ where: { status: "CONCLUIDA", concluidaEm: { gte: inicioMes } }, _sum: { pontos: true } }),
    ]);

    return {
        totalTarefasMes,
        concluidasMes,
        foraPrazoMes,
        taxaGeral: totalTarefasMes > 0 ? Math.round((concluidasMes / totalTarefasMes) * 100) : 0,
        taskscoreTotal: pontosMes._sum.pontos ?? 0,
    };
}
