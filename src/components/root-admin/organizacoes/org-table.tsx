"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DataTable from "@/components/root-admin/shared/data-table";
import StatusBadge from "@/components/root-admin/shared/status-badge";
import ConfirmDialog from "@/components/root-admin/shared/confirm-dialog";
import { Eye, AlertCircle, Trash2, Users } from "lucide-react";

interface Org {
  id: string;
  nome: string;
  slug: string;
  email: string;
  statusEscritorio: string;
  userCount: number;
  createdAt: string;
  assinaturas?: Array<{ plano?: { nome: string } }>;
}

interface OrgTableProps {
  initialOrgs: Org[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
  initialTotalPages: number;
  searchParams: Record<string, string | string[]>;
}

export default function OrgTable({
  initialOrgs,
  initialTotal,
  initialPage,
  initialPageSize,
  initialTotalPages,
  searchParams,
}: OrgTableProps) {
  const router = useRouter();
  const [orgs, setOrgs] = useState(initialOrgs);
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    orgId?: string;
    action?: "suspend" | "delete";
  }>({ isOpen: false });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setIsLoading(true);
    // Reload page with new query params
    const search = Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search || "";
    const status = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status || "";
    router.push(`/root-admin/organizacoes?search=${search}&status=${status}&page=${newPage}`);
  };

  const handleSuspend = async () => {
    if (!confirmDialog.orgId) return;

    try {
      const res = await fetch(
        `/root-admin/api/organizacoes/${confirmDialog.orgId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "SUSPENSO", motivo: "Suspensão via painel root" }),
        }
      );

      if (res.ok) {
        setOrgs(orgs.map(org =>
          org.id === confirmDialog.orgId ? { ...org, statusEscritorio: "SUSPENSO" } : org
        ));
        setConfirmDialog({ isOpen: false });
      }
    } catch (error) {
      console.error("Error suspending org:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirmDialog.orgId) return;

    try {
      const res = await fetch(`/root-admin/api/organizacoes/${confirmDialog.orgId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setOrgs(orgs.filter(org => org.id !== confirmDialog.orgId));
        setConfirmDialog({ isOpen: false });
      }
    } catch (error) {
      console.error("Error deleting org:", error);
    }
  };

  const columns = [
    {
      key: "nome",
      label: "Organização",
      render: (value: string, row: Org) => (
        <div>
          <p className="font-medium">{value}</p>
          <p className="text-xs text-[#64748b]">{row.email}</p>
        </div>
      ),
    },
    {
      key: "statusEscritorio",
      label: "Status",
      render: (value: string) => <StatusBadge status={value} />,
    },
    {
      key: "assinaturas",
      label: "Plano",
      render: (_: any, row: Org) => (
        <span className="text-sm">
          {row.assinaturas?.[0]?.plano?.nome || "—"}
        </span>
      ),
    },
    {
      key: "userCount",
      label: "Usuários",
      render: (value: number) => <span>{value}</span>,
    },
    {
      key: "createdAt",
      label: "Criado em",
      render: (value: string) => new Date(value).toLocaleDateString("pt-BR"),
    },
    {
      key: "id",
      label: "Ações",
      render: (_: string, row: Org) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/root-admin/organizacoes/${row.id}`}
            className="p-1 hover:bg-[#252530] rounded text-[#64748b] hover:text-[#e2e8f0]"
            title="Visualizar"
          >
            <Eye size={16} />
          </Link>
          <Link
            href={`/root-admin/usuarios?organizacaoId=${row.id}`}
            className="p-1 hover:bg-[#252530] rounded text-[#64748b] hover:text-[#6366f1]"
            title="Ver usuários da organização"
          >
            <Users size={16} />
          </Link>
          <button
            onClick={() => setConfirmDialog({ isOpen: true, orgId: row.id, action: "suspend" })}
            className="p-1 hover:bg-[#252530] rounded text-[#64748b] hover:text-amber-400"
            title="Suspender"
          >
            <AlertCircle size={16} />
          </button>
          <button
            onClick={() => setConfirmDialog({ isOpen: true, orgId: row.id, action: "delete" })}
            className="p-1 hover:bg-[#252530] rounded text-[#64748b] hover:text-red-400"
            title="Deletar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={orgs}
        isLoading={isLoading}
        emptyMessage="Nenhuma organização encontrada"
        pagination={{
          page,
          pageSize: initialPageSize,
          total: initialTotal,
          totalPages: initialTotalPages,
          onPageChange: handlePageChange,
        }}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.action === "suspend" ? "Suspender Organização?" : "Deletar Organização?"}
        description={
          confirmDialog.action === "suspend"
            ? "A organização será suspensa e seus usuários não poderão acessar."
            : "Esta ação não pode ser desfeita."
        }
        confirmText={confirmDialog.action === "suspend" ? "Suspender" : "Deletar"}
        variant={confirmDialog.action === "delete" ? "danger" : "warning"}
        onConfirm={confirmDialog.action === "suspend" ? handleSuspend : handleDelete}
        onCancel={() => setConfirmDialog({ isOpen: false })}
      />
    </>
  );
}
