import "server-only";
import { db } from "@/lib/db";
import type { Role, StatusFatura } from "@/generated/prisma";

export interface FinanceiroVisibilityScope {
    role?: Role | null;
    advogadoId?: string | null;
}

function getScopedAdvogadoId(scope?: FinanceiroVisibilityScope) {
    if (!scope || scope.role !== "ADVOGADO") return null;
    return scope.advogadoId || null;
}

// Honorarios
export async function getHonorarios(
    filters: { search?: string; processoId?: string; page?: number } = {},
    scope?: FinanceiroVisibilityScope
) {
    const { search, processoId, page = 1, pageSize = 15 } = { pageSize: 15, ...filters };
    const where: Record<string, unknown> = {};
    const scopedAdvogadoId = getScopedAdvogadoId(scope);

    if (scope?.role === "ADVOGADO" && !scopedAdvogadoId) {
        return { honorarios: [], total: 0, page, totalPages: 0 };
    }

    if (search) {
        where.OR = [
            { processo: { numeroCnj: { contains: search } } },
            { cliente: { nome: { contains: search, mode: "insensitive" } } },
        ];
    }
    if (processoId) where.processoId = processoId;
    if (scopedAdvogadoId) where.processo = { advogadoId: scopedAdvogadoId };

    const [honorarios, total] = await Promise.all([
        db.honorario.findMany({
            where,
            include: {
                processo: { select: { id: true, numeroCnj: true } },
                cliente: { select: { id: true, nome: true } },
                _count: { select: { faturas: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        db.honorario.count({ where }),
    ]);

    return { honorarios, total, page, totalPages: Math.ceil(total / pageSize) };
}

// Faturas
export async function getFaturas(
    filters: { search?: string; status?: StatusFatura; page?: number } = {},
    scope?: FinanceiroVisibilityScope
) {
    const { search, status, page = 1, pageSize = 15 } = { pageSize: 15, ...filters };
    const where: Record<string, unknown> = {};
    const scopedAdvogadoId = getScopedAdvogadoId(scope);

    if (scope?.role === "ADVOGADO" && !scopedAdvogadoId) {
        return { faturas: [], total: 0, page, totalPages: 0 };
    }

    if (search) {
        where.OR = [
            { numero: { contains: search } },
            { cliente: { nome: { contains: search, mode: "insensitive" } } },
        ];
    }
    if (status) where.status = status;
    if (scopedAdvogadoId) {
        where.honorario = { is: { processo: { advogadoId: scopedAdvogadoId } } };
    }

    const [faturas, total] = await Promise.all([
        db.fatura.findMany({
            where,
            include: {
                cliente: { select: { id: true, nome: true } },
                honorario: { select: { id: true, tipo: true } },
                _count: { select: { parcelas: true } },
            },
            orderBy: { dataVencimento: "asc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        db.fatura.count({ where }),
    ]);

    return { faturas, total, page, totalPages: Math.ceil(total / pageSize) };
}

// Contas a pagar
export async function getContasPagar(
    filters: { search?: string; pago?: boolean; page?: number } = {},
    scope?: FinanceiroVisibilityScope
) {
    const { search, pago, page = 1, pageSize = 15 } = { pageSize: 15, ...filters };
    const where: Record<string, unknown> = {};
    const scopedAdvogadoId = getScopedAdvogadoId(scope);

    if (scope?.role === "ADVOGADO" && !scopedAdvogadoId) {
        return { contas: [], total: 0, page, totalPages: 0 };
    }

    if (search) {
        where.descricao = { contains: search, mode: "insensitive" };
    }
    if (pago !== undefined) where.pago = pago;
    if (scopedAdvogadoId) {
        where.processo = { is: { advogadoId: scopedAdvogadoId } };
    }

    const [contas, total] = await Promise.all([
        db.contaPagar.findMany({
            where,
            include: {
                processo: { select: { id: true, numeroCnj: true } },
                centroCusto: { select: { id: true, nome: true } },
            },
            orderBy: { dataVencimento: "asc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        db.contaPagar.count({ where }),
    ]);

    return { contas, total, page, totalPages: Math.ceil(total / pageSize) };
}

// Stats
export async function getFinanceiroStats(scope?: FinanceiroVisibilityScope) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const scopedAdvogadoId = getScopedAdvogadoId(scope);
    if (scope?.role === "ADVOGADO" && !scopedAdvogadoId) {
        return {
            totalReceber: 0,
            totalPagar: 0,
            faturasAtrasadas: 0,
            honorariosAtivos: 0,
            faturasPendentes: 0,
            contasPendentes: 0,
        };
    }

    const honorarioScope = scopedAdvogadoId ? { processo: { advogadoId: scopedAdvogadoId } } : {};
    const faturaScope = scopedAdvogadoId
        ? { honorario: { is: { processo: { advogadoId: scopedAdvogadoId } } } }
        : {};
    const contaPagarScope = scopedAdvogadoId ? { processo: { is: { advogadoId: scopedAdvogadoId } } } : {};

    const [
        totalReceber,
        totalPagar,
        faturasAtrasadas,
        honorariosAtivos,
        faturasPendentes,
        contasPendentes,
    ] = await Promise.all([
        db.fatura.aggregate({
            where: { ...faturaScope, status: { in: ["PENDENTE", "ATRASADA"] } },
            _sum: { valorTotal: true },
        }),
        db.contaPagar.aggregate({
            where: { ...contaPagarScope, pago: false },
            _sum: { valor: true },
        }),
        db.fatura.count({
            where: { ...faturaScope, status: "PENDENTE", dataVencimento: { lt: today } },
        }),
        db.honorario.count({ where: { ...honorarioScope, status: "ATIVO" } }),
        db.fatura.count({ where: { ...faturaScope, status: { in: ["PENDENTE", "ATRASADA"] } } }),
        db.contaPagar.count({ where: { ...contaPagarScope, pago: false } }),
    ]);

    return {
        totalReceber: totalReceber._sum.valorTotal?.toNumber() || 0,
        totalPagar: totalPagar._sum.valor?.toNumber() || 0,
        faturasAtrasadas,
        honorariosAtivos,
        faturasPendentes,
        contasPendentes,
    };
}

// Reference data
export async function getCentrosCusto() {
    return db.centroCusto.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
}

export async function getContasBancarias() {
    return db.contaBancaria.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
}
