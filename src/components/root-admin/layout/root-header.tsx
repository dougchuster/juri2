"use client";

import { SuperAdmin } from "@/generated/prisma";
import { Bell, ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";

interface RootHeaderProps {
  superAdmin: SuperAdmin;
}

export default function RootHeader({ superAdmin }: RootHeaderProps) {
  const pathname = usePathname();
  const currentPath = pathname || "";
  const pageName = currentPath.split("/").pop() || "Dashboard";

  return (
    <header className="bg-[#1a1a24] px-8 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-[#e2e8f0] font-semibold capitalize">
          {pageName === "root-admin" ? "Dashboard" : pageName.replace(/-/g, " ")}
        </h2>
        <p className="text-[#64748b] text-sm">
          Bem-vindo ao painel administrativo
        </p>
      </div>

      <div className="flex items-center gap-6">
        {/* Notifications */}
        <button className="relative p-2 hover:bg-[#252530] rounded-lg transition-colors">
          <Bell size={20} className="text-[#64748b]" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#6366f1] rounded-full"></span>
        </button>

        {/* User menu */}
        <button className="flex items-center gap-3 px-3 py-2 hover:bg-[#252530] rounded-lg transition-colors">
          <div className="w-8 h-8 rounded-full bg-[#6366f1] flex items-center justify-center text-white text-sm font-bold">
            {superAdmin.email.charAt(0).toUpperCase()}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-[#e2e8f0] text-sm font-medium">
              {superAdmin.nome}
            </p>
            <p className="text-[#64748b] text-xs">Super Admin</p>
          </div>
          <ChevronDown size={16} className="text-[#64748b]" />
        </button>
      </div>
    </header>
  );
}
