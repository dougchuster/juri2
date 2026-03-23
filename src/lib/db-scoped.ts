import { db } from "@/lib/db";
import { getEscritorioId } from "@/lib/tenant";

/**
 * Cria um proxy sobre um delegate qualquer do Prisma que injeta `escritorioId`
 * automaticamente nas operações where/data.
 *
 * Tipagem: usamos `unknown` para o delegate pois as classes geradas pelo Prisma
 * não são assignable a `Record<string, Function>` em strict mode.
 * As chamadas reais são feitas com `call` via cast any, mantendo a segurança
 * de runtime.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createScopedDelegate<D>(delegate: D, escritorioId: string): D {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = delegate as any;
    return new Proxy(d, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        get(target: any, prop: string | symbol) {
            const original = target[prop];
            if (typeof original !== "function") return original;

            const method = String(prop);

            if (["findMany", "findFirst", "count"].includes(method)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (args?: any) =>
                    original.call(target, {
                        ...args,
                        where: { ...args?.where, escritorioId },
                    });
            }

            if (["findUnique", "findUniqueOrThrow", "findFirstOrThrow"].includes(method)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (args?: any) =>
                    original.call(target, {
                        ...args,
                        where: { ...args?.where, escritorioId },
                    });
            }

            if (method === "create") {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (args?: any) =>
                    original.call(target, {
                        ...args,
                        data: { ...args?.data, escritorioId },
                    });
            }

            if (method === "createMany") {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (args?: any) => {
                    const raw = args?.data;
                    const rows: object[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
                    return original.call(target, {
                        ...args,
                        data: rows.map((row) => ({ ...row, escritorioId })),
                    });
                };
            }

            return original.bind(target);
        },
    }) as D;
}

/**
 * Retorna helpers do Prisma com `escritorioId` injetado automaticamente.
 *
 * Uso em Server Actions / Route Handlers:
 * ```ts
 * const scoped = await getScopedDb();
 * const clientes = await scoped.cliente.findMany({ where: { nome: "X" } });
 * ```
 */
export async function getScopedDb() {
    const escritorioId = await getEscritorioId();

    return {
        cliente:      createScopedDelegate(db.cliente, escritorioId),
        processo:     createScopedDelegate(db.processo, escritorioId),
        tarefa:       createScopedDelegate(db.tarefa, escritorioId),
        agendamento:  createScopedDelegate(db.agendamento, escritorioId),
        conversation: createScopedDelegate(db.conversation, escritorioId),
        /** Acesso sem escopo de tenant — apenas para admin root ou batch jobs. */
        raw: db,
    };
}
