import { redirect } from "next/navigation";
import { getSession } from "@/actions/auth";
import { LegalLandingPage } from "@/components/marketing/legal-landing-page";

export default async function HomePage() {
  const user = await getSession();
  if (user) {
    redirect("/dashboard");
  }

  return <LegalLandingPage />;
}
