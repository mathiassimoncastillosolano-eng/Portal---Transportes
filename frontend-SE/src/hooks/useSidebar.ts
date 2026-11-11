import { useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useDeviceKind } from '@/hooks/useMediaQuery'

/**
 * Modelo de estados del Sidebar, como pide la arquitectura:
 *   expanded | collapsed | mobile-open | mobile-closed
 *
 * Este hook es la ÚNICA fuente de verdad sobre "qué forma tiene el
 * sidebar ahora mismo". Sidebar, Header y AppLayout lo consumen en vez
 * de leer banderas sueltas, así que cambiar el comportamiento
 * responsive se hace en un solo lugar.
 */
export type SidebarMode = 'expanded' | 'collapsed' | 'mobile-open' | 'mobile-closed'

export function useSidebar() {
  const device = useDeviceKind()
  const sidebarState = useUIStore((s) => s.sidebarState)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const setSidebarState = useUIStore((s) => s.setSidebarState)
  const mobileOpen = useUIStore((s) => s.mobileSidebarOpen)
  const openMobile = useUIStore((s) => s.openMobileSidebar)
  const closeMobile = useUIStore((s) => s.closeMobileSidebar)

  // En tablet forzamos "collapsed" para priorizar el área de contenido,
  // sin pisar la preferencia guardada del usuario para desktop.
  useEffect(() => {
    if (device === 'tablet' && sidebarState === 'expanded') {
      setSidebarState('collapsed')
    }
  }, [device, sidebarState, setSidebarState])

  // Al pasar a mobile, aseguramos que el drawer arranque cerrado.
  useEffect(() => {
    if (device !== 'mobile' && mobileOpen) closeMobile()
  }, [device, mobileOpen, closeMobile])

  const mode: SidebarMode =
    device === 'mobile' ? (mobileOpen ? 'mobile-open' : 'mobile-closed') : sidebarState

  function toggle() {
    if (device === 'mobile') {
      if (mobileOpen) closeMobile()
      else openMobile()
    } else {
      toggleSidebar()
    }
  }

  return {
    mode,
    device,
    isCollapsed: mode === 'collapsed',
    isExpanded: mode === 'expanded',
    isMobileOpen: mode === 'mobile-open',
    toggle,
    closeMobile,
  }
}
