import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCRMAuth } from "@/lib/auth/crm-auth";

const atualizarListaSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  folderId: z.string().cuid().optional().nullable(),
});

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCRMAuth();
  if (!auth.ok) return auth.response;

  const escritorioId = auth.user.escritorioId;
  if (!escritorioId) return NextResponse.json({ error: "Escritório não encontrado." }, { status: 400 });

  const { id } = await params;

  const lista = await db.cRMList.findFirst({
    where: { id, escritorioId },
    include: {
      folder: { select: { id: true, name: true, color: true } },
      _count: { select: { members: true } },
    },
  });

  if (!lista) return NextResponse.json({ error: "Lista não encontrada." }, { status: 404 });
  return NextResponse.json(lista);
}

export async function PATCH(
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

  if (body.action === "addMembers") {
    const clienteIds: string[] = body.clienteIds ?? [];
    if (!Array.isArray(clienteIds) || clienteIds.length === 0) {
      return NextResponse.json({ error: "clienteIds é obrigatório." }, { status: 400 });
    }
    await db.cRMListMember.createMany({
      data: clienteIds.map((clienteId) => ({
        listId: id,
        clienteId,
        addedBy: auth.user.id,
      })),
      skipDuplicates: true,
    });
    const count = await db.cRMListMember.count({ where: { listId: id } });
    return NextResponse.json({ ok: true, totalMembers: count });
  }

  if (body.action === "removeMembers") {
    const clienteIds: string[] = body.clienteIds ?? [];
    if (!Array.isArray(clienteIds) || clienteIds.length === 0) {
      return NextResponse.json({ error: "clienteIds é obrigatório." }, { status: 400 });
    }
    await db.cRMListMember.deleteMany({
      where: { listId: id, clienteId: { in: clienteIds } },
    });
    const count = await db.cRMListMember.count({ where: { listId: id } });
    return NextResponse.json({ ok: true, totalMembers: count });
  }

  const parsed = atualizarListaSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  try {
    const updated = await db.cRMList.update({
      where: { id },
      data: parsed.data,
      include: {
        folder: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar lista." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCRMAuth();
  if (!auth.ok) return auth.response;

  const escritorioId = auth.user.escritorioId;
  if (!escritorioId) return NextResponse.json({ error: "Escritório não encontrado." }, { status: 400 });

  const { id } = await params;

  const lista = await db.cRMList.findFirst({ where: { id, escritorioId } });
  if (!lista) return NextResponse.json({ error: "Lista não encontrada." }, { status: 404 });

  await db.cRMList.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
