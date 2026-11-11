import type { LucideIcon } from 'lucide-react'

/**
 * Un enlace de navegación individual dentro del Sidebar.
 *
 * `sectionId` identifica la sección de la Main View que este item
 * activa (ver `views/MainView/SectionRegistry.tsx`). La aplicación no
 * usa rutas por módulo: el Sidebar cambia la sección visible dentro de
 * una única pantalla principal en lugar de navegar a otra página.
 */
export interface NavItem {
  id: string
  title: string
  sectionId: string
  icon: LucideIcon
  /** Permiso necesario para ver el item; `filterNavByPermission` lo oculta si falta. */
  requiredPermission?: string
  /** Insignia opcional (ej. contador de pendientes). No usar para lógica de negocio real aquí. */
  badge?: string | number
  /** Módulo aún no implementado: se muestra en el menú con la etiqueta "Pronto" y abre un placeholder. */
  soon?: boolean
}

/** Una sección con título que agrupa varios NavItem (ej. "OPERACIONES"). */
export interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

/** Una entrada de navegación de primer nivel: o un item suelto, o una sección. */
export type NavEntry = { kind: 'item'; item: NavItem } | { kind: 'section'; section: NavSection }
