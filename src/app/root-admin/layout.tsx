import { redirect } from "next/navigation";
import { requireSuperAdminSession } from "@/actions/root-admin-auth";
import RootAdminShell from "@/components/root-admin/layout/root-admin-shell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Root Admin - Sistema Jurídico",
  description: "Painel administrativo da plataforma",
};

export default async function RootAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Require authentication for all routes in this group
  const session = await requireSuperAdminSession();

  return (
    <RootAdminShell superAdmin={session.superAdmin}>
      {children}
    </RootAdminShell>
  );
}
