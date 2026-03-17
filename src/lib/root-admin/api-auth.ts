import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SuperAdmin, SuperAdminSession } from "@/generated/prisma";

export interface SuperAdminApiSession {
  superAdmin: SuperAdmin;
  session: SuperAdminSession;
}

/**
 * Require super admin API authentication
 * Validates super_admin_session_token cookie
 * Returns { session, error } tuple
 * If error is set, return it directly from the API route
 */
export async function requireSuperAdminApi(
  request: NextRequest
): Promise<{ session: SuperAdminApiSession | null; error: NextResponse | null }> {
  try {
    const token = request.cookies.get("super_admin_session_token")?.value;

    if (!token) {
      return {
        session: null,
        error: NextResponse.json(
          { error: "Unauthorized: No session token" },
          { status: 401 }
        ),
      };
    }

    // Fetch session from database
    const dbSession = await db.superAdminSession.findUnique({
      where: { token },
      include: { superAdmin: true },
    });

    if (!dbSession) {
      return {
        session: null,
        error: NextResponse.json(
          { error: "Unauthorized: Invalid token" },
          { status: 401 }
        ),
      };
    }

    // Check if session expired
    if (new Date() > dbSession.expiresAt) {
      return {
        session: null,
        error: NextResponse.json(
          { error: "Unauthorized: Session expired" },
          { status: 401 }
        ),
      };
    }

    // Check if super admin is active
    if (!dbSession.superAdmin.ativo) {
      return {
        session: null,
        error: NextResponse.json(
          { error: "Unauthorized: Account inactive" },
          { status: 401 }
        ),
      };
    }

    return {
      session: {
        superAdmin: dbSession.superAdmin,
        session: dbSession,
      },
      error: null,
    };
  } catch (error) {
    console.error("[requireSuperAdminApi] Error:", error);
    return {
      session: null,
      error: NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      ),
    };
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIpFromRequest(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
