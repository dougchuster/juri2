import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCRMAuth } from "@/lib/auth/crm-auth";

export const dynamic = "force-dynamic";

const addMembrosSchema = z.object({
  clienteIds: z.array(z.string()).min(1).max(500),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCRMAuth();
  if (!auth.ok) return auth.response;

  const escritorioId = auth.user.escritorioId;
  if (!escritorioId) return NextResponse.json({ error: "Escritório não encontrado." }, { status: 400 });

  const { id } = await params;

  const lista = await db.cRMList.findFirst({ where: { id, escritorioId } });
  if (!lista) return NextResponse.json({ error: "Lista não encontrada." }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const perPage = Math.min(100, Math.max(1, Number(searchParams.get("perPage") ?? "50")));
  const skip = (page - 1) * perPage;

  const [total, membros] = await Promise.all([
    db.cRMListMember.count({ where: { listId: id } }),
    db.cRMListMember.findMany({
      where: { listId: id },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            email: true,
            whatsapp: true,
            telefone: true,
            crmRelationship: true,
            crmScore: true,
            status: true,
            temperatura: true,
            cidade: true,
            estado: true,
          },
        },
      },
      orderBy: { addedAt: "desc" },
      skip,
      take: perPage,
    }),
  ]);

  return NextResponse.json({
    membros,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCRMAuth();
  if (!auth.ok) return auth.response;

  const escritorioId = auth.user.escritorioId;
  if (!escritorioId) return NextResponse.json({ error: "Escritório não encontrado." }, { status: 400 });

  const { id } = await params;

  const lista = await db.cRMList.findFirst({ where: { id, escritorioId } });
  if (!lista) return NextResponse.json({ error: "Lista não encontrada." }, { status: 404 });

  const body = await req.json();
  const parsed = addMembrosSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "clienteIds inválidos." }, { status: 400 });

  await db.cRMListMember.createMany({
    data: parsed.data.clienteIds.map((clienteId) => ({
      listId: id,
      clienteId,
      addedBy: auth.user.id,
    })),
    skipDuplicates: true,
  });

  const total = await db.cRMListMember.count({ where: { listId: id } });
  return NextResponse.json({ ok: true, total });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCRMAuth();
  if (!auth.ok) return auth.response;

  const escritorioId = auth.user.escritorioId;
  if (!escritorioId) return NextResponse.json({ error: "Escritório não encontrado." }, { status: 400 });

  const { id } = await params;

  const lista = await db.cRMList.findFirst({ where: { id, escritorioId } });
  if (!lista) return NextResponse.json({ error: "Lista não encontrada." }, { status: 404 });

  const body = await req.json();
  const parsed = addMembrosSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "clienteIds inválidos." }, { status: 400 });

  await db.cRMListMember.deleteMany({
    where: { listId: id, clienteId: { in: parsed.data.clienteIds } },
  });

  const total = await db.cRMListMember.count({ where: { listId: id } });
  return NextResponse.json({ ok: true, total });
}
