"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SuperAdmin } from "@/generated/prisma";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Zap,
  PlugZap,
  LifeBuoy,
  Settings,
  BarChart3,
  LogOut,
} from "lucide-react";
import { rootAdminLogout } from "@/actions/root-admin-auth";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/root-admin",
    icon: LayoutDashboard,
  },
  {
    label: "Organizações",
    href: "/root-admin/organizacoes",
    icon: Building2,
  },
  {
    label: "Usuários",
    href: "/root-admin/usuarios",
    icon: Users,
  },
  {
    label: "Financeiro",
    href: "/root-admin/financeiro",
    icon: CreditCard,
  },
  {
    label: "Sistema",
    href: "/root-admin/sistema",
    icon: Zap,
  },
  {
    label: "Integrações",
    href: "/root-admin/integracoes",
    icon: PlugZap,
  },
  {
    label: "Suporte",
    href: "/root-admin/suporte",
    icon: LifeBuoy,
  },
  {
    label: "Configurações",
    href: "/root-admin/configuracoes",
    icon: Settings,
  },
  {
    label: "Relatórios",
    href: "/root-admin/relatorios",
    icon: BarChart3,
  },
];

interface RootSidebarProps {
  superAdmin: SuperAdmin;
}

export default function RootSidebar({ superAdmin }: RootSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="h-full flex flex-col bg-[#1a1a24] p-6">
      {/* Logo */}
      <div className="mb-8">
        <Link href="/root-admin" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-[#6366f1] flex items-center justify-center">
            <span className="text-white font-bold text-lg">⚙️</span>
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">Admin</h2>
            <p className="text-[#64748b] text-xs">Root Panel</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-[#6366f1] text-white"
                  : "text-[#64748b] hover:bg-[#252530]"
              }`}
            >
              <Icon size={20} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="pt-4 border-t border-[rgba(255,255,255,0.08)] space-y-3">
        <div className="px-4 py-2">
          <p className="text-xs text-[#64748b]">Logado como</p>
          <p className="text-sm font-medium text-[#e2e8f0] truncate">
            {superAdmin.email}
          </p>
        </div>

        <form action={rootAdminLogout} className="w-full">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#64748b] hover:bg-[#252530] transition-colors text-sm font-medium"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </form>
      </div>
    </div>
  );
}
