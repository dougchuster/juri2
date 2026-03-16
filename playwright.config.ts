import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT || "3001");
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;

export default defineConfig({
    testDir: "./tests/e2e",
    timeout: 60_000,
    expect: {
        timeout: 10_000,
    },
    fullyParallel: false,
    workers: 1,
    use: {
        baseURL,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: {
        command: `npm run dev:next -- --port ${port}`,
        url: `${baseURL}/login`,
        reuseExistingServer: true,
        timeout: 180_000,
    },
});
