import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@whiskeysockets/baileys", "pino", "pino-pretty"],
  async headers() {
    // La landing vive en otro dominio (Vercel), así que necesita CORS. Un solo
    // bloque para todo /api/publico: al agregar un endpoint público no hay que
    // acordarse de sumar los headers acá.
    return [
      {
        source: "/api/publico/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
};

export default nextConfig;
