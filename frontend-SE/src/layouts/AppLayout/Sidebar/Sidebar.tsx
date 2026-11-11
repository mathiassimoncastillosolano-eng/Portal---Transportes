import { Drawer } from '@/components/ui/Drawer'
import { useSidebar } from '@/hooks/useSidebar'
import { cn } from '@/utils/cn'
import { SidebarHeader } from './SidebarHeader'
import { SidebarNavigation } from './SidebarNavigation'

/**
 * Sidebar como componente independiente del resto del layout.
 * No sabe nada del Header ni del MainContent: solo lee su propio
 * estado desde `useSidebar` (que a su vez vive en `uiStore`).
 *
 * Renderiza dos variantes según el dispositivo:
 *  - Desktop/tablet: raíl fijo que anima su ancho (expanded/collapsed).
 *  - Mobile: Drawer superpuesto (mobile-open/mobile-closed).
 */
export function Sidebar() {
  const { mode, device, isCollapsed, isMobileOpen, closeMobile } = useSidebar()

  const railContent = (
    <>
      <SidebarHeader collapsed={isCollapsed} />
      <SidebarNavigation collapsed={isCollapsed} />
    </>
  )

  if (device === 'mobile') {
    return (
      <Drawer
        open={isMobileOpen}
        onClose={closeMobile}
        aria-label="Navegación principal"
        widthClassName="w-[280px]"
        panelClassName="flex flex-col"
      >
        <div className="flex h-full flex-col" onClick={(e) => e.stopPropagation()}>
          <SidebarHeader collapsed={false} />
          <SidebarNavigation collapsed={false} onNavigate={closeMobile} />
        </div>
      </Drawer>
    )
  }

  return (
    <aside
      data-sidebar-mode={mode}
      aria-label="Navegación principal"
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col border-r border-white/[0.04] bg-gradient-to-b from-ink-950 to-ink-900 transition-[width] duration-300 ease-in-out',
        isCollapsed ? 'w-[76px]' : 'w-[264px]',
      )}
    >
      {railContent}
    </aside>
  )
}
