import { getSuperAdminSession } from "@/actions/root-admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DebugPage() {
  const session = await getSuperAdminSession();

  // Check if super admin exists
  const admins = await db.superAdmin.findMany({
    select: {
      id: true,
      email: true,
      nome: true,
      ativo: true,
      ultimoLogin: true,
    }
  });

  const sessions = await db.superAdminSession.findMany({
    include: { superAdmin: { select: { email: true } } },
    take: 10,
  });

  return (
    <div className="min-h-screen bg-[#0f0f14] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-white">🔍 Debug Info</h1>

        {/* Current Session */}
        <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Current Session</h2>
          {session ? (
            <div className="space-y-2 text-[#c7d2e0]">
              <p>✅ Logged in as: <span className="font-mono text-[#6366f1]">{session.superAdmin.email}</span></p>
              <p>Session ID: <span className="font-mono text-[#64748b] text-sm">{session.sessionId}</span></p>
            </div>
          ) : (
            <p className="text-red-400">❌ Not logged in</p>
          )}
        </div>

        {/* Super Admins in DB */}
        <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Super Admins ({admins.length})</h2>
          {admins.length > 0 ? (
            <div className="space-y-3">
              {admins.map((admin) => (
                <div key={admin.id} className="bg-[#252530] rounded p-3 text-sm">
                  <p className="text-[#c7d2e0]">
                    <span className="font-mono text-[#6366f1]">{admin.email}</span>
                    {admin.ativo ? <span className="text-green-400 ml-2">●</span> : <span className="text-red-400 ml-2">●</span>}
                  </p>
                  <p className="text-[#64748b] text-xs">
                    {admin.nome} {admin.ultimoLogin && `(Last login: ${new Date(admin.ultimoLogin).toLocaleString('pt-BR')})`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-red-400">❌ No admins found</p>
          )}
        </div>

        {/* Sessions in DB */}
        <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Sessions ({sessions.length})</h2>
          {sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div key={s.id} className="bg-[#252530] rounded p-3 text-sm">
                  <p className="text-[#c7d2e0]">
                    <span className="font-mono text-[#6366f1]">{s.superAdmin.email}</span>
                  </p>
                  <p className="text-[#64748b] text-xs">
                    Expires: {new Date(s.expiresAt).toLocaleString('pt-BR')} | IP: {s.ipAddress}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-yellow-400">⚠️  No sessions found</p>
          )}
        </div>

        {/* Test Credentials */}
        <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test Credentials</h2>
          <div className="bg-[#252530] rounded p-3 text-sm space-y-2">
            <p className="text-[#c7d2e0]">📧 Email: <span className="font-mono text-[#6366f1]">admin@sistema.com.br</span></p>
            <p className="text-[#c7d2e0]">🔐 Password: <span className="font-mono text-[#6366f1]">admin123456</span></p>
            <p className="text-[#64748b] text-xs mt-4">⚠️  These are test credentials. Change them in production!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
