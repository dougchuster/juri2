import { Metadata } from "next";
import { db } from "@/lib/db";
import RootDashboard from "@/components/root-admin/dashboard/root-dashboard";

export const metadata: Metadata = {
  title: "Dashboard - Root Admin",
  description: "Painel principal do administrador root",
};

async function getMetrics() {
  const [
    totalEscritorios,
    escritoriosAtivos,
    totalUsuarios,
    assinaturasTrialExpirando,
  ] = await Promise.all([
    db.escritorio.count(),
    db.escritorio.count({
      where: { statusEscritorio: "ATIVO" },
    }),
    db.user.count(),
    db.assinatura.count({
      where: {
        status: "TRIAL",
        fimTrial: {
          lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Next 3 days
          gte: new Date(),
        },
      },
    }),
  ]);

  return {
    totalEscritorios,
    escritoriosAtivos,
    totalUsuarios,
    assinaturasTrialExpirando,
  };
}

export default async function RootAdminPage() {
  const metrics = await getMetrics();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">Dashboard</h1>
        <p className="text-[#64748b]">Visão geral da plataforma</p>
      </div>

      <RootDashboard {...metrics} />
    </div>
  );
}
