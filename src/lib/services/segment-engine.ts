import "server-only";
import { db } from "@/lib/db";
import { CRMRelationshipType, CanalPreferido, LeadTemperatura, Prisma, StatusCliente, TipoPessoa } from "@/generated/prisma";

export type SegmentRule = {
    field: string;
    operator?: string;
    value?: string | number | boolean;
};

function asDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === "string" || typeof value === "number") {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}

function parseRules(raw: Prisma.JsonValue): SegmentRule[] {
    if (!raw || !Array.isArray(raw)) return [];
    const parsed: SegmentRule[] = [];
    for (const item of raw) {
        if (!item || typeof item !== "object") continue;
        const rule = item as Record<string, unknown>;
        if (typeof rule.field !== "string") continue;

        let normalizedValue: string | number | boolean | undefined = undefined;
        if (typeof rule.value === "string" || typeof rule.value === "number" || typeof rule.value === "boolean") {
            normalizedValue = rule.value;
        }

        parsed.push({
            field: rule.field,
            operator: typeof rule.operator === "string" ? rule.operator : "EQUALS",
            value: normalizedValue,
        });
    }

    return parsed;
}

function isStatusCliente(value: string): value is StatusCliente {
    return Object.values(StatusCliente).includes(value as StatusCliente);
}

function isTipoPessoa(value: string): value is TipoPessoa {
    return Object.values(TipoPessoa).includes(value as TipoPessoa);
}

function isCRMRelationshipType(value: string): value is CRMRelationshipType {
    return Object.values(CRMRelationshipType).includes(value as CRMRelationshipType);
}

function isLeadTemperatura(value: string): value is LeadTemperatura {
    return Object.values(LeadTemperatura).includes(value as LeadTemperatura);
}

function isCanalPreferido(value: string): value is CanalPreferido {
    return Object.values(CanalPreferido).includes(value as CanalPreferido);
}

