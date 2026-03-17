"use client";

import { useState } from "react";
import StatusBadge from "@/components/root-admin/shared/status-badge";
import MetricCard from "@/components/root-admin/dashboard/metric-card";
import { FileText, Users, Folder, HardDrive, Calendar } from "lucide-react";

interface OrgDetailProps {
  org: any;
  stats: any;
}

export default function OrgDetail({ org, stats }: OrgDetailProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "usuarios" | "assinatura">("overview");

  const storagePercent = stats?.armazenamento?.percentual || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">{org.nome}</h1>
            <div className="flex items-center gap-4 flex-wrap">
              <StatusBadge status={org.statusEscritorio} />
              <p className="text-[#64748b]">{org.email}</p>
              {org.cnpj && <p className="text-[#64748b]">CNPJ: {org.cnpj}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[rgba(255,255,255,0.08)]">
        {["overview", "usuarios", "assinatura"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-[#6366f1] text-[#6366f1]"
                : "border-transparent text-[#64748b] hover:text-[#e2e8f0]"
            }`}
          >
            {tab === "overview" && "Visão Geral"}
            {tab === "usuarios" && "Usuários"}
            {tab === "assinatura" && "Assinatura"}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "overview" && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            label="Processos"
            value={stats.processos?.total || 0}
            icon={FileText}
            color="indigo"
          />
          <MetricCard
            label="Clientes"
            value={stats.clientes || 0}
            icon={Users}
            color="green"
          />
          <MetricCard
            label="Documentos"
            value={stats.documentos || 0}
            icon={Folder}
            color="blue"
          />
          <MetricCard
            label="Armazenamento"
            value={`${storagePercent}%`}
            icon={HardDrive}
            color={storagePercent > 80 ? "amber" : "green"}
          />
        </div>
      )}

      {activeTab === "usuarios" && (
        <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-6">
          <p className="text-[#64748b]">Funcionalidade em construção</p>
        </div>
      )}

      {activeTab === "assinatura" && org.assinaturas?.[0] && (
        <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[#64748b] text-sm mb-2">Plano</p>
              <p className="text-[#e2e8f0] font-semibold">{org.assinaturas[0].plano.nome}</p>
            </div>
            <div>
              <p className="text-[#64748b] text-sm mb-2">Status</p>
              <StatusBadge status={org.assinaturas[0].status} />
            </div>
            <div>
              <p className="text-[#64748b] text-sm mb-2">Data de Início</p>
              <p className="text-[#e2e8f0]">
                {org.assinaturas[0].dataInicio
                  ? new Date(org.assinaturas[0].dataInicio).toLocaleDateString("pt-BR")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[#64748b] text-sm mb-2">Próxima Renovação</p>
              <p className="text-[#e2e8f0]">
                {org.assinaturas[0].dataRenovacao
                  ? new Date(org.assinaturas[0].dataRenovacao).toLocaleDateString("pt-BR")
                  : "—"}
              </p>
            </div>
          </div>

          {org.assinaturas[0].plano.features && (
            <div>
              <p className="text-[#64748b] text-sm mb-3">Recursos Habilitados</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(org.assinaturas[0].plano.features).map(([key, value]: [string, any]) => (
                  value && (
                    <span
                      key={key}
                      className="px-3 py-1 bg-[#6366f1]/20 text-[#6366f1] rounded-lg text-sm"
                    >
                      {key}
                    </span>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
