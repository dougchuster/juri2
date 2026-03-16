import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {
        strict: args.includes("--strict"),
        days: 30,
    };

    const daysArg = args.find((arg) => arg.startsWith("--days="));
    if (daysArg) {
        const value = Number(daysArg.split("=")[1]);
        if (Number.isFinite(value) && value > 0 && value <= 365) {
            parsed.days = Math.floor(value);
        }
    }

    return parsed;
}

async function run() {
    const { strict, days } = parseArgs();
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("DATABASE_URL nao configurada.");
        process.exit(1);
    }

    const pool = new Pool({ connectionString });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any);
    const db = new PrismaClient({ adapter });

    try {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const logs = await db.processoAtribuicaoLog.findMany({
            where: { createdAt: { gte: since } },
            select: {
                id: true,
                processoId: true,
                fromAdvogadoId: true,
                toAdvogadoId: true,
                automatico: true,
                modoDistribuicao: true,
                createdAt: true,
                processo: {
                    select: {
                        numeroCnj: true,
                        advogadoId: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 5000,
        });

        const total = logs.length;
        const automaticas = logs.filter((log) => log.automatico).length;
        const manuais = total - automaticas;
        const fallback = logs.filter((log) => (log.modoDistribuicao || "").toUpperCase().includes("FALLBACK")).length;

        const latestByProcess = new Map<string, (typeof logs)[number]>();
        for (const log of logs) {
            if (!latestByProcess.has(log.processoId)) {
                latestByProcess.set(log.processoId, log);
            }
        }

        let divergenciasResponsavel = 0;
        const divergenciasSample: string[] = [];
        for (const log of latestByProcess.values()) {
            if (log.processo.advogadoId !== log.toAdvogadoId) {
                divergenciasResponsavel += 1;
                if (divergenciasSample.length < 8) {
                    divergenciasSample.push(`${log.processo.numeroCnj || log.processoId}`);
                }
            }
        }

        const autoSemModo = logs.filter((log) => log.automatico && !log.modoDistribuicao).length;
        const fallbackManual = logs.filter(
            (log) => !log.automatico && (log.modoDistribuicao || "").toUpperCase().includes("FALLBACK")
        ).length;

        console.log(`Janela: ultimos ${days} dia(s)`);
        console.log(`Logs analisados: ${total}`);
        console.log(`Automaticas: ${automaticas}`);
        console.log(`Manuais: ${manuais}`);
        console.log(`Fallback global: ${fallback}`);
        console.log(`Divergencias ultimo log x responsavel atual: ${divergenciasResponsavel}`);
        if (divergenciasSample.length > 0) {
            console.log(`Amostra divergencias: ${divergenciasSample.join(", ")}`);
        }
        console.log(`Automaticas sem modoDistribuicao: ${autoSemModo}`);
        console.log(`Fallback marcado como manual: ${fallbackManual}`);

        const hasCritical =
            divergenciasResponsavel > 0 ||
            autoSemModo > 0 ||
            fallbackManual > 0;

        if (strict && hasCritical) {
            console.error("Falha de integridade detectada em modo --strict.");
            process.exit(1);
        }

        if (hasCritical) {
            console.warn("Aviso: inconsistencias encontradas (rodar com --strict para falhar).");
        } else {
            console.log("OK: integridade da redistribuicao sem inconsistencias criticas.");
        }
    } finally {
        await db.$disconnect();
        await pool.end();
    }
}

run().catch((err) => {
    console.error("Erro ao executar teste de distribuicao em banco:", err);
    process.exit(1);
});
