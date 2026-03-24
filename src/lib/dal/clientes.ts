import "server-only";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import type { StatusCliente, TipoPessoa } from "@/generated/prisma";

export interface ClienteFilters {
    search?: string;
    status?: StatusCliente;
    tipoPessoa?: TipoPessoa;
    inadimplente?: boolean;
    origemId?: string;
    page?: number;
    pageSize?: number;
}

export async function getClientes(filters: ClienteFilters = {}) {
    const {
        search,
        status,
        tipoPessoa,
        inadimplente,
        origemId,
        page = 1,
        pageSize = 10,
    } = filters;

    const session = await getSession();
    const where: Record<string, unknown> = {};
    if (session?.escritorioId) where.escritorioId = session.escritorioId;

    if (search) {
        where.OR = [
            { nome: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { cpf: { contains: search } },
            { cnpj: { contains: search } },
            { razaoSocial: { contains: search, mode: "insensitive" } },
            { celular: { contains: search } },
        ];
    }

    if (status) where.status = status;
    if (tipoPessoa) where.tipoPessoa = tipoPessoa;
    if (inadimplente !== undefined) where.inadimplente = inadimplente;
    if (origemId) where.origemId = origemId;

    const [clientes, total] = await Promise.all([
        db.cliente.findMany({
            where,
            include: { origem: true },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        db.cliente.count({ where }),
    ]);

    return {
        clientes,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
}

export async function getClienteById(id: string) {
    const session = await getSession();
    const escritorioId = session?.escritorioId;
    return db.cliente.findFirst({
        where: { id, ...(escritorioId ? { escritorioId } : {}) },
        include: {
            origem: true,
            processos: {
                include: { advogado: { include: { user: true } } },
                orderBy: { createdAt: "desc" },
                take: 10,
            },
            atendimentos: {
                orderBy: { createdAt: "desc" },
                take: 5,
            },
            faturas: {
                orderBy: { dataVencimento: "desc" },
                take: 10,
            },
        },
    });
}

export async function getOrigensCliente() {
    return db.origemCliente.findMany({
        orderBy: { nome: "asc" },
    });
}

export async function getClienteStats() {
    const [total, ativos, prospectos, inadimplentes] = await Promise.all([
        db.cliente.count(),
        db.cliente.count({ where: { status: "ATIVO" } }),
        db.cliente.count({ where: { status: "PROSPECTO" } }),
        db.cliente.count({ where: { inadimplente: true } }),
    ]);

    return { total, ativos, prospectos, inadimplentes };
}
