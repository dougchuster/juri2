/**
 * Teste de Isolamento de Dados por Escritório (Multi-Tenancy)
 *
 * Valida que:
 * 1. Registros criados para escritório A NÃO aparecem em queries do escritório B
 * 2. withTenantRLS seta o contexto correto no PostgreSQL
 * 3. Criações via Prisma respeitam o escritorioId passado
 * 4. findFirst com filtro de tenant retorna null para outro escritório
 *
 * Uso: npm run test:tenant-isolation
 */
import "dotenv/config";
import { db } from "@/lib/db";
import { withTenantRLS } from "@/lib/db-rls";

// ─── Helpers de relatório ─────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const erros: string[] = [];

function ok(descricao: string) {
    console.log(`  ✅ ${descricao}`);
    passed++;
}

function fail(descricao: string, detalhe?: unknown) {
    console.error(`  ❌ ${descricao}`);
    if (detalhe !== undefined) console.error("     →", detalhe);
    failed++;
    erros.push(descricao);
}

function secao(titulo: string) {
    console.log(`\n── ${titulo} ──`);
}

// ─── Dados temporários criados pelo teste ────────────────────────────────────

const PREFIXO = `__test_isolation_${Date.now()}`;
let escritorioAId: string;
let escritorioBId: string;
let clienteAId: string;
let clienteBId: string;
let processoAId: string;

// ─── Setup: garante 2 escritórios distintos ──────────────────────────────────

async function setup() {
    secao("Setup");

    const escrA = await db.escritorio.create({
        data: { nome: `${PREFIXO}_A`, slug: `${PREFIXO}_a` },
        select: { id: true },
    });
    escritorioAId = escrA.id;

    const escrB = await db.escritorio.create({
        data: { nome: `${PREFIXO}_B`, slug: `${PREFIXO}_b` },
        select: { id: true },
    });
    escritorioBId = escrB.id;

    console.log(`  Escritório A: ${escritorioAId}`);
    console.log(`  Escritório B: ${escritorioBId}`);
    ok("Dois escritórios de teste criados");
}

// ─── Testes ───────────────────────────────────────────────────────────────────

async function testarCriacaoComEscritorioId() {
    secao("1. Criação com escritorioId correto");

    const cA = await db.cliente.create({
        data: { nome: `${PREFIXO}_cliente_A`, escritorioId: escritorioAId },
        select: { id: true, escritorioId: true },
    });
    clienteAId = cA.id;
    if (cA.escritorioId === escritorioAId) {
        ok("Cliente A criado com escritorioId do escritório A");
    } else {
        fail("Cliente A com escritorioId errado", cA.escritorioId);
    }

    const cB = await db.cliente.create({
        data: { nome: `${PREFIXO}_cliente_B`, escritorioId: escritorioBId },
        select: { id: true, escritorioId: true },
    });
    clienteBId = cB.id;
    if (cB.escritorioId === escritorioBId) {
        ok("Cliente B criado com escritorioId do escritório B");
    } else {
        fail("Cliente B com escritorioId errado", cB.escritorioId);
    }
}

async function testarIsolamentoPorFiltro() {
    secao("2. Isolamento via filtro explícito (sem RLS)");

    // Escritório A só deve ver seus clientes
    const clientesA = await db.cliente.findMany({
        where: { escritorioId: escritorioAId, nome: { startsWith: PREFIXO } },
        select: { id: true, escritorioId: true },
    });
    const todosDoA = clientesA.every((c) => c.escritorioId === escritorioAId);
    if (todosDoA && clientesA.length === 1) {
        ok(`Escritório A retornou ${clientesA.length} cliente(s) — apenas os seus`);
    } else {
        fail(`Escritório A retornou dados incorretos (${clientesA.length} registros)`, clientesA);
    }

    // Escritório B não deve ver o cliente A
    const clienteANoEscritorioB = await db.cliente.findFirst({
        where: { id: clienteAId, escritorioId: escritorioBId },
    });
    if (clienteANoEscritorioB === null) {
        ok("findFirst com escritorioId errado retornou null (vazamento bloqueado)");
    } else {
        fail("VAZAMENTO: escritório B conseguiu ler o cliente do escritório A");
    }
}

