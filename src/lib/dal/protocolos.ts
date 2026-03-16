import { db } from "@/lib/db";

export interface ProtocoloFilters {
    search?: string;
    tipo?: string;
    status?: string;
    processoId?: string;
    page?: number;
    pageSize?: number;
}

export async function getProtocolos(filters: ProtocoloFilters = {}) {
    const { search, tipo, status, processoId, page = 1, pageSize = 10 } = filters;

    const where: Record<string, unknown> = {};

    if (search) {
        where.OR = [
            { remetente: { contains: search, mode: "insensitive" } },
            { destinatario: { contains: search, mode: "insensitive" } },
            { codigoBarras: { contains: search, mode: "insensitive" } },
            { localizacao: { contains: search, mode: "insensitive" } },
        ];
    }
    if (tipo) where.tipo = tipo;
    if (status) where.status = status;
    if (processoId) where.processoId = processoId;

    const [protocolos, total] = await Promise.all([
        db.protocolo.findMany({
            where,
            include: {
                processo: { select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } } },
                criadoPor: { select: { name: true } },
                historico: { orderBy: { createdAt: "desc" }, take: 1 },
            },
            orderBy: { dataEntrada: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        db.protocolo.count({ where }),
    ]);

    return { protocolos, total, page, totalPages: Math.ceil(total / pageSize) };
}

export async function getProtocoloStats() {
    const [total, pendentes, transito, entregues, devolvidos] = await Promise.all([
        db.protocolo.count(),
        db.protocolo.count({ where: { status: "PENDENTE" } }),
        db.protocolo.count({ where: { status: "TRANSITO" } }),
        db.protocolo.count({ where: { status: "ENTREGUE" } }),
        db.protocolo.count({ where: { status: "DEVOLVIDO" } }),
    ]);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const atrasados = await db.protocolo.count({
        where: {
            status: { notIn: ["ENTREGUE", "DEVOLVIDO"] },
            dataPrevistaSaida: { lt: hoje },
        },
    });

    return { total, pendentes, transito, entregues, devolvidos, atrasados };
}

export async function getProtocoloById(id: string) {
    return db.protocolo.findUnique({
        where: { id },
        include: {
            processo: { select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } } },
            criadoPor: { select: { name: true } },
            historico: { orderBy: { createdAt: "desc" } },
        },
    });
}
