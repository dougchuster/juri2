import { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Detalhes do Usuário - Root Admin",
  description: "Visualize os detalhes do usuário",
};

async function getUserData(id: string) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("super_admin_session_token")?.value;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/root-admin/api/usuarios/${id}`,
      {
        cache: "no-store",
        headers: sessionToken ? { Cookie: `super_admin_session_token=${sessionToken}` } : {},
      }
    );

    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("[getUserData] Error:", error);
    return null;
  }
}

const roleMap: Record<string, string> = {
  ADMIN: "Admin",
  SOCIO: "Sócio",
  ADVOGADO: "Advogado",
  CONTROLADOR: "Controlador",
  ASSISTENTE: "Assistente",
  FINANCEIRO: "Financeiro",
  SECRETARIA: "Secretária",
};

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUserData(id);

  if (!user) {
    return (
      <div className="p-8">
        <Link
          href="/root-admin/usuarios"
          className="flex items-center gap-2 text-[#6366f1] hover:text-[#4f46e5] mb-4"
        >
          <ArrowLeft size={20} />
          Voltar
        </Link>
        <p className="text-[#c7d2e0]">Usuário não encontrado</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <Link
        href="/root-admin/usuarios"
        className="flex items-center gap-2 text-[#6366f1] hover:text-[#4f46e5]"
      >
        <ArrowLeft size={20} />
        Voltar
      </Link>

      <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">{user.name}</h1>
          <p className="text-[#64748b]">{user.email}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-[#64748b] text-sm mb-2">Cargo</p>
            <span className="px-3 py-1 bg-[#6366f1]/20 text-[#6366f1] rounded text-sm">
              {roleMap[user.role] || user.role}
            </span>
          </div>

          <div>
            <p className="text-[#64748b] text-sm mb-2">Status</p>
            <span className={user.isActive ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
              {user.isActive ? "Ativo" : "Bloqueado"}
            </span>
          </div>

          <div>
            <p className="text-[#64748b] text-sm mb-2">Criado em</p>
            <p className="text-[#e2e8f0]">
              {new Date(user.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </div>

          <div>
            <p className="text-[#64748b] text-sm mb-2">Último Acesso</p>
            <p className="text-[#e2e8f0]">
              {user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleDateString("pt-BR")
                : "Nunca"}
            </p>
          </div>
        </div>

        <div className="bg-[#252530] border border-[rgba(255,255,255,0.08)] rounded-lg p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[#64748b] text-sm">Organização</p>
            <p className="text-[#e2e8f0] font-semibold">{user.organization?.nome || "Sem organização"}</p>
          </div>
          {user.organization?.id && (
            <Link
              href={`/root-admin/usuarios?organizacaoId=${user.organization.id}`}
              className="px-4 py-2 bg-[#6366f1] text-white rounded-lg hover:bg-[#4f46e5] transition-colors"
            >
              Ver usuários da organização
            </Link>
          )}
        </div>

        {user.sessions && user.sessions.length > 0 && (
          <div>
            <h3 className="text-[#e2e8f0] font-semibold mb-4">Sessões Ativas</h3>
            <div className="space-y-2">
              {user.sessions.map((session: any) => (
                <div key={session.id} className="bg-[#252530] rounded-lg p-3 text-sm">
                  <p className="text-[#c7d2e0]">
                    {new Date(session.createdAt).toLocaleString("pt-BR")} —{" "}
                    <span className="text-[#64748b]">{session.ipAddress || "IP desconhecido"}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
