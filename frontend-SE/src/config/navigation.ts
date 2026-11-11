import { Bus, LayoutDashboard, Receipt, Ticket, Users } from 'lucide-react'
import type { AuthUser } from '@/types/auth'
import type { NavEntry, NavItem } from '@/types/navigation'
import { hasPermission } from '@/stores/authStore'

/**
 * Estructura de navegación del Sistema Empresarial.
 *
 * Este archivo es la ÚNICA fuente de verdad de la navegación lateral.
 * Agregar, quitar o reordenar un módulo se hace aquí — nunca dentro
 * de los componentes del Sidebar. Cada `sectionId` implementado debe existir
 * en `views/MainView/SectionRegistry.tsx`; los módulos con `soon: true` aún
 * no existen y abren un placeholder "Próximamente" (no tienen lógica).
 *
 *   Operaciones   → Registrar pasaje ✔ · Viajes          (personal de agencia)
 *   Comercial     → Pasajes · Clientes                   (personal de agencia)
 *   Supervisión   → Dashboard ✔                          (gerente)
 */
export const SECCION_INICIAL = 'registrar-pasaje'

/** Permiso del personal de agencia: módulos de Operaciones y Comercial. */
const PERMISO_AGENCIA = 'pasajes:registrar'

export const navigationConfig: NavEntry[] = [
  {
    kind: 'section',
    section: {
      id: 'operaciones',
      label: 'Operaciones',
      items: [
        { id: 'registrar-pasaje', title: 'Registrar pasaje', sectionId: 'registrar-pasaje', icon: Ticket, requiredPermission: PERMISO_AGENCIA },
        { id: 'viajes', title: 'Viajes', sectionId: 'viajes', icon: Bus, requiredPermission: PERMISO_AGENCIA, soon: true },
      ],
    },
  },
  {
    kind: 'section',
    section: {
      id: 'comercial',
      label: 'Comercial',
      items: [
        { id: 'pasajes', title: 'Pasajes', sectionId: 'pasajes', icon: Receipt, requiredPermission: PERMISO_AGENCIA, soon: true },
        { id: 'clientes', title: 'Clientes', sectionId: 'clientes', icon: Users, requiredPermission: PERMISO_AGENCIA, soon: true },
      ],
    },
  },
  {
    kind: 'section',
    section: {
      id: 'supervision',
      label: 'Supervisión',
      items: [{ id: 'dashboard', title: 'Dashboard', sectionId: 'dashboard', icon: LayoutDashboard, requiredPermission: 'dashboard:ver' }],
    },
  },
]

/** Sección (grupo) y item de una `sectionId`, para migas de pan y command palette. */
export function findNavContext(sectionId: string): { sectionLabel?: string; item: NavItem } | undefined {
  for (const entry of navigationConfig) {
    if (entry.kind === 'item') {
      if (entry.item.sectionId === sectionId) return { item: entry.item }
    } else {
      const item = entry.section.items.find((i) => i.sectionId === sectionId)
      if (item) return { sectionLabel: entry.section.label, item }
    }
  }
  return undefined
}

/** Aplana la config a una lista simple de items — útil para breadcrumbs. */
export function flattenNavItems(entries: NavEntry[] = navigationConfig): NavItem[] {
  return entries.flatMap((entry) => (entry.kind === 'item' ? [entry.item] : entry.section.items))
}

/** Oculta los items para los que el usuario no tiene permiso. */
export function filterNavByPermission(entries: NavEntry[], user: AuthUser | null): NavEntry[] {
  return entries.flatMap((entry): NavEntry[] => {
    if (entry.kind === 'item') return hasPermission(user, entry.item.requiredPermission) ? [entry] : []
    const items = entry.section.items.filter((i) => hasPermission(user, i.requiredPermission))
    return items.length ? [{ kind: 'section', section: { ...entry.section, items } }] : []
  })
}

/** Permiso que exige una sección (`undefined` si no exige ninguno o no existe). */
export function permissionForSection(sectionId: string): string | undefined {
  return flattenNavItems().find((i) => i.sectionId === sectionId)?.requiredPermission
}

/** Primera sección implementada que el usuario puede ver (pantalla de inicio de su rol). */
export function homeSectionFor(user: AuthUser | null): string {
  const visibles = flattenNavItems(filterNavByPermission(navigationConfig, user))
  return (visibles.find((i) => !i.soon) ?? visibles[0])?.sectionId ?? SECCION_INICIAL
}
