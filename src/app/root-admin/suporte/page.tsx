import { Metadata } from "next";
import { cookies } from "next/headers";
import { buildInternalAppUrl } from "@/lib/runtime/app-url";
import { Shield } from "lucide-react";

export const metadata: Metadata = { title: "Logs & Auditoria - Root Admin" };
export const dynamic = "force-dynamic";

async function getLogs(page = 1) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("super_admin_session_token")?.value;
    const res = await fetch(buildInternalAppUrl(`/root-admin/api/logs?page=${page}&limit=50`), {
      cache: "no-store",
      headers: token ? { Cookie: `super_admin_session_token=${token}` } : {},
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

const ACAO_LABELS: Record<string, { label: string; color: string }> = {
  CRIAR_ORGANIZACAO: { label: "Criou organização", color: "text-green-400 bg-green-500/10" },
  EDITAR_ORGANIZACAO: { label: "Editou organização", color: "text-blue-400 bg-blue-500/10" },
  DELETAR_ORGANIZACAO: { label: "Deletou organização", color: "text-red-400 bg-red-500/10" },
  CRIAR_USUARIO: { label: "Criou usuário", color: "text-green-400 bg-green-500/10" },
  ATUALIZAR_USUARIO: { label: "Atualizou usuário", color: "text-blue-400 bg-blue-500/10" },
  BLOQUEAR_USUARIO: { label: "Bloqueou usuário", color: "text-amber-400 bg-amber-500/10" },
  DESBLOQUEAR_USUARIO: { label: "Desbloqueou usuário", color: "text-green-400 bg-green-500/10" },
  REMOVER_USUARIO: { label: "Removeu usuário", color: "text-red-400 bg-red-500/10" },
  SOLICITAR_REDEFINICAO_SENHA_USUARIO: { label: "Solicitou reset de senha", color: "text-indigo-400 bg-indigo-500/10" },
  REDEFINIR_SENHA_USUARIO: { label: "Redefiniu senha", color: "text-purple-400 bg-purple-500/10" },
  LOGIN: { label: "Login", color: "text-gray-400 bg-gray-500/10" },
  LOGOUT: { label: "Logout", color: "text-gray-400 bg-gray-500/10" },
};

export default async function SuportePage() {
  const data = await getLogs();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e2e8f0]">Logs & Auditoria</h1>
        <p className="text-[#64748b] text-sm mt-1">Histórico de todas as ações realizadas no painel</p>
      </div>

      {!data ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          Não foi possível carregar os logs de auditoria.
        </div>
      ) : (
        <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.08)] flex items-center gap-2">
            <Shield size={16} className="text-[#6366f1]" />
            <p className="text-[#e2e8f0] font-medium">
              {data.total ?? data.logs?.length ?? 0} registros
            </p>
          </div>

          {(!data.logs || data.logs.length === 0) ? (
            <p className="p-6 text-[#64748b] text-sm">Nenhum log encontrado.</p>
          ) : (
            <div className="divide-y divide-[rgba(255,255,255,0.04)]">
              {data.logs.map((log: any) => {
                const info = ACAO_LABELS[log.acao] || { label: log.acao, color: "text-gray-400 bg-gray-500/10" };
                return (
                  <div key={log.id} className="px-5 py-4 hover:bg-[#252530] transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${info.color}`}>
                          {info.label}
                        </span>
                        <div>
                          <p className="text-[#c7d2e0] text-sm">
                            {log.superAdmin?.nome || log.superAdmin?.email || "Admin"}
                          </p>
                          {log.detalhes && (
                            <p className="text-[#64748b] text-xs mt-0.5 font-mono">
                              {typeof log.detalhes === "string"
                                ? log.detalhes
                                : JSON.stringify(log.detalhes).slice(0, 120)}
                            </p>
                          )}
                          {log.ipAddress && (
                            <p className="text-[#64748b] text-xs mt-0.5">IP: {log.ipAddress}</p>
                          )}
                        </div>
                      </div>
                      <p className="text-[#64748b] text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {data.totalPages > 1 && (
            <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.08)] text-center">
              <p className="text-[#64748b] text-sm">
                Mostrando página 1 de {data.totalPages}. Use a API diretamente para navegar.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
