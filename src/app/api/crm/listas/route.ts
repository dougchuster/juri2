import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCRMAuth } from "@/lib/auth/crm-auth";

const criarListaSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  folderId: z.string().cuid().optional().nullable(),
});

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireCRMAuth();
  if (!auth.ok) return auth.response;

  const escritorioId = auth.user.escritorioId;
  if (!escritorioId) return NextResponse.json({ error: "Escritório não encontrado." }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId");

  const [listas, pastas] = await Promise.all([
    db.cRMList.findMany({
      where: {
        escritorioId,
        ...(folderId ? { folderId } : {}),
      },
      include: {
        folder: { select: { id: true, name: true, color: true } },
        _count: { select: { members: true } },
      },
      orderBy: [{ name: "asc" }],
    }),
    db.cRMListFolder.findMany({
      where: { escritorioId },
      include: { _count: { select: { lists: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ listas, pastas });
}

export async function POST(req: NextRequest) {
  const auth = await requireCRMAuth();
  if (!auth.ok) return auth.response;

  const escritorioId = auth.user.escritorioId;
  if (!escritorioId) return NextResponse.json({ error: "Escritório não encontrado." }, { status: 400 });

  const body = await req.json();
  const parsed = criarListaSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { name, description, color, folderId } = parsed.data;

  try {
    const lista = await db.cRMList.create({
      data: {
        escritorioId,
        name,
        description,
        color: color ?? "#3B82F6",
        folderId: folderId ?? null,
      },
      include: {
        folder: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
    });
    return NextResponse.json(lista, { status: 201 });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Já existe uma lista com esse nome." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro ao criar lista." }, { status: 500 });
  }
}
