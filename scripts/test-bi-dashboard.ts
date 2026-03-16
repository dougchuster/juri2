import Module from "node:module";
import path from "node:path";

const nodeRequire = Module.createRequire(__filename);
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

const { buildBIDashboardCsv, getBIDashboardData } = nodeRequire("@/lib/dal/bi") as typeof import("@/lib/dal/bi");

async function main() {
    const dashboard = await getBIDashboardData();

    if (!dashboard.snapshotDate) {
        throw new Error("BI dashboard sem snapshot disponivel.");
    }

    if (!Array.isArray(dashboard.globalMetrics) || dashboard.globalMetrics.length === 0) {
        throw new Error("BI dashboard sem metricas globais.");
    }

    if (!Array.isArray(dashboard.historicalSeries)) {
        throw new Error("BI dashboard sem serie historica.");
    }

    if (!Array.isArray(dashboard.processTypeBenchmarks)) {
        throw new Error("BI dashboard sem benchmarks por tipo de processo.");
    }

    if (!Array.isArray(dashboard.byTribunal)) {
        throw new Error("BI dashboard sem jurimetria por tribunal.");
    }

    if (!Array.isArray(dashboard.phaseDistribution)) {
        throw new Error("BI dashboard sem distribuicao por fase.");
    }

    if (!Array.isArray(dashboard.alerts)) {
        throw new Error("BI dashboard sem alertas operacionais.");
    }

    const csv = await buildBIDashboardCsv();
    if (
        !csv.includes("Painel BI Interno") ||
        !csv.includes("Metricas globais") ||
        !csv.includes("Jurimetria por tribunal") ||
        !csv.includes("Fases processuais ativas")
    ) {
        throw new Error("CSV de BI invalido.");
    }

    console.log("test-bi-dashboard: ok");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
