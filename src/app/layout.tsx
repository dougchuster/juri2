import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const fontDisplay = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-display-ui",
  display: "swap",
  weight: ["500", "600", "700"],
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-code",
  display: "swap",
  weight: ["400", "500", "600"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juridicoadv.com.br";
const siteTitle = "Juridico ADV — Plataforma de Gestão para Escritórios de Advocacia";
const siteDescription =
  "Sistema jurídico completo com gestão de prazos, processos, CRM, financeiro, automação e portal do cliente. Desenvolvido para escritórios de advocacia de alta exigência. Conformidade LGPD.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3efe9" },
    { media: "(prefers-color-scheme: dark)", color: "#241b18" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | Juridico ADV",
  },
  description: siteDescription,
  keywords: [
    "sistema jurídico",
    "software para escritório de advocacia",
    "gestão jurídica",
    "CRM jurídico",
    "controle de prazos processuais",
    "financeiro advocacia",
    "automação jurídica",
    "portal do cliente jurídico",
    "LGPD advocacia",
    "plataforma jurídica SaaS",
  ],
  authors: [{ name: "Juridico ADV" }],
  creator: "Juridico ADV",
  publisher: "Juridico ADV",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Juridico ADV",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/images/og-cover.png",
        width: 1200,
        height: 630,
        alt: "Juridico ADV — Plataforma de Gestão Jurídica",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/images/og-cover.png"],
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [{ url: "/images/logoadv.png?v=3", type: "image/png", sizes: "32x32" }],
    shortcut: [{ url: "/images/logoadv.png?v=3", type: "image/png" }],
    apple: [{ url: "/images/logoadv.png?v=3", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="light" suppressHydrationWarning>
      <head>
        {/* UTF-8 garante codificação correta de caracteres especiais */}
        <meta charSet="utf-8" />
        {/* Prevent theme flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');document.documentElement.className=t||'light';})();`,
          }}
        />
      </head>
      <body className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
