import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Sistema Jurídico",
  description: "Sistema de Gestão para Escritório de Advocacia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        {/* Ensure the browser always decodes HTML as UTF-8 (fixes mojibake like "Publicações"). */}
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Prevent theme flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var t = localStorage.getItem('theme');
                if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                document.documentElement.className = t;
              })();
            `,
          }}
        />
      </head>
      <body className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
