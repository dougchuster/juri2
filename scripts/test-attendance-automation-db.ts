import Module from "node:module";
import path from "node:path";

const nodeRequire = Module.createRequire(__filename);
process.env.KIMI_API_KEY = "";
const serverOnlyPath = nodeRequire.resolve("server-only");
const moduleCache = require.cache as NodeJS.Dict<NodeJS.Module>;
const moduleDirectory = path.dirname(serverOnlyPath);

moduleCache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
    children: [],
    path: moduleDirectory,
    paths: [],
    isPreloading: false,
    parent: null,
    require,
} as NodeJS.Module;

const {
    ensureAttendanceAutomationDefaults,
    getAttendanceAutomationDashboard,
    previewAttendanceAutomationFlow,
} = nodeRequire("@/lib/services/attendance-automation") as typeof import("@/lib/services/attendance-automation");
const { db } = nodeRequire("@/lib/db") as typeof import("@/lib/db");

function assert(condition: unknown, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

async function main() {
    try {
        await ensureAttendanceAutomationDefaults();

        const dashboard = await getAttendanceAutomationDashboard();
        assert(dashboard.stats.totalFlows >= 2, "Dashboard deveria carregar os fluxos default da automacao.");
        assert(dashboard.stats.activeFlows >= 1, "Dashboard deveria ter ao menos um fluxo ativo.");
        assert(Array.isArray(dashboard.flows) && dashboard.flows.length >= 2, "Lista de fluxos nao foi carregada.");

        const afterHoursFlow = dashboard.flows.find((item) => item.name === "Recepcao fora do horario");
        assert(afterHoursFlow, "Fluxo default de recepcao fora do horario nao encontrado.");

        const preview = await previewAttendanceAutomationFlow({
            flowId: afterHoursFlow!.id,
            incomingText: "O escritorio esta fechado? Preciso de ajuda com meu atendimento.",
        });

        assert(Boolean(preview.content?.trim()), "Previa do fluxo deveria retornar resposta nao vazia.");
        assert(
            ["template", "fallback", "ai"].includes(preview.mode),
            "Modo da previa do fluxo retornou valor invalido."
        );

        console.log("test-attendance-automation-db: ok");
    } finally {
        await db.$disconnect();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
