import type { NextConfig } from "next";

// TypeScript e ESLint são verificados em dev — no build de produção
// desabilitamos ignoreBuildErrors para evitar OOM em VPS com RAM limitada.
// No Next.js 16, o ESLint não roda durante o build por padrão.
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
  serverExternalPackages: [
    "node-cron",
    "bullmq",
    "@whiskeysockets/baileys",
    "qrcode",
    "pino",
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "@google/genai",
    "googleapis",
    "google-auth-library",
    "@googleapis/calendar",
    "@hapi/boom",
  ],
};

export default nextConfig;
