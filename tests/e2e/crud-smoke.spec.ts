import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

const auth = {
    email: process.env.E2E_LOGIN_EMAIL || "dougcruvinel@gmail.com",
    password: process.env.E2E_LOGIN_PASSWORD || "123456",
};

async function login(page: Page) {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(auth.email);
    await page.locator('input[name="password"]').fill(auth.password);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/dashboard$/);
}

async function openDialog(page: Page, buttonName: RegExp | string) {
    await page.getByRole("button", { name: buttonName }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    return page.getByRole("dialog");
}

async function createClient(page: Page, name: string) {
    const dialog = await openDialog(page, /novo cliente/i);
    await dialog.locator('input[name="nome"]').fill(name);
    await dialog.locator('input[name="email"]').fill(`${name.toLowerCase().replace(/\s+/g, ".")}@teste.local`);
    await dialog.locator('input[name="celular"]').fill("(61) 99999-0000");
    await dialog.getByRole("button", { name: /criar cliente/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator("tr", { hasText: name })).toBeVisible();
}

async function editClient(page: Page, currentName: string, updatedName: string) {
    const row = page.locator("tr", { hasText: currentName });
    await expect(row).toBeVisible();
    await row.locator("button").nth(2).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator('input[name="nome"]').fill(updatedName);
    await dialog.getByRole("button", { name: /salvar/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator("tr", { hasText: updatedName })).toBeVisible();
}

async function deleteClient(page: Page, name: string) {
    const row = page.locator("tr", { hasText: name });
    await expect(row).toBeVisible();
    await row.locator("button").last().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /^excluir$/i }).click();
    await expect(dialog).toBeHidden();
}

async function createProcess(page: Page, objectName: string) {
    const dialog = await openDialog(page, /novo processo/i);
    const advogadoSelect = dialog.locator('select[name="advogadoId"]');
    await advogadoSelect.selectOption({ label: "Ana Martins" });
    await expect(advogadoSelect).toHaveValue(/.+/);
    await dialog.locator('input[name="objeto"]').fill(objectName);
    await expect(dialog.locator('input[name="objeto"]')).toHaveValue(objectName);
    await dialog.getByRole("button", { name: /criar processo/i }).click();
    const row = page.locator("tr", { hasText: objectName });

    try {
        await expect(row).toBeVisible({ timeout: 8000 });
        return;
    } catch {
        const fieldErrors = (await dialog.locator(".text-danger").allTextContents())
            .map((text) => text.trim())
            .filter(Boolean);
        const dialogText = (await dialog.textContent())?.replace(/\s+/g, " ").trim() || "";

        await page.reload();
        const persistedRow = page.locator("tr", { hasText: objectName });
        if (await persistedRow.count()) {
            throw new Error(
                `Processo criado no banco, mas nao apareceu na tela sem recarregar. Feedback: ${fieldErrors.join(" | ") || dialogText.slice(0, 280)}`
            );
        }

        throw new Error(
            `Falha ao criar processo. Feedback: ${fieldErrors.join(" | ") || dialogText.slice(0, 280)}`
        );
    }
}

async function editProcess(page: Page, currentObject: string, updatedObject: string) {
    const row = page.locator("tr", { hasText: currentObject });
    await expect(row).toBeVisible();
    await row.locator('button[title="Editar"]').click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator('input[name="objeto"]').fill(updatedObject);
    await dialog.getByRole("button", { name: /salvar/i }).click();
    await expect(page.locator("tr", { hasText: updatedObject })).toBeVisible();
}

async function bulkDeleteProcesses(page: Page, processNames: string[]) {
    for (const name of processNames) {
        const row = page.locator("tr", { hasText: name });
        await expect(row).toBeVisible();
        await row.locator('input[type="checkbox"]').check();
    }

    await page.getByRole("button", { name: /excluir selecionados/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /excluir selecionados|excluir/i }).last().click();
    await expect(dialog).toBeHidden();

    for (const name of processNames) {
        await expect(page.locator("tr", { hasText: name })).toHaveCount(0);
    }
}

async function getSelectOptionValueByText(select: ReturnType<Page["locator"]>, text: string) {
    const value = await select.locator("option").evaluateAll((options, expectedText) => {
        const match = options.find((option) => (option.textContent || "").includes(expectedText as string));
        if (match?.getAttribute("value")) {
            return match.getAttribute("value");
        }

        const fallback = options.find((option, index) => {
            if (index === 0) return false;
            const value = option.getAttribute("value");
            return Boolean(value);
        });

        return fallback?.getAttribute("value") ?? "";
    }, text);

    if (!value) {
        throw new Error(`Opcao nao encontrada no select para: ${text}`);
    }

    return value;
}

async function createPrazo(page: Page, description: string, fatalDate: string, processLabel: string) {
    const dialog = await openDialog(page, /novo prazo/i);
    const processoSelect = dialog.locator('select[name="processoId"]');
    const processoValue = await getSelectOptionValueByText(processoSelect, processLabel);
    await processoSelect.selectOption(processoValue);
    await dialog.locator('select[name="advogadoId"]').selectOption({ label: "Ana Martins" });
    await dialog.locator('input[name="descricao"]').fill(description);
    await dialog.locator('input[name="dataFatal"]').fill(fatalDate);
    await dialog.getByRole("button", { name: /salvar prazo/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator("tr", { hasText: description })).toBeVisible();
}

async function concludePrazo(page: Page, description: string) {
    const row = page.locator("tr", { hasText: description });
    await expect(row).toBeVisible();
    await row.locator("button").first().click();
    await expect(row).toContainText(/conclu/i);
}

async function deletePrazo(page: Page, description: string) {
    const row = page.locator("tr", { hasText: description });
    await expect(row).toBeVisible();
    await row.locator("button").last().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /^excluir$/i }).click();
    await expect(dialog).toBeHidden();
}

