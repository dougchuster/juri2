import { Metadata } from "next";
import { db } from "@/lib/db";
import UserTable from "@/components/root-admin/usuarios/user-table";
import { Role } from "@/generated/prisma";

export const metadata: Metadata = {
  title: "Usuários - Root Admin",
  description: "Gestão global de usuários",
};

export const dynamic = "force-dynamic";

async function getUsers(searchParams: Record<string, string | string[]>) {
  const search = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search || "";
  const role = Array.isArray(searchParams.role) ? searchParams.role[0] : searchParams.role || "";
  const isActive = Array.isArray(searchParams.isActive) ? searchParams.isActive[0] : searchParams.isActive || "";
  const page = Math.max(1, Number(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page || "1"));
  const limit = 20;

  try {
    // Build where clause
    interface UserWhere {
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

    // Fetch data in parallel
    const [users, total, organizacoes] = await Promise.all([
      db.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
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
      db.user.count({ where }),
      db.escritorio.findMany({
        select: {
          id: true,
          nome: true,
        },
        orderBy: { nome: "asc" },
      }),
    ]);

    return {
      usuarios: JSON.parse(JSON.stringify(users)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      organizacoes: JSON.parse(JSON.stringify(organizacoes)),
    };
  } catch (error) {
    console.error("[getUsers] Error:", error);
    return { usuarios: [], total: 0, page: 1, pageSize: 20, totalPages: 0, organizacoes: [] };
  }
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const params = await searchParams;
  const { usuarios, total, page, pageSize, totalPages, organizacoes } = await getUsers(params);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">Usuários</h1>
        <p className="text-[#64748b]">Gerencie todos os usuários da plataforma</p>
      </div>

      {/* Table */}
      <UserTable
        initialUsers={usuarios}
        initialTotal={total}
        initialPage={page}
        initialPageSize={pageSize}
        initialTotalPages={totalPages}
        organizations={organizacoes || []}
        searchParams={params}
      />
    </div>
  );
}
