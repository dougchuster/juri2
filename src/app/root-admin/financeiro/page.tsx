import { Metadata } from "next";
import { cookies } from "next/headers";
import { buildInternalAppUrl } from "@/lib/runtime/app-url";
import { DollarSign, AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Financeiro - Root Admin" };
export const dynamic = "force-dynamic";

async function getFinanceiro() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("super_admin_session_token")?.value;
    const res = await fetch(buildInternalAppUrl("/root-admin/api/financeiro/overview"), {
      cache: "no-store",
      headers: token ? { Cookie: `super_admin_session_token=${token}` } : {},
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

const STATUS_COLORS: Record<string, string> = {
  ATIVO: "text-green-400 bg-green-500/10",
  TRIAL: "text-indigo-400 bg-indigo-500/10",
  CANCELADO: "text-red-400 bg-red-500/10",
  SUSPENSO: "text-amber-400 bg-amber-500/10",
  EXPIRADO: "text-gray-400 bg-gray-500/10",
};

export default async function FinanceiroPage() {
  const data = await getFinanceiro();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e2e8f0]">Financeiro</h1>
        <p className="text-[#64748b] text-sm mt-1">Visão geral de assinaturas e receita</p>
      </div>

      {!data ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          Não foi possível carregar dados financeiros.
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-green-400" />
                <p className="text-[#64748b] text-sm">Receita Mensal Est.</p>
              </div>
              <p className="text-[#e2e8f0] text-2xl font-bold">
                R$ {data.receitaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} className="text-indigo-400" />
                <p className="text-[#64748b] text-sm">Assinaturas Ativas</p>
              </div>
              <p className="text-[#e2e8f0] text-2xl font-bold">
                {(data.statusCounts["ATIVO"] || 0) + (data.statusCounts["TRIAL"] || 0)}
              </p>
              <p className="text-[#64748b] text-xs mt-1">
                {data.statusCounts["TRIAL"] || 0} em trial
              </p>
            </div>

            <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-amber-400" />
                <p className="text-[#64748b] text-sm">Expirando em 7 dias</p>
              </div>
              <p className={`text-2xl font-bold ${data.expirando7 > 0 ? "text-amber-400" : "text-[#e2e8f0]"}`}>
                {data.expirando7}
              </p>
            </div>

            <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock3 size={16} className="text-blue-400" />
                <p className="text-[#64748b] text-sm">Expirando em 30 dias</p>
              </div>
              <p className="text-[#e2e8f0] text-2xl font-bold">{data.expirando30}</p>
            </div>
          </div>

          {/* Status breakdown */}
          {Object.keys(data.statusCounts).length > 0 && (
            <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-5">
              <p className="text-[#e2e8f0] font-medium mb-4">Distribuição por Status</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(data.statusCounts as Record<string, number>).map(([status, count]) => (
                  <div key={status} className={`px-3 py-2 rounded-lg ${STATUS_COLORS[status] || "text-gray-400 bg-gray-500/10"}`}>
                    <p className="text-xs font-medium">{status}</p>
                    <p className="text-lg font-bold">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subscription list */}
          <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.08)]">
              <p className="text-[#e2e8f0] font-medium">Todas as Assinaturas</p>
            </div>
            {data.assinaturas.length === 0 ? (
              <p className="p-5 text-[#64748b] text-sm">Nenhuma assinatura encontrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.06)]">
                      <th className="px-5 py-3 text-left text-[#64748b] font-medium">Organização</th>
                      <th className="px-5 py-3 text-left text-[#64748b] font-medium">Plano</th>
                      <th className="px-5 py-3 text-left text-[#64748b] font-medium">Status</th>
                      <th className="px-5 py-3 text-left text-[#64748b] font-medium">Valor/mês</th>
                      <th className="px-5 py-3 text-left text-[#64748b] font-medium">Renovação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.assinaturas.map((a: any) => (
                      <tr key={a.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#252530]">
                        <td className="px-5 py-3">
                          <Link
                            href={`/root-admin/organizacoes/${a.escritorioId}`}
                            className="text-[#c7d2e0] hover:text-[#6366f1] transition-colors"
                          >
                            {a.escritorioNome}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-[#c7d2e0]">{a.planoNome}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[a.status] || "text-gray-400 bg-gray-500/10"}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[#c7d2e0]">
                          R$ {a.precoMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3 text-[#c7d2e0]">
                          {a.dataRenovacao ? new Date(a.dataRenovacao).toLocaleDateString("pt-BR") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
