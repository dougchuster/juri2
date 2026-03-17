"use client";

import { SuperAdmin } from "@/generated/prisma";
import RootSidebar from "./root-sidebar";
import RootHeader from "./root-header";

interface RootAdminShellProps {
  superAdmin: SuperAdmin;
  children: React.ReactNode;
}

export default function RootAdminShell({
  superAdmin,
  children,
}: RootAdminShellProps) {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "#0f0f14",
      }}
    >
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-[rgba(255,255,255,0.08)] overflow-y-auto">
          <RootSidebar superAdmin={superAdmin} />
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b border-[rgba(255,255,255,0.08)]">
            <RootHeader superAdmin={superAdmin} />
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-[#0f0f14]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
