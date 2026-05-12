import type { Metadata } from "next";
import "./globals.css";
import { clientConfig } from "@/lib/client.config";

export const metadata: Metadata = {
  title: clientConfig.businessName,
  description: `Panel de gestión de WhatsApp — ${clientConfig.businessName}`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
