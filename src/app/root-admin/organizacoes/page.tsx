import { Metadata } from "next";
import { db } from "@/lib/db";
import OrgTable from "@/components/root-admin/organizacoes/org-table";
import { StatusEscritorio } from "@/generated/prisma";

export const metadata: Metadata = {
  title: "Organizações - Root Admin",
  description: "Gestão de organizações da plataforma",
};

export const dynamic = "force-dynamic";

async function getOrganizations(searchParams: Record<string, string | string[]>) {
  const search = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search || "";
  const status = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status || "";
  const page = Math.max(1, Number(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page || "1"));
  const limit = 20;

  try {
    // Build where clause
    interface EscritorioWhere {
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

    // Fetch data in parallel
    const [orgs, total] = await Promise.all([
      db.escritorio.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          assinaturas: {
            include: { plano: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.escritorio.count({ where }),
    ]);

    // Count users per org
    const orgsWithCounts = await Promise.all(
      orgs.map(async (org) => {
        const userCount = await db.user.count({
          where: { escritorioId: org.id },
        });
        return {
          ...org,
          userCount,
        };
      })
    );

    return {
      orgs: JSON.parse(JSON.stringify(orgsWithCounts)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("[getOrganizations] Error:", error);
    return { orgs: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
  }
}

export default async function OrganizacoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const params = await searchParams;
  const { orgs, total, page, pageSize, totalPages } = await getOrganizations(params);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">Organizações</h1>
          <p className="text-[#64748b]">Gerencie todas as organizações da plataforma</p>
        </div>
        <a
          href="/root-admin/organizacoes/nova"
          className="px-4 py-2 bg-[#6366f1] text-white rounded-lg hover:bg-[#4f46e5] transition-colors"
        >
          Nova Organização
        </a>
      </div>

      {/* Table */}
      <OrgTable
        initialOrgs={orgs}
        initialTotal={total}
        initialPage={page}
        initialPageSize={pageSize}
        initialTotalPages={totalPages}
        searchParams={params}
      />
    </div>
  );
}
