import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verificarTokenPortal } from "@/lib/portal/portal-token";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.json({ error: "Token obrigatório" }, { status: 401 });
        }

        const verificacao = await verificarTokenPortal(token);
        if (!verificacao.ok) {
            return NextResponse.json({ error: verificacao.error }, { status: 401 });
        }

        const { clienteId } = verificacao;

        // Busca dados completos do cliente para o portal
        const cliente = await db.cliente.findUnique({
            where: { id: clienteId },
            select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                celular: true,
                processos: {
                    select: {
                        id: true,
                        numeroCnj: true,
                        status: true,
                        resultado: true,
                        valorCausa: true,
                        dataDistribuicao: true,
                        dataEncerramento: true,
                        objeto: true,
                        vara: true,
                        comarca: true,
                        tribunal: true,
                        advogado: {
                            select: {
                                oab: true,
                                user: { select: { name: true } },
                            },
                        },
                        tipoAcao: { select: { nome: true } },
                        agendamentos: {
                            where: {
                                status: { in: ["PENDENTE", "VISUALIZADO"] },
                                dataInicio: { gte: new Date() },
                            },
                            select: {
                                id: true,
                                tipo: true,
                                titulo: true,
                                dataInicio: true,
                                local: true,
                            },
                            orderBy: { dataInicio: "asc" },
                            take: 5,
                        },
                    },
                    orderBy: { createdAt: "desc" },
                    take: 20,
                },
                faturas: {
                    select: {
                        id: true,
                        numero: true,
                        status: true,
                        valorTotal: true,
                        dataEmissao: true,
                        dataVencimento: true,
                        dataPagamento: true,
                        descricao: true,
                        boletoUrl: true,
                        pixCode: true,
                        gatewayId: true,
                    },
                    orderBy: { dataVencimento: "desc" },
                    take: 20,
                },
            },
        });

        if (!cliente) {
            return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
        }

        // Calcula resumo financeiro
        const faturas = cliente.faturas;
        const totalPago = faturas
            .filter((f) => f.status === "PAGA")
            .reduce((acc, f) => acc + Number(f.valorTotal), 0);
        const totalPendente = faturas
            .filter((f) => f.status === "PENDENTE" || f.status === "ATRASADA")
            .reduce((acc, f) => acc + Number(f.valorTotal), 0);

        // Conta processos por status
        const processosAtivos = cliente.processos.filter(
            (p) => !["ENCERRADO", "ARQUIVADO"].includes(p.status)
        ).length;
        const processosEncerrados = cliente.processos.filter((p) =>
            ["ENCERRADO", "ARQUIVADO"].includes(p.status)
        ).length;

        return NextResponse.json({
            cliente: {
                id: cliente.id,
                nome: cliente.nome,
                email: cliente.email,
            },
            resumo: {
                totalProcessos: cliente.processos.length,
                processosAtivos,
                processosEncerrados,
                totalPago,
                totalPendente,
                faturasPendentes: faturas.filter(
                    (f) => f.status === "PENDENTE" || f.status === "ATRASADA"
                ).length,
            },
            processos: cliente.processos.map((p) => ({
                ...p,
                valorCausa: p.valorCausa ? Number(p.valorCausa) : null,
            })),
            faturas: faturas.map((f) => ({
                ...f,
                valorTotal: Number(f.valorTotal),
            })),
        });
    } catch (error) {
        console.error("[Portal Dados] Erro:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
