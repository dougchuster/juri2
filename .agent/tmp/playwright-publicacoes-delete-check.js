const { chromium } = require("playwright");
const { Client } = require("pg");
require("dotenv").config();

const TARGET_URL = "http://127.0.0.1:3000";
const LOGIN = {
  email: "dougcruvinel@gmail.com",
  password: "123456",
};

async function login(page) {
  await page.goto(`${TARGET_URL}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", LOGIN.email);
  await page.fill("#password", LOGIN.password);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL(/\/dashboard|\/login\/mfa/, { timeout: 15000 });
}

async function search(page, term) {
  const input = page.locator('input[name="search"]');
  await input.fill(term);
  await page.waitForTimeout(900);
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function createFixture(client, uniqueId) {
  const { rows: users } = await client.query("SELECT id FROM users LIMIT 1");
  const { rows: advogados } = await client.query("SELECT id FROM advogados WHERE ativo = true LIMIT 1");
  if (!users[0] || !advogados[0]) {
    throw new Error("Sem usuário ou advogado para montar fixture de delete.");
  }

  const publicacaoId = `pub_${uniqueId}`;
  const agendamentoId = `agd_${uniqueId}`;

  await client.query(
    `INSERT INTO publicacoes
      ("id","tribunal","diario","dataPublicacao","conteudo","identificador","processoNumero","partesTexto","oabsEncontradas","importadaEm","status")
     VALUES ($1,'TJSP','DJe','2026-03-13',$2,$3,$4,$2,$5,NOW(),'PENDENTE')`,
    [
      publicacaoId,
      `Publicação temporária para teste automatizado ${uniqueId}.`,
      uniqueId,
      "0000000-00.2026.8.26.0001",
      [],
    ]
  );

  await client.query(
    `INSERT INTO agendamentos
      ("id","tipo","status","prioridade","origem","titulo","dataInicio","responsavelId","criadoPorId","publicacaoOrigemId","createdAt","updatedAt")
     VALUES ($1,'TAREFA','PENDENTE','NORMAL','MANUAL',$2,NOW(),$3,$4,$5,NOW(),NOW())`,
    [
      agendamentoId,
      `Agendamento temporário ${uniqueId}`,
      advogados[0].id,
      users[0].id,
      publicacaoId,
    ]
  );

  return { publicacaoId, agendamentoId };
}

async function main() {
  const uniqueId = `DELETE-TEST-${Date.now()}`;
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const fixture = await createFixture(client, uniqueId);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  await login(page);
  await page.goto(`${TARGET_URL}/publicacoes`, { waitUntil: "networkidle" });
  await search(page, uniqueId);

  const beforeDelete = await page.locator("div.cursor-pointer").count();
  const card = page.locator("div.cursor-pointer").first();
  await card.hover();
  await card.locator('button[title="Excluir publicação"]').click();
  await page.getByRole("button", { name: /Confirmar exclusão/i }).click();
  await page.waitForTimeout(1800);
  await page.waitForLoadState("networkidle").catch(() => {});

  const feedback = await page.locator("text=/desassociad|excluíd|excluídas|excluído/i").first().innerText().catch(() => "");

  const { rows: publicationRows } = await client.query('SELECT id FROM publicacoes WHERE id = $1', [fixture.publicacaoId]);
  const { rows: agendamentoRows } = await client.query(
    'SELECT id, "publicacaoOrigemId" FROM agendamentos WHERE id = $1',
    [fixture.agendamentoId]
  );

  console.log(JSON.stringify({
    uniqueId,
    beforeDelete,
    feedback,
    publicationDeleted: publicationRows.length === 0,
    agendamentoExists: agendamentoRows.length === 1,
    agendamentoPublicacaoOrigemId: agendamentoRows[0]?.publicacaoOrigemId ?? null,
  }, null, 2));

  await browser.close();
  await client.end();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
