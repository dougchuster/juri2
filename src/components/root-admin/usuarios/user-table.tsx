"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmDialog from "@/components/root-admin/shared/confirm-dialog";
import { Eye, Ban, CheckCircle2, Plus, Trash2, UserPen, KeyRound, Mail } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  organizationId: string | null;
  organization: {
    id: string;
    nome: string;
    email: string | null;
    slug: string | null;
  } | null;
}

interface Organization {
  id: string;
  nome: string;
  email: string | null;
  slug: string | null;
}

interface UserTableProps {
  initialUsers: User[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
  initialTotalPages: number;
  organizations: Organization[];
  searchParams: Record<string, string | string[]>;
}

const roleMap: Record<string, string> = {
  ADMIN: "Admin",
  SOCIO: "Socio",
  ADVOGADO: "Advogado",
  CONTROLADOR: "Controlador",
  ASSISTENTE: "Assistente",
  FINANCEIRO: "Financeiro",
  SECRETARIA: "Secretaria",
};

export default function UserTable({
  initialUsers,
  initialTotal,
  initialPage,
  initialPageSize,
  initialTotalPages,
  organizations,
  searchParams,
}: UserTableProps) {
  const router = useRouter();

  const [users, setUsers] = useState(initialUsers);
  const [page, setPage] = useState(initialPage);
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  const [search, setSearch] = useState(
    Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search || ""
  );
  const [roleFilter, setRoleFilter] = useState(
    Array.isArray(searchParams.role) ? searchParams.role[0] : searchParams.role || ""
  );
  const [organizationFilter, setOrganizationFilter] = useState(
    Array.isArray(searchParams.organizacaoId) ? searchParams.organizacaoId[0] : searchParams.organizacaoId || ""
  );

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    role: "ASSISTENTE",
    organizationId: "",
    sendResetRequest: true,
  });

  const [editForm, setEditForm] = useState({
    name: "",
    role: "ASSISTENTE",
    organizationId: "",
  });

  const [newPassword, setNewPassword] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    userId?: string;
    action?: "block" | "unblock" | "delete" | "sendResetRequest";
  }>({ isOpen: false });

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  function buildListUrl(nextPage: number) {
    const params = new URLSearchParams({
      search,
      role: roleFilter,
      organizacaoId: organizationFilter,
      page: String(nextPage),
      limit: String(initialPageSize),
    });

    return `/root-admin/usuarios?${params}`;
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    router.push(buildListUrl(newPage));
  };

  const handleFilter = () => {
    router.push(buildListUrl(1));
  };

  const handleToggleBlock = async () => {
    if (!confirmDialog.userId) return;

    const user = users.find((u) => u.id === confirmDialog.userId);
    if (!user) return;

    try {
      setIsLoadingAction(true);
      const res = await fetch(`/root-admin/api/usuarios/${confirmDialog.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast("error", body?.error || "Falha ao atualizar status do usuario.");
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === confirmDialog.userId ? { ...u, isActive: !u.isActive } : u))
      );
      showToast("success", user.isActive ? "Usuario bloqueado com sucesso." : "Usuario desbloqueado com sucesso.");
      setConfirmDialog({ isOpen: false });
    } catch (error) {
      console.error("Error toggling user block:", error);
      showToast("error", "Falha ao atualizar status do usuario.");
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDialog.userId) return;

    try {
      setIsLoadingAction(true);
      const res = await fetch(`/root-admin/api/usuarios/${confirmDialog.userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast("error", body?.error || "Falha ao remover usuario.");
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== confirmDialog.userId));
      showToast("success", "Usuario removido com sucesso.");
      setConfirmDialog({ isOpen: false });
    } catch (error) {
      console.error("Error deleting user:", error);
      showToast("error", "Falha ao remover usuario.");
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleSendResetRequest = async () => {
    if (!confirmDialog.userId) return;

    try {
      setIsLoadingAction(true);
      const res = await fetch(`/root-admin/api/usuarios/${confirmDialog.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sendResetRequest" }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast("error", body?.error || "Falha ao enviar solicitacao de senha.");
        return;
      }

      showToast("success", "Solicitacao de nova senha enviada para o usuario.");
      setConfirmDialog({ isOpen: false });
    } catch (error) {
      console.error("Error sending reset request:", error);
      showToast("error", "Falha ao enviar solicitacao de senha.");
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsLoadingAction(true);
      const res = await fetch("/root-admin/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast("error", body?.error || "Falha ao criar usuario.");
        return;
      }

      setCreateModalOpen(false);
      setCreateForm({
        name: "",
        email: "",
        role: "ASSISTENTE",
        organizationId: "",
        sendResetRequest: true,
      });
      showToast("success", "Usuario criado com sucesso.");
      router.refresh();
    } catch (error) {
      console.error("Error creating user:", error);
      showToast("error", "Falha ao criar usuario.");
    } finally {
      setIsLoadingAction(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      role: user.role,
      organizationId: user.organizationId || "",
    });
    setEditModalOpen(true);
  };

  const handleEditUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser) return;

    try {
      setIsLoadingAction(true);
      const res = await fetch(`/root-admin/api/usuarios/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast("error", body?.error || "Falha ao salvar alteracoes.");
        return;
      }

      setEditModalOpen(false);
      setSelectedUser(null);
      showToast("success", "Usuario atualizado com sucesso.");
      router.refresh();
    } catch (error) {
      console.error("Error editing user:", error);
      showToast("error", "Falha ao salvar alteracoes.");
    } finally {
      setIsLoadingAction(false);
    }
  };

  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword("");
    setPasswordModalOpen(true);
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser) return;

    try {
      setIsLoadingAction(true);
      const res = await fetch(`/root-admin/api/usuarios/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetPassword", newPassword }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast("error", body?.error || "Falha ao redefinir senha.");
        return;
      }

      setPasswordModalOpen(false);
      setSelectedUser(null);
      setNewPassword("");
      showToast("success", "Senha redefinida com sucesso.");
    } catch (error) {
      console.error("Error resetting password:", error);
      showToast("error", "Falha ao redefinir senha.");
    } finally {
      setIsLoadingAction(false);
    }
  };

  const groupedUsers = users.reduce<Record<string, { title: string; items: User[] }>>((acc, user) => {
    const key = user.organizationId || "sem-organizacao";
    const title = user.organization?.nome || "Sem organizacao";

    if (!acc[key]) {
      acc[key] = { title, items: [] };
    }

    acc[key].items.push(user);
    return acc;
  }, {});

  const groupEntries = Object.entries(groupedUsers).sort((a, b) => a[1].title.localeCompare(b[1].title));

  return (
    <>
      {toast && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-4 grid gap-3 md:grid-cols-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail"
          className="bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
        />

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
        >
          <option value="">Todos os cargos</option>
          {Object.entries(roleMap).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={organizationFilter}
          onChange={(e) => setOrganizationFilter(e.target.value)}
          className="bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
        >
          <option value="">Todas as organizacoes</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.nome}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            onClick={handleFilter}
            className="flex-1 px-3 py-2 bg-[#6366f1] text-white rounded-lg hover:bg-[#4f46e5] text-sm"
          >
            Filtrar
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3 py-2 bg-[#0f172a] border border-[rgba(255,255,255,0.2)] text-[#e2e8f0] rounded-lg hover:bg-[#1e293b]"
            title="Criar usuario"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {groupEntries.length === 0 && (
          <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-8 text-center text-[#64748b]">
            Nenhum usuario encontrado.
          </div>
        )}

        {groupEntries.map(([groupId, group]) => (
          <div key={groupId} className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)] bg-[#202030]">
              <p className="text-[#e2e8f0] font-semibold">{group.title}</p>
              <p className="text-xs text-[#64748b]">{group.items.length} usuario(s)</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.08)]">
                    <th className="px-4 py-3 text-left text-sm text-[#e2e8f0]">Usuario</th>
                    <th className="px-4 py-3 text-left text-sm text-[#e2e8f0]">Cargo</th>
                    <th className="px-4 py-3 text-left text-sm text-[#e2e8f0]">Status</th>
                    <th className="px-4 py-3 text-left text-sm text-[#e2e8f0]">Ultimo Acesso</th>
                    <th className="px-4 py-3 text-left text-sm text-[#e2e8f0]">Criado em</th>
                    <th className="px-4 py-3 text-left text-sm text-[#e2e8f0]">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((row) => (
                    <tr key={row.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#252530]">
                      <td className="px-4 py-3 text-sm text-[#c7d2e0]">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-[#64748b]">{row.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#c7d2e0]">
                        <span className="px-2 py-1 bg-[#6366f1]/20 text-[#6366f1] rounded text-sm">
                          {roleMap[row.role] || row.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={row.isActive ? "text-green-400" : "text-red-400"}>
                          {row.isActive ? "Ativo" : "Bloqueado"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#c7d2e0]">
                        {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleDateString("pt-BR") : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#c7d2e0]">
                        {new Date(row.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/root-admin/usuarios/${row.id}`}
                            className="p-1 hover:bg-[#111118] rounded text-[#64748b] hover:text-[#e2e8f0]"
                            title="Visualizar"
                          >
                            <Eye size={16} />
                          </Link>

                          <button
                            onClick={() => openEditModal(row)}
                            className="p-1 hover:bg-[#111118] rounded text-[#64748b] hover:text-[#60a5fa]"
                            title="Editar usuario"
                          >
                            <UserPen size={16} />
                          </button>

                          <button
                            onClick={() => openPasswordModal(row)}
                            className="p-1 hover:bg-[#111118] rounded text-[#64748b] hover:text-[#f59e0b]"
                            title="Redefinir senha"
                          >
                            <KeyRound size={16} />
                          </button>

                          <button
                            onClick={() => setConfirmDialog({ isOpen: true, userId: row.id, action: "sendResetRequest" })}
                            className="p-1 hover:bg-[#111118] rounded text-[#64748b] hover:text-[#22c55e]"
                            title="Enviar solicitacao de nova senha"
                          >
                            <Mail size={16} />
                          </button>

                          <button
                            onClick={() =>
                              setConfirmDialog({
                                isOpen: true,
                                userId: row.id,
                                action: row.isActive ? "block" : "unblock",
                              })
                            }
                            className={`p-1 hover:bg-[#111118] rounded text-[#64748b] ${
                              row.isActive ? "hover:text-red-400" : "hover:text-green-400"
                            }`}
                            title={row.isActive ? "Bloquear" : "Desbloquear"}
                          >
                            {row.isActive ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                          </button>

                          <button
                            onClick={() => setConfirmDialog({ isOpen: true, userId: row.id, action: "delete" })}
                            className="p-1 hover:bg-[#111118] rounded text-[#64748b] hover:text-red-500"
                            title="Remover usuario"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg">
        <div className="text-sm text-[#64748b]">
          Pagina {page} de {initialTotalPages} ({initialTotal} registros)
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-3 py-1 rounded border border-[rgba(255,255,255,0.12)] text-[#c7d2e0] disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            onClick={() => handlePageChange(Math.min(initialTotalPages || 1, page + 1))}
            disabled={page >= initialTotalPages}
            className="px-3 py-1 rounded border border-[rgba(255,255,255,0.12)] text-[#c7d2e0] disabled:opacity-40"
          >
            Proxima
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={
          confirmDialog.action === "delete"
            ? "Remover usuario?"
            : confirmDialog.action === "sendResetRequest"
              ? "Enviar solicitacao de nova senha?"
              : confirmDialog.action === "block"
                ? "Bloquear usuario?"
                : "Desbloquear usuario?"
        }
        description={
          confirmDialog.action === "delete"
            ? "O usuario sera desativado, sessoes serao encerradas e ele nao podera acessar o sistema."
            : confirmDialog.action === "sendResetRequest"
              ? "Um e-mail sera enviado para o usuario definir uma nova senha."
              : confirmDialog.action === "block"
                ? "O usuario nao podera acessar a plataforma."
                : "O usuario podera acessar novamente."
        }
        confirmText={
          confirmDialog.action === "delete"
            ? "Remover"
            : confirmDialog.action === "sendResetRequest"
              ? "Enviar"
              : confirmDialog.action === "block"
                ? "Bloquear"
                : "Desbloquear"
        }
        variant={
          confirmDialog.action === "delete"
            ? "danger"
            : confirmDialog.action === "block"
              ? "danger"
              : "default"
        }
        isLoading={isLoadingAction}
        onConfirm={
          confirmDialog.action === "delete"
            ? handleDeleteUser
            : confirmDialog.action === "sendResetRequest"
              ? handleSendResetRequest
              : handleToggleBlock
        }
        onCancel={() => setConfirmDialog({ isOpen: false })}
      />

      {createModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-6">
            <h3 className="text-[#e2e8f0] font-semibold text-lg mb-4">Criar usuario</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
                className="w-full bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
                required
              />
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="E-mail"
                className="w-full bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
                >
                  {Object.entries(roleMap)
                    .filter(([value]) => value !== "ADVOGADO")
                    .map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                </select>

                <select
                  value={createForm.organizationId}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, organizationId: e.target.value }))}
                  className="bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
                >
                  <option value="">Sem organizacao</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.nome}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-[#c7d2e0]">
                <input
                  type="checkbox"
                  checked={createForm.sendResetRequest}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, sendResetRequest: e.target.checked }))
                  }
                />
                Enviar solicitacao de definicao de senha apos criar
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#252530] text-[#e2e8f0]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoadingAction}
                  className="px-4 py-2 rounded-lg bg-[#6366f1] text-white disabled:opacity-50"
                >
                  Criar usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-6">
            <h3 className="text-[#e2e8f0] font-semibold text-lg mb-4">Editar usuario</h3>
            <form onSubmit={handleEditUser} className="space-y-3">
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
                >
                  {Object.entries(roleMap)
                    .filter(([value]) => value !== "ADVOGADO")
                    .map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                </select>

                <select
                  value={editForm.organizationId}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, organizationId: e.target.value }))}
                  className="bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
                >
                  <option value="">Sem organizacao</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#252530] text-[#e2e8f0]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoadingAction}
                  className="px-4 py-2 rounded-lg bg-[#6366f1] text-white disabled:opacity-50"
                >
                  Salvar alteracoes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {passwordModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-6">
            <h3 className="text-[#e2e8f0] font-semibold text-lg mb-4">Redefinir senha</h3>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <p className="text-sm text-[#64748b]">Usuario: {selectedUser.email}</p>
              <input
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nova senha (minimo 8 caracteres)"
                className="w-full bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#e2e8f0]"
                required
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#252530] text-[#e2e8f0]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoadingAction}
                  className="px-4 py-2 rounded-lg bg-[#6366f1] text-white disabled:opacity-50"
                >
                  Redefinir senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
