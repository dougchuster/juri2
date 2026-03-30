import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdminApi } from "@/lib/root-admin/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { error } = await requireSuperAdminApi(request);
  if (error) return error;

  try {
    const dbStart = Date.now();
    const [
      totalEscritorios,
      totalUsers,
      totalProcessos,
      totalDocumentos,
      totalAssinaturas,
    ] = await Promise.all([
      db.escritorio.count(),
      db.user.count(),
      db.processo.count().catch(() => 0),
      db.documento.count().catch(() => 0),
      db.assinatura.count().catch(() => 0),
    ]);
    const dbLatency = Date.now() - dbStart;

    return NextResponse.json({
      version: "0.1.0",
      nodeVersion: process.version,
      platform: process.platform,
      uptime: Math.floor(process.uptime()),
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      memoryTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      database: {
        status: "ok",
        latencyMs: dbLatency,
        counts: {
          escritorios: totalEscritorios,
          users: totalUsers,
          processos: totalProcessos,
          documentos: totalDocumentos,
          assinaturas: totalAssinaturas,
        },
      },
      environment: process.env.NODE_ENV || "unknown",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[sistema/health] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch system health", database: { status: "error" } },
      { status: 500 }
    );
  }
}
