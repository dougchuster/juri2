import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript e ESLint são verificados em dev — no build de produção
  // desabilitamos para evitar OOM em VPS com RAM limitada.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
    "@whiskeysockets/baileys",
    "qrcode",
    "pino",
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "@google/genai",
    "@hapi/boom",
  ],
};

export default nextConfig;
