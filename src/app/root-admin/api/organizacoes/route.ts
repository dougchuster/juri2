import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdminApi, getClientIpFromRequest } from "@/lib/root-admin/api-auth";
import { StatusEscritorio } from "@/generated/prisma";
import {
  attachOrganizationToUsers,
  getUserOrganizationMappings,
  type RootAdminOrgLite,
} from "@/lib/root-admin/user-organization";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireSuperAdminApi(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 20)));
    const page = Math.max(1, Number(searchParams.get("page") || 1));

    // Build where clause
    interface EscritorioWhere {
      AND?: Array<any>;
      OR?: Array<any>;
      statusEscritorio?: StatusEscritorio;
    }
    const where: EscritorioWhere = {};

    if (search) {
      where.OR = [
        { nome: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { cnpj: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status && Object.values(StatusEscritorio).includes(status as StatusEscritorio)) {
      where.statusEscritorio = status as StatusEscritorio;
    }

    const [orgs, total, users, mappings] = await Promise.all([
      db.escritorio.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          assinaturas: {
            include: { plano: true },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.escritorio.count({ where }),
      db.user.findMany({
        where: { isActive: true },
        select: { id: true, email: true },
      }),
      getUserOrganizationMappings(),
    ]);

    const usersWithOrganization = attachOrganizationToUsers(
      users,
      orgs as RootAdminOrgLite[],
      mappings
    );

    const orgsWithCounts = orgs.map((org) => ({
      ...org,
      userCount: usersWithOrganization.filter((user) => user.organizationId === org.id).length,
    }));

    return NextResponse.json({
      orgs: JSON.parse(JSON.stringify(orgsWithCounts)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[GET /organizacoes] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireSuperAdminApi(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { nome, email, cnpj, telefone, planoId } = body;

    if (!nome || !email) {
      return NextResponse.json(
        { error: "Nome and email are required" },
        { status: 400 }
      );
    }

    // Generate slug from nome
    const slug = nome
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 50);

    // Create escritorio
    const org = await db.escritorio.create({
      data: {
        nome,
        email,
        cnpj: cnpj || undefined,
        telefone: telefone || undefined,
        slug,
        statusEscritorio: "TRIAL",
      },
      include: { assinaturas: { include: { plano: true } } },
    });

    // Create trial subscription if planoId provided
    if (planoId) {
      const plano = await db.plano.findUnique({ where: { id: planoId } });
      if (plano) {
        await db.assinatura.create({
          data: {
            escritorioId: org.id,
            planoId,
            status: "TRIAL",
            inicioTrial: new Date(),
            fimTrial: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            dataInicio: new Date(),
          },
        });
      }
    }

    // Log action
    await db.superAdminLog.create({
      data: {
        superAdminId: session!.superAdmin.id,
        acao: "CRIAR_ORGANIZACAO",
        detalhes: {
          orgId: org.id,
          nome: org.nome,
          email: org.email,
        },
        ipAddress: getClientIpFromRequest(request),
      },
    });

    return NextResponse.json(
      JSON.parse(JSON.stringify(org)),
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /organizacoes] Error:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
