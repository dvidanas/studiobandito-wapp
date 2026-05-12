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
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let isDark = localStorage.getItem('theme') === 'dark' || !localStorage.getItem('theme');
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
