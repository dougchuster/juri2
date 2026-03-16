import assert from "node:assert/strict";

import { buildDemoFuncionarios } from "./lib/demo-funcionarios";

function run() {
  const funcionarios = buildDemoFuncionarios();

  assert.equal(funcionarios.length, 4, "Deve haver exatamente 4 funcionarios demo.");

  const savia = funcionarios.find((item) => item.email === "savia.coimbra.demo@escritorio.local");
  assert.ok(savia, "Savia Coimbra deve existir.");
  assert.equal(savia?.role, "ADMIN");
  assert.equal(savia?.perfilProfissional, "ADVOGADO");
  assert.equal(savia?.criarAdvogado, true);
  assert.equal(savia?.especialidades, "Direito Civil");

  const paula = funcionarios.find((item) => item.email === "paula.matos.demo@escritorio.local");
  assert.ok(paula, "Paula Matos deve existir.");
  assert.equal(paula?.role, "ADMIN");
  assert.equal(paula?.perfilProfissional, "ADVOGADO");
  assert.equal(paula?.criarAdvogado, true);
  assert.equal(paula?.especialidades, "Direito Previdenciario");

  const amanda = funcionarios.find((item) => item.email === "amanda.silva.demo@escritorio.local");
  assert.ok(amanda, "Amanda Silva deve existir.");
  assert.equal(amanda?.role, "ADVOGADO");
  assert.equal(amanda?.perfilProfissional, "ADVOGADO");
  assert.equal(amanda?.criarAdvogado, true);

  const ismael = funcionarios.find((item) => item.email === "ismael.estagio.demo@escritorio.local");
  assert.ok(ismael, "Ismael deve existir.");
  assert.equal(ismael?.role, "ASSISTENTE");
  assert.equal(ismael?.perfilProfissional, "ESTAGIARIO_JURIDICO");
  assert.equal(ismael?.criarAdvogado, false);
  assert.equal(ismael?.cargo, "Estagiario Juridico");
}

run();
console.log("OK: contrato dos funcionarios demo validado.");
