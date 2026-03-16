import "dotenv/config";
import assert from "node:assert/strict";
import Module from "node:module";

const serverOnlyPath = require.resolve("server-only");
const fakeServerOnly = new Module(serverOnlyPath);
fakeServerOnly.filename = serverOnlyPath;
fakeServerOnly.loaded = true;
fakeServerOnly.exports = {};
require.cache[serverOnlyPath] = fakeServerOnly;

async function run() {
    console.log("[test-autorizacao-rn25] Iniciando testes RN-25...");

    const { db } = await import("@/lib/db");
    const { getPrazos, getPrazoStats } = await import("@/lib/dal/agenda");
    const { getTarefas, getTarefasKanban, getTarefaById, getTarefaStats } = await import("@/lib/dal/tarefas");

    const advogados = await db.advogado.findMany({
        select: { id: true },
        orderBy: { id: "asc" },
    });

    assert.ok(advogados.length >= 1, "Nenhum advogado encontrado para testar RN-25.");

    const advogadoA = advogados[0].id;
    const advogadoB = advogados.find((a) => a.id !== advogadoA)?.id ?? null;

    const scopeAdvA = { role: "ADVOGADO" as const, advogadoId: advogadoA };
    const scopeAdmin = { role: "ADMIN" as const, advogadoId: null };
    const scopeSocio = { role: "SOCIO" as const, advogadoId: null };

    const [prazosAdv, prazosAdmin, prazosSocio] = await Promise.all([
        getPrazos({ pageSize: 200 }, scopeAdvA),
        getPrazos({ pageSize: 200 }, scopeAdmin),
        getPrazos({ pageSize: 200 }, scopeSocio),
    ]);

    assert.ok(
        prazosAdv.prazos.every((p) => p.advogadoId === advogadoA),
        "ADVOGADO visualizou prazo de outro advogado."
    );

    assert.ok(
        prazosAdmin.total >= prazosAdv.total,
        "ADMIN deveria ver pelo menos o mesmo volume de prazos do ADVOGADO."
    );
    assert.ok(
        prazosSocio.total >= prazosAdv.total,
        "SOCIO deveria ver pelo menos o mesmo volume de prazos do ADVOGADO."
    );

    const forcedOtherAdvogadoFilter = await getPrazos({ advogadoId: advogadoB || "__none__", pageSize: 200 }, scopeAdvA);
    assert.ok(
        forcedOtherAdvogadoFilter.prazos.every((p) => p.advogadoId === advogadoA),
        "Filtro manual de advogado nao pode escapar do escopo RN-25 para ADVOGADO."
    );

    const [tarefasAdv, tarefasAdmin, tarefasSocio] = await Promise.all([
        getTarefas({ pageSize: 300 }, scopeAdvA),
        getTarefas({ pageSize: 300 }, scopeAdmin),
        getTarefas({ pageSize: 300 }, scopeSocio),
    ]);

    assert.ok(
        tarefasAdv.tarefas.every((t) => t.advogadoId === advogadoA),
        "ADVOGADO visualizou tarefa de outro advogado."
    );

    assert.ok(
        tarefasAdmin.total >= tarefasAdv.total,
        "ADMIN deveria ver pelo menos o mesmo volume de tarefas do ADVOGADO."
    );
    assert.ok(
        tarefasSocio.total >= tarefasAdv.total,
        "SOCIO deveria ver pelo menos o mesmo volume de tarefas do ADVOGADO."
    );

    const kanbanAdv = await getTarefasKanban(undefined, scopeAdvA);
    const tarefasKanbanAdv = [
        ...kanbanAdv.A_FAZER,
        ...kanbanAdv.EM_ANDAMENTO,
        ...kanbanAdv.REVISAO,
        ...kanbanAdv.CONCLUIDA,
    ];
    assert.ok(
        tarefasKanbanAdv.every((t) => t.advogadoId === advogadoA),
        "Kanban do ADVOGADO trouxe tarefa fora do escopo."
    );

    const [statsPrazoAdv, statsPrazoAdmin, statsTarefaAdv, statsTarefaAdmin] = await Promise.all([
        getPrazoStats(scopeAdvA),
        getPrazoStats(scopeAdmin),
        getTarefaStats(undefined, scopeAdvA),
        getTarefaStats(undefined, scopeAdmin),
    ]);

    assert.ok(statsPrazoAdmin.total >= statsPrazoAdv.total, "Stats de prazo RN-25 inconsistentes.");
    assert.ok(statsTarefaAdmin.total >= statsTarefaAdv.total, "Stats de tarefa RN-25 inconsistentes.");

    if (advogadoB) {
        const tarefaOutroAdv = await db.tarefa.findFirst({
            where: { advogadoId: advogadoB },
            select: { id: true },
            orderBy: { createdAt: "desc" },
        });

        if (tarefaOutroAdv) {
            const [asAdvogado, asAdmin, asSocio] = await Promise.all([
                getTarefaById(tarefaOutroAdv.id, scopeAdvA),
                getTarefaById(tarefaOutroAdv.id, scopeAdmin),
                getTarefaById(tarefaOutroAdv.id, scopeSocio),
            ]);

            assert.equal(asAdvogado, null, "ADVOGADO acessou detalhe de tarefa de outro advogado.");
            assert.ok(asAdmin, "ADMIN deveria acessar tarefa de qualquer advogado.");
            assert.ok(asSocio, "SOCIO deveria acessar tarefa de qualquer advogado.");
        } else {
            console.warn("[test-autorizacao-rn25] Sem tarefa de segundo advogado para teste de detalhe cruzado.");
        }
    } else {
        console.warn("[test-autorizacao-rn25] Apenas um advogado encontrado; teste cruzado ADVOGADO x ADVOGADO foi pulado.");
    }

    console.log("[test-autorizacao-rn25] OK");

    await db.$disconnect();
}

run().catch((error) => {
    console.error("[test-autorizacao-rn25] ERROR", error);
    process.exitCode = 1;
});