async function testarWithTenantRLS() {
    secao("3. withTenantRLS — contexto via SET LOCAL");

    // Cria processo no escritório A via transação com RLS
    const proc = await withTenantRLS(escritorioAId, async (tx) => {
        // Verifica que o GUC está setado dentro da transação
        const result = await tx.$queryRaw<[{ val: string }]>`
            SELECT current_setting('app.escritorio_id', true) AS val
        `;
        const gucValor = result[0]?.val;
        if (gucValor === escritorioAId) {
            ok(`GUC app.escritorio_id setado corretamente: ${gucValor}`);
        } else {
            fail(`GUC não foi setado corretamente. Esperado: ${escritorioAId}, Recebido: ${gucValor}`);
        }

        return tx.processo.create({
            data: {
                numero: `${PREFIXO}_001`,
                clienteId: clienteAId,
                escritorioId: escritorioAId,
            },
            select: { id: true, escritorioId: true },
        });
    });

    processoAId = proc.id;

    if (proc.escritorioId === escritorioAId) {
        ok("Processo criado via withTenantRLS com escritorioId correto");
    } else {
        fail("Processo criado com escritorioId errado", proc.escritorioId);
    }

    // Tenta acessar o processo do escritório A como se fosse do B
    const processoVazado = await db.processo.findFirst({
        where: { id: processoAId, escritorioId: escritorioBId },
    });
    if (processoVazado === null) {
        ok("Processo do escritório A invisível para escritório B");
    } else {
        fail("VAZAMENTO: processo do escritório A visível para escritório B");
    }
}

async function testarFindManyComFiltro() {
    secao("4. findMany com filtro — sem cross-tenant");

    // Garante que os dados do teste não aparecem para o escritório B
    const processosBVendoA = await db.processo.findMany({
        where: {
            escritorioId: escritorioBId,
            numero: { startsWith: PREFIXO },
        },
    });
    if (processosBVendoA.length === 0) {
        ok("Escritório B não vê processos do escritório A");
    } else {
        fail(`VAZAMENTO: escritório B vê ${processosBVendoA.length} processo(s) do escritório A`);
    }

    // Conta total por tenant — deve ser separado
    const countA = await db.processo.count({
        where: { escritorioId: escritorioAId, numero: { startsWith: PREFIXO } },
    });
    const countB = await db.processo.count({
        where: { escritorioId: escritorioBId, numero: { startsWith: PREFIXO } },
    });
    if (countA === 1 && countB === 0) {
        ok(`Count isolado: A=${countA}, B=${countB} ✓`);
    } else {
        fail(`Count incorreto: A=${countA} (esperado 1), B=${countB} (esperado 0)`);
    }
}

// ─── Teardown: remove dados criados pelo teste ────────────────────────────────

async function teardown() {
    secao("Teardown");
    try {
        if (processoAId) await db.processo.delete({ where: { id: processoAId } });
        if (clienteAId) await db.cliente.delete({ where: { id: clienteAId } });
        if (clienteBId) await db.cliente.delete({ where: { id: clienteBId } });
        if (escritorioAId) await db.escritorio.delete({ where: { id: escritorioAId } });
        if (escritorioBId) await db.escritorio.delete({ where: { id: escritorioBId } });
        ok("Dados de teste removidos");
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`  ⚠️  Teardown parcial: ${msg}`);
    }
}

// ─── Runner principal ─────────────────────────────────────────────────────────

async function main() {
    console.log("=".repeat(60));
    console.log("   TESTE DE ISOLAMENTO MULTI-TENANT — Escritório");
    console.log("=".repeat(60));

    try {
        await setup();
        await testarCriacaoComEscritorioId();
        await testarIsolamentoPorFiltro();
        await testarWithTenantRLS();
        await testarFindManyComFiltro();
    } catch (err) {
        console.error("\n💥 Erro inesperado durante os testes:", err);
        failed++;
    } finally {
        await teardown();
        await db.$disconnect();
    }

    console.log("\n" + "=".repeat(60));
    console.log(`  Resultado: ${passed} passou(aram), ${failed} falhou(aram)`);
    if (erros.length > 0) {
        console.error("  Falhas:");
        erros.forEach((e) => console.error(`    • ${e}`));
    }
    console.log("=".repeat(60));

    process.exit(failed > 0 ? 1 : 0);
}

main();
