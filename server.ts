import "dotenv/config";
import http from "node:http";
import { AsyncLocalStorage } from "node:async_hooks";

const command = process.argv[2] || "dev";
const isDev = command !== "start";
(process.env as Record<string, string | undefined>).NODE_ENV = isDev ? "development" : "production";

const hostname = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);

async function bootstrap() {
  if (typeof globalThis.AsyncLocalStorage === "undefined") {
    (globalThis as typeof globalThis & { AsyncLocalStorage?: typeof AsyncLocalStorage }).AsyncLocalStorage =
      AsyncLocalStorage;
  }

  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
    children: [],
    path: "",
    isPreloading: false,
    parent: null,
    paths: [],
  } as unknown as NodeModule;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const next = require("next") as typeof import("next").default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { initializeChatSocketServer } = require("./src/lib/chat/socket-server") as typeof import("./src/lib/chat/socket-server");

  const app = next({
    dev: isDev,
    hostname,
    port,
  });

  const handle = app.getRequestHandler();
  await app.prepare();

  const server = http.createServer((req, res) => {
    void handle(req, res);
  });

  await initializeChatSocketServer(server);

  server.listen(port, hostname, () => {
    console.log(`[server] ready on http://${hostname}:${port} (${isDev ? "dev" : "start"})`);
  });
}

bootstrap().catch((error) => {
  console.error("[server] fatal bootstrap error:", error);
  process.exit(1);
});
