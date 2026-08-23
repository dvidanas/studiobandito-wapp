import { Sidebar } from "@/components/panel/Sidebar";
import { NuevoTurnoWatcher } from "@/components/panel/NuevoTurnoWatcher";

/**
 * Shell compartido del panel. Antes cada página repetía <TopNav /> y
 * <BottomNav /> a mano; ahora el chrome vive acá una sola vez.
 *
 * Las vistas del panel son de alto fijo con scroll interno (estilo app de chat),
 * no páginas con scroll de documento: por eso <main> ocupa el alto de la ventana
 * y no agrega padding propio. Cada página se encarga de su propio scroll.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-wa-bg-main)]">
      <Sidebar />
      <NuevoTurnoWatcher />
      {/* pt-16 deja lugar a la barra superior móvil; md:pl-[240px] al sidebar fijo. */}
      <main className="h-dvh pt-16 md:pt-0 md:pl-[240px] flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
