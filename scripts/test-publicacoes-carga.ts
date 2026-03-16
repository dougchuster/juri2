import assert from "node:assert/strict";
import {
    avaliarBloqueioCargaPublicacoes,
    calcularQuotasEqualitarias,
    calcularScoreCargaPublicacoes,
    type CargaDistribuicaoPublicacao,
} from "../src/lib/services/publicacoes-distribution";

function run() {
    const scoreLivre = calcularScoreCargaPublicacoes({
        prazosAtrasados: 0,
        prazosPendentes: 2,
        tarefasPendentes: 1,
        audienciasPendentes: 0,
        publicacoesPendentes: 0,
    });
    const scoreCarregado = calcularScoreCargaPublicacoes({
        prazosAtrasados: 6,
        prazosPendentes: 8,
        tarefasPendentes: 7,
        audienciasPendentes: 3,
        publicacoesPendentes: 5,
    });
    assert.ok(scoreLivre < scoreCarregado, "Score deve refletir maior carga para agenda mais pesada.");

    const cargas: CargaDistribuicaoPublicacao[] = [
        {
            advogadoId: "a1",
            nomeAdvogado: "Livre 1",
            oab: "1111",
            seccional: "DF",
            prazosAtrasados: 0,
            prazosPendentes: 2,
            tarefasPendentes: 1,
            audienciasPendentes: 0,
            publicacoesPendentes: 0,
            cargaTotal: scoreLivre,
        },
        {
            advogadoId: "a2",
            nomeAdvogado: "Livre 2",
            oab: "2222",
            seccional: "DF",
            prazosAtrasados: 1,
            prazosPendentes: 3,
            tarefasPendentes: 2,
            audienciasPendentes: 1,
            publicacoesPendentes: 0,
            cargaTotal: calcularScoreCargaPublicacoes({
                prazosAtrasados: 1,
                prazosPendentes: 3,
                tarefasPendentes: 2,
                audienciasPendentes: 1,
                publicacoesPendentes: 0,
            }),
        },
        {
            advogadoId: "a3",
            nomeAdvogado: "Carregado",
            oab: "3333",
            seccional: "DF",
            prazosAtrasados: 6,
            prazosPendentes: 8,
            tarefasPendentes: 7,
            audienciasPendentes: 3,
            publicacoesPendentes: 5,
            cargaTotal: scoreCarregado,
        },
    ];

    const quotas = calcularQuotasEqualitarias(cargas, 22);
    const soma = quotas.reduce((acc, item) => acc + item.quota, 0);
    assert.equal(soma, 22, "Soma das quotas deve bater com a demanda.");

    const q1 = quotas.find((item) => item.advogadoId === "a1")?.quota || 0;
    const q2 = quotas.find((item) => item.advogadoId === "a2")?.quota || 0;
    const q3 = quotas.find((item) => item.advogadoId === "a3")?.quota || 0;

    assert.ok(q3 < q1, "Advogado com maior carga deve receber menos quota que o mais livre.");
    assert.ok(q3 < q2, "Advogado com maior carga deve receber menos quota que o intermediario.");

    const bloqueio = avaliarBloqueioCargaPublicacoes(cargas[2], {
        enabled: true,
        maxPrazosAtrasados: 4,
        maxCargaScore: 30,
        maxPublicacoesPendentes: 4,
    });
    assert.equal(bloqueio.bloqueado, true, "Carga extrema deve ser bloqueada.");
    assert.ok(bloqueio.motivos.length >= 1, "Bloqueio deve informar motivo.");

    console.log("OK: quota de publicacoes respeita balanceamento por carga.");
}

run();
