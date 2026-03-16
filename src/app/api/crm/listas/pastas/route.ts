import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCRMAuth } from "@/lib/auth/crm-auth";

const criarPastaSchema = z.object({
  name: z.string().min(1).max(80),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireCRMAuth();
  if (!auth.ok) return auth.response;

  const escritorioId = auth.user.escritorioId;
  if (!escritorioId) return NextResponse.json({ error: "Escritório não encontrado." }, { status: 400 });

  const pastas = await db.cRMListFolder.findMany({
    where: { escritorioId },
    include: {
      _count: { select: { lists: true } },
      lists: {
        select: { id: true, name: true, color: true, _count: { select: { members: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(pastas);
}

export async function POST(req: NextRequest) {
  const auth = await requireCRMAuth();
  if (!auth.ok) return auth.response;

  const escritorioId = auth.user.escritorioId;
  if (!escritorioId) return NextResponse.json({ error: "Escritório não encontrado." }, { status: 400 });

  const body = await req.json();
  const parsed = criarPastaSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  try {
    const pasta = await db.cRMListFolder.create({
      data: {
        escritorioId,
        name: parsed.data.name,
        color: parsed.data.color ?? "#6366F1",
      },
    });
    return NextResponse.json(pasta, { status: 201 });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Já existe uma pasta com esse nome." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro ao criar pasta." }, { status: 500 });
  }
}
