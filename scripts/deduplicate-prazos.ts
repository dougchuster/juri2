import "dotenv/config";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma";
import {
    appendPrazoObservacao,
    buildPrazoDedupKey,
} from "../src/lib/services/prazo-dedup";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any);
const db = new PrismaClient({
    adapter,
    log: ["error"],
});

async function main() {
    const prazos = await db.prazo.findMany({
        where: {
            origem: "PUBLICACAO_IA",
            status: "PENDENTE",
        },
        select: {
            id: true,
            processoId: true,
            descricao: true,
            dataFatal: true,
            dataCortesia: true,
            tipoContagem: true,
            fatal: true,
            status: true,
            origem: true,
            origemPublicacaoId: true,
            origemConfianca: true,
            observacoes: true,
            createdAt: true,
        },
        orderBy: { createdAt: "asc" },
    });

    const groups = new Map<string, typeof prazos>();

    for (const prazo of prazos) {
        const key = buildPrazoDedupKey({
            processoId: prazo.processoId,
            descricao: prazo.descricao,
            dataFatal: prazo.dataFatal,
            tipoContagem: prazo.tipoContagem,
            fatal: prazo.fatal,
            status: prazo.status,
        });
        const current = groups.get(key) || [];
        current.push(prazo);
        groups.set(key, current);
    }

    let gruposCorrigidos = 0;
    let registrosRemovidos = 0;

    for (const items of groups.values()) {
        if (items.length <= 1) continue;

        gruposCorrigidos += 1;

        const sorted = [...items].sort((a, b) => {
            const aScore = a.origemPublicacaoId ? 1 : 0;
            const bScore = b.origemPublicacaoId ? 1 : 0;
            if (aScore !== bScore) return bScore - aScore;
            return a.createdAt.getTime() - b.createdAt.getTime();
        });

        const canonical = sorted[0];
        const duplicates = sorted.slice(1);
        const melhorOrigemPublicacaoId =
            canonical.origemPublicacaoId ||
            duplicates.find((item) => item.origemPublicacaoId)?.origemPublicacaoId ||
            null;
        const melhorConfianca = Math.max(
            canonical.origemConfianca ?? 0,
            ...duplicates.map((item) => item.origemConfianca ?? 0)
        );
        const melhorDataCortesia =
            canonical.dataCortesia ||
            duplicates.find((item) => item.dataCortesia)?.dataCortesia ||
            null;

        await db.prazo.update({
            where: { id: canonical.id },
            data: {
                origemPublicacaoId: melhorOrigemPublicacaoId,
                origemConfianca: melhorConfianca || null,
                dataCortesia: melhorDataCortesia,
                observacoes: appendPrazoObservacao(
                    canonical.observacoes,
                    `[Deduplicado em ${new Date().toISOString()}] Consolidado com ${duplicates.length} prazo(s) repetido(s).`
                ),
            },
        });

        for (const duplicate of duplicates) {
            await db.calendarEvent.deleteMany({ where: { prazoId: duplicate.id } }).catch((error) => {
                console.warn("[deduplicate-prazos] Falha ao remover eventos de calendario:", error);
            });
            await db.agendamento.deleteMany({ where: { prazoLegadoId: duplicate.id } }).catch((error) => {
                console.warn("[deduplicate-prazos] Falha ao remover referencia legada:", error);
            });
            await db.prazo.delete({ where: { id: duplicate.id } });
            registrosRemovidos += 1;
        }
    }

    console.log(
        JSON.stringify(
            {
                avaliados: prazos.length,
                gruposCorrigidos,
                registrosRemovidos,
            },
            null,
            2
        )
    );
}

main()
    .catch((error) => {
        console.error("[deduplicate-prazos] Erro:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.$disconnect().catch(() => null);
        await pool.end().catch(() => null);
    });
