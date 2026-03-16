import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  serverExternalPackages: ["node-cron", "@whiskeysockets/baileys", "qrcode", "pino"],
};

export default nextConfig;