function toDateTimeLocal(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

async function createAgendaCompromisso(page: Page, title: string) {
    const createButton = page.getByRole("button", { name: /^Compromisso$/i }).last();
    await createButton.click();
    const dialog = page.getByRole("dialog");
    if (!(await dialog.isVisible().catch(() => false))) {
        await createButton.click({ force: true });
    }
    await expect(dialog).toBeVisible();
    const start = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    await dialog.locator('select[name="advogadoId"]').selectOption({ label: "Ana Martins" });
    await dialog.locator('select[name="tipo"]').selectOption({ label: "Consulta" });
    await dialog.locator('input[name="titulo"]').fill(title);
    await dialog.locator('input[name="dataInicio"]').fill(toDateTimeLocal(start));
    await dialog.locator('input[name="dataFim"]').fill(toDateTimeLocal(end));
    await dialog.locator('input[name="local"]').fill("Sala Smoke");
    await dialog.locator('textarea[name="descricao"]').fill("Compromisso criado pelo smoke test");
    await dialog.getByRole("button", { name: /criar compromisso/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator("article", { hasText: title })).toBeVisible();
}

async function concludeAgendaCompromisso(page: Page, title: string) {
    const card = page.locator("article", { hasText: title });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /marcar compromisso concluido/i }).click();
    await expect(page.locator("article", { hasText: title })).toHaveCount(0);
}

async function cleanupSmokeAgendaCompromisso(title: string) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL nao configurada para cleanup do smoke test de agenda.");
    }

    const client = new Client({ connectionString });
    await client.connect();

    try {
        await client.query("BEGIN");
        await client.query(
            `delete from public.agendamentos where titulo = $1 and coalesce(descricao, '') = 'Compromisso criado pelo smoke test'`,
            [title]
        );
        await client.query(
            `delete from public.compromissos where titulo = $1 and coalesce(descricao, '') = 'Compromisso criado pelo smoke test'`,
            [title]
        );
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        await client.end();
    }
}

