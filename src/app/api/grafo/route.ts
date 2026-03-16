import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export interface GrafoNode {
    id: string;
    type: "cliente" | "processo" | "advogado" | "parte";
    label: string;
    sublabel?: string;
    data?: Record<string, unknown>;
}

export interface GrafoEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
}

export interface GrafoData {
    nodes: GrafoNode[];
    edges: GrafoEdge[];
    stats: {
        totalClientes: number;
        totalProcessos: number;
        totalAdvogados: number;
        totalPartes: number;
    };
}

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const clienteId = searchParams.get("clienteId");
        const advogadoId = searchParams.get("advogadoId");
        const processoId = searchParams.get("processoId");
        const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

        const processoWhere: Record<string, unknown> = {};
        if (clienteId) processoWhere.clienteId = clienteId;
        if (advogadoId) processoWhere.advogadoId = advogadoId;
        if (processoId) processoWhere.id = processoId;

        const processos = await db.processo.findMany({
            where: processoWhere,
            take: limit,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                numeroCnj: true,
                tipo: true,
                status: true,
                resultado: true,
                tribunal: true,
                vara: true,
                advogadoId: true,
                clienteId: true,
                advogado: {
                    select: {
                        id: true,
                        oab: true,
                        user: { select: { name: true } },
                    },
                },
                cliente: {
                    select: {
                        id: true,
                        nome: true,
                        tipoPessoa: true,
                    },
                },
                partes: {
                    select: {
                        id: true,
                        nome: true,
                        tipoParte: true,
                        cpfCnpj: true,
                        clienteId: true,
                        cliente: {
                            select: {
                                id: true,
                                nome: true,
                            },
                        },
                    },
                },
                tipoAcao: { select: { nome: true } },
            },
        });

        const nodes: GrafoNode[] = [];
        const edges: GrafoEdge[] = [];

        const addedClientes = new Set<string>();
        const addedAdvogados = new Set<string>();
        const addedPartes = new Set<string>();

        for (const processo of processos) {
            // Nó do processo
            nodes.push({
                id: `processo_${processo.id}`,
                type: "processo",
                label: processo.numeroCnj ?? `Processo #${processo.id.slice(-6)}`,
                sublabel: processo.tipoAcao?.nome ?? processo.tipo,
                data: {
                    status: processo.status,
                    resultado: processo.resultado,
                    tribunal: processo.tribunal,
                    vara: processo.vara,
                },
            });

            // Nó e aresta do cliente
            if (processo.cliente) {
                const clienteNodeId = `cliente_${processo.cliente.id}`;
                if (!addedClientes.has(processo.cliente.id)) {
                    nodes.push({
                        id: clienteNodeId,
                        type: "cliente",
                        label: processo.cliente.nome,
                        sublabel: processo.cliente.tipoPessoa,
                    });
                    addedClientes.add(processo.cliente.id);
                }
                edges.push({
                    id: `edge_cli_proc_${processo.cliente.id}_${processo.id}`,
                    source: clienteNodeId,
                    target: `processo_${processo.id}`,
                    label: "cliente",
                });
            }

            // Nó e aresta do advogado
            if (processo.advogado) {
                const advNodeId = `advogado_${processo.advogado.id}`;
                if (!addedAdvogados.has(processo.advogado.id)) {
                    nodes.push({
                        id: advNodeId,
                        type: "advogado",
                        label: processo.advogado.user.name ?? `OAB ${processo.advogado.oab}`,
                        sublabel: `OAB ${processo.advogado.oab}`,
                    });
                    addedAdvogados.add(processo.advogado.id);
                }
                edges.push({
                    id: `edge_adv_proc_${processo.advogado.id}_${processo.id}`,
                    source: advNodeId,
                    target: `processo_${processo.id}`,
                    label: "advogado",
                });
            }

            // Partes do processo
            for (const parte of processo.partes) {
                const parteLabel = parte.cliente?.nome ?? parte.nome ?? parte.cpfCnpj ?? "Parte";
                const parteNodeId = parte.clienteId
                    ? `cliente_${parte.clienteId}`
                    : `parte_${parte.id}`;

                if (parte.clienteId && !addedClientes.has(parte.clienteId)) {
                    // Parte já é um cliente cadastrado
                    nodes.push({
                        id: parteNodeId,
                        type: "cliente",
                        label: parteLabel,
                        sublabel: "Cliente",
                    });
                    addedClientes.add(parte.clienteId);
                } else if (!parte.clienteId && !addedPartes.has(parte.id)) {
                    nodes.push({
                        id: parteNodeId,
                        type: "parte",
                        label: parteLabel,
                        sublabel: parte.tipoParte,
                        data: { cpfCnpj: parte.cpfCnpj, tipoParte: parte.tipoParte },
                    });
                    addedPartes.add(parte.id);
                }

                edges.push({
                    id: `edge_parte_proc_${parte.id}_${processo.id}`,
                    source: parteNodeId,
                    target: `processo_${processo.id}`,
                    label: parte.tipoParte,
                });
            }
        }

        const data: GrafoData = {
            nodes,
            edges,
            stats: {
                totalClientes: addedClientes.size,
                totalProcessos: processos.length,
                totalAdvogados: addedAdvogados.size,
                totalPartes: addedPartes.size,
            },
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error("[GET /api/grafo]", error);
        return NextResponse.json({ error: "Erro interno ao gerar grafo" }, { status: 500 });
    }
}
