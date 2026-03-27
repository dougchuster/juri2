import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/actions/auth";
import LoginPageClient from "./login-client";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <Suspense>
      <LoginPageClient />
    </Suspense>
  );
}
