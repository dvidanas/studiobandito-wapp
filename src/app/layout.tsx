import type { Metadata } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import { clientConfig } from "@/lib/client.config";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Bandito no tiene una serif de marca (ni el panel viejo ni la landing la
// usan): Corte traía Playfair Display para su estética de "barbería
// inglesa clásica", que no es la identidad de este cliente. Se saca la
// fuente entera en vez de dejarla sin usar — es una carga de red de más
// sin ningún beneficio visual. .font-display en globals.css apunta a la
// misma sans, así que ningún componente que lo use necesita tocarse.

export const metadata: Metadata = {
  title: clientConfig.nombre,
  description: `Panel de gestión — ${clientConfig.nombre}`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning className={sans.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0F0F10" media="(prefers-color-scheme: dark)" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                // El panel arranca en claro (temaDefault en client.config).
                // Solo pasa a oscuro si el usuario lo eligió explícitamente.
                let isDark = localStorage.getItem('theme') === 'dark';
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
