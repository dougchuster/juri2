"use client";

import MetricCard from "./metric-card";
import {
  Building2,
  Users,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

interface RootDashboardProps {
  totalEscritorios: number;
  escritoriosAtivos: number;
  totalUsuarios: number;
  assinaturasTrialExpirando: number;
}

export default function RootDashboard({
  totalEscritorios,
  escritoriosAtivos,
  totalUsuarios,
  assinaturasTrialExpirando,
}: RootDashboardProps) {
  const percentualAtivos = totalEscritorios > 0
    ? Math.round((escritoriosAtivos / totalEscritorios) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="Total de Organizações"
          value={totalEscritorios}
          icon={Building2}
          color="indigo"
          trend={percentualAtivos}
          trendLabel={`${percentualAtivos}% ativos`}
        />

        <MetricCard
          label="Organizações Ativas"
          value={escritoriosAtivos}
          icon={TrendingUp}
          color="green"
          variation={((escritoriosAtivos / Math.max(totalEscritorios, 1)) * 100).toFixed(0) + "%"}
        />

        <MetricCard
          label="Total de Usuários"
          value={totalUsuarios}
          icon={Users}
          color="blue"
        />

        <MetricCard
          label="Trials Expirando"
          value={assinaturasTrialExpirando}
          icon={AlertCircle}
          color={assinaturasTrialExpirando > 0 ? "amber" : "green"}
          isAlert={assinaturasTrialExpirando > 0}
        />
      </div>

      {/* Alerts */}
      {assinaturasTrialExpirando > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="text-amber-400 flex-shrink-0 mt-1" size={24} />
            <div>
              <h3 className="text-amber-400 font-semibold mb-2">
                Atenção: Trials Expirando
              </h3>
              <p className="text-[#c7d2e0] text-sm">
                {assinaturasTrialExpirando} organizações têm trial expirando nos próximos 3 dias.
                Considere entrar em contato para oferecer planos pagos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-6">
          <h4 className="text-[#64748b] text-sm font-medium mb-2">
            Taxa de Ativação
          </h4>
          <p className="text-3xl font-bold text-[#6366f1] mb-1">
            {totalEscritorios > 0 ? percentualAtivos : 0}%
          </p>
          <p className="text-[#64748b] text-xs">
            {escritoriosAtivos} de {totalEscritorios} organizações
          </p>
        </div>

        <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-6">
          <h4 className="text-[#64748b] text-sm font-medium mb-2">
            Média de Usuários
          </h4>
          <p className="text-3xl font-bold text-[#6366f1] mb-1">
            {totalEscritorios > 0 ? Math.round(totalUsuarios / totalEscritorios) : 0}
          </p>
          <p className="text-[#64748b] text-xs">por organização</p>
        </div>

        <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-6">
          <h4 className="text-[#64748b] text-sm font-medium mb-2">
            Status do Sistema
          </h4>
          <p className="text-3xl font-bold text-green-400 mb-1">OK</p>
          <p className="text-[#64748b] text-xs">Todos os sistemas operacionais</p>
        </div>
      </div>
    </div>
  );
}
