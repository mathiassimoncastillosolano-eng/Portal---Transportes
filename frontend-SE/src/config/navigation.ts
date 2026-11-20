import { LayoutDashboard, Receipt, Ticket, Users } from 'lucide-react'
import type { AuthUser } from '@/types/auth'
import type { NavEntry, NavItem } from '@/types/navigation'
import { hasPermission } from '@/stores/authStore'

export const SECCION_INICIAL = 'registrar-pasaje'

const PERMISO_AGENCIA = 'pasajes:registrar'

export const navigationConfig: NavEntry[] = [
  {
    kind: 'section',
    section: {
      id: 'operaciones',
      label: 'Operaciones',
      items: [
        { id: 'registrar-pasaje', title: 'Registrar pasaje', sectionId: 'registrar-pasaje', icon: Ticket, requiredPermission: PERMISO_AGENCIA },
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
        { id: 'clientes', title: 'Clientes', sectionId: 'clientes', icon: Users, requiredPermission: PERMISO_AGENCIA },
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

export function flattenNavItems(entries: NavEntry[] = navigationConfig): NavItem[] {
  return entries.flatMap((entry) => (entry.kind === 'item' ? [entry.item] : entry.section.items))
}

export function filterNavByPermission(entries: NavEntry[], user: AuthUser | null): NavEntry[] {
  return entries.flatMap((entry): NavEntry[] => {
    if (entry.kind === 'item') return hasPermission(user, entry.item.requiredPermission) ? [entry] : []
    const items = entry.section.items.filter((i) => hasPermission(user, i.requiredPermission))
    return items.length ? [{ kind: 'section', section: { ...entry.section, items } }] : []
  })
}

export function permissionForSection(sectionId: string): string | undefined {
  return flattenNavItems().find((i) => i.sectionId === sectionId)?.requiredPermission
}

export function homeSectionFor(user: AuthUser | null): string {
  const visibles = flattenNavItems(filterNavByPermission(navigationConfig, user))
  return (visibles.find((i) => !i.soon) ?? visibles[0])?.sectionId ?? SECCION_INICIAL
}