async function createRotina(page: Page, name: string) {
    const advogadoValue = await page.locator("#rotina-advogado option").evaluateAll((options) => {
        const match = options.find((option) => option.textContent?.includes("Ana Martins"));
        return match?.getAttribute("value") ?? "";
    });

    await page.locator("#rotina-nome").fill(name);
    await page.locator("#rotina-desc").fill("Rotina automatizada pelo smoke test");
    await page.locator("#rotina-area").selectOption({ index: 1 });
    await page.locator("#rotina-papel").selectOption({ label: "Advogado" });
    await page.locator("#rotina-advogado").selectOption(advogadoValue);
    await page.locator("#rotina-periodicidade").selectOption({ label: "Semanal" });
    await page.locator("#rotina-prioridade").selectOption({ label: "Alta" });
    await page.locator("#rotina-dia-semana").fill("2");
    await page.locator("#rotina-sla").fill("3");
    await page.locator("#rotina-checklist").fill("Validar tarefas\nAtualizar indicadores");
    await page.getByRole("button", { name: /salvar rotina/i }).click();
    await expect(page.locator("tr", { hasText: name })).toBeVisible();
}

async function editRotina(page: Page, currentName: string, updatedName: string) {
    const row = page.locator("tr", { hasText: currentName });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: /editar/i }).click();
    await expect(page.locator("#rotina-nome")).toHaveValue(currentName);
    await page.locator("#rotina-nome").fill(updatedName);
    await page.getByRole("button", { name: /atualizar rotina/i }).click();
    await expect(page.locator("tr", { hasText: updatedName })).toBeVisible();
}

async function deleteRotina(page: Page, name: string) {
    const row = page.locator("tr", { hasText: name });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: /excluir/i }).click();
    await expect(page.locator("tr", { hasText: name })).toHaveCount(0);
}

