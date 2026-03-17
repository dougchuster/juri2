import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdminApi } from "@/lib/root-admin/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireSuperAdminApi(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const superAdminId = searchParams.get("superAdminId");
    const acao = searchParams.get("acao");
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
    const page = Math.max(1, Number(searchParams.get("page") || 1));

    // Build where clause
    interface LogWhere {
      superAdminId?: string;
      acao?: {
        contains: string;
        mode: "insensitive";
      };
    }
    const where: LogWhere = {};

    if (superAdminId) {
      where.superAdminId = superAdminId;
    }

    if (acao) {
      where.acao = {
        contains: acao,
        mode: "insensitive",
      };
    }

    // Fetch data in parallel
    const [logs, total] = await Promise.all([
      db.superAdminLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          superAdmin: {
            select: { id: true, email: true, nome: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.superAdminLog.count({ where }),
    ]);

    return NextResponse.json({
      logs: JSON.parse(JSON.stringify(logs)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[GET /logs] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
