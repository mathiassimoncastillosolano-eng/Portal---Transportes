import { useEffect } from 'react'
import { CommandPalette } from '@/components/command/CommandPalette'
import { homeSectionFor } from '@/config/navigation'
import { TODAS_LAS_SEDES, useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { Sidebar } from './Sidebar/Sidebar'
import { Header } from './Header/Header'
import { MainContent } from './MainContent/MainContent'

/**
 * Composición raíz del App Shell:
 *
 *   <AppLayout>
 *     <Sidebar />
 *     <MainArea>
 *       <Header />
 *       <MainContent /> (renderiza la Main View única)
 *     </MainArea>
 *   </AppLayout>
 *
 * Este es el único lugar donde Sidebar, Header y MainContent se
 * ensamblan. Las secciones nunca importan estas piezas directamente —
 * se registran en `views/MainView/SectionRegistry.tsx` y se muestran
 * ahí según la sección activa del Sidebar.
 */
export function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const setActiveSection = useUIStore((s) => s.setActiveSection)
  const setCurrentBranchId = useUIStore((s) => s.setCurrentBranchId)

  // Al iniciar sesión (o recargar con sesión): pantalla de inicio según el rol y sede asignada.
  useEffect(() => {
    if (!user) return
    setActiveSection(homeSectionFor(user))
    if (user.agenciaId !== TODAS_LAS_SEDES) setCurrentBranchId(user.agenciaId)
  }, [user, setActiveSection, setCurrentBranchId])

  return (
    <div className="app-canvas flex min-h-screen bg-surface">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-ink-950 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Saltar al contenido principal
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <MainContent />
      </div>
      <CommandPalette />
    </div>
  )
}
