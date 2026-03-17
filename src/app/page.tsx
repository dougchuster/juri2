import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/actions/auth";
import { LegalLandingPage } from "@/components/marketing/legal-landing-page";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juridicoadv.com.br";

export const metadata: Metadata = {
  title: "Juridico ADV | Software Jurídico para Escritórios de Advocacia",
  description:
    "Plataforma jurídica completa para escritórios de advocacia com CRM, processos, prazos, financeiro, automação e portal do cliente.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Juridico ADV | Software Jurídico para Escritórios de Advocacia",
    description:
      "Ganhe velocidade operacional com CRM jurídico, gestão processual, financeiro e automações em uma única plataforma.",
    url: siteUrl,
    images: [
      {
        url: "/images/og-cover.png",
        width: 1200,
        height: 630,
        alt: "Juridico ADV - Plataforma jurídica completa",
      },
    ],
  },
};

export default async function HomePage() {
  const user = await getSession();
  if (user) {
    redirect("/dashboard");
  }

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Juridico ADV",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: siteUrl,
    inLanguage: "pt-BR",
    description:
      "Software jurídico para gestão de processos, prazos, CRM, financeiro e automação para escritórios de advocacia.",
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
    },
    publisher: {
      "@type": "Organization",
      name: "Juridico ADV",
      url: siteUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <LegalLandingPage />
    </>
  );
}
