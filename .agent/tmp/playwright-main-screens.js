const { chromium } = require("playwright");

const baseUrl = "http://127.0.0.1:3000";
const outputDir = ".agent/tmp/playwright-screens";
const credentials = {
  email: "dougcruvinel@gmail.com",
  password: "123456",
};

const routes = [
  { name: "dashboard", path: "/dashboard" },
  { name: "processos", path: "/processos" },
  { name: "documentos", path: "/documentos" },
  { name: "clientes", path: "/clientes" },
  { name: "publicacoes", path: "/publicacoes" },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const results = [];

  page.on("pageerror", (error) => {
    pageErrors.push(String(error));
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", credentials.email);
  await page.fill("#password", credentials.password);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL(/\/dashboard|\/login\/mfa/, { timeout: 15000 }).catch(() => null);

  if (page.url().includes("/login")) {
    const visibleText = await page.locator("body").innerText();
    throw new Error(`Login não concluiu. URL atual: ${page.url()}\n${visibleText.slice(0, 2000)}`);
  }

  for (const route of routes) {
    const url = `${baseUrl}${route.path}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);

    const bodyText = (await page.locator("body").innerText()).slice(0, 4000);
    const fatalVisible =
      /application error|unhandled runtime error|500\b|chunkloaderror|failed to fetch/i.test(bodyText);

    const screenshotPath = `${outputDir}/${route.name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });

    results.push({
      route: route.path,
      title: await page.title(),
      fatalVisible,
      screenshotPath,
    });
  }

  console.log(JSON.stringify({ results, pageErrors, consoleErrors }, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
