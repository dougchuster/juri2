import assert from "node:assert/strict";
import {
    calcularAtualizacaoMonetariaBase,
    calcularPrazoProcessualBase,
    calcularVerbasRescisoriasBase,
    isBusinessDay,
    listBusinessDaysInRange,
    normalizeCalculoResultado,
    type CalculoResultado,
} from "@/lib/services/calculos";

function run() {
    const monetario = calcularAtualizacaoMonetariaBase({
        valorPrincipal: 1000,
        indice: "IPCA",
        taxaJuros: 1,
        taxaMulta: 2,
        taxaHonorarios: 10,
        meses: 12,
    });

    assert.equal(monetario.engine, "MONETARIO");
    assert.equal(Number(monetario.summary.total), 1254);
    assert.ok(monetario.memoriaCalculo.length >= 5);

    const trabalhista = calcularVerbasRescisoriasBase({
        salario: 3000,
        mesesTrabalhados: 12,
        horasExtras: 10,
        comJustaCausa: false,
    });

    assert.equal(trabalhista.engine, "TRABALHISTA");
    assert.ok(Number(trabalhista.summary.total) > 0);

    const legado = normalizeCalculoResultado("MONETARIO", { total: 500 }) as CalculoResultado<{ total: number }>;
    assert.equal(legado.engine, "MONETARIO");
    assert.equal(legado.summary.total, 500);
    assert.equal(legado.metadados.legacy, true);

    assert.equal(isBusinessDay(new Date("2026-04-21"), { state: "SP" }), false);
    assert.equal(isBusinessDay(new Date("2026-04-22"), { state: "SP" }), true);

    const diasUteis = listBusinessDaysInRange("2026-04-20", "2026-04-24", { state: "SP" });
    assert.deepEqual(diasUteis, ["2026-04-20", "2026-04-22", "2026-04-23", "2026-04-24"]);

    const prazoUteis = calcularPrazoProcessualBase({
        dataReferencia: "2026-04-13",
        prazoDias: 5,
        tipoContagem: "DIAS_UTEIS",
        unidadeFederativa: "SP",
        dataAtual: "2026-04-15",
    });
    assert.equal(prazoUteis.engine, "PRAZO_PROCESSUAL");
    assert.equal(prazoUteis.summary.dataInicioContagem, "2026-04-14");
    assert.equal(prazoUteis.summary.dataFinal, "2026-04-20");
    assert.equal(prazoUteis.summary.diasRestantes, 3);

    const prazoCorridos = calcularPrazoProcessualBase({
        dataReferencia: "2026-04-20",
        prazoDias: 3,
        tipoContagem: "DIAS_CORRIDOS",
        dataAtual: "2026-04-21",
    });
    assert.equal(prazoCorridos.summary.dataFinal, "2026-04-23");
    assert.equal(prazoCorridos.summary.diasRestantes, 2);

    const prazoComRecesso = calcularPrazoProcessualBase({
        dataReferencia: "2026-12-18",
        prazoDias: 5,
        tipoContagem: "DIAS_UTEIS",
        dataAtual: "2027-01-22",
    });
    assert.equal(prazoComRecesso.summary.dataInicioContagem, "2027-01-21");
    assert.equal(prazoComRecesso.summary.dataFinal, "2027-01-27");

    console.log("test-calculos-foundation: ok");
}

run();
