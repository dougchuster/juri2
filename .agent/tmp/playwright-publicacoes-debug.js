const { chromium } = require("playwright");

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
  if (page.url().includes("/login")) {
    throw new Error(`Falha no login: ${page.url()}`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  await login(page);
  await page.goto(`${TARGET_URL}/publicacoes`, { waitUntil: "networkidle" });

  const totalLabel = (await page.locator("text=/publicações$/i").first().innerText().catch(() => "")) || "";
  const firstCard = page.locator("div.cursor-pointer").filter({ has: page.locator("text=/Não tratada|Distribuída|Tratada|Ignorada/i") }).first();
  const tribunal = (await firstCard.locator("span").first().innerText().catch(() => "")) || "";
  const contentPreview = (await firstCard.locator("p.text-xs").first().innerText().catch(() => "")) || "";
  const rawSearchTerm = tribunal || contentPreview.split(" ").slice(0, 3).join(" ");
  const searchTerm = rawSearchTerm.trim();

  const searchInput = page.locator('input[name="search"]');
  await searchInput.fill(searchTerm);
  await page.waitForTimeout(2000);
  const urlAfterTyping = page.url();

  await searchInput.press("Enter");
  await page.waitForTimeout(1500);
  await page.waitForLoadState("networkidle").catch(() => {});

  const currentUrl = page.url();
  const resultItems = await page.locator("div.cursor-pointer").count();

  console.log(JSON.stringify({
    totalLabel,
    searchTerm,
    urlAfterTyping,
    currentUrl,
    resultItems,
  }, null, 2));

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
