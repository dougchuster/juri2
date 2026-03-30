import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdminApi } from "@/lib/root-admin/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { error } = await requireSuperAdminApi(request);
  if (error) return error;

  try {
    const admins = await db.superAdmin.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        nome: true,
        email: true,
        ativo: true,
        ultimoLogin: true,
        createdAt: true,
        // Never expose senhaHash, mfaSecret
      },
    });

    return NextResponse.json(JSON.parse(JSON.stringify(admins)));
  } catch (err) {
    console.error("[configuracoes/admins] Error:", err);
    return NextResponse.json({ error: "Failed to fetch admins" }, { status: 500 });
  }
}
