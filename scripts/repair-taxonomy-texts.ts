import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import { normalizeMojibake, normalizeNullableMojibake } from "../src/lib/text-normalization";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type TipoAcaoRow = {
    id: string;
    nome: string;
    grupo: string | null;
    descricao: string | null;
    escritorioId: string;
};

type FaseRow = {
    id: string;
    nome: string;
    ordem: number;
    cor: string | null;
    escritorioId: string;
};

function groupKey(escritorioId: string, nome: string) {
    return `${escritorioId}::${normalizeMojibake(nome).trim().toLocaleLowerCase("pt-BR")}`;
}

function pickCanonicalByName<T extends { id: string; nome: string }>(rows: T[]) {
    const exact = rows.find((row) => row.nome === normalizeMojibake(row.nome).trim());
    return exact ?? rows[0];
}

async function repairTiposAcao() {
    const rows = await prisma.tipoAcao.findMany({
        select: { id: true, nome: true, grupo: true, descricao: true, escritorioId: true },
        orderBy: [{ escritorioId: "asc" }, { nome: "asc" }],
    });

    const grouped = new Map<string, TipoAcaoRow[]>();
    for (const row of rows) {
        const key = groupKey(row.escritorioId, row.nome);
        const bucket = grouped.get(key) ?? [];
        bucket.push(row);
        grouped.set(key, bucket);
    }

    let merged = 0;
    let updated = 0;

    for (const bucket of grouped.values()) {
        const canonical = pickCanonicalByName(bucket);
        const nome = normalizeMojibake(canonical.nome).trim();
        const grupo = normalizeNullableMojibake(canonical.grupo);
        const descricao = normalizeNullableMojibake(canonical.descricao);

        await prisma.tipoAcao.update({
            where: { id: canonical.id },
            data: { nome, grupo, descricao },
        });
        updated += 1;

        for (const duplicate of bucket) {
            if (duplicate.id === canonical.id) continue;

            await prisma.processo.updateMany({
                where: { tipoAcaoId: duplicate.id },
                data: { tipoAcaoId: canonical.id },
            });

            await prisma.tipoAcao.delete({ where: { id: duplicate.id } });
            merged += 1;
        }
    }

    return { updated, merged };
}

async function repairFasesProcessuais() {
    const rows = await prisma.faseProcessual.findMany({
        select: { id: true, nome: true, ordem: true, cor: true, escritorioId: true },
        orderBy: [{ escritorioId: "asc" }, { ordem: "asc" }, { nome: "asc" }],
    });

    const grouped = new Map<string, FaseRow[]>();
    for (const row of rows) {
        const key = groupKey(row.escritorioId, row.nome);
        const bucket = grouped.get(key) ?? [];
        bucket.push(row);
        grouped.set(key, bucket);
    }

    let merged = 0;
    let updated = 0;

    for (const bucket of grouped.values()) {
        const canonical = pickCanonicalByName(bucket);
        const nome = normalizeMojibake(canonical.nome).trim();

        await prisma.faseProcessual.update({
            where: { id: canonical.id },
            data: { nome },
        });
        updated += 1;

        for (const duplicate of bucket) {
            if (duplicate.id === canonical.id) continue;

            await prisma.processo.updateMany({
                where: { faseProcessualId: duplicate.id },
                data: { faseProcessualId: canonical.id },
            });

            await prisma.workflowTemplate.updateMany({
                where: { faseProcessualId: duplicate.id },
                data: { faseProcessualId: canonical.id },
            });

            await prisma.faseProcessual.delete({ where: { id: duplicate.id } });
            merged += 1;
        }
    }

    return { updated, merged };
}

async function main() {
    const [tiposAcao, fasesProcessuais] = await Promise.all([
        repairTiposAcao(),
        repairFasesProcessuais(),
    ]);

    console.log(
        `[repair-taxonomy-texts] tipos_acao: ${tiposAcao.updated} normalizados, ${tiposAcao.merged} duplicados removidos`
    );
    console.log(
        `[repair-taxonomy-texts] fases_processuais: ${fasesProcessuais.updated} normalizadas, ${fasesProcessuais.merged} duplicados removidos`
    );
}

main()
    .catch((error) => {
        console.error("[repair-taxonomy-texts] failed", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
