import { Metadata } from "next";
import { cookies } from "next/headers";
import { buildInternalAppUrl } from "@/lib/runtime/app-url";
import { Server, Database, Cpu, Clock } from "lucide-react";

export const metadata: Metadata = { title: "Sistema - Root Admin" };
export const dynamic = "force-dynamic";

async function getHealth() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("super_admin_session_token")?.value;
    const res = await fetch(buildInternalAppUrl("/root-admin/api/sistema/health"), {
      cache: "no-store",
      headers: token ? { Cookie: `super_admin_session_token=${token}` } : {},
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

function Row({ label, value, color = "text-[#e2e8f0]" }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.05)] last:border-0">
      <span className="text-[#64748b] text-sm">{label}</span>
      <span className={`text-sm font-medium ${color}`}>{value}</span>
    </div>
  );
}

function formatUptime(s: number) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export default async function SistemaPage() {
  const h = await getHealth();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e2e8f0]">Sistema</h1>
        <p className="text-[#64748b] text-sm mt-1">Status técnico do servidor e banco de dados</p>
      </div>

      {!h ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          Não foi possível obter informações do sistema.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Server size={18} className="text-[#6366f1]" />
              <h2 className="text-[#e2e8f0] font-semibold">Aplicação</h2>
            </div>
            <Row label="Versão" value={`v${h.version}`} />
            <Row label="Ambiente" value={h.environment} color={h.environment === "production" ? "text-green-400" : "text-amber-400"} />
            <Row label="Node.js" value={h.nodeVersion} />
            <Row label="Plataforma" value={h.platform} />
            <Row label="Uptime" value={formatUptime(h.uptime)} />
          </div>

          <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={18} className="text-purple-400" />
              <h2 className="text-[#e2e8f0] font-semibold">Memória</h2>
            </div>
            <Row label="Heap Usado" value={`${h.memoryMB} MB`} />
            <Row label="Heap Total" value={`${h.memoryTotalMB} MB`} />
            <div className="mt-3">
              <div className="w-full bg-[#252530] rounded-full h-2">
                <div
                  className="bg-purple-400 h-2 rounded-full"
                  style={{ width: `${Math.min(Math.round((h.memoryMB / h.memoryTotalMB) * 100), 100)}%` }}
                />
              </div>
              <p className="text-[#64748b] text-xs mt-1">
                {Math.round((h.memoryMB / h.memoryTotalMB) * 100)}% em uso
              </p>
            </div>
          </div>

          <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database size={18} className="text-blue-400" />
              <h2 className="text-[#e2e8f0] font-semibold">Banco de Dados</h2>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${h.database.status === "ok" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {h.database.status === "ok" ? "Online" : "Erro"}
              </span>
            </div>
            <Row label="Latência" value={`${h.database.latencyMs}ms`} color={h.database.latencyMs < 100 ? "text-green-400" : "text-amber-400"} />
            <Row label="Escritórios" value={h.database.counts.escritorios.toLocaleString("pt-BR")} />
            <Row label="Usuários" value={h.database.counts.users.toLocaleString("pt-BR")} />
            <Row label="Processos" value={h.database.counts.processos.toLocaleString("pt-BR")} />
            <Row label="Documentos" value={h.database.counts.documentos.toLocaleString("pt-BR")} />
            <Row label="Assinaturas" value={h.database.counts.assinaturas.toLocaleString("pt-BR")} />
          </div>

          <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-amber-400" />
              <h2 className="text-[#e2e8f0] font-semibold">Diagnóstico</h2>
            </div>
            <Row label="Verificado em" value={new Date(h.timestamp).toLocaleString("pt-BR")} />
            <Row
              label="Status Geral"
              value={h.database.status === "ok" ? "Operacional" : "Com problemas"}
              color={h.database.status === "ok" ? "text-green-400" : "text-red-400"}
            />
            <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.05)]">
              <p className="text-[#64748b] text-xs">Recarregue a página para atualizar as informações.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
