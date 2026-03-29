import assert from "node:assert/strict";

import {
    buildTimesheetReport,
    calculateDurationHours,
} from "@/lib/services/timesheet-core";

const duration = calculateDurationHours(0, 90 * 60 * 1000);
assert.equal(duration, 1.5, "cronometro deve converter 90 minutos em 1.5 hora");

const report = buildTimesheetReport([
    {
        id: "r1",
        horas: 1.5,
        userId: "u1",
        userName: "Ana",
        processoId: "p1",
        processoNumero: "0001",
        clienteNome: "Cliente A",
        tarefaId: "t1",
        tarefaTitulo: "Peticao inicial",
        data: "2026-03-27",
    },
    {
        id: "r2",
        horas: 1.25,
        userId: "u2",
        userName: "Bruno",
        processoId: null,
        processoNumero: null,
        clienteNome: null,
        tarefaId: "t2",
        tarefaTitulo: "Ajustes internos",
        data: "2026-03-27",
    },
    {
        id: "r3",
        horas: 1.25,
        userId: "u1",
        userName: "Ana",
        processoId: "p1",
        processoNumero: "0001",
        clienteNome: "Cliente A",
        tarefaId: "t3",
        tarefaTitulo: "Manifestacao",
        data: "2026-03-28",
    },
    {
        id: "r4",
        horas: 0.25,
        userId: "u3",
        userName: "Carla",
        processoId: "p2",
        processoNumero: "0002",
        clienteNome: "Cliente B",
        tarefaId: "t4",
        tarefaTitulo: "Checklist",
        data: "2026-03-28",
    },
]);

assert.equal(report.totalHoras, 4.25, "relatorio deve somar horas totais");
assert.equal(report.totalEntradas, 4, "relatorio deve contar entradas");
assert.equal(report.totalUsuarios, 3, "relatorio deve contar usuarios distintos");
assert.equal(report.totalProcessos, 2, "relatorio deve contar apenas processos vinculados");
assert.equal(report.byUser[0]?.userName, "Ana", "usuario com mais horas deve vir primeiro");
assert.equal(report.byUser[0]?.totalHoras, 2.75, "horas do usuario principal devem ser agregadas");
assert.equal(report.byProcess[0]?.processoNumero, "0001", "processo com mais horas deve vir primeiro");
assert.equal(report.byProcess[0]?.totalHoras, 2.75, "horas do processo principal devem ser agregadas");
assert.equal(report.byDay[0]?.date, "2026-03-27", "dias devem ser ordenados ascendentemente");
assert.equal(report.byDay[0]?.totalHoras, 2.75, "horas por dia devem ser agregadas");

console.log("test-timesheet-core: ok");
