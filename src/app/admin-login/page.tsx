import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSuperAdminSession } from "@/actions/root-admin-auth";
import RootAdminLoginForm from "@/components/root-admin/login/root-admin-login-form";

export const metadata: Metadata = {
  title: "Login - Root Admin",
  description: "Login do painel administrativo root",
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  // If already logged in, redirect to dashboard
  const session = await getSuperAdminSession();
  if (session) {
    redirect("/root-admin");
  }

  return (
    <div className="min-h-screen bg-[#0f0f14] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Root Admin</h1>
          <p className="text-[#64748b]">Painel administrativo da plataforma</p>
        </div>

        <RootAdminLoginForm />
      </div>
    </div>
  );
}
