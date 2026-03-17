import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdminApi, getClientIpFromRequest } from "@/lib/root-admin/api-auth";
import { Role } from "@/generated/prisma";
import bcrypt from "bcryptjs";
import { requestPasswordReset } from "@/actions/password-reset";
import {
  attachOrganizationToUsers,
  deleteUserOrganizationMapping,
  getUserOrganizationMappings,
  setUserOrganizationMapping,
  type RootAdminOrgLite,
} from "@/lib/root-admin/user-organization";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSuperAdminApi(request);
  if (error) return error;

  try {
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        advogado: {
          select: { id: true },
        },
        sessions: {
          select: {
            id: true,
            createdAt: true,
            expiresAt: true,
            ipAddress: true,
            userAgent: true,
          },
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const [organizations, mappings] = await Promise.all([
      db.escritorio.findMany({
        select: { id: true, nome: true, email: true, slug: true },
      }),
      getUserOrganizationMappings(),
    ]);

    const [userWithOrganization] = attachOrganizationToUsers(
      [{ ...user }],
      organizations as RootAdminOrgLite[],
      mappings
    );

    return NextResponse.json(JSON.parse(JSON.stringify(userWithOrganization)));
  } catch (error) {
    console.error("[GET /usuarios/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSuperAdminApi(request);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const action = typeof body?.action === "string" ? body.action : "update";

    // Verify user exists
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    let acao = "ATUALIZAR_USUARIO";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let detalhes: any = {
      userId: id,
      userName: existing.name,
      userEmail: existing.email,
    };

    if (action === "sendResetRequest") {
      await requestPasswordReset(existing.email);
      acao = "SOLICITAR_REDEFINICAO_SENHA_USUARIO";
      detalhes = { ...detalhes, sentTo: existing.email };

      await db.superAdminLog.create({
        data: {
          superAdminId: session!.superAdmin.id,
          acao,
          detalhes,
          ipAddress: getClientIpFromRequest(request),
        },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "resetPassword") {
      const newPassword = String(body?.newPassword || "");
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "A nova senha deve ter ao menos 8 caracteres." },
          { status: 400 }
        );
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db.$transaction([
        db.user.update({
          where: { id },
          data: { passwordHash },
        }),
        db.session.deleteMany({ where: { userId: id } }),
      ]);

      acao = "REDEFINIR_SENHA_USUARIO";
      detalhes = { ...detalhes, resetMode: "manual" };

      await db.superAdminLog.create({
        data: {
          superAdminId: session!.superAdmin.id,
          acao,
          detalhes,
          ipAddress: getClientIpFromRequest(request),
        },
      });

      return NextResponse.json({ success: true });
    }

    const updateData: {
      name?: string;
      role?: Role;
      isActive?: boolean;
    } = {};

    if (body?.name !== undefined) {
      const name = String(body.name || "").trim();
      if (!name) {
        return NextResponse.json(
          { error: "Nome do usuário é obrigatório." },
          { status: 400 }
        );
      }
      updateData.name = name;
    }

    if (body?.role !== undefined) {
      const role = String(body.role);
      if (!Object.values(Role).includes(role as Role)) {
        return NextResponse.json(
          { error: "Cargo inválido." },
          { status: 400 }
        );
      }
      if (role === "ADVOGADO") {
        return NextResponse.json(
          { error: "Usuário com cargo ADVOGADO deve ser gerenciado no painel interno." },
          { status: 400 }
        );
      }
      updateData.role = role as Role;
    }

    if (body?.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json(
          { error: "isActive deve ser boolean." },
          { status: 400 }
        );
      }
      updateData.isActive = body.isActive;
      acao = body.isActive ? "DESBLOQUEAR_USUARIO" : "BLOQUEAR_USUARIO";
    }

    if (Object.keys(updateData).length > 0) {
      await db.user.update({
        where: { id },
        data: updateData,
      });
    }

    if (body?.organizationId !== undefined) {
      const nextOrganizationId = body.organizationId ? String(body.organizationId) : null;

      if (nextOrganizationId) {
        const organization = await db.escritorio.findUnique({ where: { id: nextOrganizationId }, select: { id: true } });
        if (!organization) {
          return NextResponse.json(
            { error: "Organização informada não encontrada." },
            { status: 400 }
          );
        }
      }

      await setUserOrganizationMapping(id, nextOrganizationId);
      detalhes.organizationId = nextOrganizationId;
    }

    const updated = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    // Log action
    await db.superAdminLog.create({
      data: {
        superAdminId: session!.superAdmin.id,
        acao,
        detalhes,
        ipAddress: getClientIpFromRequest(request),
      },
    });

    return NextResponse.json(JSON.parse(JSON.stringify(updated)));
  } catch (error) {
    console.error("[PATCH /usuarios/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSuperAdminApi(request);
  if (error) return error;

  try {
    const { id } = await params;

    const existing = await db.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    await db.$transaction([
      db.user.update({
        where: { id },
        data: { isActive: false },
      }),
      db.advogado.updateMany({
        where: { userId: id },
        data: { ativo: false },
      }),
      db.session.deleteMany({ where: { userId: id } }),
    ]);

    await deleteUserOrganizationMapping(id);

    await db.superAdminLog.create({
      data: {
        superAdminId: session!.superAdmin.id,
        acao: "REMOVER_USUARIO",
        detalhes: {
          userId: id,
          userEmail: existing.email,
          userRole: existing.role,
        },
        ipAddress: getClientIpFromRequest(request),
      },
    });

    return NextResponse.json({ success: true });
  } catch (deleteError) {
    console.error("[DELETE /usuarios/[id]] Error:", deleteError);
    return NextResponse.json(
      { error: "Failed to remove user" },
      { status: 500 }
    );
  }
}
