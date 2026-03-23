import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import { StatusCliente, TipoPessoa } from "@/generated/prisma";
import type { Prisma } from "@/generated/prisma";
import { unauthorized, handleApiError } from "@/lib/api/errors";
import { registrarLogAuditoria } from "@/lib/services/audit-log";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session) return unauthorized();

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || undefined;
        const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 50)));
        const page = Math.max(1, Number(searchParams.get("page") || 1));

        const statusParam = searchParams.get("status");
        const tipoPessoaParam = searchParams.get("tipoPessoa");

        const where: Prisma.ClienteWhereInput = {};

        if (session.escritorioId) {
            where.escritorioId = session.escritorioId;
        }

        if (search) {
            where.OR = [
                { nome: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { cpf: { contains: search } },
                { cnpj: { contains: search } },
                { celular: { contains: search } },
                { whatsapp: { contains: search } },
            ];
        }

        if (statusParam && Object.values(StatusCliente).includes(statusParam as StatusCliente)) {
            where.status = statusParam as StatusCliente;
        }

        if (tipoPessoaParam && Object.values(TipoPessoa).includes(tipoPessoaParam as TipoPessoa)) {
            where.tipoPessoa = tipoPessoaParam as TipoPessoa;
        }

        const [clientes, total] = await Promise.all([
            db.cliente.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { updatedAt: "desc" },
                include: {
                    origem: { select: { id: true, nome: true } },
                    contactTags: {
                        include: {
                            tag: { select: { id: true, name: true, color: true } },
                        },
                    },
                },
            }),
            db.cliente.count({ where }),
        ]);

        return NextResponse.json({
            clientes,
            total,
            page,
            pageSize: limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) return unauthorized();

        const body = await request.json();

        const {
            nome,
            email,
            cpf,
            cnpj,
            tipoPessoa = "FISICA",
            celular,
            whatsapp,
            origemId,
            status = "ATIVO",
            observacoes,
        } = body as {
            nome: string;
            email?: string;
            cpf?: string;
            cnpj?: string;
            tipoPessoa?: string;
            celular?: string;
            whatsapp?: string;
            origemId?: string;
            status?: string;
            observacoes?: string;
        };

        if (!nome?.trim()) {
            return NextResponse.json({ error: "Nome é obrigatório." }, { status: 422 });
        }

        const cliente = await db.cliente.create({
            data: {
                nome: nome.trim(),
                email: email?.trim() || null,
                cpf: cpf?.replace(/\D/g, "") || null,
                cnpj: cnpj?.replace(/\D/g, "") || null,
                tipoPessoa: tipoPessoa as TipoPessoa,
                celular: celular?.trim() || null,
                whatsapp: whatsapp?.trim() || null,
                origemId: origemId || null,
                status: status as StatusCliente,
                observacoes: observacoes?.trim() || null,
                escritorioId: session.escritorioId ?? null,
            },
        });

        // Registrar auditoria
        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "CRIAR",
            entidade: "Cliente",
            entidadeId: cliente.id,
            dadosDepois: { nome: cliente.nome, email: cliente.email, cpf: cliente.cpf },
        }).catch(() => null); // não falhar por causa da auditoria

        return NextResponse.json(cliente, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
