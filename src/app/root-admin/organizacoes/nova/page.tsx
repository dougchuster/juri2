import { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import OrgCreateForm from "@/components/root-admin/organizacoes/org-create-form";

export const metadata: Metadata = {
  title: "Nova Organização - Root Admin",
  description: "Criar nova organização",
};

export default function NovaOrgPage() {
  return (
    <div className="p-8 space-y-8">
      <Link
        href="/root-admin/organizacoes"
        className="flex items-center gap-2 text-[#6366f1] hover:text-[#4f46e5]"
      >
        <ArrowLeft size={20} />
        Voltar
      </Link>

      <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-2">Nova Organização</h1>
          <p className="text-[#64748b]">Criar uma nova organização na plataforma</p>
        </div>

        <OrgCreateForm />
      </div>
    </div>
  );
}
