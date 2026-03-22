import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const canal = searchParams.get("canal");
    const search = searchParams.get("search")?.trim() || undefined;
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") || 50)));

    const where: Record<string, unknown> = {
      status: { in: ["OPEN", "CLOSED"] },
    };
    if (canal && canal !== "all") where.canal = canal;
    if (search) {
      where.OR = [
        { cliente: { is: { nome: { contains: search, mode: "insensitive" } } } },
        { cliente: { is: { email: { contains: search, mode: "insensitive" } } } },
        { cliente: { is: { celular: { contains: search } } } },
        { cliente: { is: { whatsapp: { contains: search } } } },
        { subject: { contains: search, mode: "insensitive" } },
        { processo: { is: { numeroCnj: { contains: search, mode: "insensitive" } } } },
        { assignedTo: { is: { name: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const [conversations, total] = await Promise.all([
      db.conversation.findMany({
        where,
        include: {
          cliente: { select: { id: true, nome: true, email: true, celular: true, whatsapp: true } },
          processo: { select: { id: true, numeroCnj: true } },
          assignedTo: { select: { id: true, name: true } },
          atendimento: {
            select: {
              advogado: {
                select: {
                  user: { select: { id: true, name: true } },
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { content: true, direction: true, createdAt: true, status: true, canal: true },
          },
        },
        orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.conversation.count({ where }),
    ]);

    return NextResponse.json({
      items: conversations.map((conversation) => ({
        ...conversation,
        assignedTo: conversation.assignedTo ?? conversation.atendimento?.advogado.user ?? null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[API] Error fetching conversations:", error);
    return NextResponse.json({ error: "Erro interno ao buscar conversas" }, { status: 500 });
  }
}
