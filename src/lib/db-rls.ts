import { db } from "@/lib/db";
import { PrismaClient } from "@/generated/prisma";

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Executa `fn` dentro de uma transação Prisma com `SET LOCAL app.escritorio_id`
 * definido para o valor fornecido.
 *
 * Isso permite que futuras políticas de Row Level Security (RLS) no PostgreSQL
 * usem `current_setting('app.escritorio_id')` nas suas regras.
 *
 * Uso:
 * ```ts
 * const result = await withTenantRLS(escritorioId, async (tx) => {
 *   return tx.cliente.findMany();
 * });
 * ```
 */
export async function withTenantRLS<T>(
    escritorioId: string,
    fn: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
    return db.$transaction(async (tx) => {
        // Define o escritório corrente para políticas RLS no PostgreSQL
        await tx.$executeRawUnsafe(
            `SET LOCAL "app.escritorio_id" = '${escritorioId.replace(/'/g, "''")}'`,
        );
        return fn(tx);
    });
}

/**
 * Versão tipada que aceita o db já injetado externamente (útil em testes).
 */
export async function withTenantRLSOn<T>(
    client: Pick<PrismaClient, "$transaction">,
    escritorioId: string,
    fn: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
    return client.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
            `SET LOCAL "app.escritorio_id" = '${escritorioId.replace(/'/g, "''")}'`,
        );
        return fn(tx);
    });
}