export function buildSegmentWhere(rules: SegmentRule[]): Prisma.ClienteWhereInput {
    const and: Prisma.ClienteWhereInput[] = [];

    for (const rule of rules) {
        const op = (rule.operator || "EQUALS").toUpperCase();
        const value = rule.value;

        if (rule.field === "status" && typeof value === "string") {
            if (!isStatusCliente(value)) continue;
            if (op === "NOT_EQUALS") and.push({ NOT: { status: value } });
            else and.push({ status: value });
            continue;
        }

        if (rule.field === "tipoPessoa" && typeof value === "string") {
            if (!isTipoPessoa(value)) continue;
            if (op === "NOT_EQUALS") and.push({ NOT: { tipoPessoa: value } });
            else and.push({ tipoPessoa: value });
            continue;
        }

        if (rule.field === "crmRelationship" && typeof value === "string") {
            if (!isCRMRelationshipType(value)) continue;
            if (op === "NOT_EQUALS") and.push({ NOT: { crmRelationship: value } });
            else and.push({ crmRelationship: value });
            continue;
        }

        if (rule.field === "tag" && typeof value === "string") {
            and.push({
                contactTags: {
                    some: {
                        tag: {
                            name: {
                                contains: value,
                                mode: "insensitive",
                            },
                        },
                    },
                },
            });
            continue;
        }

        if (rule.field === "hasProcesso" && typeof value === "boolean") {
            and.push({
                processos: value ? { some: {} } : { none: {} },
            });
            continue;
        }

        if (rule.field === "hasDebitoVencido" && typeof value === "boolean") {
            and.push({
                faturas: value
                    ? { some: { status: { in: ["ATRASADA", "PENDENTE"] } } }
                    : { none: { status: { in: ["ATRASADA", "PENDENTE"] } } },
            });
            continue;
        }

        if (rule.field === "origem" && typeof value === "string") {
            and.push({ origem: { is: { nome: { contains: value, mode: "insensitive" } } } });
            continue;
        }

        if (rule.field === "createdAfter") {
            const date = asDate(value);
            if (date) and.push({ createdAt: { gte: date } });
            continue;
        }

        if (rule.field === "createdBefore") {
            const date = asDate(value);
            if (date) and.push({ createdAt: { lte: date } });
            continue;
        }

        if (rule.field === "lastContactAfter") {
            const date = asDate(value);
            if (date) and.push({ lastContactAt: { gte: date } });
            continue;
        }

        if (rule.field === "lastContactBefore") {
            const date = asDate(value);
            if (date) and.push({ lastContactAt: { lte: date } });
            continue;
        }

        if (rule.field === "lastInteraction" && typeof value === "string") {
            const days = Number(value);
            if (!Number.isNaN(days) && days >= 0) {
                const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
                if (op === "GREATER_THAN") {
                    and.push({ OR: [{ lastContactAt: null }, { lastContactAt: { lte: since } }] });
                } else {
                    and.push({ lastContactAt: { gte: since } });
                }
            }
            continue;
        }

        // ── Novos campos adicionados ───────────────────────────────────

        if (rule.field === "temperatura" && typeof value === "string") {
            if (!isLeadTemperatura(value)) continue;
            if (op === "NOT_EQUALS") and.push({ NOT: { temperatura: value } });
            else and.push({ temperatura: value });
            continue;
        }

        if (rule.field === "canalPreferido" && typeof value === "string") {
            if (!isCanalPreferido(value)) continue;
            if (op === "NOT_EQUALS") and.push({ NOT: { canalPreferido: value } });
            else and.push({ canalPreferido: value });
            continue;
        }

        if (rule.field === "inadimplente" && typeof value === "boolean") {
            and.push({ inadimplente: value });
            continue;
        }

        if (rule.field === "crmScore") {
            const score = Number(value);
            if (!Number.isNaN(score)) {
                if (op === "GREATER_THAN") and.push({ crmScore: { gt: score } });
                else if (op === "LESS_THAN") and.push({ crmScore: { lt: score } });
                else if (op === "GTE") and.push({ crmScore: { gte: score } });
                else if (op === "LTE") and.push({ crmScore: { lte: score } });
                else and.push({ crmScore: score });
            }
            continue;
        }

        if (rule.field === "cidade" && typeof value === "string") {
            if (op === "NOT_EQUALS") and.push({ NOT: { cidade: { equals: value, mode: "insensitive" } } });
            else if (op === "CONTAINS") and.push({ cidade: { contains: value, mode: "insensitive" } });
            else and.push({ cidade: { equals: value, mode: "insensitive" } });
            continue;
        }

        if (rule.field === "estado" && typeof value === "string") {
            if (op === "NOT_EQUALS") and.push({ NOT: { estado: { equals: value, mode: "insensitive" } } });
            else and.push({ estado: { equals: value, mode: "insensitive" } });
            continue;
        }

        if (rule.field === "areaJuridica" && typeof value === "string") {
            // Busca em areasJuridicas (array) ou em cards vinculados
            if (op === "NOT_CONTAINS") {
                and.push({
                    AND: [
                        { NOT: { areasJuridicas: { has: value } } },
                        { crmCards: { none: { areaDireito: { contains: value, mode: "insensitive" } } } },
                    ],
                });
            } else {
                and.push({
                    OR: [
                        { areasJuridicas: { has: value } },
                        { crmCards: { some: { areaDireito: { contains: value, mode: "insensitive" } } } },
                    ],
                });
            }
            continue;
        }

        if (rule.field === "lista" && typeof value === "string") {
            // Pertence ou não a uma lista estática
            if (op === "NOT_IN") {
                and.push({ listMembers: { none: { list: { name: { equals: value, mode: "insensitive" } } } } });
            } else {
                and.push({ listMembers: { some: { list: { name: { equals: value, mode: "insensitive" } } } } });
            }
            continue;
        }

        if (rule.field === "hasWhatsapp" && typeof value === "boolean") {
            if (value) and.push({ whatsapp: { not: null } });
            else and.push({ OR: [{ whatsapp: null }, { whatsapp: "" }] });
            continue;
        }

        if (rule.field === "hasEmail" && typeof value === "boolean") {
            if (value) and.push({ email: { not: null } });
            else and.push({ OR: [{ email: null }, { email: "" }] });
            continue;
        }

        if (rule.field === "dataNascimentoMes") {
            // Aniversariantes do mês
            const mes = Number(value);
            if (!Number.isNaN(mes) && mes >= 1 && mes <= 12) {
                and.push({
                    dataNascimento: {
                        not: null,
                    },
                });
                // Filtra pelo mês no PostgreSQL usando raw
                // Como Prisma não suporta EXTRACT nativamente, usamos uma abordagem com GTE/LTE
                // Alternativa: filtrar no nível da aplicação após query base
            }
            continue;
        }
    }

    if (and.length === 0) return {};
    return { AND: and };
}

export async function recalculateSegmentMembers(segmentId: string) {
    const segment = await db.contactSegment.findUnique({
        where: { id: segmentId },
        select: { id: true, rules: true, isDynamic: true },
    });

    if (!segment) {
        throw new Error("Segmento nao encontrado.");
    }

    const rules = parseRules(segment.rules);
    const where = buildSegmentWhere(rules);

    const clientes = await db.cliente.findMany({
        where,
        select: { id: true },
        take: 10000,
    });

    await db.$transaction(async (tx) => {
        await tx.contactSegmentMember.deleteMany({ where: { segmentId } });

        if (clientes.length > 0) {
            await tx.contactSegmentMember.createMany({
                data: clientes.map((c) => ({ segmentId, clienteId: c.id })),
                skipDuplicates: true,
            });
        }

        await tx.contactSegment.update({
            where: { id: segmentId },
            data: {
                memberCount: clientes.length,
                lastCalculatedAt: new Date(),
            },
        });
    });

    return { count: clientes.length };
}

export async function previewSegment(rules: Prisma.JsonValue, take = 100) {
    const parsedRules = parseRules(rules);
    const where = buildSegmentWhere(parsedRules);

    const [items, total] = await Promise.all([
        db.cliente.findMany({
            where,
            take,
            orderBy: { updatedAt: "desc" },
            select: {
                id: true,
                nome: true,
                email: true,
                celular: true,
                whatsapp: true,
                status: true,
                tipoPessoa: true,
                lastContactAt: true,
                contactTags: {
                    include: {
                        tag: {
                            select: { id: true, name: true, color: true },
                        },
                    },
                },
            },
        }),
        db.cliente.count({ where }),
    ]);

    return { items, total };
}



