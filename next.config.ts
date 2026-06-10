import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@whiskeysockets/baileys", "pino", "pino-pretty"],
};

export default nextConfig;
