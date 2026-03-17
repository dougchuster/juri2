"use server";

import { cache } from "react";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { checkRateLimitAsync, getClientIp } from "@/lib/middleware/rate-limit";

const SUPER_ADMIN_INACTIVITY_MS = 2 * 60 * 60 * 1000; // 2 hours
const SUPER_ADMIN_COOKIE_MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 days
const SUPER_ADMIN_COOKIE_NAME = "super_admin_session_token";

async function setSuperAdminSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SUPER_ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SUPER_ADMIN_COOKIE_MAX_AGE_SEC,
    path: "/",
  });
}

async function clearSuperAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SUPER_ADMIN_COOKIE_NAME);
}

/**
 * getSuperAdminSession
 * Cached server action to get the current super admin session
 * Returns SuperAdmin + session info or null if not authenticated
 */
export const getSuperAdminSession = cache(async () => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SUPER_ADMIN_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    // Fetch session from database
    const session = await db.superAdminSession.findUnique({
      where: { token },
      include: { superAdmin: true },
    });

    if (!session) {
      clearSuperAdminSessionCookie();
      return null;
    }

    // Check if session expired
    if (new Date() > session.expiresAt) {
      await db.superAdminSession.delete({ where: { id: session.id } });
      clearSuperAdminSessionCookie();
      return null;
    }

    // Check if super admin is active
    if (!session.superAdmin.ativo) {
      clearSuperAdminSessionCookie();
      return null;
    }

    // Extend session if less than 30 minutes left
    const timeLeft = session.expiresAt.getTime() - Date.now();
    if (timeLeft < 30 * 60 * 1000) {
      const newExpiresAt = new Date(Date.now() + SUPER_ADMIN_INACTIVITY_MS);
      await db.superAdminSession.update({
        where: { id: session.id },
        data: { expiresAt: newExpiresAt },
      });
    }

    return {
      superAdmin: session.superAdmin,
      sessionId: session.id,
    };
  } catch (error) {
    console.error("[getSuperAdminSession] Error:", error);
    return null;
  }
});

/**
 * rootAdminLogin
 * Authenticates a super admin with email and password
 */
export async function rootAdminLogin(email: string, password: string) {
  try {
    const headersList = await headers();
    const clientIp = getClientIp(headersList);

    // Rate limiting: 5 attempts per 15 minutes per email
    const rateLimitKey = `root-admin-login:${email}`;
    const rateLimitResult = await checkRateLimitAsync(rateLimitKey, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: "Too many login attempts. Please try again later.",
      };
    }

    // Fetch super admin
    const superAdmin = await db.superAdmin.findUnique({
      where: { email },
    });

    if (!superAdmin || !superAdmin.ativo) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, superAdmin.senhaHash);
    if (!isPasswordValid) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Create session
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SUPER_ADMIN_INACTIVITY_MS);

    const loginHeaders = await headers();
    const userAgent = loginHeaders.get("user-agent") || "unknown";

    await db.superAdminSession.create({
      data: {
        token,
        superAdminId: superAdmin.id,
        expiresAt,
        ipAddress: clientIp,
        userAgent,
      },
    });

    // Update last login
    await db.superAdmin.update({
      where: { id: superAdmin.id },
      data: { ultimoLogin: new Date() },
    });

    // Log the login
    await db.superAdminLog.create({
      data: {
        superAdminId: superAdmin.id,
        acao: "LOGIN",
        ipAddress: clientIp,
      },
    });

    // Set cookie
    await setSuperAdminSessionCookie(token);

    return {
      success: true,
      message: "Logged in successfully",
    };
  } catch (error) {
    console.error("[rootAdminLogin] Error:", error);
    return {
      success: false,
      error: "An error occurred during login",
    };
  }
}

/**
 * rootAdminLogout
 * Logs out the current super admin
 */
export async function rootAdminLogout() {
  try {
    const session = await getSuperAdminSession();

    if (session) {
      // Log the logout
      await db.superAdminLog.create({
        data: {
          superAdminId: session.superAdmin.id,
          acao: "LOGOUT",
        },
      });

      // Delete the session
      await db.superAdminSession.delete({
        where: { id: session.sessionId },
      });
    }

    // Clear cookie
    await clearSuperAdminSessionCookie();

    redirect("/admin-login");
  } catch (error) {
    console.error("[rootAdminLogout] Error:", error);
    redirect("/admin-login");
  }
}

/**
 * Requires super admin session
 * Throws if not authenticated
 */
export async function requireSuperAdminSession() {
  const session = await getSuperAdminSession();
  if (!session) {
    redirect("/admin-login");
  }
  return session;
}
