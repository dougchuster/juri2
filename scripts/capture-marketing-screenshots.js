const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const baseURL = process.env.MARKETING_BASE_URL || "http://127.0.0.1:3000";
const email = process.env.MARKETING_LOGIN_EMAIL || "dougcruvinel@gmail.com";
const password = process.env.MARKETING_LOGIN_PASSWORD || "123456";
const outputDir = path.join(process.cwd(), "public", "images", "marketing");

const routes = [
  {
    key: "dashboard",
    path: "/dashboard",
    waitFor: { role: "heading", name: /dashboard|ola, douglas|hello douglas|command center/i },
  },
  {
    key: "crm-pipeline",
    path: "/crm/pipeline",
    waitFor: { role: "heading", name: /funil comercial juridico/i },
  },
  {
    key: "clientes",
    path: "/clientes",
    waitFor: { role: "heading", name: /clientes/i },
  },
  {
    key: "processos",
    path: "/processos",
    waitFor: { role: "heading", name: /processos/i },
  },
  {
    key: "publicacoes",
    path: "/publicacoes",
    waitFor: { role: "heading", name: /publica/i },
  },
  {
    key: "comunicacao",
    path: "/comunicacao",
    waitFor: { role: "heading", name: /comunica/i },
  },
];

async function waitForRouteSignal(page, routeConfig) {
  await page.locator("body").waitFor({ state: "visible", timeout: 20000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  if (!routeConfig.waitFor) return;

  const { role, name } = routeConfig.waitFor;
  try {
    await page.getByRole(role, { name }).first().waitFor({ state: "visible", timeout: 12000 });
  } catch {
    await page.waitForTimeout(1800);
  }
}

async function ensureLoggedIn(page) {
  await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });

  if (!page.url().includes("/login")) {
    return;
  }

  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 30000 });
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function captureRoute(page, routeConfig) {
  const destination = path.join(outputDir, `${routeConfig.key}.png`);

  await page.goto(`${baseURL}${routeConfig.path}`, { waitUntil: "domcontentloaded" });
  await waitForRouteSignal(page, routeConfig);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: destination, fullPage: false });

  return {
    key: routeConfig.key,
    path: routeConfig.path,
    file: destination,
  };
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    await ensureLoggedIn(page);

    const results = [];
    for (const routeConfig of routes) {
      results.push(await captureRoute(page, routeConfig));
    }

    const summaryPath = path.join(outputDir, "summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify({ baseURL, generatedAt: new Date().toISOString(), results }, null, 2));

    console.log(`Captured ${results.length} marketing screenshots in ${outputDir}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
