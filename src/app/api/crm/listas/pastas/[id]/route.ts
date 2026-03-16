import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCRMAuth } from "@/lib/auth/crm-auth";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCRMAuth();
  if (!auth.ok) return auth.response;

  const escritorioId = auth.user.escritorioId;
  if (!escritorioId) return NextResponse.json({ error: "Escritório não encontrado." }, { status: 400 });

  const { id } = await params;

  const pasta = await db.cRMListFolder.findFirst({ where: { id, escritorioId } });
  if (!pasta) return NextResponse.json({ error: "Pasta não encontrada." }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const updated = await db.cRMListFolder.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
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

  const pasta = await db.cRMListFolder.findFirst({ where: { id, escritorioId } });
  if (!pasta) return NextResponse.json({ error: "Pasta não encontrada." }, { status: 404 });

  // Desvincula as listas desta pasta antes de deletar
  await db.cRMList.updateMany({ where: { folderId: id }, data: { folderId: null } });
  await db.cRMListFolder.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
