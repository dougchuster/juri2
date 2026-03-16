import type { Prisma, PrismaClient, StatusPrazo, TipoContagem } from "@/generated/prisma";

type PrazoDbClient = PrismaClient | Prisma.TransactionClient;

function normalizeDateOnly(dateLike: string | Date) {
    const date = new Date(dateLike);
    date.setHours(0, 0, 0, 0);
    return date;
}

export function normalizePrazoDescricao(value: string) {
    return String(value || "").trim().replace(/\s+/g, " ");
}

export function buildPrazoDedupKey(input: {
    processoId: string;
    descricao: string;
    dataFatal: string | Date;
    tipoContagem: TipoContagem;
    fatal: boolean;
    status: string;
}) {
    return [
        input.processoId,
        normalizePrazoDescricao(input.descricao).toLowerCase(),
        normalizeDateOnly(input.dataFatal).toISOString().slice(0, 10),
        input.tipoContagem,
        input.fatal ? "1" : "0",
        input.status,
    ].join("|");
}

export async function findExistingPrazoByBusinessKey(
    db: PrazoDbClient,
    input: {
        processoId: string;
        descricao: string;
        dataFatal: string | Date;
        tipoContagem: TipoContagem;
        fatal: boolean;
        status?: StatusPrazo;
    }
) {
    return db.prazo.findFirst({
        where: {
            processoId: input.processoId,
            descricao: normalizePrazoDescricao(input.descricao),
            dataFatal: normalizeDateOnly(input.dataFatal),
            tipoContagem: input.tipoContagem,
            fatal: input.fatal,
            status: input.status ?? "PENDENTE",
        },
        select: {
            id: true,
            origem: true,
            origemPublicacaoId: true,
            origemConfianca: true,
            dataCortesia: true,
            observacoes: true,
            createdAt: true,
        },
        orderBy: { createdAt: "asc" },
    });
}

export function appendPrazoObservacao(
    observacoes: string | null | undefined,
    note: string
) {
    const normalizedNote = note.trim();
    if (!normalizedNote) return observacoes ?? null;
    if (observacoes?.includes(normalizedNote)) return observacoes;
    return [observacoes?.trim(), normalizedNote].filter(Boolean).join("\n");
}