async function createPublicacao(page: Page, uniqueContent: string) {
    const dialog = await openDialog(page, /^nova$/i);
    await dialog.locator('select[name="tribunal"]').selectOption("TJDFT");
    await dialog.locator('input[name="dataPublicacao"]').fill(new Date().toISOString().slice(0, 10));
    await dialog.locator('input[name="identificador"]').fill(`ID-${Date.now()}`);
    await dialog.locator('textarea[name="conteudo"]').fill(uniqueContent);
    await dialog.getByRole("button", { name: /registrar/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(uniqueContent)).toBeVisible();
}

async function deletePublicacao(page: Page, uniqueContent: string) {
    const publicationText = page.getByText(uniqueContent).first();
    await expect(publicationText).toBeVisible();
    const publicationCheckbox = publicationText.locator(
        "xpath=ancestor::div[contains(@class,'group')][1]//input[@type='checkbox' and starts-with(@aria-label,'Selecionar publicacao')]"
    );
    await publicationCheckbox.check();
    page.once("dialog", async (confirmDialog) => {
        await confirmDialog.accept();
    });
    await page.getByRole("button", { name: /excluir selecionadas/i }).click();
    await expect(page.getByText(uniqueContent)).toHaveCount(0);
}

async function openCrmOpportunityModal(page: Page, title: string) {
    await page.getByRole("button", { name: /nova oportunidade/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("textbox").nth(0).fill(title);
    return dialog;
}

async function createCrmOpportunity(page: Page, opportunityTitle: string, clientName: string) {
    const dialog = await openCrmOpportunityModal(page, opportunityTitle);
    await dialog.getByRole("combobox").nth(0).selectOption({ label: clientName });
    await dialog.getByRole("combobox").nth(1).selectOption("CIVEL");
    await dialog.getByRole("textbox").nth(4).fill("Smoke Test");
    await dialog.getByRole("spinbutton").nth(0).fill("1500");
    await dialog.getByRole("spinbutton").nth(1).fill("40");
    await dialog.getByRole("button", { name: /salvar/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator("tr", { hasText: opportunityTitle })).toBeVisible();
}

async function editCrmOpportunity(page: Page, currentTitle: string, updatedTitle: string) {
    const row = page.locator("tr", { hasText: currentTitle });
    await expect(row).toBeVisible();
    await row.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("textbox").nth(0).fill(updatedTitle);
    await dialog.getByRole("button", { name: /salvar/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator("tr", { hasText: updatedTitle })).toBeVisible();
}

async function deleteCrmOpportunity(page: Page, title: string) {
    const row = page.locator("tr", { hasText: title });
    await expect(row).toBeVisible();
    await row.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    page.once("dialog", async (confirmDialog) => {
        await confirmDialog.accept();
    });
    await dialog.getByRole("button", { name: /excluir/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator("tr", { hasText: title })).toHaveCount(0);
}

test.describe.serial("CRUD smoke core", () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test("clientes: create, update and delete", async ({ page }) => {
        const nonce = Date.now();
        const clientName = `Cliente Smoke ${nonce}`;
        const updatedName = `${clientName} Editado`;

        await page.goto("/clientes");
        await createClient(page, clientName);
        await editClient(page, clientName, updatedName);
        await deleteClient(page, updatedName);
    });

    test("processos: create, update and bulk delete", async ({ page }) => {
        const nonce = Date.now();
        const processA = `Processo Smoke ${nonce} A`;
        const processAUpdated = `${processA} Editado`;
        const processB = `Processo Smoke ${nonce} B`;

        await page.goto("/processos");
        await createProcess(page, processA);
        await editProcess(page, processA, processAUpdated);
        await createProcess(page, processB);
        await bulkDeleteProcesses(page, [processAUpdated, processB]);
    });

    test("prazos: create, conclude and delete", async ({ page }) => {
        const nonce = Date.now();
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const supportingProcess = `Processo Prazo Smoke ${nonce}`;
        const firstPrazo = `Prazo Smoke ${nonce} Concluir`;
        const secondPrazo = `Prazo Smoke ${nonce} Excluir`;

        await page.goto("/processos");
        await createProcess(page, supportingProcess);

        await page.goto("/prazos");
        await createPrazo(page, firstPrazo, tomorrow, supportingProcess);
        await concludePrazo(page, firstPrazo);
        await createPrazo(page, secondPrazo, tomorrow, supportingProcess);
        await deletePrazo(page, secondPrazo);
    });

    test("agenda: create and conclude compromisso", async ({ page }) => {
        const nonce = Date.now();
        const compromisso = `Compromisso Smoke ${nonce}`;

        try {
            await page.goto("/agenda", { waitUntil: "domcontentloaded" });
            await expect(page.getByRole("button", { name: /compromisso/i }).first()).toBeVisible({
                timeout: 120000,
            });
            await createAgendaCompromisso(page, compromisso);
            await concludeAgendaCompromisso(page, compromisso);
        } finally {
            await cleanupSmokeAgendaCompromisso(compromisso);
        }
    });

    test("demandas: rotina create, update and delete", async ({ page }) => {
        const nonce = Date.now();
        const rotina = `Rotina Smoke ${nonce}`;
        const rotinaEditada = `${rotina} Editada`;

        await page.goto("/demandas");
        await createRotina(page, rotina);
        await editRotina(page, rotina, rotinaEditada);
        await deleteRotina(page, rotinaEditada);
    });

    test("publicacoes: create and delete", async ({ page }) => {
        const nonce = Date.now();
        const conteudo = `Publicacao smoke ${nonce} para cadastro manual`;

        await page.goto("/publicacoes", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("button", { name: /^nova$/i })).toBeVisible({
            timeout: 120000,
        });
        await createPublicacao(page, conteudo);
        await deletePublicacao(page, conteudo);
    });

    test("crm pipeline: oportunidade create, update and delete", async ({ page }) => {
        const nonce = Date.now();
        const clientName = `Cliente CRM Smoke ${nonce}`;
        const opportunity = `Oportunidade Smoke ${nonce}`;
        const opportunityUpdated = `${opportunity} Editada`;

        await page.goto("/clientes");
        await createClient(page, clientName);

        await page.goto("/crm/pipeline", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("button", { name: /nova oportunidade/i })).toBeVisible({
            timeout: 120000,
        });
        await page.locator('button[title="Lista"]').click();
        await expect(page.locator("table")).toBeVisible();

        await createCrmOpportunity(page, opportunity, clientName);
        await editCrmOpportunity(page, opportunity, opportunityUpdated);
        await deleteCrmOpportunity(page, opportunityUpdated);

        await page.goto("/clientes");
        await deleteClient(page, clientName);
    });
});
