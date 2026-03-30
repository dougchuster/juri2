import { Metadata } from "next";
import { cookies } from "next/headers";
import { buildInternalAppUrl } from "@/lib/runtime/app-url";
import { Settings, Package, Users } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Configurações - Root Admin" };
export const dynamic = "force-dynamic";

async function getPlanos() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("super_admin_session_token")?.value;
    const res = await fetch(buildInternalAppUrl("/root-admin/api/configuracoes/planos"), {
      cache: "no-store",
      headers: token ? { Cookie: `super_admin_session_token=${token}` } : {},
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function getSuperAdmins() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("super_admin_session_token")?.value;
    const res = await fetch(buildInternalAppUrl("/root-admin/api/configuracoes/admins"), {
      cache: "no-store",
      headers: token ? { Cookie: `super_admin_session_token=${token}` } : {},
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export default async function ConfiguracoesPage() {
  const [planosData, adminsData] = await Promise.all([getPlanos(), getSuperAdmins()]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e2e8f0]">Configurações</h1>
        <p className="text-[#64748b] text-sm mt-1">Planos, super admins e configurações globais</p>
      </div>

      {/* Planos */}
      <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.08)] flex items-center gap-2">
          <Package size={16} className="text-[#6366f1]" />
          <p className="text-[#e2e8f0] font-medium">Planos Disponíveis</p>
        </div>

        {!planosData ? (
          <div className="p-5">
            <p className="text-[#64748b] text-sm">
              Configure a rota <code className="text-[#6366f1]">/root-admin/api/configuracoes/planos</code> para listar os planos.
            </p>
            <Link
              href="/root-admin/organizacoes/nova"
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/30 rounded-lg text-sm hover:bg-[#6366f1]/20"
            >
              Criar nova organização (com plano)
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                  <th className="px-5 py-3 text-left text-[#64748b] font-medium">Plano</th>
                  <th className="px-5 py-3 text-left text-[#64748b] font-medium">Preço/mês</th>
                  <th className="px-5 py-3 text-left text-[#64748b] font-medium">Max Usuários</th>
                  <th className="px-5 py-3 text-left text-[#64748b] font-medium">Armazenamento</th>
                  <th className="px-5 py-3 text-left text-[#64748b] font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {planosData.map((p: any) => (
                  <tr key={p.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#252530]">
                    <td className="px-5 py-3 text-[#c7d2e0] font-medium">{p.nome}</td>
                    <td className="px-5 py-3 text-[#c7d2e0]">
                      R$ {Number(p.precoMensal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-[#c7d2e0]">{p.maxUsuarios}</td>
                    <td className="px-5 py-3 text-[#c7d2e0]">{p.maxArmazenamentoMB} MB</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${p.ativo ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                        {p.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Super Admins */}
      <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.08)] flex items-center gap-2">
          <Users size={16} className="text-purple-400" />
          <p className="text-[#e2e8f0] font-medium">Super Admins</p>
        </div>

        {!adminsData ? (
          <p className="p-5 text-[#64748b] text-sm">
            Configure a rota <code className="text-[#6366f1]">/root-admin/api/configuracoes/admins</code> para listar os admins.
          </p>
        ) : (
          <div className="divide-y divide-[rgba(255,255,255,0.04)]">
            {adminsData.map((a: any) => (
              <div key={a.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[#c7d2e0] text-sm font-medium">{a.nome}</p>
                  <p className="text-[#64748b] text-xs">{a.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  {a.ultimoLogin && (
                    <p className="text-[#64748b] text-xs">
                      Último acesso: {new Date(a.ultimoLogin).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs ${a.ativo ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {a.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Defaults */}
      <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={16} className="text-amber-400" />
          <p className="text-[#e2e8f0] font-medium">Padrões do Sistema</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-[#252530] rounded-lg p-3">
            <p className="text-[#64748b]">Limite de usuários (padrão)</p>
            <p className="text-[#e2e8f0] text-lg font-bold">10</p>
          </div>
          <div className="bg-[#252530] rounded-lg p-3">
            <p className="text-[#64748b]">Armazenamento padrão</p>
            <p className="text-[#e2e8f0] text-lg font-bold">5.120 MB</p>
          </div>
          <div className="bg-[#252530] rounded-lg p-3">
            <p className="text-[#64748b]">Duração do trial</p>
            <p className="text-[#e2e8f0] text-lg font-bold">14 dias</p>
          </div>
        </div>
        <p className="text-[#64748b] text-xs mt-4">
          Para alterar os limites de uma organização específica, acesse a página de detalhes da organização e use o botão Editar.
        </p>
      </div>
    </div>
  );
}
