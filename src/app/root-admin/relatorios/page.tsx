import { Metadata } from "next";
import { cookies } from "next/headers";
import { buildInternalAppUrl } from "@/lib/runtime/app-url";
import { TrendingUp, Building2, Users, AlertTriangle } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Relatórios - Root Admin" };
export const dynamic = "force-dynamic";

async function getRelatorios() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("super_admin_session_token")?.value;

    // Fetch orgs + users with createdAt for growth analysis
    const [orgsRes, usersRes] = await Promise.all([
      fetch(buildInternalAppUrl("/root-admin/api/organizacoes?limit=200&page=1"), {
        cache: "no-store",
        headers: token ? { Cookie: `super_admin_session_token=${token}` } : {},
      }),
      fetch(buildInternalAppUrl("/root-admin/api/usuarios?limit=200&page=1"), {
        cache: "no-store",
        headers: token ? { Cookie: `super_admin_session_token=${token}` } : {},
      }),
    ]);

    const [orgsData, usersData] = await Promise.all([
      orgsRes.ok ? orgsRes.json() : null,
      usersRes.ok ? usersRes.json() : null,
    ]);

    return { orgs: orgsData?.escritorios || [], users: usersData?.users || [] };
  } catch { return null; }
}

function groupByMonth(items: any[], dateField: string) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const d = new Date(item[dateField]);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12); // last 12 months
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-[#64748b]">{label}</span>
        <span className="text-[#c7d2e0]">{count} ({pct}%)</span>
      </div>
      <div className="w-full bg-[#252530] rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function RelatoriosPage() {
  const data = await getRelatorios();

  if (!data) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          Não foi possível carregar os dados de relatórios.
        </div>
      </div>
    );
  }

  const orgsByMonth = groupByMonth(data.orgs, "createdAt");
  const usersByMonth = groupByMonth(data.users, "createdAt");

  const orgStatusCounts = (data.orgs as any[]).reduce<Record<string, number>>((acc, o) => {
    acc[o.statusEscritorio] = (acc[o.statusEscritorio] || 0) + 1;
    return acc;
  }, {});
  const totalOrgs = data.orgs.length;

  // Top orgs by user count (from org list — userCount field)
  const topOrgs = [...data.orgs]
    .sort((a: any, b: any) => (b.userCount || 0) - (a.userCount || 0))
    .slice(0, 10);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e2e8f0]">Relatórios</h1>
        <p className="text-[#64748b] text-sm mt-1">Análise de crescimento e atividade do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Org growth */}
        <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={16} className="text-[#6366f1]" />
            <p className="text-[#e2e8f0] font-medium">Crescimento de Organizações</p>
            <span className="ml-auto text-[#64748b] text-xs">(últimos 12 meses)</span>
          </div>
          {orgsByMonth.length === 0 ? (
            <p className="text-[#64748b] text-sm">Nenhum dado disponível.</p>
          ) : (
            <div className="space-y-2">
              {orgsByMonth.map(([month, count]) => {
                const max = Math.max(...orgsByMonth.map(([, c]) => c));
                return (
                  <div key={month} className="flex items-center gap-3 text-sm">
                    <span className="text-[#64748b] w-16 shrink-0">{month.slice(5)}/{month.slice(0, 4).slice(2)}</span>
                    <div className="flex-1 bg-[#252530] rounded-full h-2">
                      <div className="bg-[#6366f1] h-2 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                    <span className="text-[#c7d2e0] w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User growth */}
        <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-blue-400" />
            <p className="text-[#e2e8f0] font-medium">Crescimento de Usuários</p>
            <span className="ml-auto text-[#64748b] text-xs">(últimos 12 meses)</span>
          </div>
          {usersByMonth.length === 0 ? (
            <p className="text-[#64748b] text-sm">Nenhum dado disponível.</p>
          ) : (
            <div className="space-y-2">
              {usersByMonth.map(([month, count]) => {
                const max = Math.max(...usersByMonth.map(([, c]) => c));
                return (
                  <div key={month} className="flex items-center gap-3 text-sm">
                    <span className="text-[#64748b] w-16 shrink-0">{month.slice(5)}/{month.slice(0, 4).slice(2)}</span>
                    <div className="flex-1 bg-[#252530] rounded-full h-2">
                      <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                    <span className="text-[#c7d2e0] w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Org status breakdown */}
        <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-green-400" />
            <p className="text-[#e2e8f0] font-medium">Status das Organizações</p>
          </div>
          <div className="space-y-3">
            <StatusBar label="Ativo" count={orgStatusCounts["ATIVO"] || 0} total={totalOrgs} color="bg-green-400" />
            <StatusBar label="Trial" count={orgStatusCounts["TRIAL"] || 0} total={totalOrgs} color="bg-indigo-400" />
            <StatusBar label="Suspenso" count={orgStatusCounts["SUSPENSO"] || 0} total={totalOrgs} color="bg-amber-400" />
            <StatusBar label="Inativo" count={orgStatusCounts["INATIVO"] || 0} total={totalOrgs} color="bg-gray-500" />
          </div>
        </div>

        {/* Top orgs */}
        <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-amber-400" />
            <p className="text-[#e2e8f0] font-medium">Top Organizações por Usuários</p>
          </div>
          {topOrgs.length === 0 ? (
            <p className="text-[#64748b] text-sm">Nenhum dado disponível.</p>
          ) : (
            <div className="space-y-2">
              {topOrgs.map((org: any, i: number) => (
                <div key={org.id} className="flex items-center gap-3 text-sm">
                  <span className="text-[#64748b] w-5">{i + 1}.</span>
                  <Link
                    href={`/root-admin/organizacoes/${org.id}`}
                    className="flex-1 text-[#c7d2e0] hover:text-[#6366f1] truncate transition-colors"
                  >
                    {org.nome}
                  </Link>
                  <span className="text-[#64748b]">{org.userCount || 0} usuários</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
