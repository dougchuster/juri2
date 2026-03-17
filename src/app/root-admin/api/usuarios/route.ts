import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdminApi } from "@/lib/root-admin/api-auth";
import { Role } from "@/generated/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { requestPasswordReset } from "@/actions/password-reset";
import {
  attachOrganizationToUsers,
  getUserOrganizationMappings,
  setUserOrganizationMapping,
  type RootAdminOrgLite,
} from "@/lib/root-admin/user-organization";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireSuperAdminApi(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const isActive = searchParams.get("isActive");
    const organizationId = searchParams.get("organizacaoId") || "";
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 20)));
    const page = Math.max(1, Number(searchParams.get("page") || 1));

    // Build where clause
    interface UserWhere {
      AND?: Array<any>;
      OR?: Array<any>;
      role?: Role;
      isActive?: boolean;
    }
    const where: UserWhere = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role && Object.values(Role).includes(role as Role)) {
      where.role = role as Role;
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      where.isActive = isActive === "true";
    }

    const [users, organizations, mappings] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          advogado: {
            select: { id: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.escritorio.findMany({
        select: {
          id: true,
          nome: true,
          email: true,
          slug: true,
          statusEscritorio: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      getUserOrganizationMappings(),
    ]);

    const usersWithOrganization = attachOrganizationToUsers(
      users,
      organizations as RootAdminOrgLite[],
      mappings
    );

    const filteredByOrganization = organizationId
      ? usersWithOrganization.filter((user) => user.organizationId === organizationId)
      : usersWithOrganization;

    const total = filteredByOrganization.length;
    const totalPages = Math.ceil(total / limit);
    const pagedUsers = filteredByOrganization.slice((page - 1) * limit, page * limit);

    const groupedCounts = Object.values(
      filteredByOrganization.reduce<Record<string, { id: string; nome: string; total: number }>>((acc, user) => {
        const key = user.organizationId || "sem-organizacao";
        const nome = user.organization?.nome || "Sem organização";

        if (!acc[key]) {
          acc[key] = { id: key, nome, total: 0 };
        }

        acc[key].total += 1;
        return acc;
      }, {})
    );

    return NextResponse.json({
      usuarios: JSON.parse(JSON.stringify(pagedUsers)),
      total,
      page,
      pageSize: limit,
      totalPages,
      grupos: groupedCounts,
      organizacoes: JSON.parse(JSON.stringify(organizations)),
    });
  } catch (error) {
    console.error("[GET /usuarios] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireSuperAdminApi(request);
  if (error) return error;

  try {
    const body = await request.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const role = String(body?.role || "ASSISTENTE").trim();
    const organizationId = body?.organizationId ? String(body.organizationId) : null;
    const sendResetRequest = Boolean(body?.sendResetRequest);

    if (!name || !email) {
      return NextResponse.json(
        { error: "Nome e e-mail são obrigatórios." },
        { status: 400 }
      );
    }

    if (!Object.values(Role).includes(role as Role)) {
      return NextResponse.json(
        { error: "Cargo inválido." },
        { status: 400 }
      );
    }

    if (role === "ADVOGADO") {
      return NextResponse.json(
        { error: "Usuário com cargo ADVOGADO deve ser criado no painel administrativo interno." },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Já existe usuário com este e-mail." },
        { status: 409 }
      );
    }

    if (organizationId) {
      const organization = await db.escritorio.findUnique({ where: { id: organizationId }, select: { id: true } });
      if (!organization) {
        return NextResponse.json(
          { error: "Organização informada não foi encontrada." },
          { status: 400 }
        );
      }
    }

    const temporaryPassword = crypto.randomBytes(10).toString("base64url");
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const created = await db.user.create({
      data: {
        name,
        email,
        role: role as Role,
        passwordHash,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (organizationId) {
      await setUserOrganizationMapping(created.id, organizationId);
    }

    if (sendResetRequest) {
      await requestPasswordReset(created.email);
    }

    await db.superAdminLog.create({
      data: {
        superAdminId: session!.superAdmin.id,
        acao: "CRIAR_USUARIO_ROOT_ADMIN",
        detalhes: {
          userId: created.id,
          role: created.role,
          organizationId,
          sendResetRequest,
        },
        ipAddress: "unknown",
      },
    });

    return NextResponse.json(JSON.parse(JSON.stringify(created)), { status: 201 });
  } catch (postError) {
    console.error("[POST /usuarios] Error:", postError);
    return NextResponse.json(
      { error: "Falha ao criar usuário." },
      { status: 500 }
    );
  }
}
