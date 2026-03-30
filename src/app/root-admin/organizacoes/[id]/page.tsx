import { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { buildInternalAppUrl } from "@/lib/runtime/app-url";
import OrgDetailClient from "@/components/root-admin/organizacoes/org-detail-client";

export const metadata: Metadata = {
  title: "Detalhes da Organização - Root Admin",
  description: "Visualize e gerencie os detalhes da organização",
};

async function getOrgData(id: string) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("super_admin_session_token")?.value;
    const res = await fetch(
      buildInternalAppUrl(`/root-admin/api/organizacoes/${id}`),
      {
        cache: "no-store",
        headers: sessionToken ? { Cookie: `super_admin_session_token=${sessionToken}` } : {},
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getOrgStats(id: string) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("super_admin_session_token")?.value;
    const res = await fetch(
      buildInternalAppUrl(`/root-admin/api/organizacoes/${id}/stats`),
      {
        cache: "no-store",
        headers: sessionToken ? { Cookie: `super_admin_session_token=${sessionToken}` } : {},
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [org, stats] = await Promise.all([getOrgData(id), getOrgStats(id)]);

  if (!org) {
    return (
      <div className="p-8">
        <Link
          href="/root-admin/organizacoes"
          className="flex items-center gap-2 text-[#6366f1] hover:text-[#4f46e5] mb-4"
        >
          <ArrowLeft size={20} />
          Voltar
        </Link>
        <p className="text-[#c7d2e0]">Organização não encontrada</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <Link
        href="/root-admin/organizacoes"
        className="flex items-center gap-2 text-[#6366f1] hover:text-[#4f46e5]"
      >
        <ArrowLeft size={20} />
        Voltar para Organizações
      </Link>
      <OrgDetailClient org={org} stats={stats} />
    </div>
  );
}
