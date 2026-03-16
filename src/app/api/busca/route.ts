import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (!q || q.length < 2) return NextResponse.json({ results: [] });

    const scopedAdvogadoId =
        session.role === "ADVOGADO" ? (session.advogado?.id ?? null) : null;

    const [clientes, processos, tarefas, prazos, documentos] = await Promise.all([
        db.cliente.findMany({
            where: {
                OR: [
                    { nome: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                    { cpf: { contains: q, mode: "insensitive" } },
                    { cnpj: { contains: q, mode: "insensitive" } },
                ],
            },
            select: { id: true, nome: true, tipoPessoa: true, status: true },
            take: 5,
        }),

        db.processo.findMany({
            where: {
                ...(scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {}),
                OR: [
                    { numeroCnj: { contains: q, mode: "insensitive" } },
                    { objeto: { contains: q, mode: "insensitive" } },
                    { tribunal: { contains: q, mode: "insensitive" } },
                    { cliente: { nome: { contains: q, mode: "insensitive" } } },
                ],
            },
            select: {
                id: true,
                numeroCnj: true,
                objeto: true,
                status: true,
                cliente: { select: { nome: true } },
            },
            take: 5,
        }),

        db.tarefa.findMany({
            where: {
                ...(scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {}),
                titulo: { contains: q, mode: "insensitive" },
                status: { not: "CANCELADA" },
            },
            select: { id: true, titulo: true, status: true, prioridade: true },
            take: 4,
        }),

        db.prazo.findMany({
            where: {
                ...(scopedAdvogadoId ? { advogadoId: scopedAdvogadoId } : {}),
                descricao: { contains: q, mode: "insensitive" },
                status: "PENDENTE",
            },
            select: { id: true, descricao: true, dataFatal: true, status: true },
            take: 4,
        }),

        db.documento.findMany({
            where: {
                OR: [
                    { titulo: { contains: q, mode: "insensitive" } },
                    { conteudo: { contains: q, mode: "insensitive" } },
                ],
            },
            select: {
                id: true,
                titulo: true,
                mimeType: true,
                processo: { select: { numeroCnj: true } },
            },
            take: 4,
        }),
    ]);

    return NextResponse.json({
        results: {
            clientes:   clientes.map((c) => ({ ...c, _tipo: "cliente"    as const, href: `/clientes/${c.id}`      })),
            processos:  processos.map((p) => ({ ...p, _tipo: "processo"  as const, href: `/processos/${p.id}`     })),
            tarefas:    tarefas.map((t)   => ({ ...t, _tipo: "tarefa"    as const, href: `/tarefas`               })),
            prazos:     prazos.map((p)    => ({ ...p, titulo: p.descricao, dataLimite: p.dataFatal.toISOString(), _tipo: "prazo"     as const, href: `/prazos`                })),
            documentos: documentos.map((d) => ({ ...d, tipo: d.mimeType,  _tipo: "documento" as const, href: `/documentos/${d.id}`   })),
        },
    });
}
