"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/root-admin/shared/status-badge";
import ConfirmDialog from "@/components/root-admin/shared/confirm-dialog";
import { Edit2, Trash2, PauseCircle, PlayCircle, Users, HardDrive, FileText, Calendar } from "lucide-react";

interface OrgDetailClientProps {
  org: any;
  stats: any;
}

const STATUS_LABELS: Record<string, string> = {
  ATIVO: "Ativo",
  SUSPENSO: "Suspenso",
  BLOQUEADO: "Bloqueado",
  INATIVO: "Inativo",
  TRIAL: "Trial",
};

export default function OrgDetailClient({ org: initialOrg, stats }: OrgDetailClientProps) {
  const router = useRouter();
  const [org, setOrg] = useState(initialOrg);
  const [activeTab, setActiveTab] = useState<"overview" | "assinatura" | "admin">("overview");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action?: "delete" | "suspend" | "reactivate";
  }>({ isOpen: false });

  const [editForm, setEditForm] = useState({
    nome: org.nome || "",
    email: org.email || "",
    cnpj: org.cnpj || "",
    telefone: org.telefone || "",
    endereco: org.endereco || "",
    cidade: org.cidade || "",
    estado: org.estado || "",
    cep: org.cep || "",
    limiteUsuarios: org.limiteUsuarios || 10,
    limiteArmazenamento: org.limiteArmazenamento || 5120,
    observacoesAdmin: org.observacoesAdmin || "",
  });

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const res = await fetch(`/root-admin/api/organizacoes/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("error", body?.error || "Falha ao salvar alterações.");
        return;
      }
      setOrg({ ...org, ...body });
      setEditModalOpen(false);
      showToast("success", "Organização atualizada com sucesso.");
      router.refresh();
    } catch {
      showToast("error", "Falha ao salvar alterações.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    const action = confirmDialog.action;
    if (!action) return;
    try {
      setIsLoading(true);

      if (action === "delete") {
        const res = await fetch(`/root-admin/api/organizacoes/${org.id}`, { method: "DELETE" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          showToast("error", body?.error || "Falha ao deletar organização.");
          return;
        }
        showToast("success", "Organização removida.");
        setConfirmDialog({ isOpen: false });
        router.push("/root-admin/organizacoes");
        return;
      }

      // suspend or reactivate via status route
      const newStatus = action === "suspend" ? "SUSPENSO" : "ATIVO";
      const res = await fetch(`/root-admin/api/organizacoes/${org.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, motivo: `Alterado via painel root admin` }),
      });
      if (!res.ok) {
        // Fallback: use PATCH with statusEscritorio
        const fallback = await fetch(`/root-admin/api/organizacoes/${org.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statusEscritorio: newStatus }),
        });
        if (!fallback.ok) {
          showToast("error", "Falha ao alterar status.");
          return;
        }
      }
      setOrg({ ...org, statusEscritorio: newStatus });
      setConfirmDialog({ isOpen: false });
      showToast("success", action === "suspend" ? "Organização suspensa." : "Organização reativada.");
    } catch {
      showToast("error", "Falha ao executar ação.");
    } finally {
      setIsLoading(false);
    }
  };

  const storagePercent = stats?.armazenamento?.percentual || 0;
  const isSuspended = org.statusEscritorio === "SUSPENSO" || org.statusEscritorio === "BLOQUEADO";

  return (
    <>
      {toast && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          toast.type === "success"
            ? "border-green-500/30 bg-green-500/10 text-green-300"
            : "border-red-500/30 bg-red-500/10 text-red-300"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">{org.nome}</h1>
            <div className="flex items-center gap-4 flex-wrap">
              <StatusBadge status={org.statusEscritorio} />
              {org.email && <p className="text-[#64748b] text-sm">{org.email}</p>}
              {org.cnpj && <p className="text-[#64748b] text-sm">CNPJ: {org.cnpj}</p>}
              <p className="text-[#64748b] text-sm">/{org.slug}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setEditForm({
                  nome: org.nome || "",
                  email: org.email || "",
                  cnpj: org.cnpj || "",
                  telefone: org.telefone || "",
                  endereco: org.endereco || "",
                  cidade: org.cidade || "",
                  estado: org.estado || "",
                  cep: org.cep || "",
                  limiteUsuarios: org.limiteUsuarios || 10,
                  limiteArmazenamento: org.limiteArmazenamento || 5120,
                  observacoesAdmin: org.observacoesAdmin || "",
                });
                setEditModalOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/30 rounded-lg hover:bg-[#6366f1]/20 text-sm"
            >
              <Edit2 size={14} />
              Editar
            </button>

            {isSuspended ? (
              <button
                onClick={() => setConfirmDialog({ isOpen: true, action: "reactivate" })}
                className="flex items-center gap-2 px-3 py-2 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 text-sm"
              >
                <PlayCircle size={14} />
                Reativar
              </button>
            ) : (
              <button
                onClick={() => setConfirmDialog({ isOpen: true, action: "suspend" })}
                className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 text-sm"
              >
                <PauseCircle size={14} />
                Suspender
              </button>
            )}

            <button
              onClick={() => setConfirmDialog({ isOpen: true, action: "delete" })}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 text-sm"
            >
              <Trash2 size={14} />
              Deletar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[rgba(255,255,255,0.08)]">
        {(["overview", "assinatura", "admin"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-[#6366f1] text-[#6366f1]"
                : "border-transparent text-[#64748b] hover:text-[#e2e8f0]"
            }`}
          >
            {tab === "overview" && "Visão Geral"}
            {tab === "assinatura" && "Assinatura"}
            {tab === "admin" && "Administração"}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-[#6366f1]" />
                <p className="text-[#64748b] text-sm">Usuários</p>
              </div>
              <p className="text-[#e2e8f0] text-2xl font-bold">{stats?.usuarios || 0}</p>
              <p className="text-[#64748b] text-xs mt-1">Limite: {org.limiteUsuarios}</p>
            </div>
            <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-blue-400" />
                <p className="text-[#64748b] text-sm">Documentos</p>
              </div>
              <p className="text-[#e2e8f0] text-2xl font-bold">{stats?.documentos || 0}</p>
            </div>
            <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive size={16} className={storagePercent > 80 ? "text-amber-400" : "text-green-400"} />
                <p className="text-[#64748b] text-sm">Armazenamento</p>
              </div>
              <p className="text-[#e2e8f0] text-2xl font-bold">{storagePercent}%</p>
              <p className="text-[#64748b] text-xs mt-1">{stats?.armazenamento?.usado || 0} / {stats?.armazenamento?.limite || 0} MB</p>
            </div>
            <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-purple-400" />
                <p className="text-[#64748b] text-sm">Criada em</p>
              </div>
              <p className="text-[#e2e8f0] font-semibold">{new Date(org.createdAt).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>

          {/* Storage bar */}
          <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-4">
            <p className="text-[#e2e8f0] font-medium mb-3">Armazenamento</p>
            <div className="w-full bg-[#252530] rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all ${storagePercent > 80 ? "bg-amber-400" : "bg-[#6366f1]"}`}
                style={{ width: `${Math.min(storagePercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-[#64748b]">
              <span>{storagePercent}% usado</span>
              <span>{stats?.armazenamento?.limite || 0} MB total</span>
            </div>
          </div>

          {/* Contact info */}
          <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-4">
            <p className="text-[#e2e8f0] font-medium mb-3">Informações de Contato</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {[
                { label: "E-mail", value: org.email },
                { label: "CNPJ", value: org.cnpj },
                { label: "Telefone", value: org.telefone },
                { label: "Endereço", value: org.endereco },
                { label: "Cidade", value: org.cidade },
                { label: "Estado", value: org.estado },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[#64748b]">{label}</p>
                  <p className="text-[#c7d2e0]">{value || "—"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Users link */}
          <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-[#e2e8f0] font-medium">Usuários desta Organização</p>
              <p className="text-[#64748b] text-sm">{stats?.usuarios || 0} usuário(s) vinculado(s)</p>
            </div>
            <a
              href={`/root-admin/usuarios?organizacaoId=${org.id}`}
              className="px-4 py-2 bg-[#6366f1] text-white rounded-lg hover:bg-[#4f46e5] transition-colors text-sm"
            >
              Gerenciar Usuários
            </a>
          </div>
        </div>
      )}

      {/* Assinatura Tab */}
      {activeTab === "assinatura" && (
        <div className="space-y-4">
          {org.assinaturas ? (
            <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-[#64748b] text-sm mb-1">Plano</p>
                  <p className="text-[#e2e8f0] font-semibold">{org.assinaturas?.plano?.nome || "—"}</p>
                </div>
                <div>
                  <p className="text-[#64748b] text-sm mb-1">Status</p>
                  <StatusBadge status={org.assinaturas?.status || "—"} />
                </div>
                <div>
                  <p className="text-[#64748b] text-sm mb-1">Início</p>
                  <p className="text-[#e2e8f0]">
                    {org.assinaturas?.dataInicio
                      ? new Date(org.assinaturas.dataInicio).toLocaleDateString("pt-BR")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[#64748b] text-sm mb-1">Renovação</p>
                  <p className="text-[#e2e8f0]">
                    {org.assinaturas?.dataRenovacao
                      ? new Date(org.assinaturas.dataRenovacao).toLocaleDateString("pt-BR")
                      : "—"}
                  </p>
                </div>
              </div>
              {org.assinaturas?.plano?.features && (
                <div>
                  <p className="text-[#64748b] text-sm mb-2">Recursos do Plano</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(org.assinaturas.plano.features).map(([key, val]: [string, any]) =>
                      val ? (
                        <span key={key} className="px-2 py-1 bg-[#6366f1]/20 text-[#6366f1] rounded text-xs">
                          {key}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-8 text-center text-[#64748b]">
              Nenhuma assinatura encontrada para esta organização.
            </div>
          )}
        </div>
      )}

      {/* Admin Tab */}
      {activeTab === "admin" && (
        <div className="space-y-4">
          <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-6 space-y-4">
            <p className="text-[#e2e8f0] font-medium">Configurações Administrativas</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-[#252530] rounded-lg p-3">
                <p className="text-[#64748b]">Limite de Usuários</p>
                <p className="text-[#e2e8f0] text-lg font-bold">{org.limiteUsuarios}</p>
              </div>
              <div className="bg-[#252530] rounded-lg p-3">
                <p className="text-[#64748b]">Limite de Armazenamento</p>
                <p className="text-[#e2e8f0] text-lg font-bold">{org.limiteArmazenamento} MB</p>
              </div>
              <div className="bg-[#252530] rounded-lg p-3">
                <p className="text-[#64748b]">Origem do Cadastro</p>
                <p className="text-[#e2e8f0]">{org.origemCadastro || "—"}</p>
              </div>
              <div className="bg-[#252530] rounded-lg p-3">
                <p className="text-[#64748b]">Última Atividade</p>
                <p className="text-[#e2e8f0]">
                  {org.ultimaAtividade ? new Date(org.ultimaAtividade).toLocaleDateString("pt-BR") : "—"}
                </p>
              </div>
            </div>
            {org.observacoesAdmin && (
              <div className="bg-[#252530] rounded-lg p-3">
                <p className="text-[#64748b] text-sm mb-1">Observações do Admin</p>
                <p className="text-[#c7d2e0] text-sm">{org.observacoesAdmin}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-6 my-4">
            <h3 className="text-[#e2e8f0] font-semibold text-lg mb-5">Editar Organização</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#64748b] text-xs mb-1">Nome *</label>
                  <input
                    value={editForm.nome}
                    onChange={(e) => setEditForm((p) => ({ ...p, nome: e.target.value }))}
                    required
                    className="w-full bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
                  />
                </div>
                <div>
                  <label className="block text-[#64748b] text-xs mb-1">E-mail</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
                  />
                </div>
                <div>
                  <label className="block text-[#64748b] text-xs mb-1">CNPJ</label>
                  <input
                    value={editForm.cnpj}
                    onChange={(e) => setEditForm((p) => ({ ...p, cnpj: e.target.value }))}
                    className="w-full bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
                  />
                </div>
                <div>
                  <label className="block text-[#64748b] text-xs mb-1">Telefone</label>
                  <input
                    value={editForm.telefone}
                    onChange={(e) => setEditForm((p) => ({ ...p, telefone: e.target.value }))}
                    className="w-full bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[#64748b] text-xs mb-1">Endereço</label>
                  <input
                    value={editForm.endereco}
                    onChange={(e) => setEditForm((p) => ({ ...p, endereco: e.target.value }))}
                    className="w-full bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
                  />
                </div>
                <div>
                  <label className="block text-[#64748b] text-xs mb-1">Cidade</label>
                  <input
                    value={editForm.cidade}
                    onChange={(e) => setEditForm((p) => ({ ...p, cidade: e.target.value }))}
                    className="w-full bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
                  />
                </div>
                <div>
                  <label className="block text-[#64748b] text-xs mb-1">Estado</label>
                  <input
                    value={editForm.estado}
                    onChange={(e) => setEditForm((p) => ({ ...p, estado: e.target.value }))}
                    maxLength={2}
                    placeholder="SP"
                    className="w-full bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
                  />
                </div>
                <div>
                  <label className="block text-[#64748b] text-xs mb-1">Limite de Usuários</label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.limiteUsuarios}
                    onChange={(e) => setEditForm((p) => ({ ...p, limiteUsuarios: Number(e.target.value) }))}
                    className="w-full bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
                  />
                </div>
                <div>
                  <label className="block text-[#64748b] text-xs mb-1">Limite de Armazenamento (MB)</label>
                  <input
                    type="number"
                    min={512}
                    value={editForm.limiteArmazenamento}
                    onChange={(e) => setEditForm((p) => ({ ...p, limiteArmazenamento: Number(e.target.value) }))}
                    className="w-full bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[#64748b] text-xs mb-1">Observações Admin</label>
                  <textarea
                    value={editForm.observacoesAdmin}
                    onChange={(e) => setEditForm((p) => ({ ...p, observacoesAdmin: e.target.value }))}
                    rows={3}
                    className="w-full bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#252530] text-[#e2e8f0] text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg bg-[#6366f1] text-white disabled:opacity-50 text-sm"
                >
                  {isLoading ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={
          confirmDialog.action === "delete"
            ? "Deletar Organização?"
            : confirmDialog.action === "suspend"
            ? "Suspender Organização?"
            : "Reativar Organização?"
        }
        description={
          confirmDialog.action === "delete"
            ? "A organização será marcada como inativa. Esta ação pode ser revertida."
            : confirmDialog.action === "suspend"
            ? "A organização será suspensa e seus usuários não poderão acessar o sistema."
            : "A organização voltará a ter acesso ao sistema."
        }
        confirmText={
          confirmDialog.action === "delete"
            ? "Deletar"
            : confirmDialog.action === "suspend"
            ? "Suspender"
            : "Reativar"
        }
        variant={confirmDialog.action === "delete" ? "danger" : confirmDialog.action === "suspend" ? "warning" : "default"}
        isLoading={isLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmDialog({ isOpen: false })}
      />
    </>
  );
}
