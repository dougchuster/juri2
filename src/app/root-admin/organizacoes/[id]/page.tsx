import { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Detalhes da Organização - Root Admin",
  description: "Visualize os detalhes e estatísticas da organização",
};

async function getOrgData(id: string) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("super_admin_session_token")?.value;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/root-admin/api/organizacoes/${id}`,
      {
        cache: "no-store",
        headers: sessionToken ? { Cookie: `super_admin_session_token=${sessionToken}` } : {},
      }
    );

    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("[getOrgData] Error:", error);
    return null;
  }
}

async function getOrgStats(id: string) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("super_admin_session_token")?.value;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/root-admin/api/organizacoes/${id}/stats`,
      {
        cache: "no-store",
        headers: sessionToken ? { Cookie: `super_admin_session_token=${sessionToken}` } : {},
      }
    );

    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("[getOrgStats] Error:", error);
    return null;
  }
}

const statusMap: Record<string, { label: string; color: string }> = {
  ATIVO: { label: "Ativo", color: "text-green-400" },
  SUSPENSO: { label: "Suspenso", color: "text-amber-400" },
  BLOQUEADO: { label: "Bloqueado", color: "text-red-400" },
  INATIVO: { label: "Inativo", color: "text-gray-400" },
  TRIAL: { label: "Trial", color: "text-indigo-400" },
};

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [org, stats] = await Promise.all([getOrgData(id), getOrgStats(id)]);

  if (!org || !stats) {
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

  const statusInfo = statusMap[org.statusEscritorio] || { label: org.statusEscritorio, color: "text-gray-400" };

  return (
    <div className="p-8 space-y-8">
      <Link
        href="/root-admin/organizacoes"
        className="flex items-center gap-2 text-[#6366f1] hover:text-[#4f46e5]"
      >
        <ArrowLeft size={20} />
        Voltar
      </Link>

      <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">{org.nome}</h1>
          <p className="text-[#64748b]">{org.slug}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-[#64748b] text-sm mb-2">Status</p>
            <span className={`${statusInfo.color} font-medium`}>{statusInfo.label}</span>
          </div>

          <div>
            <p className="text-[#64748b] text-sm mb-2">Documentos</p>
            <p className="text-[#e2e8f0] text-2xl font-bold">{stats.documentos || 0}</p>
          </div>

          <div>
            <p className="text-[#64748b] text-sm mb-2">Usuários</p>
            <p className="text-[#e2e8f0] text-2xl font-bold">{stats.usuarios || 0}</p>
          </div>

          <div>
            <p className="text-[#64748b] text-sm mb-2">Criada em</p>
            <p className="text-[#e2e8f0]">{new Date(org.createdAt).toLocaleDateString("pt-BR")}</p>
          </div>
        </div>

        {/* Armazenamento */}
        <div>
          <h3 className="text-[#e2e8f0] font-semibold mb-4">Armazenamento</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#64748b]">Usado</span>
              <span className="text-[#e2e8f0]">{stats.armazenamento?.usado || 0} MB</span>
            </div>
            <div className="w-full bg-[#252530] rounded-full h-2">
              <div
                className="bg-[#6366f1] h-2 rounded-full"
                style={{ width: `${stats.armazenamento?.percentual || 0}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#64748b]">{stats.armazenamento?.percentual || 0}%</span>
              <span className="text-[#64748b]">{stats.armazenamento?.limite || 0} MB</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[#e2e8f0] font-semibold mb-4">Visão Geral de Usuários</h3>
          <div className="bg-[#252530] rounded-lg border border-[rgba(255,255,255,0.08)] p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[#64748b] text-sm">Usuários ativos nesta organização</p>
              <p className="text-[#e2e8f0] text-2xl font-bold">{stats.usuarios || 0}</p>
            </div>
            <Link
              href={`/root-admin/usuarios?organizacaoId=${id}`}
              className="px-4 py-2 bg-[#6366f1] text-white rounded-lg hover:bg-[#4f46e5] transition-colors"
            >
              Ver usuários da organização
            </Link>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-[rgba(255,255,255,0.08)] pt-6 flex gap-4">
          <a
            href={`/root-admin/organizacoes/${id}`}
            className="px-4 py-2 bg-[#6366f1] text-white rounded-lg hover:bg-[#4f46e5] transition-colors"
          >
            Editar
          </a>
          <button
            className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            Deletar
          </button>
        </div>
      </div>
    </div>
  );
}
